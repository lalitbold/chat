import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CodexWorker, WorkerApi, saveRecord, acquireWorkerLock } from "./codex-worker.mjs";
import { parseDocument } from "./chat-firestore.mjs";
import { matchesCodexResult, buildTaskCodexPrompt } from "../codex-tasks.js";
import { classifyRisk, parseCommand } from "./chat-command.mjs";

const parent = "projects/test/databases/(default)/documents/rooms/test-room";
class MemoryApi {
  constructor() { this.docs = new Map(); this.version = 0; this.auth = { uid: "worker" }; }
  put(name, data) { const doc = { ...data, name, id: name.split("/").at(-1), updateTime: String(++this.version) }; this.docs.set(name, doc); return doc; }
  async token() { return "token"; }
  async get(name) { return structuredClone(this.docs.get(name) || null); }
  async queued(path) { return [...this.docs.values()].filter((d) => d.name.startsWith(`${path}/codexCommands/`) && d.status === "queued").sort((a,b) => a.createdAt.localeCompare(b.createdAt)); }
  async commit(path, writes) {
    if (this.offline) throw new Error("offline");
    for (const write of writes) {
      const existing = this.docs.get(write.update.name);
      if ((write.currentDocument.exists === false && existing) ||
          (write.currentDocument.updateTime && write.currentDocument.updateTime !== existing?.updateTime)) {
        const error = new Error("precondition"); error.status = 409; throw error;
      }
      const fields = parseDocument(write.update);
      // Enforce the actual rules' author condition for new comments and messages.
      if (write.update.name.includes("/comments/")) assert.equal(fields.createdBy, this.auth.uid);
      if (write.update.name.includes("/messages/")) assert.equal(fields.senderId, this.auth.uid);
    }
    for (const write of writes) this.put(write.update.name, { ...(write.updateMask ? this.docs.get(write.update.name) : {}), ...parseDocument(write.update) });
  }
}
function seed(api, id = "command", createdAt = "2026-10-08T00:00:00Z") {
  const command = api.put(`${parent}/codexCommands/${id}`, { status: "queued", taskId: "task", taskLink: true,
    prompt: "Review", createdAt, requestedBy: "requester" });
  api.put(`${parent}/tasks/task`, { codexCommandId: id, status: "pending" });
  return command;
}
async function fixture(t, api = new MemoryApi(), execute = async () => ({ ok: true, text: "Verified" })) {
  const directory = await mkdtemp(join(tmpdir(), "codex-worker-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const worker = new CodexWorker({ api, parent, roomId: "test-room", directory, execute });
  await worker.initialize();
  return { worker, api, directory };
}

test("competing workers execute a command once and preserve task completion state", async (t) => {
  const api = new MemoryApi(); seed(api);
  let executions = 0;
  const execute = async () => { executions++; await new Promise((r) => setTimeout(r, 10)); return { ok: true, text: "Done" }; };
  const a = await fixture(t, api, execute); const b = await fixture(t, api, execute);
  await Promise.all([a.worker.tick(), b.worker.tick()]);
  assert.equal(executions, 1);
  assert.equal((await api.get(`${parent}/tasks/task`)).status, "pending");
  assert.equal((await api.get(`${parent}/tasks/task`)).codexStatus, "completed");
  assert.equal([...api.docs.keys()].filter((n) => n.includes("/comments/")).length, 1);
});
test("upload outage preserves durable result and restart delivers without executing again", async (t) => {
  const api = new MemoryApi(); seed(api);
  let executions = 0;
  const { worker, directory } = await fixture(t, api, async () => { executions++; api.offline = true; return { ok: true, text: "Saved result" }; });
  await assert.rejects(worker.tick(), /offline/);
  assert.equal((await readdir(directory)).length, 1);
  api.offline = false;
  const restarted = new CodexWorker({ api, parent, roomId: "test-room", directory, execute: () => assert.fail("Must not rerun") });
  await restarted.recover(); await restarted.recover();
  assert.equal(executions, 1);
  assert.equal((await api.get(`${parent}/codexCommands/command`)).result, "Saved result");
  assert.equal((await readdir(directory)).length, 0);
});
test("interrupted execution fails on recovery without repeating edits", async (t) => {
  const { worker, api } = await fixture(t);
  const command = seed(api); const record = { parent, command, workerId: "attempt" };
  await saveRecord(worker.recordPath(command.id), record);
  await worker.claim(command, record);
  await worker.recover();
  assert.equal((await api.get(command.name)).status, "failed");
  assert.match((await api.get(command.name)).error, /interrupted/);
});
test("stale result cannot overwrite a newer task link or create its comment", async (t) => {
  const api = new MemoryApi(); seed(api);
  const { worker } = await fixture(t, api, async () => {
    api.put(`${parent}/tasks/task`, { codexCommandId: "newer", codexStatus: "queued" });
    return { ok: true, text: "Old result" };
  });
  await worker.tick();
  assert.equal((await api.get(`${parent}/tasks/task`)).codexStatus, "queued");
  assert.equal(await api.get(`${parent}/tasks/task/comments/codex-command`), null);
});
test("ambiguous successful result commit does not duplicate comments", async (t) => {
  const { worker, api } = await fixture(t); seed(api);
  const commit = api.commit.bind(api); let ambiguous = true;
  api.commit = async (path, writes) => {
    await commit(path, writes);
    if (writes.some((w) => w.update.name.includes("/comments/")) && ambiguous) { ambiguous = false; throw new Error("response lost"); }
  };
  await assert.rejects(worker.tick(), /response lost/);
  await worker.recover();
  assert.equal([...api.docs.keys()].filter((n) => n.includes("/comments/")).length, 1);
});
test("worker lock blocks simultaneous processes in the same directory", async (t) => {
  const { directory } = await fixture(t);
  const release = await acquireWorkerLock(directory);
  await assert.rejects(acquireWorkerLock(directory), /already running/);
  await release();
  await (await acquireWorkerLock(directory))();
});
test("Firebase refresh and transient retry preserve worker identity", async () => {
  const calls = []; let firestoreCalls = 0;
  const api = new WorkerApi({ wait: async () => {}, fetcher: async (url, options) => {
    calls.push(url);
    if (url.includes("securetoken")) return Response.json({ id_token: "fresh", user_id: "worker", refresh_token: "renewed", expires_in: "3600" });
    firestoreCalls++;
    if (firestoreCalls === 1) return Response.json({ error: { message: "temporary" } }, { status: 503 });
    assert.equal(options.headers.Authorization, "Bearer fresh");
    return Response.json({ ok: true });
  } });
  api.auth = { idToken: "old", refreshToken: "refresh", uid: "worker", expiresAt: 0 };
  await api.request("test");
  assert.equal(api.auth.uid, "worker");
  assert.equal(calls.filter((url) => url.includes("securetoken")).length, 1);
  assert.equal(firestoreCalls, 2);
});
test("room switching and stale command guards reject unrelated local results", () => {
  const task = { codexCommandId: "new" };
  assert.equal(matchesCodexResult(task, { id: "new", roomId: "room-a" }, "room-b"), false);
  assert.equal(matchesCodexResult(task, { id: "old", roomId: "room-a" }, "room-a"), false);
  assert.equal(matchesCodexResult(task, { id: "new", roomId: "room-a" }, "room-a"), true);
});
test("task context includes comments and task show is read-only", () => {
  const prompt = buildTaskCodexPrompt({ id: "full-task-id", description: "Bug", labels: ["bug"] }, "Fix", "room-a", [{ text: "Reproduction", createdByName: "Lalit" }]);
  for (const text of ["full-task-id", "room-a", "Reproduction", "Fix"]) assert.ok(prompt.includes(text));
  assert.equal(classifyRisk(parseCommand("/task show #abc123")), "read");
});

test("claim with a lost response is verified before executing", async (t) => {
  const { worker, api } = await fixture(t); seed(api);
  const commit = api.commit.bind(api); let lost = true;
  api.commit = async (path, writes) => {
    await commit(path, writes);
    if (lost) { lost = false; throw new Error("claim response lost"); }
  };
  await worker.tick();
  assert.equal((await api.get(`${parent}/codexCommands/command`)).status, "completed");
});
test("failed execution is delivered without completing the task", async (t) => {
  const { worker, api } = await fixture(t, new MemoryApi(), async () => ({ ok: false, error: "Timed out" })); seed(api);
  await worker.tick();
  assert.equal((await api.get(`${parent}/tasks/task`)).codexStatus, "failed");
  assert.equal((await api.get(`${parent}/tasks/task`)).status, "pending");
});
test("queue is sorted across legacy string and Firestore timestamp dates", async () => {
  const api = new WorkerApi({ fetcher: async () => Response.json([
    { document: { name: `${parent}/codexCommands/new`, fields: { createdAt: { stringValue: "2026-10-08T02:00:00Z" } } } },
    { document: { name: `${parent}/codexCommands/old`, fields: { createdAt: { timestampValue: "2026-10-08T01:00:00Z" } } } },
  ]) });
  api.auth = { idToken: "token", uid: "worker", expiresAt: Date.now() + 3600000 };
  assert.deepEqual((await api.queued(parent)).map((c) => c.id), ["old", "new"]);
});
test("401 refreshes once and permanent permission failures are not retried", async () => {
  let calls = 0;
  const api = new WorkerApi({ wait: async () => {}, fetcher: async (url) => {
    if (url.includes("securetoken")) return Response.json({ id_token: "new", user_id: "worker", refresh_token: "r", expires_in: "3600" });
    calls++;
    return Response.json({ error: { message: "denied" } }, { status: calls === 1 ? 401 : 403 });
  } });
  api.auth = { idToken: "token", refreshToken: "r", uid: "worker", expiresAt: Date.now() + 3600000 };
  await assert.rejects(api.request("test"), (error) => error.status === 403);
  assert.equal(calls, 2);
});
