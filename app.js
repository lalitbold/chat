import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const joinForm = document.getElementById("join-form");
const displayNameInput = document.getElementById("display-name");
const roomIdInput = document.getElementById("room-id");
const createRoomButton = document.getElementById("create-room");
const leaveRoomButton = document.getElementById("leave-room");
const activeRoom = document.getElementById("active-room");
const statusBanner = document.getElementById("status-banner");
const messagesContainer = document.getElementById("messages");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");

const state = {
  db: null,
  profile: null,
  roomId: null,
  unsubscribeMessages: null,
};

boot();

function boot() {
  try {
    validateFirebaseConfig(firebaseConfig);
    const app = initializeApp(firebaseConfig);
    state.db = getFirestore(app);
    setStatus("Firebase connected. Create or join a room.", "success");
  } catch (error) {
    console.error(error);
    setComposerState(false);
    setStatus(
      "Firebase is not configured yet. Copy firebase-config.example.js to firebase-config.js and add your Firebase project keys.",
      "error"
    );
  }

  renderEmptyState("Join a room to start chatting.");
  restoreSession();
  wireEvents();
}

function wireEvents() {
  createRoomButton.addEventListener("click", () => {
    roomIdInput.value = generateRoomId();
    roomIdInput.focus();
  });

  joinForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!state.db) {
      setStatus("Add your Firebase config before joining a room.", "error");
      return;
    }

    const displayName = displayNameInput.value.trim();
    const roomId = sanitizeRoomId(roomIdInput.value);

    if (!displayName) {
      setStatus("Enter a name before joining.", "error");
      return;
    }

    if (!roomId) {
      setStatus("Enter a room code or generate one.", "error");
      return;
    }

    state.profile = {
      id: getOrCreateUserId(),
      name: displayName,
    };

    try {
      await ensureRoom(roomId);
      await connectToRoom(roomId);
      persistSession();
      joinForm.reset();
      displayNameInput.value = state.profile.name;
    } catch (error) {
      console.error(error);
      setStatus("We couldn't join that room. Check Firestore rules and try again.", "error");
    }
  });

  messageForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const text = messageInput.value.trim();
    if (!text || !state.roomId || !state.db || !state.profile) {
      return;
    }

    sendButton.disabled = true;

    try {
      await addDoc(collection(state.db, "rooms", state.roomId, "messages"), {
        text,
        senderId: state.profile.id,
        senderName: state.profile.name,
        createdAt: serverTimestamp(),
      });

      messageInput.value = "";
      messageInput.focus();
    } catch (error) {
      console.error(error);
      setStatus("Message send failed. Check Firestore permissions.", "error");
    } finally {
      sendButton.disabled = false;
    }
  });

  leaveRoomButton.addEventListener("click", disconnectFromRoom);
}

async function ensureRoom(roomId) {
  const roomRef = doc(state.db, "rooms", roomId);
  const roomSnapshot = await getDoc(roomRef);

  if (!roomSnapshot.exists()) {
    await setDoc(roomRef, {
      createdAt: serverTimestamp(),
      createdBy: state.profile.id,
    });
  }
}

async function connectToRoom(roomId) {
  disconnectFromRoom(false);

  state.roomId = roomId;
  activeRoom.textContent = roomId;
  leaveRoomButton.disabled = false;
  setComposerState(true);
  setStatus(`Connected to room "${roomId}".`, "success");
  renderEmptyState("No messages yet. Say hello.");

  const messagesRef = collection(state.db, "rooms", roomId, "messages");
  const messagesQuery = query(messagesRef, orderBy("createdAt", "asc"));

  state.unsubscribeMessages = onSnapshot(
    messagesQuery,
    (snapshot) => {
      if (snapshot.empty) {
        renderEmptyState("No messages yet. Say hello.");
        return;
      }

      const fragment = document.createDocumentFragment();

      snapshot.forEach((messageDoc) => {
        const message = messageDoc.data();
        fragment.appendChild(renderMessage(message));
      });

      messagesContainer.replaceChildren(fragment);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },
    (error) => {
      console.error(error);
      setStatus("Realtime updates stopped. Verify your Firestore indexes and rules.", "error");
    }
  );
}

function disconnectFromRoom(clearSession = true) {
  if (state.unsubscribeMessages) {
    state.unsubscribeMessages();
    state.unsubscribeMessages = null;
  }

  state.roomId = null;
  activeRoom.textContent = "Not connected";
  leaveRoomButton.disabled = true;
  setComposerState(false);
  renderEmptyState("Join a room to start chatting.");

  if (clearSession) {
    sessionStorage.removeItem("firestore-chat-session");
    setStatus("You left the room.", "success");
  }
}

function renderMessage(message) {
  const wrapper = document.createElement("article");
  wrapper.className = "message";

  if (message.senderId === state.profile?.id) {
    wrapper.classList.add("own");
  }

  const meta = document.createElement("div");
  meta.className = "message-meta";

  const sender = document.createElement("strong");
  sender.textContent = message.senderName || "Anonymous";

  const timestamp = document.createElement("span");
  timestamp.textContent = formatTimestamp(message.createdAt);

  const body = document.createElement("p");
  body.className = "message-text";
  body.textContent = message.text;

  meta.append(sender, timestamp);
  wrapper.append(meta, body);
  return wrapper;
}

function renderEmptyState(message) {
  const placeholder = document.createElement("div");
  placeholder.className = "empty-state";
  placeholder.textContent = message;
  messagesContainer.replaceChildren(placeholder);
}

function setStatus(message, tone = "") {
  statusBanner.textContent = message;
  statusBanner.className = "status-banner";

  if (tone) {
    statusBanner.classList.add(tone);
  }
}

function setComposerState(enabled) {
  messageInput.disabled = !enabled;
  sendButton.disabled = !enabled;
}

function validateFirebaseConfig(config) {
  const requiredKeys = ["apiKey", "authDomain", "projectId", "appId"];

  for (const key of requiredKeys) {
    if (!config?.[key] || String(config[key]).includes("your-")) {
      throw new Error(`Missing Firebase config: ${key}`);
    }
  }
}

function generateRoomId() {
  return `room-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeRoomId(value) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function getOrCreateUserId() {
  const saved = localStorage.getItem("firestore-chat-user-id");
  if (saved) {
    return saved;
  }

  const newId = crypto.randomUUID();
  localStorage.setItem("firestore-chat-user-id", newId);
  return newId;
}

function persistSession() {
  if (!state.profile || !state.roomId) {
    return;
  }

  sessionStorage.setItem(
    "firestore-chat-session",
    JSON.stringify({
      displayName: state.profile.name,
      roomId: state.roomId,
    })
  );
}

function restoreSession() {
  const raw = sessionStorage.getItem("firestore-chat-session");
  if (!raw) {
    return;
  }

  try {
    const saved = JSON.parse(raw);
    if (saved.displayName) {
      displayNameInput.value = saved.displayName;
    }
    if (saved.roomId) {
      roomIdInput.value = saved.roomId;
    }
  } catch (error) {
    console.error(error);
    sessionStorage.removeItem("firestore-chat-session");
  }
}

function formatTimestamp(timestamp) {
  const date = timestamp?.toDate?.();
  if (!date) {
    return "sending...";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
