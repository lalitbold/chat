# Changelog

## 2026-07-01

- Added room changelog commands for logging changes, listing recent entries, and sharing project summaries.
- Added repo changelog generation with `CHANGELOG.md`, a `changelog:add` script, and Codex bridge auto-append support.

## 2026-07-02

- Improved Task List UI
  - Files: README.md, app.js, firestore.rules, package.json, styles.css, tools/codex-bridge.mjs, tools/changelog-entry.mjs

## #deploy-20260817-1030 - Add guarded chat release workflow

- Result: Prepared safe release script, repo changelog handles, CLI handle lookup, and README workflow; no commit, push, or Firebase deploy run.
- Files: README.md, package.json, tools/changelog-entry.mjs, tools/chat-command.mjs, tools/release-workflow.mjs, tools/repo-changelog.mjs

## #deploy-20260817-1320 - Release guarded chat workflow

- Result: Applied latest chat worktree, committed, pushed, and deployed.
- Files: CHANGELOG.md, README.md, package.json, tools/changelog-entry.mjs, tools/chat-command.mjs, tools/release-workflow.mjs, tools/repo-changelog.mjs
- Checks: node --check app.js, node --check firebase-config.js, node --check firebase-config.example.js, node --check sw.js, node --check tools/changelog-entry.mjs, node --check tools/chat-command.mjs, node --check tools/chat-firestore.mjs, node --check tools/codex-bridge.mjs, node --check tools/export-messages.mjs, node --check tools/pending-tasks.mjs, node --check tools/release-workflow.mjs, node --check tools/repo-changelog.mjs, firebase deploy command discovered
- Firebase deploy: not run (firebase deploy)
