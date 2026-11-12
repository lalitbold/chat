#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";
import { CodexWorker, WorkerApi, acquireWorkerLock } from "./codex-worker.mjs";
import { firebaseConfig } from "../firebase-config.js";

const DEFAULT_POLL_MS = 60000;
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_MAX_OUTPUT_CHARS = 12000;
const DEFAULT_LOCAL_HOST = "127.0.0.1";
const DEFAULT_LOCAL_PORT = 17345;
const DEFAULT_QUEUE_DIR = ".codex-queue";
const DEFAULT_CODEX_BIN_CANDIDATES = [
  "/Applications/Codex.app/Contents/Resources/codex",
  "codex",
];

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const roomId = options.room || process.env.ROOM_ID;
  if (!["read-only", "workspace-write"].includes(options.sandbox)) {
    throw new Error("Use --sandbox read-only or workspace-write.");
  }
  for (const args of [["--version"], ["login", "status"]]) await new Promise((resolve, reject) => {
    const invocation = getCodexSpawnCommand(options.codexBin, args);
    const probe = spawn(invocation.file, invocation.args, { stdio: "ignore", timeout: 10000 });
    probe.once("error", () => reject(new Error("Codex executable unavailable. Set --codex-bin or add codex to PATH.")));
    probe.once("exit", (code) => code === 0 ? resolve() : reject(new Error("Codex startup check failed. Check --codex-bin and run codex login.")));
  });

  if (!roomId && !options.localServer) {
    throw new Error("Missing room id. Use --room <roomId> or set ROOM_ID.");
  }

  const queueDir = join(options.cwd, options.queueDir);
  const release = await acquireWorkerLock(queueDir);
  if (options.localServer) {
    try { await startLocalServer({ roomId, options }); }
    catch (error) { await release(); throw error; }
    return;
  }
  const api = new WorkerApi({ debugReads: options.debugReads });
  const worker = new CodexWorker({ api, roomId,
    parent: getRoomDocumentPath(firebaseConfig.projectId, roomId),
    directory: join(queueDir, "outbox"), timeoutMs: options.timeoutMs,
    execute: async (command) => {
      const result = await runCodex(command.prompt, options);
      const text = truncateText(result.stdout.trim(), options.maxOutputChars);
      if (result.ok) await maybeAppendChangelog(command, text, options);
      return { ok: result.ok, text, error: truncateText(
        [result.error, result.stderr, result.stdout].filter(Boolean).join("\n"), options.maxOutputChars) };
    },
  });
  try {
    await worker.initialize();
    await api.token();
    console.log(`Codex worker: room=${roomId}, cwd=${options.cwd}, sandbox=${options.sandbox}, binary=${options.codexBin}`);
    console.log("Commands use Firestore; this Mac must remain awake. Stop with Ctrl+C.");
    do {
      try {
        const worked = await worker.tick();
        if (!worked && !options.once) await sleep(options.pollMs);
      } catch (error) {
        if (options.once) throw error;
        console.error(`Worker will retry: ${error.message}`);
        await sleep(options.pollMs);
      }
    } while (!options.once);
  } finally { await release(); }
}

function parseArgs(args) {
  const options = {
    codexBin: findDefaultCodexBin(),
    cwd: process.cwd(),
    help: false,
    localHost: DEFAULT_LOCAL_HOST,
    localPort: DEFAULT_LOCAL_PORT,
    localServer: false,
    maxOutputChars: DEFAULT_MAX_OUTPUT_CHARS,
    once: false,
    debugReads: false,
    pollMs: DEFAULT_POLL_MS,
    queueDir: DEFAULT_QUEUE_DIR,
    sandbox: "read-only",
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--once") {
      options.once = true;
      continue;
    }

    if (arg === "--local-server") {
      options.localServer = true;
      continue;
    }

    if (arg === "--debug-reads") {
      options.debugReads = true;
      continue;
    }

    if (arg === "--room" || arg === "-r") {
      options.room = readValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--cwd") {
      options.cwd = readValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--codex-bin") {
      options.codexBin = readValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--sandbox") {
      options.sandbox = readValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--local-host") {
      options.localHost = readValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--local-port") {
      options.localPort = readPositiveInteger(readValue(args, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === "--queue-dir") {
      options.queueDir = readValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--poll-ms") {
      options.pollMs = readPositiveInteger(readValue(args, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === "--timeout-ms") {
      options.timeoutMs = readPositiveInteger(readValue(args, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === "--max-output-chars") {
      options.maxOutputChars = readPositiveInteger(readValue(args, index, arg), arg);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function readValue(args, index, optionName) {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${optionName} requires a value.`);
  }

  return value;
}

function readPositiveInteger(value, optionName) {
  const number = Number(value);

  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`${optionName} must be a positive integer.`);
  }

  return number;
}

function printHelp() {
  console.log(`Usage:
  npm run codex:bridge -- --room <roomId> [options]

Options:
  -r, --room <roomId>          Room id to watch. Can also use ROOM_ID.
      --cwd <path>             Working directory for Codex. Defaults to cwd.
      --codex-bin <path>       Codex executable. Auto-detects the macOS app binary.
      --sandbox <mode>         Codex sandbox. Defaults to read-only.
                               Common values: read-only, workspace-write, danger-full-access.
      --local-server           Start a local HTTP bridge instead of polling Firebase.
      --local-host <host>      Local bridge host. Defaults to ${DEFAULT_LOCAL_HOST}.
      --local-port <port>      Local bridge port. Defaults to ${DEFAULT_LOCAL_PORT}.
      --queue-dir <path>       Local JSONL queue/result directory. Defaults to ${DEFAULT_QUEUE_DIR}.
      --poll-ms <number>       Queue polling interval. Defaults to ${DEFAULT_POLL_MS}.
      --timeout-ms <number>    Max runtime per Codex command. Defaults to ${DEFAULT_TIMEOUT_MS}.
      --max-output-chars <n>   Max result text posted to chat. Defaults to ${DEFAULT_MAX_OUTPUT_CHARS}.
      --debug-reads            Print estimated Firestore reads from bridge polling.
      --once                   Process at most one queued command and exit.
  -h, --help                   Show this help.

Examples:
  npm run codex:bridge -- --room team-standup
  npm run codex:bridge -- --room team-standup --sandbox workspace-write --cwd /Users/lalitj/work/iw/chat
  npm run codex:bridge -- --local-server --sandbox workspace-write --cwd C:/work/project
  npm run codex:bridge -- --room team-standup --codex-bin /Applications/Codex.app/Contents/Resources/codex
`);
}

async function startLocalServer({ roomId, options }) {
  const queueDir = join(options.cwd, options.queueDir);
  await mkdir(queueDir, { recursive: true });
  const localCommands = new Map();
  for (const filename of ["commands.jsonl", "results.jsonl"]) {
    const text = await readFile(join(queueDir, filename), "utf8").catch((error) => {
      if (error.code === "ENOENT") return "";
      throw error;
    });
    for (const line of text.split("\n").filter(Boolean)) {
      try { const record = JSON.parse(line); localCommands.set(record.id, record); } catch { /* incomplete trailing record */ }
    }
  }
  for (const [id, record] of localCommands) {
    if (!["completed", "failed"].includes(record.status)) {
      const failed = { ...record, status: "failed", completedAt: new Date().toISOString(), error: "Local worker interrupted. Review changes before resubmitting." };
      localCommands.set(id, failed);
      await appendJsonLine(join(queueDir, "results.jsonl"), failed);
    }
  }
  let pending = Promise.resolve();
  const schedule = (command, context) => {
    pending = pending.then(() => processLocalCommand(command, context)).catch(async (error) => {
      const failed = { ...command, status: "failed", completedAt: new Date().toISOString(), error: error.message };
      localCommands.set(command.id, failed);
      await appendJsonLine(join(queueDir, "results.jsonl"), failed);
    });
  };

  const server = createServer((request, response) => {
    handleLocalRequest(request, response, { roomId, queueDir, localCommands, options, schedule }).catch((error) => {
      sendJson(response, 500, { error: error.message });
    });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.localPort, options.localHost, resolve);
  });

  console.log(
    `Local Codex bridge listening on http://${options.localHost}:${options.localPort} with ${options.sandbox} sandbox from ${options.cwd}`
  );
}

async function handleLocalRequest(request, response, context) {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && request.url === "/results") {
    response.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/x-ndjson; charset=utf-8",
    });
    const resultsPath = join(context.queueDir, "results.jsonl");
    if (!existsSync(resultsPath)) {
      response.end("");
      return;
    }
    createReadStream(resultsPath).pipe(response);
    return;
  }

  const statusMatch = request.url.match(/^\/commands\/([^/?#]+)$/);

  if (request.method === "GET" && statusMatch) {
    const command = context.localCommands.get(decodeURIComponent(statusMatch[1]));
    sendJson(response, command ? 200 : 404, command || { error: "Command not found." });
    return;
  }

  if (request.method !== "POST" || request.url !== "/commands") {
    sendJson(response, 404, { error: "Not found." });
    return;
  }

  const body = await readRequestJson(request);
  const prompt = String(body.prompt || "").trim();

  if (!prompt) {
    sendJson(response, 400, { error: "Missing prompt." });
    return;
  }

  const command = {
    id: createLocalCommandId(),
    prompt,
    requestedByName: body.requestedByName || "Local user",
    roomId: body.roomId || context.roomId || null,
    taskId: body.taskId || null,
    taskDescription: body.taskDescription || null,
    taskLink: Boolean(body.taskLink),
    createdAt: new Date().toISOString(),
  };
  context.localCommands.set(command.id, {
    ...command,
    status: "queued",
  });

  await appendJsonLine(join(context.queueDir, "commands.jsonl"), {
    ...command,
    status: "queued",
  });

  context.schedule(command, context);

  sendJson(response, 202, {
    id: command.id,
    shortId: formatCommandId(command.id),
    status: "queued",
  });
}

async function processLocalCommand(command, { queueDir, localCommands, options }) {
  const shortId = formatCommandId(command.id);
  console.log(`Running local ${shortId}: ${command.prompt}`);
  localCommands.set(command.id, {
    ...command,
    status: "running",
    startedAt: new Date().toISOString(),
  });
  await appendJsonLine(join(queueDir, "results.jsonl"), {
    ...localCommands.get(command.id),
  });

  const result = await runCodex(command.prompt, options);
  const completedAt = new Date().toISOString();
  const resultText = truncateText(
    result.ok
      ? result.stdout.trim() || "Codex finished without a final message."
      : [result.error, result.stderr, result.stdout].filter(Boolean).join("\n\n").trim() ||
          `Codex exited with code ${result.exitCode}.`,
    options.maxOutputChars
  );

  if (result.ok) {
    await maybeAppendChangelog(command, resultText, options);
  }

  const completedCommand = {
    ...command,
    status: result.ok ? "completed" : "failed",
    completedAt,
    result: result.ok ? resultText : null,
    error: result.ok ? null : resultText,
  };
  localCommands.set(command.id, completedCommand);
  await appendJsonLine(join(queueDir, "results.jsonl"), completedCommand);

  console.log(`${result.ok ? "Completed" : "Failed"} local ${shortId}`);
}

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(response, statusCode, payload) {
  setCorsHeaders(response);
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function readRequestJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large."));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
    request.on("error", reject);
  });
}

async function appendJsonLine(filePath, value) {
  await appendFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

function createLocalCommandId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function maybeAppendChangelog(command, resultText, options) {
  if (options.sandbox === "read-only") {
    return;
  }

  const scriptPath = join(options.cwd, "tools", "changelog-entry.mjs");

  if (!existsSync(scriptPath)) {
    return;
  }

  const result = await runNodeScript(scriptPath, [
    "--cwd",
    options.cwd,
    "--prompt",
    command.prompt,
    "--result",
    resultText,
    "--only-if-changed",
  ]);

  if (!result.ok) {
    console.warn(`Changelog update skipped: ${result.stderr || result.stdout || result.error}`);
  }
}

function runCodex(prompt, options) {
  return new Promise((resolve) => {
    const command = getCodexSpawnCommand(options.codexBin, [
      "exec",
      "--sandbox",
      options.sandbox,
      "-",
    ]);
    const child = spawn(command.file, command.args, {
      cwd: options.cwd,
      detached: process.platform !== "win32",
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.stdin.on("error", () => {});
    child.stdin.end(prompt);
    const killTree = (signal) => {
      try {
        if (process.platform !== "win32") process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch (error) { if (error.code !== "ESRCH") throw error; }
    };
    const stop = () => { killTree("SIGKILL"); process.exit(130); };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    const removeSignals = () => { process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop); };
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeoutId = setTimeout(() => {
      timedOut = true;
      killTree("SIGTERM");
      setTimeout(() => killTree("SIGKILL"), 5000).unref();
    }, options.timeoutMs);
    timeoutId.unref();

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      process.stderr.write(chunk);
    });
    child.on("error", (error) => {
      removeSignals();
      clearTimeout(timeoutId);
      resolve({
        ok: false,
        exitCode: null,
        stdout,
        stderr,
        error: error.message,
      });
    });
    child.on("close", (exitCode) => {
      removeSignals();
      clearTimeout(timeoutId);
      resolve({
        ok: exitCode === 0 && !timedOut,
        exitCode,
        stdout,
        stderr,
        error: timedOut ? `Codex timed out after ${options.timeoutMs}ms.` : "",
      });
    });
  });
}

function runNodeScript(scriptPath, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      resolve({
        ok: false,
        stdout,
        stderr,
        error: error.message,
      });
    });
    child.on("close", (exitCode) => {
      resolve({
        ok: exitCode === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        error: "",
      });
    });
  });
}

function findDefaultCodexBin() {
  const candidates =
    process.platform === "win32"
      ? [
          join(process.env.APPDATA || "", "npm", "codex.ps1"),
          join(process.env.APPDATA || "", "npm", "codex.cmd"),
          ...DEFAULT_CODEX_BIN_CANDIDATES,
        ]
      : DEFAULT_CODEX_BIN_CANDIDATES;

  return candidates.find((candidate) => {
    if (/[\\/]/.test(candidate)) {
      return existsSync(candidate);
    }

    return true;
  });
}

function getCodexSpawnCommand(codexBin, codexArgs) {
  if (process.platform !== "win32") {
    return { file: codexBin, args: codexArgs };
  }

  const normalizedBin = String(codexBin || "").toLowerCase();

  if (normalizedBin.endsWith(".ps1")) {
    return {
      file: "powershell.exe",
      args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", codexBin, ...codexArgs],
    };
  }

  if (normalizedBin.endsWith(".cmd") || normalizedBin.endsWith(".bat")) {
    return {
      file: "cmd.exe",
      args: ["/d", "/s", "/c", codexBin, ...codexArgs],
    };
  }

  return { file: codexBin, args: codexArgs };
}

function formatCommandId(id) {
  return `#${String(id || "").slice(0, 6)}`;
}

function truncateText(text, maxChars) {
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars - 80)}\n\n[Truncated ${text.length - maxChars + 80} characters]`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRoomDocumentPath(projectId, roomId) { return `projects/${projectId}/databases/(default)/documents/rooms/${encodeURIComponent(roomId)}`; }
