# Alexa Skill

This folder contains the AWS Lambda backend for the Chat Alexa plugin.

## Hosting

Keep the web app on Firebase Hosting. Deploy this folder as a separate AWS Lambda function and connect it to an Alexa custom skill.

## Configure

Set Lambda environment variables:

```text
ALEXA_SKILL_ID=amzn1.ask.skill...
FIREBASE_PROJECT_ID=chat-6835e
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

If the Lambda runtime already has Google application credentials, `FIREBASE_SERVICE_ACCOUNT_JSON` can be omitted.

## Deploy shape

The Lambda bundle must include:

```text
alexa-skill/index.mjs
alexa-skill/node_modules/
tools/chat-command.mjs
tools/chat-firestore.mjs
firebase-config.js
```

Install dependencies from this folder:

```powershell
cd C:\work\poc\chat\alexa-skill
npm install
npm run check
```

## Skill setup

1. Create an Alexa custom skill.
2. Use `alexa-skill/interaction-model.json` as the interaction model.
3. Create a Node.js AWS Lambda and set the Alexa Skills Kit trigger.
4. Paste the Lambda ARN into the Alexa endpoint.
5. In Chat, run `/plugin enable alexa` for the target room.
6. In Alexa, say: `setup room myteam as Lalit`.
7. Try: `list tasks`, `create task follow up with Rahul`, or `run command task list`.

Alexa speaks command results during the active skill session. This does not use household Alexa Announcements or out-of-session notifications.
