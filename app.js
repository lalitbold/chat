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
const showJoinFormButton = document.getElementById("show-join-form");
const displayNameInput = document.getElementById("display-name");
const roomIdInput = document.getElementById("room-id");
const roomPasscodeInput = document.getElementById("room-passcode");
const availableGroupsStatus = document.getElementById("available-groups-status");
const availableGroupsList = document.getElementById("available-groups-list");
const authStatus = document.getElementById("auth-status");
const linkGoogleButton = document.getElementById("link-google");
const commandScopeInput = document.getElementById("command-scope");
const privacyCommandInput = document.getElementById("privacy-command");
const revealCommandInput = document.getElementById("reveal-command");
const disableCommandInput = document.getElementById("disable-command");
const queryReminderAudienceInput = document.getElementById("query-reminder-audience");
const toggleCommandVisibilityButton = document.getElementById("toggle-command-visibility");
const createRoomButton = document.getElementById("create-room");
const openSettingsButton = document.getElementById("open-settings");
const leaveRoomButton = document.getElementById("leave-room");
const clearLocalMessagesButton = document.getElementById("clear-local-messages");
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
const CODEX_COMMAND = "/codex";
const QUERY_COMMAND = "/query";
const PLUGIN_COMMAND = "/plugin";
const LEAD_COMMAND = "/lead";
const COMMAND_AUTOCOMPLETE_LIMIT = 8;
const TASK_LIST_LIMIT = 50;
const LEAD_LIST_LIMIT = 25;
const TASK_PREVIEW_LIMIT = 3;
const MESSAGE_REACTION_OPTIONS = ["👍", "✅", "👀", "🙌"];
const TASK_TIMER_REMINDER_MS = 25 * 60 * 1000;
const TASK_TIMER_REPEAT_REMINDER_MS = 5 * 60 * 1000;
const TASK_TIMER_MAX_UNANSWERED_REMINDERS = 2;
const TASK_TIMER_REMINDER_SYNC_MS = 60 * 1000;
const DAY_IDLE_TASK_REMINDER_MS = 5 * 60 * 1000;
const QUERY_REMINDER_MS = 10 * 60 * 1000;
const QUERY_REMINDER_SYNC_MS = 60 * 1000;
const QUERY_REMINDER_MAX_MS = 21 * 24 * 60 * 60 * 1000;
const QUERY_REMINDER_AUDIENCE_ALL = "all";
const QUERY_REMINDER_AUDIENCE_ASKER = "asker";
const QUERY_REMINDER_AUDIENCE_OTHERS = "others";
const DEFAULT_QUERY_REMINDER_AUDIENCE = QUERY_REMINDER_AUDIENCE_ALL;
const QUERY_REMINDER_AUDIENCES = new Set([
  QUERY_REMINDER_AUDIENCE_ALL,
  QUERY_REMINDER_AUDIENCE_ASKER,
  QUERY_REMINDER_AUDIENCE_OTHERS,
]);
const PLUGIN_LEADS = "leads";
const SUPPORTED_PLUGINS = new Set([PLUGIN_LEADS]);
const BASE_SLASH_COMMANDS = [
  {
    label: "/plugin enable leads",
    insertText: "/plugin enable leads",
    hint: "Enable leads",
  },
  {
    label: "/plugin disable leads",
    insertText: "/plugin disable leads",
    hint: "Disable leads",
  },
  {
    label: "/plugin list",
    insertText: "/plugin list",
    hint: "Group plugins",
  },
  {
    label: "/task create <description> #label",
    insertText: "/task create ",
    hint: "Create task",
  },
  {
    label: "/task list",
    insertText: "/task list",
    hint: "Pending tasks",
  },
  {
    label: "/task view <id>",
    insertText: "/task view ",
    hint: "Share task",
  },
  {
    label: "/task process [#label]",
    insertText: "/task process ",
    hint: "One task at a time",
  },
  {
    label: "/task process continue",
    insertText: "/task process continue",
    hint: "Resume process",
  },
  {
    label: "/task complete <id>",
    insertText: "/task complete ",
    hint: "Complete task",
  },
  {
    label: "/task reopen <id>",
    insertText: "/task reopen ",
    hint: "Reopen task",
  },
  {
    label: "/task completed",
    insertText: "/task completed",
    hint: "Completed tasks",
  },
  {
    label: "/task current",
    insertText: "/task current",
    hint: "Current task",
  },
  {
    label: "/task day today <ids>",
    insertText: "/task day today ",
    hint: "Plan tasks",
  },
  {
    label: "/task day list",
    insertText: "/task day list",
    hint: "Planned tasks",
  },
  {
    label: "/task day review",
    insertText: "/task day review",
    hint: "Rollover review",
  },
  {
    label: "/task edit <id> <description> #label",
    insertText: "/task edit ",
    hint: "Edit task",
  },
  {
    label: "/task comment <id> <comment>",
    insertText: "/task comment ",
    hint: "Add comment",
  },
  {
    label: "/task comments <id>",
    insertText: "/task comments ",
    hint: "View comments",
  },
  {
    label: "/task subtask <id> <description>",
    insertText: "/task subtask ",
    hint: "Add subtask",
  },
  {
    label: "/task subtasks <id>",
    insertText: "/task subtasks ",
    hint: "View subtasks",
  },
  {
    label: "/task subtask done <id> <subtask>",
    insertText: "/task subtask done ",
    hint: "Complete subtask",
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
    label: "/task timers",
    insertText: "/task timers",
    hint: "Active timers",
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
    label: "/day free <reason>",
    insertText: "/day free ",
    hint: "Set free status",
  },
  {
    label: "/day status",
    insertText: "/day status",
    hint: "Day status",
  },
  {
    label: "/day end",
    insertText: "/day end",
    hint: "End day",
  },
  {
    label: "/day break start",
    insertText: "/day break start",
    hint: "Start break",
  },
  {
    label: "/day break stop",
    insertText: "/day break stop",
    hint: "Stop break",
  },
  {
    label: "/day break list",
    insertText: "/day break list",
    hint: "Breaks",
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
    label: "/codex <instruction>",
    insertText: "/codex ",
    hint: "Send to Codex",
  },
  {
    label: "/codex help",
    insertText: "/codex help",
    hint: "Codex bridge help",
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
  {
    label: "/query <question>",
    insertText: "/query ",
    hint: "Ask with reminders",
  },
  {
    label: "/query after 1h <question>",
    insertText: "/query after 1h ",
    hint: "Custom reminder",
  },
  {
    label: "/query task <task-id> <question>",
    insertText: "/query task ",
    hint: "Ask on task",
  },
  {
    label: "/query task <task-id> after 1d <question>",
    insertText: "/query task ",
    hint: "Task reminder",
  },
  {
    label: "/query list",
    insertText: "/query list",
    hint: "Pending queries",
  },
  {
    label: "/query respond <id> <response>",
    insertText: "/query respond ",
    hint: "Answer query",
  },
  {
    label: "/query close <id>",
    insertText: "/query close ",
    hint: "Close query",
  },
];
const PRIVACY_INVITE_COMMAND = "/privacy invite";
const PRIVACY_HIDE_ALL_COMMANDS = new Set(["/privacy hideall", "/privacy hide all"]);
const PRIVACY_PREVIEW_MS = 10000;
const SESSION_KEY = "firestore-chat-session";
const JOINED_ROOMS_KEY = "openbox-joined-rooms";
const MESSAGES_PAGE_SIZE = 25;
const LOCAL_ROOM_COMMANDS_KEY_PREFIX = "firestore-chat-room-commands";
const TASK_PROCESS_STATE_KEY_PREFIX = "firestore-chat-task-process";
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
  roomPlugins: {},
  groupQueryReminderAudience: DEFAULT_QUERY_REMINDER_AUDIENCE,
  queryReminderAudience: DEFAULT_QUERY_REMINDER_AUDIENCE,
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
  autocompleteRequestId: 0,
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
  taskTimerReminderSyncIntervalId: null,
  queryReminderTimeouts: new Map(),
  queryReminderSyncIntervalId: null,
  taskProcessSession: null,
  dayIdleTaskReminderTimeoutId: null,
  activeBreakStartedAt: null,
  lastBreakActivityPromptAt: 0,
  isNotificationsEnabled: loadNotificationsEnabled(),
  availableGroups: [],
  joinedRooms: loadJoinedRooms(),
  groupUnreadCounts: new Map(),
  groupUnreadState: new Map(),
  unsubscribeGroupUnreadCounts: new Map(),
  availableGroupsRequestId: 0,
  availableGroupsDebounceId: null,
  hasJoinedRoomOnce: false,
  isJoinFormExpanded: true,
};

boot();

async function boot() {
  registerServiceWorker();
  updateDocumentTitle();
  updateAppBadge();
  clearRoomCommandInputs();
  updateNotificationSettingsUi();
  updateLocalMessagesUi();
  renderAvailableGroups(state.joinedRooms, getAvailableGroupsStatus(state.joinedRooms, false));

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
    void refreshAvailableGroups();

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
  document.addEventListener("click", handleBreakActivity);
  document.addEventListener("keydown", handleBreakActivity);
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
  clearLocalMessagesButton.addEventListener("click", clearLocalMessages);
  commandScopeInput.addEventListener("change", handleCommandScopeChange);
  toggleCommandVisibilityButton.addEventListener("click", toggleAdvancedCommandVisibility);
  copyShareLinkButton.addEventListener("click", copyShareLink);
  closeShareLinkButton.addEventListener("click", hideShareLinkPanel);
  linkGoogleButton.addEventListener("click", linkGoogleAccount);
  showJoinFormButton.addEventListener("click", () => setJoinFormExpanded(true));
  roomPasscodeInput.addEventListener("input", scheduleAvailableGroupsRefresh);
  availableGroupsList.addEventListener("click", handleAvailableGroupClick);

  createRoomButton.addEventListener("click", () => {
    roomIdInput.value = generateRoomId();
    roomIdInput.focus();
  });

  joinForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await joinRoomFromForm();
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

async function joinRoomFromForm() {
  const displayName = displayNameInput.value.trim();
  const roomId = sanitizeRoomId(roomIdInput.value);
  const roomPasscode = normalizePasscode(roomPasscodeInput.value);
  await joinRoom(roomId, roomPasscode, displayName);
}

async function joinRoom(roomId, roomPasscode, displayName = displayNameInput.value.trim()) {
  try {
    roomId = sanitizeRoomId(roomId);
    roomPasscode = normalizePasscode(roomPasscode);

    if (!state.db || !state.auth) {
      setStatus("Add your app config before joining a room.", "error");
      return;
    }

    await state.authReady;

    if (!state.authUser) {
      setStatus("Auth is still starting. Try again in a moment.", "error");
      return;
    }

    if (!displayName) {
      setStatus("Enter a name before joining.", "error");
      setJoinFormExpanded(true);
      displayNameInput.focus();
      return;
    }

    if (!roomId) {
      setStatus("Enter a room code or generate one.", "error");
      setJoinFormExpanded(true);
      roomIdInput.focus();
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
      applyQueryReminderAudienceToInput(state.queryReminderAudience);
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
  } catch (error) {
    console.error(error);
    setStatus("We couldn't join that room. Check access rules and try again.", "error");
  }
}

function markRoomJoined() {
  state.hasJoinedRoomOnce = true;
  setJoinFormExpanded(false);
}

function setJoinFormExpanded(expanded) {
  state.isJoinFormExpanded = expanded;
  joinForm.hidden = state.hasJoinedRoomOnce && !expanded;
  showJoinFormButton.hidden = !state.hasJoinedRoomOnce || expanded;
}

function scheduleAvailableGroupsRefresh() {
  if (state.availableGroupsDebounceId) {
    window.clearTimeout(state.availableGroupsDebounceId);
  }

  state.availableGroupsDebounceId = window.setTimeout(() => {
    state.availableGroupsDebounceId = null;
    void refreshAvailableGroups();
  }, 250);
}

async function refreshAvailableGroups() {
  if (!state.db || !state.authUser) {
    renderAvailableGroups(state.joinedRooms, getAvailableGroupsStatus(state.joinedRooms, false));
    return;
  }

  const passcode = normalizePasscode(roomPasscodeInput.value);
  const requestId = ++state.availableGroupsRequestId;
  renderAvailableGroups(state.availableGroups, passcode ? "Looking for groups..." : getAvailableGroupsStatus(state.joinedRooms, false));

  try {
    const rooms = [...state.joinedRooms];
    const roomsRef = collection(state.db, "rooms");
    const joinedRoomsQuery = query(roomsRef, where("members", "array-contains", state.authUser.uid));
    const joinedSnapshot = await getDocs(joinedRoomsQuery);

    mergeAvailableRooms(
      rooms,
      joinedSnapshot.docs.map((roomDoc) => createAvailableRoom(roomDoc.id, roomDoc.data(), "joined"))
    );

    if (passcode) {
      const passcodeRoomsQuery = query(roomsRef, where("passcode", "==", passcode));
      const passcodeSnapshot = await getDocs(passcodeRoomsQuery);
      mergeAvailableRooms(
        rooms,
        passcodeSnapshot.docs.map((roomDoc) => createAvailableRoom(roomDoc.id, roomDoc.data(), "available"))
      );
    }

    if (requestId !== state.availableGroupsRequestId) {
      return;
    }

    rooms.sort((a, b) => a.id.localeCompare(b.id));

    renderAvailableGroups(rooms, getAvailableGroupsStatus(rooms, Boolean(passcode)));
    syncGroupUnreadCountListeners(rooms);
  } catch (error) {
    console.error(error);
    renderAvailableGroups(state.joinedRooms, "Saved groups are shown. New groups could not be loaded.");
    syncGroupUnreadCountListeners(state.joinedRooms);
  }
}

function getAvailableGroupsStatus(rooms, searchedPasscode) {
  if (rooms.length > 0) {
    return "Click a group to switch to it.";
  }

  return searchedPasscode
    ? "No groups found for this passcode yet."
    : "Joined groups will appear here. Enter a passcode to find more.";
}

function createAvailableRoom(roomId, roomData = {}, source = "joined") {
  return {
    id: roomId,
    name: roomData.name || roomId,
    passcode: roomData.passcode || "",
    source,
  };
}

function mergeAvailableRooms(rooms, nextRooms) {
  const existingById = new Map(rooms.map((room, index) => [room.id, index]));

  nextRooms.forEach((room) => {
    if (!room?.id) {
      return;
    }

    const existingIndex = existingById.get(room.id);
    if (existingIndex === undefined) {
      existingById.set(room.id, rooms.length);
      rooms.push(room);
      return;
    }

    rooms[existingIndex] = {
      ...rooms[existingIndex],
      ...room,
      passcode: room.passcode || rooms[existingIndex].passcode || "",
    };
  });
}

function renderAvailableGroups(rooms, status) {
  state.availableGroups = rooms;
  availableGroupsStatus.textContent = status;
  availableGroupsList.replaceChildren(
    ...rooms.map((room) => {
      const button = document.createElement("button");
      button.className = "available-group";
      button.type = "button";
      button.dataset.roomId = room.id;
      button.dataset.roomPasscode = room.passcode || "";
      button.disabled = room.id === state.roomId;

      const name = document.createElement("span");
      name.className = "available-group-name";
      name.textContent = room.name || room.id;

      const meta = document.createElement("span");
      meta.className = "available-group-meta";
      meta.textContent = room.id === state.roomId ? "Current" : "Join";

      const unreadCount = getGroupUnreadCount(room.id);

      button.append(name);

      if (unreadCount > 0) {
        const badge = document.createElement("span");
        badge.className = "available-group-count";
        badge.textContent = formatGroupUnreadCount(unreadCount);
        badge.setAttribute("aria-label", `${unreadCount} pending message${unreadCount === 1 ? "" : "s"}`);
        button.append(badge);
      }

      button.append(meta);
      return button;
    })
  );
}

function handleAvailableGroupClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const groupButton = event.target.closest(".available-group");
  if (!groupButton) {
    return;
  }

  const roomId = groupButton.dataset.roomId || "";
  const roomPasscode = normalizePasscode(groupButton.dataset.roomPasscode || roomPasscodeInput.value);
  roomIdInput.value = roomId;
  roomPasscodeInput.value = roomPasscode;
  void joinRoom(roomId, roomPasscode);
}

function syncGroupUnreadCountListeners(rooms = state.availableGroups) {
  if (!state.db || !getCurrentUserId()) {
    clearGroupUnreadCountListeners();
    return;
  }

  const roomIds = new Set(rooms.map((room) => room.id).filter(Boolean));

  state.unsubscribeGroupUnreadCounts.forEach((unsubscribe, roomId) => {
    if (!roomIds.has(roomId)) {
      unsubscribe();
      state.unsubscribeGroupUnreadCounts.delete(roomId);
      state.groupUnreadState.delete(roomId);
      state.groupUnreadCounts.delete(roomId);
    }
  });

  roomIds.forEach((roomId) => {
    if (!state.unsubscribeGroupUnreadCounts.has(roomId)) {
      subscribeToGroupUnreadCount(roomId);
    }
  });

  renderAvailableGroups(rooms, availableGroupsStatus.textContent);
}

function subscribeToGroupUnreadCount(roomId) {
  const userId = getCurrentUserId();
  if (!state.db || !userId || !roomId) {
    return;
  }

  const unreadState = {
    messages: [],
    receipt: null,
  };
  state.groupUnreadState.set(roomId, unreadState);

  const messagesQuery = query(
    collection(state.db, "rooms", roomId, "messages"),
    orderBy("createdAt", "desc"),
    limit(MESSAGES_PAGE_SIZE)
  );
  const receiptRef = doc(state.db, "rooms", roomId, "readReceipts", userId);

  const unsubscribeMessages = onSnapshot(
    messagesQuery,
    (snapshot) => {
      unreadState.messages = snapshot.docs.map((messageDoc) => ({
        id: messageDoc.id,
        ...messageDoc.data(),
      }));
      updateGroupUnreadCount(roomId);
    },
    (error) => {
      console.error(error);
    }
  );

  const unsubscribeReceipt = onSnapshot(
    receiptRef,
    (snapshot) => {
      unreadState.receipt = snapshot.exists() ? snapshot.data() : null;
      updateGroupUnreadCount(roomId);
    },
    (error) => {
      console.error(error);
    }
  );

  state.unsubscribeGroupUnreadCounts.set(roomId, () => {
    unsubscribeMessages();
    unsubscribeReceipt();
  });
}

function updateGroupUnreadCount(roomId) {
  const unreadState = state.groupUnreadState.get(roomId);
  const userId = getCurrentUserId();

  if (!unreadState || !userId) {
    return;
  }

  const lastReadMillis = getTimestampMillis(unreadState.receipt?.lastReadCreatedAt);
  const unreadCount = unreadState.messages.filter((message) => {
    if (message.senderId === userId) {
      return false;
    }

    const createdAtMillis = getTimestampMillis(message.createdAt);
    return createdAtMillis > lastReadMillis;
  }).length;

  setGroupUnreadCount(roomId, roomId === state.roomId ? 0 : unreadCount);
}

function setGroupUnreadCount(roomId, unreadCount) {
  const nextCount = Math.max(0, unreadCount);

  if (state.groupUnreadCounts.get(roomId) === nextCount) {
    return;
  }

  if (nextCount > 0) {
    state.groupUnreadCounts.set(roomId, nextCount);
  } else {
    state.groupUnreadCounts.delete(roomId);
  }

  renderAvailableGroups(state.availableGroups, availableGroupsStatus.textContent);
}

function getGroupUnreadCount(roomId) {
  if (roomId === state.roomId) {
    return 0;
  }

  return state.groupUnreadCounts.get(roomId) || 0;
}

function formatGroupUnreadCount(count) {
  return count > 99 ? "99+" : String(count);
}

function getCurrentUserId() {
  return state.profile?.id || state.authUser?.uid || "";
}

function clearGroupUnreadCountListeners() {
  state.unsubscribeGroupUnreadCounts.forEach((unsubscribe) => {
    unsubscribe();
  });
  state.unsubscribeGroupUnreadCounts.clear();
  state.groupUnreadState.clear();
  state.groupUnreadCounts.clear();
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
    clearGroupUnreadCountListeners();
    state.lastSyncedReadMessageId = null;
    state.pendingReadMessageId = null;
    renderMessages();
    queueReadReceiptSync();
    void refreshAvailableGroups();
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
      members: [state.profile.id],
      commands: {},
    };
    await setDoc(roomRef, roomData);
    return roomData;
  }

  const roomData = roomSnapshot.data();

  if (!roomData?.hasPasscode) {
    await setDoc(roomRef, {
      members: arrayUnion(state.profile.id),
    }, { merge: true });
    return roomData;
  }

  if (!roomPasscode) {
    throw new Error("ROOM_PASSCODE_REQUIRED");
  }

  if (roomData.passcode !== roomPasscode) {
    throw new Error("ROOM_PASSCODE_INVALID");
  }

  await setDoc(roomRef, {
    members: arrayUnion(state.profile.id),
  }, { merge: true });

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
  state.taskProcessSession = null;
  state.queryReminderTimeouts = new Map();
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
  markRoomJoined();
  recordJoinedRoom(roomId, roomPasscode, roomData);
  void refreshAvailableGroups();
  hideShareLinkPanel();
  renderEmptyState("No messages yet. Say hello.");
  applyRoomCommandsToInputs({});
  applyQueryReminderAudienceToInput(DEFAULT_QUERY_REMINDER_AUDIENCE);
  setAdvancedSettingsVisibility(false);

  await loadInitialMessages(roomId);
  subscribeToRoom(roomId);
  subscribeToReadReceipts(roomId);
  subscribeToLatestMessages(roomId);
  queueReadReceiptSync();
  scheduleDayIdleTaskReminder();
  startTaskTimerReminderSync();
  startQueryReminderSync();
  void announceTodaysLeaves();
  void postDailyTaskRolloverReview({ auto: true });
  void syncActiveBreakState();
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
  state.roomPlugins = normalizeRoomPlugins(roomData?.plugins);
  state.roomCommands = getEffectiveRoomCommands(state.roomId, state.groupRoomCommands);
  state.groupQueryReminderAudience = loadGroupQueryReminderAudience(roomData);
  state.queryReminderAudience = getEffectiveQueryReminderAudience(
    state.roomId,
    state.groupQueryReminderAudience
  );
  void syncQueryReminders();
  updatePrivacyFeatureAccess();

  if (messageInput.value.trimStart().startsWith("/")) {
    updateCommandAutocomplete();
  }
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
  clearTaskTimerReminderSync();
  clearTaskTimerReminders();
  clearQueryReminderSync();
  clearQueryReminders();
  clearDayIdleTaskReminder();
  clearMessageMaskRevealTimer();
  clearPrivacyPreviewTimer();
  state.roomId = null;
  state.roomPasscode = "";
  state.roomCommands = { ...DEFAULT_ROOM_COMMANDS };
  state.groupRoomCommands = {};
  state.roomPlugins = {};
  state.groupQueryReminderAudience = DEFAULT_QUERY_REMINDER_AUDIENCE;
  state.queryReminderAudience = DEFAULT_QUERY_REMINDER_AUDIENCE;
  state.activeBreakStartedAt = null;
  state.lastBreakActivityPromptAt = 0;
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
  syncBreakVisualState();
  updatePrivacyIndicator();
  updateLocalMessagesUi();
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
  wrapper.dataset.messageId = message.id || "";

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
  } else if (message.type === "task-process" && message.task) {
    wrapper.append(renderTaskProcessMessage(message));
  } else if (message.type === "task-comments" && message.task && Array.isArray(message.comments)) {
    wrapper.append(renderTaskCommentsMessage(message));
  } else if (message.type === "task-view" && message.task) {
    wrapper.append(renderTaskViewMessage(message));
  } else if (message.type === "query-list" && Array.isArray(message.queries)) {
    wrapper.append(renderQueryListMessage(message));
  } else if (message.type === "query-view" && message.query) {
    wrapper.append(renderQueryViewMessage(message));
  } else if (message.type === "lead-list" && Array.isArray(message.leads)) {
    wrapper.append(renderLeadListMessage(message));
  } else if (message.type === "lead-view" && message.lead) {
    wrapper.append(renderLeadViewMessage(message));
  } else {
    const body = document.createElement("p");
    body.className = "message-text";
    body.textContent = message.text;
    wrapper.append(body);

    if (Array.isArray(message.taskPreviews) && message.taskPreviews.length > 0) {
      wrapper.append(renderInlineTaskPreviews(message.taskPreviews));
    }
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

      if (action.queryId) {
        button.dataset.queryId = action.queryId;
      }

      if (action.leadId) {
        button.dataset.leadId = action.leadId;
      }

      if (action.successText) {
        button.dataset.successText = action.successText;
      }

      actions.append(button);
    });

    wrapper.append(actions);
  }

  if (!message.isLocalOnly) {
    wrapper.append(renderMessageReactions(message));
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

function renderMessageReactions(message) {
  const container = document.createElement("div");
  container.className = "message-reaction-bar";

  const picker = document.createElement("details");
  picker.className = "message-reaction-picker";

  const trigger = document.createElement("summary");
  trigger.className = "message-reaction-trigger";
  trigger.textContent = "\u{1f642}";
  trigger.title = "Add reaction";
  picker.append(trigger);

  const options = document.createElement("div");
  options.className = "message-reaction-options";

  MESSAGE_REACTION_OPTIONS.forEach((reaction) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "message-reaction-button";
    button.textContent = reaction;
    button.title = `React ${reaction}`;
    button.dataset.action = "message-react";
    button.dataset.messageId = message.id;
    button.dataset.reaction = reaction;
    button.classList.toggle("active", hasCurrentUserMessageReaction(message.reactions, reaction));
    options.append(button);
  });

  picker.append(options);
  container.append(picker);

  const summary = renderMessageReactionSummary(message.reactions);

  if (summary) {
    container.append(summary);
  }

  return container;
}

function renderMessageReactionSummary(reactions) {
  const entries = summarizeMessageReactions(reactions);

  if (entries.length === 0) {
    return null;
  }

  const list = document.createElement("div");
  list.className = "message-reactions";

  entries.forEach((entry) => {
    const item = document.createElement("span");
    item.className = "message-reaction-summary";
    item.textContent = `${entry.reaction} ${entry.count}`;
    item.title = entry.userNames.join(", ");
    list.append(item);
  });

  return list;
}

function renderMessages(options = {}) {
  updateLocalMessagesUi();

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
    list.append(
      renderTaskListItem(task, {
        maskIdentity: Boolean(message.maskIdentity),
        rolloverReview: Boolean(message.rolloverReview),
        rolloverDateKey: message.rolloverDateKey || "",
        privateAliases: message.privateAliases || {},
      })
    );
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

  const commentCount = Number.isFinite(task.commentCount) ? task.commentCount : 0;
  const subtaskSummary = getSubtaskSummary(task);

  main.append(id, title);

  if (!options.hideActions) {
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "task-list-edit";
    editButton.textContent = "Edit";
    editButton.dataset.action = "task-edit-draft";
    editButton.dataset.taskId = task.id;
    editButton.dataset.taskDescription = task.description || "";

    const commentButton = document.createElement("button");
    commentButton.type = "button";
    commentButton.className = "task-list-edit";
    commentButton.textContent = "Comment";
    commentButton.dataset.action = "task-comment-draft";
    commentButton.dataset.taskId = task.id;

    const commentsButton = document.createElement("button");
    commentsButton.type = "button";
    commentsButton.className = "task-list-edit";
    commentsButton.textContent = commentCount > 0 ? `Comments (${commentCount})` : "Comments";
    commentsButton.dataset.action = "task-comments-list";
    commentsButton.dataset.taskId = task.id;

    const viewButton = document.createElement("button");
    viewButton.type = "button";
    viewButton.className = "task-list-edit";
    viewButton.textContent = "View";
    viewButton.dataset.action = "task-view";
    viewButton.dataset.taskId = task.id;

    const actions = document.createElement("div");
    actions.className = "task-list-actions";

    if (task.status === "complete") {
      const reopenButton = document.createElement("button");
      reopenButton.type = "button";
      reopenButton.className = "task-list-edit";
      reopenButton.textContent = "Reopen";
      reopenButton.dataset.action = "task-reopen";
      reopenButton.dataset.taskId = task.id;
      actions.append(reopenButton);
    }

    if (options.rolloverReview) {
      const carryButton = document.createElement("button");
      carryButton.type = "button";
      carryButton.className = "task-list-edit";
      carryButton.textContent = "Carry to today";
      carryButton.dataset.action = "task-day-carry";
      carryButton.dataset.taskId = task.id;
      carryButton.dataset.sourceDateKey = options.rolloverDateKey || "";

      const completeButton = document.createElement("button");
      completeButton.type = "button";
      completeButton.className = "task-list-edit";
      completeButton.textContent = "Complete";
      completeButton.dataset.action = "task-day-complete";
      completeButton.dataset.taskId = task.id;
      completeButton.dataset.sourceDateKey = options.rolloverDateKey || "";

      const skipButton = document.createElement("button");
      skipButton.type = "button";
      skipButton.className = "task-list-edit";
      skipButton.textContent = "Skip";
      skipButton.dataset.action = "task-day-skip";
      skipButton.dataset.taskId = task.id;
      skipButton.dataset.sourceDateKey = options.rolloverDateKey || "";

      actions.append(carryButton, completeButton, skipButton);
    }

    actions.append(viewButton, editButton, commentButton, commentsButton);
    main.append(actions);
  }

  const meta = document.createElement("div");
  meta.className = "task-list-item-meta";

  if (task.status === "complete" || task.completedAt) {
    const completedBy = document.createElement("span");
    completedBy.textContent = `Completed by ${formatTaskPersonName(
      task.completedBy,
      task.completedByName || "Unknown",
      options.privateAliases,
      { maskIdentity }
    )}`;
    meta.append(completedBy);

    const completedAt = document.createElement("span");
    completedAt.textContent = `Completed ${formatTaskTimestamp(task.completedAt)}`;
    meta.append(completedAt);
  } else if (!maskIdentity) {
    const creator = document.createElement("span");
    creator.textContent = task.createdByName || "Unknown";
    meta.append(creator);

    const createdAt = document.createElement("span");
    createdAt.textContent = formatTaskTimestamp(task.createdAt);
    meta.append(createdAt);
  } else {
    const createdAt = document.createElement("span");
    createdAt.textContent = `Created ${formatTaskTimestamp(task.createdAt)}`;
    meta.append(createdAt);
  }

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

  if (commentCount > 0) {
    const comments = document.createElement("span");
    comments.className = "task-list-badge";
    comments.textContent = `${commentCount} comment${commentCount === 1 ? "" : "s"}`;
    meta.append(comments);
  }

  if (subtaskSummary.total > 0) {
    const subtasks = document.createElement("span");
    subtasks.className = "task-list-badge";
    subtasks.textContent = `${subtaskSummary.completed}/${subtaskSummary.total} subtasks`;
    meta.append(subtasks);
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

  item.append(renderTaskSubtasksPanel(task, { compact: true }));

  return item;
}

function renderTaskActionButtons(task) {
  const actions = document.createElement("div");
  actions.className = "task-list-actions";

  const buttonDefinitions = [];

  if (task.status === "complete") {
    buttonDefinitions.push({ label: "Reopen", action: "task-reopen" });
  } else {
    buttonDefinitions.push({ label: "Complete", action: "task-complete" });

    if (task.activeTimerStartedAt && isCurrentUserTaskTimerOwner(task)) {
      buttonDefinitions.push(
        { label: "Continue", action: "task-continue" },
        { label: "Stop timer", action: "task-stop" }
      );
    } else if (!task.activeTimerStartedAt) {
      buttonDefinitions.push({ label: "Start timer", action: "task-start" });
    }
  }

  buttonDefinitions.push(
    { label: "Comment", action: "task-comment-draft" },
    { label: "Subtask", action: "task-subtask-draft" },
    { label: "Query", action: "task-query-draft" }
  );

  buttonDefinitions.forEach((definition) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "task-list-edit";
    button.textContent = definition.label;
    button.dataset.action = definition.action;
    button.dataset.taskId = task.id;
    actions.append(button);
  });

  return actions;
}

function renderTaskViewMessage(message) {
  const container = document.createElement("div");
  container.className = "task-view-message";

  const header = document.createElement("div");
  header.className = "task-list-header";

  const title = document.createElement("strong");
  title.textContent = message.heading || "Task";

  const id = document.createElement("span");
  id.className = "task-list-count";
  id.textContent = formatTaskId(message.task.id);

  header.append(title, id);
  container.append(header);
  container.append(renderTaskPreviewCard(message.task, { showDescription: true }));
  container.append(renderTaskActionButtons(message.task));

  if (Array.isArray(message.comments)) {
    container.append(
      renderTaskCommentsPanel(message.task, message.comments, {
        emptyText: "No comments yet.",
        title: "Comments",
        maskIdentity: Boolean(message.maskIdentity),
      })
    );
  }

  return container;
}

function renderQueryViewMessage(message) {
  const queryData = message.query;
  const container = document.createElement("div");
  container.className = "query-view-message";

  const header = document.createElement("div");
  header.className = "task-list-header";

  const title = document.createElement("strong");
  title.textContent = queryData.status === "answered" ? "Answered query" : "Pending query";

  const id = document.createElement("span");
  id.className = "task-list-count";
  id.textContent = formatQueryId(queryData.id);

  header.append(title, id);
  container.append(header);

  container.append(renderQueryPreviewCard(queryData));

  return container;
}

function renderQueryListMessage(message) {
  const container = document.createElement("div");
  container.className = "query-list-message";

  const header = document.createElement("div");
  header.className = "task-list-header";

  const title = document.createElement("strong");
  title.textContent = message.heading || "Pending queries";

  const count = document.createElement("span");
  count.className = "task-list-count";
  count.textContent = `${message.queries.length} quer${message.queries.length === 1 ? "y" : "ies"}`;

  header.append(title, count);
  container.append(header);

  const list = document.createElement("ol");
  list.className = "query-list";

  message.queries.forEach((queryData) => {
    const item = document.createElement("li");
    item.append(renderQueryPreviewCard(queryData, { allowClose: true }));
    list.append(item);
  });

  container.append(list);

  return container;
}

function renderQueryPreviewCard(queryData, options = {}) {
  const card = document.createElement("article");
  card.className = "query-preview-card";

  const top = document.createElement("div");
  top.className = "task-preview-top";

  const id = document.createElement("span");
  id.className = "task-list-id";
  id.textContent = formatQueryId(queryData.id);
  id.title = queryData.id;

  const status = document.createElement("span");
  status.className = `query-preview-status ${queryData.status === "answered" ? "answered" : "pending"}`;
  status.textContent = queryData.status === "answered" ? "Answered" : "Pending";

  top.append(id, status);

  const question = document.createElement("p");
  question.className = "task-preview-title";
  question.textContent = queryData.text || "Untitled query";

  card.append(top, question);

  const meta = document.createElement("div");
  meta.className = "task-preview-meta";

  if (queryData.createdByName) {
    const creator = document.createElement("span");
    creator.textContent = `Asked by ${formatQueryPersonName(queryData.createdBy, queryData.createdByName)}`;
    meta.append(creator);
  }

  const createdAt = document.createElement("span");
  createdAt.textContent = formatTaskTimestamp(queryData.createdAt);
  meta.append(createdAt);

  const reminder = document.createElement("span");
  reminder.textContent = `Reminds every ${formatDuration(getQueryReminderIntervalMs(queryData))}`;
  meta.append(reminder);

  if (queryData.taskId) {
    const taskLink = document.createElement("span");
    taskLink.textContent = `Task ${formatTaskId(queryData.taskId)}`;
    meta.append(taskLink);
  }

  card.append(meta);

  if (queryData.taskId && queryData.taskDescription) {
    const task = document.createElement("p");
    task.className = "query-linked-task";
    task.textContent = queryData.taskDescription;
    card.append(task);
  }

  if (queryData.status === "answered") {
    const response = document.createElement("div");
    response.className = "query-response";
    const answeredByName = formatQueryPersonName(queryData.answeredBy, queryData.answeredByName || "someone");

    const label = document.createElement("strong");
    label.textContent = queryData.responseText ? `Response from ${answeredByName}` : "Closed";

    const body = document.createElement("p");
    body.textContent = queryData.responseText || `Closed by ${answeredByName}.`;

    response.append(label, body);
    card.append(response);
  }

  if (!options.hideActions && queryData.status !== "answered") {
    const actions = document.createElement("div");
    actions.className = "task-list-actions";

    const respondButton = document.createElement("button");
    respondButton.type = "button";
    respondButton.className = "task-list-edit";
    respondButton.textContent = "Respond";
    respondButton.dataset.action = "query-respond-draft";
    respondButton.dataset.queryId = queryData.id;

    actions.append(respondButton);

    if (queryData.createdBy === state.profile?.id || options.allowClose) {
      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = "task-list-edit";
      closeButton.textContent = "Close";
      closeButton.dataset.action = "query-close";
      closeButton.dataset.queryId = queryData.id;
      actions.append(closeButton);
    }

    card.append(actions);
  }

  return card;
}

function renderLeadViewMessage(message) {
  const lead = message.lead;
  const container = document.createElement("div");
  container.className = "lead-view-message";

  const header = document.createElement("div");
  header.className = "task-list-header";

  const title = document.createElement("strong");
  title.textContent = "Lead";

  const id = document.createElement("span");
  id.className = "task-list-count";
  id.textContent = formatLeadId(lead.id);

  header.append(title, id);
  container.append(header);
  container.append(renderLeadPreviewCard(lead));

  return container;
}

function renderLeadListMessage(message) {
  const container = document.createElement("div");
  container.className = "lead-list-message";

  const header = document.createElement("div");
  header.className = "task-list-header";

  const title = document.createElement("strong");
  title.textContent = message.heading || "Recent leads";

  const count = document.createElement("span");
  count.className = "task-list-count";
  count.textContent = `${message.leads.length} lead${message.leads.length === 1 ? "" : "s"}`;

  header.append(title, count);
  container.append(header);

  const list = document.createElement("ol");
  list.className = "query-list";

  message.leads.forEach((lead) => {
    const item = document.createElement("li");
    item.append(renderLeadPreviewCard(lead, { localActions: true }));
    list.append(item);
  });

  container.append(list);
  return container;
}

function renderLeadPreviewCard(lead, options = {}) {
  const card = document.createElement("article");
  card.className = "query-preview-card lead-preview-card";

  const top = document.createElement("div");
  top.className = "task-preview-top";

  const id = document.createElement("span");
  id.className = "task-list-id";
  id.textContent = formatLeadId(lead.id);
  id.title = lead.id || "";

  const status = document.createElement("span");
  status.className = "query-preview-status pending";
  status.textContent = lead.status || "new";

  top.append(id, status);

  const name = document.createElement("p");
  name.className = "task-preview-title";
  name.textContent = lead.name || "Untitled lead";

  card.append(top, name);

  const meta = document.createElement("div");
  meta.className = "task-preview-meta";

  [
    lead.company,
    lead.phone ? `Phone ${lead.phone}` : "",
    lead.email ? `Email ${lead.email}` : "",
    lead.source ? `Source ${lead.source}` : "",
    lead.owner ? `Owner ${lead.owner}` : "",
  ]
    .filter(Boolean)
    .forEach((value) => {
      const item = document.createElement("span");
      item.textContent = value;
      meta.append(item);
    });

  const createdAt = document.createElement("span");
  createdAt.textContent = formatTaskTimestamp(lead.createdAt);
  meta.append(createdAt);
  card.append(meta);

  if (lead.notes) {
    const notes = document.createElement("p");
    notes.className = "query-linked-task";
    notes.textContent = lead.notes;
    card.append(notes);
  }

  if (!options.hideActions) {
    const actions = document.createElement("div");
    actions.className = "task-list-actions";

    const updateButton = document.createElement("button");
    updateButton.type = "button";
    updateButton.className = "task-list-edit";
    updateButton.textContent = "Update";
    updateButton.dataset.action = "lead-update-draft";
    updateButton.dataset.leadId = lead.id || "";

    actions.append(updateButton);

    if (options.localActions) {
      const viewButton = document.createElement("button");
      viewButton.type = "button";
      viewButton.className = "task-list-edit";
      viewButton.textContent = "View";
      viewButton.dataset.action = "lead-view";
      viewButton.dataset.leadId = lead.id || "";
      actions.prepend(viewButton);
    }

    card.append(actions);
  }

  return card;
}

function renderInlineTaskPreviews(tasks) {
  const container = document.createElement("div");
  container.className = "inline-task-previews";

  tasks.forEach((task) => {
    container.append(renderTaskPreviewCard(task));
  });

  return container;
}

function renderTaskPreviewCard(task, options = {}) {
  const card = document.createElement("article");
  card.className = "task-preview-card";

  const top = document.createElement("div");
  top.className = "task-preview-top";

  const id = document.createElement("span");
  id.className = "task-list-id";
  id.textContent = formatTaskId(task.id);
  id.title = task.id;

  const status = document.createElement("span");
  status.className = `task-preview-status ${task.status === "complete" ? "complete" : "pending"}`;
  status.textContent = task.status === "complete" ? "Complete" : "Pending";

  top.append(id, status);

  const title = document.createElement("p");
  title.className = "task-preview-title";
  title.textContent = task.description || "Untitled task";

  card.append(top, title);

  const meta = document.createElement("div");
  meta.className = "task-preview-meta";

  if (task.createdByName) {
    const creator = document.createElement("span");
    creator.textContent = task.createdByName;
    meta.append(creator);
  }

  const createdAt = document.createElement("span");
  createdAt.textContent = formatTaskTimestamp(task.createdAt);
  meta.append(createdAt);

  const commentCount = Number.isFinite(task.commentCount) ? task.commentCount : 0;
  if (commentCount > 0) {
    const comments = document.createElement("span");
    comments.textContent = `${commentCount} comment${commentCount === 1 ? "" : "s"}`;
    meta.append(comments);
  }

  if (task.activeTimerStartedAt) {
    const running = document.createElement("span");
    running.textContent = `Running by ${task.activeTimerStartedByName || "someone"}`;
    meta.append(running);
  }

  card.append(meta);

  card.append(renderTaskSubtasksPanel(task, { compact: true }));

  if (Array.isArray(task.labels) && task.labels.length > 0) {
    const labels = document.createElement("div");
    labels.className = "task-list-labels";

    task.labels.forEach((label) => {
      const chip = document.createElement("span");
      chip.className = "task-label";
      chip.textContent = `#${label}`;
      labels.append(chip);
    });

    card.append(labels);
  }

  return card;
}

function renderTaskSubtasksPanel(task, options = {}) {
  const subtasks = normalizeSubtasks(task.subtasks);

  if (subtasks.length === 0) {
    return document.createDocumentFragment();
  }

  const summary = getSubtaskSummary(task);
  const panel = document.createElement("section");
  panel.className = "task-subtasks-panel";
  panel.classList.toggle("compact", Boolean(options.compact));

  const heading = document.createElement("div");
  heading.className = "task-subtasks-heading";

  const title = document.createElement("strong");
  title.textContent = "Subtasks";

  const count = document.createElement("span");
  count.textContent = `${summary.completed}/${summary.total}`;

  heading.append(title, count);
  panel.append(heading);

  const list = document.createElement("ol");
  list.className = "task-subtasks-list";

  subtasks.forEach((subtask) => {
    const item = document.createElement("li");
    item.className = "task-subtask";
    item.classList.toggle("complete", subtask.status === "complete");

    const id = document.createElement("span");
    id.className = "task-subtask-id";
    id.textContent = formatSubtaskId(subtask.id);

    const text = document.createElement("span");
    text.className = "task-subtask-text";
    text.textContent = subtask.text || "Untitled subtask";

    item.append(id, text);
    list.append(item);
  });

  panel.append(list);
  return panel;
}

function renderTaskProcessMessage(message) {
  const container = document.createElement("div");
  container.className = "task-process-message";

  const header = document.createElement("div");
  header.className = "task-list-header";

  const title = document.createElement("strong");
  title.textContent = message.heading || "Task process";

  const count = document.createElement("span");
  count.className = "task-list-count";
  count.textContent = `${message.remainingCount} left`;

  header.append(title, count);
  container.append(header);

  container.append(
    renderTaskListItem(message.task, {
      maskIdentity: Boolean(message.maskIdentity),
      hideActions: true,
    })
  );

  container.append(
    renderTaskCommentsPanel(message.task, message.comments || [], {
      emptyText: "No comments yet.",
      title: "Comments",
      maskIdentity: Boolean(message.maskIdentity),
    })
  );

  const hint = document.createElement("p");
  hint.className = "task-process-hint";
  hint.textContent = message.hint || "Choose an option below to keep moving through the list.";
  container.append(hint);

  return container;
}

function renderTaskCommentsMessage(message) {
  const container = document.createElement("div");
  container.className = "task-comments-message";

  const header = document.createElement("div");
  header.className = "task-list-header";

  const title = document.createElement("strong");
  title.textContent = `Comments for ${formatTaskId(message.task.id)}`;

  const count = document.createElement("span");
  count.className = "task-list-count";
  count.textContent = `${message.comments.length} comment${message.comments.length === 1 ? "" : "s"}`;

  header.append(title, count);
  container.append(header);

  const taskTitle = document.createElement("p");
  taskTitle.className = "task-comments-task";
  taskTitle.textContent = message.task.description || "Untitled task";
  container.append(taskTitle);

  container.append(
    renderTaskCommentsPanel(message.task, message.comments, {
      title: "Thread",
      maskIdentity: Boolean(message.maskIdentity),
    })
  );

  return container;
}

function renderTaskCommentsPanel(task, comments, options = {}) {
  const maskIdentity = Boolean(options.maskIdentity);
  const privateAliases = maskIdentity ? createTaskCommentPrivacyAliases(comments) : null;
  const panel = document.createElement("section");
  panel.className = "task-comments-panel";

  const heading = document.createElement("div");
  heading.className = "task-comments-panel-heading";

  const title = document.createElement("strong");
  title.textContent = options.title || "Comments";

  const count = document.createElement("span");
  count.textContent = `${comments.length}`;

  heading.append(title, count);
  panel.append(heading);

  if (comments.length === 0) {
    const empty = document.createElement("p");
    empty.className = "task-comments-empty";
    empty.textContent = options.emptyText || `No comments for ${formatTaskId(task.id)}.`;
    panel.append(empty);
    return panel;
  }

  const list = document.createElement("ol");
  list.className = "task-comments-list";

  comments.forEach((comment) => {
    const item = document.createElement("li");
    item.className = "task-comment";

    const meta = document.createElement("div");
    meta.className = "task-comment-meta";

    const author = document.createElement("strong");
    author.textContent = formatTaskCommentAuthor(comment, privateAliases, { maskIdentity });

    const time = document.createElement("span");
    time.textContent = formatTaskTimestamp(comment.createdAt);

    meta.append(author, time);

    const text = document.createElement("p");
    text.className = "task-comment-text";
    text.textContent = formatTaskCommentText(comment, privateAliases, { maskIdentity });

    item.append(meta, text);
    list.append(item);
  });

  panel.append(list);
  return panel;
}

function handleMessageActionClick(event) {
  const actionButton = event.target.closest("[data-action]");

  if (!actionButton || !messagesContainer.contains(actionButton)) {
    return;
  }

  if (actionButton.dataset.action === "task-continue") {
    runLocalAction(actionButton, () => continueTaskTimer(actionButton.dataset.taskId || ""), "Timer continued.");
  }

  if (actionButton.dataset.action === "day-break-stop") {
    runLocalAction(actionButton, () => stopActiveBreak(), (breakEntry) =>
      breakEntry
        ? `Break stopped after ${formatDuration(breakEntry.durationMs)}.`
        : "No break is running."
    );
  }

  if (actionButton.dataset.action === "task-start") {
    runLocalAction(actionButton, () => startTaskTimer(actionButton.dataset.taskId || ""), "Timer started.");
  }

  if (actionButton.dataset.action === "task-complete") {
    runLocalAction(actionButton, () => completeTask(actionButton.dataset.taskId || ""), "Task completed.");
  }

  if (actionButton.dataset.action === "task-reopen") {
    runLocalAction(actionButton, () => reopenTask(actionButton.dataset.taskId || ""), "Task reopened.");
  }

  if (actionButton.dataset.action === "message-react") {
    actionButton.disabled = true;
    const picker = actionButton.closest("details");
    if (picker) {
      picker.open = false;
    }
    void toggleMessageReaction(actionButton.dataset.messageId || "", actionButton.dataset.reaction || "").finally(() => {
      actionButton.disabled = false;
    });
  }

  if (actionButton.dataset.action === "task-edit-draft") {
    draftTaskEdit(actionButton.dataset.taskId || "", actionButton.dataset.taskDescription || "");
  }

  if (actionButton.dataset.action === "task-comment-draft") {
    draftTaskComment(actionButton.dataset.taskId || "");
  }

  if (actionButton.dataset.action === "task-subtask-draft") {
    draftTaskSubtask(actionButton.dataset.taskId || "");
  }

  if (actionButton.dataset.action === "task-query-draft") {
    draftTaskQuery(actionButton.dataset.taskId || "");
  }

  if (actionButton.dataset.action === "task-comments-list") {
    actionButton.disabled = true;
    void postTaskComments(actionButton.dataset.taskId || "").finally(() => {
      actionButton.disabled = false;
    });
  }

  if (actionButton.dataset.action === "task-view") {
    actionButton.disabled = true;
    void postTaskView(actionButton.dataset.taskId || "").finally(() => {
      actionButton.disabled = false;
    });
  }

  if (actionButton.dataset.action === "task-day-carry") {
    runLocalAction(
      actionButton,
      () => carryDailyTaskToToday(actionButton.dataset.taskId || "", actionButton.dataset.sourceDateKey || ""),
      "Task carried to today."
    );
  }

  if (actionButton.dataset.action === "task-day-complete") {
    runLocalAction(
      actionButton,
      () => completeDailyTaskReviewItem(actionButton.dataset.taskId || "", actionButton.dataset.sourceDateKey || ""),
      "Task completed."
    );
  }

  if (actionButton.dataset.action === "task-day-skip") {
    runLocalAction(
      actionButton,
      () => skipDailyTaskReviewItem(actionButton.dataset.taskId || "", actionButton.dataset.sourceDateKey || ""),
      "Task skipped."
    );
  }

  if (actionButton.dataset.action === "task-process-complete") {
    runLocalAction(actionButton, () => completeTaskProcessItem(actionButton.dataset.taskId || ""), "Task completed.");
  }

  if (actionButton.dataset.action === "task-process-skip") {
    runLocalAction(actionButton, () => skipTaskProcessItem(actionButton.dataset.taskId || ""), "Task skipped.");
  }

  if (actionButton.dataset.action === "task-process-stop") {
    runLocalAction(actionButton, () => stopTaskProcess(), "Task process stopped.");
  }

  if (actionButton.dataset.action === "task-stop") {
    runLocalAction(actionButton, () => stopTaskTimer(actionButton.dataset.taskId || ""), "Timer stopped.");
  }

  if (actionButton.dataset.action === "general-timer-continue") {
    runLocalAction(actionButton, () => continueGeneralTimer(), "General timer continued.");
  }

  if (actionButton.dataset.action === "general-timer-stop") {
    runLocalAction(actionButton, () => stopGeneralTimer(), "General timer stopped.");
  }

  if (actionButton.dataset.action === "query-respond-draft") {
    draftQueryResponse(actionButton.dataset.queryId || "");
  }

  if (actionButton.dataset.action === "query-close") {
    runLocalAction(actionButton, () => closeQuery(actionButton.dataset.queryId || ""), "Query closed.");
  }

  if (actionButton.dataset.action === "lead-update-draft") {
    draftLeadUpdate(actionButton.dataset.leadId || "");
  }

  if (actionButton.dataset.action === "lead-view") {
    actionButton.disabled = true;
    void postLeadView(actionButton.dataset.leadId || "").finally(() => {
      actionButton.disabled = false;
    });
  }
}

function renderEmptyState(message) {
  const placeholder = document.createElement("div");
  placeholder.className = "empty-state";
  placeholder.textContent = message;
  messagesContainer.replaceChildren(placeholder);
}

function renderPrivacyState() {
  updateLocalMessagesUi();

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

    if (isCodexCommand(text)) {
      await handleCodexCommand(text);
      return;
    }

    if (isQueryCommand(text)) {
      await handleQueryCommand(text);
      return;
    }

    if (isPluginCommand(text)) {
      await handlePluginCommand(text);
      return;
    }

    if (isLeadCommand(text)) {
      await handleLeadCommand(text);
      return;
    }

    const taskPreviews = await buildTaskPreviewsForText(text);
    const messagePayload = {
      text,
      senderId: state.profile.id,
      senderName: getProfileDisplayName(),
      createdAt: serverTimestamp(),
    };

    if (taskPreviews.length > 0) {
      messagePayload.taskPreviews = taskPreviews;
    }

    await addDoc(collection(state.db, "rooms", state.roomId, "messages"), messagePayload);

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
        : isCodexCommand(text)
          ? "Codex command failed. Check the command and room permissions."
        : isQueryCommand(text)
          ? "Query command failed. Check the command and room permissions."
        : isPluginCommand(text)
          ? "Plugin command failed. Check the command and room permissions."
        : isLeadCommand(text)
          ? "Lead command failed. Check the command and room permissions."
        : "Message send failed. Check room permissions.",
      "error"
    );
  }
}

async function updateCommandAutocomplete() {
  const requestId = state.autocompleteRequestId + 1;
  state.autocompleteRequestId = requestId;
  const value = messageInput.value;
  const cursorIndex = messageInput.selectionStart ?? value.length;
  const matches = await getComposerAutocompleteMatches(value, cursorIndex);

  if (requestId !== state.autocompleteRequestId || value !== messageInput.value) {
    return;
  }

  state.commandSuggestionMatches = matches;
  state.selectedCommandSuggestionIndex = 0;

  if (matches.length === 0) {
    hideCommandAutocomplete();
    void maybeHydrateTaskEditDraft();
    return;
  }

  renderCommandAutocomplete();
  void maybeHydrateTaskEditDraft();
}

async function getComposerAutocompleteMatches(value, cursorIndex = value.length) {
  const commandMatches = getCommandAutocompleteMatches(value);

  if (commandMatches.length > 0) {
    return commandMatches;
  }

  return getHashAutocompleteMatches(value, cursorIndex);
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
  }).slice(0, COMMAND_AUTOCOMPLETE_LIMIT);
}

async function getHashAutocompleteMatches(value, cursorIndex = value.length) {
  const context = getHashAutocompleteContext(value, cursorIndex);

  if (!context || !state.db || !state.roomId) {
    return [];
  }

  const queryText = context.query.toLowerCase();
  const tasks = (await loadRoomTasks()).sort(compareTasksForAutocomplete);
  const taskSuggestions = tasks
    .filter((task) => task.id.toLowerCase().startsWith(queryText))
    .map((task) => ({
      label: formatTaskId(task.id),
      insertText: formatTaskId(task.id),
      hint: task.description || "Task",
      replaceStart: context.start,
      replaceEnd: context.end,
      type: "task-id",
      taskId: task.id,
    }));
  const labelSuggestions = getTaskLabelSuggestions(tasks, queryText, context);

  if (!queryText) {
    return [...taskSuggestions.slice(0, 5), ...labelSuggestions.slice(0, 3)].slice(0, COMMAND_AUTOCOMPLETE_LIMIT);
  }

  return [...taskSuggestions, ...labelSuggestions].slice(0, COMMAND_AUTOCOMPLETE_LIMIT);
}

function getHashAutocompleteContext(value, cursorIndex = value.length) {
  const beforeCursor = value.slice(0, cursorIndex);
  const match = beforeCursor.match(/(^|\s)#([a-z0-9_-]*)$/i);

  if (!match) {
    return null;
  }

  const token = `#${match[2]}`;
  return {
    query: match[2] || "",
    start: cursorIndex - token.length,
    end: cursorIndex,
  };
}

function getTaskLabelSuggestions(tasks, queryText, context) {
  const labels = new Set();

  tasks.forEach((task) => {
    if (!Array.isArray(task.labels)) {
      return;
    }

    task.labels.forEach((label) => {
      const normalizedLabel = String(label || "").trim().toLowerCase();

      if (normalizedLabel) {
        labels.add(normalizedLabel);
      }
    });
  });

  return [...labels]
    .sort((left, right) => left.localeCompare(right))
    .filter((label) => label.startsWith(queryText))
    .map((label) => ({
      label: `#${label}`,
      insertText: `#${label}`,
      hint: "Tag",
      replaceStart: context.start,
      replaceEnd: context.end,
      type: "tag",
    }));
}

function compareTasksForAutocomplete(left, right) {
  if (left.status !== right.status) {
    return left.status === "pending" ? -1 : 1;
  }

  return compareTasksByCreatedAt(left, right);
}

function getAvailableSlashCommands() {
  const commands = [...BASE_SLASH_COMMANDS];

  if (isRoomPluginEnabled(PLUGIN_LEADS)) {
    commands.push(
      {
        label: "/lead <name> phone:<phone>",
        insertText: "/lead ",
        hint: "Create lead",
      },
      {
        label: "/lead new",
        insertText: "/lead new",
        hint: "Lead template",
      },
      {
        label: "/lead list",
        insertText: "/lead list",
        hint: "Recent leads",
      },
      {
        label: "/lead view <id>",
        insertText: "/lead view ",
        hint: "Share lead",
      },
      {
        label: "/lead update <id> status:<status>",
        insertText: "/lead update ",
        hint: "Update lead",
      }
    );
  }

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
      {
        label: "/privacy hideall",
        insertText: "/privacy hideall",
        hint: "Hide all messages",
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

  if (Number.isFinite(command.replaceStart) && Number.isFinite(command.replaceEnd)) {
    const before = messageInput.value.slice(0, command.replaceStart);
    const after = messageInput.value.slice(command.replaceEnd);
    const suffix = after ? (/^\s/.test(after) ? "" : " ") : " ";
    messageInput.value = `${before}${command.insertText}${suffix}${after}`;
    const cursorIndex = before.length + command.insertText.length + suffix.length;
    messageInput.setSelectionRange(cursorIndex, cursorIndex);
  } else {
    messageInput.value = command.insertText;
    messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
  }

  syncMessageMaskOverlay();
  hideCommandAutocomplete();
  messageInput.focus();
  void maybeHydrateTaskEditDraft();
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

  if (PRIVACY_HIDE_ALL_COMMANDS.has(normalized)) {
    if (!state.canUsePrivacyFeature) {
      setStatus("Privacy mode needs to be invited for this account before it can be used here.", "error");
      return true;
    }

    hideAllPrivacyMessages();
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
    clearLocalMessages({ silent: true });
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

function isCodexCommand(text) {
  const normalized = text.trim().toLowerCase();
  return normalized === CODEX_COMMAND || normalized.startsWith(`${CODEX_COMMAND} `);
}

function isQueryCommand(text) {
  const normalized = text.trim().toLowerCase();
  return normalized === QUERY_COMMAND || normalized.startsWith(`${QUERY_COMMAND} `);
}

function isPluginCommand(text) {
  const normalized = text.trim().toLowerCase();
  return normalized === PLUGIN_COMMAND || normalized.startsWith(`${PLUGIN_COMMAND} `);
}

function isLeadCommand(text) {
  const normalized = text.trim().toLowerCase();
  return normalized === LEAD_COMMAND || normalized.startsWith(`${LEAD_COMMAND} `);
}

async function handleTaskCommand(text) {
  const rawCommand = text.trim();
  const payload = rawCommand.slice(TASK_COMMAND.length).trim();
  const [action = "", ...rest] = payload.split(/\s+/);
  const normalizedAction = action.toLowerCase();

  if (!payload || normalizedAction === "help") {
    await postTaskMessage(
      "Task commands:\n/task create fix that issue #bug\n/task list\n/task list #bug\n/task completed\n/task completed #bug\n/task current\n/task day today #abc123 #def456\n/task day tomorrow #abc123\n/task day list [today|tomorrow|YYYY-MM-DD]\n/task day review\n/task view <id>\n/task process\n/task process #bug\n/task process continue\n/task process stop\n/task edit <id> <description> #label\n/task comment <id> <comment>\n/task comments <id>\n/task subtask <id> <description>\n/task subtasks <id>\n/task subtask done <id> <subtask>\n/task subtask reopen <id> <subtask>\n/task subtask remove <id> <subtask>\n/task start\n/task start <id>\n/task stop\n/task stop <id>\n/task continue\n/task continue <id>\n/task timers\n/task summary\n/task summary share\n/task complete <id>\n/task reopen <id>\n/task label <id> #bug\n/task unlabel <id> #bug\nMention a task id like #abc123 in a message to preview it.\nUse /day for attendance and leave commands."
    );
    return;
  }

  if (normalizedAction === "create") {
    await createTask(rest.join(" "));
    return;
  }

  if (normalizedAction === "list") {
    await postTaskList(rest.join(" "));
    return;
  }

  if (normalizedAction === "completed") {
    await postCompletedTaskList(rest.join(" "));
    return;
  }

  if (normalizedAction === "current") {
    await postCurrentTask();
    return;
  }

  if (normalizedAction === "day") {
    await handleTaskDayCommand(rest.join(" "));
    return;
  }

  if (normalizedAction === "process") {
    await handleTaskProcessCommand(rest.join(" "));
    return;
  }

  if (normalizedAction === "view") {
    await postTaskView(rest.join(" "));
    return;
  }

  if (normalizedAction === "complete") {
    const taskId = rest.join(" ").trim();
    await completeTask(taskId);
    return;
  }

  if (normalizedAction === "reopen") {
    const taskId = rest.join(" ").trim();
    await reopenTask(taskId);
    return;
  }

  if (normalizedAction === "edit") {
    await editTask(rest.join(" "));
    return;
  }

  if (normalizedAction === "comment") {
    await addTaskComment(rest.join(" "));
    return;
  }

  if (normalizedAction === "comments") {
    await postTaskComments(rest.join(" "));
    return;
  }

  if (normalizedAction === "subtask") {
    await handleSubtaskCommand(rest.join(" "));
    return;
  }

  if (normalizedAction === "subtasks") {
    await postTaskSubtasks(rest.join(" "));
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

  if (normalizedAction === "timers" || normalizedAction === "active") {
    await postActiveTimers();
    return;
  }

  if (normalizedAction === "summary") {
    await postTaskSummary(rest.join(" "));
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

  await postTaskMessage("Unknown task command. Use /task create <description> to add a task, or /task help.");
}

async function handleDayCommand(text) {
  const rawCommand = text.trim();
  const payload = rawCommand.slice(DAY_COMMAND.length).trim();
  const [action = "", ...rest] = payload.split(/\s+/);
  const normalizedAction = action.toLowerCase();

  if (!payload || normalizedAction === "help") {
    postLocalDayMessage(
      "Day commands:\n/day start\n/day plan <plan>\n/day free <reason>\n/day status\n/day break start\n/day break stop\n/day break list\n/day end\n/day leave <date-or-range> <reason>\n/day leave list\n/day leave cancel <id>"
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

  if (normalizedAction === "free") {
    await setFreeDayStatus(rest.join(" "));
    return;
  }

  if (normalizedAction === "status") {
    await postDayStatus();
    return;
  }

  if (normalizedAction === "break") {
    await handleBreakCommand(rest.join(" "));
    return;
  }

  if (normalizedAction === "leave") {
    await handleLeaveCommand(rest.join(" "));
    return;
  }

  postLocalDayMessage(`Unknown day command: /day ${payload}`);
}

async function handleCodexCommand(text) {
  const rawCommand = text.trim();
  const prompt = rawCommand.slice(CODEX_COMMAND.length).trim();

  if (!prompt || prompt.toLowerCase() === "help") {
    postLocalCodexMessage(
      "Codex commands:\n/codex summarize this repo\n/codex review the latest diff\n/codex fix the failing test\nStart the bridge with npm run codex:bridge -- --room <roomId>."
    );
    return;
  }

  const commandRef = await addDoc(collection(state.db, "rooms", state.roomId, "codexCommands"), {
    prompt,
    status: "queued",
    requestedBy: state.profile.id,
    requestedByName: getProfileDisplayName(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    startedAt: null,
    completedAt: null,
    result: null,
    error: null,
  });

  await postCodexMessage(
    `Queued Codex command ${formatCodexCommandId(commandRef.id)} from ${getProfileDisplayName()}.\n${prompt}`
  );
  setStatus("Codex command queued.", "success");
}

async function handleQueryCommand(text) {
  const rawCommand = text.trim();
  const payload = rawCommand.slice(QUERY_COMMAND.length).trim();
  const [action = "", ...rest] = payload.split(/\s+/);
  const normalizedAction = action.toLowerCase();

  if (!payload || normalizedAction === "help") {
    postLocalQueryMessage(
      "Query commands:\n/query <question>\n/query after 1h <question>\n/query task <task-id> <question>\n/query task <task-id> after 1d <question>\n/query list\n/query respond <id> <response>\n/query close <id>"
    );
    return;
  }

  if (normalizedAction === "list") {
    await postQueryList();
    return;
  }

  if (normalizedAction === "task") {
    await createTaskLinkedQuery(rest.join(" "));
    return;
  }

  if (normalizedAction === "respond" || normalizedAction === "answer") {
    await respondToQuery(rest.join(" "));
    return;
  }

  if (normalizedAction === "close" || normalizedAction === "done") {
    await closeQuery(rest.join(" "));
    return;
  }

  await createQuery(payload);
}

async function handlePluginCommand(text) {
  const rawCommand = text.trim();
  const payload = rawCommand.slice(PLUGIN_COMMAND.length).trim();
  const [action = "", pluginName = ""] = payload.split(/\s+/);
  const normalizedAction = action.toLowerCase();
  const normalizedPlugin = normalizePluginName(pluginName);

  if (!payload || normalizedAction === "help") {
    postLocalPluginMessage(
      "Plugin commands:\n/plugin enable leads\n/plugin disable leads\n/plugin list"
    );
    return;
  }

  if (normalizedAction === "list") {
    postPluginList();
    return;
  }

  if (normalizedAction !== "enable" && normalizedAction !== "disable") {
    postLocalPluginMessage(`Unknown plugin command: /plugin ${payload}`);
    setStatus("Unknown plugin command.", "error");
    return;
  }

  if (!SUPPORTED_PLUGINS.has(normalizedPlugin)) {
    postLocalPluginMessage("Supported plugins: leads.");
    setStatus("Unknown plugin.", "error");
    return;
  }

  const enabled = normalizedAction === "enable";
  await setRoomPluginEnabled(normalizedPlugin, enabled);
  state.roomPlugins = {
    ...state.roomPlugins,
    [normalizedPlugin]: {
      ...(state.roomPlugins[normalizedPlugin] || {}),
      enabled,
    },
  };
  postLocalPluginMessage(`${formatPluginName(normalizedPlugin)} plugin ${enabled ? "enabled" : "disabled"} for this group.`);
  setStatus(`${formatPluginName(normalizedPlugin)} plugin ${enabled ? "enabled" : "disabled"}.`, "success");
  void updateCommandAutocomplete();
}

async function handleLeadCommand(text) {
  if (!isRoomPluginEnabled(PLUGIN_LEADS)) {
    postLocalLeadMessage("Leads are not enabled in this group. Enable them with /plugin enable leads.");
    setStatus("Leads plugin is disabled.", "error");
    return;
  }

  const rawCommand = text.trim();
  const payload = rawCommand.slice(LEAD_COMMAND.length).trim();
  const [action = "", ...rest] = payload.split(/\s+/);
  const normalizedAction = action.toLowerCase();

  if (!payload || normalizedAction === "help") {
    postLocalLeadMessage(
      "Lead commands:\n/lead <name> phone:<phone> email:<email> company:<company> source:<source> notes:<notes>\n/lead new\n/lead list\n/lead view <id>\n/lead update <id> status:<status> owner:<owner> notes:<notes>"
    );
    return;
  }

  if (normalizedAction === "new") {
    draftNewLead();
    return;
  }

  if (normalizedAction === "list") {
    await postLeadList();
    return;
  }

  if (normalizedAction === "view") {
    await postLeadView(rest.join(" "));
    return;
  }

  if (normalizedAction === "update") {
    await updateLead(rest.join(" "));
    return;
  }

  await createLead(payload);
}

async function createQuery(question, options = {}) {
  const { text, reminderIntervalMs, error } = parseQueryReminderInput(question);

  if (!text) {
    postLocalQueryMessage(error || "Add a question after /query.");
    return;
  }

  const createdAt = new Date();
  const queryPayload = {
    text,
    status: "pending",
    createdAt: serverTimestamp(),
    createdBy: state.profile.id,
    createdByName: getProfileDisplayName(),
    answeredAt: null,
    answeredBy: null,
    answeredByName: null,
    responseText: null,
    taskId: options.task?.id || null,
    taskDescription: options.task?.description || null,
    reminderIntervalMs,
    lastReminderAt: null,
    reminderCount: 0,
  };
  const queryRef = await addDoc(collection(state.db, "rooms", state.roomId, "queries"), queryPayload);
  const queryData = {
    id: queryRef.id,
    ...queryPayload,
    createdAt,
  };

  if (options.task) {
    await addQueryTaskComment(options.task.id, `Query ${formatQueryId(queryRef.id)}: ${text}`);
  }

  await postQueryViewMessage(queryData);
  scheduleQueryReminder({
    ...queryData,
    lastReminderAt: createdAt,
  });
  setStatus("Query created.", "success");
}

async function createTaskLinkedQuery(input) {
  const [taskId = "", ...questionParts] = input.trim().split(/\s+/);
  const { text: question, error } = parseQueryReminderInput(questionParts.join(" "));

  if (!taskId || !question) {
    postLocalQueryMessage(error || "Use /query task <task-id> <question>.");
    return;
  }

  const task = await findTaskById(taskId);

  if (!task) {
    postLocalQueryMessage(`Task ${taskId} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  await createQuery(question, { task });
}

async function postQueryList() {
  const queries = await loadPendingRoomQueries();

  if (queries.length === 0) {
    postLocalQueryMessage("No pending queries.");
    setStatus("No pending queries.", "success");
    return;
  }

  postLocalMessage(
    `Pending queries: ${queries.length}`,
    "Queries (only you)",
    "query-list",
    [],
    {
      heading: "Pending queries",
      queries: queries.sort(compareQueriesByCreatedAt),
    }
  );
  setStatus(`${queries.length} pending quer${queries.length === 1 ? "y" : "ies"} listed.`, "success");
}

async function respondToQuery(input) {
  const [queryIdInput = "", ...responseParts] = input.trim().split(/\s+/);
  const responseText = responseParts.join(" ").trim();

  if (!queryIdInput || !responseText) {
    postLocalQueryMessage("Use /query respond <id> <response>.");
    return;
  }

  const queryData = await findQueryById(queryIdInput);

  if (!queryData) {
    postLocalQueryMessage(`Query ${queryIdInput} was not found.`);
    setStatus("Query not found.", "error");
    return;
  }

  if (queryData.status === "answered") {
    postLocalQueryMessage(`Query ${formatQueryId(queryData.id)} is already answered.`);
    setStatus("Query already answered.", "success");
    return;
  }

  const answeredAt = new Date();
  await updateDoc(doc(state.db, "rooms", state.roomId, "queries", queryData.id), {
    status: "answered",
    answeredAt: serverTimestamp(),
    answeredBy: state.profile.id,
    answeredByName: getProfileDisplayName(),
    responseText,
    updatedAt: serverTimestamp(),
  });

  const answeredQuery = {
    ...queryData,
    status: "answered",
    answeredAt,
    answeredBy: state.profile.id,
    answeredByName: getProfileDisplayName(),
    responseText,
  };

  if (queryData.taskId) {
    await addQueryTaskComment(
      queryData.taskId,
      `Response to Query ${formatQueryId(queryData.id)}: ${responseText}`
    );
  }

  clearQueryReminder(queryData.id);
  await postQueryViewMessage(answeredQuery);
  setStatus("Query answered.", "success");
}

async function closeQuery(queryIdInput) {
  const queryId = String(queryIdInput || "").trim();

  if (!queryId) {
    postLocalQueryMessage("Use /query close <id>.");
    return;
  }

  const queryData = await findQueryById(queryId);

  if (!queryData) {
    postLocalQueryMessage(`Query ${queryId} was not found.`);
    setStatus("Query not found.", "error");
    return;
  }

  if (queryData.status === "answered") {
    postLocalQueryMessage(`Query ${formatQueryId(queryData.id)} is already answered.`);
    setStatus("Query already answered.", "success");
    return;
  }

  if (queryData.createdBy !== state.profile.id) {
    postLocalQueryMessage(`Only ${queryData.createdByName || "the creator"} can close Query ${formatQueryId(queryData.id)}.`);
    setStatus("Only the query creator can close it.", "error");
    return;
  }

  const answeredAt = new Date();
  await updateDoc(doc(state.db, "rooms", state.roomId, "queries", queryData.id), {
    status: "answered",
    answeredAt: serverTimestamp(),
    answeredBy: state.profile.id,
    answeredByName: getProfileDisplayName(),
    responseText: null,
    updatedAt: serverTimestamp(),
  });

  clearQueryReminder(queryData.id);
  await postQueryViewMessage({
    ...queryData,
    status: "answered",
    answeredAt,
    answeredBy: state.profile.id,
    answeredByName: getProfileDisplayName(),
    responseText: null,
  });
  setStatus("Query closed.", "success");
}

async function postQueryViewMessage(queryData) {
  await addDoc(collection(state.db, "rooms", state.roomId, "messages"), {
    text: formatQueryMessageText(queryData),
    senderId: state.profile.id,
    senderName: "Queries",
    type: "query-view",
    query: serializeQueryForMessage(queryData),
    createdAt: serverTimestamp(),
  });
}

async function createLead(input) {
  const parsedLead = parseLeadInput(input);

  if (!parsedLead.name) {
    postLocalLeadMessage("Add a lead name after /lead, or use /lead new.");
    return;
  }

  const createdAt = new Date();
  const leadPayload = {
    name: parsedLead.name,
    phone: parsedLead.phone,
    email: parsedLead.email,
    company: parsedLead.company,
    source: parsedLead.source,
    status: parsedLead.status || "new",
    owner: parsedLead.owner || getProfileDisplayName(),
    notes: parsedLead.notes,
    createdAt: serverTimestamp(),
    createdBy: state.profile.id,
    createdByName: getProfileDisplayName(),
    updatedAt: serverTimestamp(),
    updatedBy: state.profile.id,
    updatedByName: getProfileDisplayName(),
  };
  const leadRef = await addDoc(collection(state.db, "rooms", state.roomId, "leads"), leadPayload);
  const leadData = {
    id: leadRef.id,
    ...leadPayload,
    createdAt,
    updatedAt: createdAt,
  };

  await postLeadViewMessage(leadData, "created");
  setStatus("Lead created.", "success");
}

async function updateLead(input) {
  const [leadIdInput = "", ...updateParts] = input.trim().split(/\s+/);

  if (!leadIdInput || updateParts.length === 0) {
    postLocalLeadMessage("Use /lead update <id> status:<status> owner:<owner> notes:<notes>.");
    return;
  }

  const leadData = await findLeadById(leadIdInput);

  if (!leadData) {
    postLocalLeadMessage(`Lead ${leadIdInput} was not found.`);
    setStatus("Lead not found.", "error");
    return;
  }

  const updates = parseLeadFields(updateParts.join(" "));
  const allowedFields = ["name", "phone", "email", "company", "source", "status", "owner", "notes"];
  const leadUpdates = {};

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(updates, field) && updates[field]) {
      leadUpdates[field] = updates[field];
    }
  });

  if (Object.keys(leadUpdates).length === 0) {
    postLocalLeadMessage("Add at least one field to update, like status:contacted or notes:called twice.");
    return;
  }

  const updatedAt = new Date();
  await updateDoc(doc(state.db, "rooms", state.roomId, "leads", leadData.id), {
    ...leadUpdates,
    updatedAt: serverTimestamp(),
    updatedBy: state.profile.id,
    updatedByName: getProfileDisplayName(),
  });

  await postLeadViewMessage({
    ...leadData,
    ...leadUpdates,
    updatedAt,
    updatedBy: state.profile.id,
    updatedByName: getProfileDisplayName(),
  }, "updated");
  setStatus("Lead updated.", "success");
}

async function postLeadList() {
  const leads = (await loadRoomLeads())
    .sort(compareLeadsByCreatedAt)
    .slice(0, LEAD_LIST_LIMIT);

  if (leads.length === 0) {
    postLocalLeadMessage("No leads yet. Create one with /lead new.");
    setStatus("No leads found.", "success");
    return;
  }

  postLocalMessage(
    `Recent leads: ${leads.length}`,
    "Leads (only you)",
    "lead-list",
    [],
    {
      heading: "Recent leads",
      leads,
    }
  );
  setStatus(`${leads.length} lead${leads.length === 1 ? "" : "s"} listed.`, "success");
}

async function postLeadView(leadIdInput) {
  const leadId = String(leadIdInput || "").trim();

  if (!leadId) {
    postLocalLeadMessage("Use /lead view <id>.");
    return;
  }

  const leadData = await findLeadById(leadId);

  if (!leadData) {
    postLocalLeadMessage(`Lead ${leadId} was not found.`);
    setStatus("Lead not found.", "error");
    return;
  }

  await postLeadViewMessage(leadData, "shared");
  setStatus("Lead shared.", "success");
}

async function postLeadViewMessage(leadData, action = "shared") {
  await addDoc(collection(state.db, "rooms", state.roomId, "messages"), {
    text: formatLeadMessageText(leadData, action),
    senderId: state.profile.id,
    senderName: "Leads",
    type: "lead-view",
    lead: serializeLeadForMessage(leadData),
    createdAt: serverTimestamp(),
  });
}

function formatQueryMessageText(queryData) {
  const taskText = queryData.taskId ? ` on Task ${formatTaskId(queryData.taskId)}` : "";

  if (queryData.status === "answered") {
    return queryData.responseText
      ? `Query ${formatQueryId(queryData.id)} answered${taskText}: ${queryData.responseText}`
      : `Query ${formatQueryId(queryData.id)} closed${taskText}.`;
  }

  return `Query ${formatQueryId(queryData.id)}${taskText}: ${queryData.text}`;
}

function formatLeadMessageText(leadData, action = "shared") {
  const actionText = action === "created" ? "created" : action === "updated" ? "updated" : "shared";
  const companyText = leadData.company ? ` at ${leadData.company}` : "";
  return `Lead ${formatLeadId(leadData.id)} ${actionText}: ${leadData.name || "Untitled lead"}${companyText}`;
}

function parseLeadInput(input) {
  const fields = parseLeadFields(input);
  const name = normalizeLeadFieldValue(fields.name || removeLeadFieldTokens(input));

  return {
    name,
    phone: normalizeLeadFieldValue(fields.phone),
    email: normalizeLeadFieldValue(fields.email),
    company: normalizeLeadFieldValue(fields.company),
    source: normalizeLeadFieldValue(fields.source),
    status: normalizeLeadFieldValue(fields.status),
    owner: normalizeLeadFieldValue(fields.owner),
    notes: normalizeLeadFieldValue(fields.notes),
  };
}

function parseLeadFields(input) {
  const allowedFields = new Set(["name", "phone", "email", "company", "source", "status", "owner", "notes"]);
  const text = String(input || "");
  const fieldRegex = /\b(name|phone|email|company|source|status|owner|notes):/gi;
  const matches = [...text.matchAll(fieldRegex)];
  const fields = {};

  matches.forEach((match, index) => {
    const key = match[1].toLowerCase();

    if (!allowedFields.has(key)) {
      return;
    }

    const valueStart = match.index + match[0].length;
    const valueEnd = index + 1 < matches.length ? matches[index + 1].index : text.length;
    fields[key] = normalizeLeadFieldValue(text.slice(valueStart, valueEnd));
  });

  return fields;
}

function removeLeadFieldTokens(input) {
  return String(input || "")
    .replace(/\b(name|phone|email|company|source|status|owner|notes):.*?(?=\s+\b(?:name|phone|email|company|source|status|owner|notes):|$)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLeadFieldValue(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function parseQueryReminderInput(value) {
  const tokens = String(value || "").trim().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return {
      text: "",
      reminderIntervalMs: QUERY_REMINDER_MS,
      error: null,
    };
  }

  const [firstToken = "", secondToken = ""] = tokens;
  let reminderToken = "";
  let textStartIndex = 0;

  if (
    ["after", "in", "remind", "reminder"].includes(firstToken.toLowerCase()) &&
    isQueryReminderDurationToken(secondToken)
  ) {
    reminderToken = secondToken;
    textStartIndex = 2;
  } else if (isQueryReminderDurationToken(firstToken)) {
    reminderToken = firstToken;
    textStartIndex = 1;
  }

  if (!reminderToken) {
    return {
      text: tokens.join(" "),
      reminderIntervalMs: QUERY_REMINDER_MS,
      error: null,
    };
  }

  const reminderIntervalMs = parseQueryReminderDuration(reminderToken);

  if (!reminderIntervalMs) {
    return {
      text: "",
      reminderIntervalMs: QUERY_REMINDER_MS,
      error: "Use reminder duration like 10m, 1h, or 5d.",
    };
  }

  if (reminderIntervalMs > QUERY_REMINDER_MAX_MS) {
    return {
      text: "",
      reminderIntervalMs: QUERY_REMINDER_MS,
      error: `Query reminder duration must be ${formatDuration(QUERY_REMINDER_MAX_MS)} or less.`,
    };
  }

  return {
    text: tokens.slice(textStartIndex).join(" ").trim(),
    reminderIntervalMs,
    error: null,
  };
}

function isQueryReminderDurationToken(value) {
  return /^\d+[mhd]$/i.test(String(value || "").trim());
}

function parseQueryReminderDuration(value) {
  const match = String(value || "").trim().match(/^(\d+)([mhd])$/i);

  if (!match) {
    return null;
  }

  const amount = Number.parseInt(match[1], 10);

  if (!Number.isInteger(amount) || amount <= 0) {
    return null;
  }

  const unit = match[2].toLowerCase();

  if (unit === "m") {
    return amount * 60 * 1000;
  }

  if (unit === "h") {
    return amount * 60 * 60 * 1000;
  }

  return amount * 24 * 60 * 60 * 1000;
}

async function addQueryTaskComment(taskId, text) {
  await addDoc(collection(state.db, "rooms", state.roomId, "tasks", taskId, "comments"), {
    taskId,
    text,
    createdAt: serverTimestamp(),
    createdBy: state.profile.id,
    createdByName: getProfileDisplayName(),
  });
}

async function createTask(description) {
  const { text: trimmedDescription, labels } = extractLabels(description);

  if (!trimmedDescription) {
    await postTaskMessage("Add a task description after /task create.");
    return;
  }

  const taskRef = await addDoc(collection(state.db, "rooms", state.roomId, "tasks"), {
    description: trimmedDescription,
    labels,
    status: "pending",
    createdAt: serverTimestamp(),
    createdBy: state.profile.id,
    createdByName: getProfileDisplayName(),
    completedAt: null,
    completedBy: null,
    completedByName: null,
    totalTrackedMs: 0,
    activeTimerStartedAt: null,
    activeTimerStartedBy: null,
    activeTimerStartedByName: null,
    subtasks: [],
  });

  await postTaskMessage(
    `Task ${formatTaskId(taskRef.id)} created: ${trimmedDescription}${formatTaskLabels(labels)}`
  );
  setStatus("Task created.", "success");
}

async function postTaskList(filterText = "") {
  const requestedLabels = parseLabels(filterText);
  const pendingTasks = await Promise.all((await loadPendingRoomTasks())
    .filter((task) => taskHasLabels(task, requestedLabels))
    .sort(compareTasksByCreatedAt)
    .slice(0, TASK_LIST_LIMIT)
    .map(loadTaskCommentSummary));

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

async function postCompletedTaskList(filterText = "") {
  const requestedLabels = parseLabels(filterText);
  const completedTasks = await Promise.all((await loadCompletedRoomTasks())
    .filter((task) => taskHasLabels(task, requestedLabels))
    .sort(compareTasksByCompletedAt)
    .slice(0, TASK_LIST_LIMIT)
    .map(loadTaskCommentSummary));

  if (completedTasks.length === 0) {
    postLocalTaskMessage(
      requestedLabels.length > 0
        ? `No completed tasks with ${formatTaskLabels(requestedLabels).trim()}.`
        : "No completed tasks."
    );
    setStatus("No completed tasks.", "success");
    return;
  }

  const maskIdentity = isPrivacyModeActive();
  const privateAliases = createTaskPrivacyAliases(completedTasks);
  const taskLines = completedTasks.map((task) => {
    const completedAt = formatTaskTimestamp(task.completedAt);
    const completedBy = formatTaskPersonName(task.completedBy, task.completedByName || "Unknown", privateAliases, {
      maskIdentity,
    });
    const metadata = `${completedBy}, completed ${completedAt}`;
    return `${formatTaskId(task.id)} - ${task.description}${formatTaskLabels(task.labels)}${formatTaskTimeSummary(task, { maskIdentity })} (${metadata})`;
  });
  const heading =
    requestedLabels.length > 0
      ? `Completed tasks ${formatTaskLabels(requestedLabels).trim()}:`
      : "Completed tasks:";
  const totalLine = `Total: ${completedTasks.length} task${completedTasks.length === 1 ? "" : "s"}`;

  postLocalTaskListMessage(
    heading.replace(/:$/, ""),
    completedTasks,
    `${heading}\n${taskLines.join("\n")}\n${totalLine}`,
    { privateAliases }
  );
  setStatus(`${completedTasks.length} completed task${completedTasks.length === 1 ? "" : "s"} listed.`, "success");
}

async function handleTaskDayCommand(input = "") {
  const trimmedInput = input.trim();
  const [action = "", ...rest] = trimmedInput.split(/\s+/);
  const normalizedAction = action.toLowerCase();

  if (!trimmedInput || normalizedAction === "help") {
    postLocalTaskMessage(
      "Task day commands:\n/task day today #abc123 #def456\n/task day tomorrow #abc123\n/task day 2026-06-26 #abc123\n/task day list [today|tomorrow|YYYY-MM-DD]\n/task day review"
    );
    return;
  }

  if (normalizedAction === "list") {
    await postDailyTaskPlan(rest.join(" "));
    return;
  }

  if (normalizedAction === "review") {
    await postDailyTaskRolloverReview({ auto: false });
    return;
  }

  await assignTasksToDay(trimmedInput);
}

async function assignTasksToDay(input) {
  const parts = input.trim().split(/\s+/).filter(Boolean);
  const requestedDateKey = parseDateKey(parts[0]);
  const dateKey = requestedDateKey || getTodayKey();
  const taskIdInputs = requestedDateKey ? parts.slice(1) : parts;

  if (taskIdInputs.length === 0) {
    postLocalTaskMessage("Use /task day today #abc123 #def456.");
    return;
  }

  const resolved = await resolveTaskIdsForDailyPlan(taskIdInputs);
  const pendingTasks = resolved.tasks.filter((task) => task.status !== "complete");
  const completedTasks = resolved.tasks.filter((task) => task.status === "complete");

  if (pendingTasks.length === 0) {
    const lines = ["No pending tasks were assigned."];

    if (resolved.notFound.length > 0) {
      lines.push(`Not found: ${resolved.notFound.join(", ")}`);
    }

    if (completedTasks.length > 0) {
      lines.push(`Already complete: ${completedTasks.map((task) => formatTaskId(task.id)).join(", ")}`);
    }

    postLocalTaskMessage(lines.join("\n"));
    setStatus("No tasks assigned.", "error");
    return;
  }

  const workDay = await getWorkDay(dateKey);
  const plannedTaskIds = mergeUniqueIds(workDay?.plannedTaskIds, pendingTasks.map((task) => task.id));

  await setDoc(
    getWorkDayRef(dateKey),
    {
      userId: state.profile.id,
      userName: getProfileDisplayName(),
      dateKey,
      plannedTaskIds,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  const lines = [
    `Planned ${pendingTasks.length} task${pendingTasks.length === 1 ? "" : "s"} for ${formatTaskPlanDate(dateKey)}.`,
    ...pendingTasks.map((task) => `- ${formatTaskId(task.id)} ${task.description || "Untitled task"}`),
  ];

  if (resolved.notFound.length > 0) {
    lines.push(`Not found: ${resolved.notFound.join(", ")}`);
  }

  if (completedTasks.length > 0) {
    lines.push(`Already complete: ${completedTasks.map((task) => formatTaskId(task.id)).join(", ")}`);
  }

  postLocalTaskMessage(lines.join("\n"));
  setStatus("Daily task plan saved.", "success");
}

async function postDailyTaskPlan(dateInput = "") {
  const dateKey = parseDateKey(dateInput.trim() || "today");

  if (!dateKey) {
    postLocalTaskMessage("Use /task day list [today|tomorrow|YYYY-MM-DD].");
    setStatus("Invalid date.", "error");
    return;
  }

  const workDay = await getWorkDay(dateKey);
  const plannedTaskIds = normalizeIdList(workDay?.plannedTaskIds);
  const tasks = await loadTasksByIds(plannedTaskIds);
  const tasksWithComments = await Promise.all(tasks.map(loadTaskCommentSummary));

  if (tasksWithComments.length === 0) {
    postLocalTaskMessage(`No tasks planned for ${formatTaskPlanDate(dateKey)}.`);
    setStatus("No planned tasks.", "success");
    return;
  }

  postLocalTaskListMessage(
    `Planned tasks for ${formatTaskPlanDate(dateKey)}`,
    sortTasksByPlannedOrder(tasksWithComments, plannedTaskIds),
    `Planned tasks for ${formatTaskPlanDate(dateKey)}:\n${tasksWithComments
      .map((task) => `${formatTaskId(task.id)} - ${task.description || "Untitled task"}`)
      .join("\n")}`,
    { plannedDateKey: dateKey }
  );
  setStatus(`${tasksWithComments.length} planned task${tasksWithComments.length === 1 ? "" : "s"} listed.`, "success");
}

async function postDailyTaskRolloverReview(options = {}) {
  const sourceDateKey = options.sourceDateKey || getPreviousDateKey(getTodayKey());
  const sourceWorkDay = await getWorkDay(sourceDateKey);
  const todayWorkDay = await getWorkDay(getTodayKey());
  const plannedTaskIds = normalizeIdList(sourceWorkDay?.plannedTaskIds);
  const skippedTaskIds = new Set(normalizeIdList(todayWorkDay?.rolloverSkippedTaskIds));
  const todayPlannedTaskIds = new Set(normalizeIdList(todayWorkDay?.plannedTaskIds));

  if (plannedTaskIds.length === 0) {
    if (!options.auto) {
      postLocalTaskMessage(`No unfinished planned tasks from ${formatTaskPlanDate(sourceDateKey)}.`);
      setStatus("No rollover tasks.", "success");
    }

    return;
  }

  if (options.auto && todayWorkDay?.rolloverReviewSourceDateKey === sourceDateKey) {
    return;
  }

  const tasks = (await loadTasksByIds(plannedTaskIds))
    .filter((task) => task.status !== "complete")
    .filter((task) => !skippedTaskIds.has(task.id))
    .filter((task) => !todayPlannedTaskIds.has(task.id));
  const tasksWithComments = await Promise.all(tasks.map(loadTaskCommentSummary));

  if (tasksWithComments.length === 0) {
    if (!options.auto) {
      postLocalTaskMessage(`No unfinished planned tasks from ${formatTaskPlanDate(sourceDateKey)}.`);
      setStatus("No rollover tasks.", "success");
    }

    await markDailyTaskRolloverReviewShown(sourceDateKey);
    return;
  }

  postLocalDailyTaskReviewMessage(
    `Unfinished planned tasks from ${formatTaskPlanDate(sourceDateKey)}`,
    sortTasksByPlannedOrder(tasksWithComments, plannedTaskIds),
    sourceDateKey
  );
  await markDailyTaskRolloverReviewShown(sourceDateKey);
  setStatus(`${tasksWithComments.length} rollover task${tasksWithComments.length === 1 ? "" : "s"} ready.`, "success");
}

async function carryDailyTaskToToday(taskIdInput, sourceDateKey = "") {
  const task = await findTaskById(taskIdInput);

  if (!task) {
    postLocalTaskMessage(`Task ${taskIdInput} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  if (task.status === "complete") {
    postLocalTaskMessage(`Task ${formatTaskId(task.id)} is already complete.`);
    setStatus("Task is already complete.", "success");
    return;
  }

  const todayKey = getTodayKey();
  const workDay = await getWorkDay(todayKey);
  const plannedTaskIds = mergeUniqueIds(workDay?.plannedTaskIds, [task.id]);
  const rolloverSkippedTaskIds = normalizeIdList(workDay?.rolloverSkippedTaskIds).filter((id) => id !== task.id);

  await setDoc(
    getWorkDayRef(todayKey),
    {
      userId: state.profile.id,
      userName: getProfileDisplayName(),
      dateKey: todayKey,
      plannedTaskIds,
      rolloverSkippedTaskIds,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  postLocalTaskMessage(`Carried Task ${formatTaskId(task.id)} to today: ${task.description || "Untitled task"}`);
  setStatus("Task carried to today.", "success");

  if (sourceDateKey) {
    await postDailyTaskRolloverReview({ auto: false, sourceDateKey });
  }
}

async function completeDailyTaskReviewItem(taskIdInput, sourceDateKey = "") {
  await completeTask(taskIdInput);

  if (sourceDateKey) {
    await postDailyTaskRolloverReview({ auto: false, sourceDateKey });
  }
}

async function skipDailyTaskReviewItem(taskIdInput, sourceDateKey = "") {
  const task = await findTaskById(taskIdInput);

  if (!task) {
    postLocalTaskMessage(`Task ${taskIdInput} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  const todayKey = getTodayKey();
  const workDay = await getWorkDay(todayKey);
  const rolloverSkippedTaskIds = mergeUniqueIds(workDay?.rolloverSkippedTaskIds, [task.id]);

  await setDoc(
    getWorkDayRef(todayKey),
    {
      userId: state.profile.id,
      userName: getProfileDisplayName(),
      dateKey: todayKey,
      rolloverSkippedTaskIds,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  postLocalTaskMessage(`Skipped Task ${formatTaskId(task.id)} for today's rollover review.`);
  setStatus("Rollover task skipped.", "success");

  if (sourceDateKey) {
    await postDailyTaskRolloverReview({ auto: false, sourceDateKey });
  }
}

async function markDailyTaskRolloverReviewShown(sourceDateKey) {
  await setDoc(
    getWorkDayRef(getTodayKey()),
    {
      userId: state.profile.id,
      userName: getProfileDisplayName(),
      dateKey: getTodayKey(),
      rolloverReviewSourceDateKey: sourceDateKey,
      rolloverReviewShownAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

async function handleTaskProcessCommand(input = "") {
  const trimmedInput = input.trim();
  const normalizedInput = trimmedInput.toLowerCase();

  if (normalizedInput === "continue" || normalizedInput === "resume") {
    await continueTaskProcess();
    return;
  }

  if (normalizedInput === "stop" || normalizedInput === "end" || normalizedInput === "cancel") {
    stopTaskProcess();
    return;
  }

  if (normalizedInput === "next" || normalizedInput === "skip") {
    await skipTaskProcessItem(state.taskProcessSession?.currentTaskId || "");
    return;
  }

  const requestedLabels = parseLabels(trimmedInput);
  state.taskProcessSession = {
    filterLabels: requestedLabels,
    skippedTaskIds: new Set(),
    currentTaskId: null,
  };
  saveTaskProcessState();

  await postNextTaskProcessItem();
}

async function continueTaskProcess() {
  if (state.taskProcessSession) {
    await postNextTaskProcessItem();
    return;
  }

  const savedProcess = loadTaskProcessState();

  if (!savedProcess) {
    postLocalTaskMessage("No saved task process found. Start one with /task process.");
    setStatus("No saved task process.", "error");
    return;
  }

  state.taskProcessSession = savedProcess;
  await postNextTaskProcessItem();
}

async function postNextTaskProcessItem(options = {}) {
  if (!state.taskProcessSession) {
    state.taskProcessSession = {
      filterLabels: [],
      skippedTaskIds: new Set(),
      currentTaskId: null,
    };
  }

  if (options.completedTaskId) {
    state.taskProcessSession.skippedTaskIds.add(options.completedTaskId);
  }

  const requestedLabels = state.taskProcessSession.filterLabels || [];
  const skippedTaskIds = state.taskProcessSession.skippedTaskIds || new Set();
  const pendingTasks = await Promise.all((await loadPendingRoomTasks())
    .filter((task) => taskHasLabels(task, requestedLabels))
    .filter((task) => !skippedTaskIds.has(task.id))
    .sort(compareTasksByCreatedAt)
    .map(loadTaskCommentSummary));

  if (pendingTasks.length === 0) {
    const labelText = requestedLabels.length > 0 ? ` with ${formatTaskLabels(requestedLabels).trim()}` : "";
    postLocalTaskMessage(`Task process finished. No more pending tasks${labelText}.`);
    state.taskProcessSession = null;
    clearTaskProcessState();
    setStatus("Task process finished.", "success");
    return;
  }

  const [task] = pendingTasks;
  const comments = await loadTaskComments(task.id);
  const taskWithComments = {
    ...task,
    commentCount: comments.length,
  };
  state.taskProcessSession.currentTaskId = task.id;
  saveTaskProcessState();
  postLocalTaskProcessMessage(taskWithComments, pendingTasks.length, comments);
  setStatus(`Task process: ${pendingTasks.length} pending task${pendingTasks.length === 1 ? "" : "s"} left.`, "success");
}

async function skipTaskProcessItem(taskId) {
  if (!state.taskProcessSession) {
    postLocalTaskMessage("Start a task process with /task process.");
    setStatus("No task process is running.", "error");
    return;
  }

  const normalizedTaskId = taskId.trim();

  if (normalizedTaskId) {
    state.taskProcessSession.skippedTaskIds.add(normalizedTaskId);
  }
  saveTaskProcessState();

  await postNextTaskProcessItem();
}

async function completeTaskProcessItem(taskId) {
  const task = await findTaskById(taskId);

  if (!task) {
    await postTaskMessage(`Task ${taskId} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  await completeTask(task.id);

  const latestTask = await findTaskById(task.id);

  if (latestTask?.status !== "complete") {
    return;
  }

  await postNextTaskProcessItem({ completedTaskId: task.id });
}

function stopTaskProcess() {
  if (!state.taskProcessSession) {
    postLocalTaskMessage("No task process is running.");
    setStatus("No task process is running.", "success");
    return;
  }

  state.taskProcessSession = null;
  clearTaskProcessState();
  postLocalTaskMessage("Task process stopped. Start again with /task process.");
  setStatus("Task process stopped.", "success");
}

function saveTaskProcessState() {
  if (!state.roomId || !state.profile?.id || !state.taskProcessSession) {
    return;
  }

  localStorage.setItem(
    getTaskProcessStorageKey(),
    JSON.stringify({
      filterLabels: state.taskProcessSession.filterLabels || [],
      skippedTaskIds: [...(state.taskProcessSession.skippedTaskIds || new Set())],
      currentTaskId: state.taskProcessSession.currentTaskId || null,
      updatedAt: new Date().toISOString(),
    })
  );
}

function loadTaskProcessState() {
  if (!state.roomId || !state.profile?.id) {
    return null;
  }

  try {
    const raw = localStorage.getItem(getTaskProcessStorageKey());

    if (!raw) {
      return null;
    }

    const saved = JSON.parse(raw);
    return {
      filterLabels: Array.isArray(saved.filterLabels) ? saved.filterLabels : [],
      skippedTaskIds: new Set(Array.isArray(saved.skippedTaskIds) ? saved.skippedTaskIds : []),
      currentTaskId: saved.currentTaskId || null,
    };
  } catch (error) {
    console.error("Task process restore failed:", error);
    clearTaskProcessState();
    return null;
  }
}

function clearTaskProcessState() {
  if (!state.roomId || !state.profile?.id) {
    return;
  }

  localStorage.removeItem(getTaskProcessStorageKey());
}

function getTaskProcessStorageKey() {
  return `${TASK_PROCESS_STATE_KEY_PREFIX}:${state.roomId}:${state.profile.id}`;
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
    completedByName: getProfileDisplayName(),
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

async function reopenTask(taskIdInput) {
  const taskId = taskIdInput.trim();

  if (!taskId) {
    await postTaskMessage("Use /task reopen <id> to reopen a completed task.");
    return;
  }

  const task = await findTaskById(taskId);

  if (!task) {
    await postTaskMessage(`Task ${taskId} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  if (task.status !== "complete") {
    await postTaskMessage(`Task ${formatTaskId(task.id)} is already pending.`);
    setStatus("Task is already pending.", "success");
    return;
  }

  await updateDoc(doc(state.db, "rooms", state.roomId, "tasks", task.id), {
    status: "pending",
    completedAt: null,
    completedBy: null,
    completedByName: null,
    reopenedAt: serverTimestamp(),
    reopenedBy: state.profile.id,
    reopenedByName: getProfileDisplayName(),
    updatedAt: serverTimestamp(),
  });

  await postTaskMessage(`Task ${formatTaskId(task.id)} reopened: ${task.description}`);
  scheduleDayIdleTaskReminder();
  setStatus("Task reopened.", "success");
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
    updatedByName: getProfileDisplayName(),
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

async function addTaskComment(input) {
  const [taskId = "", ...commentParts] = input.trim().split(/\s+/);
  const commentText = commentParts.join(" ").trim();

  if (!taskId || !commentText) {
    await postTaskMessage("Use /task comment <id> <comment>.");
    return;
  }

  const task = await findTaskById(taskId);

  if (!task) {
    await postTaskMessage(`Task ${taskId} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  await addDoc(collection(state.db, "rooms", state.roomId, "tasks", task.id, "comments"), {
    taskId: task.id,
    text: commentText,
    createdAt: serverTimestamp(),
    createdBy: state.profile.id,
    createdByName: getProfileDisplayName(),
  });

  await postTaskMessage(
    `Comment added to Task ${formatTaskId(task.id)} (${task.description || "Untitled task"}): ${commentText}`
  );
  setStatus("Task comment added.", "success");
}

async function toggleMessageReaction(messageId, reactionInput) {
  const reaction = normalizeMessageReaction(reactionInput);

  if (!messageId || !reaction || !state.profile) {
    return;
  }

  const message = state.messages.find((entry) => entry.id === messageId);

  if (!message) {
    setStatus("Message not found.", "error");
    return;
  }

  const reactions = normalizeMessageReactions(message.reactions);
  const existingReaction = reactions.find(
    (entry) => entry.userId === state.profile.id && entry.reaction === reaction
  );
  const nextReactions = existingReaction
    ? reactions.filter((entry) => !(entry.userId === state.profile.id && entry.reaction === reaction))
    : [
        ...reactions,
        {
          reaction,
          userId: state.profile.id,
          userName: getProfileDisplayName(),
          createdAt: new Date(),
        },
      ];

  await updateDoc(doc(state.db, "rooms", state.roomId, "messages", message.id), {
    reactions: nextReactions,
  });

  const actionText = existingReaction ? "removed" : "added";
  setStatus(`Message reaction ${actionText}.`, "success");
}

async function postTaskComments(taskIdInput) {
  const taskId = taskIdInput.trim();

  if (!taskId) {
    postLocalTaskMessage("Use /task comments <id> to view task comments.");
    return;
  }

  const task = await findTaskById(taskId);

  if (!task) {
    postLocalTaskMessage(`Task ${taskId} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  const comments = await loadTaskComments(task.id);
  postLocalTaskCommentsMessage(task, comments);
  setStatus(
    comments.length === 0
      ? "No task comments."
      : `${comments.length} task comment${comments.length === 1 ? "" : "s"} listed.`,
    "success"
  );
}

async function handleSubtaskCommand(input) {
  const [actionOrTaskId = "", ...rest] = input.trim().split(/\s+/);
  const normalizedAction = actionOrTaskId.toLowerCase();

  if (!actionOrTaskId) {
    await postTaskMessage("Use /task subtask <id> <description>.");
    return;
  }

  if (["done", "complete", "check"].includes(normalizedAction)) {
    await updateSubtaskStatus(rest.join(" "), "complete");
    return;
  }

  if (["reopen", "open", "todo", "undone"].includes(normalizedAction)) {
    await updateSubtaskStatus(rest.join(" "), "pending");
    return;
  }

  if (["remove", "delete"].includes(normalizedAction)) {
    await removeSubtask(rest.join(" "));
    return;
  }

  await addSubtask(input);
}

async function addSubtask(input) {
  const [taskId = "", ...descriptionParts] = input.trim().split(/\s+/);
  const description = descriptionParts.join(" ").trim();

  if (!taskId || !description) {
    await postTaskMessage("Use /task subtask <id> <description>.");
    return;
  }

  const task = await findTaskById(taskId);

  if (!task) {
    await postTaskMessage(`Task ${taskId} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  const subtasks = normalizeSubtasks(task.subtasks);
  const subtask = {
    id: generateSubtaskId(),
    text: description,
    status: "pending",
    createdAt: new Date(),
    createdBy: state.profile.id,
    createdByName: getProfileDisplayName(),
    completedAt: null,
    completedBy: null,
    completedByName: null,
  };

  await updateDoc(doc(state.db, "rooms", state.roomId, "tasks", task.id), {
    subtasks: [...subtasks, subtask],
    updatedAt: serverTimestamp(),
    updatedBy: state.profile.id,
    updatedByName: getProfileDisplayName(),
  });

  await postTaskMessage(
    `Subtask ${formatSubtaskId(subtask.id)} added to Task ${formatTaskId(task.id)}: ${description}`
  );
  setStatus("Subtask added.", "success");
}

async function postTaskSubtasks(taskIdInput) {
  const taskId = taskIdInput.trim();

  if (!taskId) {
    postLocalTaskMessage("Use /task subtasks <id> to view subtasks.");
    return;
  }

  const task = await findTaskById(taskId);

  if (!task) {
    postLocalTaskMessage(`Task ${taskId} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  const subtasks = normalizeSubtasks(task.subtasks);

  if (subtasks.length === 0) {
    postLocalTaskMessage(`Task ${formatTaskId(task.id)} has no subtasks: ${task.description}`);
    setStatus("No subtasks.", "success");
    return;
  }

  const lines = [
    `Subtasks for Task ${formatTaskId(task.id)}: ${task.description}`,
    ...subtasks.map((subtask) => {
      const marker = subtask.status === "complete" ? "x" : " ";
      return `- [${marker}] ${formatSubtaskId(subtask.id)} ${subtask.text}`;
    }),
  ];
  postLocalTaskMessage(lines.join("\n"));
  setStatus(`${subtasks.length} subtask${subtasks.length === 1 ? "" : "s"} listed.`, "success");
}

async function updateSubtaskStatus(input, status) {
  const [taskId = "", subtaskId = ""] = input.trim().split(/\s+/);
  const isComplete = status === "complete";

  if (!taskId || !subtaskId) {
    await postTaskMessage(`Use /task subtask ${isComplete ? "done" : "reopen"} <id> <subtask>.`);
    return;
  }

  const task = await findTaskById(taskId);

  if (!task) {
    await postTaskMessage(`Task ${taskId} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  const subtasks = normalizeSubtasks(task.subtasks);
  const targetSubtask = findSubtaskById(subtasks, subtaskId);

  if (!targetSubtask) {
    await postTaskMessage(`Subtask ${subtaskId} was not found on Task ${formatTaskId(task.id)}.`);
    setStatus("Subtask not found.", "error");
    return;
  }

  const updatedSubtasks = subtasks.map((subtask) => {
    if (subtask.id !== targetSubtask.id) {
      return subtask;
    }

    return {
      ...subtask,
      status,
      completedAt: isComplete ? new Date() : null,
      completedBy: isComplete ? state.profile.id : null,
      completedByName: isComplete ? getProfileDisplayName() : null,
    };
  });

  await updateDoc(doc(state.db, "rooms", state.roomId, "tasks", task.id), {
    subtasks: updatedSubtasks,
    updatedAt: serverTimestamp(),
    updatedBy: state.profile.id,
    updatedByName: getProfileDisplayName(),
  });

  await postTaskMessage(
    `Subtask ${formatSubtaskId(targetSubtask.id)} ${isComplete ? "completed" : "reopened"} on Task ${formatTaskId(task.id)}: ${targetSubtask.text}`
  );
  setStatus(`Subtask ${isComplete ? "completed" : "reopened"}.`, "success");
}

async function removeSubtask(input) {
  const [taskId = "", subtaskId = ""] = input.trim().split(/\s+/);

  if (!taskId || !subtaskId) {
    await postTaskMessage("Use /task subtask remove <id> <subtask>.");
    return;
  }

  const task = await findTaskById(taskId);

  if (!task) {
    await postTaskMessage(`Task ${taskId} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  const subtasks = normalizeSubtasks(task.subtasks);
  const targetSubtask = findSubtaskById(subtasks, subtaskId);

  if (!targetSubtask) {
    await postTaskMessage(`Subtask ${subtaskId} was not found on Task ${formatTaskId(task.id)}.`);
    setStatus("Subtask not found.", "error");
    return;
  }

  await updateDoc(doc(state.db, "rooms", state.roomId, "tasks", task.id), {
    subtasks: subtasks.filter((subtask) => subtask.id !== targetSubtask.id),
    updatedAt: serverTimestamp(),
    updatedBy: state.profile.id,
    updatedByName: getProfileDisplayName(),
  });

  await postTaskMessage(
    `Subtask ${formatSubtaskId(targetSubtask.id)} removed from Task ${formatTaskId(task.id)}: ${targetSubtask.text}`
  );
  setStatus("Subtask removed.", "success");
}

async function postTaskView(taskIdInput) {
  const taskId = taskIdInput.trim();

  if (!taskId) {
    await postTaskMessage("Use /task view <id> to share a task.");
    return;
  }

  const task = await findTaskById(taskId);

  if (!task) {
    await postTaskMessage(`Task ${taskId} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  const comments = await loadTaskComments(task.id);
  const taskPreview = serializeTaskForMessage({
    ...task,
    commentCount: comments.length,
  });

  await addDoc(collection(state.db, "rooms", state.roomId, "messages"), {
    text: `Task ${formatTaskId(task.id)}: ${task.description}`,
    senderId: state.profile.id,
    senderName: "Tasks",
    type: "task-view",
    task: taskPreview,
    comments: comments.map(serializeTaskCommentForMessage),
    maskIdentity: isPrivacyModeActive(),
    createdAt: serverTimestamp(),
  });
  setStatus("Task shared.", "success");
}

async function postCurrentTask() {
  const currentTask = (await loadRoomTasks())
    .filter((task) => task.activeTimerStartedAt && isCurrentUserTaskTimerOwner(task))
    .sort(compareActiveTimersByStartedAt)[0];

  if (!currentTask) {
    postLocalTaskMessage("No current active task.");
    setStatus("No current active task.", "success");
    return;
  }

  const comments = await loadTaskComments(currentTask.id);
  const taskPreview = serializeTaskForMessage({
    ...currentTask,
    commentCount: comments.length,
  });

  postLocalMessage(
    `Current task\n${formatTaskId(currentTask.id)} - ${currentTask.description || "Untitled task"}`,
    "Tasks (only you)",
    "task-view",
    [],
    {
      heading: "Current task",
      task: taskPreview,
      comments: comments.map(serializeTaskCommentForMessage),
      maskIdentity: isPrivacyModeActive(),
    }
  );
  setStatus("Current task shown.", "success");
}

async function startTaskTimer(taskIdInput) {
  const taskId = taskIdInput.trim();
  const unavailableReason = await getTimerUnavailableReason();

  if (unavailableReason) {
    await postTaskMessage(unavailableReason);
    setStatus("Timer cannot start right now.", "error");
    return;
  }

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
    activeTimerStartedByName: getProfileDisplayName(),
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
  const unavailableReason = await getTimerUnavailableReason();

  if (unavailableReason) {
    await postTaskMessage(unavailableReason);
    setStatus("Timer cannot start right now.", "error");
    return;
  }

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
      userName: getProfileDisplayName(),
      dateKey: getTodayKey(),
      activeTimerStartedAt: startedAt,
      activeTimerStartedBy: state.profile.id,
      activeTimerStartedByName: getProfileDisplayName(),
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
    userName: getProfileDisplayName(),
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

async function getTimerUnavailableReason() {
  const workDay = await getWorkDay();

  if (!workDay?.startedAt) {
    return "Start your day with /day start before starting a timer.";
  }

  if (workDay.endedAt) {
    return "Your day has ended. Start the day again before starting a timer.";
  }

  if (workDay.activeBreakStartedAt) {
    return "You are on break. Stop the break with /day break stop before starting a timer.";
  }

  return "";
}

async function pauseActiveTimersForCurrentUser(reason = "pause") {
  const stoppedAt = new Date();
  const [tasks, activeGeneralTimer] = await Promise.all([loadRoomTasks(), findActiveGeneralTimer()]);
  const activeTasks = tasks.filter((task) => task.activeTimerStartedAt && isCurrentUserTaskTimerOwner(task));
  let pausedCount = 0;

  for (const task of activeTasks) {
    const elapsedMs = Math.max(0, stoppedAt.getTime() - getTimestampMillis(task.activeTimerStartedAt));

    await updateDoc(doc(state.db, "rooms", state.roomId, "tasks", task.id), {
      totalTrackedMs: increment(elapsedMs),
      activeTimerStartedAt: null,
      activeTimerStartedBy: null,
      activeTimerStartedByName: null,
    });

    if (elapsedMs > 0) {
      await recordTaskTimeEntry(task, task.activeTimerStartedAt, stoppedAt, elapsedMs);
    }

    clearTaskTimerReminder(task.id);
    pausedCount += 1;
  }

  if (activeGeneralTimer?.data?.activeTimerStartedAt) {
    const elapsedMs = Math.max(
      0,
      stoppedAt.getTime() - getTimestampMillis(activeGeneralTimer.data.activeTimerStartedAt)
    );

    await setDoc(
      activeGeneralTimer.ref,
      {
        activeTimerStartedAt: null,
        activeTimerStartedBy: null,
        activeTimerStartedByName: null,
        userId: state.profile.id,
        userName: getProfileDisplayName(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    if (elapsedMs > 0) {
      await recordGeneralTimeEntry(
        activeGeneralTimer.data.activeTimerStartedAt,
        stoppedAt,
        elapsedMs,
        activeGeneralTimer.ref
      );
    }

    clearGeneralTimerReminders();
    pausedCount += 1;
  }

  if (pausedCount > 0) {
    postLocalTaskMessage(
      `${pausedCount} active timer${pausedCount === 1 ? "" : "s"} paused for ${reason}.`
    );
  }

  return pausedCount;
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

async function postActiveTimers() {
  const [tasks, workDays] = await Promise.all([
    loadRoomTasks(),
    loadRoomWorkDays(),
  ]);
  const activeTaskTimers = tasks
    .filter((task) => task.activeTimerStartedAt)
    .sort(compareActiveTimersByStartedAt);
  const activeGeneralTimers = workDays
    .filter((workDay) => workDay.activeTimerStartedAt)
    .sort(compareActiveTimersByStartedAt);

  if (activeTaskTimers.length === 0 && activeGeneralTimers.length === 0) {
    postLocalTaskMessage("No active timers.");
    setStatus("No active timers.", "success");
    return;
  }

  const lines = ["Active timers:"];

  if (activeGeneralTimers.length > 0) {
    lines.push("General:");
    activeGeneralTimers.forEach((workDay) => {
      const ownerName = isPrivacyModeActive()
        ? "User"
        : workDay.activeTimerStartedByName || workDay.userName || "Someone";
      const elapsed = formatDuration(Date.now() - getTimestampMillis(workDay.activeTimerStartedAt));
      const command = isCurrentUserWorkDay(workDay) ? " - stop with /task stop" : "";
      lines.push(`- ${ownerName}: ${elapsed}${command}`);
    });
  }

  if (activeTaskTimers.length > 0) {
    lines.push("Tasks:");
    activeTaskTimers.forEach((task) => {
      const ownerName = isPrivacyModeActive() ? "User" : getTaskTimerOwnerName(task);
      const elapsed = formatDuration(Date.now() - getTimestampMillis(task.activeTimerStartedAt));
      const taskId = formatTaskId(task.id);
      const command = isCurrentUserTaskTimerOwner(task)
        ? ` - stop with /task stop ${taskId}, complete with /task complete ${taskId}`
        : "";
      lines.push(`- ${taskId} ${task.description || "Untitled task"} (${ownerName}, ${elapsed})${command}`);
    });
  }

  postLocalTaskMessage(lines.join("\n"));
  setStatus(
    `${activeTaskTimers.length + activeGeneralTimers.length} active timer${activeTaskTimers.length + activeGeneralTimers.length === 1 ? "" : "s"} listed.`,
    "success"
  );
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
      userName: getProfileDisplayName(),
      dateKey: getTodayKey(),
      startedAt: existingDay?.startedAt || serverTimestamp(),
      endedAt: null,
      breaks: Array.isArray(existingDay?.breaks) ? existingDay.breaks : [],
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await postDayMessage(
    `${getProfileDisplayName()} started the day.\nPlan can be shared with /day plan <plan>.`
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
      userName: getProfileDisplayName(),
      dateKey: getTodayKey(),
      plan,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await postDayMessage(`${getProfileDisplayName()}'s plan for today:\n${plan}`);
  setStatus("Day plan saved.", "success");
}

async function endWorkDay() {
  await stopActiveBreak({ announce: false });
  await pauseActiveTimersForCurrentUser("day end");

  await setDoc(
    getWorkDayRef(),
    {
      userId: state.profile.id,
      userName: getProfileDisplayName(),
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

async function setFreeDayStatus(reasonInput = "") {
  const reason = reasonInput.trim();

  await setDoc(
    getWorkDayRef(),
    {
      userId: state.profile.id,
      userName: getProfileDisplayName(),
      dateKey: getTodayKey(),
      availabilityStatus: "free",
      availabilityReason: reason || null,
      availabilityUpdatedAt: serverTimestamp(),
      availabilityUpdatedBy: state.profile.id,
      availabilityUpdatedByName: getProfileDisplayName(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await postDayMessage(`${getProfileDisplayName()} is free${reason ? `: ${reason}` : "."}`);
  setStatus("Free status saved.", "success");
}

async function postDayStatus() {
  const workDay = await getWorkDay();
  const activeGeneralTimer = await findActiveGeneralTimer();
  const activeTaskTimers = (await loadRoomTasks())
    .filter((task) => task.activeTimerStartedAt && isCurrentUserTaskTimerOwner(task))
    .sort(compareActiveTimersByStartedAt);
  const lines = ["Day status:"];

  if (workDay?.startedAt && !workDay?.endedAt) {
    lines.push(`Day: started ${formatTaskTimestamp(workDay.startedAt)}`);
  } else if (workDay?.endedAt) {
    lines.push(`Day: ended ${formatTaskTimestamp(workDay.endedAt)}`);
  } else {
    lines.push("Day: not started");
  }

  if (workDay?.availabilityStatus === "free") {
    lines.push(`Availability: ${formatDayAvailabilityStatus(workDay)}`);
  }

  if (activeGeneralTimer?.data?.activeTimerStartedAt) {
    lines.push(
      `General timer: running ${formatDuration(Date.now() - getTimestampMillis(activeGeneralTimer.data.activeTimerStartedAt))}`
    );
  }

  if (activeTaskTimers.length > 0) {
    lines.push(`Task timers: ${activeTaskTimers.length} running`);
    activeTaskTimers.slice(0, 5).forEach((task) => {
      lines.push(
        `- ${formatTaskId(task.id)} ${task.description || "Untitled task"} (${formatDuration(Date.now() - getTimestampMillis(task.activeTimerStartedAt))})`
      );
    });
  }

  if (workDay?.activeBreakStartedAt) {
    lines.push(
      `Break: running ${formatDuration(Date.now() - getTimestampMillis(workDay.activeBreakStartedAt))}`
    );
  }

  postLocalDayMessage(lines.join("\n"));
  setStatus("Day status ready.", "success");
}

async function handleBreakCommand(input = "") {
  const [action = "start"] = input.trim().split(/\s+/);
  const normalizedAction = action.toLowerCase();

  if (["start", "begin"].includes(normalizedAction)) {
    await startBreak();
    return;
  }

  if (["stop", "end"].includes(normalizedAction)) {
    await stopActiveBreak();
    return;
  }

  if (["list", "status"].includes(normalizedAction)) {
    await postBreakList();
    return;
  }

  postLocalDayMessage("Use /day break start, /day break stop, or /day break list.");
}

async function syncActiveBreakState() {
  if (!state.db || !state.roomId || !state.profile) {
    setActiveBreakState(null);
    return;
  }

  const workDay = await getWorkDay();
  setActiveBreakState(workDay?.activeBreakStartedAt || null);
}

function setActiveBreakState(startedAt) {
  state.activeBreakStartedAt = startedAt || null;
  syncBreakVisualState();
}

function syncBreakVisualState() {
  document.body.classList.toggle("break-active", Boolean(state.activeBreakStartedAt));
}

function handleBreakActivity(event) {
  if (!state.activeBreakStartedAt) {
    return;
  }

  if (event?.target?.closest?.(".command-suggestions")) {
    return;
  }

  maybePromptStopBreak();
}

function maybePromptStopBreak() {
  if (!state.activeBreakStartedAt || !state.roomId) {
    return;
  }

  const now = Date.now();
  if (now - state.lastBreakActivityPromptAt < 60 * 1000) {
    return;
  }

  state.lastBreakActivityPromptAt = now;
  postLocalDayMessage(
    `You are still on break (${formatDuration(now - getTimestampMillis(state.activeBreakStartedAt))}). Stop it before continuing work.`,
    [
      {
        label: "Stop break",
        action: "day-break-stop",
      },
    ]
  );
  setStatus("Break is still running.", "error");
}

async function startBreak() {
  const workDay = await getWorkDay();

  if (workDay?.activeBreakStartedAt) {
    postLocalDayMessage(
      `Break already running for ${formatDuration(Date.now() - getTimestampMillis(workDay.activeBreakStartedAt))}. Stop it with /day break stop.`
    );
    setStatus("Break is already running.", "error");
    return;
  }

  const startedAt = new Date();
  const pausedTimerCount = await pauseActiveTimersForCurrentUser("break");

  await setDoc(
    getWorkDayRef(),
    {
      userId: state.profile.id,
      userName: getProfileDisplayName(),
      dateKey: getTodayKey(),
      startedAt: workDay?.startedAt || serverTimestamp(),
      endedAt: null,
      activeBreakStartedAt: startedAt,
      activeBreakStartedBy: state.profile.id,
      activeBreakStartedByName: getProfileDisplayName(),
      breaks: Array.isArray(workDay?.breaks) ? workDay.breaks : [],
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await postDayMessage(
    `${getProfileDisplayName()} started a break.${pausedTimerCount > 0 ? ` Paused ${pausedTimerCount} active timer${pausedTimerCount === 1 ? "" : "s"}.` : ""}`
  );
  clearDayIdleTaskReminder();
  setActiveBreakState(startedAt);
  setStatus("Break started.", "success");
}

async function stopActiveBreak(options = {}) {
  const workDay = await getWorkDay();

  if (!workDay?.activeBreakStartedAt) {
    setActiveBreakState(null);
    if (options.announce !== false) {
      postLocalDayMessage("No break is running.");
      setStatus("No break is running.", "error");
    }
    return null;
  }

  const stoppedAt = new Date();
  const durationMs = Math.max(0, stoppedAt.getTime() - getTimestampMillis(workDay.activeBreakStartedAt));
  const breakEntry = {
    id: generateBreakId(),
    userId: state.profile.id,
    userName: getProfileDisplayName(),
    startedAt: normalizeTimestampDate(workDay.activeBreakStartedAt),
    stoppedAt,
    durationMs,
  };
  const breaks = Array.isArray(workDay.breaks) ? workDay.breaks : [];

  await setDoc(
    getWorkDayRef(),
    {
      userId: state.profile.id,
      userName: getProfileDisplayName(),
      dateKey: getTodayKey(),
      breaks: [...breaks, breakEntry],
      activeBreakStartedAt: null,
      activeBreakStartedBy: null,
      activeBreakStartedByName: null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  if (options.announce !== false) {
    await postDayMessage(`${getProfileDisplayName()} ended a break after ${formatDuration(durationMs)}.`);
    scheduleDayIdleTaskReminder();
    setStatus("Break stopped.", "success");
  }

  setActiveBreakState(null);
  return breakEntry;
}

async function postBreakList() {
  const workDay = await getWorkDay();
  const breaks = Array.isArray(workDay?.breaks) ? workDay.breaks : [];
  const lines = ["Breaks today:"];

  breaks.forEach((breakEntry, index) => {
    lines.push(
      `${index + 1}. ${formatBreakTimeRange(breakEntry)} (${formatDuration(getBreakDurationMs(breakEntry))})`
    );
  });

  if (workDay?.activeBreakStartedAt) {
    lines.push(
      `Running: ${formatDuration(Date.now() - getTimestampMillis(workDay.activeBreakStartedAt))} so far`
    );
  }

  if (lines.length === 1) {
    postLocalDayMessage("No breaks recorded today.");
    setStatus("No breaks recorded.", "success");
    return;
  }

  lines.push(`Total break time: ${formatDuration(getTotalBreakMs(workDay))}`);
  postLocalDayMessage(lines.join("\n"));
  setStatus("Breaks listed.", "success");
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
    userName: getProfileDisplayName(),
    startDateKey: parsedLeave.startDateKey,
    endDateKey: parsedLeave.endDateKey,
    reason: parsedLeave.reason,
    status: "scheduled",
    createdAt: serverTimestamp(),
    canceledAt: null,
  });

  await postDayMessage(
    `${getProfileDisplayName()} scheduled leave ${formatDateRange(parsedLeave.startDateKey, parsedLeave.endDateKey)}: ${parsedLeave.reason} (${formatLeaveId(leaveRef.id)})`
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
    `${getProfileDisplayName()} canceled leave ${formatDateRange(leave.startDateKey, leave.endDateKey)}: ${leave.reason} (${formatLeaveId(leave.id)})`
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
  const breakMs = getTotalBreakMs(workDay);
  const trackedMs = taskTrackedMs + generalTrackedMs;
  const plannedTaskIds = normalizeIdList(workDay?.plannedTaskIds);
  const plannedTasks = tasks.filter((task) => plannedTaskIds.includes(task.id));
  const completedPlannedTasks = plannedTasks.filter((task) => task.status === "complete");
  const unfinishedPlannedTasks = plannedTasks.filter((task) => task.status !== "complete");
  const lines = [
    `Work summary for ${formatSummaryDate(start)}`,
  ];

  if (options.includePlan && workDay?.plan) {
    lines.push(`Plan: ${workDay.plan}`);
  }

  if (workDay?.availabilityStatus === "free") {
    lines.push(`Availability: ${formatDayAvailabilityStatus(workDay)}`);
  }

  lines.push(`Time tracked: ${formatDuration(trackedMs)}`);
  if (generalTrackedMs > 0) {
    lines.push(`General time: ${formatDuration(generalTrackedMs)}`);
  }
  if (breakMs > 0) {
    lines.push(`Break time: ${formatDuration(breakMs)}`);
  }
  if (plannedTasks.length > 0) {
    lines.push(
      `Planned tasks: ${plannedTasks.length} (${completedPlannedTasks.length} complete, ${unfinishedPlannedTasks.length} pending)`
    );
    unfinishedPlannedTasks.slice(0, 10).forEach((task) => {
      lines.push(`- Pending planned: ${task.description}${formatTaskLabels(task.labels)}`);
    });
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

  if (workDay?.activeBreakStartedAt) {
    lines.push(
      `Break running: ${formatDuration(Date.now() - getTimestampMillis(workDay.activeBreakStartedAt))}`
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
    !activeGeneralTimer?.data?.activeTimerStartedAt &&
    breakMs === 0 &&
    !workDay?.activeBreakStartedAt &&
    plannedTasks.length === 0
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

async function buildTaskPreviewsForText(text) {
  const taskIds = extractTaskIdsFromText(text).slice(0, TASK_PREVIEW_LIMIT);

  if (taskIds.length === 0) {
    return [];
  }

  const previews = [];

  for (const taskId of taskIds) {
    const task = await findTaskById(taskId);

    if (!task) {
      continue;
    }

    const taskWithComments = await loadTaskCommentSummary(task);
    previews.push(serializeTaskForMessage(taskWithComments));
  }

  return previews;
}

function extractTaskIdsFromText(text) {
  const taskIds = [];
  const seen = new Set();
  const matches = String(text || "").matchAll(/(?:^|[\s([{])#([a-z0-9]{4,24})(?=$|[\s.,;:!?)}\]])/gi);

  for (const match of matches) {
    const taskId = match[1];
    const normalizedTaskId = taskId.toLowerCase();

    if (seen.has(normalizedTaskId)) {
      continue;
    }

    seen.add(normalizedTaskId);
    taskIds.push(taskId);
  }

  return taskIds;
}

function serializeTaskForMessage(task) {
  return {
    id: task.id,
    description: task.description || "Untitled task",
    labels: Array.isArray(task.labels) ? task.labels : [],
    subtasks: normalizeSubtasks(task.subtasks),
    status: task.status || "pending",
    createdAt: task.createdAt || null,
    createdByName: task.createdByName || "",
    completedAt: task.completedAt || null,
    completedByName: task.completedByName || "",
    totalTrackedMs: Number.isFinite(task.totalTrackedMs) ? task.totalTrackedMs : 0,
    activeTimerStartedAt: task.activeTimerStartedAt || null,
    activeTimerStartedBy: task.activeTimerStartedBy || "",
    activeTimerStartedByName: task.activeTimerStartedByName || "",
    commentCount: Number.isFinite(task.commentCount) ? task.commentCount : 0,
  };
}

function normalizeSubtasks(subtasks) {
  if (!Array.isArray(subtasks)) {
    return [];
  }

  return subtasks
    .map((subtask) => ({
      id: String(subtask?.id || "").trim(),
      text: String(subtask?.text || "").trim(),
      status: subtask?.status === "complete" ? "complete" : "pending",
      createdAt: subtask?.createdAt || null,
      createdBy: subtask?.createdBy || null,
      createdByName: subtask?.createdByName || "",
      completedAt: subtask?.completedAt || null,
      completedBy: subtask?.completedBy || null,
      completedByName: subtask?.completedByName || "",
    }))
    .filter((subtask) => subtask.id && subtask.text);
}

function normalizeMessageReactions(reactions) {
  if (!Array.isArray(reactions)) {
    return [];
  }

  return reactions
    .map((entry) => ({
      reaction: normalizeMessageReaction(entry?.reaction),
      userId: String(entry?.userId || "").trim(),
      userName: String(entry?.userName || "").trim(),
      createdAt: entry?.createdAt || null,
    }))
    .filter((entry) => entry.reaction && entry.userId);
}

function normalizeMessageReaction(reaction) {
  return String(reaction || "").trim().slice(0, 8);
}

function summarizeMessageReactions(reactions) {
  const grouped = new Map();

  normalizeMessageReactions(reactions).forEach((entry) => {
    if (!grouped.has(entry.reaction)) {
      grouped.set(entry.reaction, {
        reaction: entry.reaction,
        count: 0,
        userNames: [],
      });
    }

    const summary = grouped.get(entry.reaction);
    summary.count += 1;
    summary.userNames.push(entry.userName || "Someone");
  });

  return [...grouped.values()].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return left.reaction.localeCompare(right.reaction);
  });
}

function hasCurrentUserMessageReaction(reactions, reaction) {
  const normalizedReaction = normalizeMessageReaction(reaction);
  return normalizeMessageReactions(reactions).some(
    (entry) => entry.userId === state.profile?.id && entry.reaction === normalizedReaction
  );
}

function getSubtaskSummary(task) {
  const subtasks = normalizeSubtasks(task.subtasks);

  return {
    total: subtasks.length,
    completed: subtasks.filter((subtask) => subtask.status === "complete").length,
  };
}

function findSubtaskById(subtasks, subtaskIdInput) {
  const normalizedId = normalizeSubtaskId(subtaskIdInput);

  if (!normalizedId) {
    return null;
  }

  const exactMatch = subtasks.find((subtask) => normalizeSubtaskId(subtask.id) === normalizedId);

  if (exactMatch) {
    return exactMatch;
  }

  const prefixMatches = subtasks.filter((subtask) => normalizeSubtaskId(subtask.id).startsWith(normalizedId));
  return prefixMatches.length === 1 ? prefixMatches[0] : null;
}

function generateSubtaskId() {
  return `s${Math.random().toString(36).slice(2, 8)}`;
}

function formatSubtaskId(subtaskId) {
  const normalizedId = normalizeSubtaskId(subtaskId);
  return normalizedId ? `@${normalizedId.slice(0, 6)}` : "@subtask";
}

function normalizeSubtaskId(subtaskId) {
  return String(subtaskId || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function serializeTaskCommentForMessage(comment) {
  return {
    id: comment.id,
    text: comment.text || "",
    createdAt: comment.createdAt || null,
    createdBy: comment.createdBy || null,
    createdByName: comment.createdByName || "",
  };
}

function serializeQueryForMessage(queryData) {
  return {
    id: queryData.id,
    text: queryData.text || "Untitled query",
    status: queryData.status === "answered" ? "answered" : "pending",
    createdAt: queryData.createdAt || null,
    createdBy: queryData.createdBy || null,
    createdByName: queryData.createdByName || "",
    answeredAt: queryData.answeredAt || null,
    answeredBy: queryData.answeredBy || null,
    answeredByName: queryData.answeredByName || "",
    responseText: queryData.responseText || "",
    taskId: queryData.taskId || null,
    taskDescription: queryData.taskDescription || "",
  };
}

function serializeLeadForMessage(leadData) {
  return {
    id: leadData.id,
    name: leadData.name || "Untitled lead",
    phone: leadData.phone || "",
    email: leadData.email || "",
    company: leadData.company || "",
    source: leadData.source || "",
    status: leadData.status || "new",
    owner: leadData.owner || "",
    notes: leadData.notes || "",
    createdAt: leadData.createdAt || null,
    createdBy: leadData.createdBy || null,
    createdByName: leadData.createdByName || "",
    updatedAt: leadData.updatedAt || null,
    updatedBy: leadData.updatedBy || null,
    updatedByName: leadData.updatedByName || "",
  };
}

async function findQueryById(queryIdInput) {
  const normalizedId = normalizeQueryId(queryIdInput);

  if (!normalizedId) {
    return null;
  }

  const directSnapshot = await getDoc(doc(state.db, "rooms", state.roomId, "queries", normalizedId));

  if (directSnapshot.exists()) {
    return {
      id: directSnapshot.id,
      ...directSnapshot.data(),
    };
  }

  const queries = await loadRoomQueries();
  const matches = queries.filter((queryData) => queryData.id.toLowerCase().startsWith(normalizedId));

  return matches.length === 1 ? matches[0] : null;
}

async function loadRoomQueries() {
  const queriesSnapshot = await getDocs(collection(state.db, "rooms", state.roomId, "queries"));

  return queriesSnapshot.docs.map((queryDoc) => ({
    id: queryDoc.id,
    ...queryDoc.data(),
  }));
}

async function loadPendingRoomQueries() {
  const pendingQueries = query(
    collection(state.db, "rooms", state.roomId, "queries"),
    where("status", "==", "pending")
  );
  const queriesSnapshot = await getDocs(pendingQueries);

  return queriesSnapshot.docs.map((queryDoc) => ({
    id: queryDoc.id,
    ...queryDoc.data(),
  }));
}

async function findLeadById(leadIdInput) {
  const normalizedId = normalizeLeadId(leadIdInput);

  if (!normalizedId) {
    return null;
  }

  const directSnapshot = await getDoc(doc(state.db, "rooms", state.roomId, "leads", normalizedId));

  if (directSnapshot.exists()) {
    return {
      id: directSnapshot.id,
      ...directSnapshot.data(),
    };
  }

  const leads = await loadRoomLeads();
  const matches = leads.filter((lead) => lead.id.toLowerCase().startsWith(normalizedId));

  return matches.length === 1 ? matches[0] : null;
}

async function loadRoomLeads() {
  const leadsSnapshot = await getDocs(collection(state.db, "rooms", state.roomId, "leads"));

  return leadsSnapshot.docs.map((leadDoc) => ({
    id: leadDoc.id,
    ...leadDoc.data(),
  }));
}

async function loadRoomTasks() {
  const tasksSnapshot = await getDocs(collection(state.db, "rooms", state.roomId, "tasks"));

  return tasksSnapshot.docs.map((taskDoc) => ({
    id: taskDoc.id,
    ...taskDoc.data(),
  }));
}

async function loadTasksByIds(taskIds) {
  const tasks = [];

  for (const taskId of normalizeIdList(taskIds)) {
    const task = await findTaskById(taskId);

    if (task) {
      tasks.push(task);
    }
  }

  return tasks;
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

async function loadTaskComments(taskId) {
  const commentsQuery = query(
    collection(state.db, "rooms", state.roomId, "tasks", taskId, "comments"),
    orderBy("createdAt", "asc")
  );
  const commentsSnapshot = await getDocs(commentsQuery);

  return commentsSnapshot.docs.map((commentDoc) => ({
    id: commentDoc.id,
    ...commentDoc.data(),
  }));
}

async function loadTaskCommentSummary(task) {
  const comments = await loadTaskComments(task.id);

  return {
    ...task,
    commentCount: comments.length,
  };
}

async function loadWorkDayTimeEntries() {
  const entriesSnapshot = await getDocs(collection(getWorkDayRef(), "timeEntries"));

  return entriesSnapshot.docs.map((entryDoc) => ({
    id: entryDoc.id,
    ...entryDoc.data(),
  }));
}

async function getWorkDay(dateKey = getTodayKey()) {
  const snapshot = await getDoc(getWorkDayRef(dateKey));
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

function getWorkDayRef(dateKey = getTodayKey()) {
  return doc(state.db, "rooms", state.roomId, "workDays", `${state.profile.id}_${dateKey}`);
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

async function loadCompletedRoomTasks() {
  const completedTasksQuery = query(
    collection(state.db, "rooms", state.roomId, "tasks"),
    where("status", "==", "complete")
  );
  const tasksSnapshot = await getDocs(completedTasksQuery);

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

async function postCodexMessage(text) {
  await addDoc(collection(state.db, "rooms", state.roomId, "messages"), {
    text,
    senderId: state.profile.id,
    senderName: "Codex",
    type: "codex",
    createdAt: serverTimestamp(),
  });
}

async function recordTaskTimeEntry(task, startedAt, stoppedAt, durationMs) {
  await addDoc(collection(state.db, "rooms", state.roomId, "tasks", task.id, "timeEntries"), {
    taskId: task.id,
    taskDescription: task.description,
    userId: state.profile.id,
    userName: getProfileDisplayName(),
    startedAt: normalizeTimestampDate(startedAt),
    stoppedAt,
    durationMs,
    createdAt: serverTimestamp(),
  });
}

async function recordGeneralTimeEntry(startedAt, stoppedAt, durationMs, workDayRef = getWorkDayRef()) {
  await addDoc(collection(workDayRef, "timeEntries"), {
    description: "General work",
    userId: state.profile.id,
    userName: getProfileDisplayName(),
    startedAt: normalizeTimestampDate(startedAt),
    stoppedAt,
    durationMs,
    createdAt: serverTimestamp(),
  });
}

function postLocalTaskMessage(text, actions = []) {
  postLocalMessage(text, "Tasks (only you)", "task", actions);
}

function postLocalTaskListMessage(heading, tasks, fallbackText, options = {}) {
  postLocalMessage(fallbackText, "Tasks (only you)", "task-list", [], {
    heading,
    tasks,
    maskIdentity: isPrivacyModeActive(),
    rolloverReview: Boolean(options.rolloverReview),
    rolloverDateKey: options.rolloverDateKey || "",
    plannedDateKey: options.plannedDateKey || "",
    privateAliases: options.privateAliases || null,
  });
}

function postLocalDailyTaskReviewMessage(heading, tasks, sourceDateKey) {
  postLocalTaskListMessage(
    heading,
    tasks,
    `${heading}:\n${tasks.map((task) => `${formatTaskId(task.id)} - ${task.description || "Untitled task"}`).join("\n")}`,
    {
      rolloverReview: true,
      rolloverDateKey: sourceDateKey,
    }
  );
}

function postLocalTaskProcessMessage(task, remainingCount, comments = []) {
  const taskId = formatTaskId(task.id);
  const actions = [
    {
      label: "Complete",
      action: "task-process-complete",
      taskId: task.id,
    },
    {
      label: "Comment",
      action: "task-comment-draft",
      taskId: task.id,
    },
    {
      label: "Subtask",
      action: "task-subtask-draft",
      taskId: task.id,
    },
    {
      label: "Query",
      action: "task-query-draft",
      taskId: task.id,
    },
    {
      label: "Start timer",
      action: "task-start",
      taskId: task.id,
    },
    {
      label: "Skip",
      action: "task-process-skip",
      taskId: task.id,
    },
    {
      label: "Stop process",
      action: "task-process-stop",
    },
  ];

  postLocalMessage(
    `Task process\n${taskId} - ${task.description}\nOptions: complete, comment, subtask, query, start timer, skip, or stop.`,
    "Tasks (only you)",
    "task-process",
    actions,
    {
      heading: "Next task",
      task,
      comments,
      remainingCount,
      maskIdentity: isPrivacyModeActive(),
      hint: `Send /task process next to skip this task, or /task process stop to end the process.`,
    }
  );
}

function postLocalTaskCommentsMessage(task, comments) {
  postLocalMessage(
    `Comments for ${formatTaskId(task.id)}: ${task.description}`,
    "Tasks (only you)",
    "task-comments",
    [
      {
        label: "Add comment",
        action: "task-comment-draft",
        taskId: task.id,
      },
    ],
    {
      task,
      comments,
      maskIdentity: isPrivacyModeActive(),
    }
  );
}

function postLocalDayMessage(text, actions = [], extra = {}) {
  postLocalMessage(text, "Day (only you)", "day", actions, extra);
}

function postLocalCodexMessage(text) {
  postLocalMessage(text, "Codex (only you)", "codex");
}

function postLocalQueryMessage(text, actions = [], extra = {}) {
  postLocalMessage(text, "Queries (only you)", extra.type || "query", actions, extra);
}

function postLocalPluginMessage(text) {
  postLocalMessage(text, "Plugins (only you)", "plugin");
}

function postLocalLeadMessage(text, actions = [], extra = {}) {
  postLocalMessage(text, "Leads (only you)", extra.type || "lead", actions, extra);
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
  updateLocalMessagesUi();
  renderMessages();
}

function runLocalAction(actionButton, action, successText) {
  const messageId = actionButton.closest(".message")?.dataset.messageId || "";
  const actionGroup = actionButton.closest(".message-actions");
  const actionButtons = actionGroup ? [...actionGroup.querySelectorAll("button")] : [actionButton];
  const originalText = actionButton.textContent;

  actionButtons.forEach((button) => {
    button.disabled = true;
  });
  actionButton.textContent = "Working...";

  let actionPromise;

  try {
    actionPromise = typeof action === "function" ? action() : action;
  } catch (error) {
    console.error("Local action failed:", error);
    actionButton.textContent = originalText;
    actionButtons.forEach((button) => {
      button.disabled = false;
    });
    setStatus("Action failed. Try again.", "error");
    return;
  }

  void Promise.resolve(actionPromise)
    .then((result) => {
      const replacementText =
        typeof successText === "function" ? successText(result) : successText || actionButton.dataset.successText;

      if (replacementText) {
        replaceLocalMessage(messageId, replacementText);
        return;
      }

      renderMessages();
    })
    .catch((error) => {
      console.error("Local action failed:", error);
      actionButton.textContent = originalText;
      actionButtons.forEach((button) => {
        button.disabled = false;
      });
      setStatus("Action failed. Try again.", "error");
    });
}

function replaceLocalMessage(messageId, text, extra = {}) {
  const index = state.localMessages.findIndex((message) => message.id === messageId);

  if (index === -1) {
    postLocalMessage(text, extra.senderName || "App (only you)", extra.type || "local");
    return;
  }

  state.localMessages[index] = {
    ...state.localMessages[index],
    ...extra,
    text,
    actions: [],
    createdAt: new Date(),
  };
  syncStealthLayout();
  updatePrivacyIndicator();
  updateLocalMessagesUi();
  renderMessages();
}

function clearLocalMessages(options = {}) {
  if (state.localMessages.length === 0) {
    return;
  }

  clearLocalMessagesState();

  if (!options.silent) {
    setStatus("Only me messages cleared.", "success");
  }
}

function clearLocalMessagesState() {
  state.localMessages = [];
  syncStealthLayout();
  updatePrivacyIndicator();
  updateLocalMessagesUi();
  renderMessages();
}

function updateLocalMessagesUi() {
  if (!clearLocalMessagesButton) {
    return;
  }

  const hasLocalMessages = state.localMessages.length > 0;
  clearLocalMessagesButton.hidden = !hasLocalMessages;
  clearLocalMessagesButton.disabled = !hasLocalMessages;
}

function startQueryReminderSync() {
  clearQueryReminderSync();
  void syncQueryReminders();

  state.queryReminderSyncIntervalId = window.setInterval(() => {
    void syncQueryReminders();
  }, QUERY_REMINDER_SYNC_MS);
}

async function syncQueryReminders() {
  if (!state.db || !state.roomId || !state.profile) {
    return;
  }

  try {
    const queries = (await loadPendingRoomQueries()).filter(shouldRemindCurrentUserForQuery);
    const activeQueryIds = new Set();

    queries.forEach((queryData) => {
      activeQueryIds.add(queryData.id);

      if (!state.queryReminderTimeouts.has(queryData.id)) {
        scheduleQueryReminder(queryData);
      }
    });

    [...state.queryReminderTimeouts.keys()].forEach((queryId) => {
      if (!activeQueryIds.has(queryId)) {
        clearQueryReminder(queryId);
      }
    });
  } catch (error) {
    console.error("Query reminder sync failed:", error);
  }
}

function scheduleQueryReminder(queryData) {
  clearQueryReminder(queryData.id);

  if (queryData.status === "answered" || !shouldRemindCurrentUserForQuery(queryData)) {
    return;
  }

  const intervalMs = getQueryReminderIntervalMs(queryData);
  const lastReminderAt = getQueryReminderBaseTime(queryData);
  const delayMs = Math.max(0, lastReminderAt + intervalMs - Date.now());
  const timeoutId = window.setTimeout(() => {
    void handleQueryReminder(queryData.id);
  }, delayMs);

  state.queryReminderTimeouts.set(queryData.id, { timeoutId });
}

async function handleQueryReminder(queryId) {
  state.queryReminderTimeouts.delete(queryId);

  const queryData = await findQueryById(queryId);

  if (!queryData || queryData.status === "answered" || !shouldRemindCurrentUserForQuery(queryData)) {
    return;
  }

  const reminderCount = Number.isFinite(queryData.reminderCount) ? queryData.reminderCount : 0;
  const remindedAt = new Date();
  const remindedQuery = {
    ...queryData,
    lastReminderAt: remindedAt,
    reminderCount: reminderCount + 1,
  };

  postLocalQueryMessage(
    `${getQueryReminderLeadText(queryData)}\nQuery ${formatQueryId(queryData.id)}: ${queryData.text}\nRespond with /query respond ${formatQueryId(queryData.id)} <response>${queryData.createdBy === state.profile?.id ? ` or close with /query close ${formatQueryId(queryData.id)}` : ""}.`,
    [],
    {
      type: "query-view",
      query: serializeQueryForMessage(remindedQuery),
    }
  );
  void showQueryReminderNotification(remindedQuery);
  scheduleQueryReminder(remindedQuery);
  setStatus("Query reminder.", "success");
}

function clearQueryReminder(queryId) {
  const reminder = state.queryReminderTimeouts.get(queryId);

  if (!reminder?.timeoutId) {
    return;
  }

  window.clearTimeout(reminder.timeoutId);
  state.queryReminderTimeouts.delete(queryId);
}

function clearQueryReminders() {
  state.queryReminderTimeouts.forEach((reminder) => {
    if (reminder?.timeoutId) {
      window.clearTimeout(reminder.timeoutId);
    }
  });
  state.queryReminderTimeouts.clear();
}

function clearQueryReminderSync() {
  if (!state.queryReminderSyncIntervalId) {
    return;
  }

  window.clearInterval(state.queryReminderSyncIntervalId);
  state.queryReminderSyncIntervalId = null;
}

function getQueryReminderIntervalMs(queryData) {
  return Number.isFinite(queryData.reminderIntervalMs) && queryData.reminderIntervalMs > 0
    ? queryData.reminderIntervalMs
    : QUERY_REMINDER_MS;
}

function getQueryReminderBaseTime(queryData) {
  const lastReminderTime = getTimestampMillis(queryData.lastReminderAt);

  if (lastReminderTime > 0) {
    return lastReminderTime;
  }

  const createdTime = getTimestampMillis(queryData.createdAt);
  return createdTime > 0 ? createdTime : Date.now();
}

function shouldRemindCurrentUserForQuery(queryData) {
  if (!queryData || queryData.status === "answered" || !state.profile?.id) {
    return false;
  }

  const audience = normalizeQueryReminderAudience(state.queryReminderAudience);
  const isAsker = queryData.createdBy === state.profile.id;

  if (audience === QUERY_REMINDER_AUDIENCE_ASKER) {
    return isAsker;
  }

  if (audience === QUERY_REMINDER_AUDIENCE_OTHERS) {
    return !isAsker;
  }

  return true;
}

function getQueryReminderLeadText(queryData) {
  return queryData.createdBy === state.profile?.id
    ? "Still waiting for a response."
    : "Please respond to this query.";
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

function startTaskTimerReminderSync() {
  clearTaskTimerReminderSync();
  void syncActiveTaskTimerReminders();

  state.taskTimerReminderSyncIntervalId = window.setInterval(() => {
    void syncActiveTaskTimerReminders();
  }, TASK_TIMER_REMINDER_SYNC_MS);
}

async function syncActiveTaskTimerReminders() {
  if (!state.db || !state.roomId || !state.profile) {
    return;
  }

  try {
    const unavailableReason = await getTimerUnavailableReason();

    if (unavailableReason) {
      await pauseActiveTimersForCurrentUser("non-work time");
      clearTaskTimerReminders();
      return;
    }

    const [tasks, activeGeneralTimer] = await Promise.all([
      loadRoomTasks(),
      findActiveGeneralTimer(),
    ]);
    const activeOwnedTasks = tasks.filter(
      (task) =>
        task.status !== "complete" &&
        task.activeTimerStartedAt &&
        isCurrentUserTaskTimerOwner(task)
    );
    const activeReminderIds = new Set();

    activeOwnedTasks.forEach((task) => {
      activeReminderIds.add(task.id);

      if (!state.taskTimerReminderTimeouts.has(task.id)) {
        scheduleTaskTimerReminder({
          id: task.id,
          description: task.description || "Untitled task",
          startedAt: task.activeTimerStartedAt,
        });
      }
    });

    if (activeGeneralTimer?.data?.activeTimerStartedAt) {
      const reminderId = getGeneralTimerReminderId();
      activeReminderIds.add(reminderId);

      if (!state.taskTimerReminderTimeouts.has(reminderId)) {
        scheduleTaskTimerReminder({
          id: reminderId,
          description: "General work",
          startedAt: activeGeneralTimer.data.activeTimerStartedAt,
          activeTimerStartedAt: activeGeneralTimer.data.activeTimerStartedAt,
          isGeneralTimer: true,
          ref: activeGeneralTimer.ref,
        });
      }
    }

    [...state.taskTimerReminderTimeouts.keys()].forEach((reminderId) => {
      if (!activeReminderIds.has(reminderId)) {
        clearTaskTimerReminder(reminderId);
      }
    });

    if (activeReminderIds.size > 0) {
      clearDayIdleTaskReminder();
    }
  } catch (error) {
    console.error("Active timer reminder sync failed:", error);
  }
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
      userName: getProfileDisplayName(),
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

function clearTaskTimerReminderSync() {
  if (!state.taskTimerReminderSyncIntervalId) {
    return;
  }

  window.clearInterval(state.taskTimerReminderSyncIntervalId);
  state.taskTimerReminderSyncIntervalId = null;
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
    `Reminder: Your day is started, but no timer is running.\nStart a general timer with /task start, start a task with /task start <id>, or create one with /task create <description>.`
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

    if (workDay.activeBreakStartedAt) {
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

function compareActiveTimersByStartedAt(left, right) {
  const leftTime = getTimestampMillis(left.activeTimerStartedAt);
  const rightTime = getTimestampMillis(right.activeTimerStartedAt);

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return String(left.id || "").localeCompare(String(right.id || ""));
}

function compareTasksByCreatedAt(left, right) {
  const leftTime = left.createdAt?.toMillis?.() ?? 0;
  const rightTime = right.createdAt?.toMillis?.() ?? 0;

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return left.id.localeCompare(right.id);
}

function compareTasksByCompletedAt(left, right) {
  const leftTime = getTimestampMillis(left.completedAt);
  const rightTime = getTimestampMillis(right.completedAt);

  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  return left.id.localeCompare(right.id);
}

function compareQueriesByCreatedAt(left, right) {
  const leftTime = getTimestampMillis(left.createdAt);
  const rightTime = getTimestampMillis(right.createdAt);

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return left.id.localeCompare(right.id);
}

function compareLeadsByCreatedAt(left, right) {
  const leftTime = getTimestampMillis(left.createdAt);
  const rightTime = getTimestampMillis(right.createdAt);

  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  return String(left.id || "").localeCompare(String(right.id || ""));
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

async function maybeHydrateTaskEditDraft() {
  const match = messageInput.value.trim().match(/^\/task\s+edit\s+(#?[a-z0-9]{6,24})$/i);

  if (!match || !state.db || !state.roomId) {
    return;
  }

  const task = await findTaskById(match[1]);

  if (!task || messageInput.value.trim() !== match[0]) {
    return;
  }

  const draftValue = `/task edit ${formatTaskId(task.id)} ${task.description || ""}`.trimEnd();

  if (messageInput.value === draftValue) {
    return;
  }

  messageInput.value = draftValue;
  messageInput.focus();
  messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
  syncMessageMaskOverlay();
  hideCommandAutocomplete();
  setStatus("Task loaded for editing. Update the text and send.", "success");
}

function draftTaskComment(taskId) {
  if (!taskId) {
    return;
  }

  messageInput.value = `/task comment ${formatTaskId(taskId)} `;
  messageInput.focus();
  messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
  handleMessageInputChange();
  setStatus("Write the task comment and send when ready.", "success");
}

function draftTaskSubtask(taskId) {
  if (!taskId) {
    return;
  }

  messageInput.value = `/task subtask ${formatTaskId(taskId)} `;
  messageInput.focus();
  messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
  handleMessageInputChange();
  setStatus("Write the subtask and send when ready.", "success");
}

function draftTaskQuery(taskId) {
  if (!taskId) {
    return;
  }

  messageInput.value = `/query task ${formatTaskId(taskId)} `;
  messageInput.focus();
  messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
  handleMessageInputChange();
  setStatus("Write the task query and send when ready.", "success");
}

function draftQueryResponse(queryId) {
  if (!queryId) {
    return;
  }

  messageInput.value = `/query respond ${formatQueryId(queryId)} `;
  messageInput.focus();
  messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
  handleMessageInputChange();
  setStatus("Write the query response and send when ready.", "success");
}

function draftNewLead() {
  messageInput.value = "/lead name phone: email: company: source: notes:";
  messageInput.focus();
  messageInput.setSelectionRange("/lead ".length, "/lead name".length);
  syncMessageMaskOverlay();
  handleMessageInputChange();
  setStatus("Fill the lead fields and send when ready.", "success");
}

function draftLeadUpdate(leadId) {
  if (!leadId) {
    return;
  }

  messageInput.value = `/lead update ${formatLeadId(leadId)} status: owner: notes:`;
  messageInput.focus();
  messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
  syncMessageMaskOverlay();
  handleMessageInputChange();
  setStatus("Update the lead fields and send when ready.", "success");
}

function formatTaskId(taskId) {
  return `#${taskId.slice(0, 6)}`;
}

function formatQueryId(queryId) {
  return `?${String(queryId || "").slice(0, 6)}`;
}

function formatLeadId(leadId) {
  return `~${String(leadId || "").slice(0, 6)}`;
}

function normalizeQueryId(queryId) {
  return String(queryId || "")
    .trim()
    .replace(/^[?#]/, "")
    .toLowerCase();
}

function normalizeLeadId(leadId) {
  return String(leadId || "")
    .trim()
    .replace(/^[~#]/, "")
    .toLowerCase();
}

function formatCodexCommandId(commandId) {
  return `#${String(commandId || "").slice(0, 6)}`;
}

function formatDayAvailabilityStatus(workDay) {
  if (workDay?.availabilityStatus !== "free") {
    return "Unknown";
  }

  const reason = String(workDay.availabilityReason || "").trim();
  return reason ? `Free: ${reason}` : "Free";
}

function createTaskPrivacyAliases(tasks) {
  const aliases = new Map();
  let index = 1;

  tasks.forEach((task) => {
    [task.createdBy, task.completedBy, task.activeTimerStartedBy].forEach((userId) => {
      if (!userId || aliases.has(userId)) {
        return;
      }

      aliases.set(userId, `User ${index}`);
      index += 1;
    });
  });

  return aliases;
}

function createTaskCommentPrivacyAliases(comments) {
  const aliases = new Map();
  let index = 1;

  comments.forEach((comment) => {
    if (!comment.createdBy || aliases.has(comment.createdBy)) {
      return;
    }

    aliases.set(comment.createdBy, `User ${index}`);
    index += 1;
  });

  return aliases;
}

function formatTaskPersonName(userId, fallbackName = "Unknown", privateAliases = null, options = {}) {
  if (!options.maskIdentity) {
    return fallbackName || "Unknown";
  }

  if (userId && privateAliases?.has?.(userId)) {
    return privateAliases.get(userId);
  }

  return "User";
}

function formatTaskCommentAuthor(comment, privateAliases = null, options = {}) {
  return formatTaskPersonName(comment.createdBy, comment.createdByName || "Unknown", privateAliases, options);
}

function formatTaskCommentText(comment, privateAliases = null, options = {}) {
  const text = comment.text || "";

  if (!options.maskIdentity) {
    return text;
  }

  const author = formatTaskCommentAuthor(comment, privateAliases, options);
  const storedName = escapeRegExp(comment.createdByName || state.profile?.name || "");

  if (!storedName) {
    return text;
  }

  return text.replace(new RegExp(`\\bfrom\\s+${storedName}:`, "gi"), `from ${author}:`);
}

function formatQueryPersonName(userId, fallbackName = "Unknown") {
  return formatTaskPersonName(userId, fallbackName, null, { maskIdentity: isPrivacyModeActive() });
}

function normalizeIdList(ids) {
  if (!Array.isArray(ids)) {
    return [];
  }

  const seen = new Set();
  const normalizedIds = [];

  ids.forEach((id) => {
    const normalizedId = String(id || "").trim();
    const dedupeKey = normalizedId.toLowerCase();

    if (!normalizedId || seen.has(dedupeKey)) {
      return;
    }

    seen.add(dedupeKey);
    normalizedIds.push(normalizedId);
  });

  return normalizedIds;
}

function mergeUniqueIds(existingIds, addedIds) {
  return normalizeIdList([...normalizeIdList(existingIds), ...normalizeIdList(addedIds)]);
}

async function resolveTaskIdsForDailyPlan(taskIdInputs) {
  const tasks = [];
  const notFound = [];
  const seenTaskIds = new Set();

  for (const taskIdInput of taskIdInputs) {
    const task = await findTaskById(taskIdInput);

    if (!task) {
      notFound.push(taskIdInput);
      continue;
    }

    if (seenTaskIds.has(task.id)) {
      continue;
    }

    seenTaskIds.add(task.id);
    tasks.push(task);
  }

  return { tasks, notFound };
}

function sortTasksByPlannedOrder(tasks, plannedTaskIds) {
  const order = new Map(normalizeIdList(plannedTaskIds).map((taskId, index) => [taskId, index]));

  return [...tasks].sort((left, right) => {
    const leftIndex = order.has(left.id) ? order.get(left.id) : Number.MAX_SAFE_INTEGER;
    const rightIndex = order.has(right.id) ? order.get(right.id) : Number.MAX_SAFE_INTEGER;

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return compareTasksByCreatedAt(left, right);
  });
}

function getPreviousDateKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() - 1);
  return formatDateKey(date);
}

function formatTaskPlanDate(dateKey) {
  if (dateKey === getTodayKey()) {
    return "today";
  }

  if (dateKey === parseDateKey("tomorrow")) {
    return "tomorrow";
  }

  return dateKey;
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

function getProfileDisplayName() {
  if (isPrivacyModeActive()) {
    return getPrivateAlias(state.profile?.id);
  }

  return state.profile?.name || "Anonymous";
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

function generateBreakId() {
  return `b${Math.random().toString(36).slice(2, 8)}`;
}

function getBreakDurationMs(breakEntry) {
  if (Number.isFinite(breakEntry?.durationMs)) {
    return breakEntry.durationMs;
  }

  const startedAt = getTimestampMillis(breakEntry?.startedAt);
  const stoppedAt = getTimestampMillis(breakEntry?.stoppedAt);
  return startedAt && stoppedAt ? Math.max(0, stoppedAt - startedAt) : 0;
}

function getTotalBreakMs(workDay) {
  const breaks = Array.isArray(workDay?.breaks) ? workDay.breaks : [];
  const completedBreakMs = breaks.reduce((total, breakEntry) => total + getBreakDurationMs(breakEntry), 0);
  const activeBreakMs = workDay?.activeBreakStartedAt
    ? Math.max(0, Date.now() - getTimestampMillis(workDay.activeBreakStartedAt))
    : 0;

  return completedBreakMs + activeBreakMs;
}

function formatBreakTimeRange(breakEntry) {
  const startedAt = normalizeTimestampDate(breakEntry?.startedAt);
  const stoppedAt = normalizeTimestampDate(breakEntry?.stoppedAt);
  const formatter = new Intl.DateTimeFormat(undefined, {
    timeStyle: "short",
  });

  return `${formatter.format(startedAt)} - ${formatter.format(stoppedAt)}`;
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

function hideAllPrivacyMessages() {
  if (!state.isPrivacyEnabled) {
    enablePrivacyMode();
  }

  if (!state.isPrivacyEnabled) {
    return;
  }

  state.hiddenMessageIds = state.messages.map((message) => message.id);
  state.previewMessageIds = [];
  state.isPrivacyPreviewVisible = false;
  state.unreadMessageIds = [];
  clearPrivacyPreviewTimer();
  syncStealthLayout();
  updatePrivacyIndicator();
  updateDocumentTitle();
  updateAppBadge();
  renderMessages();
  persistSession();
  setStatus("All messages hidden.", "success");
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
        displayName: getProfileDisplayName(),
        lastReadMessageId: message.id,
        lastReadCreatedAt: message.createdAt,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    state.lastSyncedReadMessageId = message.id;
    setGroupUnreadCount(state.roomId, 0);
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
    .map((receipt) => formatReadReceiptName(receipt))
    .filter((name, index, names) => names.indexOf(name) === index)
    .sort((left, right) => left.localeCompare(right));
}

function formatReadReceiptName(receipt) {
  return formatTaskPersonName(receipt.userId, receipt.displayName || "Someone", null, {
    maskIdentity: isPrivacyModeActive(),
  });
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

async function showQueryReminderNotification(queryData) {
  if (
    !state.isNotificationsEnabled ||
    typeof Notification === "undefined" ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  const taskText = queryData.taskId ? `Task ${formatTaskId(queryData.taskId)}: ` : "";

  try {
    await showBrowserNotification("Query reminder", {
      body: `${getQueryReminderLeadText(queryData)} ${taskText}${queryData.text || "A query still needs a response."}`,
      tag: `query-${state.roomId}-${queryData.id}`,
      renotify: true,
      badge: "./icons/icon-192.png",
      icon: "./icons/icon-192.png",
      data: {
        roomId: state.roomId,
        queryId: queryData.id,
        notificationType: "query-reminder",
      },
    });
  } catch (error) {
    console.error("Query reminder notification failed:", error);
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

    if (state.isPrivacyEnabled) {
      const hiddenIds = new Set(state.hiddenMessageIds);
      return state.messages.filter(
        (message) => !hiddenIds.has(message.id) && (!isOwnMessage(message) || isTaskCreatedMessage(message))
      );
    }

    return state.messages;
  }

  const previewIds = new Set(state.previewMessageIds);
  return state.messages.filter((message) => previewIds.has(message.id));
}

function isOwnMessage(message) {
  return Boolean(message.senderId && message.senderId === state.profile?.id);
}

function isTaskCreatedMessage(message) {
  return message.type === "task" && /^Task\s+#[a-z0-9]+\s+created:/i.test(message.text || "");
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

  if (document.visibilityState === "visible") {
    void syncActiveTaskTimerReminders();
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

function loadJoinedRooms() {
  try {
    const raw = localStorage.getItem(JOINED_ROOMS_KEY);
    if (!raw) {
      return [];
    }

    const rooms = JSON.parse(raw);
    if (!Array.isArray(rooms)) {
      return [];
    }

    return rooms
      .map((room) => ({
        id: sanitizeRoomId(room?.id || ""),
        name: room?.name || room?.id || "",
        passcode: normalizePasscode(room?.passcode || room?.roomPasscode || ""),
        source: "joined",
      }))
      .filter((room) => room.id);
  } catch (error) {
    console.error(error);
    return [];
  }
}

function saveJoinedRooms() {
  localStorage.setItem(
    JOINED_ROOMS_KEY,
    JSON.stringify(
      state.joinedRooms.map((room) => ({
        id: room.id,
        name: room.name || room.id,
        passcode: room.passcode || "",
      }))
    )
  );
}

function recordJoinedRoom(roomId, roomPasscode = "", roomData = {}) {
  const nextRoom = {
    id: sanitizeRoomId(roomId),
    name: roomData?.name || roomId,
    passcode: normalizePasscode(roomPasscode || roomData?.passcode || ""),
    source: "joined",
  };

  if (!nextRoom.id) {
    return;
  }

  mergeAvailableRooms(state.joinedRooms, [nextRoom]);
  state.joinedRooms.sort((a, b) => a.id.localeCompare(b.id));
  saveJoinedRooms();
}

function normalizeRoomCommands(commands = DEFAULT_ROOM_COMMANDS) {
  return {
    enable: normalizeCommandPhrase(commands.enable) || DEFAULT_ROOM_COMMANDS.enable,
    reveal: normalizeCommandPhrase(commands.reveal) || DEFAULT_ROOM_COMMANDS.reveal,
    disable: normalizeCommandPhrase(commands.disable) || DEFAULT_ROOM_COMMANDS.disable,
  };
}

function normalizeRoomPlugins(plugins = {}) {
  return Object.fromEntries(
    Object.entries(plugins || {})
      .map(([pluginName, pluginConfig]) => [
        normalizePluginName(pluginName),
        {
          enabled: Boolean(pluginConfig?.enabled),
        },
      ])
      .filter(([pluginName]) => SUPPORTED_PLUGINS.has(pluginName))
  );
}

function normalizePluginName(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function formatPluginName(pluginName) {
  return pluginName === PLUGIN_LEADS ? "Leads" : pluginName;
}

function isRoomPluginEnabled(pluginName) {
  const normalizedPlugin = normalizePluginName(pluginName);
  return Boolean(state.roomPlugins?.[normalizedPlugin]?.enabled);
}

async function setRoomPluginEnabled(pluginName, enabled) {
  const normalizedPlugin = normalizePluginName(pluginName);

  if (!state.roomId || !SUPPORTED_PLUGINS.has(normalizedPlugin)) {
    return;
  }

  await setDoc(
    doc(state.db, "rooms", state.roomId),
    {
      plugins: {
        [normalizedPlugin]: {
          enabled: Boolean(enabled),
        },
      },
    },
    { merge: true }
  );
}

function postPluginList() {
  const lines = ["Group plugins:"];

  SUPPORTED_PLUGINS.forEach((pluginName) => {
    lines.push(`- ${formatPluginName(pluginName)}: ${isRoomPluginEnabled(pluginName) ? "enabled" : "disabled"}`);
  });

  postLocalPluginMessage(lines.join("\n"));
  setStatus("Plugins listed.", "success");
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

function loadGroupQueryReminderAudience(roomData) {
  return normalizeQueryReminderAudience(roomData?.settings?.queryReminderAudience);
}

function getEffectiveRoomCommands(roomId, groupCommands = {}) {
  return normalizeRoomCommands({
    ...groupCommands,
    ...loadRawLocalRoomCommands(roomId),
  });
}

function getEffectiveQueryReminderAudience(roomId, groupAudience = DEFAULT_QUERY_REMINDER_AUDIENCE) {
  const localSettings = loadRawLocalRoomCommands(roomId);
  return normalizeQueryReminderAudience(localSettings.queryReminderAudience, groupAudience);
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

function saveLocalRoomCommands(roomId, commands, groupAudience = state.groupQueryReminderAudience) {
  if (!roomId) {
    return;
  }

  const sanitizedCommands = stripLocalAdvancedSettings(commands, groupAudience);
  localStorage.setItem(
    getRoomCommandsStorageKey(roomId),
    JSON.stringify(sanitizedCommands)
  );
}

async function saveAdvancedSettings() {
  const queryReminderAudience = normalizeQueryReminderAudience(queryReminderAudienceInput.value);
  const rawCommands = {
    enable: normalizeCommandPhrase(privacyCommandInput.value),
    reveal: normalizeCommandPhrase(revealCommandInput.value),
    disable: normalizeCommandPhrase(disableCommandInput.value),
    queryReminderAudience,
  };

  setAdvancedSettingsVisibility(false);

  try {
    if (commandScopeInput.value === GROUP_COMMAND_SCOPE) {
      await saveGroupRoomCommands(state.roomId, rawCommands);
      state.groupRoomCommands = stripEmptyCommandFields(rawCommands);
      state.groupQueryReminderAudience = queryReminderAudience;
      localStorage.removeItem(getRoomCommandsStorageKey(state.roomId));
    } else {
      saveLocalRoomCommands(state.roomId, rawCommands, state.groupQueryReminderAudience);
    }

    state.roomCommands = getEffectiveRoomCommands(state.roomId, state.groupRoomCommands);
    state.queryReminderAudience = getEffectiveQueryReminderAudience(
      state.roomId,
      state.groupQueryReminderAudience
    );
    void syncQueryReminders();
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
      settings: {
        queryReminderAudience: normalizeQueryReminderAudience(commands.queryReminderAudience),
      },
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
  const groupQueryReminderAudience =
    cachedCommands?.groupQueryReminderAudience ?? state.groupQueryReminderAudience;

  if (scope === PERSONAL_COMMAND_SCOPE) {
    applyRoomCommandsToInputs(localCommands);
    applyQueryReminderAudienceToInput(
      normalizeQueryReminderAudience(localCommands.queryReminderAudience, groupQueryReminderAudience)
    );
    return;
  }

  applyRoomCommandsToInputs(groupCommands);
  applyQueryReminderAudienceToInput(groupQueryReminderAudience);
}

function hasCustomCommands(commands) {
  return Boolean(
    normalizeCommandPhrase(commands?.enable) ||
      normalizeCommandPhrase(commands?.reveal) ||
      normalizeCommandPhrase(commands?.disable) ||
      QUERY_REMINDER_AUDIENCES.has(commands?.queryReminderAudience)
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

function stripLocalAdvancedSettings(settings, groupAudience = DEFAULT_QUERY_REMINDER_AUDIENCE) {
  const sanitized = stripEmptyCommandFields(settings);
  const queryReminderAudience = normalizeQueryReminderAudience(settings?.queryReminderAudience);
  const normalizedGroupAudience = normalizeQueryReminderAudience(groupAudience);

  if (queryReminderAudience !== normalizedGroupAudience) {
    sanitized.queryReminderAudience = queryReminderAudience;
  }

  return sanitized;
}

function normalizeQueryReminderAudience(value, fallback = DEFAULT_QUERY_REMINDER_AUDIENCE) {
  const normalizedValue = String(value || "").trim().toLowerCase();

  if (QUERY_REMINDER_AUDIENCES.has(normalizedValue)) {
    return normalizedValue;
  }

  if (QUERY_REMINDER_AUDIENCES.has(fallback)) {
    return fallback;
  }

  return DEFAULT_QUERY_REMINDER_AUDIENCE;
}

function applyQueryReminderAudienceToInput(audience) {
  if (!queryReminderAudienceInput) {
    return;
  }

  queryReminderAudienceInput.value = normalizeQueryReminderAudience(audience);
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
    const groupQueryReminderAudience = state.groupQueryReminderAudience;
    const initialScope = hasCustomCommands(localCommands)
      ? PERSONAL_COMMAND_SCOPE
      : GROUP_COMMAND_SCOPE;
    commandScopeInput.value = initialScope;
    populateAdvancedSettingsForScope(initialScope, {
      localCommands,
      groupCommands,
      groupQueryReminderAudience,
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
    state.queryReminderAudience = getEffectiveQueryReminderAudience(saved.roomId);
    applyQueryReminderAudienceToInput(state.queryReminderAudience);
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
