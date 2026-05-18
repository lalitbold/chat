#!/usr/bin/env node

import { firebaseConfig } from "../firebase-config.js";

const DEFAULT_LIMIT = 50;

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
  const tasks = await loadPendingTasks({
    projectId: firebaseConfig.projectId,
    roomId,
    token,
  });
  const filteredTasks = filterTasks(tasks, options)
    .sort(compareTasksByCreatedAt)
    .slice(0, options.limit);

  if (options.json) {
    console.log(JSON.stringify(filteredTasks.map(toJsonTask), null, 2));
    return;
  }

  console.log(formatMarkdown({
    roomId,
    tasks: filteredTasks,
    total: tasks.length,
    labels: options.labels,
    createdByName: options.createdByName,
  }));
}

function parseArgs(args) {
  const options = {
    labels: [],
    limit: DEFAULT_LIMIT,
    json: false,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--room" || arg === "-r") {
      options.room = readValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--label" || arg === "--labels" || arg === "-l") {
      options.labels.push(...parseLabels(readValue(args, index, arg)));
      index += 1;
      continue;
    }

    if (arg === "--created-by-name") {
      options.createdByName = readValue(args, index, arg).toLowerCase();
      index += 1;
      continue;
    }

    if (arg === "--limit") {
      const limit = Number(readValue(args, index, arg));
      if (!Number.isInteger(limit) || limit < 1) {
        throw new Error("--limit must be a positive integer.");
      }
      options.limit = limit;
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  options.labels = [...new Set(options.labels)];
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
  npm run tasks:pending -- --room <roomId> [options]

Options:
  -r, --room <roomId>              Room id to read tasks from. Can also use ROOM_ID.
  -l, --label <label>              Filter by label. Repeatable, accepts "#bug" or "bug".
      --labels <a,b>               Filter by comma-separated labels.
      --created-by-name <name>     Filter tasks by creator display name.
      --limit <number>             Max tasks to print. Defaults to ${DEFAULT_LIMIT}.
      --json                       Print JSON instead of Markdown.
  -h, --help                       Show this help.

Examples:
  npm run tasks:pending -- --room testroom
  npm run tasks:pending -- --room testroom --label bug --limit 10
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

async function loadPendingTasks({ projectId, roomId, token }) {
  const parentPath = `projects/${projectId}/databases/(default)/documents/rooms/${encodeURIComponent(roomId)}`;
  const response = await fetch(`https://firestore.googleapis.com/v1/${parentPath}:runQuery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "tasks" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "status" },
            op: "EQUAL",
            value: { stringValue: "pending" },
          },
        },
      },
    }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message || "Could not load pending tasks.");
  }

  return payload
    .filter((row) => row.document)
    .map((row) => parseDocument(row.document));
}

function parseDocument(document) {
  const fields = document.fields || {};
  const id = document.name.split("/").pop();
  const task = { id };

  for (const [key, value] of Object.entries(fields)) {
    task[key] = parseFirestoreValue(value);
  }

  return task;
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

function filterTasks(tasks, options) {
  return tasks.filter((task) => {
    if (options.labels.length > 0 && !taskHasLabels(task, options.labels)) {
      return false;
    }

    if (
      options.createdByName &&
      String(task.createdByName || "").toLowerCase() !== options.createdByName
    ) {
      return false;
    }

    return true;
  });
}

function taskHasLabels(task, labels) {
  const taskLabels = new Set(Array.isArray(task.labels) ? task.labels : []);
  return labels.every((label) => taskLabels.has(label));
}

function compareTasksByCreatedAt(left, right) {
  const leftTime = Date.parse(left.createdAt || "") || 0;
  const rightTime = Date.parse(right.createdAt || "") || 0;

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return left.id.localeCompare(right.id);
}

function formatMarkdown({ roomId, tasks, total, labels, createdByName }) {
  const filters = [];

  if (labels.length > 0) {
    filters.push(`labels: ${labels.map((label) => `#${label}`).join(", ")}`);
  }

  if (createdByName) {
    filters.push(`created by: ${createdByName}`);
  }

  const lines = [
    `# Pending Tasks for \`${roomId}\``,
    "",
    filters.length > 0 ? `Filters: ${filters.join("; ")}` : null,
    `Showing ${tasks.length}${tasks.length !== total ? ` of ${total}` : ""} pending task${tasks.length === 1 ? "" : "s"}.`,
    "",
  ].filter(Boolean);

  if (tasks.length === 0) {
    lines.push("No pending tasks found.");
    return lines.join("\n");
  }

  for (const task of tasks) {
    lines.push(`- ${formatTaskLine(task)}`);
  }

  return lines.join("\n");
}

function formatTaskLine(task) {
  const parts = [
    `\`${formatTaskId(task.id)}\``,
    "-",
    task.description || "(no description)",
    formatLabels(task.labels),
    formatTaskTimeSummary(task),
    formatCreatorSummary(task),
    `[id: ${task.id}]`,
  ];

  return parts.filter(Boolean).join(" ");
}

function formatTaskId(taskId) {
  return `#${taskId.slice(0, 6)}`;
}

function formatLabels(labels) {
  if (!Array.isArray(labels) || labels.length === 0) {
    return "";
  }

  return labels.map((label) => `#${label}`).join(" ");
}

function formatTaskTimeSummary(task) {
  const totalTrackedMs = Number.isFinite(task.totalTrackedMs) ? task.totalTrackedMs : 0;
  const activeMs = task.activeTimerStartedAt
    ? Math.max(0, Date.now() - (Date.parse(task.activeTimerStartedAt) || Date.now()))
    : 0;
  const totalMs = totalTrackedMs + activeMs;
  const parts = [];

  if (totalMs > 0) {
    parts.push(`tracked ${formatDuration(totalMs)}`);
  }

  if (task.activeTimerStartedAt) {
    parts.push(`running by ${task.activeTimerStartedByName || "someone"}`);
  }

  return parts.length > 0 ? `[${parts.join(", ")}]` : "";
}

function formatCreatorSummary(task) {
  const creator = task.createdByName || "Unknown";
  const createdAt = formatDateTime(task.createdAt);

  return `(${creator}${createdAt ? `, ${createdAt}` : ""})`;
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDuration(durationMs) {
  const totalMinutes = Math.max(0, Math.round(durationMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
}

function parseLabels(value) {
  return value
    .split(",")
    .map((label) => label.trim().replace(/^#/, "").toLowerCase())
    .filter(Boolean);
}

function toJsonTask(task) {
  return {
    id: task.id,
    shortId: formatTaskId(task.id),
    description: task.description || "",
    labels: Array.isArray(task.labels) ? task.labels : [],
    createdAt: task.createdAt || null,
    createdBy: task.createdBy || null,
    createdByName: task.createdByName || null,
    totalTrackedMs: Number.isFinite(task.totalTrackedMs) ? task.totalTrackedMs : 0,
    activeTimerStartedAt: task.activeTimerStartedAt || null,
    activeTimerStartedByName: task.activeTimerStartedByName || null,
  };
}
