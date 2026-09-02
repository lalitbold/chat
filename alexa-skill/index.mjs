import Alexa from "ask-sdk-core";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { classifyRisk, parseCommand, runChatCommand } from "../tools/chat-command.mjs";

const ALEXA_PLUGIN = "alexa";
const MAX_SPEECH_CHARS = 700;
const MAX_CARD_CHARS = 7000;

function ensureFirebaseAdmin() {
  if (getApps().length > 0) {
    return;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    return;
  }

  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

function db() {
  ensureFirebaseAdmin();
  return getFirestore();
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest";
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak("Chat is ready. You can ask me to list tasks, create a task, or run a chat command.")
      .reprompt("Say setup room, or say list tasks.")
      .getResponse();
  },
};

const SetupIntentHandler = {
  canHandle(handlerInput) {
    return isIntent(handlerInput, "SetupIntent");
  },
  async handle(handlerInput) {
    assertSkillId(handlerInput);
    const roomId = getSlotValue(handlerInput, "RoomId");
    const userName = getSlotValue(handlerInput, "UserName");

    if (!roomId || !userName) {
      return handlerInput.responseBuilder
        .speak("Tell me the room code and display name. For example, setup room my team as Lalit.")
        .reprompt("What room and name should I use?")
        .getResponse();
    }

    await saveAlexaUser(handlerInput, roomId, userName);
    return speak(handlerInput, `Setup saved for room ${roomId} as ${userName}. Enable the Alexa plugin in chat before running commands.`);
  },
};

const RunCommandIntentHandler = {
  canHandle(handlerInput) {
    return isIntent(handlerInput, "RunCommandIntent");
  },
  async handle(handlerInput) {
    const rawCommand = getSlotValue(handlerInput, "CommandText");
    return runAlexaCommand(handlerInput, toSlashCommand(rawCommand));
  },
};

const CreateTaskIntentHandler = {
  canHandle(handlerInput) {
    return isIntent(handlerInput, "CreateTaskIntent");
  },
  async handle(handlerInput) {
    const description = getSlotValue(handlerInput, "TaskDescription");
    if (!description) {
      return ask(handlerInput, "What task should I create?");
    }

    return runAlexaCommand(handlerInput, `/task create ${description}`);
  },
};

const ListTasksIntentHandler = {
  canHandle(handlerInput) {
    return isIntent(handlerInput, "ListTasksIntent");
  },
  async handle(handlerInput) {
    const label = normalizeLabel(getSlotValue(handlerInput, "Label"));
    return runAlexaCommand(handlerInput, `/task list${label ? ` ${label}` : ""}`);
  },
};

const SearchTasksIntentHandler = {
  canHandle(handlerInput) {
    return isIntent(handlerInput, "SearchTasksIntent");
  },
  async handle(handlerInput) {
    const query = getSlotValue(handlerInput, "Query");
    if (!query) {
      return ask(handlerInput, "What should I search tasks for?");
    }

    return runAlexaCommand(handlerInput, `/task search ${query}`);
  },
};

const TimerListIntentHandler = {
  canHandle(handlerInput) {
    return isIntent(handlerInput, "TimerListIntent");
  },
  async handle(handlerInput) {
    return runAlexaCommand(handlerInput, "/timer list");
  },
};

const TeamListIntentHandler = {
  canHandle(handlerInput) {
    return isIntent(handlerInput, "TeamListIntent");
  },
  async handle(handlerInput) {
    return runAlexaCommand(handlerInput, "/team list");
  },
};

const QueryListIntentHandler = {
  canHandle(handlerInput) {
    return isIntent(handlerInput, "QueryListIntent");
  },
  async handle(handlerInput) {
    return runAlexaCommand(handlerInput, "/query list");
  },
};

const DayIdleIntentHandler = {
  canHandle(handlerInput) {
    return isIntent(handlerInput, "DayIdleIntent");
  },
  async handle(handlerInput) {
    const pending = getSlotValue(handlerInput, "Pending");
    const date = getSlotValue(handlerInput, "Date");
    const handle = normalizeHandle(getSlotValue(handlerInput, "Handle"));
    return runAlexaCommand(handlerInput, ["/day idle", pending ? "pending" : "", date || "", handle || ""].filter(Boolean).join(" "));
  },
};

const YesIntentHandler = {
  canHandle(handlerInput) {
    return isIntent(handlerInput, "AMAZON.YesIntent");
  },
  async handle(handlerInput) {
    const pendingCommand = handlerInput.attributesManager.getSessionAttributes().pendingCommand;

    if (!pendingCommand) {
      return speak(handlerInput, "There is no pending command to confirm.");
    }

    handlerInput.attributesManager.setSessionAttributes({});
    return runAlexaCommand(handlerInput, pendingCommand, { confirmed: true });
  },
};

const NoIntentHandler = {
  canHandle(handlerInput) {
    return isIntent(handlerInput, "AMAZON.NoIntent");
  },
  handle(handlerInput) {
    handlerInput.attributesManager.setSessionAttributes({});
    return speak(handlerInput, "Cancelled.");
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return isIntent(handlerInput, "AMAZON.HelpIntent");
  },
  handle(handlerInput) {
    return ask(handlerInput, "You can say list tasks, create task follow up with Rahul, list timers, list team, or run command task list.");
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return isIntent(handlerInput, "AMAZON.CancelIntent") || isIntent(handlerInput, "AMAZON.StopIntent");
  },
  handle(handlerInput) {
    return speak(handlerInput, "Okay.");
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error(error);
    return speak(handlerInput, "Chat command failed. Check the Lambda logs for details.");
  },
};

async function runAlexaCommand(handlerInput, commandText, { confirmed = false } = {}) {
  assertSkillId(handlerInput);

  if (!commandText) {
    return ask(handlerInput, "Which chat command should I run?");
  }

  const mapping = await loadAlexaUser(handlerInput);

  if (!mapping) {
    return ask(handlerInput, "Setup is missing. Say setup room followed by your room code and display name.");
  }

  if (!(await isAlexaEnabled(mapping.roomId))) {
    return speak(handlerInput, `Alexa plugin is disabled for room ${mapping.roomId}. Enable it in chat with plugin enable alexa.`);
  }

  let command;
  try {
    command = parseCommand(commandText);
  } catch (error) {
    return speak(handlerInput, error.message);
  }

  const risk = classifyRisk(command);
  if (risk !== "read" && !confirmed) {
    handlerInput.attributesManager.setSessionAttributes({ pendingCommand: command.raw });
    return handlerInput.responseBuilder
      .speak(`This is a ${risk} command: ${command.raw}. Say yes to run it, or no to cancel.`)
      .reprompt("Say yes to run it, or no to cancel.")
      .getResponse();
  }

  const result = await runChatCommand({
    commandText: command.raw,
    roomId: mapping.roomId,
    userName: mapping.userName,
    yes: true,
  });

  await saveCommandAudit(handlerInput, mapping, command.raw, result);
  return speak(handlerInput, result.text || "Command completed.", result.text);
}

async function saveAlexaUser(handlerInput, roomId, userName) {
  const userId = getAlexaUserId(handlerInput);
  await db()
    .collection("appSettings")
    .doc("alexa")
    .collection("users")
    .doc(encodeDocumentId(userId))
    .set({
      roomId,
      userName,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

async function loadAlexaUser(handlerInput) {
  const userId = getAlexaUserId(handlerInput);
  const snapshot = await db()
    .collection("appSettings")
    .doc("alexa")
    .collection("users")
    .doc(encodeDocumentId(userId))
    .get();

  return snapshot.exists ? snapshot.data() : null;
}

async function isAlexaEnabled(roomId) {
  const snapshot = await db().collection("rooms").doc(roomId).get();
  return Boolean(snapshot.data()?.plugins?.[ALEXA_PLUGIN]?.enabled);
}

async function saveCommandAudit(handlerInput, mapping, command, result) {
  await db()
    .collection("appSettings")
    .doc("alexa")
    .collection("commandAudit")
    .add({
      alexaUserId: encodeDocumentId(getAlexaUserId(handlerInput)),
      roomId: mapping.roomId,
      userName: mapping.userName,
      command,
      ok: result.ok !== false,
      text: String(result.text || "").slice(0, MAX_CARD_CHARS),
      createdAt: FieldValue.serverTimestamp(),
    });
}

function assertSkillId(handlerInput) {
  const expectedSkillId = process.env.ALEXA_SKILL_ID;
  const actualSkillId = handlerInput.requestEnvelope?.session?.application?.applicationId
    || handlerInput.requestEnvelope?.context?.System?.application?.applicationId;

  if (expectedSkillId && actualSkillId !== expectedSkillId) {
    throw new Error("Unexpected Alexa Skill ID.");
  }
}

function getAlexaUserId(handlerInput) {
  return handlerInput.requestEnvelope?.context?.System?.user?.userId
    || handlerInput.requestEnvelope?.session?.user?.userId
    || "unknown";
}

function isIntent(handlerInput, name) {
  return Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
    && Alexa.getIntentName(handlerInput.requestEnvelope) === name;
}

function getSlotValue(handlerInput, slotName) {
  return Alexa.getSlotValue(handlerInput.requestEnvelope, slotName)?.trim() || "";
}

function toSlashCommand(rawCommand) {
  const normalized = String(rawCommand || "").trim();
  if (!normalized) return "";
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function normalizeLabel(value) {
  const normalized = String(value || "").trim().replace(/^#/, "");
  return normalized ? `#${normalized}` : "";
}

function normalizeHandle(value) {
  const normalized = String(value || "").trim().replace(/^@/, "");
  return normalized ? `@${normalized}` : "";
}

function encodeDocumentId(value) {
  return Buffer.from(String(value || "unknown")).toString("base64url");
}

function speak(handlerInput, speechText, cardText = speechText) {
  const normalizedSpeech = toSpeechText(speechText);
  return handlerInput.responseBuilder
    .speak(escapeSsml(normalizedSpeech))
    .withSimpleCard("Chat", String(cardText || normalizedSpeech).slice(0, MAX_CARD_CHARS))
    .getResponse();
}

function ask(handlerInput, speechText) {
  return handlerInput.responseBuilder
    .speak(escapeSsml(toSpeechText(speechText)))
    .reprompt(escapeSsml(toSpeechText(speechText)))
    .getResponse();
}

function toSpeechText(text) {
  const normalized = String(text || "")
    .replace(/[#~!]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= MAX_SPEECH_CHARS) {
    return normalized || "No result.";
  }

  return `${normalized.slice(0, MAX_SPEECH_CHARS)}. I sent the full result as a card.`;
}

function escapeSsml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export const handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    SetupIntentHandler,
    RunCommandIntentHandler,
    CreateTaskIntentHandler,
    ListTasksIntentHandler,
    SearchTasksIntentHandler,
    TimerListIntentHandler,
    TeamListIntentHandler,
    QueryListIntentHandler,
    DayIdleIntentHandler,
    YesIntentHandler,
    NoIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
