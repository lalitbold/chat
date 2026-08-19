#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { firebaseConfig } from "../firebase-config.js";

const execFileAsync = promisify(execFile);
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 17347;
const DEFAULT_POLL_MS = 15000;
const DEFAULT_IDLE_THRESHOLD_MS = 5 * 60 * 1000;
const STARTUP_VALUE_NAME = "OpenBoxIdleHelper";
const POWERSHELL_IDLE_COMMAND = String.raw`
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class IdleNative {
  [StructLayout(LayoutKind.Sequential)]
  public struct LASTINPUTINFO {
    public uint cbSize;
    public uint dwTime;
  }
  [DllImport("user32.dll")]
  public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);
  [DllImport("kernel32.dll")]
  public static extern uint GetTickCount();
}
"@
$info = New-Object IdleNative+LASTINPUTINFO
$info.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf($info)
if (-not [IdleNative]::GetLastInputInfo([ref]$info)) { throw "GetLastInputInfo failed." }
$idle = [uint32]([IdleNative]::GetTickCount() - $info.dwTime)
[Console]::WriteLine($idle)
`;

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

  if (options.installStartup) {
    await installStartup(options);
    return;
  }

  if (options.uninstallStartup) {
    await uninstallStartup();
    return;
  }

  if (options.status) {
    await printStatus(options);
    return;
  }

  await startHelper(options);
}

function parseArgs(args) {
  const options = {
    help: false,
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    pollMs: DEFAULT_POLL_MS,
    idleThresholdMs: DEFAULT_IDLE_THRESHOLD_MS,
    installStartup: false,
    uninstallStartup: false,
    status: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--install-startup") {
      options.installStartup = true;
      continue;
    }

    if (arg === "--uninstall-startup") {
      options.uninstallStartup = true;
      continue;
    }

    if (arg === "--status") {
      options.status = true;
      continue;
    }

    if (arg === "--host") {
      options.host = readValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--port") {
      options.port = readPositiveInteger(readValue(args, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === "--poll-ms") {
      options.pollMs = readPositiveInteger(readValue(args, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === "--idle-threshold-ms") {
      options.idleThresholdMs = readPositiveInteger(readValue(args, index, arg), arg);
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

async function startHelper(options) {
  const state = {
    context: null,
    currentIdleSession: null,
    latestEndedSession: null,
    lastSample: null,
    lastError: null,
    options,
  };

  const server = createServer((request, response) => {
    handleRequest(request, response, state).catch((error) => {
      sendJson(response, 500, { error: error.message });
    });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, resolve);
  });

  console.log(`Idle helper listening on http://${options.host}:${options.port}`);
  await pollIdle(state);
  setInterval(() => {
    void pollIdle(state);
  }, options.pollMs).unref();
}

async function handleRequest(request, response, state) {
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

  if (request.method === "GET" && request.url === "/status") {
    sendJson(response, 200, getPublicStatus(state));
    return;
  }

  if (request.method === "POST" && request.url === "/context") {
    const body = await readRequestJson(request);
    state.context = normalizeContext(body);
    await pollIdle(state);
    sendJson(response, 200, getPublicStatus(state));
    return;
  }

  sendJson(response, 404, { error: "Not found." });
}

function normalizeContext(body) {
  const roomId = String(body.roomId || "").trim();
  const userId = String(body.userId || "").trim();
  const token = String(body.token || "").trim();

  if (!roomId || !userId || !token) {
    throw new Error("Context requires roomId, userId, and token.");
  }

  return {
    roomId,
    userId,
    userName: String(body.userName || "Local user").trim() || "Local user",
    token,
    activeTimer: body.activeTimer && typeof body.activeTimer === "object" ? body.activeTimer : null,
    updatedAt: new Date().toISOString(),
  };
}

async function pollIdle(state) {
  try {
    const idleMs = await getSystemIdleMs();
    const now = new Date();
    const idleStartedAt = new Date(now.getTime() - idleMs).toISOString();
    const isIdle = idleMs >= state.options.idleThresholdMs;
    state.lastSample = {
      ok: true,
      idleMs,
      status: isIdle ? "idle" : "active",
      sampledAt: now.toISOString(),
      idleStartedAt: isIdle ? idleStartedAt : null,
    };
    state.lastError = null;

    if (state.context) {
      await persistPresence(state, now);
      await syncIdleSession(state, now, idleStartedAt);
    }
  } catch (error) {
    state.lastError = error.message;
    state.lastSample = {
      ok: false,
      idleMs: 0,
      status: "unknown",
      sampledAt: new Date().toISOString(),
      idleStartedAt: null,
    };
  }
}

async function getSystemIdleMs() {
  if (process.platform !== "win32") {
    throw new Error("OS-wide idle detection uses Win32 GetLastInputInfo and only runs on Windows.");
  }

  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", POWERSHELL_IDLE_COMMAND],
    { windowsHide: true, timeout: 10000, maxBuffer: 1024 * 64 }
  );
  const idleMs = Number.parseInt(String(stdout || "").trim(), 10);

  if (!Number.isFinite(idleMs) || idleMs < 0) {
    throw new Error("GetLastInputInfo returned an invalid idle value.");
  }

  return idleMs;
}

async function persistPresence(state, now) {
  const { context, lastSample } = state;
  const name = `${roomPath(context.roomId)}/presence/${encodeURIComponent(context.userId)}`;
  await patchDocument(context.token, name, {
    userId: context.userId,
    userName: context.userName,
    status: lastSample.status,
    idleMs: lastSample.idleMs,
    lastActiveAt: lastSample.status === "active" ? now.toISOString() : null,
    lastIdleStartedAt: lastSample.idleStartedAt,
    helperUpdatedAt: now.toISOString(),
    source: "desktop-helper",
  });
}

async function syncIdleSession(state, now, idleStartedAt) {
  const { context, lastSample } = state;

  if (lastSample.status === "idle") {
    if (state.currentIdleSession) {
      return;
    }

    const session = await createDocument(context.token, `${roomPath(context.roomId)}/idleSessions`, {
      userId: context.userId,
      userName: context.userName,
      startedAt: idleStartedAt,
      endedAt: null,
      durationMs: null,
      decision: "pending",
      source: "desktop-helper",
      createdAt: now.toISOString(),
      affectedTimer: context.activeTimer || null,
    });
    state.currentIdleSession = session;
    return;
  }

  if (!state.currentIdleSession) {
    return;
  }

  const session = state.currentIdleSession;
  const durationMs = Math.max(0, now.getTime() - Date.parse(session.startedAt || now.toISOString()));
  const endedSession = await patchDocument(context.token, session.name, {
    endedAt: now.toISOString(),
    durationMs,
    decision: "pending",
    updatedAt: now.toISOString(),
  });
  state.latestEndedSession = endedSession;
  state.currentIdleSession = null;
}

async function printStatus(options) {
  try {
    const response = await fetch(`http://${options.host}:${options.port}/status`);

    if (response.ok) {
      console.log(JSON.stringify(await response.json(), null, 2));
      return;
    }
  } catch {
    // The helper may not be running; fall through to a direct local sample.
  }

  const idleMs = await getSystemIdleMs();
  console.log(JSON.stringify({
    ok: true,
    helperRunning: false,
    idleMs,
    status: idleMs >= options.idleThresholdMs ? "idle" : "active",
    thresholdMs: options.idleThresholdMs,
  }, null, 2));
}

async function installStartup(options) {
  ensureWindows("Startup install");
  const command = `"${process.execPath}" "${fileURLToPath(import.meta.url)}" --host ${options.host} --port ${options.port} --poll-ms ${options.pollMs} --idle-threshold-ms ${options.idleThresholdMs}`;
  await execFileAsync("reg.exe", [
    "add",
    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
    "/v",
    STARTUP_VALUE_NAME,
    "/t",
    "REG_SZ",
    "/d",
    command,
    "/f",
  ], { windowsHide: true });
  console.log(`Installed startup entry ${STARTUP_VALUE_NAME}.`);
}

async function uninstallStartup() {
  ensureWindows("Startup uninstall");
  await execFileAsync("reg.exe", [
    "delete",
    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
    "/v",
    STARTUP_VALUE_NAME,
    "/f",
  ], { windowsHide: true });
  console.log(`Removed startup entry ${STARTUP_VALUE_NAME}.`);
}

function ensureWindows(action) {
  if (process.platform !== "win32") {
    throw new Error(`${action} is only supported on Windows.`);
  }
}

function getPublicStatus(state) {
  return {
    ok: !state.lastError,
    contextReady: Boolean(state.context),
    roomId: state.context?.roomId || null,
    userId: state.context?.userId || null,
    pollMs: state.options.pollMs,
    idleThresholdMs: state.options.idleThresholdMs,
    currentIdleSession: summarizeSession(state.currentIdleSession),
    latestEndedSession: summarizeSession(state.latestEndedSession),
    lastSample: state.lastSample,
    lastError: state.lastError,
  };
}

function summarizeSession(session) {
  if (!session) {
    return null;
  }

  return {
    id: session.id,
    name: session.name,
    startedAt: session.startedAt,
    endedAt: session.endedAt || null,
    durationMs: session.durationMs ?? null,
    decision: session.decision || "pending",
    affectedTimer: session.affectedTimer || null,
  };
}

async function createDocument(token, path, fields) {
  const response = await fetch(`https://firestore.googleapis.com/v1/${path}`, {
    method: "POST",
    headers: firestoreHeaders(token),
    body: JSON.stringify({ fields: toFirestoreFields(fields) }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message || "Could not create Firestore document.");
  }

  return parseDocument(payload);
}

async function patchDocument(token, name, fields) {
  const updateMask = Object.keys(fields)
    .map((fieldPath) => `updateMask.fieldPaths=${encodeURIComponent(fieldPath)}`)
    .join("&");
  const response = await fetch(`https://firestore.googleapis.com/v1/${name}?${updateMask}`, {
    method: "PATCH",
    headers: firestoreHeaders(token),
    body: JSON.stringify({ fields: toFirestoreFields(fields) }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message || "Could not update Firestore document.");
  }

  return parseDocument(payload);
}

function roomPath(roomId) {
  return `projects/${firebaseConfig.projectId}/databases/(default)/documents/rooms/${encodeURIComponent(roomId)}`;
}

function firestoreHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function parseDocument(document) {
  const fields = document.fields || {};
  const id = document.name.split("/").pop();
  const data = { id, name: document.name };

  for (const [key, value] of Object.entries(fields)) {
    data[key] = parseFirestoreValue(value);
  }

  return data;
}

function toFirestoreFields(data) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, toFirestoreValue(value)])
  );
}

function toFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "string" && isIsoTimestamp(value)) return { timestampValue: value };
  if (Array.isArray(value)) {
    return value.length > 0 ? { arrayValue: { values: value.map(toFirestoreValue) } } : { arrayValue: {} };
  }
  if (typeof value === "boolean") return { booleanValue: value };
  if (Number.isInteger(value)) return { integerValue: String(value) };
  if (typeof value === "number") return { doubleValue: value };
  if (typeof value === "object") return { mapValue: { fields: toFirestoreFields(value) } };
  return { stringValue: String(value) };
}

function parseFirestoreValue(value) {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(parseFirestoreValue);
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

function isIsoTimestamp(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
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

function printHelp() {
  console.log(`Usage:
  npm run idle:helper -- [options]
  npm run idle:status
  npm run idle:install-startup
  npm run idle:uninstall-startup

Options:
      --host <host>               Local host. Defaults to ${DEFAULT_HOST}.
      --port <port>               Local port. Defaults to ${DEFAULT_PORT}.
      --poll-ms <number>          OS idle polling interval. Defaults to ${DEFAULT_POLL_MS}.
      --idle-threshold-ms <n>     Minimum idle time before a session starts. Defaults to ${DEFAULT_IDLE_THRESHOLD_MS}.
      --status                    Print running helper status, or a direct Windows idle sample.
      --install-startup           Add an HKCU startup entry for this helper.
      --uninstall-startup         Remove the HKCU startup entry.
  -h, --help                      Show this help.
`);
}
