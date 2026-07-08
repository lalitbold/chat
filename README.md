# Firestore Chat System

This project is a lightweight realtime chat app built with:

- HTML, CSS, and vanilla JavaScript
- Firebase Authentication for guest sessions and optional Google linking
- Firebase Firestore for room and message storage
- Firestore realtime listeners with `onSnapshot`

## Features

- Create or join a chat room with a simple room code
- Realtime message updates for everyone in the same room
- Separate Firestore room documents and `messages` subcollections
- Stealth hidden-chat mode with incoming message count
- Title badge count for hidden incoming messages
- Installable PWA support
- Android packaging path via Trusted Web Activity
- Auth-backed user identity, read receipts, and session restore
- Firestore rules scoped to authenticated users
- Room task commands for creating, listing, and completing shared tasks
- Room changelog commands with shareable project summaries

## Project structure

- `index.html` - app layout
- `styles.css` - UI styling
- `app.js` - Firestore chat logic
- `firebase-config.js` - your Firebase project credentials
- `firestore.rules` - starter Firestore rules
- `ANDROID.md` - smallest-size Android packaging guide

## Firebase setup

1. Create a Firebase project in the Firebase console.
2. Enable Firestore Database.
3. Enable Firebase Authentication.
4. Turn on the Anonymous provider.
5. Turn on the Google provider if you want the `Link Google` button to work.
6. Create a Web App inside your Firebase project.
7. Copy the Firebase config values into `firebase-config.js`.
8. Apply the rules from `firestore.rules`.

## Firestore data model

```text
rooms/{roomId}
  createdAt
  createdBy
  settings.queryReminderAudience

rooms/{roomId}/messages/{messageId}
  text
  senderId
  senderName
  createdAt

rooms/{roomId}/codexCommands/{commandId}
  prompt
  status
  requestedBy
  requestedByName
  createdAt
  updatedAt
  startedAt
  completedAt
  result
  error

rooms/{roomId}/queries/{queryId}
  text
  status
  createdAt
  createdBy
  createdByName
  answeredAt
  answeredBy
  answeredByName
  responseText
  taskId
  taskDescription
  reminderIntervalMs
  lastReminderAt
  reminderCount

rooms/{roomId}/teamMembers/{memberId}
  name
  role
  designation
  email
  handle
  status
  notes
  createdAt
  createdBy
  createdByName
  updatedAt
  updatedBy
  updatedByName

rooms/{roomId}/followups/{followupId}
  text
  status
  memberId
  memberName
  taskId
  taskDescription
  reminderAt
  reminderIntervalMs
  lastReminderAt
  reminderCount
  createdAt
  createdBy
  createdByName
  completedAt
  completedBy
  completedByName

rooms/{roomId}/changelog/{changeId}
  text
  labels
  createdAt
  createdBy
  createdByName

rooms/{roomId}/readReceipts/{userId}
  userId
  displayName
  lastReadMessageId
  lastReadCreatedAt
  updatedAt

rooms/{roomId}/tasks/{taskId}
  description
  labels
  status
  createdAt
  createdBy
  createdByName
  completedAt
  completedBy
  completedByName
  totalTrackedMs
  activeTimerStartedAt
  activeTimerStartedBy
  activeTimerStartedByName
  activeTimerDescription
  assigneeMemberId
  assigneeName
  jiraKey
  jiraUrl
  jiraStatus
  jiraUpdatedAt
  source

rooms/{roomId}/tasks/{taskId}/timeEntries/{entryId}
  taskId
  taskDescription
  timerDescription
  userId
  userName
  startedAt
  stoppedAt
  durationMs
  createdAt

rooms/{roomId}/tasks/{taskId}/comments/{commentId}
  taskId
  text
  createdAt
  createdBy
  createdByName

rooms/{roomId}/workDays/{userId_dateKey}
  userId
  userName
  dateKey
  startedAt
  plan
  endedAt
  activeTimerStartedAt
  activeTimerStartedBy
  activeTimerStartedByName
  activeTimerDescription
  updatedAt

rooms/{roomId}/workDays/{userId_dateKey}/timeEntries/{entryId}
  description
  timerDescription
  userId
  userName
  startedAt
  stoppedAt
  durationMs
  createdAt

rooms/{roomId}/leaves/{leaveId}
  userId
  userName
  startDateKey
  endDateKey
  reason
  status
  createdAt
  canceledAt

rooms/{roomId}/leaveAnnouncements/{dateKey_leaveId}
  leaveId
  dateKey
  announcedAt
  announcedBy
```

## Task commands

- `/task create fix that issue #bug #urgent` creates a pending task with optional labels.
- `/task list` shows the pending task list only to you. Completed tasks are hidden by default.
- `/task list #bug` shows pending tasks with that label only to you.
- `/task current` shows your current active task with quick action buttons.
- `/task edit <id> <description> #bug` updates a task description. Labels are replaced only when new labels are included.
- Typing `#` in the composer suggests task IDs and task labels. In `/task edit <id>`, selecting or typing a task ID loads the current task text into the composer for easier editing.
- `/task comment <id> <comment>` adds a comment to a task.
- `/task comments <id>` shows task comments only to you.
- Message bubbles include quick reaction buttons.
- `/task today #abc123 #def456` adds existing pending tasks to today's plan.
- `/task today list` shows today's planned tasks only to you.
- `/task today review` shows unfinished planned tasks from yesterday with carry, complete, and skip actions.
- `/task codex <id> [instruction]` queues a task directly for the trusted Codex bridge.
- `/task process continue` resumes the last task process for the current room and user.
- `/task start` starts a general timer without linking it to a task.
- `/task start deployment work` starts a general timer with an optional description.
- `/task start <id> deployment work` starts a timer on a task with an optional timer description. Timers remind you locally after 25 minutes, then every 5 minutes until you continue, complete, or stop it. If two reminders go unanswered, the timer auto-stops and records time only through the first unanswered reminder.
- `/task stop` stops your general timer and records the elapsed time.
- `/task stop <id>` stops your running timer and adds the elapsed time to the task.
- `/task continue` keeps the general timer active and resets the next reminder to 25 minutes.
- `/task continue <id>` keeps the running timer active and resets the next reminder to 25 minutes.
- `/task summary` shows your work summary for today only to you.
- `/task summary share` posts your work summary for today to the group.
- `/task complete <id>` marks a task complete. The `<id>` can be the short ID shown in the task list, like `#abc123`, or the full Firestore document ID.
- `/task reopen <id>` moves a completed task back to pending.
- `/task label <id> #bug` adds a label to an existing task.
- `/task unlabel <id> #bug` removes a label from an existing task.

## Query commands

- `/query Can you confirm deployment?` creates a pending query and posts it to the room.
- `/query after 1h Can you confirm deployment?` creates a query with a custom reminder interval. Durations support `m`, `h`, and `d`, such as `10m`, `1h`, `1d`, or `5d`.
- `/query task <task-id> What is blocked?` creates a pending query linked to a task and adds the question as a task comment.
- `/query task <task-id> after 1d What is blocked?` creates a task-linked query with a custom reminder interval.
- `/query list` shows all pending room queries only to you.
- `/query respond <id> Looks good` marks the query answered, posts the response to the room, and adds the response as a task comment for task-linked queries.
- `/query close <id>` marks one of your queries answered without response text.
- Pending queries remind users locally every 10 minutes by default while the app is open. A custom query duration changes both the first reminder delay and repeat interval for that query.
- Advanced Settings can change the query reminder audience to `All`, `Asker`, or `Others`, either for the group or only for you. If browser notifications are enabled, query reminders also use notifications.

## Changelog commands

- `/change add Added lead filters #feature` logs a project change with optional labels.
- `/change list` shows recent changes only to you.
- `/change summary` generates a copyable project change summary only to you.
- `/change summary share` posts the project change summary to the group.

## Repo changelog

Project code changes are tracked in `CHANGELOG.md`.

```powershell
npm run changelog:add -- --summary "Built changelog summary handler"
```

When `npm run codex:bridge` runs with a write-enabled sandbox, it appends a changelog entry automatically after successful Codex commands that changed project files.

## Plugin commands

- `/plugin enable leads` enables lead capture for the current group.
- `/plugin disable leads` disables lead capture for the current group.
- `/plugin enable team` enables team management for the current group.
- `/plugin disable team` disables team management for the current group.
- `/plugin list` shows enabled and disabled group plugins only to you.

## Lead commands

Lead commands are available after `/plugin enable leads`.

- `/lead Rahul phone:9999999999 email:rahul@example.com company:Acme source:referral notes:interested in demo` creates a lead and posts a compact lead card to the group.
- `/lead x property is available at Jaipur for 50k per gaj, posted by Ritu` creates a property lead from sentence-style text.
- `/lead property:x location:Jaipur pricePerGaj:50k per gaj postedBy:Ritu notes:corner plot` creates a property lead from structured fields.
- `/lead new` fills the composer with a lead template.
- `/lead list` shows recent leads only to you.
- `/lead view <id>` posts a lead card to the group. Lead IDs are shown like `~abc123`.
- `/lead update <id> status:contacted owner:Lalit pricePerGaj:55k per gaj notes:demo scheduled` updates a lead and posts the updated card to the group.

## Team commands

Team commands are available after `/plugin enable team`.

- `/team member add name:Rahul role:Developer designation:SDE email:rahul@example.com handle:@rahul notes:Backend owner` adds a team member and posts a member card to the group.
- `/team member list` shows team members only to you. Member IDs are shown like `%abc123`.
- `/team member view <id>` posts a team member card to the group.
- `/team member update <id> role:Lead designation:Senior status:active notes:Owns API work` updates a member and posts the updated card to the group.
- `/team task assign <task-id> <member-id>` assigns an existing room task to a team member.
- `/team task list` shows tasks with a team assignee or Jira reference only to you.
- `/team task list <member-id>` shows team tasks for one member only to you.
- `/team task jira <task-id> CMPL-123 https://jira.example.com/browse/CMPL-123` stores Jira metadata on an existing room task. Jira live fetching is not included in this browser-only version.
- `/team followup add <member-id> after 1d Confirm estimate` creates a member followup with reminders.
- `/team followup task <task-id> after 2h Check blocker` creates a task-linked followup with reminders.
- `/team followup list` shows pending team followups only to you. Followup IDs are shown like `!abc123`.
- `/team followup done <id>` marks a followup complete and stops reminders.

Jira integration is prepared through task fields (`jiraKey`, `jiraUrl`, `jiraStatus`, `jiraUpdatedAt`, `source`). A future Firebase Cloud Function or small backend service should fetch Jira issues server-side and write them into Firestore so Jira API tokens are never exposed in the browser.

## Codex commands

- `/codex <instruction>` queues an instruction for a trusted local Codex bridge process.
- `/codex help` shows local help for the command.
- `/task codex <id> [instruction]` queues a task for the same local Codex bridge.

Start the local bridge from the machine where Codex should run:

```powershell
npm run codex:local -- --sandbox workspace-write --cwd C:\work\poc\chat
```

For another repo:

```powershell
npm run codex:local -- --sandbox workspace-write --cwd C:\xampp\htdocs\wp\zety
```

The browser posts Codex commands to `http://127.0.0.1:17345/commands`. The local bridge writes JSONL audit files under `<cwd>/.codex-queue/commands.jsonl` and `<cwd>/.codex-queue/results.jsonl`, then runs `codex exec`.

Useful local options:

```powershell
npm run codex:local -- --local-port 17346
npm run codex:local -- --timeout-ms 1800000
npm run codex:local -- --queue-dir .codex-queue
```

To point the browser at a different local bridge URL:

```js
localStorage.setItem("codex-local-bridge-url", "http://127.0.0.1:17346")
```

Legacy Firebase polling is still available if needed:

```powershell
npm run codex:bridge -- --room testroom --sandbox workspace-write --cwd C:\work\poc\chat
```

## Codex pending task export

Codex can fetch pending room tasks from Firestore as Markdown:

```powershell
npm run tasks:pending -- --room testroom
```

Useful filters:

```powershell
npm run tasks:pending -- --room testroom --label bug
npm run tasks:pending -- --room testroom --created-by-name Lalit --limit 10
npm run tasks:pending -- --room testroom --json
```

The script signs in anonymously with the Firebase web app config and reads pending tasks using the same Firestore rules as the chat app.

## Day commands

- `/day start` starts your day and posts attendance to the group.
- When your day is started and no task timer is running, the app reminds you locally every 5 minutes and counts those reminders in the day summary.
- `/day plan Ship feature X` saves and posts your plan to the group.
- `/day free tired` marks your current status as free with an optional reason and posts it to the group.
- `/day status` shows your current day status only to you.
- `/day timesheet` shows your timesheet for today only to you.
- `/day timesheet 2026-07-01 @lalit` shows a timesheet for a specific day and display-name handle.
- `/day break start` changes the app color while your break is active. Activity during a break shows a local prompt to stop it.
- `/day end` ends your day and posts your work summary to the group.
- `/day leave tomorrow Sick leave` schedules leave and posts it to the group.
- `/day leave 2026-05-20 to 2026-05-22 PTO` schedules a multi-day leave.
- `/day leave list` shows your upcoming leaves only to you.
- `/day leave cancel <id>` cancels one of your leaves and posts the cancellation to the group.

Leave dates support `today`, `tomorrow`, and `YYYY-MM-DD`. Day-of leave announcements are created when a room participant opens the room on that leave date.

## Hidden chat behavior

- A local stealth mode can hide all chat messages from view.
- While it is active, sent messages are still stored in Firestore but are not shown on screen.
- Incoming messages are hidden and shown only as a count.
- The chat can be briefly revealed for 10 seconds, then it hides again automatically.

## Run locally

Because the app uses ES modules, serve it from a local web server instead of opening the HTML file directly.

PowerShell:

```powershell
cd C:\work\poc\chat
python -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

## Run without a local server

The easiest way to use this app without running `python -m http.server 5500` is to deploy it to Firebase Hosting.

Files already added for this:

- `firebase.json`
- `.firebaserc.example`

One-time setup:

1. Install the Firebase CLI.
2. Copy `.firebaserc.example` to `.firebaserc`.
3. Replace `your-firebase-project-id` with your real Firebase project ID.
4. From `C:\work\poc\chat`, run:

```powershell
firebase login
firebase deploy
```

After deployment, open the Firebase Hosting URL, and install the app from the browser if you want it as a desktop app. At that point, you no longer need the Python server.

## Android app

For the smallest Android package, use a Trusted Web Activity instead of a WebView wrapper. The app is already structured as a PWA, so the Android build can stay as a thin shell around the Firebase-hosted app.

See `ANDROID.md` for the Bubblewrap build flow and Digital Asset Links setup.

## Important note

The included `firestore.rules` file now requires Firebase Auth. It verifies message authors and read-receipt owners, but room membership is still simple for this demo. For a production app, add explicit room membership checks and avoid storing passcodes in client-readable room documents.
