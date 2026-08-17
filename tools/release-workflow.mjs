#!/usr/bin/env node

import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import {
  appendRepoChangelogEntry,
  createDeployHandle,
} from "./repo-changelog.mjs";

const execFileAsync = promisify(execFile);
const DEFAULT_TARGET = "C:\\work\\poc\\chat";
const FIREBASE_COMMAND = process.platform === "win32" ? "firebase.cmd" : "firebase";
const CHECK_FILES = [
  "app.js",
  "firebase-config.js",
  "firebase-config.example.js",
  "sw.js",
  "tools/changelog-entry.mjs",
  "tools/chat-command.mjs",
  "tools/chat-firestore.mjs",
  "tools/codex-bridge.mjs",
  "tools/export-messages.mjs",
  "tools/pending-tasks.mjs",
  "tools/release-workflow.mjs",
  "tools/repo-changelog.mjs",
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

  const target = options.target || DEFAULT_TARGET;
  const source = options.sourceWorktree || process.cwd();
  const handle = options.handle || createDeployHandle();
  const summary = options.summary || "Chat project release";
  const checks = [];

  await assertGitRepo(target, "target");
  await assertGitRepo(source, "source worktree");
  await assertTargetBranch(target, options.branch);

  const targetStatus = await gitStatus(target);
  if (targetStatus && !options.allowDirtyTarget) {
    throw new Error("Target worktree has existing changes. Commit/stash them or pass --allow-dirty-target after reviewing.");
  }

  const sourceFiles = await changedFiles(source);
  const patchFile = await createSourcePatch(source);
  const hasPatch = sourceFiles.length > 0 && patchFile;

  if (hasPatch && source !== target) {
    await run("git", ["apply", "--check", patchFile], { cwd: target });
    checks.push("git apply --check");
  }

  if (options.apply) {
    if (!hasPatch) {
      console.log("No source worktree patch to apply.");
    } else if (source === target) {
      console.log("Source and target are the same worktree; keeping existing local changes.");
    } else {
      await run("git", ["apply", patchFile], { cwd: target });
      console.log(`Applied patch from ${source}`);
    }
  }

  for (const file of CHECK_FILES) {
    if (existsSync(join(target, file))) {
      await run("node", ["--check", file], { cwd: target });
      checks.push(`node --check ${file}`);
    }
  }

  const firebaseAvailable = await discoverFirebaseDeploy(target, { required: options.deploy });
  checks.push(firebaseAvailable ? "firebase deploy command discovered" : "firebase CLI missing; deploy blocked");

  if (options.apply || options.changelog) {
    appendRepoChangelogEntry(target, {
      handle,
      summary,
      prompt: options.prompt,
      result: options.result || "Release workflow prepared; live deploy only runs with --deploy --yes.",
      files: await changedFiles(target),
      checks,
      release: {
        deployCommand: "firebase deploy",
        deployRequested: options.deploy,
      },
    });
    console.log(`Changelog handle: ${handle}`);
  }

  if (options.commit) {
    requireApproved(options, "--commit");
    await ensureChangesToCommit(target);
    await run("git", ["add", "."], { cwd: target });
    await run("git", ["commit", "-m", `${summary} (${handle})`], { cwd: target });
  }

  if (options.push) {
    requireApproved(options, "--push");
    await run("git", ["push"], { cwd: target });
  }

  if (options.deploy) {
    requireApproved(options, "--deploy");
    await run(FIREBASE_COMMAND, ["deploy"], { cwd: target });
  }

  console.log(formatReport({ target, source, handle, sourceFiles, checks, options }));
  cleanupPatch(patchFile);
}

function parseArgs(args) {
  const options = {
    apply: false,
    branch: "master",
    changelog: false,
    help: false,
    yes: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--apply") {
      options.apply = true;
      continue;
    }

    if (arg === "--changelog") {
      options.changelog = true;
      continue;
    }

    if (arg === "--commit") {
      options.commit = true;
      continue;
    }

    if (arg === "--push") {
      options.push = true;
      continue;
    }

    if (arg === "--deploy") {
      options.deploy = true;
      continue;
    }

    if (arg === "--yes" || arg === "-y") {
      options.yes = true;
      continue;
    }

    if (arg === "--allow-dirty-target") {
      options.allowDirtyTarget = true;
      continue;
    }

    if (arg === "--source-worktree") {
      options.sourceWorktree = readValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--target") {
      options.target = readValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--branch") {
      options.branch = readValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--handle") {
      options.handle = readValue(args, index, arg);
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

  if ((options.push || options.deploy) && !options.commit) {
    throw new Error("--push and --deploy require --commit so released code has a durable Git revision.");
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
  node tools/release-workflow.mjs [options]

Default behavior checks the target and discovers Firebase deploy, but does not apply,
commit, push, or deploy.

Options:
      --source-worktree <path>   Codex worktree to collect fixes from. Defaults to cwd.
      --target <path>            Main checkout. Defaults to C:\\work\\poc\\chat.
      --branch <name|any>        Required target branch. Defaults to master.
      --handle <handle>          Changelog handle. Defaults to #deploy-YYYYMMDD-HHMM.
      --summary <text>           Release summary used in changelog and commit.
      --prompt <text>            Source request for changelog.
      --result <text>            Result note for changelog.
      --apply                    Apply source worktree patch to target.
      --changelog                Append changelog without applying patch.
      --commit                   Commit target changes. Requires --yes.
      --push                     Push committed target changes. Requires --commit --yes.
      --deploy                   Run firebase deploy. Requires --commit --yes.
      --allow-dirty-target       Allow existing target changes after manual review.
  -y, --yes                      Confirm real commit/push/deploy actions.
  -h, --help                     Show this help.
`);
}

async function assertGitRepo(cwd, label) {
  await run("git", ["rev-parse", "--show-toplevel"], { cwd, label });
}

async function assertTargetBranch(cwd, branch) {
  if (branch === "any") return;

  const current = (await run("git", ["branch", "--show-current"], { cwd })).trim();
  if (branch && current !== branch) {
    throw new Error(`Target branch is ${current || "(detached)"}, expected ${branch}.`);
  }
}

async function gitStatus(cwd) {
  return run("git", ["status", "--short"], { cwd });
}

async function changedFiles(cwd) {
  return (await gitStatus(cwd))
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .map((line) => line.includes(" -> ") ? line.split(" -> ").pop() : line)
    .map((line) => line.replace(/^"|"$/g, "").replace(/\\/g, "/"));
}

async function createSourcePatch(source) {
  const diff = await run("git", ["diff", "--binary", "HEAD"], { cwd: source });
  if (!diff.trim()) return "";

  const dir = mkdtempSync(join(tmpdir(), "chat-release-"));
  const patchFile = join(dir, "source.patch");
  writeFileSync(patchFile, diff, "utf8");
  return patchFile;
}

async function discoverFirebaseDeploy(cwd, options = {}) {
  if (!existsSync(join(cwd, "firebase.json"))) {
    throw new Error("firebase.json was not found in target.");
  }

  try {
    await run(FIREBASE_COMMAND, ["--version"], { cwd });
    return true;
  } catch (error) {
    if (options.required) {
      throw error;
    }
    return false;
  }
}

async function ensureChangesToCommit(cwd) {
  if (!(await gitStatus(cwd)).trim()) {
    throw new Error("No target changes to commit.");
  }
}

function requireApproved(options, flag) {
  if (!options.yes) {
    throw new Error(`${flag} is a real release action. Re-run with --yes after reviewing checks.`);
  }
}

async function run(command, args, options = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd: options.cwd,
      maxBuffer: 20 * 1024 * 1024,
      shell: command.endsWith(".cmd"),
    });
    if (stderr.trim()) {
      return `${stdout}${stderr}`;
    }
    return stdout;
  } catch (error) {
    const detail = [error.stdout, error.stderr].filter(Boolean).join("").trim();
    throw new Error(`${options.label || command} failed: ${detail || error.message}`);
  }
}

function cleanupPatch(patchFile) {
  if (!patchFile) return;
  rmSync(dirname(patchFile), { recursive: true, force: true });
}

function formatReport({ target, source, handle, sourceFiles, checks, options }) {
  return [
    "",
    "Release workflow report:",
    `- Target: ${target}`,
    `- Source: ${source}`,
    `- Handle: ${handle}`,
    `- Source files: ${sourceFiles.length ? sourceFiles.join(", ") : "none"}`,
    `- Checks: ${checks.join(", ")}`,
    `- Applied: ${options.apply ? "yes" : "no"}`,
    `- Changelog updated: ${options.apply || options.changelog ? "yes" : "no"}`,
    `- Commit: ${options.commit ? "requested" : "not run"}`,
    `- Push: ${options.push ? "requested" : "not run"}`,
    `- Firebase deploy: ${options.deploy ? "requested" : "not run"}`,
  ].join("\n");
}
