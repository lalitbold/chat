import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  linkWithPopup,
  linkWithRedirect,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const joinForm = document.getElementById("join-form");
const displayNameInput = document.getElementById("display-name");
const roomIdInput = document.getElementById("room-id");
const roomPasscodeInput = document.getElementById("room-passcode");
const authStatus = document.getElementById("auth-status");
const linkGoogleButton = document.getElementById("link-google");
const commandScopeInput = document.getElementById("command-scope");
const privacyCommandInput = document.getElementById("privacy-command");
const revealCommandInput = document.getElementById("reveal-command");
const disableCommandInput = document.getElementById("disable-command");
const toggleCommandVisibilityButton = document.getElementById("toggle-command-visibility");
const createRoomButton = document.getElementById("create-room");
const leaveRoomButton = document.getElementById("leave-room");
const activeRoom = document.getElementById("active-room");
const privacyIndicator = document.getElementById("privacy-indicator");
const statusBanner = document.getElementById("status-banner");
const shareLinkPanel = document.getElementById("share-link-panel");
const shareLinkOutput = document.getElementById("share-link-output");
const copyShareLinkButton = document.getElementById("copy-share-link");
const closeShareLinkButton = document.getElementById("close-share-link");
const messagesContainer = document.getElementById("messages");
const messageForm = document.getElementById("message-form");
const advancedSettingsPanel = document.getElementById("advanced-settings");
const composerCount = document.getElementById("composer-count");
const messageInput = document.getElementById("message-input");
const messageMaskOverlay = document.getElementById("message-mask-overlay");
const toggleMessageMaskButton = document.getElementById("toggle-message-mask");
const sendButton = document.getElementById("send-button");
const saveAdvancedSettingsButton = document.getElementById("save-advanced-settings");
const closeAdvancedSettingsButton = document.getElementById("close-advanced-settings");
const DEFAULT_TITLE = "Firestore Chat";

const DEFAULT_ROOM_COMMANDS = {
  enable: "enableprivacy",
  reveal: "whatitis",
  disable: "letitroll",
};
const DEFAULT_REVEAL_ALIASES = new Set(["whatisit", "whatitis"]);
const ADVANCED_SETTINGS_COMMANDS = new Set(["advancesetting", "advancedsetting"]);
const GET_LINK_COMMAND = "getlink";
const PRIVACY_PREVIEW_MS = 10000;
const SESSION_KEY = "firestore-chat-session";
const MESSAGES_PAGE_SIZE = 25;
const LOCAL_ROOM_COMMANDS_KEY_PREFIX = "firestore-chat-room-commands";
const GROUP_COMMAND_SCOPE = "group";
const PERSONAL_COMMAND_SCOPE = "personal";
const SHARE_QUERY_KEY = "c";
const SHARE_SECRET = "firestore-chat-share-v1";
const READ_RECEIPT_SYNC_DELAY_MS = 1200;

const state = {
  db: null,
  auth: null,
  authUser: null,
  authReady: null,
  authError: null,
  profile: null,
  roomId: null,
  roomPasscode: "",
  roomCommands: { ...DEFAULT_ROOM_COMMANDS },
  groupRoomCommands: {},
  isAdvancedSettingsVisible: false,
  areAdvancedCommandsVisible: false,
  pendingInvitePrivacyMode: false,
  isMessageInputMasked: false,
  messages: [],
  hasHydratedRoom: false,
  hasMoreMessages: true,
  isLoadingOlderMessages: false,
  oldestMessageCursor: null,
  visibleMessageLimit: null,
  seenMessageIds: new Set(),
  unreadMessageIds: [],
  hiddenMessageIds: [],
  previewMessageIds: [],
  isPrivacyEnabled: false,
  isPrivacyPreviewVisible: false,
  privacyPreviewTimeoutId: null,
  unsubscribeMessages: null,
  unsubscribeReadReceipts: null,
  readReceipts: [],
  lastSyncedReadMessageId: null,
  pendingReadMessageId: null,
  readReceiptTimeoutId: null,
};

boot();

async function boot() {
  registerServiceWorker();
  updateDocumentTitle();
  updateAppBadge();
  clearRoomCommandInputs();

  try {
    validateFirebaseConfig(firebaseConfig);
    const app = initializeApp(firebaseConfig);
    state.db = getFirestore(app);
    state.auth = getAuth(app);
    state.authReady = initializeAuthSession();
    await state.authReady;
    const handledGoogleRedirect = await handleGoogleRedirectResult();
    await ensureAnonymousAuthSession();

    if (!handledGoogleRedirect) {
      setStatus("Firebase connected. Create or join a room.", "success");
    }
  } catch (error) {
    console.error(error);
    setComposerState(false);

    if (isFirebaseAuthSetupError(error)) {
      state.authError = error;
      updateAuthUi();
      setStatus(
        "Firebase Auth is not enabled yet. Enable Authentication and the Anonymous provider in Firebase.",
        "error"
      );
    } else {
      setStatus(
        "Firebase is not configured yet. Copy firebase-config.example.js to firebase-config.js and add your Firebase project keys.",
        "error"
      );
    }
  }

  renderEmptyState("Join a room to start chatting.");
  wireEvents();
  const handledInvite = await hydrateFromSharedLink();
  if (handledInvite) {
    return;
  }
  await restoreSession();
}

function wireEvents() {
  window.addEventListener("focus", handleAttentionChange);
  document.addEventListener("visibilitychange", handleAttentionChange);
  messageInput.addEventListener("keydown", handleMessageInputKeydown);
  messageInput.addEventListener("input", syncMessageMaskOverlay);
  messageInput.addEventListener("scroll", syncMessageMaskOverlayScroll);
  messagesContainer.addEventListener("scroll", handleMessageListScroll);
  toggleMessageMaskButton.addEventListener("click", toggleMessageInputMask);
  saveAdvancedSettingsButton.addEventListener("click", saveAdvancedSettings);
  closeAdvancedSettingsButton.addEventListener("click", () => setAdvancedSettingsVisibility(false));
  commandScopeInput.addEventListener("change", handleCommandScopeChange);
  toggleCommandVisibilityButton.addEventListener("click", toggleAdvancedCommandVisibility);
  copyShareLinkButton.addEventListener("click", copyShareLink);
  closeShareLinkButton.addEventListener("click", hideShareLinkPanel);
  linkGoogleButton.addEventListener("click", linkGoogleAccount);

  createRoomButton.addEventListener("click", () => {
    roomIdInput.value = generateRoomId();
    roomIdInput.focus();
  });

  joinForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!state.db || !state.auth) {
      setStatus("Add your Firebase config before joining a room.", "error");
      return;
    }

    await state.authReady;

    if (!state.authUser) {
      setStatus("Auth is still starting. Try again in a moment.", "error");
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
      id: state.authUser.uid,
      name: displayName,
    };
    await syncAuthDisplayName(displayName);

    try {
      const roomData = await ensureRoomAccess(roomId, roomPasscode);
      await connectToRoom(roomId, roomPasscode, roomData);
      await ensureNotificationPermission();
      if (state.pendingInvitePrivacyMode) {
        enablePrivacyMode();
        state.pendingInvitePrivacyMode = false;
      }
      persistSession();
      displayNameInput.value = state.profile.name;
      roomIdInput.value = state.roomId;
      roomPasscodeInput.value = state.roomPasscode;
      applyRoomCommandsToInputs(state.roomCommands);
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
      syncMessageMaskOverlay();
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
      syncMessageMaskOverlay();
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

function initializeAuthSession() {
  updateAuthUi();

  return new Promise((resolve, reject) => {
    let isResolved = false;

    onAuthStateChanged(
      state.auth,
      async (user) => {
        try {
          if (user) {
            applyAuthUser(user);
          }

          if (!isResolved) {
            isResolved = true;
            resolve(user || null);
          }
        } catch (error) {
          console.error(error);
          state.authError = error;
          updateAuthUi();

          if (!isResolved) {
            isResolved = true;
            reject(error);
          }
        }
      },
      (error) => {
        console.error(error);
        state.authError = error;
        updateAuthUi();

        if (!isResolved) {
          isResolved = true;
          reject(error);
        }
      }
    );
  });
}

async function ensureAnonymousAuthSession() {
  if (state.authUser || state.auth.currentUser) {
    return;
  }

  try {
    const result = await signInAnonymously(state.auth);
    applyAuthUser(result.user);
  } catch (error) {
    console.error(error);
    state.authError = error;
    updateAuthUi();
    throw error;
  }
}

function applyAuthUser(user) {
  const previousProfileId = state.profile?.id;
  state.authError = null;
  state.authUser = user;

  if (!displayNameInput.value.trim() && user.displayName) {
    displayNameInput.value = user.displayName.slice(0, 30);
  }

  if (state.profile) {
    state.profile = {
      id: user.uid,
      name: displayNameInput.value.trim() || user.displayName || state.profile.name,
    };
  }

  if (previousProfileId && previousProfileId !== user.uid) {
    state.lastSyncedReadMessageId = null;
    state.pendingReadMessageId = null;
    renderMessages();
    queueReadReceiptSync();
    persistSession();
  }

  updateAuthUi();
}

async function linkGoogleAccount() {
  if (!state.auth || !state.authUser) {
    setStatus("Auth is still starting. Try again in a moment.", "error");
    return;
  }

  const provider = new GoogleAuthProvider();
  state.authError = null;
  linkGoogleButton.disabled = true;

  try {
    if (state.authUser.isAnonymous) {
      try {
        const result = await linkWithPopup(state.authUser, provider);
        applyAuthUser(result.user);
        await syncAuthDisplayName(displayNameInput.value.trim());
        setStatus("Google linked. This account can now be used on other devices.", "success");
        return;
      } catch (error) {
        if (isPopupBlockedError(error)) {
          await startGoogleRedirectLink(provider);
          return;
        }

        if (error?.code !== "auth/credential-already-in-use") {
          throw error;
        }
      }
    }

    try {
      const result = await signInWithPopup(state.auth, provider);
      applyAuthUser(result.user);
      setStatus("Signed in with Google. Your chats now use this account.", "success");
    } catch (error) {
      if (isPopupBlockedError(error)) {
        await startGoogleRedirectSignIn(provider);
        return;
      }

      throw error;
    }
  } catch (error) {
    console.error(error);
    setStatus(getGoogleAuthErrorMessage(error), "error");
  } finally {
    updateAuthUi();
  }
}

async function startGoogleRedirectLink(provider = new GoogleAuthProvider()) {
  sessionStorage.setItem("firestore-chat-google-redirect-mode", "link");
  setStatus("Popup was blocked. Redirecting to Google sign-in...", "success");
  await linkWithRedirect(state.authUser, provider);
}

async function startGoogleRedirectSignIn(provider = new GoogleAuthProvider()) {
  sessionStorage.setItem("firestore-chat-google-redirect-mode", "signin");
  setStatus("Popup was blocked. Redirecting to Google sign-in...", "success");
  await signInWithRedirect(state.auth, provider);
}

async function handleGoogleRedirectResult() {
  const redirectMode = sessionStorage.getItem("firestore-chat-google-redirect-mode");

  if (!redirectMode) {
    return false;
  }

  sessionStorage.removeItem("firestore-chat-google-redirect-mode");

  try {
    const result = await getRedirectResult(state.auth);

    if (!result?.user) {
      return false;
    }

    applyAuthUser(result.user);

    if (redirectMode === "link") {
      await syncAuthDisplayName(displayNameInput.value.trim());
      setStatus("Google linked. This account can now be used on other devices.", "success");
      return true;
    }

    setStatus("Signed in with Google. Your chats now use this account.", "success");
    return true;
  } catch (error) {
    console.error(error);

    if (redirectMode === "link" && error?.code === "auth/credential-already-in-use") {
      await startGoogleRedirectSignIn();
      return true;
    }

    setStatus(getGoogleAuthErrorMessage(error), "error");
    return true;
  }
}

async function syncAuthDisplayName(displayName) {
  if (!state.authUser || !displayName || state.authUser.displayName === displayName) {
    return;
  }

  try {
    await updateProfile(state.authUser, { displayName });
    state.authUser = state.auth.currentUser;
    updateAuthUi();
  } catch (error) {
    console.error("Display name sync failed:", error);
  }
}

function updateAuthUi() {
  if (!authStatus || !linkGoogleButton) {
    return;
  }

  if (!state.auth) {
    authStatus.textContent = "Firebase Auth is not configured.";
    linkGoogleButton.disabled = true;
    return;
  }

  if (state.authError) {
    authStatus.textContent = isFirebaseAuthSetupError(state.authError)
      ? "Enable Firebase Auth and Anonymous sign-in."
      : "Firebase Auth could not start.";
    linkGoogleButton.disabled = true;
    return;
  }

  if (!state.authUser) {
    authStatus.textContent = "Starting secure guest session...";
    linkGoogleButton.disabled = true;
    return;
  }

  const googleProvider = state.authUser.providerData.find(
    (provider) => provider.providerId === "google.com"
  );

  if (googleProvider) {
    authStatus.textContent = `Google account: ${googleProvider.email || state.authUser.displayName || "linked"}`;
    linkGoogleButton.textContent = "Switch Google";
  } else {
    authStatus.textContent = "Guest account. Link Google to use this chat on another device.";
    linkGoogleButton.textContent = "Link Google";
  }

  linkGoogleButton.disabled = false;
}

function isFirebaseAuthSetupError(error) {
  return ["auth/configuration-not-found", "auth/admin-restricted-operation"].includes(error?.code);
}

function isPopupBlockedError(error) {
  return ["auth/popup-blocked", "auth/cancelled-popup-request"].includes(error?.code);
}

function getGoogleAuthErrorMessage(error) {
  if (error?.code === "auth/popup-blocked") {
    return "Google popup was blocked. Use the redirect flow or allow popups for this site.";
  }

  if (error?.code === "auth/popup-closed-by-user") {
    return "Google linking was cancelled.";
  }

  if (error?.code === "auth/unauthorized-domain") {
    return "Add this domain to Firebase Auth authorized domains.";
  }

  if (error?.code === "auth/operation-not-allowed") {
    return "Enable the Google provider in Firebase Authentication.";
  }

  if (isFirebaseAuthSetupError(error)) {
    return "Enable Firebase Auth, Anonymous sign-in, and Google sign-in.";
  }

  return `Google linking failed${error?.code ? ` (${error.code})` : ""}.`;
}

async function ensureRoomAccess(roomId, roomPasscode) {
  const roomRef = doc(state.db, "rooms", roomId);
  const roomSnapshot = await getDoc(roomRef);

  if (!roomSnapshot.exists()) {
    const roomData = {
      createdAt: serverTimestamp(),
      createdBy: state.profile.id,
      hasPasscode: Boolean(roomPasscode),
      passcode: roomPasscode || null,
      commands: {},
    };
    await setDoc(roomRef, roomData);
    return roomData;
  }

  const roomData = roomSnapshot.data();

  if (!roomData?.hasPasscode) {
    return roomData;
  }

  if (!roomPasscode) {
    throw new Error("ROOM_PASSCODE_REQUIRED");
  }

  if (roomData.passcode !== roomPasscode) {
    throw new Error("ROOM_PASSCODE_INVALID");
  }

  return roomData;
}

async function connectToRoom(roomId, roomPasscode = "", roomData = null) {
  const pendingInvitePrivacyMode = state.pendingInvitePrivacyMode;
  disconnectFromRoom(false, false);

  state.pendingInvitePrivacyMode = pendingInvitePrivacyMode;
  state.roomId = roomId;
  state.roomPasscode = roomPasscode;
  state.groupRoomCommands = loadGroupRoomCommands(roomData);
  state.roomCommands = getEffectiveRoomCommands(roomId, state.groupRoomCommands);
  state.isAdvancedSettingsVisible = false;
  state.hasHydratedRoom = false;
  state.messages = [];
  state.oldestMessageCursor = null;
  state.hasMoreMessages = true;
  state.isLoadingOlderMessages = false;
  activeRoom.textContent = roomId;
  leaveRoomButton.disabled = false;
  setComposerState(true);
  setStatus(`Connected to room "${roomId}".`, "success");
  hideShareLinkPanel();
  renderEmptyState("No messages yet. Say hello.");
  applyRoomCommandsToInputs({});
  setAdvancedSettingsVisibility(false);

  await loadInitialMessages(roomId);
  subscribeToReadReceipts(roomId);
  subscribeToLatestMessages(roomId);
  queueReadReceiptSync();
}

async function loadInitialMessages(roomId) {
  const messagesRef = collection(state.db, "rooms", roomId, "messages");
  const initialQuery = query(
    messagesRef,
    orderBy("createdAt", "desc"),
    limit(MESSAGES_PAGE_SIZE)
  );
  const snapshot = await getDocs(initialQuery);
  const docs = snapshot.docs;

  state.messages = docs
    .map((messageDoc) => ({
      id: messageDoc.id,
      ...messageDoc.data(),
    }))
    .reverse();
  state.oldestMessageCursor = docs.length > 0 ? docs[docs.length - 1] : null;
  state.hasMoreMessages = docs.length === MESSAGES_PAGE_SIZE;
  state.seenMessageIds = new Set(
    state.messages
      .filter((message) => !state.hiddenMessageIds.includes(message.id))
      .map((message) => message.id)
  );

  renderMessages();
}

function subscribeToLatestMessages(roomId) {
  const messagesRef = collection(state.db, "rooms", roomId, "messages");
  const latestMessagesQuery = query(
    messagesRef,
    orderBy("createdAt", "desc"),
    limit(MESSAGES_PAGE_SIZE)
  );

  state.unsubscribeMessages = onSnapshot(
    latestMessagesQuery,
    (snapshot) => {
      const previousIds = new Set(state.messages.map((message) => message.id));
      const latestMessages = snapshot.docs
        .map((messageDoc) => ({
          id: messageDoc.id,
          ...messageDoc.data(),
        }))
        .reverse();
      const latestIds = new Set(latestMessages.map((message) => message.id));
      const olderMessages = state.messages.filter((message) => !latestIds.has(message.id));
      const nextMessages = [...olderMessages, ...latestMessages].sort(compareMessagesByTime);
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

async function loadOlderMessages() {
  if (
    !state.roomId ||
    !state.oldestMessageCursor ||
    !state.hasMoreMessages ||
    state.isLoadingOlderMessages
  ) {
    return;
  }

  state.isLoadingOlderMessages = true;
  const previousScrollHeight = messagesContainer.scrollHeight;
  const previousScrollTop = messagesContainer.scrollTop;

  try {
    const messagesRef = collection(state.db, "rooms", state.roomId, "messages");
    const olderMessagesQuery = query(
      messagesRef,
      orderBy("createdAt", "desc"),
      startAfter(state.oldestMessageCursor),
      limit(MESSAGES_PAGE_SIZE)
    );
    const snapshot = await getDocs(olderMessagesQuery);
    const docs = snapshot.docs;
    const olderMessages = docs
      .map((messageDoc) => ({
        id: messageDoc.id,
        ...messageDoc.data(),
      }))
      .reverse();
    const existingIds = new Set(state.messages.map((message) => message.id));

    state.messages = [...olderMessages.filter((message) => !existingIds.has(message.id)), ...state.messages];
    state.oldestMessageCursor = docs.length > 0 ? docs[docs.length - 1] : state.oldestMessageCursor;
    state.hasMoreMessages = docs.length === MESSAGES_PAGE_SIZE;

    renderMessages({
      preserveScroll: true,
      previousScrollHeight,
      previousScrollTop,
    });
  } catch (error) {
    console.error(error);
    setStatus("Older messages could not be loaded.", "error");
  } finally {
    state.isLoadingOlderMessages = false;
  }
}

function disconnectFromRoom(clearSession = true, resetStealthState = true) {
  if (state.unsubscribeMessages) {
    state.unsubscribeMessages();
    state.unsubscribeMessages = null;
  }

  if (state.unsubscribeReadReceipts) {
    state.unsubscribeReadReceipts();
    state.unsubscribeReadReceipts = null;
  }

  clearReadReceiptTimer();
  clearPrivacyPreviewTimer();
  state.roomId = null;
  state.roomPasscode = "";
  state.roomCommands = { ...DEFAULT_ROOM_COMMANDS };
  state.groupRoomCommands = {};
  state.isAdvancedSettingsVisible = false;
  state.pendingInvitePrivacyMode = false;
  state.hasHydratedRoom = false;
  state.messages = [];
  state.hasMoreMessages = true;
  state.isLoadingOlderMessages = false;
  state.oldestMessageCursor = null;
  state.visibleMessageLimit = null;
  state.seenMessageIds = new Set();
  state.unreadMessageIds = [];
  state.hiddenMessageIds = resetStealthState ? [] : state.hiddenMessageIds;
  state.previewMessageIds = [];
  state.isPrivacyEnabled = resetStealthState ? false : state.isPrivacyEnabled;
  state.isPrivacyPreviewVisible = false;
  state.readReceipts = [];
  state.lastSyncedReadMessageId = null;
  state.pendingReadMessageId = null;
  activeRoom.textContent = "Not connected";
  leaveRoomButton.disabled = true;
  setComposerState(false);
  hideShareLinkPanel();
  setAdvancedSettingsVisibility(false);
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
  sender.textContent = getDisplaySenderName(message);

  const timestamp = document.createElement("span");
  timestamp.textContent = formatTimestamp(message.createdAt);

  const body = document.createElement("p");
  body.className = "message-text";
  body.textContent = message.text;

  meta.append(sender, timestamp);
  wrapper.append(meta, body);

  if (message.senderId === state.profile?.id) {
    const readBy = getMessageReadByNames(message);

    if (readBy.length > 0) {
      const receipt = document.createElement("div");
      receipt.className = "message-read-receipt";
      receipt.textContent = `Read by ${formatNameList(readBy)}`;
      wrapper.append(receipt);
    }
  }

  return wrapper;
}

function renderMessages(options = {}) {
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

  if (options.preserveScroll) {
    messagesContainer.scrollTop =
      messagesContainer.scrollHeight - options.previousScrollHeight + options.previousScrollTop;
    return;
  }

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
  toggleMessageMaskButton.disabled = !enabled;
}

function toggleMessageInputMask() {
  state.isMessageInputMasked = !state.isMessageInputMasked;
  syncMessageInputMask();
}

function syncMessageInputMask() {
  messageInput.classList.toggle("masked", state.isMessageInputMasked);
  toggleMessageMaskButton.textContent = state.isMessageInputMasked ? "Show text" : "Mask text";
  syncMessageMaskOverlay();
}

function syncMessageMaskOverlay() {
  messageMaskOverlay.textContent = messageInput.value.replace(/[^\n]/g, "*");
  syncMessageMaskOverlayScroll();
}

function syncMessageMaskOverlayScroll() {
  messageMaskOverlay.scrollTop = messageInput.scrollTop;
  messageMaskOverlay.scrollLeft = messageInput.scrollLeft;
}

function handleMessageInputKeydown(event) {
  if (event.key !== "Enter" || event.shiftKey) {
    return;
  }

  event.preventDefault();

  if (!messageInput.disabled) {
    messageForm.requestSubmit();
  }
}

function handleMessageListScroll() {
  if (messagesContainer.scrollTop > 60) {
    return;
  }

  if (state.isPrivacyEnabled && !state.isPrivacyPreviewVisible) {
    return;
  }

  loadOlderMessages();
}

function handleLocalCommand(text) {
  const normalized = text.trim().toLowerCase();
  const roomCommands = getEffectiveRoomCommands(state.roomId, state.groupRoomCommands);
  state.roomCommands = roomCommands;
  const disableMatch = matchCommandWithOptionalCount(normalized, [
    DEFAULT_ROOM_COMMANDS.disable,
    roomCommands.disable,
  ]);
  const revealMatch = matchCommandWithOptionalCount(normalized, [
    ...DEFAULT_REVEAL_ALIASES,
    roomCommands.reveal,
  ]);

  if (matchesCommand(normalized, DEFAULT_ROOM_COMMANDS.enable, roomCommands.enable)) {
    enablePrivacyMode();
    return true;
  }

  if (ADVANCED_SETTINGS_COMMANDS.has(normalized)) {
    setAdvancedSettingsVisibility(true);
    return true;
  }

  if (normalized === GET_LINK_COMMAND) {
    void generateShareLink();
    return true;
  }

  if (disableMatch) {
    const requestedCount = disableMatch[1] ? Number.parseInt(disableMatch[1], 10) : null;
    disablePrivacyMode(requestedCount);
    return true;
  }

  if (revealMatch) {
    const requestedCount = revealMatch[1] ? Number.parseInt(revealMatch[1], 10) : null;
    revealPrivacyTemporarily(requestedCount);
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
  queueReadReceiptSync();
  persistSession();
  setStatus("", "");
}

function revealPrivacyTemporarily(messageLimit = null) {
  if (!state.isPrivacyEnabled) {
    setStatus("", "");
    return;
  }

  const previewLimit = Number.isInteger(messageLimit) && messageLimit > 0 ? messageLimit : null;
  state.previewMessageIds = previewLimit
    ? state.messages.slice(-previewLimit).map((message) => message.id)
    : [...state.hiddenMessageIds];
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
  queueReadReceiptSync();
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

function subscribeToReadReceipts(roomId) {
  const receiptsRef = collection(state.db, "rooms", roomId, "readReceipts");

  state.unsubscribeReadReceipts = onSnapshot(
    receiptsRef,
    (snapshot) => {
      state.readReceipts = snapshot.docs.map((receiptDoc) => ({
        id: receiptDoc.id,
        ...receiptDoc.data(),
      }));
      renderMessages();
    },
    (error) => {
      console.error(error);
      setStatus("Read notifications stopped. Verify your Firestore rules.", "error");
    }
  );
}

function queueReadReceiptSync() {
  const latestReadableMessage = getLatestReadableMessage();

  if (
    !latestReadableMessage ||
    latestReadableMessage.id === state.lastSyncedReadMessageId ||
    latestReadableMessage.id === state.pendingReadMessageId
  ) {
    return;
  }

  state.pendingReadMessageId = latestReadableMessage.id;
  clearReadReceiptTimer();
  state.readReceiptTimeoutId = window.setTimeout(() => {
    void syncReadReceipt(latestReadableMessage);
  }, READ_RECEIPT_SYNC_DELAY_MS);
}

async function syncReadReceipt(message) {
  clearReadReceiptTimer();

  if (!state.db || !state.roomId || !state.profile || !message?.createdAt?.toMillis) {
    state.pendingReadMessageId = null;
    return;
  }

  try {
    const receiptRef = doc(state.db, "rooms", state.roomId, "readReceipts", state.profile.id);
    await setDoc(
      receiptRef,
      {
        userId: state.profile.id,
        displayName: state.profile.name,
        lastReadMessageId: message.id,
        lastReadCreatedAt: message.createdAt,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    state.lastSyncedReadMessageId = message.id;
  } catch (error) {
    console.error(error);
  } finally {
    state.pendingReadMessageId = null;
  }
}

function clearReadReceiptTimer() {
  if (state.readReceiptTimeoutId) {
    window.clearTimeout(state.readReceiptTimeoutId);
    state.readReceiptTimeoutId = null;
  }
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
  composerCount.textContent = state.isPrivacyEnabled ? String(count) : "";
  composerCount.className =
    state.isPrivacyEnabled ? "composer-count active" : "composer-count";
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

function compareMessagesByTime(left, right) {
  const leftTime = left.createdAt?.toMillis?.() ?? 0;
  const rightTime = right.createdAt?.toMillis?.() ?? 0;

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return left.id.localeCompare(right.id);
}

function getDisplaySenderName(message) {
  if (state.isPrivacyEnabled && state.isPrivacyPreviewVisible) {
    return getPrivateAlias(message.senderId);
  }

  return message.senderName || "Anonymous";
}

function getMessageReadByNames(message) {
  const messageTime = message.createdAt?.toMillis?.();

  if (!messageTime) {
    return [];
  }

  return state.readReceipts
    .filter((receipt) => {
      if (!receipt.lastReadCreatedAt?.toMillis || receipt.userId === state.profile?.id) {
        return false;
      }

      return receipt.lastReadCreatedAt.toMillis() >= messageTime;
    })
    .map((receipt) => receipt.displayName || "Someone")
    .filter((name, index, names) => names.indexOf(name) === index)
    .sort((left, right) => left.localeCompare(right));
}

function formatNameList(names) {
  if (names.length <= 2) {
    return names.join(" and ");
  }

  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
}

function getPrivateAlias(senderId) {
  const uniqueSenderIds = [];

  state.messages.forEach((message) => {
    if (!message.senderId || uniqueSenderIds.includes(message.senderId)) {
      return;
    }

    uniqueSenderIds.push(message.senderId);
  });

  const index = uniqueSenderIds.indexOf(senderId);
  return index >= 0 ? `User ${index + 1}` : "User";
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

async function generateShareLink() {
  if (!state.roomId) {
    setStatus("Join a room before creating a share link.", "error");
    return;
  }

  try {
    const token = await encryptSharePayload({
      roomId: state.roomId,
      roomPasscode: state.roomPasscode,
      privacyMode: true,
    });
    const url = new URL(window.location.href);
    url.searchParams.set(SHARE_QUERY_KEY, token);
    showShareLinkPanel(url.toString());
    setStatus("Share link ready.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Share link could not be generated.", "error");
  }
}

function showShareLinkPanel(link) {
  shareLinkOutput.value = link;
  shareLinkPanel.hidden = false;
}

function hideShareLinkPanel() {
  shareLinkOutput.value = "";
  shareLinkPanel.hidden = true;
}

async function copyShareLink() {
  if (!shareLinkOutput.value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(shareLinkOutput.value);
    setStatus("Share link copied.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Copy failed. You can still copy the link manually.", "error");
  }
}

function syncStealthLayout() {
  document.body.classList.toggle(
    "stealth-active",
    state.isPrivacyEnabled && !state.isPrivacyPreviewVisible
  );
  document.body.classList.toggle(
    "preview-active",
    state.isPrivacyEnabled && state.isPrivacyPreviewVisible
  );
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

function getLatestReadableMessage() {
  if (!shouldAutoMarkAsRead() && !(state.isPrivacyEnabled && state.isPrivacyPreviewVisible)) {
    return null;
  }

  const visibleMessages = getVisibleMessages().filter((message) => message.createdAt?.toMillis);

  if (visibleMessages.length === 0) {
    return null;
  }

  return visibleMessages[visibleMessages.length - 1];
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
  queueReadReceiptSync();
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

function normalizeRoomCommands(commands = DEFAULT_ROOM_COMMANDS) {
  return {
    enable: normalizeCommandPhrase(commands.enable) || DEFAULT_ROOM_COMMANDS.enable,
    reveal: normalizeCommandPhrase(commands.reveal) || DEFAULT_ROOM_COMMANDS.reveal,
    disable: normalizeCommandPhrase(commands.disable) || DEFAULT_ROOM_COMMANDS.disable,
  };
}

function normalizeCommandPhrase(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function applyRoomCommandsToInputs(commands) {
  privacyCommandInput.value = commands?.enable || "";
  revealCommandInput.value = commands?.reveal || "";
  disableCommandInput.value = commands?.disable || "";
}

function matchesCommand(value, ...candidates) {
  return candidates.some((candidate) => normalizeCommandPhrase(candidate) === value);
}

function matchCommandWithOptionalCount(value, candidates) {
  const uniqueCandidates = [...new Set(candidates.map((candidate) => normalizeCommandPhrase(candidate)).filter(Boolean))];

  for (const candidate of uniqueCandidates) {
    const regex = new RegExp(`^${escapeRegExp(candidate)}(?:\\s+(\\d+))?$`);
    const match = value.match(regex);

    if (match) {
      return match;
    }
  }

  return null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRoomCommandsStorageKey(roomId) {
  const userId = state.profile?.id || state.authUser?.uid || "pending-auth";
  return `${LOCAL_ROOM_COMMANDS_KEY_PREFIX}:${userId}:${roomId}`;
}

function loadGroupRoomCommands(roomData) {
  return roomData?.commands && typeof roomData.commands === "object" ? roomData.commands : {};
}

function getEffectiveRoomCommands(roomId, groupCommands = {}) {
  return normalizeRoomCommands({
    ...groupCommands,
    ...loadRawLocalRoomCommands(roomId),
  });
}

function loadRawLocalRoomCommands(roomId) {
  if (!roomId) {
    return {};
  }

  const raw = localStorage.getItem(getRoomCommandsStorageKey(roomId));
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error(error);
    localStorage.removeItem(getRoomCommandsStorageKey(roomId));
    return {};
  }
}

function saveLocalRoomCommands(roomId, commands) {
  if (!roomId) {
    return;
  }

  const sanitizedCommands = stripEmptyCommandFields(commands);
  localStorage.setItem(
    getRoomCommandsStorageKey(roomId),
    JSON.stringify(sanitizedCommands)
  );
}

async function saveAdvancedSettings() {
  const rawCommands = {
    enable: normalizeCommandPhrase(privacyCommandInput.value),
    reveal: normalizeCommandPhrase(revealCommandInput.value),
    disable: normalizeCommandPhrase(disableCommandInput.value),
  };

  setAdvancedSettingsVisibility(false);

  try {
    if (commandScopeInput.value === GROUP_COMMAND_SCOPE) {
      await saveGroupRoomCommands(state.roomId, rawCommands);
      state.groupRoomCommands = rawCommands;
      localStorage.removeItem(getRoomCommandsStorageKey(state.roomId));
    } else {
      saveLocalRoomCommands(state.roomId, rawCommands);
    }

    state.roomCommands = getEffectiveRoomCommands(state.roomId, state.groupRoomCommands);
    persistSession();
    setStatus("Advanced settings saved.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Advanced settings could not be saved.", "error");
  }
}

async function saveGroupRoomCommands(roomId, commands) {
  if (!roomId) {
    return;
  }

  const roomRef = doc(state.db, "rooms", roomId);
  const sanitizedCommands = stripEmptyCommandFields(commands);
  await setDoc(
    roomRef,
    {
      commands: sanitizedCommands,
    },
    { merge: true }
  );
}

function handleCommandScopeChange() {
  populateAdvancedSettingsForScope(commandScopeInput.value);
}

function populateAdvancedSettingsForScope(scope, cachedCommands = null) {
  const localCommands = cachedCommands?.localCommands ?? loadRawLocalRoomCommands(state.roomId);
  const groupCommands = cachedCommands?.groupCommands ?? state.groupRoomCommands;

  if (scope === PERSONAL_COMMAND_SCOPE) {
    applyRoomCommandsToInputs(localCommands);
    return;
  }

  applyRoomCommandsToInputs(groupCommands);
}

function hasCustomCommands(commands) {
  return Boolean(
    normalizeCommandPhrase(commands?.enable) ||
      normalizeCommandPhrase(commands?.reveal) ||
      normalizeCommandPhrase(commands?.disable)
  );
}

function stripEmptyCommandFields(commands) {
  const sanitized = {};

  if (normalizeCommandPhrase(commands?.enable)) {
    sanitized.enable = normalizeCommandPhrase(commands.enable);
  }

  if (normalizeCommandPhrase(commands?.reveal)) {
    sanitized.reveal = normalizeCommandPhrase(commands.reveal);
  }

  if (normalizeCommandPhrase(commands?.disable)) {
    sanitized.disable = normalizeCommandPhrase(commands.disable);
  }

  return sanitized;
}

function setAdvancedSettingsVisibility(visible) {
  state.isAdvancedSettingsVisible = visible;
  advancedSettingsPanel.hidden = !visible;

  if (visible) {
    setAdvancedCommandVisibility(false);
    const localCommands = loadRawLocalRoomCommands(state.roomId);
    const groupCommands = state.groupRoomCommands;
    const initialScope = hasCustomCommands(localCommands)
      ? PERSONAL_COMMAND_SCOPE
      : GROUP_COMMAND_SCOPE;
    commandScopeInput.value = initialScope;
    populateAdvancedSettingsForScope(initialScope, {
      localCommands,
      groupCommands,
    });
    return;
  }

  clearRoomCommandInputs();
}

function clearRoomCommandInputs() {
  commandScopeInput.value = GROUP_COMMAND_SCOPE;
  privacyCommandInput.value = "";
  revealCommandInput.value = "";
  disableCommandInput.value = "";
}

function toggleAdvancedCommandVisibility() {
  setAdvancedCommandVisibility(!state.areAdvancedCommandsVisible);
}

function setAdvancedCommandVisibility(visible) {
  state.areAdvancedCommandsVisible = visible;
  const inputType = visible ? "text" : "password";

  privacyCommandInput.type = inputType;
  revealCommandInput.type = inputType;
  disableCommandInput.type = inputType;
  toggleCommandVisibilityButton.textContent = visible ? "Hide text" : "Show text";
}

async function hydrateFromSharedLink() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get(SHARE_QUERY_KEY);

  if (!token) {
    return false;
  }

  try {
    const invite = await decryptSharePayload(token);
    state.pendingInvitePrivacyMode = Boolean(invite.privacyMode);
    roomIdInput.value = invite.roomId || "";
    roomPasscodeInput.value = invite.roomPasscode || "";

    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.displayName) {
        displayNameInput.value = saved.displayName;
        state.profile = {
          id: state.authUser.uid,
          name: saved.displayName,
        };
      }
    }

    if (state.db && displayNameInput.value.trim() && invite.roomId) {
      const roomData = await ensureRoomAccess(invite.roomId, invite.roomPasscode || "");
      await connectToRoom(invite.roomId, invite.roomPasscode || "", roomData);
      if (state.pendingInvitePrivacyMode) {
        enablePrivacyMode();
        state.pendingInvitePrivacyMode = false;
      }
      persistSession();
    } else {
      setStatus("Invite loaded. Enter your name to join.", "success");
    }

    url.searchParams.delete(SHARE_QUERY_KEY);
    window.history.replaceState({}, "", url.toString());

    return true;
  } catch (error) {
    console.error(error);
    setStatus("The shared link is invalid or expired.", "error");
    return false;
  }
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
        id: state.authUser.uid,
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
    state.roomCommands = getEffectiveRoomCommands(saved.roomId);
    applyRoomCommandsToInputs(state.roomCommands);
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
      const roomData = await ensureRoomAccess(saved.roomId, saved.roomPasscode || "");
      await connectToRoom(saved.roomId, saved.roomPasscode || "", roomData);
      persistSession();
    }
  } catch (error) {
    console.error(error);
    localStorage.removeItem(SESSION_KEY);
  }
}

async function encryptSharePayload(payload) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getShareCryptoKey();
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    plaintext
  );

  const merged = new Uint8Array(iv.length + ciphertext.byteLength);
  merged.set(iv, 0);
  merged.set(new Uint8Array(ciphertext), iv.length);
  return toBase64Url(merged);
}

async function decryptSharePayload(token) {
  const bytes = fromBase64Url(token);
  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);
  const key = await getShareCryptoKey();
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    ciphertext
  );

  return JSON.parse(new TextDecoder().decode(plaintext));
}

async function getShareCryptoKey() {
  const secretBytes = new TextEncoder().encode(SHARE_SECRET);
  const digest = await crypto.subtle.digest("SHA-256", secretBytes);

  return crypto.subtle.importKey(
    "raw",
    digest,
    {
      name: "AES-GCM",
    },
    false,
    ["encrypt", "decrypt"]
  );
}

function toBase64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
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
