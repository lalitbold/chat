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
const roomPasscodeInput = document.getElementById("room-passcode");
const createRoomButton = document.getElementById("create-room");
const leaveRoomButton = document.getElementById("leave-room");
const activeRoom = document.getElementById("active-room");
const privacyIndicator = document.getElementById("privacy-indicator");
const statusBanner = document.getElementById("status-banner");
const messagesContainer = document.getElementById("messages");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const DEFAULT_TITLE = "Firestore Chat";

const ENABLE_PRIVACY_COMMAND = "enableprivacy";
const REVEAL_PRIVACY_COMMANDS = new Set(["whatisit", "whatitis"]);
const DISABLE_PRIVACY_COMMAND = "letitroll";
const PRIVACY_PREVIEW_MS = 10000;
const SESSION_KEY = "firestore-chat-session";

const state = {
  db: null,
  profile: null,
  roomId: null,
  roomPasscode: "",
  messages: [],
  hasHydratedRoom: false,
  visibleMessageLimit: null,
  seenMessageIds: new Set(),
  unreadMessageIds: [],
  hiddenMessageIds: [],
  previewMessageIds: [],
  isPrivacyEnabled: false,
  isPrivacyPreviewVisible: false,
  privacyPreviewTimeoutId: null,
  unsubscribeMessages: null,
};

boot();

async function boot() {
  registerServiceWorker();
  updateDocumentTitle();
  updateAppBadge();

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
  wireEvents();
  await restoreSession();
}

function wireEvents() {
  window.addEventListener("focus", handleAttentionChange);
  document.addEventListener("visibilitychange", handleAttentionChange);

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
    const roomPasscode = normalizePasscode(roomPasscodeInput.value);

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
      await ensureRoomAccess(roomId, roomPasscode);
      await connectToRoom(roomId, roomPasscode);
      await ensureNotificationPermission();
      persistSession();
      displayNameInput.value = state.profile.name;
      roomIdInput.value = state.roomId;
      roomPasscodeInput.value = state.roomPasscode;
    } catch (error) {
      console.error(error);
      if (error?.message === "ROOM_PASSCODE_REQUIRED") {
        setStatus("This room needs a passcode.", "error");
      } else if (error?.message === "ROOM_PASSCODE_INVALID") {
        setStatus("That passcode is incorrect for this room.", "error");
      } else {
        setStatus("We couldn't join that room. Check Firestore rules and try again.", "error");
      }
    }
  });

  messageForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const text = messageInput.value.trim();
    if (!text || !state.roomId || !state.db || !state.profile) {
      return;
    }

    if (handleLocalCommand(text)) {
      messageInput.value = "";
      messageInput.focus();
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

      if (state.isPrivacyEnabled && state.isPrivacyPreviewVisible) {
        hidePrivacyPreview();
      }

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

async function ensureRoomAccess(roomId, roomPasscode) {
  const roomRef = doc(state.db, "rooms", roomId);
  const roomSnapshot = await getDoc(roomRef);

  if (!roomSnapshot.exists()) {
    await setDoc(roomRef, {
      createdAt: serverTimestamp(),
      createdBy: state.profile.id,
      hasPasscode: Boolean(roomPasscode),
      passcode: roomPasscode || null,
    });
    return;
  }

  const roomData = roomSnapshot.data();

  if (!roomData?.hasPasscode) {
    return;
  }

  if (!roomPasscode) {
    throw new Error("ROOM_PASSCODE_REQUIRED");
  }

  if (roomData.passcode !== roomPasscode) {
    throw new Error("ROOM_PASSCODE_INVALID");
  }
}

async function connectToRoom(roomId, roomPasscode = "") {
  disconnectFromRoom(false, false);

  state.roomId = roomId;
  state.roomPasscode = roomPasscode;
  state.hasHydratedRoom = false;
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
      const previousIds = new Set(state.messages.map((message) => message.id));
      const nextMessages = snapshot.docs.map((messageDoc) => ({
        id: messageDoc.id,
        ...messageDoc.data(),
      }));
      const incomingMessages = nextMessages.filter(
        (message) => !previousIds.has(message.id) && message.senderId !== state.profile?.id
      );

      updateHiddenIncomingCount(nextMessages);
      state.messages = nextMessages;
      renderMessages();
      maybeNotifyIncomingMessages(incomingMessages);
      state.hasHydratedRoom = true;
      handleAttentionChange();
    },
    (error) => {
      console.error(error);
      setStatus("Realtime updates stopped. Verify your Firestore indexes and rules.", "error");
    }
  );
}

function disconnectFromRoom(clearSession = true, resetStealthState = true) {
  if (state.unsubscribeMessages) {
    state.unsubscribeMessages();
    state.unsubscribeMessages = null;
  }

  clearPrivacyPreviewTimer();
  state.roomId = null;
  state.roomPasscode = "";
  state.hasHydratedRoom = false;
  state.messages = [];
  state.visibleMessageLimit = null;
  state.seenMessageIds = new Set();
  state.unreadMessageIds = [];
  state.hiddenMessageIds = resetStealthState ? [] : state.hiddenMessageIds;
  state.previewMessageIds = [];
  state.isPrivacyEnabled = resetStealthState ? false : state.isPrivacyEnabled;
  state.isPrivacyPreviewVisible = false;
  activeRoom.textContent = "Not connected";
  leaveRoomButton.disabled = true;
  setComposerState(false);
  syncStealthLayout();
  updatePrivacyIndicator();
  updateDocumentTitle();
  updateAppBadge();
  renderEmptyState("Join a room to start chatting.");

  if (clearSession) {
    localStorage.removeItem(SESSION_KEY);
    setStatus("You left the room.", "success");
  } else {
    persistSession();
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

function renderMessages() {
  if (state.isPrivacyEnabled && !state.isPrivacyPreviewVisible) {
    renderPrivacyState();
    return;
  }

  const messagesToRender = getVisibleMessages();

  if (messagesToRender.length === 0) {
    renderEmptyState("No messages yet. Say hello.");
    return;
  }

  const fragment = document.createDocumentFragment();

  messagesToRender.forEach((message) => {
    fragment.appendChild(renderMessage(message));
  });

  messagesContainer.replaceChildren(fragment);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function renderEmptyState(message) {
  const placeholder = document.createElement("div");
  placeholder.className = "empty-state";
  placeholder.textContent = message;
  messagesContainer.replaceChildren(placeholder);
}

function renderPrivacyState() {
  const wrapper = document.createElement("div");
  wrapper.className = "privacy-state";

  const count = document.createElement("div");
  count.className = "privacy-count";
  count.textContent = String(state.hiddenMessageIds.length);
  wrapper.append(count);
  messagesContainer.replaceChildren(wrapper);
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

function handleLocalCommand(text) {
  const normalized = text.trim().toLowerCase();
  const disableMatch = normalized.match(/^letitroll(?:\s+(\d+))?$/);

  if (normalized === ENABLE_PRIVACY_COMMAND) {
    enablePrivacyMode();
    return true;
  }

  if (disableMatch) {
    const requestedCount = disableMatch[1] ? Number.parseInt(disableMatch[1], 10) : null;
    disablePrivacyMode(requestedCount);
    return true;
  }

  if (REVEAL_PRIVACY_COMMANDS.has(normalized)) {
    revealPrivacyTemporarily();
    return true;
  }

  return false;
}

function enablePrivacyMode() {
  state.isPrivacyEnabled = true;
  state.isPrivacyPreviewVisible = false;
  state.visibleMessageLimit = null;
  state.unreadMessageIds = [];
  clearPrivacyPreviewTimer();
  state.hiddenMessageIds = [];
  state.previewMessageIds = [];
  syncStealthLayout();
  updatePrivacyIndicator();
  updateDocumentTitle();
  updateAppBadge();
  renderPrivacyState();
  persistSession();
  setStatus("", "");
}

function disablePrivacyMode(messageLimit = null) {
  state.isPrivacyEnabled = false;
  state.isPrivacyPreviewVisible = false;
  state.visibleMessageLimit = Number.isInteger(messageLimit) && messageLimit > 0 ? messageLimit : null;
  state.unreadMessageIds = [];
  state.hiddenMessageIds = [];
  state.previewMessageIds = [];
  state.seenMessageIds = new Set(state.messages.map((message) => message.id));
  clearPrivacyPreviewTimer();
  syncStealthLayout();
  updatePrivacyIndicator();
  updateDocumentTitle();
  updateAppBadge();
  renderMessages();
  persistSession();
  setStatus("", "");
}

function revealPrivacyTemporarily() {
  if (!state.isPrivacyEnabled) {
    setStatus("", "");
    return;
  }

  state.previewMessageIds = [...state.hiddenMessageIds];
  state.isPrivacyPreviewVisible = true;
  const revealedIds = new Set(state.previewMessageIds);
  state.unreadMessageIds = state.unreadMessageIds.filter((id) => !revealedIds.has(id));
  state.hiddenMessageIds = [];
  state.seenMessageIds = new Set([...state.seenMessageIds, ...revealedIds]);
  syncStealthLayout();
  updatePrivacyIndicator();
  updateDocumentTitle();
  updateAppBadge();
  renderMessages();
  persistSession();
  clearPrivacyPreviewTimer();
  state.privacyPreviewTimeoutId = window.setTimeout(() => {
    state.isPrivacyPreviewVisible = false;
    state.previewMessageIds = [];
    syncStealthLayout();
    updatePrivacyIndicator();
    updateDocumentTitle();
    updateAppBadge();
    renderMessages();
    persistSession();
    setStatus("", "");
  }, PRIVACY_PREVIEW_MS);
  setStatus("", "");
}

function hidePrivacyPreview() {
  clearPrivacyPreviewTimer();
  state.isPrivacyPreviewVisible = false;
  state.previewMessageIds = [];
  syncStealthLayout();
  updatePrivacyIndicator();
  updateDocumentTitle();
  updateAppBadge();
  renderMessages();
  persistSession();
}

function clearPrivacyPreviewTimer() {
  if (state.privacyPreviewTimeoutId) {
    window.clearTimeout(state.privacyPreviewTimeoutId);
    state.privacyPreviewTimeoutId = null;
  }
}

function updatePrivacyIndicator() {
  const count = getUnreadCount();
  const shouldShowCount = count > 0 && (!state.isPrivacyEnabled || !state.isPrivacyPreviewVisible);

  privacyIndicator.textContent = shouldShowCount ? String(count) : "";
  privacyIndicator.className = shouldShowCount ? "privacy-indicator active" : "privacy-indicator";
}

function updateHiddenIncomingCount(nextMessages) {
  const nextIds = new Set(nextMessages.map((message) => message.id));
  const hiddenIds = new Set(state.hiddenMessageIds);
  const unreadIds = new Set(state.unreadMessageIds);
  const isInitialHydration = state.messages.length === 0 && state.seenMessageIds.size === 0;

  if (isInitialHydration) {
    state.seenMessageIds = new Set(
      nextMessages
        .filter((message) => !hiddenIds.has(message.id))
        .map((message) => message.id)
    );
  }

  if (state.isPrivacyEnabled && !state.isPrivacyPreviewVisible) {
    nextMessages.forEach((message) => {
      if (
        !state.seenMessageIds.has(message.id) &&
        message.senderId !== state.profile?.id &&
        !hiddenIds.has(message.id)
      ) {
        hiddenIds.add(message.id);
      }
    });
    state.hiddenMessageIds = nextMessages
      .filter((message) => hiddenIds.has(message.id))
      .map((message) => message.id);
  } else {
    nextMessages.forEach((message) => {
      if (
        !state.seenMessageIds.has(message.id) &&
        message.senderId !== state.profile?.id &&
        !unreadIds.has(message.id)
      ) {
        unreadIds.add(message.id);
      }
    });

    if (shouldAutoMarkAsRead()) {
      state.seenMessageIds = nextIds;
      state.unreadMessageIds = [];
    } else {
      state.unreadMessageIds = nextMessages
        .filter((message) => unreadIds.has(message.id))
        .map((message) => message.id);
    }
  }

  updatePrivacyIndicator();
  updateDocumentTitle();
  updateAppBadge();
  persistSession();
}

function updateDocumentTitle() {
  const count = getUnreadCount();
  document.title = count > 0 ? `(${count}) ${DEFAULT_TITLE}` : DEFAULT_TITLE;
}

async function ensureNotificationPermission() {
  if (typeof Notification === "undefined") {
    return;
  }

  if (Notification.permission !== "default") {
    return;
  }

  try {
    await Notification.requestPermission();
  } catch (error) {
    console.error("Notification permission request failed:", error);
  }
}

function maybeNotifyIncomingMessages(incomingMessages) {
  if (
    !state.hasHydratedRoom ||
    state.isPrivacyEnabled ||
    shouldAutoMarkAsRead() ||
    typeof Notification === "undefined" ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  incomingMessages.forEach((message) => {
    showIncomingNotification(message);
  });
}

async function showIncomingNotification(message) {
  const title = message.senderName || "New message";
  const body = message.text || "You received a new message.";
  const options = {
    body,
    tag: `chat-${state.roomId}-${message.id}`,
    renotify: false,
    badge: "./icons/icon-192.png",
    icon: "./icons/icon-192.png",
    data: {
      roomId: state.roomId,
    },
  };

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      return;
    }

    new Notification(title, options);
  } catch (error) {
    console.error("Notification display failed:", error);
  }
}

function updateAppBadge() {
  const count = getUnreadCount();

  if (typeof navigator === "undefined") {
    return;
  }

  if (count > 0 && typeof navigator.setAppBadge === "function") {
    navigator.setAppBadge(count).catch(() => {});
    return;
  }

  if (count === 0 && typeof navigator.clearAppBadge === "function") {
    navigator.clearAppBadge().catch(() => {});
  }
}

function syncStealthLayout() {
  document.body.classList.toggle("stealth-active", state.isPrivacyEnabled);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((registration) => registration.update())
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });
  });
}

function getVisibleMessages() {
  if (!state.isPrivacyPreviewVisible) {
    if (state.visibleMessageLimit && !state.isPrivacyEnabled) {
      return state.messages.slice(-state.visibleMessageLimit);
    }

    return state.messages;
  }

  const previewIds = new Set(state.previewMessageIds);
  return state.messages.filter((message) => previewIds.has(message.id));
}

function getUnreadCount() {
  return state.isPrivacyEnabled ? state.hiddenMessageIds.length : state.unreadMessageIds.length;
}

function shouldAutoMarkAsRead() {
  return (
    !state.isPrivacyEnabled &&
    document.visibilityState === "visible" &&
    document.hasFocus()
  );
}

function handleAttentionChange() {
  if (!shouldAutoMarkAsRead() || !state.roomId) {
    return;
  }

  state.unreadMessageIds = [];
  state.seenMessageIds = new Set(state.messages.map((message) => message.id));
  updatePrivacyIndicator();
  updateDocumentTitle();
  updateAppBadge();
  persistSession();
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

function normalizePasscode(value) {
  return value.trim();
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
  if (!state.profile) {
    return;
  }

  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      displayName: state.profile.name,
      roomId: state.roomId,
      roomPasscode: state.roomPasscode,
      isPrivacyEnabled: state.isPrivacyEnabled,
      visibleMessageLimit: state.visibleMessageLimit,
      unreadMessageIds: state.unreadMessageIds,
      hiddenMessageIds: state.hiddenMessageIds,
    })
  );
}

async function restoreSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return;
  }

  try {
    const saved = JSON.parse(raw);
    if (saved.displayName) {
      displayNameInput.value = saved.displayName;
      state.profile = {
        id: getOrCreateUserId(),
        name: saved.displayName,
      };
    }
    if (saved.roomId) {
      roomIdInput.value = saved.roomId;
    }
    if (saved.roomPasscode) {
      roomPasscodeInput.value = saved.roomPasscode;
      state.roomPasscode = saved.roomPasscode;
    }
    state.isPrivacyEnabled = Boolean(saved.isPrivacyEnabled);
    state.visibleMessageLimit =
      Number.isInteger(saved.visibleMessageLimit) && saved.visibleMessageLimit > 0
        ? saved.visibleMessageLimit
        : null;
    state.unreadMessageIds = Array.isArray(saved.unreadMessageIds) ? saved.unreadMessageIds : [];
    state.hiddenMessageIds = Array.isArray(saved.hiddenMessageIds) ? saved.hiddenMessageIds : [];
    syncStealthLayout();
    updatePrivacyIndicator();
    updateDocumentTitle();
    updateAppBadge();

    if (state.db && saved.displayName && saved.roomId) {
      await ensureRoomAccess(saved.roomId, saved.roomPasscode || "");
      await connectToRoom(saved.roomId, saved.roomPasscode || "");
      persistSession();
    }
  } catch (error) {
    console.error(error);
    localStorage.removeItem(SESSION_KEY);
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
