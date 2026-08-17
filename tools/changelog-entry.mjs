#!/usr/bin/env node

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  CHANGELOG_FILE,
  appendRepoChangelogEntry,
  createDeployHandle,
  findRepoChangelogEntry,
} from "./repo-changelog.mjs";

const execFileAsync = promisify(execFile);

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

  const cwd = options.cwd || process.cwd();

  if (options.show) {
    const entry = findRepoChangelogEntry(cwd, options.show);
    if (!entry) {
      throw new Error(`Changelog handle not found: ${options.show}`);
    }
    console.log(entry.trim());
    return;
  }

  const changedFiles = await getChangedFiles(cwd);
  const codeFiles = changedFiles.filter((file) => file !== CHANGELOG_FILE);

  if (options.onlyIfChanged && codeFiles.length === 0) {
    return;
  }

  const handle = options.handle || createDeployHandle();
  const entry = {
    handle,
    summary: options.summary || options.prompt || "Project changes",
    prompt: options.prompt,
    result: options.result,
    files: codeFiles,
  };

  appendRepoChangelogEntry(cwd, entry);
  console.log(`Updated ${CHANGELOG_FILE}: ${handle}`);
}

function parseArgs(args) {
  const options = {
    help: false,
    onlyIfChanged: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--only-if-changed") {
      options.onlyIfChanged = true;
      continue;
    }

    if (arg === "--cwd") {
      options.cwd = readValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--handle") {
      options.handle = readValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--show") {
      options.show = readValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--summary") {
      options.summary = readValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--prompt") {
      options.prompt = readValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--result") {
      options.result = readValue(args, index, arg);
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
  node tools/changelog-entry.mjs [options]

Options:
      --summary <text>        Changelog entry summary.
      --handle <handle>       Stable handle. Defaults to #deploy-YYYYMMDD-HHMM.
      --show <handle>         Print one changelog entry by handle.
      --prompt <text>         Source prompt/request.
      --result <text>         Result text to include.
      --cwd <path>            Project directory. Defaults to cwd.
      --only-if-changed       Skip when git has no changed code files.
  -h, --help                  Show this help.
`);
}

async function getChangedFiles(cwd) {
  try {
    const { stdout } = await execFileAsync("git", ["status", "--short"], { cwd });
    return stdout
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line) => line.slice(3).trim())
      .map((line) => line.includes(" -> ") ? line.split(" -> ").pop() : line)
      .map((line) => line.replace(/^"|"$/g, ""))
      .map((line) => line.replace(/\\/g, "/"))
      .filter(Boolean)
  } catch {
    return [];
  }
}
