#!/usr/bin/env node

import { execFile } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const CHANGELOG_FILE = "CHANGELOG.md";

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
  const changedFiles = await getChangedFiles(cwd);
  const codeFiles = changedFiles.filter((file) => file !== CHANGELOG_FILE);

  if (options.onlyIfChanged && codeFiles.length === 0) {
    return;
  }

  const entry = formatEntry({
    summary: options.summary || options.prompt || "Project changes",
    prompt: options.prompt,
    result: options.result,
    files: codeFiles,
  });

  appendChangelog(cwd, entry);
  console.log(`Updated ${CHANGELOG_FILE}`);
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

function formatEntry({ summary, prompt, result, files }) {
  const lines = [
    `## ${formatDateKey(new Date())}`,
    "",
    `- ${normalizeSingleLine(summary)}`,
  ];

  if (prompt && prompt !== summary) {
    lines.push(`  - Request: ${normalizeSingleLine(prompt)}`);
  }

  if (result) {
    lines.push(`  - Result: ${normalizeSingleLine(result)}`);
  }

  if (files.length > 0) {
    lines.push(`  - Files: ${files.join(", ")}`);
  }

  lines.push("");
  return lines.join("\n");
}

function appendChangelog(cwd, entry) {
  const changelogPath = join(cwd, CHANGELOG_FILE);
  const existing = existsSync(changelogPath) ? readFileSync(changelogPath, "utf8").trimEnd() : "# Changelog";
  writeFileSync(changelogPath, `${existing}\n\n${entry}`, "utf8");
}

function normalizeSingleLine(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
