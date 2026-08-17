import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const CHANGELOG_FILE = "CHANGELOG.md";

export function createDeployHandle(date = new Date()) {
  return `#deploy-${formatLocalDateTimeKey(date)}`;
}

export function appendRepoChangelogEntry(cwd, entry) {
  const changelogPath = join(cwd, CHANGELOG_FILE);
  const existing = existsSync(changelogPath) ? readFileSync(changelogPath, "utf8").trimEnd() : "# Changelog";
  writeFileSync(changelogPath, `${existing}\n\n${formatRepoChangelogEntry(entry)}`, "utf8");
}

export function findRepoChangelogEntry(cwd, handle) {
  const normalizedHandle = normalizeHandle(handle);
  if (!normalizedHandle) return null;

  const changelogPath = join(cwd, CHANGELOG_FILE);
  if (!existsSync(changelogPath)) return null;

  const text = readFileSync(changelogPath, "utf8");
  const entries = text.split(/\n(?=##\s+)/g);
  return entries.find((entry) => normalizeEntryHeading(entry).includes(normalizedHandle)) || null;
}

export function formatRepoChangelogEntry({ handle, summary, prompt, result, files = [], checks = [], release = {} }) {
  const lines = [
    `## ${handle || createDeployHandle()} - ${normalizeSingleLine(summary || "Project changes")}`,
    "",
  ];

  if (prompt && prompt !== summary) {
    lines.push(`- Request: ${normalizeSingleLine(prompt)}`);
  }

  if (result) {
    lines.push(`- Result: ${normalizeSingleLine(result)}`);
  }

  if (files.length > 0) {
    lines.push(`- Files: ${files.join(", ")}`);
  }

  if (checks.length > 0) {
    lines.push(`- Checks: ${checks.join(", ")}`);
  }

  if (release.commit) {
    lines.push(`- Commit: ${release.commit}`);
  }

  if (release.pushed) {
    lines.push("- Pushed: yes");
  }

  if (release.deployed) {
    lines.push("- Firebase deploy: yes");
  } else if (release.deployCommand) {
    lines.push(`- Firebase deploy: not run (${release.deployCommand})`);
  }

  lines.push("");
  return lines.join("\n");
}

export function normalizeHandle(handle) {
  const normalized = String(handle || "").trim();
  if (!normalized) return "";
  return normalized.startsWith("#") ? normalized.toLowerCase() : `#${normalized.toLowerCase()}`;
}

function normalizeEntryHeading(entry) {
  const [heading = ""] = String(entry || "").split(/\r?\n/, 1);
  return heading.toLowerCase();
}

function normalizeSingleLine(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

function formatLocalDateTimeKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}${month}${day}-${hour}${minute}`;
}
