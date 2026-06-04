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

rooms/{roomId}/messages/{messageId}
  text
  senderId
  senderName
  createdAt

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

rooms/{roomId}/tasks/{taskId}/timeEntries/{entryId}
  taskId
  taskDescription
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
  updatedAt

rooms/{roomId}/workDays/{userId_dateKey}/timeEntries/{entryId}
  description
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

- `/task fix that issue #bug #urgent` creates a pending task with optional labels.
- `/task list` shows the pending task list only to you. Completed tasks are hidden by default.
- `/task list #bug` shows pending tasks with that label only to you.
- `/task edit <id> <description> #bug` updates a task description. Labels are replaced only when new labels are included.
- `/task comment <id> <comment>` adds a comment to a task.
- `/task comments <id>` shows task comments only to you.
- `/task start` starts a general timer without linking it to a task.
- `/task start <id>` starts a timer on a task and reminds you locally after 25 minutes, then every 5 minutes until you continue, complete, or stop it. If two reminders go unanswered, the timer auto-stops and records time only through the first unanswered reminder.
- `/task stop` stops your general timer and records the elapsed time.
- `/task stop <id>` stops your running timer and adds the elapsed time to the task.
- `/task continue` keeps the general timer active and resets the next reminder to 25 minutes.
- `/task continue <id>` keeps the running timer active and resets the next reminder to 25 minutes.
- `/task summary` shows your work summary for today only to you.
- `/task summary share` posts your work summary for today to the group.
- `/task complete <id>` marks a task complete. The `<id>` can be the short ID shown in the task list, like `#abc123`, or the full Firestore document ID.
- `/task label <id> #bug` adds a label to an existing task.
- `/task unlabel <id> #bug` removes a label from an existing task.

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
- When your day is started and no task timer is running, the app reminds you locally every 5 minutes.
- `/day plan Ship feature X` saves and posts your plan to the group.
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
