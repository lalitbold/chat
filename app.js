import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  linkWithPopup,
  linkWithRedirect,
  onAuthStateChanged,
  signOut,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  setDoc,
  updateDoc,
  where,
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
const openSettingsButton = document.getElementById("open-settings");
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
let commandSuggestions = document.getElementById("command-suggestions");
const toggleMessageMaskButton = document.getElementById("toggle-message-mask");
const sendButton = document.getElementById("send-button");
const saveAdvancedSettingsButton = document.getElementById("save-advanced-settings");
const closeAdvancedSettingsButton = document.getElementById("close-advanced-settings");
const notificationStatus = document.getElementById("notification-status");
const checkNotificationsButton = document.getElementById("check-notifications");
const toggleNotificationsButton = document.getElementById("toggle-notifications");
const testNotificationButton = document.getElementById("test-notification");
const logoutButton = document.getElementById("logout-account");
const DEFAULT_TITLE = "OpenBox";

const DEFAULT_ROOM_COMMANDS = {
  enable: "enableprivacy",
  reveal: "whatitis",
  disable: "letitroll",
};
const DEFAULT_REVEAL_ALIASES = new Set(["whatisit", "whatitis"]);
const ADVANCED_SETTINGS_COMMANDS = new Set(["advancesetting", "advancedsetting"]);
const GET_LINK_COMMAND = "getlink";
const TASK_COMMAND = "/task";
const DAY_COMMAND = "/day";
const TASK_LIST_LIMIT = 50;
const TASK_TIMER_REMINDER_MS = 25 * 60 * 1000;
const TASK_TIMER_REPEAT_REMINDER_MS = 5 * 60 * 1000;
const TASK_TIMER_MAX_UNANSWERED_REMINDERS = 2;
const DAY_IDLE_TASK_REMINDER_MS = 5 * 60 * 1000;
const BASE_SLASH_COMMANDS = [
  {
    label: "/task <description> #label",
    insertText: "/task ",
    hint: "Create task",
  },
  {
    label: "/task list",
    insertText: "/task list",
    hint: "Pending tasks",
  },
  {
    label: "/task complete <id>",
    insertText: "/task complete ",
    hint: "Complete task",
  },
  {
    label: "/task edit <id> <description> #label",
    insertText: "/task edit ",
    hint: "Edit task",
  },
  {
    label: "/task start [id]",
    insertText: "/task start ",
    hint: "Start timer",
  },
  {
    label: "/task stop [id]",
    insertText: "/task stop ",
    hint: "Stop timer",
  },
  {
    label: "/task continue [id]",
    insertText: "/task continue ",
    hint: "Continue timer",
  },
  {
    label: "/task summary",
    insertText: "/task summary",
    hint: "Today's summary",
  },
  {
    label: "/task summary share",
    insertText: "/task summary share",
    hint: "Share summary",
  },
  {
    label: "/day start",
    insertText: "/day start",
    hint: "Start day",
  },
  {
    label: "/day plan <plan>",
    insertText: "/day plan ",
    hint: "Save plan",
  },
  {
    label: "/day end",
    insertText: "/day end",
    hint: "End day",
  },
  {
    label: "/day leave tomorrow <reason>",
    insertText: "/day leave tomorrow ",
    hint: "Schedule leave",
  },
  {
    label: "/day leave list",
    insertText: "/day leave list",
    hint: "Your leaves",
  },
  {
    label: "/day leave cancel <id>",
    insertText: "/day leave cancel ",
    hint: "Cancel leave",
  },
  {
    label: "/task label <id> #label",
    insertText: "/task label ",
    hint: "Add label",
  },
  {
    label: "/task unlabel <id> #label",
    insertText: "/task unlabel ",
    hint: "Remove label",
  },
];
const PRIVACY_INVITE_COMMAND = "/privacy invite";
const PRIVACY_PREVIEW_MS = 10000;
const SESSION_KEY = "firestore-chat-session";
const MESSAGES_PAGE_SIZE = 25;
const LOCAL_ROOM_COMMANDS_KEY_PREFIX = "firestore-chat-room-commands";
const GROUP_COMMAND_SCOPE = "group";
const PERSONAL_COMMAND_SCOPE = "personal";
const SHARE_QUERY_KEY = "c";
const SHARE_SECRET = "firestore-chat-share-v1";
const READ_RECEIPT_SYNC_DELAY_MS = 1200;
const SESSION_PERSIST_DELAY_MS = 250;
const PRIVACY_FEATURE_CONFIG_COLLECTION = "appSettings";
const PRIVACY_FEATURE_CONFIG_ID = "privacyMode";
const NOTIFICATIONS_ENABLED_KEY = "openbox-notifications-enabled";

if (!commandSuggestions) {
  commandSuggestions = document.createElement("div");
  commandSuggestions.id = "command-suggestions";
  commandSuggestions.className = "command-suggestions";
  commandSuggestions.setAttribute("role", "listbox");
  commandSuggestions.setAttribute("aria-label", "Command suggestions");
  commandSuggestions.hidden = true;
  messageInput.parentElement.append(commandSuggestions);
}

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
  canUsePrivacyFeature: false,
  isClaimingPrivacyFeatureInvite: false,
  privacyFeatureMembers: [],
  privacyFeatureInvites: [],
  isMessageInputMasked: false,
  messageMaskRevealIndex: null,
  messageMaskRevealTimeoutId: null,
  messages: [],
  localMessages: [],
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
  unsubscribePrivacyFeatureConfig: null,
  unsubscribeRoom: null,
  unsubscribeReadReceipts: null,
  readReceipts: [],
  lastSyncedReadMessageId: null,
  pendingReadMessageId: null,
  readReceiptTimeoutId: null,
  sessionPersistTimeoutId: null,
  lastPersistedSession: "",
  pendingSessionPayload: "",
  commandSuggestionMatches: [],
  selectedCommandSuggestionIndex: 0,
  taskTimerReminderTimeouts: new Map(),
  dayIdleTaskReminderTimeoutId: null,
  isNotificationsEnabled: loadNotificationsEnabled(),
};

boot();

async function boot() {
  registerServiceWorker();
  updateDocumentTitle();
  updateAppBadge();
  clearRoomCommandInputs();
  updateNotificationSettingsUi();

  try {
    validateFirebaseConfig(firebaseConfig);
    const app = initializeApp(getRuntimeFirebaseConfig(firebaseConfig));
    state.db = getFirestore(app);
    state.auth = getAuth(app);
    state.authReady = initializeAuthSession();
    await state.authReady;
    const handledGoogleRedirect = await handleGoogleRedirectResult();
    await ensureAnonymousAuthSession();
    subscribeToPrivacyFeatureConfig();

    if (!handledGoogleRedirect) {
      setStatus("Connected. Create or join a room.", "success");
    }
  } catch (error) {
    console.error(error);
    setComposerState(false);

    if (isFirebaseAuthSetupError(error)) {
      state.authError = error;
      updateAuthUi();
      setStatus(
        "Guest sign-in is not enabled yet. Enable Authentication and the Anonymous provider.",
        "error"
      );
    } else {
      setStatus(
        "The app is not configured yet. Copy the example config to the local config file and add your project keys.",
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
  window.addEventListener("pagehide", flushPendingSessionPersist);
  document.addEventListener("visibilitychange", handleAttentionChange);
  messageInput.addEventListener("keydown", handleMessageInputKeydown);
  messageInput.addEventListener("input", handleMessageInputChange);
  messageInput.addEventListener("scroll", syncMessageMaskOverlayScroll);
  messageInput.addEventListener("blur", scheduleCommandAutocompleteHide);
  commandSuggestions.addEventListener("mousedown", handleCommandSuggestionMouseDown);
  messagesContainer.addEventListener("click", handleMessageActionClick);
  messagesContainer.addEventListener("scroll", handleMessageListScroll);
  toggleMessageMaskButton.addEventListener("click", toggleMessageInputMask);
  openSettingsButton.addEventListener("click", () => setAdvancedSettingsVisibility(true));
  saveAdvancedSettingsButton.addEventListener("click", saveAdvancedSettings);
  closeAdvancedSettingsButton.addEventListener("click", () => setAdvancedSettingsVisibility(false));
  checkNotificationsButton.addEventListener("click", checkNotificationStatus);
  toggleNotificationsButton.addEventListener("click", toggleNotifications);
  testNotificationButton.addEventListener("click", testNotification);
  logoutButton.addEventListener("click", logoutAccount);
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
      setStatus("Add your app config before joining a room.", "error");
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
        setStatus("We couldn't join that room. Check access rules and try again.", "error");
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

    messageInput.value = "";
    syncMessageMaskOverlay();
    hideCommandAutocomplete();
    messageInput.focus();
    void sendSubmittedText(text);
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

  updatePrivacyFeatureAccess();

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
  setStatus("Opening Google sign-in...", "success");
  await linkWithRedirect(state.authUser, provider);
}

async function startGoogleRedirectSignIn(provider = new GoogleAuthProvider()) {
  sessionStorage.setItem("firestore-chat-google-redirect-mode", "signin");
  setStatus("Opening Google sign-in...", "success");
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
      setStatus("Google sign-in did not complete. Try Link Google again.", "error");
      return true;
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
    authStatus.textContent = "Guest sign-in is not configured.";
    linkGoogleButton.disabled = true;
    return;
  }

  if (state.authError) {
    authStatus.textContent = isFirebaseAuthSetupError(state.authError)
      ? "Enable Authentication and Anonymous sign-in."
      : "Guest sign-in could not start.";
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

  if (error?.code === "auth/redirect-cancelled-by-user") {
    return "Google sign-in was cancelled before it completed.";
  }

  if (error?.code === "auth/unauthorized-domain") {
    return "Add this domain to the authorized domains.";
  }

  if (error?.code === "auth/operation-not-allowed") {
    return "Enable the Google sign-in provider.";
  }

  if (error?.code === "auth/network-request-failed") {
    return "Google sign-in could not connect. Check your connection and try again.";
  }

  if (isFirebaseAuthSetupError(error)) {
    return "Enable Authentication, Anonymous sign-in, and Google sign-in.";
  }

  return `Google linking failed${error?.code ? ` (${error.code})` : ""}.`;
}

function getPrivacyFeatureConfigRef() {
  return doc(state.db, PRIVACY_FEATURE_CONFIG_COLLECTION, PRIVACY_FEATURE_CONFIG_ID);
}

function subscribeToPrivacyFeatureConfig() {
  if (!state.db) {
    return;
  }

  if (state.unsubscribePrivacyFeatureConfig) {
    state.unsubscribePrivacyFeatureConfig();
  }

  state.unsubscribePrivacyFeatureConfig = onSnapshot(
    getPrivacyFeatureConfigRef(),
    async (snapshot) => {
      if (!snapshot.exists()) {
        try {
          await setDoc(
            getPrivacyFeatureConfigRef(),
            {
              privacyFeatureMembers: [],
              privacyFeatureInvites: [],
            },
            { merge: true }
          );
        } catch (error) {
          console.error(error);
        }

        state.privacyFeatureMembers = [];
        state.privacyFeatureInvites = [];
        updatePrivacyFeatureAccess();
        return;
      }

      const data = snapshot.data();
      state.privacyFeatureMembers = Array.isArray(data.privacyFeatureMembers) ? data.privacyFeatureMembers : [];
      state.privacyFeatureInvites = Array.isArray(data.privacyFeatureInvites) ? data.privacyFeatureInvites : [];
      updatePrivacyFeatureAccess();
    },
    (error) => {
      console.error(error);
      setStatus("Privacy feature settings stopped updating. Verify your access rules.", "error");
    }
  );
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
  applyRoomData(roomData);
  state.isAdvancedSettingsVisible = false;
  state.hasHydratedRoom = false;
  state.messages = [];
  state.localMessages = [];
  state.oldestMessageCursor = null;
  state.hasMoreMessages = true;
  state.isLoadingOlderMessages = false;
  activeRoom.textContent = roomId;
  leaveRoomButton.disabled = false;
  setComposerState(true);
  if (state.isPrivacyEnabled) {
    setMessageInputMasked(true);
  } else {
    syncMessageInputMask();
  }
  setStatus(`Connected to room "${roomId}".`, "success");
  hideShareLinkPanel();
  renderEmptyState("No messages yet. Say hello.");
  applyRoomCommandsToInputs({});
  setAdvancedSettingsVisibility(false);

  await loadInitialMessages(roomId);
  subscribeToRoom(roomId);
  subscribeToReadReceipts(roomId);
  subscribeToLatestMessages(roomId);
  queueReadReceiptSync();
  scheduleDayIdleTaskReminder();
  void announceTodaysLeaves();
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

function subscribeToRoom(roomId) {
  const roomRef = doc(state.db, "rooms", roomId);

  state.unsubscribeRoom = onSnapshot(
    roomRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      applyRoomData(snapshot.data());
    },
    (error) => {
      console.error(error);
      setStatus("Room settings stopped updating. Verify your access rules.", "error");
    }
  );
}

function applyRoomData(roomData = {}) {
  state.groupRoomCommands = loadGroupRoomCommands(roomData);
  state.roomCommands = getEffectiveRoomCommands(state.roomId, state.groupRoomCommands);
  updatePrivacyFeatureAccess();
}

function updatePrivacyFeatureAccess() {
  const hadAccess = state.canUsePrivacyFeature;
  const profileIdentifiers = getPrivacyFeatureIdentifiers();
  const isMember = Boolean(state.profile?.id && state.privacyFeatureMembers.includes(state.profile.id));
  const invitedIdentifier =
    profileIdentifiers.find((identifier) => state.privacyFeatureInvites.includes(identifier)) || null;

  state.canUsePrivacyFeature = isMember || Boolean(invitedIdentifier);

  if (invitedIdentifier && !isMember) {
    void claimPrivacyFeatureInvite(invitedIdentifier);
  }

  if (!state.canUsePrivacyFeature && state.isPrivacyEnabled) {
    disablePrivacyMode();
  }

  if (state.canUsePrivacyFeature !== hadAccess && messageInput.value.trimStart().startsWith("/")) {
    updateCommandAutocomplete();
  }
}

async function claimPrivacyFeatureInvite(invitedIdentifier) {
  if (
    !state.db ||
    !state.profile?.id ||
    !invitedIdentifier ||
    state.isClaimingPrivacyFeatureInvite
  ) {
    return;
  }

  state.isClaimingPrivacyFeatureInvite = true;

  try {
    await setDoc(getPrivacyFeatureConfigRef(), {
      privacyFeatureMembers: arrayUnion(state.profile.id),
      privacyFeatureInvites: arrayRemove(invitedIdentifier),
    }, { merge: true });
  } catch (error) {
    console.error(error);
  } finally {
    state.isClaimingPrivacyFeatureInvite = false;
  }
}

async function invitePrivacyFeatureUser(rawIdentifier) {
  if (!state.db) {
    return;
  }

  if (!state.canUsePrivacyFeature) {
    setStatus("Privacy mode needs to be unlocked for you before you can invite others.", "error");
    return;
  }

  const normalizedIdentifier = normalizeProfileName(rawIdentifier);

  if (!normalizedIdentifier) {
    setStatus("Use /privacy invite <name-or-email>.", "error");
    return;
  }

  try {
    await setDoc(getPrivacyFeatureConfigRef(), {
      privacyFeatureInvites: arrayUnion(normalizedIdentifier),
    }, { merge: true });
    setStatus(`Privacy mode invited for "${rawIdentifier.trim()}".`, "success");
  } catch (error) {
    console.error(error);
    setStatus("Privacy invite could not be saved.", "error");
  }
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
      setStatus("Live updates stopped. Verify your indexes and access rules.", "error");
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
  if (state.unsubscribeRoom) {
    state.unsubscribeRoom();
    state.unsubscribeRoom = null;
  }

  if (state.unsubscribeMessages) {
    state.unsubscribeMessages();
    state.unsubscribeMessages = null;
  }

  if (state.unsubscribeReadReceipts) {
    state.unsubscribeReadReceipts();
    state.unsubscribeReadReceipts = null;
  }

  clearReadReceiptTimer();
  clearSessionPersistTimer();
  clearTaskTimerReminders();
  clearDayIdleTaskReminder();
  clearMessageMaskRevealTimer();
  clearPrivacyPreviewTimer();
  state.roomId = null;
  state.roomPasscode = "";
  state.roomCommands = { ...DEFAULT_ROOM_COMMANDS };
  state.groupRoomCommands = {};
  state.isAdvancedSettingsVisible = false;
  state.pendingInvitePrivacyMode = false;
  state.isClaimingPrivacyFeatureInvite = false;
  state.hasHydratedRoom = false;
  state.messages = [];
  state.localMessages = [];
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
    state.pendingSessionPayload = "";
    state.lastPersistedSession = "";
    localStorage.removeItem(SESSION_KEY);
    setStatus("You left the room.", "success");
  } else {
    persistSession();
  }
}

function renderMessage(message, context = {}) {
  const wrapper = document.createElement("article");
  wrapper.className = "message";

  if (message.isLocalOnly) {
    wrapper.classList.add("local-only");
  }

  if (message.type) {
    wrapper.classList.add(`message-${message.type}`);
  }

  if (!message.isLocalOnly && message.senderId === state.profile?.id) {
    wrapper.classList.add("own");
  }

  const meta = document.createElement("div");
  meta.className = "message-meta";

  const sender = document.createElement("strong");
  sender.textContent = getDisplaySenderName(message, context);

  const timestamp = document.createElement("span");
  timestamp.textContent = formatTimestamp(message.createdAt);

  meta.append(sender, timestamp);
  wrapper.append(meta);

  if (message.type === "task-list" && Array.isArray(message.tasks)) {
    wrapper.append(renderTaskListMessage(message));
  } else {
    const body = document.createElement("p");
    body.className = "message-text";
    body.textContent = message.text;
    wrapper.append(body);
  }

  if (message.isLocalOnly && Array.isArray(message.actions) && message.actions.length > 0) {
    const actions = document.createElement("div");
    actions.className = "message-actions";

    message.actions.forEach((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "message-action";
      button.textContent = action.label;
      button.dataset.action = action.action;

      if (action.taskId) {
        button.dataset.taskId = action.taskId;
      }

      actions.append(button);
    });

    wrapper.append(actions);
  }

  if (!message.isLocalOnly && message.senderId === state.profile?.id) {
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

  const messagesToRender = getVisibleMessagesWithLocal();
  const renderContext = createRenderContext(messagesToRender);

  if (messagesToRender.length === 0) {
    renderEmptyState("No messages yet. Say hello.");
    return;
  }

  const fragment = document.createDocumentFragment();

  messagesToRender.forEach((message) => {
    fragment.appendChild(renderMessage(message, renderContext));
  });

  messagesContainer.replaceChildren(fragment);

  if (options.preserveScroll) {
    messagesContainer.scrollTop =
      messagesContainer.scrollHeight - options.previousScrollHeight + options.previousScrollTop;
    return;
  }

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function renderTaskListMessage(message) {
  const container = document.createElement("div");
  container.className = "task-list-message";

  const header = document.createElement("div");
  header.className = "task-list-header";

  const title = document.createElement("strong");
  title.textContent = message.heading || "Pending tasks";

  const count = document.createElement("span");
  count.className = "task-list-count";
  count.textContent = `${message.tasks.length} task${message.tasks.length === 1 ? "" : "s"}`;

  header.append(title, count);
  container.append(header);

  const list = document.createElement("ol");
  list.className = "task-list";

  message.tasks.forEach((task) => {
    list.append(renderTaskListItem(task, { maskIdentity: Boolean(message.maskIdentity) }));
  });

  container.append(list);

  const footer = document.createElement("div");
  footer.className = "task-list-footer";
  footer.textContent = `Total: ${message.tasks.length} task${message.tasks.length === 1 ? "" : "s"}`;
  container.append(footer);

  return container;
}

function renderTaskListItem(task, options = {}) {
  const maskIdentity = Boolean(options.maskIdentity);
  const item = document.createElement("li");
  item.className = "task-list-item";

  const main = document.createElement("div");
  main.className = "task-list-main";

  const id = document.createElement("span");
  id.className = "task-list-id";
  id.textContent = formatTaskId(task.id);
  id.title = task.id;

  const title = document.createElement("span");
  title.className = "task-list-title";
  title.textContent = task.description || "Untitled task";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "task-list-edit";
  editButton.textContent = "Edit";
  editButton.dataset.action = "task-edit-draft";
  editButton.dataset.taskId = task.id;
  editButton.dataset.taskDescription = task.description || "";

  main.append(id, title, editButton);

  const meta = document.createElement("div");
  meta.className = "task-list-item-meta";

  if (!maskIdentity) {
    const creator = document.createElement("span");
    creator.textContent = task.createdByName || "Unknown";
    meta.append(creator);
  }

  const createdAt = document.createElement("span");
  createdAt.textContent = maskIdentity
    ? `Created ${formatTaskTimestamp(task.createdAt)}`
    : formatTaskTimestamp(task.createdAt);
  meta.append(createdAt);

  const totalTrackedMs = Number.isFinite(task.totalTrackedMs) ? task.totalTrackedMs : 0;
  const activeMs = task.activeTimerStartedAt
    ? Math.max(0, Date.now() - getTimestampMillis(task.activeTimerStartedAt))
    : 0;
  const totalMs = totalTrackedMs + activeMs;

  if (totalMs > 0) {
    const tracked = document.createElement("span");
    tracked.className = "task-list-badge";
    tracked.textContent = `Tracked ${formatDuration(totalMs)}`;
    meta.append(tracked);
  }

  if (task.activeTimerStartedAt) {
    const running = document.createElement("span");
    running.className = "task-list-badge running";
    running.textContent = maskIdentity
      ? "Running"
      : `Running by ${task.activeTimerStartedByName || "someone"}`;
    meta.append(running);
  }

  item.append(main, meta);

  if (Array.isArray(task.labels) && task.labels.length > 0) {
    const labels = document.createElement("div");
    labels.className = "task-list-labels";

    task.labels.forEach((label) => {
      const chip = document.createElement("span");
      chip.className = "task-label";
      chip.textContent = `#${label}`;
      labels.append(chip);
    });

    item.append(labels);
  }

  return item;
}

function handleMessageActionClick(event) {
  const actionButton = event.target.closest("[data-action]");

  if (!actionButton || !messagesContainer.contains(actionButton)) {
    return;
  }

  if (actionButton.dataset.action === "task-continue") {
    actionButton.disabled = true;
    void continueTaskTimer(actionButton.dataset.taskId || "");
  }

  if (actionButton.dataset.action === "task-complete") {
    actionButton.disabled = true;
    void completeTask(actionButton.dataset.taskId || "");
  }

  if (actionButton.dataset.action === "task-edit-draft") {
    draftTaskEdit(actionButton.dataset.taskId || "", actionButton.dataset.taskDescription || "");
  }

  if (actionButton.dataset.action === "task-stop") {
    actionButton.disabled = true;
    void stopTaskTimer(actionButton.dataset.taskId || "");
  }

  if (actionButton.dataset.action === "general-timer-continue") {
    actionButton.disabled = true;
    void continueGeneralTimer();
  }

  if (actionButton.dataset.action === "general-timer-stop") {
    actionButton.disabled = true;
    void stopGeneralTimer();
  }
}

function renderEmptyState(message) {
  const placeholder = document.createElement("div");
  placeholder.className = "empty-state";
  placeholder.textContent = message;
  messagesContainer.replaceChildren(placeholder);
}

function renderPrivacyState() {
  if (state.localMessages.length > 0) {
    const renderContext = createRenderContext(state.localMessages);
    const fragment = document.createDocumentFragment();

    state.localMessages.forEach((message) => {
      fragment.appendChild(renderMessage(message, renderContext));
    });

    messagesContainer.replaceChildren(fragment);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return;
  }

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
  setMessageInputMasked(!state.isMessageInputMasked);
}

function setMessageInputMasked(masked) {
  state.isMessageInputMasked = masked;
  if (!masked) {
    clearMessageMaskRevealTimer();
  }
  syncMessageInputMask();
}

function syncMessageInputMask() {
  messageInput.classList.toggle("masked", state.isMessageInputMasked);
  toggleMessageMaskButton.textContent =
    state.isMessageInputMasked && state.isPrivacyEnabled ? "Normal text" :
      state.isMessageInputMasked ? "Show text" : "Mask text";
  syncMessageMaskOverlay();
}

function syncMessageMaskOverlay() {
  messageMaskOverlay.textContent = getMaskedOverlayText();
  syncMessageMaskOverlayScroll();
}

function syncMessageMaskOverlayScroll() {
  messageMaskOverlay.scrollTop = messageInput.scrollTop;
  messageMaskOverlay.scrollLeft = messageInput.scrollLeft;
}

function getMaskedOverlayText() {
  if (shouldKeepMessageTextVisible(messageInput.value)) {
    return messageInput.value;
  }

  const characters = Array.from(messageInput.value);

  return characters
    .map((character, index) => {
      if (character === "\n") {
        return "\n";
      }

      if (index === state.messageMaskRevealIndex) {
        return character;
      }

      return "*";
    })
    .join("");
}

function shouldKeepMessageTextVisible(value) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  const roomCommands = getEffectiveRoomCommands(state.roomId, state.groupRoomCommands);
  const normalizedWithoutSlash = normalized.startsWith("/") ? normalized.slice(1) : normalized;

  if (normalized.startsWith("/")) {
    return true;
  }

  if (ADVANCED_SETTINGS_COMMANDS.has(normalized)) {
    return true;
  }

  if (normalized === GET_LINK_COMMAND) {
    return true;
  }

  if (matchesCommand(normalizedWithoutSlash, DEFAULT_ROOM_COMMANDS.enable, roomCommands.enable)) {
    return true;
  }

  if (
    matchCommandWithOptionalCount(normalized, [
      DEFAULT_ROOM_COMMANDS.disable,
      roomCommands.disable,
      `/${DEFAULT_ROOM_COMMANDS.disable}`,
      `/${roomCommands.disable}`,
      ...DEFAULT_REVEAL_ALIASES,
      roomCommands.reveal,
      ...Array.from(DEFAULT_REVEAL_ALIASES, (command) => `/${command}`),
      `/${roomCommands.reveal}`,
    ])
  ) {
    return true;
  }

  return false;
}

function handleMessageInputChange(event) {
  maybeRevealLatestMaskedCharacter(event);
  syncMessageMaskOverlay();
  updateCommandAutocomplete();
}

function maybeRevealLatestMaskedCharacter(event) {
  if (!state.isMessageInputMasked || !state.isPrivacyEnabled) {
    clearMessageMaskRevealTimer();
    return;
  }

  if (!event?.inputType?.startsWith("insert")) {
    clearMessageMaskRevealTimer();
    return;
  }

  const revealIndex = (messageInput.selectionStart ?? 0) - 1;
  const insertedCharacter = messageInput.value[revealIndex];

  if (revealIndex < 0 || !insertedCharacter || insertedCharacter === "\n") {
    clearMessageMaskRevealTimer();
    return;
  }

  state.messageMaskRevealIndex = revealIndex;
  clearMessageMaskRevealTimer(false);
  state.messageMaskRevealTimeoutId = window.setTimeout(() => {
    state.messageMaskRevealTimeoutId = null;
    state.messageMaskRevealIndex = null;
    syncMessageMaskOverlay();
  }, 350);
}

function clearMessageMaskRevealTimer(resetRevealIndex = true) {
  if (state.messageMaskRevealTimeoutId) {
    window.clearTimeout(state.messageMaskRevealTimeoutId);
    state.messageMaskRevealTimeoutId = null;
  }

  if (resetRevealIndex) {
    state.messageMaskRevealIndex = null;
  }
}

function handleMessageInputKeydown(event) {
  if (handleCommandAutocompleteKeydown(event)) {
    return;
  }

  if (event.key !== "Enter" || event.shiftKey) {
    return;
  }

  event.preventDefault();

  if (!messageInput.disabled) {
    messageForm.requestSubmit();
  }
}

async function sendSubmittedText(text) {
  try {
    if (isTaskCommand(text)) {
      await handleTaskCommand(text);
      return;
    }

    if (isDayCommand(text)) {
      await handleDayCommand(text);
      return;
    }

    await addDoc(collection(state.db, "rooms", state.roomId, "messages"), {
      text,
      senderId: state.profile.id,
      senderName: state.profile.name,
      createdAt: serverTimestamp(),
    });

    if (state.isPrivacyEnabled && state.isPrivacyPreviewVisible) {
      hidePrivacyPreview();
    }
  } catch (error) {
    console.error(error);
    setStatus(
      isTaskCommand(text)
        ? "Task command failed. Check the command and room permissions."
        : isDayCommand(text)
          ? "Day command failed. Check the command and room permissions."
        : "Message send failed. Check room permissions.",
      "error"
    );
  }
}

function updateCommandAutocomplete() {
  const matches = getCommandAutocompleteMatches(messageInput.value);
  state.commandSuggestionMatches = matches;
  state.selectedCommandSuggestionIndex = 0;

  if (matches.length === 0) {
    hideCommandAutocomplete();
    return;
  }

  renderCommandAutocomplete();
}

function getCommandAutocompleteMatches(value) {
  const queryText = value.trimStart();
  const query = queryText.toLowerCase();

  if (!query.startsWith("/") || query.includes("\n")) {
    return [];
  }

  return getAvailableSlashCommands().filter((command) => {
    const label = command.label.toLowerCase();
    const insertText = command.insertText.toLowerCase();
    return label.startsWith(query) || insertText.startsWith(query);
  }).slice(0, 5);
}

function getAvailableSlashCommands() {
  const commands = [...BASE_SLASH_COMMANDS];

  if (state.canUsePrivacyFeature) {
    const roomCommands = getEffectiveRoomCommands(state.roomId, state.groupRoomCommands);
    const privacyCommands = [
      {
        label: `/${roomCommands.enable}`,
        insertText: `/${roomCommands.enable}`,
        hint: "Enable privacy",
      },
      {
        label: `${PRIVACY_INVITE_COMMAND} <name-or-email>`,
        insertText: `${PRIVACY_INVITE_COMMAND} `,
        hint: "Grant privacy",
      },
    ];

    commands.unshift(
      ...privacyCommands.filter((command) => {
        if (command.insertText === `/${roomCommands.enable}`) {
          return !state.isPrivacyEnabled;
        }

        return true;
      })
    );
  }

  return commands;
}

function renderCommandAutocomplete() {
  const fragment = document.createDocumentFragment();

  state.commandSuggestionMatches.forEach((command, index) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "command-suggestion";
    option.classList.toggle("active", index === state.selectedCommandSuggestionIndex);
    option.dataset.commandIndex = String(index);
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", index === state.selectedCommandSuggestionIndex ? "true" : "false");

    const commandText = document.createElement("span");
    commandText.className = "command-suggestion-command";
    commandText.textContent = command.label;

    const hint = document.createElement("span");
    hint.className = "command-suggestion-hint";
    hint.textContent = command.hint;

    option.append(commandText, hint);
    fragment.append(option);
  });

  commandSuggestions.replaceChildren(fragment);
  commandSuggestions.hidden = false;
}

function hideCommandAutocomplete() {
  state.commandSuggestionMatches = [];
  state.selectedCommandSuggestionIndex = 0;
  commandSuggestions.hidden = true;
  commandSuggestions.replaceChildren();
}

function scheduleCommandAutocompleteHide() {
  window.setTimeout(() => {
    if (document.activeElement !== messageInput) {
      hideCommandAutocomplete();
    }
  }, 120);
}

function handleCommandAutocompleteKeydown(event) {
  if (commandSuggestions.hidden || state.commandSuggestionMatches.length === 0) {
    return false;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    state.selectedCommandSuggestionIndex =
      (state.selectedCommandSuggestionIndex + 1) % state.commandSuggestionMatches.length;
    renderCommandAutocomplete();
    return true;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    state.selectedCommandSuggestionIndex =
      (state.selectedCommandSuggestionIndex - 1 + state.commandSuggestionMatches.length) %
      state.commandSuggestionMatches.length;
    renderCommandAutocomplete();
    return true;
  }

  if (event.key === "Tab" || event.key === "Enter") {
    event.preventDefault();
    applyCommandSuggestion(state.selectedCommandSuggestionIndex);
    return true;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    hideCommandAutocomplete();
    return true;
  }

  return false;
}

function handleCommandSuggestionMouseDown(event) {
  const option = event.target.closest(".command-suggestion");

  if (!option) {
    return;
  }

  event.preventDefault();
  applyCommandSuggestion(Number.parseInt(option.dataset.commandIndex, 10));
}

function applyCommandSuggestion(index) {
  const command = state.commandSuggestionMatches[index];

  if (!command) {
    return;
  }

  messageInput.value = command.insertText;
  syncMessageMaskOverlay();
  hideCommandAutocomplete();
  messageInput.focus();
  messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
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
  const normalizedWithoutSlash = normalized.startsWith("/") ? normalized.slice(1) : normalized;
  const roomCommands = getEffectiveRoomCommands(state.roomId, state.groupRoomCommands);
  state.roomCommands = roomCommands;
  const disableMatch = matchCommandWithOptionalCount(normalized, [
    DEFAULT_ROOM_COMMANDS.disable,
    roomCommands.disable,
    `/${DEFAULT_ROOM_COMMANDS.disable}`,
    `/${roomCommands.disable}`,
  ]);
  const revealMatch = matchCommandWithOptionalCount(normalized, [
    ...DEFAULT_REVEAL_ALIASES,
    roomCommands.reveal,
    ...Array.from(DEFAULT_REVEAL_ALIASES, (command) => `/${command}`),
    `/${roomCommands.reveal}`,
  ]);

  if (normalized === PRIVACY_INVITE_COMMAND || normalized.startsWith(`${PRIVACY_INVITE_COMMAND} `)) {
    void invitePrivacyFeatureUser(text.trim().slice(PRIVACY_INVITE_COMMAND.length).trim());
    return true;
  }

  if (matchesCommand(normalizedWithoutSlash, DEFAULT_ROOM_COMMANDS.enable, roomCommands.enable)) {
    if (!state.canUsePrivacyFeature) {
      setStatus("Privacy mode needs to be invited for this account before it can be used here.", "error");
      return true;
    }

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
    if (!state.canUsePrivacyFeature) {
      setStatus("Privacy mode needs to be invited for this account before it can be used here.", "error");
      return true;
    }

    const requestedCount = disableMatch[1] ? Number.parseInt(disableMatch[1], 10) : null;
    disablePrivacyMode(requestedCount);
    return true;
  }

  if (revealMatch) {
    if (!state.canUsePrivacyFeature) {
      setStatus("Privacy mode needs to be invited for this account before it can be used here.", "error");
      return true;
    }

    const requestedCount = revealMatch[1] ? Number.parseInt(revealMatch[1], 10) : null;
    revealPrivacyTemporarily(requestedCount);
    return true;
  }

  return false;
}

function isTaskCommand(text) {
  const normalized = text.trim().toLowerCase();
  return normalized === TASK_COMMAND || normalized.startsWith(`${TASK_COMMAND} `);
}

function isDayCommand(text) {
  const normalized = text.trim().toLowerCase();
  return normalized === DAY_COMMAND || normalized.startsWith(`${DAY_COMMAND} `);
}

async function handleTaskCommand(text) {
  const rawCommand = text.trim();
  const payload = rawCommand.slice(TASK_COMMAND.length).trim();
  const [action = "", ...rest] = payload.split(/\s+/);
  const normalizedAction = action.toLowerCase();

  if (!payload || normalizedAction === "help") {
    await postTaskMessage(
      "Task commands:\n/task fix that issue #bug\n/task list\n/task list #bug\n/task edit <id> <description> #label\n/task start\n/task start <id>\n/task stop\n/task stop <id>\n/task continue\n/task continue <id>\n/task summary\n/task summary share\n/task complete <id>\n/task label <id> #bug\n/task unlabel <id> #bug\nUse /day for attendance and leave commands."
    );
    return;
  }

  if (normalizedAction === "list") {
    await postTaskList(rest.join(" "));
    return;
  }

  if (normalizedAction === "complete") {
    const taskId = rest.join(" ").trim();
    await completeTask(taskId);
    return;
  }

  if (normalizedAction === "edit") {
    await editTask(rest.join(" "));
    return;
  }

  if (normalizedAction === "start") {
    const taskId = rest.join(" ").trim();
    await startTaskTimer(taskId);
    return;
  }

  if (normalizedAction === "stop") {
    const taskId = rest.join(" ").trim();
    await stopTaskTimer(taskId);
    return;
  }

  if (normalizedAction === "continue") {
    const taskId = rest.join(" ").trim();
    await continueTaskTimer(taskId);
    return;
  }

  if (normalizedAction === "summary") {
    await postTaskSummary(rest.join(" "));
    return;
  }

  if (normalizedAction === "day") {
    postLocalDayMessage("Day commands moved to /day.\nUse /day start, /day plan <plan>, or /day end.");
    return;
  }

  if (normalizedAction === "label") {
    await updateTaskLabels(rest.join(" "), "add");
    return;
  }

  if (normalizedAction === "unlabel") {
    await updateTaskLabels(rest.join(" "), "remove");
    return;
  }

  await createTask(payload);
}

async function handleDayCommand(text) {
  const rawCommand = text.trim();
  const payload = rawCommand.slice(DAY_COMMAND.length).trim();
  const [action = "", ...rest] = payload.split(/\s+/);
  const normalizedAction = action.toLowerCase();

  if (!payload || normalizedAction === "help") {
    postLocalDayMessage(
      "Day commands:\n/day start\n/day plan <plan>\n/day end\n/day leave <date-or-range> <reason>\n/day leave list\n/day leave cancel <id>"
    );
    return;
  }

  if (normalizedAction === "start") {
    await startWorkDay();
    return;
  }

  if (normalizedAction === "plan") {
    await saveWorkDayPlan(rest.join(" "));
    return;
  }

  if (normalizedAction === "end") {
    await endWorkDay();
    return;
  }

  if (normalizedAction === "leave") {
    await handleLeaveCommand(rest.join(" "));
    return;
  }

  postLocalDayMessage(`Unknown day command: /day ${payload}`);
}

async function createTask(description) {
  const { text: trimmedDescription, labels } = extractLabels(description);

  if (!trimmedDescription) {
    await postTaskMessage("Add a task description after /task.");
    return;
  }

  const taskRef = await addDoc(collection(state.db, "rooms", state.roomId, "tasks"), {
    description: trimmedDescription,
    labels,
    status: "pending",
    createdAt: serverTimestamp(),
    createdBy: state.profile.id,
    createdByName: state.profile.name,
    completedAt: null,
    completedBy: null,
    completedByName: null,
    totalTrackedMs: 0,
    activeTimerStartedAt: null,
    activeTimerStartedBy: null,
    activeTimerStartedByName: null,
  });

  await postTaskMessage(
    `Task ${formatTaskId(taskRef.id)} created: ${trimmedDescription}${formatTaskLabels(labels)}`
  );
  setStatus("Task created.", "success");
}

async function postTaskList(filterText = "") {
  const requestedLabels = parseLabels(filterText);
  const pendingTasks = (await loadPendingRoomTasks())
    .filter((task) => taskHasLabels(task, requestedLabels))
    .sort(compareTasksByCreatedAt)
    .slice(0, TASK_LIST_LIMIT);

  if (pendingTasks.length === 0) {
    postLocalTaskMessage(
      requestedLabels.length > 0
        ? `No pending tasks with ${formatTaskLabels(requestedLabels).trim()}.`
        : "No pending tasks."
    );
    setStatus("No pending tasks.", "success");
    return;
  }

  const maskIdentity = isPrivacyModeActive();
  const taskLines = pendingTasks.map((task) => {
    const createdAt = formatTaskTimestamp(task.createdAt);
    const createdBy = task.createdByName || "Unknown";
    const metadata = maskIdentity ? `created ${createdAt}` : `${createdBy}, ${createdAt}`;
    return `${formatTaskId(task.id)} - ${task.description}${formatTaskLabels(task.labels)}${formatTaskTimeSummary(task, { maskIdentity })} (${metadata})`;
  });

  const heading =
    requestedLabels.length > 0
      ? `Pending tasks ${formatTaskLabels(requestedLabels).trim()}:`
      : "Pending tasks:";
  const totalLine = `Total: ${pendingTasks.length} task${pendingTasks.length === 1 ? "" : "s"}`;
  postLocalTaskListMessage(
    heading.replace(/:$/, ""),
    pendingTasks,
    `${heading}\n${taskLines.join("\n")}\n${totalLine}`
  );
  setStatus(`${pendingTasks.length} pending task${pendingTasks.length === 1 ? "" : "s"} listed.`, "success");
}

async function completeTask(taskIdInput) {
  const taskId = taskIdInput.trim();

  if (!taskId) {
    await postTaskMessage("Use /task complete <id> to complete a task.");
    return;
  }

  const task = await findTaskById(taskId);

  if (!task) {
    await postTaskMessage(`Task ${taskId} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  if (task.status === "complete") {
    await postTaskMessage(`Task ${formatTaskId(task.id)} is already complete.`);
    setStatus("Task is already complete.", "success");
    return;
  }

  const completionUpdate = {
    status: "complete",
    completedAt: serverTimestamp(),
    completedBy: state.profile.id,
    completedByName: state.profile.name,
  };
  const timerElapsedMs = task.activeTimerStartedAt
    ? Math.max(0, Date.now() - getTimestampMillis(task.activeTimerStartedAt))
    : 0;

  if (task.activeTimerStartedAt) {
    completionUpdate.totalTrackedMs = increment(timerElapsedMs);
    completionUpdate.activeTimerStartedAt = null;
    completionUpdate.activeTimerStartedBy = null;
    completionUpdate.activeTimerStartedByName = null;
    clearTaskTimerReminder(task.id);
  }

  await updateDoc(doc(state.db, "rooms", state.roomId, "tasks", task.id), completionUpdate);

  if (timerElapsedMs > 0) {
    await recordTaskTimeEntry(task, task.activeTimerStartedAt, new Date(), timerElapsedMs);
  }

  await postTaskMessage(
    `Task ${formatTaskId(task.id)} completed${timerElapsedMs > 0 ? ` and timer stopped after ${formatDuration(timerElapsedMs)}` : ""}: ${task.description}`
  );
  scheduleDayIdleTaskReminder();
  setStatus("Task completed.", "success");
}

async function editTask(input) {
  const [taskId = "", ...descriptionParts] = input.trim().split(/\s+/);
  const descriptionInput = descriptionParts.join(" ");

  if (!taskId || !descriptionInput.trim()) {
    await postTaskMessage("Use /task edit <id> <description> #label.");
    return;
  }

  const task = await findTaskById(taskId);

  if (!task) {
    await postTaskMessage(`Task ${taskId} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  const { text: trimmedDescription, labels } = extractLabels(descriptionInput);

  if (!trimmedDescription) {
    await postTaskMessage("Add a task description after the task id.");
    return;
  }

  const taskUpdate = {
    description: trimmedDescription,
    updatedAt: serverTimestamp(),
    updatedBy: state.profile.id,
    updatedByName: state.profile.name,
  };

  if (labels.length > 0) {
    taskUpdate.labels = labels;
  }

  await updateDoc(doc(state.db, "rooms", state.roomId, "tasks", task.id), taskUpdate);

  await postTaskMessage(
    `Task ${formatTaskId(task.id)} updated: ${trimmedDescription}${labels.length > 0 ? formatTaskLabels(labels) : ""}`
  );
  setStatus("Task updated.", "success");
}

async function startTaskTimer(taskIdInput) {
  const taskId = taskIdInput.trim();

  if (!taskId) {
    await startGeneralTimer();
    return;
  }

  const task = await findTaskById(taskId);

  if (!task) {
    await postTaskMessage(`Task ${taskId} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  if (task.status === "complete") {
    await postTaskMessage(`Task ${formatTaskId(task.id)} is already complete.`);
    setStatus("Task is already complete.", "error");
    return;
  }

  if (task.activeTimerStartedAt) {
    const owner = task.activeTimerStartedByName || "Someone";
    await postTaskMessage(`Task ${formatTaskId(task.id)} already has a timer running by ${owner}.`);
    setStatus("Task timer is already running.", "error");
    return;
  }

  const startedAt = new Date();

  await updateDoc(doc(state.db, "rooms", state.roomId, "tasks", task.id), {
    activeTimerStartedAt: startedAt,
    activeTimerStartedBy: state.profile.id,
    activeTimerStartedByName: state.profile.name,
  });

  scheduleTaskTimerReminder({
    id: task.id,
    description: task.description,
    startedAt,
  });
  clearDayIdleTaskReminder();
  await postTaskMessage(`Task ${formatTaskId(task.id)} timer started: ${task.description}`);
  setStatus("Task timer started.", "success");
}

async function stopTaskTimer(taskIdInput) {
  const taskId = taskIdInput.trim();

  if (!taskId) {
    await stopGeneralTimer();
    return;
  }

  const task = await findTaskById(taskId);

  if (!task) {
    await postTaskMessage(`Task ${taskId} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  if (!task.activeTimerStartedAt) {
    await postTaskMessage(`Task ${formatTaskId(task.id)} does not have a running timer.`);
    setStatus("Task timer is not running.", "error");
    return;
  }

  if (!isCurrentUserTaskTimerOwner(task)) {
    const owner = getTaskTimerOwnerName(task);
    await postTaskMessage(`Task ${formatTaskId(task.id)} timer is running by ${owner}.`);
    setStatus("Task timer belongs to another user.", "error");
    return;
  }

  const elapsedMs = Math.max(0, Date.now() - getTimestampMillis(task.activeTimerStartedAt));
  const stoppedAt = new Date();

  await updateDoc(doc(state.db, "rooms", state.roomId, "tasks", task.id), {
    totalTrackedMs: increment(elapsedMs),
    activeTimerStartedAt: null,
    activeTimerStartedBy: null,
    activeTimerStartedByName: null,
  });

  await recordTaskTimeEntry(task, task.activeTimerStartedAt, stoppedAt, elapsedMs);
  clearTaskTimerReminder(task.id);
  scheduleDayIdleTaskReminder();
  await postTaskMessage(
    `Task ${formatTaskId(task.id)} timer stopped after ${formatDuration(elapsedMs)}: ${task.description}`
  );
  setStatus("Task timer stopped.", "success");
}

async function startGeneralTimer() {
  const activeTimer = await findActiveGeneralTimer();

  if (activeTimer) {
    await postTaskMessage("A general timer is already running.");
    setStatus("General timer is already running.", "error");
    return;
  }

  const startedAt = new Date();

  await setDoc(
    getWorkDayRef(),
    {
      userId: state.profile.id,
      userName: state.profile.name,
      dateKey: getTodayKey(),
      activeTimerStartedAt: startedAt,
      activeTimerStartedBy: state.profile.id,
      activeTimerStartedByName: state.profile.name,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  scheduleTaskTimerReminder({
    id: getGeneralTimerReminderId(),
    description: "General work",
    startedAt,
    isGeneralTimer: true,
  });
  clearDayIdleTaskReminder();
  await postTaskMessage("General timer started.");
  setStatus("General timer started.", "success");
}

async function stopGeneralTimer() {
  const activeTimer = await findActiveGeneralTimer();

  if (!activeTimer?.data?.activeTimerStartedAt) {
    await postTaskMessage("No general timer is running.");
    setStatus("General timer is not running.", "error");
    return;
  }

  const elapsedMs = Math.max(0, Date.now() - getTimestampMillis(activeTimer.data.activeTimerStartedAt));
  const stoppedAt = new Date();

  await setDoc(
    activeTimer.ref,
    {
    activeTimerStartedAt: null,
    activeTimerStartedBy: null,
    activeTimerStartedByName: null,
    userId: state.profile.id,
    userName: state.profile.name,
    updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await recordGeneralTimeEntry(activeTimer.data.activeTimerStartedAt, stoppedAt, elapsedMs);
  clearGeneralTimerReminders();
  scheduleDayIdleTaskReminder();
  await postTaskMessage(`General timer stopped after ${formatDuration(elapsedMs)}.`);
  setStatus("General timer stopped.", "success");
}

async function continueGeneralTimer() {
  const activeTimer = await findActiveGeneralTimer();

  if (!activeTimer?.data?.activeTimerStartedAt) {
    await postTaskMessage("No general timer is running.");
    setStatus("General timer is not running.", "error");
    return;
  }

  scheduleTaskTimerReminder({
    id: getGeneralTimerReminderId(),
    description: "General work",
    startedAt: new Date(),
    isGeneralTimer: true,
  });
  postLocalTaskMessage(
    `Continuing general timer. I will remind you again in ${formatDuration(TASK_TIMER_REMINDER_MS)} if it is still running.`
  );
  setStatus("General timer continued.", "success");
}

async function continueTaskTimer(taskIdInput) {
  const taskId = taskIdInput.trim();

  if (!taskId) {
    await continueGeneralTimer();
    return;
  }

  const task = await findTaskById(taskId);

  if (!task) {
    await postTaskMessage(`Task ${taskId} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  if (task.status === "complete") {
    await postTaskMessage(`Task ${formatTaskId(task.id)} is already complete.`);
    setStatus("Task is already complete.", "error");
    return;
  }

  if (!task.activeTimerStartedAt) {
    await postTaskMessage(`Task ${formatTaskId(task.id)} does not have a running timer.`);
    setStatus("Task timer is not running.", "error");
    return;
  }

  if (!isCurrentUserTaskTimerOwner(task)) {
    const owner = getTaskTimerOwnerName(task);
    await postTaskMessage(`Task ${formatTaskId(task.id)} timer is running by ${owner}.`);
    setStatus("Task timer belongs to another user.", "error");
    return;
  }

  scheduleTaskTimerReminder({
    id: task.id,
    description: task.description,
    startedAt: new Date(),
  });
  postLocalTaskMessage(
    `Continuing Task ${formatTaskId(task.id)}. I will remind you again in ${formatDuration(TASK_TIMER_REMINDER_MS)} if it is still running.`
  );
  setStatus("Task timer continued.", "success");
}

async function updateTaskLabels(input, mode) {
  const [taskId = "", ...labelParts] = input.trim().split(/\s+/);
  const labels = parseLabels(labelParts.join(" "));
  const action = mode === "add" ? "label" : "unlabel";

  if (!taskId || labels.length === 0) {
    await postTaskMessage(`Use /task ${action} <id> #label.`);
    return;
  }

  const task = await findTaskById(taskId);

  if (!task) {
    await postTaskMessage(`Task ${taskId} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  await updateDoc(doc(state.db, "rooms", state.roomId, "tasks", task.id), {
    labels: mode === "add" ? arrayUnion(...labels) : arrayRemove(...labels),
  });

  await postTaskMessage(
    `Task ${formatTaskId(task.id)} ${mode === "add" ? "labeled" : "unlabeled"} ${formatTaskLabels(labels).trim()}: ${task.description}`
  );
  setStatus(`Task ${mode === "add" ? "labeled" : "unlabeled"}.`, "success");
}

async function postTaskSummary(input = "") {
  const shouldShare = ["share", "send", "group"].includes(input.trim().toLowerCase());
  const summary = await buildDailyTaskSummary();

  if (shouldShare) {
    await postTaskMessage(summary);
    setStatus("Task summary shared with the group.", "success");
    return;
  }

  postLocalTaskMessage(summary);
  setStatus("Task summary ready.", "success");
}

async function startWorkDay() {
  const existingDay = await getWorkDay();

  await setDoc(
    getWorkDayRef(),
    {
      userId: state.profile.id,
      userName: state.profile.name,
      dateKey: getTodayKey(),
      startedAt: existingDay?.startedAt || serverTimestamp(),
      endedAt: null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await postDayMessage(
    `${state.profile.name} started the day.\nPlan can be shared with /day plan <plan>.`
  );
  scheduleDayIdleTaskReminder();
  setStatus("Day started.", "success");
}

async function saveWorkDayPlan(planInput) {
  const plan = planInput.trim();

  if (!plan) {
    postLocalDayMessage("Use /day plan <your plan> to save today's plan.");
    return;
  }

  await setDoc(
    getWorkDayRef(),
    {
      userId: state.profile.id,
      userName: state.profile.name,
      dateKey: getTodayKey(),
      plan,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await postDayMessage(`${state.profile.name}'s plan for today:\n${plan}`);
  setStatus("Day plan saved.", "success");
}

async function endWorkDay() {
  await setDoc(
    getWorkDayRef(),
    {
      userId: state.profile.id,
      userName: state.profile.name,
      dateKey: getTodayKey(),
      endedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  const summary = await buildDailyTaskSummary({ includePlan: true });
  await postDayMessage(summary);
  clearDayIdleTaskReminder();
  setStatus("Day ended and summary shared.", "success");
}

async function handleLeaveCommand(input = "") {
  const trimmedInput = input.trim();
  const [action = "", ...rest] = trimmedInput.split(/\s+/);
  const normalizedAction = action.toLowerCase();

  if (!trimmedInput) {
    postLocalDayMessage("Use /day leave <date-or-range> <reason>.");
    return;
  }

  if (normalizedAction === "list") {
    await postLeaveList();
    return;
  }

  if (normalizedAction === "cancel") {
    await cancelLeave(rest.join(" "));
    return;
  }

  await scheduleLeave(trimmedInput);
}

async function scheduleLeave(input) {
  const parsedLeave = parseLeaveInput(input);

  if (!parsedLeave) {
    postLocalDayMessage("Use /day leave tomorrow Sick leave or /day leave 2026-05-20 to 2026-05-22 PTO.");
    return;
  }

  const leaveRef = await addDoc(collection(state.db, "rooms", state.roomId, "leaves"), {
    userId: state.profile.id,
    userName: state.profile.name,
    startDateKey: parsedLeave.startDateKey,
    endDateKey: parsedLeave.endDateKey,
    reason: parsedLeave.reason,
    status: "scheduled",
    createdAt: serverTimestamp(),
    canceledAt: null,
  });

  await postDayMessage(
    `${state.profile.name} scheduled leave ${formatDateRange(parsedLeave.startDateKey, parsedLeave.endDateKey)}: ${parsedLeave.reason} (${formatLeaveId(leaveRef.id)})`
  );
  setStatus("Leave scheduled.", "success");
}

async function postLeaveList() {
  const leaves = (await loadRoomLeaves())
    .filter(
      (leave) =>
        leave.userId === state.profile.id &&
        leave.status !== "canceled" &&
        leave.endDateKey >= getTodayKey()
    )
    .sort(compareLeavesByStartDate);

  if (leaves.length === 0) {
    postLocalDayMessage("No upcoming leaves scheduled.");
    setStatus("No upcoming leaves.", "success");
    return;
  }

  const lines = leaves.map(
    (leave) =>
      `${formatLeaveId(leave.id)} - ${formatDateRange(leave.startDateKey, leave.endDateKey)}: ${leave.reason}`
  );
  postLocalDayMessage(`Upcoming leaves:\n${lines.join("\n")}`);
  setStatus(`${leaves.length} leave${leaves.length === 1 ? "" : "s"} listed.`, "success");
}

async function cancelLeave(leaveIdInput) {
  const leaveId = leaveIdInput.trim();

  if (!leaveId) {
    postLocalDayMessage("Use /day leave cancel <id>.");
    return;
  }

  const leave = await findLeaveById(leaveId);

  if (!leave) {
    postLocalDayMessage(`Leave ${leaveId} was not found.`);
    setStatus("Leave not found.", "error");
    return;
  }

  if (leave.userId !== state.profile.id) {
    postLocalDayMessage(`Leave ${formatLeaveId(leave.id)} belongs to ${leave.userName || "another user"}.`);
    setStatus("Leave belongs to another user.", "error");
    return;
  }

  if (leave.status === "canceled") {
    postLocalDayMessage(`Leave ${formatLeaveId(leave.id)} is already canceled.`);
    return;
  }

  await updateDoc(doc(state.db, "rooms", state.roomId, "leaves", leave.id), {
    status: "canceled",
    canceledAt: serverTimestamp(),
    userId: state.profile.id,
  });

  await postDayMessage(
    `${state.profile.name} canceled leave ${formatDateRange(leave.startDateKey, leave.endDateKey)}: ${leave.reason} (${formatLeaveId(leave.id)})`
  );
  setStatus("Leave canceled.", "success");
}

async function announceTodaysLeaves() {
  if (!state.db || !state.roomId || !state.profile) {
    return;
  }

  try {
    const todayKey = getTodayKey();
    const leaves = (await loadRoomLeaves()).filter(
      (leave) =>
        leave.status !== "canceled" &&
        leave.startDateKey <= todayKey &&
        leave.endDateKey >= todayKey
    );

    for (const leave of leaves) {
      const announcementId = `${todayKey}_${leave.id}`;
      const announcementRef = doc(
        state.db,
        "rooms",
        state.roomId,
        "leaveAnnouncements",
        announcementId
      );
      const announcementSnapshot = await getDoc(announcementRef);

      if (announcementSnapshot.exists()) {
        continue;
      }

      await postDayMessage(
        `${leave.userName || "Someone"} is on leave today (${formatDateRange(leave.startDateKey, leave.endDateKey)}): ${leave.reason}`
      );
      await setDoc(announcementRef, {
        leaveId: leave.id,
        dateKey: todayKey,
        announcedAt: serverTimestamp(),
        announcedBy: state.profile.id,
      });
    }
  } catch (error) {
    console.error("Leave announcement check failed:", error);
  }
}

async function buildDailyTaskSummary(options = {}) {
  const tasks = await loadRoomTasks();
  const { start, end } = getTodayBounds();
  const workDay = await getWorkDay();
  const activeGeneralTimer = await findActiveGeneralTimer();
  const generalTimeEntries = (await loadWorkDayTimeEntries()).filter(
    (entry) =>
      entry.userId === state.profile.id &&
      isTimestampWithin(entry.stoppedAt, start, end)
  );
  const timeEntriesByTaskId = new Map();

  await Promise.all(
    tasks.map(async (task) => {
      const entries = await loadTaskTimeEntries(task.id);
      timeEntriesByTaskId.set(
        task.id,
        entries.filter(
          (entry) =>
            entry.userId === state.profile.id &&
            isTimestampWithin(entry.stoppedAt, start, end)
        )
      );
    })
  );

  const createdToday = tasks.filter(
    (task) => task.createdBy === state.profile.id && isTimestampWithin(task.createdAt, start, end)
  );
  const completedToday = tasks.filter(
    (task) => task.completedBy === state.profile.id && isTimestampWithin(task.completedAt, start, end)
  );
  const activeTimers = tasks.filter((task) => task.activeTimerStartedAt && isCurrentUserTaskTimerOwner(task));
  const taskTrackedMs = [...timeEntriesByTaskId.values()]
    .flat()
    .reduce((total, entry) => total + (Number.isFinite(entry.durationMs) ? entry.durationMs : 0), 0);
  const generalTrackedMs = generalTimeEntries.reduce(
    (total, entry) => total + (Number.isFinite(entry.durationMs) ? entry.durationMs : 0),
    0
  );
  const trackedMs = taskTrackedMs + generalTrackedMs;
  const lines = [
    `Work summary for ${formatSummaryDate(start)}`,
  ];

  if (options.includePlan && workDay?.plan) {
    lines.push(`Plan: ${workDay.plan}`);
  }

  lines.push(`Time tracked: ${formatDuration(trackedMs)}`);
  if (generalTrackedMs > 0) {
    lines.push(`General time: ${formatDuration(generalTrackedMs)}`);
  }
  lines.push(`Completed: ${completedToday.length}`);

  completedToday.slice(0, 10).forEach((task) => {
    lines.push(`- ${task.description}${formatTaskLabels(task.labels)}${formatSummaryTimeForTask(task, timeEntriesByTaskId)}`);
  });

  lines.push(`Created: ${createdToday.length}`);
  createdToday.slice(0, 10).forEach((task) => {
    lines.push(`- ${task.description}${formatTaskLabels(task.labels)}`);
  });

  if (activeGeneralTimer?.data?.activeTimerStartedAt) {
    lines.push(
      `General timer running: ${formatDuration(Date.now() - getTimestampMillis(activeGeneralTimer.data.activeTimerStartedAt))}`
    );
  }

  if (activeTimers.length > 0) {
    lines.push(`Running timers: ${activeTimers.length}`);
    activeTimers.slice(0, 10).forEach((task) => {
      lines.push(`- ${task.description} (${formatDuration(Date.now() - getTimestampMillis(task.activeTimerStartedAt))})`);
    });
  }

  if (
    trackedMs === 0 &&
    completedToday.length === 0 &&
    createdToday.length === 0 &&
    activeTimers.length === 0 &&
    !activeGeneralTimer?.data?.activeTimerStartedAt
  ) {
    lines.push("No task activity recorded today.");
  }

  return lines.join("\n");
}

async function findTaskById(taskIdInput) {
  const normalizedId = taskIdInput.trim().replace(/^#/, "");

  if (!normalizedId) {
    return null;
  }

  const directSnapshot = await getDoc(doc(state.db, "rooms", state.roomId, "tasks", normalizedId));

  if (directSnapshot.exists()) {
    return {
      id: directSnapshot.id,
      ...directSnapshot.data(),
    };
  }

  const tasks = await loadRoomTasks();
  const normalizedPrefix = normalizedId.toLowerCase();
  const matches = tasks.filter((task) => task.id.toLowerCase().startsWith(normalizedPrefix));

  return matches.length === 1 ? matches[0] : null;
}

async function loadRoomTasks() {
  const tasksSnapshot = await getDocs(collection(state.db, "rooms", state.roomId, "tasks"));

  return tasksSnapshot.docs.map((taskDoc) => ({
    id: taskDoc.id,
    ...taskDoc.data(),
  }));
}

async function loadRoomWorkDays() {
  const workDaysSnapshot = await getDocs(collection(state.db, "rooms", state.roomId, "workDays"));

  return workDaysSnapshot.docs.map((workDayDoc) => ({
    id: workDayDoc.id,
    ref: workDayDoc.ref,
    ...workDayDoc.data(),
  }));
}

async function loadTaskTimeEntries(taskId) {
  const entriesSnapshot = await getDocs(
    collection(state.db, "rooms", state.roomId, "tasks", taskId, "timeEntries")
  );

  return entriesSnapshot.docs.map((entryDoc) => ({
    id: entryDoc.id,
    ...entryDoc.data(),
  }));
}

async function loadWorkDayTimeEntries() {
  const entriesSnapshot = await getDocs(collection(getWorkDayRef(), "timeEntries"));

  return entriesSnapshot.docs.map((entryDoc) => ({
    id: entryDoc.id,
    ...entryDoc.data(),
  }));
}

async function getWorkDay() {
  const snapshot = await getDoc(getWorkDayRef());
  return snapshot.exists() ? snapshot.data() : null;
}

async function findActiveGeneralTimer() {
  const todaySnapshot = await getDoc(getWorkDayRef());

  if (todaySnapshot.exists() && todaySnapshot.data()?.activeTimerStartedAt) {
    return {
      id: todaySnapshot.id,
      ref: todaySnapshot.ref,
      data: todaySnapshot.data(),
    };
  }

  const activeTimers = (await loadRoomWorkDays())
    .filter((workDay) => isCurrentUserWorkDay(workDay) && workDay.activeTimerStartedAt)
    .sort((left, right) => getTimestampMillis(left.activeTimerStartedAt) - getTimestampMillis(right.activeTimerStartedAt));

  if (activeTimers.length === 0) {
    return null;
  }

  const [activeTimer] = activeTimers;
  return {
    id: activeTimer.id,
    ref: activeTimer.ref,
    data: activeTimer,
  };
}

function getWorkDayRef() {
  return doc(state.db, "rooms", state.roomId, "workDays", `${state.profile.id}_${getTodayKey()}`);
}

function isCurrentUserWorkDay(workDay) {
  if (workDay.userId === state.profile?.id) {
    return true;
  }

  const workDayUserName = normalizeProfileName(workDay.userName);
  const profileName = normalizeProfileName(state.profile?.name);
  return Boolean(workDayUserName && profileName && workDayUserName === profileName);
}

async function loadRoomLeaves() {
  const leavesSnapshot = await getDocs(collection(state.db, "rooms", state.roomId, "leaves"));

  return leavesSnapshot.docs.map((leaveDoc) => ({
    id: leaveDoc.id,
    ...leaveDoc.data(),
  }));
}

async function findLeaveById(leaveIdInput) {
  const normalizedId = leaveIdInput.trim().replace(/^#/, "");

  if (!normalizedId) {
    return null;
  }

  const directSnapshot = await getDoc(doc(state.db, "rooms", state.roomId, "leaves", normalizedId));

  if (directSnapshot.exists()) {
    return {
      id: directSnapshot.id,
      ...directSnapshot.data(),
    };
  }

  const leaves = await loadRoomLeaves();
  const normalizedPrefix = normalizedId.toLowerCase();
  const matches = leaves.filter((leave) => leave.id.toLowerCase().startsWith(normalizedPrefix));

  return matches.length === 1 ? matches[0] : null;
}

async function loadPendingRoomTasks() {
  const pendingTasksQuery = query(
    collection(state.db, "rooms", state.roomId, "tasks"),
    where("status", "==", "pending")
  );
  const tasksSnapshot = await getDocs(pendingTasksQuery);

  return tasksSnapshot.docs.map((taskDoc) => ({
    id: taskDoc.id,
    ...taskDoc.data(),
  }));
}

async function postTaskMessage(text) {
  await addDoc(collection(state.db, "rooms", state.roomId, "messages"), {
    text,
    senderId: state.profile.id,
    senderName: "Tasks",
    type: "task",
    createdAt: serverTimestamp(),
  });
}

async function postDayMessage(text) {
  await addDoc(collection(state.db, "rooms", state.roomId, "messages"), {
    text,
    senderId: state.profile.id,
    senderName: "Day",
    type: "day",
    createdAt: serverTimestamp(),
  });
}

async function recordTaskTimeEntry(task, startedAt, stoppedAt, durationMs) {
  await addDoc(collection(state.db, "rooms", state.roomId, "tasks", task.id, "timeEntries"), {
    taskId: task.id,
    taskDescription: task.description,
    userId: state.profile.id,
    userName: state.profile.name,
    startedAt: normalizeTimestampDate(startedAt),
    stoppedAt,
    durationMs,
    createdAt: serverTimestamp(),
  });
}

async function recordGeneralTimeEntry(startedAt, stoppedAt, durationMs) {
  await addDoc(collection(getWorkDayRef(), "timeEntries"), {
    description: "General work",
    userId: state.profile.id,
    userName: state.profile.name,
    startedAt: normalizeTimestampDate(startedAt),
    stoppedAt,
    durationMs,
    createdAt: serverTimestamp(),
  });
}

function postLocalTaskMessage(text, actions = []) {
  postLocalMessage(text, "Tasks (only you)", "task", actions);
}

function postLocalTaskListMessage(heading, tasks, fallbackText) {
  postLocalMessage(fallbackText, "Tasks (only you)", "task-list", [], {
    heading,
    tasks,
    maskIdentity: isPrivacyModeActive(),
  });
}

function postLocalDayMessage(text) {
  postLocalMessage(text, "Day (only you)", "day");
}

function postLocalMessage(text, senderName, type, actions = [], extra = {}) {
  state.localMessages.push({
    id: `local-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    senderId: null,
    senderName,
    type,
    isLocalOnly: true,
    actions,
    createdAt: new Date(),
    ...extra,
  });
  syncStealthLayout();
  updatePrivacyIndicator();
  renderMessages();
}

function scheduleTaskTimerReminder(task) {
  clearTaskTimerReminder(task.id);

  const elapsedMs = Date.now() - getTimestampMillis(task.startedAt);
  const delayMs = Math.max(0, TASK_TIMER_REMINDER_MS - elapsedMs);
  const timeoutId = window.setTimeout(() => {
    void handleTaskTimerReminder({
      ...task,
      reminderCount: 0,
      unattendedSince: null,
    });
  }, delayMs);

  state.taskTimerReminderTimeouts.set(task.id, { timeoutId });
}

function scheduleTaskTimerFollowUpReminder(task) {
  clearTaskTimerReminder(task.id);

  const timeoutId = window.setTimeout(() => {
    void handleTaskTimerReminder(task, true);
  }, TASK_TIMER_REPEAT_REMINDER_MS);

  state.taskTimerReminderTimeouts.set(task.id, { timeoutId });
}

async function handleTaskTimerReminder(task, isFollowUp = false) {
  state.taskTimerReminderTimeouts.delete(task.id);

  if (task.isGeneralTimer) {
    await handleGeneralTimerReminder(task, isFollowUp);
    return;
  }

  const latestTask = await getActiveTaskForLocalReminder(task);

  if (!latestTask) {
    return;
  }

  const reminderCount = Number.isFinite(task.reminderCount) ? task.reminderCount : 0;
  const unattendedSince = task.unattendedSince || new Date();

  if (reminderCount >= TASK_TIMER_MAX_UNANSWERED_REMINDERS) {
    await autoStopUnansweredTaskTimer(latestTask, unattendedSince);
    return;
  }

  postLocalTaskMessage(
    `Reminder: Task ${formatTaskId(latestTask.id)} has been running for more than ${formatDuration(TASK_TIMER_REMINDER_MS)}: ${latestTask.description}\nContinue with /task continue ${formatTaskId(latestTask.id)}, complete with /task complete ${formatTaskId(latestTask.id)}, or stop with /task stop ${formatTaskId(latestTask.id)}.`,
    [
      {
        label: "Continue",
        action: "task-continue",
        taskId: latestTask.id,
      },
      {
        label: "Complete",
        action: "task-complete",
        taskId: latestTask.id,
      },
      {
        label: "Stop",
        action: "task-stop",
        taskId: latestTask.id,
      },
    ]
  );
  scheduleTaskTimerFollowUpReminder({
    ...latestTask,
    reminderCount: reminderCount + 1,
    unattendedSince,
  });
  setStatus(isFollowUp ? "Task timer reminder repeated." : "Task timer reminder.", "success");
}

async function handleGeneralTimerReminder(timer, isFollowUp = false) {
  const latestTimer = await getActiveGeneralTimerForLocalReminder(timer);

  if (!latestTimer) {
    return;
  }

  const reminderCount = Number.isFinite(timer.reminderCount) ? timer.reminderCount : 0;
  const unattendedSince = timer.unattendedSince || new Date();

  if (reminderCount >= TASK_TIMER_MAX_UNANSWERED_REMINDERS) {
    await autoStopUnansweredGeneralTimer(latestTimer, unattendedSince);
    return;
  }

  postLocalTaskMessage(
    `Reminder: General timer has been running for more than ${formatDuration(TASK_TIMER_REMINDER_MS)}.\nContinue with /task continue or stop with /task stop.`,
    [
      {
        label: "Continue",
        action: "general-timer-continue",
      },
      {
        label: "Stop",
        action: "general-timer-stop",
      },
    ]
  );
  scheduleTaskTimerFollowUpReminder({
    ...latestTimer,
    reminderCount: reminderCount + 1,
    unattendedSince,
  });
  setStatus(isFollowUp ? "General timer reminder repeated." : "General timer reminder.", "success");
}

async function autoStopUnansweredTaskTimer(task, unattendedSince) {
  const stoppedAt = normalizeTimestampDate(unattendedSince);
  const elapsedMs = Math.max(
    0,
    stoppedAt.getTime() - getTimestampMillis(task.activeTimerStartedAt || task.startedAt)
  );

  await updateDoc(doc(state.db, "rooms", state.roomId, "tasks", task.id), {
    totalTrackedMs: increment(elapsedMs),
    activeTimerStartedAt: null,
    activeTimerStartedBy: null,
    activeTimerStartedByName: null,
  });

  if (elapsedMs > 0) {
    await recordTaskTimeEntry(task, task.activeTimerStartedAt || task.startedAt, stoppedAt, elapsedMs);
  }

  postLocalTaskMessage(
    `Timer auto-stopped for Task ${formatTaskId(task.id)} after ${formatDuration(elapsedMs)} because two reminders went unanswered: ${task.description}`
  );
  scheduleDayIdleTaskReminder();
  setStatus("Task timer auto-stopped.", "success");
}

async function autoStopUnansweredGeneralTimer(timer, unattendedSince) {
  const stoppedAt = normalizeTimestampDate(unattendedSince);
  const elapsedMs = Math.max(0, stoppedAt.getTime() - getTimestampMillis(timer.activeTimerStartedAt || timer.startedAt));

  await setDoc(
    timer.ref || getWorkDayRef(),
    {
      activeTimerStartedAt: null,
      activeTimerStartedBy: null,
      activeTimerStartedByName: null,
      userId: state.profile.id,
      userName: state.profile.name,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  if (elapsedMs > 0) {
    await recordGeneralTimeEntry(timer.activeTimerStartedAt || timer.startedAt, stoppedAt, elapsedMs);
  }

  postLocalTaskMessage(
    `General timer auto-stopped after ${formatDuration(elapsedMs)} because two reminders went unanswered.`
  );
  scheduleDayIdleTaskReminder();
  setStatus("General timer auto-stopped.", "success");
}

async function getActiveTaskForLocalReminder(task) {
  try {
    const latestTask = await findTaskById(task.id);

    if (
      !latestTask ||
      latestTask.status === "complete" ||
      !latestTask.activeTimerStartedAt ||
      !isCurrentUserTaskTimerOwner(latestTask)
    ) {
      return null;
    }

    return {
      id: latestTask.id,
      description: latestTask.description || task.description,
      startedAt: latestTask.activeTimerStartedAt || task.startedAt,
      activeTimerStartedAt: latestTask.activeTimerStartedAt,
    };
  } catch (error) {
    console.error("Task reminder check failed:", error);
    return task;
  }
}

async function getActiveGeneralTimerForLocalReminder(timer) {
  try {
    const activeTimer = await findActiveGeneralTimer();

    if (!activeTimer?.data?.activeTimerStartedAt) {
      return null;
    }

    return {
      id: getGeneralTimerReminderId(),
      description: "General work",
      startedAt: activeTimer.data.activeTimerStartedAt || timer.startedAt,
      activeTimerStartedAt: activeTimer.data.activeTimerStartedAt,
      isGeneralTimer: true,
      ref: activeTimer.ref,
    };
  } catch (error) {
    console.error("General timer reminder check failed:", error);
    return timer;
  }
}

function clearTaskTimerReminder(taskId) {
  const reminder = state.taskTimerReminderTimeouts.get(taskId);

  if (!reminder?.timeoutId) {
    return;
  }

  window.clearTimeout(reminder.timeoutId);
  state.taskTimerReminderTimeouts.delete(taskId);
}

function clearTaskTimerReminders() {
  state.taskTimerReminderTimeouts.forEach((reminder) => {
    if (reminder?.timeoutId) {
      window.clearTimeout(reminder.timeoutId);
    }
  });
  state.taskTimerReminderTimeouts.clear();
}

function clearGeneralTimerReminders() {
  [...state.taskTimerReminderTimeouts.keys()]
    .filter((taskId) => taskId.startsWith("general:"))
    .forEach((taskId) => clearTaskTimerReminder(taskId));
}

function scheduleDayIdleTaskReminder() {
  clearDayIdleTaskReminder();

  if (!state.db || !state.roomId || !state.profile) {
    return;
  }

  state.dayIdleTaskReminderTimeoutId = window.setTimeout(() => {
    void handleDayIdleTaskReminder();
  }, DAY_IDLE_TASK_REMINDER_MS);
}

async function handleDayIdleTaskReminder() {
  state.dayIdleTaskReminderTimeoutId = null;

  const shouldRemind = await shouldRemindForIdleWorkDay();

  if (!shouldRemind) {
    return;
  }

  postLocalDayMessage(
    `Reminder: Your day is started, but no timer is running.\nStart a general timer with /task start, start a task with /task start <id>, or create one with /task <description>.`
  );
  scheduleDayIdleTaskReminder();
  setStatus("No task running reminder.", "success");
}

async function shouldRemindForIdleWorkDay() {
  try {
    const workDay = await getWorkDay();

    if (!workDay?.startedAt || workDay.endedAt) {
      return false;
    }

    if (await findActiveGeneralTimer()) {
      return false;
    }

    const tasks = await loadRoomTasks();
    return !tasks.some((task) => task.activeTimerStartedAt && isCurrentUserTaskTimerOwner(task));
  } catch (error) {
    console.error("Idle task reminder check failed:", error);
    return false;
  }
}

function clearDayIdleTaskReminder() {
  if (!state.dayIdleTaskReminderTimeoutId) {
    return;
  }

  window.clearTimeout(state.dayIdleTaskReminderTimeoutId);
  state.dayIdleTaskReminderTimeoutId = null;
}

function getGeneralTimerReminderId() {
  return `general:${getTodayKey()}`;
}

function compareTasksByCreatedAt(left, right) {
  const leftTime = left.createdAt?.toMillis?.() ?? 0;
  const rightTime = right.createdAt?.toMillis?.() ?? 0;

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return left.id.localeCompare(right.id);
}

function draftTaskEdit(taskId, description) {
  if (!taskId) {
    return;
  }

  messageInput.value = `/task edit ${formatTaskId(taskId)} ${description}`.trimEnd();
  messageInput.focus();
  messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
  handleMessageInputChange();
  setStatus("Edit the task and send when ready.", "success");
}

function formatTaskId(taskId) {
  return `#${taskId.slice(0, 6)}`;
}

function formatTaskTimeSummary(task, options = {}) {
  const maskIdentity = Boolean(options.maskIdentity);
  const totalTrackedMs = Number.isFinite(task.totalTrackedMs) ? task.totalTrackedMs : 0;
  const activeMs = task.activeTimerStartedAt
    ? Math.max(0, Date.now() - getTimestampMillis(task.activeTimerStartedAt))
    : 0;
  const totalMs = totalTrackedMs + activeMs;
  const parts = [];

  if (totalMs > 0) {
    parts.push(`tracked ${formatDuration(totalMs)}`);
  }

  if (task.activeTimerStartedAt) {
    if (maskIdentity) {
      parts.push("running");
    } else {
      const owner = task.activeTimerStartedByName || "someone";
      parts.push(`running by ${owner}`);
    }
  }

  return parts.length > 0 ? ` [${parts.join(", ")}]` : "";
}

function isPrivacyModeActive() {
  return Boolean(state.isPrivacyEnabled);
}

function isCurrentUserTaskTimerOwner(task) {
  if (!task.activeTimerStartedBy) {
    return true;
  }

  if (task.activeTimerStartedBy === state.profile?.id) {
    return true;
  }

  const ownerName = normalizeProfileName(task.activeTimerStartedByName);
  const profileName = normalizeProfileName(state.profile?.name);
  return Boolean(ownerName && profileName && ownerName === profileName);
}

function getTaskTimerOwnerName(task) {
  return task.activeTimerStartedByName || "another user";
}

function formatSummaryTimeForTask(task, timeEntriesByTaskId) {
  const trackedMs = (timeEntriesByTaskId.get(task.id) || []).reduce(
    (total, entry) => total + (Number.isFinite(entry.durationMs) ? entry.durationMs : 0),
    0
  );

  return trackedMs > 0 ? ` (${formatDuration(trackedMs)})` : "";
}

function formatDuration(durationMs) {
  const totalMinutes = Math.max(0, Math.round(durationMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
}

function getTodayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function getTodayKey() {
  const { start } = getTodayBounds();
  const year = start.getFullYear();
  const month = String(start.getMonth() + 1).padStart(2, "0");
  const day = String(start.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseLeaveInput(input) {
  const trimmedInput = input.trim();
  const rangeMatch = trimmedInput.match(/^(\S+)(?:\s+to\s+(\S+))?\s+(.+)$/i);

  if (!rangeMatch) {
    return null;
  }

  const startDateKey = parseDateKey(rangeMatch[1]);
  const endDateKey = parseDateKey(rangeMatch[2] || rangeMatch[1]);
  const reason = rangeMatch[3].trim();

  if (!startDateKey || !endDateKey || !reason || startDateKey > endDateKey) {
    return null;
  }

  return {
    startDateKey,
    endDateKey,
    reason,
  };
}

function parseDateKey(value) {
  const normalizedValue = String(value || "").trim().toLowerCase();

  if (normalizedValue === "today") {
    return getTodayKey();
  }

  if (normalizedValue === "tomorrow") {
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateKey(tomorrow);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    const date = new Date(`${normalizedValue}T00:00:00`);

    if (!Number.isNaN(date.getTime()) && formatDateKey(date) === normalizedValue) {
      return normalizedValue;
    }
  }

  return null;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateRange(startDateKey, endDateKey) {
  return startDateKey === endDateKey ? startDateKey : `${startDateKey} to ${endDateKey}`;
}

function formatLeaveId(leaveId) {
  return `#${leaveId.slice(0, 6)}`;
}

function compareLeavesByStartDate(left, right) {
  if (left.startDateKey !== right.startDateKey) {
    return left.startDateKey.localeCompare(right.startDateKey);
  }

  return left.id.localeCompare(right.id);
}

function isTimestampWithin(timestamp, start, end) {
  const time = getTimestampMillis(timestamp);
  return time >= start.getTime() && time < end.getTime();
}

function normalizeTimestampDate(timestamp) {
  if (timestamp instanceof Date) {
    return timestamp;
  }

  return timestamp?.toDate?.() || new Date();
}

function formatSummaryDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

function extractLabels(value) {
  const labels = parseLabels(value);
  const text = value
    .replace(/(^|\s)#[a-z0-9][a-z0-9_-]*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    text,
    labels,
  };
}

function parseLabels(value) {
  const labels = new Set();
  const labelMatches = String(value || "").matchAll(/(?:^|\s)#([a-z0-9][a-z0-9_-]*)/gi);

  for (const match of labelMatches) {
    labels.add(match[1].toLowerCase());
  }

  return [...labels];
}

function taskHasLabels(task, requestedLabels) {
  if (requestedLabels.length === 0) {
    return true;
  }

  const taskLabels = new Set(Array.isArray(task.labels) ? task.labels : []);
  return requestedLabels.every((label) => taskLabels.has(label));
}

function formatTaskLabels(labels) {
  if (!Array.isArray(labels) || labels.length === 0) {
    return "";
  }

  return ` ${labels.map((label) => `#${label}`).join(" ")}`;
}

function formatTaskTimestamp(timestamp) {
  const date = timestamp?.toDate?.();

  if (!date) {
    return "just now";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function enablePrivacyMode() {
  if (!state.canUsePrivacyFeature) {
    setStatus("Privacy mode needs to be invited for this account before it can be used here.", "error");
    return;
  }

  state.isPrivacyEnabled = true;
  state.isPrivacyPreviewVisible = false;
  state.visibleMessageLimit = null;
  state.unreadMessageIds = [];
  clearPrivacyPreviewTimer();
  state.hiddenMessageIds = [];
  state.previewMessageIds = [];
  setMessageInputMasked(true);
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
  syncMessageInputMask();
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
      const nextReadReceipts = snapshot.docs.map((receiptDoc) => ({
        id: receiptDoc.id,
        ...receiptDoc.data(),
      }));
      if (haveReadReceiptsChanged(state.readReceipts, nextReadReceipts)) {
        state.readReceipts = nextReadReceipts;
        renderMessages();
      }
    },
    (error) => {
      console.error(error);
      setStatus("Read notifications stopped. Verify your access rules.", "error");
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
  reconcileUnreadState();
  const count = getUnreadCount();
  const shouldShowCount = count > 0 && (!state.isPrivacyEnabled || !state.isPrivacyPreviewVisible);
  const shouldShowComposerCount =
    state.isPrivacyEnabled &&
    !(state.isPrivacyEnabled && !state.isPrivacyPreviewVisible && state.localMessages.length > 0);

  privacyIndicator.textContent = shouldShowCount ? String(count) : "";
  privacyIndicator.className = shouldShowCount ? "privacy-indicator active" : "privacy-indicator";
  composerCount.textContent = shouldShowComposerCount ? String(count) : "";
  composerCount.className =
    shouldShowComposerCount ? "composer-count active" : "composer-count";
}

function updateHiddenIncomingCount(nextMessages) {
  reconcileUnreadState(nextMessages);
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

function reconcileUnreadState(messages = state.messages) {
  const validMessageIds = new Set(messages.map((message) => message.id));

  state.hiddenMessageIds = state.hiddenMessageIds.filter((id) => validMessageIds.has(id));
  state.unreadMessageIds = state.unreadMessageIds.filter((id) => validMessageIds.has(id));

  if (shouldAutoMarkAsRead()) {
    state.unreadMessageIds = [];
  }

  if (!state.isPrivacyEnabled || state.isPrivacyPreviewVisible) {
    state.hiddenMessageIds = [];
  }
}

function compareMessagesByTime(left, right) {
  const leftTime = getTimestampMillis(left.createdAt);
  const rightTime = getTimestampMillis(right.createdAt);

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return left.id.localeCompare(right.id);
}

function getTimestampMillis(timestamp) {
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }

  return timestamp?.toMillis?.() ?? 0;
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

function createRenderContext(messages) {
  const privateAliases = new Map();

  if (state.isPrivacyEnabled && state.isPrivacyPreviewVisible) {
    let index = 1;

    messages.forEach((message) => {
      if (!message.senderId || privateAliases.has(message.senderId)) {
        return;
      }

      privateAliases.set(message.senderId, `User ${index}`);
      index += 1;
    });
  }

  return {
    privateAliases,
  };
}

function getDisplaySenderName(message, context = {}) {
  if (state.isPrivacyEnabled && state.isPrivacyPreviewVisible) {
    return getPrivateAlias(message.senderId, context.privateAliases);
  }

  return message.senderName || "Anonymous";
}

function getPrivateAlias(senderId, privateAliases = null) {
  if (!senderId) {
    return "User";
  }

  if (privateAliases?.has(senderId)) {
    return privateAliases.get(senderId);
  }

  return "User";
}

function haveReadReceiptsChanged(previousReceipts, nextReceipts) {
  if (previousReceipts.length !== nextReceipts.length) {
    return true;
  }

  for (let index = 0; index < previousReceipts.length; index += 1) {
    const previous = previousReceipts[index];
    const next = nextReceipts[index];

    if (
      previous.id !== next.id ||
      previous.displayName !== next.displayName ||
      previous.lastReadMessageId !== next.lastReadMessageId ||
      previous.lastReadCreatedAt?.toMillis?.() !== next.lastReadCreatedAt?.toMillis?.()
    ) {
      return true;
    }
  }

  return false;
}

function updateDocumentTitle() {
  reconcileUnreadState();
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
    !state.isNotificationsEnabled ||
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
    await showBrowserNotification(title, options);
  } catch (error) {
    console.error("Notification display failed:", error);
  }
}

async function testNotification() {
  if (!state.isNotificationsEnabled) {
    setStatus("Notifications are disabled in settings.", "error");
    updateNotificationSettingsUi();
    return;
  }

  if (typeof Notification === "undefined") {
    setStatus("This browser does not support notifications.", "error");
    updateNotificationSettingsUi();
    return;
  }

  await ensureNotificationPermission();

  if (Notification.permission !== "granted") {
    setStatus("Notifications are blocked. Enable them in browser settings.", "error");
    updateNotificationSettingsUi();
    return;
  }

  try {
    const deliveryMethod = await showBrowserNotification("OpenBox", {
      body: "Notifications are working.",
      tag: `chat-test-notification-${Date.now()}`,
      renotify: true,
      requireInteraction: true,
      silent: false,
      badge: "./icons/icon-192.png",
      icon: "./icons/icon-192.png",
      data: {
        notificationType: "test",
      },
    });
    setStatus(`Test notification sent (${deliveryMethod}). ${getMacNotificationHint()}`, "success");
  } catch (error) {
    console.error(error);
    setStatus("Test notification could not be sent.", "error");
  }

  updateNotificationSettingsUi();
}

function checkNotificationStatus() {
  updateNotificationSettingsUi();
  setStatus(getNotificationStatusText(), state.isNotificationsEnabled ? "success" : "");
}

async function toggleNotifications() {
  if (state.isNotificationsEnabled) {
    state.isNotificationsEnabled = false;
    saveNotificationsEnabled(false);
    updateNotificationSettingsUi();
    setStatus("Notifications disabled.", "success");
    return;
  }

  if (typeof Notification === "undefined") {
    setStatus("This browser does not support notifications.", "error");
    updateNotificationSettingsUi();
    return;
  }

  await ensureNotificationPermission();

  if (Notification.permission !== "granted") {
    state.isNotificationsEnabled = false;
    saveNotificationsEnabled(false);
    updateNotificationSettingsUi();
    setStatus("Notifications are blocked. Enable them in browser settings.", "error");
    return;
  }

  state.isNotificationsEnabled = true;
  saveNotificationsEnabled(true);
  updateNotificationSettingsUi();
  setStatus("Notifications enabled.", "success");
}

function updateNotificationSettingsUi() {
  if (!notificationStatus || !toggleNotificationsButton) {
    return;
  }

  notificationStatus.textContent = getNotificationStatusText();
  toggleNotificationsButton.textContent = state.isNotificationsEnabled
    ? "Disable notifications"
    : "Enable notifications";
  testNotificationButton.disabled = !state.isNotificationsEnabled;
}

function getNotificationStatusText() {
  if (typeof Notification === "undefined") {
    return "Notifications are not supported in this browser.";
  }

  if (!state.isNotificationsEnabled) {
    return "Notifications are disabled in OpenBox.";
  }

  if (Notification.permission === "granted") {
    return `Notifications are enabled and allowed by this browser. ${getMacNotificationHint()}`;
  }

  if (Notification.permission === "denied") {
    return "Notifications are enabled in OpenBox, but blocked by this browser.";
  }

  return "Notifications are enabled in OpenBox, but browser permission has not been granted yet.";
}

function loadNotificationsEnabled() {
  return localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === "true";
}

function saveNotificationsEnabled(enabled) {
  localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? "true" : "false");
}

async function showBrowserNotification(title, options) {
  if ("serviceWorker" in navigator) {
    const registration = await getReadyServiceWorkerRegistration();

    if (registration) {
      await registration.showNotification(title, options);
      return "service worker";
    }
  }

  new Notification(title, options);
  return "browser";
}

function getMacNotificationHint() {
  const isMac = navigator.platform?.toLowerCase().includes("mac");

  if (!isMac) {
    return "";
  }

  return "If no banner appears, check macOS System Settings > Notifications for this browser or OpenBox, and make sure Focus is off.";
}

async function getReadyServiceWorkerRegistration() {
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((resolve) => {
        window.setTimeout(() => resolve(null), 1200);
      }),
    ]);
  } catch (error) {
    console.error("Service worker was not ready for notifications:", error);
    return null;
  }
}

async function logoutAccount() {
  if (!state.auth) {
    setStatus("Auth is not ready yet.", "error");
    return;
  }

  logoutButton.disabled = true;

  try {
    disconnectFromRoom(true, true);
    state.profile = null;
    state.authUser = null;
    state.authError = null;
    displayNameInput.value = "";
    roomIdInput.value = "";
    roomPasscodeInput.value = "";
    sessionStorage.removeItem("firestore-chat-google-redirect-mode");
    await signOut(state.auth);
    await ensureAnonymousAuthSession();
    updateAuthUi();
    setStatus("Logged out. A fresh guest session is ready.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Logout failed. Try again.", "error");
  } finally {
    logoutButton.disabled = false;
  }
}

function updateAppBadge() {
  reconcileUnreadState();
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
  document.body.classList.toggle(
    "local-tasks-visible",
    state.isPrivacyEnabled && !state.isPrivacyPreviewVisible && state.localMessages.length > 0
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

function getVisibleMessagesWithLocal() {
  const visibleMessages = getVisibleMessages();

  if (state.localMessages.length === 0) {
    return visibleMessages;
  }

  return [...visibleMessages, ...state.localMessages].sort(compareMessagesByTime);
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
  if (!state.roomId) {
    updateDocumentTitle();
    updateAppBadge();
    return;
  }

  if (!shouldAutoMarkAsRead()) {
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

function getRuntimeFirebaseConfig(config) {
  const hostname = window.location.hostname;
  const isFirebaseHostingDomain =
    hostname.endsWith(".web.app") || hostname.endsWith(".firebaseapp.com");

  if (!isFirebaseHostingDomain || hostname === config.authDomain) {
    return config;
  }

  return {
    ...config,
    authDomain: hostname,
  };
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

function normalizeProfileName(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getPrivacyFeatureIdentifiers() {
  const identifiers = [
    normalizeProfileName(state.profile?.name),
    normalizeProfileName(state.authUser?.email),
  ].filter(Boolean);

  return [...new Set(identifiers)];
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
  document.body.classList.toggle("settings-active", visible);

  if (visible) {
    updateNotificationSettingsUi();
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

  const nextSession = JSON.stringify({
    displayName: state.profile.name,
    roomId: state.roomId,
    roomPasscode: state.roomPasscode,
    isPrivacyEnabled: state.isPrivacyEnabled,
    visibleMessageLimit: state.visibleMessageLimit,
    unreadMessageIds: state.unreadMessageIds,
    hiddenMessageIds: state.hiddenMessageIds,
  });

  if (state.lastPersistedSession === nextSession) {
    return;
  }

  state.pendingSessionPayload = nextSession;
  clearSessionPersistTimer();
  state.sessionPersistTimeoutId = window.setTimeout(() => {
    flushPendingSessionPersist();
  }, SESSION_PERSIST_DELAY_MS);
}

function clearSessionPersistTimer() {
  if (state.sessionPersistTimeoutId) {
    window.clearTimeout(state.sessionPersistTimeoutId);
    state.sessionPersistTimeoutId = null;
  }
}

function flushPendingSessionPersist() {
  clearSessionPersistTimer();

  if (!state.pendingSessionPayload || state.pendingSessionPayload === state.lastPersistedSession) {
    return;
  }

  localStorage.setItem(SESSION_KEY, state.pendingSessionPayload);
  state.lastPersistedSession = state.pendingSessionPayload;
  state.pendingSessionPayload = "";
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
    reconcileUnreadState([]);
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
    state.pendingSessionPayload = "";
    state.lastPersistedSession = "";
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
  const date = timestamp instanceof Date ? timestamp : timestamp?.toDate?.();
  if (!date) {
    return "sending...";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
