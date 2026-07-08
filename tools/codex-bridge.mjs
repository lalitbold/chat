#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { appendFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";
import { firebaseConfig } from "../firebase-config.js";

const DEFAULT_POLL_MS = 5000;
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

  if (!roomId && !options.localServer) {
    throw new Error("Missing room id. Use --room <roomId> or set ROOM_ID.");
  }

  if (options.localServer) {
    await startLocalServer({ roomId, options });
    return;
  }

  const auth = await signInAnonymously(firebaseConfig.apiKey);
  console.log(
    `Codex bridge listening in room "${roomId}" with ${options.sandbox} sandbox from ${options.cwd}`
  );

  do {
    const command = await loadNextQueuedCommand({
      projectId: firebaseConfig.projectId,
      roomId,
      token: auth.idToken,
    });

    if (command) {
      await processCommand({ auth, roomId, command, options });
    } else if (!options.once) {
      await sleep(options.pollMs);
    }
  } while (!options.once);
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

  const server = createServer((request, response) => {
    handleLocalRequest(request, response, { roomId, queueDir, options }).catch((error) => {
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
    createdAt: new Date().toISOString(),
  };

  await appendJsonLine(join(context.queueDir, "commands.jsonl"), {
    ...command,
    status: "queued",
  });

  processLocalCommand(command, context).catch((error) => {
    console.error(`Local command ${formatCommandId(command.id)} failed: ${error.message}`);
  });

  sendJson(response, 202, {
    id: command.id,
    shortId: formatCommandId(command.id),
    status: "queued",
  });
}

async function processLocalCommand(command, { queueDir, options }) {
  const shortId = formatCommandId(command.id);
  console.log(`Running local ${shortId}: ${command.prompt}`);
  await appendJsonLine(join(queueDir, "results.jsonl"), {
    ...command,
    status: "running",
    startedAt: new Date().toISOString(),
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

  await appendJsonLine(join(queueDir, "results.jsonl"), {
    ...command,
    status: result.ok ? "completed" : "failed",
    completedAt,
    result: result.ok ? resultText : null,
    error: result.ok ? null : resultText,
  });

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

async function signInAnonymously(apiKey) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    }
  );
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message || "Anonymous Firebase sign-in failed.");
  }

  return {
    idToken: payload.idToken,
    localId: payload.localId,
  };
}

async function loadNextQueuedCommand({ projectId, roomId, token }) {
  const parentPath = getRoomDocumentPath(projectId, roomId);
  const response = await fetch(`https://firestore.googleapis.com/v1/${parentPath}:runQuery`, {
    method: "POST",
    headers: getJsonAuthHeaders(token),
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "codexCommands" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "status" },
            op: "EQUAL",
            value: { stringValue: "queued" },
          },
        },
      },
    }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(getFirestoreErrorMessage(payload, "Could not load Codex commands."));
  }

  const commands = payload
    .filter((row) => row.document)
    .map((row) => parseDocument(row.document))
    .sort(compareCommandsByCreatedAt);

  return commands[0] || null;
}

async function processCommand({ auth, roomId, command, options }) {
  const shortId = formatCommandId(command.id);
  console.log(`Running ${shortId}: ${command.prompt}`);

  await updateDocument(command.name, auth.idToken, {
    status: "running",
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    error: null,
  });
  await postRoomMessage({
    projectId: firebaseConfig.projectId,
    roomId,
    token: auth.idToken,
    senderId: auth.localId,
    text: `Codex command ${shortId} started.`,
  });

  const result = await runCodex(command.prompt, options);
  const completedAt = new Date().toISOString();

  if (result.ok) {
    const finalText = truncateText(result.stdout.trim() || "Codex finished without a final message.", options.maxOutputChars);
    await maybeAppendChangelog(command, finalText, options);
    await updateDocument(command.name, auth.idToken, {
      status: "completed",
      completedAt,
      updatedAt: completedAt,
      result: finalText,
      error: null,
    });
    await postRoomMessage({
      projectId: firebaseConfig.projectId,
      roomId,
      token: auth.idToken,
      senderId: auth.localId,
      text: formatCompletionMessage(command, finalText),
    });
    console.log(`Completed ${shortId}`);
    return;
  }

  const errorText = truncateText(
    [result.error, result.stderr, result.stdout].filter(Boolean).join("\n\n").trim() ||
      `Codex exited with code ${result.exitCode}.`,
    options.maxOutputChars
  );
  await updateDocument(command.name, auth.idToken, {
    status: "failed",
    completedAt,
    updatedAt: completedAt,
    result: result.stdout.trim() || null,
    error: errorText,
  });
  await postRoomMessage({
    projectId: firebaseConfig.projectId,
    roomId,
    token: auth.idToken,
    senderId: auth.localId,
    text: formatFailureMessage(command, errorText),
  });
  console.error(`Failed ${shortId}`);
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
    const child = spawn(options.codexBin, ["exec", "--sandbox", options.sandbox, prompt], {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeoutId = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5000).unref();
    }, options.timeoutMs);
    timeoutId.unref();

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
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
  return DEFAULT_CODEX_BIN_CANDIDATES.find((candidate) => {
    if (candidate.includes("/")) {
      return existsSync(candidate);
    }

    return true;
  });
}

async function updateDocument(documentName, token, fields) {
  const updateMask = Object.keys(fields)
    .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
    .join("&");
  const response = await fetch(`https://firestore.googleapis.com/v1/${documentName}?${updateMask}`, {
    method: "PATCH",
    headers: getJsonAuthHeaders(token),
    body: JSON.stringify({
      fields: toFirestoreFields(fields),
    }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(getFirestoreErrorMessage(payload, "Could not update Firestore document."));
  }

  return payload;
}

async function postRoomMessage({ projectId, roomId, token, senderId, text }) {
  const parentPath = getRoomDocumentPath(projectId, roomId);
  const response = await fetch(`https://firestore.googleapis.com/v1/${parentPath}/messages`, {
    method: "POST",
    headers: getJsonAuthHeaders(token),
    body: JSON.stringify({
      fields: toFirestoreFields({
        text,
        senderId,
        senderName: "Codex",
        type: "codex",
        createdAt: new Date().toISOString(),
      }),
    }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(getFirestoreErrorMessage(payload, "Could not post Codex message."));
  }

  return payload;
}

function getRoomDocumentPath(projectId, roomId) {
  return `projects/${projectId}/databases/(default)/documents/rooms/${encodeURIComponent(roomId)}`;
}

function getJsonAuthHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function getFirestoreErrorMessage(payload, fallback) {
  if (payload?.error?.message) {
    return payload.error.message;
  }

  if (Array.isArray(payload)) {
    const rowError = payload.find((row) => row?.error?.message)?.error?.message;

    if (rowError) {
      return rowError;
    }
  }

  return fallback;
}

function parseDocument(document) {
  const fields = document.fields || {};
  const id = document.name.split("/").pop();
  const parsed = { id, name: document.name };

  for (const [key, value] of Object.entries(fields)) {
    parsed[key] = parseFirestoreValue(value);
  }

  return parsed;
}

function parseFirestoreValue(value) {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) {
    return (value.arrayValue.values || []).map(parseFirestoreValue);
  }
  if ("mapValue" in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([key, nestedValue]) => [
        key,
        parseFirestoreValue(nestedValue),
      ])
    );
  }

  return undefined;
}

function toFirestoreFields(fields) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, toFirestoreValue(value)])
  );
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string" && isIsoTimestamp(value)) return { timestampValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (Number.isInteger(value)) return { integerValue: String(value) };
  if (typeof value === "number") return { doubleValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === "object") {
    return { mapValue: { fields: toFirestoreFields(value) } };
  }

  return { stringValue: String(value) };
}

function isIsoTimestamp(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
}

function compareCommandsByCreatedAt(left, right) {
  const leftTime = Date.parse(left.createdAt || "") || 0;
  const rightTime = Date.parse(right.createdAt || "") || 0;

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return left.id.localeCompare(right.id);
}

function formatCompletionMessage(command, result) {
  return `Codex command ${formatCommandId(command.id)} completed.\nRequested by: ${
    command.requestedByName || "Unknown"
  }\nPrompt: ${command.prompt}\n\n${result}`;
}

function formatFailureMessage(command, error) {
  return `Codex command ${formatCommandId(command.id)} failed.\nPrompt: ${command.prompt}\n\n${error}`;
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
