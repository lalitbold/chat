#!/usr/bin/env node

import { constants as fsConstants } from "node:fs";
import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  createDocument,
  getDocument,
  patchDocument,
  roomPath,
  runCollectionQuery,
  signInAnonymously,
} from "./chat-firestore.mjs";
import { findRepoChangelogEntry } from "./repo-changelog.mjs";

const PROFILE_PATH = join(process.cwd(), ".chat-command-profile.json");
const DEFAULT_LIMIT = 50;
const TASK_CHART_DEFAULT_DAYS = 30;
const TASK_CHART_ALLOWED_DAYS = new Set([7, 30, 90]);
const COMMANDS = new Set(["/task", "/timer", "/change", "/changelog", "/query", "/codex", "/plugin", "/day", "/lead", "/team", "/remind", "/debug"]);

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

  if (options.profileCommand) {
    await saveProfile(options);
    return;
  }

  const profile = await loadProfile();
  const roomId = options.room || profile.room;
  const userName = options.user || profile.userName;
  const commandText = options.command.join(" ").trim();

  if (!commandText) {
    throw new Error("Missing command text. Example: npm run chat:command -- /task list");
  }

  const command = parseCommand(commandText);

  if (isLocalRepoChangelogCommand(command)) {
    printResult(dispatchRepoChangelog(command.payload), options);
    return;
  }

  if (!roomId) {
    throw new Error("Missing room. Run profile setup or pass --room <roomId>.");
  }

  if (!userName) {
    throw new Error("Missing user name. Run profile setup or pass --user <name>.");
  }

  const risk = classifyRisk(command);

  if (options.dryRun) {
    printResult({ ok: true, dryRun: true, roomId, userName, command: commandText, risk }, options);
    return;
  }

  if (risk !== "read" && !options.yes) {
    const confirmed = await confirm(`Run ${risk} command in room "${roomId}" as "${userName}"?`);
    if (!confirmed) {
      throw new Error("Command cancelled.");
    }
  }

  const auth = await signInAnonymously();
  const context = {
    token: auth.idToken,
    uid: auth.uid,
    roomId,
    userName,
    parentPath: roomPath(roomId),
    now: new Date(),
    limit: options.limit,
  };
  const result = await dispatchCommand(command, context);
  printResult(result, options);
}

function parseArgs(args) {
  const options = {
    command: [],
    dryRun: false,
    help: false,
    json: false,
    limit: DEFAULT_LIMIT,
    yes: false,
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

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--yes" || arg === "-y") {
      options.yes = true;
      continue;
    }

    if (arg === "--room" || arg === "-r") {
      options.room = readValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--user" || arg === "-u") {
      options.user = readValue(args, index, arg);
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

    if (arg === "profile") {
      options.profileCommand = true;
      continue;
    }

    options.command.push(arg);
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

async function saveProfile(options) {
  if (!options.room || !options.user) {
    throw new Error("Profile setup needs --room <roomId> and --user <name>.");
  }

  const profile = {
    room: options.room,
    userName: options.user,
    savedAt: new Date().toISOString(),
  };
  await writeFile(PROFILE_PATH, `${JSON.stringify(profile, null, 2)}\n`, "utf8");
  console.log(`Saved chat command profile for room "${profile.room}" as "${profile.userName}".`);
}

async function loadProfile() {
  try {
    await access(PROFILE_PATH, fsConstants.R_OK);
  } catch {
    return {};
  }

  return JSON.parse(await readFile(PROFILE_PATH, "utf8"));
}

function parseCommand(commandText) {
  const normalizedCommandText = normalizeGitBashSlashCommand(commandText);
  const [name = "", ...rest] = normalizedCommandText.trim().split(/\s+/);
  const commandName = name.toLowerCase();

  if (!COMMANDS.has(commandName)) {
    throw new Error(`Unsupported command prefix: ${name}`);
  }

  return {
    name: commandName,
    payload: rest.join(" ").trim(),
    raw: normalizedCommandText.trim(),
  };
}

function normalizeGitBashSlashCommand(commandText) {
  return String(commandText || "").replace(
    /^([A-Za-z]:\/Program Files\/Git)\/(task|timer|change|changelog|query|codex|plugin|day|lead|team|remind|debug)(?=\s|$)/i,
    "/$2"
  );
}

function classifyRisk(command) {
  if (["/codex", "/plugin"].includes(command.name)) return "risky";
  if (["/remind", "/debug"].includes(command.name)) return "local";

  const [action = ""] = command.payload.split(/\s+/);
  const normalizedAction = action.toLowerCase();

  if (command.name === "/task" && ["", "help", "list", "search", "find", "completed", "chart", "view", "comments", "summary", "timers", "active", "current"].includes(normalizedAction)) {
    return "read";
  }

  if (command.name === "/timer" && ["", "help", "list", "active"].includes(normalizedAction)) {
    return "read";
  }

  if (command.name === "/changelog") {
    return "read";
  }

  if (command.name === "/task" && normalizedAction === "codex") {
    const [, subAction = ""] = command.payload.split(/\s+/);
    if (["list", "status"].includes(subAction.toLowerCase())) {
      return "read";
    }
  }

  if (command.name === "/change" && ["", "help", "list", "recent", "summary"].includes(normalizedAction)) {
    return "read";
  }

  if (command.name === "/query" && ["", "help", "list"].includes(normalizedAction)) {
    return "read";
  }

  if (command.name === "/lead" && ["", "help", "list"].includes(normalizedAction)) {
    return "read";
  }

  if (command.name === "/team" && (normalizedAction === "" || normalizedAction === "help" || normalizedAction === "list" || command.payload.includes(" list"))) {
    return "read";
  }

  if (command.name === "/day" && ["", "help", "status", "summary", "timesheet", "sheet", "idle"].includes(normalizedAction)) {
    return "read";
  }

  return ["complete", "reopen", "edit", "update", "disable", "done", "cancel"].includes(normalizedAction)
    ? "risky"
    : "write";
}

async function dispatchCommand(command, context) {
  if (command.name === "/task") return dispatchTask(command.payload, context);
  if (command.name === "/timer") return dispatchTimer(command.payload, context);
  if (command.name === "/change") return dispatchChange(command.payload, context);
  if (command.name === "/changelog") return dispatchRepoChangelog(command.payload);
  if (command.name === "/query") return dispatchQuery(command.payload, context);
  if (command.name === "/codex") return dispatchCodex(command.payload, context);
  if (command.name === "/plugin") return dispatchPlugin(command.payload, context);
  if (command.name === "/day") return dispatchDay(command.payload, context);
  if (command.name === "/lead") return dispatchLead(command.payload, context);
  if (command.name === "/team") return dispatchTeam(command.payload, context);
  return unsupported(command.name, "This command depends on browser-local state and is not available in the terminal yet.");
}

function isLocalRepoChangelogCommand(command) {
  if (command.name === "/changelog") return true;

  const [action = "", handle = ""] = String(command.payload || "").trim().split(/\s+/);
  return command.name === "/change" && action.toLowerCase() === "summary" && handle.toLowerCase().startsWith("#deploy-");
}

function dispatchRepoChangelog(payload) {
  const [actionOrHandle = "", ...rest] = String(payload || "").trim().split(/\s+/);
  const normalizedAction = actionOrHandle.toLowerCase();

  if (!payload || normalizedAction === "help") {
    return textResult("Repo changelog commands:\n/changelog <handle>\n/changelog show <handle>");
  }

  const handle = normalizedAction === "show" || normalizedAction === "summary" ? rest.join(" ").trim() : actionOrHandle;
  const entry = findRepoChangelogEntry(process.cwd(), handle);
  return textResult(entry ? entry.trim() : `Changelog handle not found: ${handle}`);
}

async function dispatchTask(payload, context) {
  const [action = "", ...rest] = payload.split(/\s+/);
  const normalizedAction = action.toLowerCase();
  const input = rest.join(" ").trim();

  if (!payload || normalizedAction === "help") {
    return textResult(taskHelp());
  }

  if (normalizedAction === "create") {
    const { text, labels } = extractLabels(input);
    if (!text) return textResult("Add a task description after /task create.");
    const task = await createDocument({
      token: context.token,
      path: `${context.parentPath}/tasks`,
      fields: {
        description: text,
        labels,
        status: "pending",
        createdAt: context.now,
        createdBy: context.uid,
        createdByName: context.userName,
        completedAt: null,
        completedBy: null,
        completedByName: null,
        totalTrackedMs: 0,
        activeTimerStartedAt: null,
        activeTimerStartedBy: null,
        activeTimerStartedByName: null,
        subtasks: [],
        codexCommandId: null,
        codexStatus: null,
        codexPrompt: null,
        codexQueuedAt: null,
        codexCompletedAt: null,
        codexResultSummary: null,
      },
    });
    await postMessage(context, `Task ${formatShortId(task.id, "#")} created: ${text}${formatLabels(labels)}`, "Tasks");
    return textResult(`Created ${formatShortId(task.id, "#")}: ${text}${formatLabels(labels)}`, { task });
  }

  if (normalizedAction === "list" || normalizedAction === "completed") {
    const labels = parseLabels(input);
    const status = normalizedAction === "completed" ? "complete" : "pending";
    const tasks = (await loadTasks(context, status))
      .filter((task) => hasLabels(task, labels))
      .sort(compareTasks)
      .slice(0, context.limit);
    return textResult(formatTaskList(tasks, status, labels), { tasks });
  }

  if (normalizedAction === "search" || normalizedAction === "find") {
    if (!input) {
      return textResult("Use /task search <query>.");
    }

    const tasks = (await loadCollection(context, "tasks"))
      .filter((task) => taskMatchesSearchQuery(task, input))
      .sort(compareTaskSearchResults)
      .slice(0, context.limit);
    return textResult(formatTaskSearchList(tasks, input), { tasks });
  }

  if (normalizedAction === "chart") {
    const options = parseTaskChartOptions(input);

    if (options.error) {
      return textResult(options.error);
    }

    const chart = buildTaskChart(await loadCollection(context, "tasks"), options);
    return textResult(formatTaskChart(chart), { chart });
  }

  if (normalizedAction === "timers" || normalizedAction === "active") {
    return activeTimersResult(context);
  }

  if (normalizedAction === "codex-create") {
    if (!(await isPluginEnabled(context, "codex-tasks"))) {
      return textResult("Codex Tasks plugin is disabled for this group. Enable it with /plugin enable codex-tasks.");
    }
    return queueTaskCodexCommand(input, context);
  }

  if (normalizedAction === "codex") {
    if (!(await isPluginEnabled(context, "codex-tasks"))) {
      return textResult("Codex Tasks plugin is disabled for this group. Enable it with /plugin enable codex-tasks.");
    }
    const [codexAction = "", ...codexRest] = input.split(/\s+/);
    const normalizedCodexAction = codexAction.toLowerCase();

    if (normalizedCodexAction === "list") {
      const tasks = (await loadCollection(context, "tasks"))
        .filter((task) => task.codexStatus || task.codexCommandId)
        .sort(compareTasks)
        .slice(0, context.limit);
      return textResult(formatTaskList(tasks, "codex", []), { tasks });
    }

    if (normalizedCodexAction === "status") {
      const task = await findByShortId(context, "tasks", codexRest.join(" ").trim());
      return textResult(task ? formatTaskCodexStatus(task) : `Task ${codexRest.join(" ").trim()} was not found.`);
    }
  }

  if (normalizedAction === "comment") {
    const [taskId = "", ...commentParts] = rest;
    const commentText = commentParts.join(" ").trim();

    if (!taskId) return textResult("Use /task comment <id> <comment>.");
    if (!commentText) return textResult("Add a comment after the task id.");

    const task = await findByShortId(context, "tasks", taskId);
    if (!task) return textResult(`Task ${taskId} was not found.`);

    await createDocument({
      token: context.token,
      path: `${context.parentPath}/tasks/${task.id}/comments`,
      fields: {
        taskId: task.id,
        text: commentText,
        createdAt: context.now,
        createdBy: context.uid,
        createdByName: context.userName,
      },
    });
    await postMessage(
      context,
      `Comment added to Task ${formatShortId(task.id, "#")} (${task.description || "Untitled task"}): ${commentText}`,
      "Tasks"
    );
    return textResult(`Comment added to ${formatShortId(task.id, "#")}: ${commentText}`);
  }

  if (normalizedAction === "complete" || normalizedAction === "reopen") {
    const task = await findByShortId(context, "tasks", input);
    if (!task) return textResult(`Task ${input} was not found.`);
    const complete = normalizedAction === "complete";
    await patchDocument({
      token: context.token,
      name: task.name,
      fields: complete
        ? { status: "complete", completedAt: context.now, completedBy: context.uid, completedByName: context.userName }
        : { status: "pending", completedAt: null, completedBy: null, completedByName: null, reopenedAt: context.now, reopenedBy: context.uid, reopenedByName: context.userName },
    });
    await postMessage(context, `Task ${formatShortId(task.id, "#")} ${complete ? "completed" : "reopened"}: ${task.description}`, "Tasks");
    return textResult(`Task ${formatShortId(task.id, "#")} ${complete ? "completed" : "reopened"}: ${task.description}`);
  }

  return unsupported("/task", `Terminal /task supports help, create, list, search, completed, chart, timers, complete, reopen, comment, codex-create, codex list, and codex status. Received: ${payload}`);
}

async function dispatchTimer(payload, context) {
  const [action = ""] = payload.split(/\s+/);
  const normalizedAction = action.toLowerCase();

  if (!payload || normalizedAction === "help") {
    return textResult(timerHelp());
  }

  if (normalizedAction === "list" || normalizedAction === "active") {
    return activeTimersResult(context);
  }

  return unsupported("/timer", "Terminal /timer currently supports help and list. Start, stop, continue, log, and history still need the browser.");
}

async function dispatchDay(payload, context) {
  const [action = "", ...rest] = String(payload || "").trim().split(/\s+/);
  const normalizedAction = action.toLowerCase();

  if (!payload || normalizedAction === "help") {
    return textResult(dayHelp());
  }

  if (normalizedAction === "idle") {
    const request = parseDayIdleRequest(rest.join(" "));

    if (!request) {
      return textResult("Use /day idle [today|yesterday|YYYY-MM-DD] [@handle].");
    }

    const idleSessions = (await loadCollection(context, "idleSessions"))
      .filter((session) => idleSessionMatches(session, request, context))
      .sort((left, right) => getTimestampMillis(left.startedAt) - getTimestampMillis(right.startedAt))
      .slice(0, context.limit);
    return textResult(formatIdleHistory(idleSessions, request, context), { idleSessions });
  }

  return unsupported("/day", "Terminal /day currently supports help and idle.");
}

async function activeTimersResult(context) {
  const [tasks, workDays] = await Promise.all([
    loadCollection(context, "tasks"),
    loadCollection(context, "workDays"),
  ]);
  const activeTaskTimers = tasks
    .filter((task) => task.activeTimerStartedAt)
    .sort(compareActiveTimersByStartedAt);
  const activeGeneralTimers = workDays
    .filter((workDay) => workDay.activeTimerStartedAt)
    .sort(compareActiveTimersByStartedAt);

  return textResult(formatActiveTimers(activeTaskTimers, activeGeneralTimers, context.now), {
    taskTimers: activeTaskTimers,
    nonTaskTimers: activeGeneralTimers,
  });
}

async function queueTaskCodexCommand(input, context) {
  const [taskIdInput = "", ...instructionParts] = input.trim().split(/\s+/);

  if (!taskIdInput) {
    return textResult("Use /task codex-create <task-id> [instruction].");
  }

  const task = await findByShortId(context, "tasks", taskIdInput);

  if (!task) {
    return textResult(`Task ${taskIdInput} was not found.`);
  }

  const prompt = buildTaskCodexPrompt(task, instructionParts.join(" "));
  const command = await createDocument({
    token: context.token,
    path: `${context.parentPath}/codexCommands`,
    fields: {
      prompt,
      status: "queued",
      requestedBy: context.uid,
      requestedByName: context.userName,
      taskId: task.id,
      taskDescription: task.description || "Untitled task",
      taskLink: true,
      createdAt: context.now,
      updatedAt: context.now,
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
    },
  });

  await patchDocument({
    token: context.token,
    name: task.name,
    fields: {
      codexCommandId: command.id,
      codexStatus: "queued",
      codexPrompt: prompt,
      codexQueuedAt: context.now,
      codexCompletedAt: null,
      codexResultSummary: null,
      updatedAt: context.now,
      updatedBy: context.uid,
      updatedByName: context.userName,
    },
  });

  await postMessage(
    context,
    `Task ${formatShortId(task.id, "#")} linked to Codex command ${formatShortId(command.id, "#")}: ${task.description || "Untitled task"}`,
    "Tasks"
  );

  return textResult(`Queued Codex command ${formatShortId(command.id, "#")} for task ${formatShortId(task.id, "#")}.`, {
    taskId: task.id,
    command,
  });
}

async function dispatchChange(payload, context) {
  const [action = "", ...rest] = payload.split(/\s+/);
  const normalizedAction = action.toLowerCase();
  const input = rest.join(" ").trim();

  if (!payload || normalizedAction === "help") {
    return textResult("Change commands:\n/change add <summary> #label\n/change list");
  }

  if (["add", "log", "record"].includes(normalizedAction)) {
    const { text, labels } = extractLabels(input);
    if (!text) return textResult("Use /change add <summary> #label.");
    const change = await createDocument({
      token: context.token,
      path: `${context.parentPath}/changelog`,
      fields: { text, labels, createdAt: context.now, createdBy: context.uid, createdByName: context.userName },
    });
    await postMessage(context, `Change ${formatShortId(change.id, "~")} logged: ${text}${formatLabels(labels)}`, "Changes");
    return textResult(`Logged ${formatShortId(change.id, "~")}: ${text}${formatLabels(labels)}`, { change });
  }

  if (["list", "recent", "summary"].includes(normalizedAction)) {
    const changes = (await loadCollection(context, "changelog")).sort(compareCreatedDesc).slice(0, context.limit);
    return textResult(formatChangeList(changes), { changes });
  }

  return unsupported("/change", `Terminal /change supports help, add, list, and summary. Received: ${payload}`);
}

async function dispatchQuery(payload, context) {
  const [action = "", ...rest] = payload.split(/\s+/);
  const normalizedAction = action.toLowerCase();

  if (!payload || normalizedAction === "help") {
    return textResult("Query commands:\n/query <question>\n/query list\n/query respond <id> <response>\n/query close <id>");
  }

  if (normalizedAction === "list") {
    const queries = (await loadCollection(context, "queries"))
      .filter((query) => query.status === "pending")
      .sort(compareCreatedAsc)
      .slice(0, context.limit);
    return textResult(formatQueryList(queries), { queries });
  }

  if (normalizedAction === "respond" || normalizedAction === "answer") {
    const [queryId = "", ...responseParts] = rest;
    const responseText = responseParts.join(" ").trim();
    if (!queryId || !responseText) return textResult("Use /query respond <id> <response>.");
    const query = await findByShortId(context, "queries", queryId);
    if (!query) return textResult(`Query ${queryId} was not found.`);
    await patchDocument({
      token: context.token,
      name: query.name,
      fields: { status: "answered", answeredAt: context.now, answeredBy: context.uid, answeredByName: context.userName, responseText, updatedAt: context.now },
    });
    await postMessage(context, `Query ${formatShortId(query.id, "?")} answered by ${context.userName}: ${responseText}`, "Queries");
    return textResult(`Answered ${formatShortId(query.id, "?")}: ${responseText}`);
  }

  if (normalizedAction === "close" || normalizedAction === "done") {
    const queryId = rest.join(" ").trim();
    if (!queryId) return textResult("Use /query close <id>.");
    const query = await findByShortId(context, "queries", queryId);
    if (!query) return textResult(`Query ${queryId} was not found.`);
    await patchDocument({
      token: context.token,
      name: query.name,
      fields: { status: "answered", answeredAt: context.now, answeredBy: context.uid, answeredByName: context.userName, responseText: null, updatedAt: context.now },
    });
    return textResult(`Closed ${formatShortId(query.id, "?")}.`);
  }

  const question = payload.trim();
  const query = await createDocument({
    token: context.token,
    path: `${context.parentPath}/queries`,
    fields: {
      text: question,
      status: "pending",
      createdAt: context.now,
      createdBy: context.uid,
      createdByName: context.userName,
      answeredAt: null,
      answeredBy: null,
      answeredByName: null,
      responseText: null,
      taskId: null,
      taskDescription: null,
      reminderIntervalMs: 600000,
      lastReminderAt: null,
      reminderCount: 0,
    },
  });
  await postMessage(context, `Query ${formatShortId(query.id, "?")}: ${question}`, "Queries");
  return textResult(`Created query ${formatShortId(query.id, "?")}: ${question}`, { query });
}

async function dispatchCodex(payload, context) {
  const prompt = payload.trim();
  if (!prompt || prompt.toLowerCase() === "help") {
    return textResult("Codex commands:\n/codex <instruction>");
  }

  const command = await createDocument({
    token: context.token,
    path: `${context.parentPath}/codexCommands`,
    fields: {
      prompt,
      status: "queued",
      requestedBy: context.uid,
      requestedByName: context.userName,
      createdAt: context.now,
      updatedAt: context.now,
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
    },
  });
  await postMessage(context, `Queued Codex command ${formatShortId(command.id, "#")} from ${context.userName}.\n${prompt}`, "Codex");
  return textResult(`Queued Codex command ${formatShortId(command.id, "#")}: ${prompt}`, { command });
}

async function dispatchPlugin(payload, context) {
  const [action = "", plugin = ""] = payload.split(/\s+/);
  const normalizedAction = action.toLowerCase();
  const normalizedPlugin = normalizePluginName(plugin);

  if (!payload || normalizedAction === "help") {
    return textResult("Plugin commands:\n/plugin enable leads\n/plugin disable leads\n/plugin enable team\n/plugin disable team\n/plugin enable day\n/plugin disable day\n/plugin enable codex-tasks\n/plugin disable codex-tasks\n/plugin list");
  }

  if (normalizedAction === "list") {
    const room = await getRoom(context);
    return textResult(formatPluginList(room.plugins));
  }

  if (!["enable", "disable"].includes(normalizedAction) || !["leads", "team", "day", "codex-tasks"].includes(normalizedPlugin)) {
    return textResult("Supported plugins: leads, team, day, codex-tasks.");
  }

  const enabled = normalizedAction === "enable";
  const room = await getRoom(context).catch(() => ({ plugins: {} }));
  const plugins = {
    ...(room.plugins || {}),
    [normalizedPlugin]: {
      ...(room.plugins?.[normalizedPlugin] || {}),
      enabled,
    },
  };
  await patchDocument({
    token: context.token,
    name: context.parentPath,
    fields: { plugins },
  });
  return textResult(`${formatPluginName(normalizedPlugin)} plugin ${enabled ? "enabled" : "disabled"} for this group.`);
}

async function dispatchLead(payload, context) {
  const [action = ""] = payload.split(/\s+/);
  if (!payload || action.toLowerCase() === "help") {
    return textResult("Lead commands:\n/lead list");
  }

  if (action.toLowerCase() === "list") {
    const leads = (await loadCollection(context, "leads")).sort(compareCreatedDesc).slice(0, context.limit);
    return textResult(formatLeadList(leads), { leads });
  }

  return unsupported("/lead", "Terminal /lead currently supports list only.");
}

async function dispatchTeam(payload, context) {
  const parts = payload.split(/\s+/).map((part) => part.toLowerCase());

  if (!payload || parts[0] === "help") {
    return textResult("Team commands:\n/team list\n/team task list\n/team followup list");
  }

  if (parts[0] === "list" || (parts[0] === "member" && parts[1] === "list") || (parts[0] === "members" && parts[1] === "list")) {
    const members = (await loadCollection(context, "teamMembers")).sort(compareCreatedAsc).slice(0, context.limit);
    return textResult(formatTeamMemberList(members), { members });
  }

  if (parts[0] === "followup" && parts[1] === "list") {
    const followups = (await loadCollection(context, "followups")).filter((item) => item.status !== "complete").sort(compareCreatedAsc).slice(0, context.limit);
    return textResult(formatFollowupList(followups), { followups });
  }

  if (parts[0] === "task" && parts[1] === "list") {
    const tasks = (await loadCollection(context, "tasks")).filter((task) => task.assignedTeamMemberId || task.jiraKey).sort(compareTasks).slice(0, context.limit);
    return textResult(formatTaskList(tasks, "team", []), { tasks });
  }

  return unsupported("/team", "Terminal /team currently supports list, task list, and followup list.");
}

async function loadTasks(context, status) {
  return runCollectionQuery({
    token: context.token,
    parentPath: context.parentPath,
    collectionId: "tasks",
    where: {
      fieldFilter: {
        field: { fieldPath: "status" },
        op: "EQUAL",
        value: { stringValue: status },
      },
    },
  });
}

async function getRoom(context) {
  return getDocument({
    token: context.token,
    name: context.parentPath,
  });
}

async function loadCollection(context, collectionId) {
  return runCollectionQuery({
    token: context.token,
    parentPath: context.parentPath,
    collectionId,
  });
}

async function findByShortId(context, collectionId, inputId) {
  const normalized = String(inputId || "").replace(/^[#~?!%]/, "").toLowerCase();
  const items = await loadCollection(context, collectionId);
  return items.find((item) => item.id.toLowerCase() === normalized || item.id.toLowerCase().startsWith(normalized)) || null;
}

async function postMessage(context, text, senderName = context.userName) {
  return createDocument({
    token: context.token,
    path: `${context.parentPath}/messages`,
    fields: {
      text,
      senderId: context.uid,
      senderName,
      createdAt: context.now,
    },
  });
}

function extractLabels(value) {
  const labels = parseLabels(value);
  const text = String(value || "")
    .replace(/(^|\s)#[a-z0-9][a-z0-9_-]*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { text, labels };
}

function parseLabels(value) {
  return [...String(value || "").matchAll(/(?:^|\s)#([a-z0-9][a-z0-9_-]*)/gi)].map((match) => match[1].toLowerCase());
}

function hasLabels(item, labels) {
  if (labels.length === 0) return true;
  const itemLabels = new Set(Array.isArray(item.labels) ? item.labels : []);
  return labels.every((label) => itemLabels.has(label));
}

function formatTaskList(tasks, status, labels) {
  const heading = status === "complete" ? "Completed tasks" : status === "team" ? "Team tasks" : status === "codex" ? "Codex tasks" : "Pending tasks";
  const filter = labels.length > 0 ? ` ${formatLabels(labels).trim()}` : "";
  if (tasks.length === 0) return `No ${heading.toLowerCase()}${filter}.`;
  return [
    `${heading}${filter}:`,
    ...tasks.map((task) => `${formatShortId(task.id, "#")} - ${task.description || "(no description)"}${formatLabels(task.labels)}${formatCodexTaskSummary(task)} (${task.createdByName || "Unknown"})`),
    `Total: ${tasks.length}`,
  ].join("\n");
}

function formatTaskSearchList(tasks, queryText) {
  if (tasks.length === 0) return `No tasks matching "${queryText}".`;
  return [
    `Task search "${queryText}":`,
    ...tasks.map((task) => `${formatShortId(task.id, "#")} - ${task.description || "(no description)"}${formatLabels(task.labels)}${formatCodexTaskSummary(task)} (${formatTaskSearchMetadata(task)})`),
    `Total: ${tasks.length}`,
  ].join("\n");
}

function formatTaskSearchMetadata(task) {
  const parts = [
    task.status || "pending",
    task.status === "complete" && task.completedByName ? `completed by ${task.completedByName}` : "",
    task.status !== "complete" && task.createdByName ? `created by ${task.createdByName}` : "",
    task.jiraKey ? `Jira ${task.jiraKey}` : "",
    task.assigneeName ? `assigned to ${task.assigneeName}` : "",
  ].filter(Boolean);

  return parts.join(", ");
}

function taskMatchesSearchQuery(task, queryText) {
  const searchText = normalizeTaskSearchText(queryText);

  if (!searchText) {
    return false;
  }

  return getTaskSearchHaystack(task).includes(searchText);
}

function getTaskSearchHaystack(task) {
  const fields = [
    task.id,
    formatShortId(task.id, "#"),
    task.description,
    task.title,
    task.status,
    task.createdByName,
    task.completedByName,
    task.activeTimerStartedByName,
    task.activeTimerDescription,
    task.assigneeName,
    task.assigneeMemberId,
    task.jiraKey,
    task.jiraStatus,
    task.jiraUrl,
    task.source,
    task.codexStatus,
    task.codexResultSummary,
    ...(Array.isArray(task.labels) ? task.labels.map((label) => `#${label} ${label}`) : []),
    ...(Array.isArray(task.subtasks) ? task.subtasks.map((subtask) => subtask?.text || subtask?.description || "") : []),
  ];

  return normalizeTaskSearchText(fields.filter(Boolean).join(" "));
}

function normalizeTaskSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/#/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function compareTaskSearchResults(left, right) {
  if (left.status !== right.status) {
    return left.status === "pending" ? -1 : 1;
  }

  return compareTasks(left, right);
}

function parseTaskChartOptions(input = "") {
  const options = {
    mode: "created",
    days: TASK_CHART_DEFAULT_DAYS,
    labels: parseLabels(input),
  };
  const tokens = String(input || "").split(/\s+/).map((token) => token.trim()).filter(Boolean);

  for (const token of tokens) {
    const normalized = token.toLowerCase();

    if (normalized.startsWith("#")) {
      continue;
    }

    if (normalized === "created" || normalized === "completed" || normalized === "pending") {
      options.mode = normalized;
      continue;
    }

    const daysMatch = normalized.match(/^(\d+)d$/);

    if (daysMatch) {
      const days = Number.parseInt(daysMatch[1], 10);

      if (!TASK_CHART_ALLOWED_DAYS.has(days)) {
        return {
          ...options,
          error: "Use /task chart [created|completed|pending] [7d|30d|90d] [#label].",
        };
      }

      options.days = days;
      continue;
    }

    return {
      ...options,
      error: "Use /task chart [created|completed|pending] [7d|30d|90d] [#label].",
    };
  }

  return options;
}

function buildTaskChart(tasks, options) {
  if (options.mode === "pending") {
    return buildPendingTaskChart(tasks, options);
  }

  const fieldName = options.mode === "completed" ? "completedAt" : "createdAt";
  const dateKeys = getRecentDateKeys(options.days);
  const countsByDate = new Map(dateKeys.map((dateKey) => [dateKey, 0]));
  const startKey = dateKeys[0];
  const endKey = dateKeys[dateKeys.length - 1];

  tasks
    .filter((task) => hasLabels(task, options.labels))
    .forEach((task) => {
      const dateKey = getDateKeyFromTimestamp(task[fieldName]);

      if (dateKey && dateKey >= startKey && dateKey <= endKey) {
        countsByDate.set(dateKey, (countsByDate.get(dateKey) || 0) + 1);
      }
    });

  const points = dateKeys.map((dateKey) => ({
    dateKey,
    count: countsByDate.get(dateKey) || 0,
  }));
  const total = points.reduce((sum, point) => sum + point.count, 0);
  const peak = points.reduce((max, point) => Math.max(max, point.count), 0);
  const labelText = options.labels.length > 0 ? formatLabels(options.labels).trim() : "";

  return {
    mode: options.mode,
    days: options.days,
    labels: options.labels,
    labelText,
    points,
    total,
    peak,
  };
}

function buildPendingTaskChart(tasks, options) {
  const dateKeys = getRecentDateKeys(options.days);
  const filteredTasks = tasks.filter((task) => hasLabels(task, options.labels));
  const points = dateKeys.map((dateKey) => ({
    dateKey,
    count: filteredTasks.filter((task) => isTaskPendingOnDate(task, dateKey)).length,
  }));
  const total = points[points.length - 1]?.count || 0;
  const peak = points.reduce((max, point) => Math.max(max, point.count), 0);
  const labelText = options.labels.length > 0 ? formatLabels(options.labels).trim() : "";

  return {
    mode: options.mode,
    days: options.days,
    labels: options.labels,
    labelText,
    points,
    total,
    peak,
  };
}

function isTaskPendingOnDate(task, dateKey) {
  const createdKey = getDateKeyFromTimestamp(task.createdAt);

  if (!createdKey || createdKey > dateKey) {
    return false;
  }

  if (task.status !== "complete") {
    return true;
  }

  const completedKey = getDateKeyFromTimestamp(task.completedAt);
  return !completedKey || completedKey > dateKey;
}

function formatTaskChart(chart) {
  const modeLabel = chart.mode === "completed" ? "Completed" : chart.mode === "pending" ? "Pending" : "Created";

  if (!chart.total) {
    return chart.mode === "pending"
      ? `No pending tasks in the last ${chart.days} days${chart.labelText ? ` for ${chart.labelText}` : ""}.`
      : `No ${chart.mode === "completed" ? "completed" : "created"} task activity in the last ${chart.days} days${chart.labelText ? ` for ${chart.labelText}` : ""}.`;
  }

  return [
    `${modeLabel} tasks by day${chart.labelText ? ` ${chart.labelText}` : ""}`,
    `Range: last ${chart.days} days. ${chart.mode === "pending" ? "Current pending" : "Total"}: ${chart.total}. Peak: ${chart.peak}.`,
    ...chart.points.map((point) => `${point.dateKey}: ${point.count}`),
  ].join("\n");
}

function formatActiveTimers(activeTaskTimers, activeGeneralTimers, now = new Date()) {
  if (activeTaskTimers.length === 0 && activeGeneralTimers.length === 0) {
    return "No active timers.";
  }

  const lines = ["Active timers:"];

  if (activeGeneralTimers.length > 0) {
    lines.push("Non-task:");
    activeGeneralTimers.forEach((workDay) => {
      const ownerName = workDay.activeTimerStartedByName || workDay.userName || "Someone";
      const elapsed = formatDuration(now.getTime() - getTimestampMillis(workDay.activeTimerStartedAt));
      const description = getGeneralTimerDisplayDescription(workDay.activeTimerDescription);
      const timerKind = workDay.activeTimerSource === "timer" ? "Timer" : "General";
      lines.push(`- ${timerKind} ${ownerName}: ${elapsed}${description !== "General work" ? ` - ${description}` : ""}`);
    });
  }

  if (activeTaskTimers.length > 0) {
    lines.push("Tasks:");
    activeTaskTimers.forEach((task) => {
      const ownerName = task.activeTimerStartedByName || task.createdByName || "Someone";
      const elapsed = formatDuration(now.getTime() - getTimestampMillis(task.activeTimerStartedAt));
      lines.push(`- ${formatShortId(task.id, "#")} ${getTaskTimerDisplayDescription(task)} (${ownerName}, ${elapsed})`);
    });
  }

  return lines.join("\n");
}

function getRecentDateKeys(days) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  const keys = [];

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    keys.push(formatDateKey(date));
  }

  return keys;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateKeyFromTimestamp(timestamp) {
  if (!timestamp) {
    return "";
  }

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return formatDateKey(date);
}

function getTimestampMillis(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") return Date.parse(value) || 0;
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (Number.isFinite(value.seconds)) return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1000000);
  return Date.parse(String(value)) || 0;
}

function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function parseDayIdleRequest(input = "") {
  const parts = String(input || "").trim().split(/\s+/).filter(Boolean);
  let dateKey = formatDateKey(new Date());
  const handleParts = [];

  for (const part of parts) {
    const parsedDateKey = parseDateKey(part);

    if (parsedDateKey) {
      dateKey = parsedDateKey;
      continue;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(part)) {
      return null;
    }

    handleParts.push(part);
  }

  const { start, end } = getDateBounds(dateKey);
  return {
    dateKey,
    start,
    end,
    handle: normalizeHandle(handleParts.join(" ")),
  };
}

function parseDateKey(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized || normalized === "today") {
    return formatDateKey(new Date());
  }

  if (normalized === "yesterday") {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return formatDateKey(date);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const date = new Date(`${normalized}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : normalized;
  }

  return null;
}

function getDateBounds(dateKey) {
  const start = new Date(`${dateKey}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function normalizeHandle(value) {
  return String(value || "").trim().toLowerCase().replace(/^@/, "");
}

function idleSessionMatches(session, request, context) {
  if (!isTimestampWithin(session.startedAt, request.start, request.end) && !isTimestampWithin(session.endedAt, request.start, request.end)) {
    return false;
  }

  if (!request.handle) {
    return session.userName === context.userName || session.userId === context.uid;
  }

  const names = [session.userName, session.userId].map(normalizeHandle).filter(Boolean);
  return names.some((name) => name.includes(request.handle) || request.handle.includes(name));
}

function isTimestampWithin(timestamp, start, end) {
  const millis = getTimestampMillis(timestamp);
  return millis >= start.getTime() && millis < end.getTime();
}

function getIdleSessionDurationMs(session) {
  if (Number.isFinite(session?.durationMs)) {
    return session.durationMs;
  }

  const startedAt = getTimestampMillis(session?.startedAt);
  const endedAt = getTimestampMillis(session?.endedAt);
  return startedAt && endedAt ? Math.max(0, endedAt - startedAt) : 0;
}

function formatIdleHistory(idleSessions, request, context) {
  const totalMs = idleSessions.reduce((total, session) => total + getIdleSessionDurationMs(session), 0);
  const personLabel = request.handle ? `@${request.handle}` : context.userName;
  const lines = [
    `Idle history for ${personLabel} on ${request.dateKey}`,
    `System idle: ${formatDuration(totalMs)} (${idleSessions.length} session${idleSessions.length === 1 ? "" : "s"})`,
  ];

  if (idleSessions.length === 0) {
    lines.push("No idle sessions found.");
    return lines.join("\n");
  }

  idleSessions.forEach((session) => {
    lines.push(
      `- ${formatTimeRange(session.startedAt, session.endedAt)} (${formatDuration(getIdleSessionDurationMs(session))}) ${session.decision || "pending"}`
    );
  });

  return lines.join("\n");
}

function formatTimeRange(startedAt, endedAt) {
  return `${formatTime(startedAt)}-${endedAt ? formatTime(endedAt) : "running"}`;
}

function formatTime(timestamp) {
  const millis = getTimestampMillis(timestamp);

  if (!millis) {
    return "--:--";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(millis));
}

function getTaskTimerDisplayDescription(task) {
  const description = sanitizeTimerDescription(task?.activeTimerDescription || "");
  return description || task?.description || "Task work";
}

function getGeneralTimerDisplayDescription(timerDescription = "") {
  const description = sanitizeTimerDescription(timerDescription);
  return description || "General work";
}

function sanitizeTimerDescription(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function compareActiveTimersByStartedAt(left, right) {
  return getTimestampMillis(left.activeTimerStartedAt) - getTimestampMillis(right.activeTimerStartedAt) || left.id.localeCompare(right.id);
}

function formatCodexTaskSummary(task) {
  return task.codexStatus ? ` [Codex ${formatCodexStatus(task.codexStatus)}]` : "";
}

function formatTaskCodexStatus(task) {
  const lines = [
    `Task ${formatShortId(task.id, "#")} Codex status: ${formatCodexStatus(task.codexStatus || "not linked")}`,
    `Description: ${task.description || "(no description)"}`,
  ];

  if (task.codexCommandId) lines.push(`Command: ${formatShortId(task.codexCommandId, "#")}`);
  if (task.codexQueuedAt) lines.push(`Queued: ${task.codexQueuedAt}`);
  if (task.codexCompletedAt) lines.push(`Completed: ${task.codexCompletedAt}`);
  if (task.codexResultSummary) lines.push(`Result: ${task.codexResultSummary}`);

  return lines.join("\n");
}

function formatCodexStatus(status) {
  const normalized = String(status || "").trim();
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Unknown";
}

function buildTaskCodexPrompt(task, instruction) {
  const labels = Array.isArray(task.labels) && task.labels.length > 0
    ? task.labels.map((label) => `#${label}`).join(" ")
    : "none";
  const userInstruction = instruction.trim() || "Process this task and report what was done.";

  return [
    "Process this chat task through Codex.",
    "If the task lacks enough context, do not guess. Ask concise clarification questions using this exact chat command format:",
    `/query task ${formatShortId(task.id, "#")} <one clear question>`,
    "Ask at most 3 questions. If the next step is clear, proceed normally.",
    "",
    `Task: ${formatShortId(task.id, "#")}`,
    `Full ID: ${task.id}`,
    `Description: ${task.description || "Untitled task"}`,
    `Labels: ${labels}`,
    `Creator: ${task.createdByName || "Unknown"}`,
    "",
    `Instruction: ${userInstruction}`,
  ].join("\n");
}

function formatChangeList(changes) {
  if (changes.length === 0) return "No changes logged yet.";
  return ["Recent changes:", ...changes.map((change) => `${formatShortId(change.id, "~")} ${change.text || "Untitled change"}${formatLabels(change.labels)} (${change.createdByName || "Unknown"})`)].join("\n");
}

function formatQueryList(queries) {
  if (queries.length === 0) return "No pending queries.";
  return ["Pending queries:", ...queries.map((query) => `${formatShortId(query.id, "?")} ${query.text || "(no question)"} (${query.createdByName || "Unknown"})`)].join("\n");
}

function formatLeadList(leads) {
  if (leads.length === 0) return "No leads found.";
  return ["Recent leads:", ...leads.map((lead) => `~${lead.id.slice(0, 6)} ${lead.name || "Unnamed"} ${lead.status || "new"}${lead.phone ? ` phone:${lead.phone}` : ""}`)].join("\n");
}

function formatTeamMemberList(members) {
  if (members.length === 0) return "No team members found.";
  return ["Team members:", ...members.map((member) => `${formatTeamMemberMention(member, members)} ${member.name || "Unnamed"} ${member.role || ""} ${member.status || "active"}`.trim())].join("\n");
}

function formatTeamMemberMention(member, members = []) {
  const slug = getTeamMemberMentionSlug(member) || String(member.id || "").slice(0, 6).toLowerCase() || "member";
  const duplicateCount = members.filter((candidate) => getTeamMemberMentionSlug(candidate) === slug).length;
  return duplicateCount > 1 ? `@${slug}-${String(member.id || "").slice(0, 6)}` : `@${slug}`;
}

function getTeamMemberMentionSlug(member) {
  const handle = String(member?.handle || "").trim().replace(/^@/, "");
  const source = handle || member?.name || "";
  return String(source)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatFollowupList(followups) {
  if (followups.length === 0) return "No pending followups.";
  return ["Pending followups:", ...followups.map((item) => `!${item.id.slice(0, 6)} ${item.text || item.note || "(no text)"}`)].join("\n");
}

function formatPluginList(plugins = {}) {
  return [
    "Group plugins:",
    `- Leads: ${plugins?.leads?.enabled ? "enabled" : "disabled"}`,
    `- Team: ${plugins?.team?.enabled ? "enabled" : "disabled"}`,
    `- Day: ${plugins?.day?.enabled ? "enabled" : "disabled"}`,
    `- Codex Tasks: ${plugins?.["codex-tasks"]?.enabled ? "enabled" : "disabled"}`,
  ].join("\n");
}

function normalizePluginName(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (["codex", "codextasks", "codex_tasks", "codex-task", "codex-tasks"].includes(normalized)) {
    return "codex-tasks";
  }

  return normalized;
}

function formatPluginName(pluginName) {
  if (pluginName === "leads") return "Leads";
  if (pluginName === "team") return "Team";
  if (pluginName === "day") return "Day";
  if (pluginName === "codex-tasks") return "Codex Tasks";
  return pluginName;
}

async function isPluginEnabled(context, pluginName) {
  const room = await getRoom(context).catch(() => ({ plugins: {} }));
  const normalizedPlugin = normalizePluginName(pluginName);
  return Boolean(room.plugins?.[normalizedPlugin]?.enabled);
}

function formatLabels(labels) {
  return Array.isArray(labels) && labels.length > 0 ? ` ${labels.map((label) => `#${label}`).join(" ")}` : "";
}

function formatShortId(id, prefix) {
  return `${prefix}${String(id || "").slice(0, 6)}`;
}

function compareTasks(left, right) {
  return (Date.parse(left.createdAt || "") || 0) - (Date.parse(right.createdAt || "") || 0) || left.id.localeCompare(right.id);
}

function compareCreatedAsc(left, right) {
  return (Date.parse(left.createdAt || "") || 0) - (Date.parse(right.createdAt || "") || 0) || left.id.localeCompare(right.id);
}

function compareCreatedDesc(left, right) {
  return compareCreatedAsc(right, left);
}

function unsupported(commandName, message) {
  return { ok: false, unsupported: true, commandName, text: message };
}

function textResult(text, data = {}) {
  return { ok: true, text, ...data };
}

function printResult(result, options) {
  if (result.ok === false) {
    process.exitCode = 2;
  }

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(result.text || JSON.stringify(result, null, 2));
}

async function confirm(question) {
  const rl = createInterface({ input, output });
  const answer = await rl.question(`${question} Type yes to continue: `);
  rl.close();
  return answer.trim().toLowerCase() === "yes";
}

function taskHelp() {
  return [
    "Task commands:",
    "/task create <description> #label",
    "/task list [#label]",
    "/task search <query>",
    "/task completed [#label]",
    "/task chart [created|completed|pending] [7d|30d|90d] [#label]",
    "/task timers",
    "/task complete <id>",
    "/task reopen <id>",
    "/task comment <id> <comment>",
  ].join("\n");
}

function timerHelp() {
  return [
    "Timer commands:",
    "/timer list",
    "",
    "/timer list shows the same active timers as /task timers.",
    "Browser also supports /timer start, stop, continue, log, and history.",
  ].join("\n");
}

function dayHelp() {
  return [
    "Day commands:",
    "/day idle [today|yesterday|YYYY-MM-DD] [@handle]",
  ].join("\n");
}

function printHelp() {
  console.log(`Usage:
  npm run chat:command -- profile --room <roomId> --user <name>
  npm run chat:command -- "/task list"
  npm run chat:command -- /task create "Fix bug" "#bug" --yes

Options:
  -r, --room <roomId>      Override saved room.
  -u, --user <name>        Override saved user display name.
      --dry-run            Print what would run without touching Firestore.
      --json               Print JSON instead of plain text.
  -y, --yes                Skip confirmation for write and risky commands.
      --limit <number>     Max items for list commands. Defaults to ${DEFAULT_LIMIT}.
  -h, --help               Show this help.

Implemented:
  /task help|create|list|search|completed|chart|timers|complete|reopen|comment
  /timer help|list
  /change help|add|list|summary
  /changelog <handle>
  /query help|create|list|respond|close
  /codex help|<instruction>
  /plugin list|enable|disable
  /day help|idle
  /lead list
  /team list
  /team task list
  /team followup list
`);
}
