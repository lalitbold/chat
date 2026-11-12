import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, open, rm, readdir } from "node:fs/promises";
import { join } from "node:path";
import { firebaseConfig } from "../firebase-config.js";
import { parseDocument, documentWrite } from "./chat-firestore.mjs";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const terminal = (status) => ["completed", "failed"].includes(status);

// Authentication is memory-only. Refresh keeps the comment author identical to the token UID.
export class WorkerApi {
  constructor({ fetcher = fetch, wait = delay, debugReads = false } = {}) {
    this.fetcher = fetcher;
    this.debugReads = debugReads;
    this.wait = wait;
  }
  async token(force = false) {
    if (!force && this.auth && Date.now() < this.auth.expiresAt - 60000) return this.auth.idToken;
    const refresh = this.auth?.refreshToken;
    const response = await this.fetcher(refresh
      ? `https://securetoken.googleapis.com/v1/token?key=${firebaseConfig.apiKey}`
      : `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": refresh ? "application/x-www-form-urlencoded" : "application/json" },
      body: refresh ? new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }).toString()
        : JSON.stringify({ returnSecureToken: true }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || "Worker sign-in failed.");
    this.auth = { idToken: data.idToken || data.id_token, uid: data.localId || data.user_id,
      refreshToken: data.refreshToken || data.refresh_token,
      expiresAt: Date.now() + Number(data.expiresIn || data.expires_in) * 1000 };
    return this.auth.idToken;
  }
  async request(path, body, method = "POST") {
    for (let attempt = 0; ; attempt++) {
      try {
        const token = await this.token();
        const response = await this.fetcher(`https://firestore.googleapis.com/v1/${path}`, {
          method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const data = await response.json();
        if (response.status === 401 && attempt < 3) { await this.token(true); continue; }
        if (!response.ok) {
          const error = new Error(data?.error?.message || `Firestore HTTP ${response.status}`);
          error.status = response.status;
          throw error;
        }
        return data;
      } catch (error) {
        if (attempt >= 3 || (error.status && error.status !== 429 && error.status < 500)) throw error;
        await this.wait(500 * 2 ** attempt);
      }
    }
  }
  async get(name) {
    try { return parseDocument(await this.request(name, null, "GET")); }
    catch (error) { if (error.status === 404) return null; throw error; }
  }
  async queued(parent) {
    // Sort after fetching to accommodate both legacy string and timestamp createdAt values.
    const rows = await this.request(`${parent}:runQuery`, { structuredQuery: {
      from: [{ collectionId: "codexCommands" }],
      where: { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "queued" } } },
    } });
    if (this.debugReads) console.log(`[reads] codex queue: ~${Math.max(1, rows.filter((row) => row.document).length)}`);
    return rows.filter((row) => row.document).map((row) => parseDocument(row.document))
      .sort((a, b) => (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0) || a.id.localeCompare(b.id));
  }
  async commit(parent, writes) {
    return this.request(`${parent.split("/documents")[0]}/documents:commit`, { writes });
  }
}

export async function saveRecord(path, record) {
  const temporary = `${path}.tmp`;
  const file = await open(temporary, "w", 0o600);
  try { await file.writeFile(JSON.stringify(record)); await file.sync(); } finally { await file.close(); }
  await rename(temporary, path);
}

export async function acquireWorkerLock(directory) {
  await mkdir(directory, { recursive: true });
  const path = join(directory, "worker.lock");
  try { await mkdir(path); }
  catch (error) {
    if (error.code !== "EEXIST") throw error;
    let pid;
    try { pid = Number(await readFile(join(path, "pid"), "utf8")); }
    catch { throw new Error(`Worker lock is incomplete: ${path}. Check for a running worker before removing it.`); }
    try { process.kill(pid, 0); throw new Error("A Codex worker is already running for this queue directory."); }
    catch (check) { if (check.code !== "ESRCH") throw check; }
    await rm(path, { recursive: true });
    await mkdir(path);
  }
  const file = await open(join(path, "pid"), "w");
  await file.writeFile(String(process.pid)); await file.close();
  return () => rm(path, { recursive: true, force: true });
}

export class CodexWorker {
  constructor({ api, parent, roomId, directory, execute, timeoutMs }) {
    Object.assign(this, { api, parent, roomId, directory, execute, timeoutMs });
  }
  async initialize() { await mkdir(this.directory, { recursive: true }); }
  recordPath(id) { return join(this.directory, `${id}.json`); }
  async claim(command, record) {
    const startedAt = new Date().toISOString();
    const fields = { status: "running", workerId: record.workerId, startedAt, updatedAt: startedAt,
      roomId: this.roomId, error: null };
    const writes = [documentWrite(command.name, fields, { updateTime: command.updateTime }, true)];
    if (command.taskLink && command.taskId) {
      const task = await this.api.get(`${this.parent}/tasks/${command.taskId}`);
      if (task?.codexCommandId === command.id) writes.push(documentWrite(task.name,
        { codexStatus: "running", updatedAt: startedAt }, { updateTime: task.updateTime }, true));
    }
    try { await this.api.commit(this.parent, writes); return true; }
    catch (error) {
      // A lost commit response is ambiguous: verify ownership before doing any work.
      const current = await this.api.get(command.name);
      if (current?.workerId === record.workerId && current.status === "running") return true;
      if ([400, 409, 412].includes(error.status)) return false;
      throw error;
    }
  }
  async deliver(record) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const command = await this.api.get(record.command.name);
      if (!command || terminal(command.status) || command.workerId !== record.workerId) return;
      const result = record.result;
      const text = result.result || result.error || "No result text.";
      await this.api.token();
      const uid = this.api.auth.uid;
      const writes = [documentWrite(command.name, result, { updateTime: command.updateTime }, true)];
      if (command.taskLink && command.taskId) {
        const task = await this.api.get(`${this.parent}/tasks/${command.taskId}`);
        if (task?.codexCommandId === command.id) {
          writes.push(documentWrite(task.name, { codexStatus: result.status, codexCompletedAt: result.completedAt,
            codexResultSummary: text.replace(/\s+/g, " ").slice(0, 500), updatedAt: result.completedAt },
          { updateTime: task.updateTime }, true));
          writes.push(documentWrite(`${task.name}/comments/codex-${command.id}`, {
            taskId: command.taskId, text: `Codex ${result.status}: ${text.slice(0, 500)}`,
            createdAt: new Date(result.completedAt), createdBy: uid, createdByName: "Codex",
          }));
        }
      }
      writes.push(documentWrite(`${this.parent}/messages/codex-${command.id}`, {
        text: `Codex command #${command.id.slice(0, 6)} ${result.status}.\n\n${text}`,
        senderId: uid, senderName: "Codex", type: "codex", createdAt: new Date(result.completedAt),
      }));
      try { await this.api.commit(this.parent, writes); return; }
      catch (error) { if (![400, 409, 412].includes(error.status) || attempt === 4) throw error; }
    }
  }
  async recover() {
    for (const filename of await readdir(this.directory)) {
      if (!filename.endsWith(".json")) continue;
      const path = join(this.directory, filename);
      const record = JSON.parse(await readFile(path, "utf8"));
      if (record.parent !== this.parent) continue;
      if (!record.result) {
        const completedAt = new Date().toISOString();
        record.result = { status: "failed", completedAt, updatedAt: completedAt, result: null,
          error: "Worker interrupted before a durable result was saved. Review changes before explicitly resubmitting." };
        await saveRecord(path, record);
      }
      await this.deliver(record);
      await rm(path);
    }
  }
  async tick() {
    await this.recover();
    const [command] = await this.api.queued(this.parent);
    if (!command) return false;
    const path = this.recordPath(command.id);
    const record = { parent: this.parent, command, workerId: randomUUID() };
    // Journal before claiming so interruption at either side of the network call is recoverable.
    await saveRecord(path, record);
    if (!(await this.claim(command, record))) { await rm(path); return false; }
    console.log(`Running #${command.id.slice(0, 6)} in ${this.roomId}`);
    let execution;
    try { execution = await this.execute(command); }
    catch (error) { execution = { ok: false, error: error.message }; }
    const completedAt = new Date().toISOString();
    record.result = { status: execution.ok ? "completed" : "failed", completedAt, updatedAt: completedAt,
      result: execution.ok ? execution.text || "Codex finished without a final message." : null,
      error: execution.ok ? null : execution.error || "Codex failed." };
    await saveRecord(path, record);
    await this.deliver(record);
    await rm(path);
    console.log(`${record.result.status}: #${command.id.slice(0, 6)}`);
    return true;
  }
}
