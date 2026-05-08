# Firestore Chat System

This project is a lightweight realtime chat app built with:

- HTML, CSS, and vanilla JavaScript
- Firebase Firestore for room and message storage
- Firestore realtime listeners with `onSnapshot`

## Features

- Create or join a chat room with a simple room code
- Realtime message updates for everyone in the same room
- Separate Firestore room documents and `messages` subcollections
- Local user identity persistence and session restore
- Example Firestore rules for quick testing

## Project structure

- `index.html` - app layout
- `styles.css` - UI styling
- `app.js` - Firestore chat logic
- `firebase-config.js` - your Firebase project credentials
- `firestore.rules` - starter Firestore rules

## Firebase setup

1. Create a Firebase project in the Firebase console.
2. Enable Firestore Database in production or test mode.
3. Create a Web App inside your Firebase project.
4. Copy the Firebase config values into `firebase-config.js`.
5. Apply the rules from `firestore.rules`.

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
```

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

## Important note

The included `firestore.rules` file is intentionally open for demo purposes. Before using this in a real app, add Firebase Authentication and lock the rules down to authenticated users and room membership checks.
