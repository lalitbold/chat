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
- Auth-backed user identity, read receipts, and session restore
- Firestore rules scoped to authenticated users

## Project structure

- `index.html` - app layout
- `styles.css` - UI styling
- `app.js` - Firestore chat logic
- `firebase-config.js` - your Firebase project credentials
- `firestore.rules` - starter Firestore rules

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
```

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

## Important note

The included `firestore.rules` file now requires Firebase Auth. It verifies message authors and read-receipt owners, but room membership is still simple for this demo. For a production app, add explicit room membership checks and avoid storing passcodes in client-readable room documents.
