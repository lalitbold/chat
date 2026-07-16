#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { firebaseConfig } from "../firebase-config.js";

const DEFAULT_LIMIT = 10;
const DEFAULT_OUT = "openbox-chat-export.txt";

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

  if (!roomId) {
    throw new Error("Missing room id. Use --room <roomId> or set ROOM_ID.");
  }

  const token = await signInAnonymously(firebaseConfig.apiKey);
  const messages = await loadMessages({
    projectId: firebaseConfig.projectId,
    roomId,
    token,
    limit: options.all ? null : options.limit,
  });
  const exportedAt = new Date();
  const text = [
    "OpenBox chat export",
    `Room: ${roomId}`,
    `Exported: ${formatTimestamp(exportedAt)}`,
    `Messages: ${messages.length}`,
    "",
    ...messages.map(formatMessage),
    "",
  ].join("\n");

  await writeFile(options.out, text, "utf8");
  console.log(`Exported ${messages.length} message${messages.length === 1 ? "" : "s"} to ${options.out}`);
}

function parseArgs(args) {
  const options = {
    all: false,
    help: false,
    limit: DEFAULT_LIMIT,
    out: DEFAULT_OUT,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--all") {
      options.all = true;
      continue;
    }

    if (arg === "--room" || arg === "-r") {
      options.room = readValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--limit" || arg === "-n") {
      const limit = Number(readValue(args, index, arg));
      if (!Number.isInteger(limit) || limit < 1) {
        throw new Error("--limit must be a positive integer.");
      }
      options.limit = limit;
      index += 1;
      continue;
    }

    if (arg === "--out" || arg === "-o") {
      options.out = readValue(args, index, arg);
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

function printHelp() {
  console.log(`Usage:
  npm run export:messages -- --room <roomId> [options]

Options:
  -r, --room <roomId>      Room id to export. Can also use ROOM_ID.
  -n, --limit <number>     Latest messages to export. Defaults to ${DEFAULT_LIMIT}.
      --all                Export all currently returned room messages.
  -o, --out <path>         Output txt file. Defaults to ${DEFAULT_OUT}.
  -h, --help               Show this help.

Examples:
  npm run export:messages -- --room testroom --limit 10
  npm run export:messages -- --room testroom --all
`);
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

  return payload.idToken;
}

async function loadMessages({ projectId, roomId, token, limit }) {
  const parentPath = `projects/${projectId}/databases/(default)/documents/rooms/${encodeURIComponent(roomId)}`;
  const structuredQuery = {
    from: [{ collectionId: "messages" }],
    orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
  };

  if (limit) {
    structuredQuery.limit = limit;
  }

  const response = await fetch(`https://firestore.googleapis.com/v1/${parentPath}:runQuery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ structuredQuery }),
  });
  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(formatFirebaseError(payload, response.status, "Could not load messages."));
  }

  return payload
    .filter((row) => row.document)
    .map((row) => parseDocument(row.document))
    .sort((left, right) => getTime(left.createdAt) - getTime(right.createdAt));
}

async function readJsonResponse(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function formatFirebaseError(payload, status, fallback) {
  const message =
    payload?.error?.message ||
    payload?.message ||
    payload?.raw ||
    (Array.isArray(payload) ? payload.map((row) => row?.error?.message).filter(Boolean).join("; ") : "");

  return message ? `${fallback} (${status}): ${message}` : `${fallback} (${status}).`;
}

function parseDocument(document) {
  const fields = document.fields || {};
  const id = document.name.split("/").pop();
  const parsed = { id };

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

function formatMessage(message) {
  const timestamp = formatTimestamp(message.createdAt);
  const sender = message.senderName || "Anonymous";
  const text = getMessageText(message);
  return `[${timestamp}] ${sender}: ${text}`;
}

function getMessageText(message) {
  if (message.text) {
    return String(message.text).replace(/\r?\n/g, "\n  ");
  }

  if (message.audioDataUrl) {
    return `[voice message: ${message.audioMimeType || "audio"}]`;
  }

  return `[${message.type || "message"}]`;
}

function formatTimestamp(value) {
  const date = value ? new Date(value) : new Date();

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getTime(value) {
  return value ? new Date(value).getTime() : 0;
}
