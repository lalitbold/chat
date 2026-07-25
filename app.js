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
const replyPreview = document.getElementById("reply-preview");
const replyPreviewSender = document.getElementById("reply-preview-sender");
const replyPreviewText = document.getElementById("reply-preview-text");
const cancelReplyButton = document.getElementById("cancel-reply");
const messageInput = document.getElementById("message-input");
const messageMaskOverlay = document.getElementById("message-mask-overlay");
let commandSuggestions = document.getElementById("command-suggestions");
const voiceTypeButton = document.getElementById("voice-type-button");
const voiceRecordButton = document.getElementById("voice-record-button");
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
const EXPORT_MESSAGES_COMMAND = "/export";
const TASK_COMMAND = "/task";
const DAY_COMMAND = "/day";
const CHANGE_COMMAND = "/change";
const CODEX_COMMAND = "/codex";
const QUERY_COMMAND = "/query";
const SELF_REMINDER_COMMAND = "/remind";
const DEBUG_COMMAND = "/debug";
const PLUGIN_COMMAND = "/plugin";
const LEAD_COMMAND = "/lead";
const TEAM_COMMAND = "/team";
const DEFAULT_CODEX_LOCAL_BRIDGE_URL = "http://127.0.0.1:17345";
const LOCAL_CODEX_PENDING_KEY = "firestore-chat-local-codex-pending";
const LOCAL_CODEX_RESULT_SYNC_MS = 5000;
const COMMAND_AUTOCOMPLETE_LIMIT = 8;
const TASK_LIST_LIMIT = 50;
const TASK_IMPORTANT_AI_LIMIT = 30;
const DAY_COACH_TASK_LIMIT = 15;
const TASK_CONTEXT_COMMENT_LIMIT = 12;
const CHANGELOG_LIST_LIMIT = 50;
const LEAD_LIST_LIMIT = 25;
const TEAM_MEMBER_LIST_LIMIT = 50;
const TEAM_FOLLOWUP_LIST_LIMIT = 50;
const TASK_PREVIEW_LIMIT = 3;
const MESSAGE_REACTION_OPTIONS = ["👍", "✅", "👀", "🙌"];
const TASK_TIMER_REMINDER_MS = 25 * 60 * 1000;
const TASK_TIMER_REPEAT_REMINDER_MS = 5 * 60 * 1000;
const TASK_TIMER_MAX_UNANSWERED_REMINDERS = 2;
const TASK_TIMER_REMINDER_SYNC_MS = 5 * 60 * 1000;
const DAY_IDLE_TASK_REMINDER_MS = 5 * 60 * 1000;
const DAY_IDLE_TASK_REMINDER_LOCK_MS = 30 * 1000;
const QUERY_REMINDER_MS = 10 * 60 * 1000;
const QUERY_REMINDER_SYNC_MS = 5 * 60 * 1000;
const QUERY_REMINDER_MAX_MS = 21 * 24 * 60 * 60 * 1000;
const SELF_REMINDER_MAX_MS = QUERY_REMINDER_MAX_MS;
const QUERY_REMINDER_AUDIENCE_ALL = "all";
const QUERY_REMINDER_AUDIENCE_ASKER = "asker";
const QUERY_REMINDER_AUDIENCE_OTHERS = "others";
const DEFAULT_QUERY_REMINDER_AUDIENCE = QUERY_REMINDER_AUDIENCE_ALL;
const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition || null;
const VOICE_RECORDING_MAX_MS = 45 * 1000;
const VOICE_RECORDING_MAX_BYTES = 700 * 1024;
const QUERY_REMINDER_AUDIENCES = new Set([
  QUERY_REMINDER_AUDIENCE_ALL,
  QUERY_REMINDER_AUDIENCE_ASKER,
  QUERY_REMINDER_AUDIENCE_OTHERS,
]);
const PLUGIN_LEADS = "leads";
const PLUGIN_TEAM = "team";
const SUPPORTED_PLUGINS = new Set([PLUGIN_LEADS, PLUGIN_TEAM]);
const LEAD_FIELDS = [
  "name",
  "phone",
  "email",
  "company",
  "source",
  "status",
  "owner",
  "property",
  "location",
  "pricePerGaj",
  "postedBy",
  "notes",
];
const TEAM_MEMBER_FIELDS = [
  "name",
  "role",
  "designation",
  "email",
  "handle",
  "status",
  "notes",
];
const BASE_SLASH_COMMANDS = [
  {
    label: "/export 10",
    insertText: "/export 10",
    hint: "Export messages",
  },
  {
    label: "/export file 10",
    insertText: "/export file 10",
    hint: "Save txt file",
  },
  {
    label: "/plugin enable leads",
    insertText: "/plugin enable leads",
    hint: "Enable leads",
  },
  {
    label: "/plugin enable team",
    insertText: "/plugin enable team",
    hint: "Enable team",
  },
  {
    label: "/plugin disable leads",
    insertText: "/plugin disable leads",
    hint: "Disable leads",
  },
  {
    label: "/plugin disable team",
    insertText: "/plugin disable team",
    hint: "Disable team",
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
    hint: "View task",
  },
  {
    label: "/task share <id>",
    insertText: "/task share ",
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
    label: "/task today <ids>",
    insertText: "/task today ",
    hint: "Plan tasks",
  },
  {
    label: "/task today list",
    insertText: "/task today list",
    hint: "Planned tasks",
  },
  {
    label: "/task today review",
    insertText: "/task today review",
    hint: "Rollover review",
  },
  {
    label: "/task important [#label]",
    insertText: "/task important ",
    hint: "AI pick tasks",
  },
  {
    label: "/task summarize <id>",
    insertText: "/task summarize ",
    hint: "Summarize context",
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
    label: "/task start [id] [description]",
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
    label: "/day summary",
    insertText: "/day summary",
    hint: "Day summary",
  },
  {
    label: "/day coach",
    insertText: "/day coach",
    hint: "AI day coach",
  },
  {
    label: "/day timesheet [date] [@handle]",
    insertText: "/day timesheet ",
    hint: "Timesheet",
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
    label: "/change add <summary> #label",
    insertText: "/change add ",
    hint: "Log change",
  },
  {
    label: "/change list",
    insertText: "/change list",
    hint: "Recent changes",
  },
  {
    label: "/change summary",
    insertText: "/change summary",
    hint: "Change summary",
  },
  {
    label: "/change summary share",
    insertText: "/change summary share",
    hint: "Share changes",
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
  {
    label: "/remind 15m <note>",
    insertText: "/remind 15m ",
    hint: "Self reminder",
  },
  {
    label: "/remind after 1h <note>",
    insertText: "/remind after 1h ",
    hint: "Self reminder",
  },
  {
    label: "/remind list",
    insertText: "/remind list",
    hint: "Self reminders",
  },
  {
    label: "/remind cancel <id>",
    insertText: "/remind cancel ",
    hint: "Cancel reminder",
  },
  {
    label: "/debug reads",
    insertText: "/debug reads",
    hint: "Read analytics",
  },
  {
    label: "/debug reads reset",
    insertText: "/debug reads reset",
    hint: "Reset reads",
  },
];
const PRIVACY_INVITE_COMMAND = "/privacy invite";
const PRIVACY_HIDE_ALL_COMMANDS = new Set(["/privacy hideall", "/privacy hide all"]);
const PRIVACY_PREVIEW_MS = 10000;
const SESSION_KEY = "firestore-chat-session";
const JOINED_ROOMS_KEY = "openbox-joined-rooms";
const MESSAGES_PAGE_SIZE = 25;
const LOCAL_ROOM_COMMANDS_KEY_PREFIX = "firestore-chat-room-commands";
const COMMAND_HISTORY_KEY_PREFIX = "firestore-chat-command-history";
const COMMAND_HISTORY_LIMIT = 50;
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
const READ_ANALYTICS_STORAGE_KEY = "openbox-read-analytics";

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
  speechRecognition: null,
  isVoiceTyping: false,
  voiceTypingBaseText: "",
  mediaRecorder: null,
  voiceRecordingChunks: [],
  voiceRecordingTimeoutId: null,
  voiceRecordingStartedAt: 0,
  messages: [],
  localMessages: [],
  pendingReply: null,
  hasHydratedRoom: false,
  hasMoreMessages: true,
  isLoadingOlderMessages: false,
  oldestMessageCursor: null,
  visibleMessageLimit: null,
  seenMessageIds: new Set(),
  unreadMessageIds: [],
  hiddenMessageIds: [],
  previewMessageIds: [],
  exportFileHandle: null,
  autocompleteRequestId: 0,
  isPrivacyEnabled: false,
  isPrivacyPreviewVisible: false,
  isRemoteSyncPaused: false,
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
  commandHistory: [],
  commandHistoryIndex: null,
  commandHistoryDraft: "",
  taskTimerReminderTimeouts: new Map(),
  taskTimerReminderSyncIntervalId: null,
  queryReminderTimeouts: new Map(),
  queryReminderSyncIntervalId: null,
  selfReminderTimeouts: new Map(),
  readAnalytics: loadReadAnalytics(),
  teamFollowupReminderTimeouts: new Map(),
  teamFollowupReminderSyncIntervalId: null,
  taskProcessSession: null,
  dayIdleTaskReminderTimeoutId: null,
  dayIdleTaskReminderClientId: `day-idle-${Math.random().toString(36).slice(2)}`,
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
  localCodexPendingCommandIds: loadLocalCodexPendingCommandIds(),
  localCodexSeenResultKeys: new Set(),
  localCodexResultSyncIntervalId: null,
};

boot();

async function trackedGetDoc(feature, ref) {
  const snapshot = await getDoc(ref);
  recordReadAnalytics(feature, 1, "getDoc");
  return snapshot;
}

async function trackedGetDocs(feature, queryRef) {
  const snapshot = await getDocs(queryRef);
  recordReadAnalytics(feature, Math.max(snapshot.size || 0, 1), "getDocs");
  return snapshot;
}

function trackedOnSnapshot(feature, target, onNext, onError) {
  let isInitialSnapshot = true;

  return onSnapshot(
    target,
    (snapshot) => {
      const readCount = isInitialSnapshot
        ? Math.max(snapshot.size ?? (snapshot.exists?.() ? 1 : 0), 1)
        : snapshot.docChanges?.().length || 0;
      isInitialSnapshot = false;
      recordReadAnalytics(feature, readCount, "onSnapshot");
      onNext(snapshot);
    },
    onError
  );
}

function recordReadAnalytics(feature, readCount, source) {
  const safeFeature = feature || "unknown";
  const safeReadCount = Number.isFinite(readCount) ? Math.max(0, readCount) : 0;
  const current = state.readAnalytics[safeFeature] || {
    reads: 0,
    calls: 0,
    getDoc: 0,
    getDocs: 0,
    onSnapshot: 0,
  };

  current.reads += safeReadCount;
  current.calls += 1;
  current[source] = (current[source] || 0) + 1;
  current.lastAt = new Date().toISOString();
  state.readAnalytics[safeFeature] = current;
  saveReadAnalytics();
}

function loadReadAnalytics() {
  try {
    const analytics = JSON.parse(localStorage.getItem(READ_ANALYTICS_STORAGE_KEY) || "{}");
    return analytics && typeof analytics === "object" && !Array.isArray(analytics) ? analytics : {};
  } catch (error) {
    console.warn("Read analytics could not be loaded:", error);
    return {};
  }
}

function saveReadAnalytics() {
  try {
    localStorage.setItem(READ_ANALYTICS_STORAGE_KEY, JSON.stringify(state.readAnalytics));
  } catch (error) {
    console.warn("Read analytics could not be saved:", error);
  }
}

function resetReadAnalytics() {
  state.readAnalytics = {};
  saveReadAnalytics();
}

function formatReadAnalyticsReport() {
  const entries = Object.entries(state.readAnalytics)
    .map(([feature, stats]) => ({
      feature,
      reads: stats.reads || 0,
      calls: stats.calls || 0,
      getDoc: stats.getDoc || 0,
      getDocs: stats.getDocs || 0,
      onSnapshot: stats.onSnapshot || 0,
      lastAt: stats.lastAt || "",
    }))
    .sort((left, right) => right.reads - left.reads);

  if (entries.length === 0) {
    return "No read analytics recorded yet.";
  }

  console.table(entries);
  return [
    "Estimated Firestore reads:",
    ...entries.map((entry) => `${entry.feature}: ${entry.reads} reads / ${entry.calls} calls`),
    "",
    "Details printed to console.table.",
  ].join("\n");
}

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
  startLocalCodexResultSync();
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
  cancelReplyButton.addEventListener("click", clearPendingReply);
  commandSuggestions.addEventListener("mousedown", handleCommandSuggestionMouseDown);
  messagesContainer.addEventListener("click", handleMessageActionClick);
  messagesContainer.addEventListener("scroll", handleMessageListScroll);
  voiceTypeButton.addEventListener("click", toggleVoiceTyping);
  voiceRecordButton.addEventListener("click", toggleVoiceRecording);
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

    recordCommandHistory(text);

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
    const joinedSnapshot = await trackedGetDocs("availableGroups.joined", joinedRoomsQuery);

    mergeAvailableRooms(
      rooms,
      joinedSnapshot.docs.map((roomDoc) => createAvailableRoom(roomDoc.id, roomDoc.data(), "joined"))
    );

    if (passcode) {
      const passcodeRoomsQuery = query(roomsRef, where("passcode", "==", passcode));
      const passcodeSnapshot = await trackedGetDocs("availableGroups.passcode", passcodeRoomsQuery);
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
  if (!state.db || !getCurrentUserId() || state.isRemoteSyncPaused || document.visibilityState !== "visible") {
    clearGroupUnreadCountListeners();
    return;
  }

  const roomIds = new Set(rooms.map((room) => room.id).filter((roomId) => roomId && roomId !== state.roomId));

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

  const unsubscribeMessages = trackedOnSnapshot(
    "unreadGroups.messages",
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

  const unsubscribeReceipt = trackedOnSnapshot(
    "unreadGroups.receipt",
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

  state.unsubscribePrivacyFeatureConfig = trackedOnSnapshot(
    "privacyConfig",
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
  const roomSnapshot = await trackedGetDoc("roomAccess", roomRef);

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
  state.isRemoteSyncPaused = false;
  applyRoomData(roomData);
  state.isAdvancedSettingsVisible = false;
  state.hasHydratedRoom = false;
  state.messages = [];
  state.localMessages = [];
  clearPendingReply();
  state.commandHistory = loadCommandHistory();
  resetCommandHistoryNavigation();
  state.taskProcessSession = null;
  state.queryReminderTimeouts = new Map();
  state.selfReminderTimeouts = new Map();
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
  scheduleSelfReminders();
  startTeamFollowupReminderSync();
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
  const snapshot = await trackedGetDocs("messages.initial", initialQuery);
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

function pauseRemoteSync() {
  if (state.isRemoteSyncPaused) {
    return;
  }

  state.isRemoteSyncPaused = true;

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
  clearGroupUnreadCountListeners();
  clearTaskTimerReminderSync();
  clearTaskTimerReminders();
  clearQueryReminderSync();
  clearQueryReminders();
  clearTeamFollowupReminderSync();
  clearTeamFollowupReminders();
}

function resumeRemoteSync() {
  if (!state.isRemoteSyncPaused || !state.roomId || !state.db) {
    return;
  }

  state.isRemoteSyncPaused = false;

  if (!state.unsubscribeRoom) {
    subscribeToRoom(state.roomId);
  }

  if (!state.unsubscribeReadReceipts) {
    subscribeToReadReceipts(state.roomId);
  }

  if (!state.unsubscribeMessages) {
    subscribeToLatestMessages(state.roomId);
  }

  syncGroupUnreadCountListeners();
  startTaskTimerReminderSync();
  startQueryReminderSync();
  if (isRoomPluginEnabled(PLUGIN_TEAM)) {
    startTeamFollowupReminderSync();
  }
  queueReadReceiptSync();
}

function subscribeToRoom(roomId) {
  const roomRef = doc(state.db, "rooms", roomId);

  state.unsubscribeRoom = trackedOnSnapshot(
    "room.settings",
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
  if (!state.isRemoteSyncPaused && document.visibilityState === "visible") {
    void syncQueryReminders();
  }
  if (!state.isRemoteSyncPaused && document.visibilityState === "visible" && isRoomPluginEnabled(PLUGIN_TEAM)) {
    void syncTeamFollowupReminders();
  } else {
    clearTeamFollowupReminders();
  }
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

  state.unsubscribeMessages = trackedOnSnapshot(
    "messages.live",
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
    const snapshot = await trackedGetDocs("messages.older", olderMessagesQuery);
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
  clearSelfReminders();
  clearTeamFollowupReminderSync();
  clearTeamFollowupReminders();
  clearDayIdleTaskReminder();
  clearMessageMaskRevealTimer();
  clearPrivacyPreviewTimer();
  state.roomId = null;
  state.roomPasscode = "";
  state.roomCommands = { ...DEFAULT_ROOM_COMMANDS };
  state.groupRoomCommands = {};
  state.roomPlugins = {};
  state.isRemoteSyncPaused = false;
  state.groupQueryReminderAudience = DEFAULT_QUERY_REMINDER_AUDIENCE;
  state.queryReminderAudience = DEFAULT_QUERY_REMINDER_AUDIENCE;
  state.selfReminderTimeouts = new Map();
  state.teamFollowupReminderTimeouts = new Map();
  state.activeBreakStartedAt = null;
  state.lastBreakActivityPromptAt = 0;
  state.isAdvancedSettingsVisible = false;
  state.pendingInvitePrivacyMode = false;
  state.isClaimingPrivacyFeatureInvite = false;
  state.hasHydratedRoom = false;
  state.messages = [];
  state.localMessages = [];
  clearPendingReply();
  state.commandHistory = [];
  resetCommandHistoryNavigation();
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

  if (message.replyTo) {
    wrapper.append(renderReplyReference(message.replyTo, context));
  }

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
  } else if (message.type === "team-member-list" && Array.isArray(message.members)) {
    wrapper.append(renderTeamMemberListMessage(message));
  } else if (message.type === "team-member-view" && message.member) {
    wrapper.append(renderTeamMemberViewMessage(message));
  } else if (message.type === "team-followup-list" && Array.isArray(message.followups)) {
    wrapper.append(renderTeamFollowupListMessage(message));
  } else if (message.type === "voice" && message.audioDataUrl) {
    wrapper.append(renderVoiceMessage(message));
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

      if (action.memberId) {
        button.dataset.memberId = action.memberId;
      }

      if (action.followupId) {
        button.dataset.followupId = action.followupId;
      }

      if (action.successText) {
        button.dataset.successText = action.successText;
      }

      if (action.trigger) {
        button.dataset.trigger = action.trigger;
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

  const replyButton = document.createElement("button");
  replyButton.type = "button";
  replyButton.className = "message-reply-button";
  replyButton.textContent = "Reply";
  replyButton.title = "Reply to message";
  replyButton.setAttribute("aria-label", "Reply to message");
  replyButton.dataset.action = "message-reply";
  replyButton.dataset.messageId = message.id || "";
  container.append(replyButton);

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

function renderReplyReference(replyTo, context = {}) {
  const reference = document.createElement("button");
  reference.type = "button";
  reference.className = "message-reply-reference";

  if (replyTo.id) {
    reference.dataset.action = "message-scroll-to";
    reference.dataset.messageId = replyTo.id;
  }

  const sender = document.createElement("span");
  sender.className = "message-reply-sender";
  sender.textContent = getReplySenderName(replyTo, context);

  const text = document.createElement("span");
  text.className = "message-reply-text";
  text.textContent = replyTo.text || "Message";

  reference.append(sender, text);
  return reference;
}

function beginMessageReply(messageId) {
  const message = findMessageById(messageId);

  if (!message || message.isLocalOnly) {
    return;
  }

  state.pendingReply = {
    id: message.id,
    senderId: message.senderId || null,
    senderName: message.senderName || "Anonymous",
    text: getReplyPreviewText(message),
  };
  updateReplyPreview();
  messageInput.focus();
  setStatus("Replying to message.", "success");
}

function clearPendingReply() {
  state.pendingReply = null;
  updateReplyPreview();
}

function updateReplyPreview() {
  if (!replyPreview) {
    return;
  }

  const reply = state.pendingReply;
  replyPreview.hidden = !reply;

  if (!reply) {
    replyPreviewSender.textContent = "";
    replyPreviewText.textContent = "";
    return;
  }

  replyPreviewSender.textContent = reply.senderName || "Anonymous";
  replyPreviewText.textContent = reply.text || "Message";
}

function scrollToMessage(messageId) {
  if (!messageId) {
    return;
  }

  const target = messagesContainer.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);

  if (!target) {
    setStatus("Original message is not currently loaded.", "error");
    return;
  }

  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.add("message-highlight");
  window.setTimeout(() => target.classList.remove("message-highlight"), 1400);
}

function findMessageById(messageId) {
  return state.messages.find((message) => message.id === messageId) || null;
}

function getReplySenderName(replyTo, context = {}) {
  if (state.isPrivacyEnabled && state.isPrivacyPreviewVisible) {
    return getPrivateAlias(replyTo.senderId, context.privateAliases);
  }

  return replyTo.senderName || "Anonymous";
}

function getReplyPreviewText(message) {
  if (message.type === "voice") {
    return "Voice message";
  }

  if (message.type === "task-list") {
    return message.heading || "Task list";
  }

  if (message.type) {
    return message.text || `${message.type} message`;
  }

  return truncateText(message.text || "Message", 140);
}

function truncateText(text, maxLength) {
  const value = String(text || "").replace(/\s+/g, " ").trim();

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
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
        showTodayPlanActions: Boolean(message.showTodayPlanActions),
        privateAliases: message.privateAliases || {},
      })
    );
  });

  container.append(list);

  const footer = document.createElement("div");
  footer.className = "task-list-footer";
  const totalText = `Total: ${message.tasks.length} task${message.tasks.length === 1 ? "" : "s"}`;
  footer.textContent = message.todayPlanInfo ? `${totalText}. ${message.todayPlanInfo}` : totalText;
  container.append(footer);

  return container;
}

function renderTaskListItem(task, options = {}) {
  const maskIdentity = Boolean(options.maskIdentity);
  const item = document.createElement("li");
  item.className = "task-list-item";

  const main = document.createElement("div");
  main.className = "task-list-main";

  const summary = document.createElement("div");
  summary.className = "task-list-summary";

  const id = document.createElement("button");
  id.type = "button";
  id.className = "task-list-id";
  id.textContent = formatTaskId(task.id);
  id.title = task.id;
  id.dataset.action = "task-view";
  id.dataset.taskId = task.id;

  const title = document.createElement("span");
  title.className = "task-list-title";
  title.textContent = task.description || "Untitled task";

  const commentCount = Number.isFinite(task.commentCount) ? task.commentCount : 0;
  const subtaskSummary = getSubtaskSummary(task);

  summary.append(id, title);
  main.append(summary);

  if (!options.hideActions) {
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "task-list-edit";
    editButton.textContent = "Edit";
    editButton.dataset.action = "task-edit-draft";
    editButton.dataset.taskId = task.id;
    editButton.dataset.taskDescription = task.description || "";

    const commentsButton = document.createElement("button");
    commentsButton.type = "button";
    commentsButton.className = "task-list-edit";
    commentsButton.textContent = commentCount > 0 ? `Comments (${commentCount})` : "Comments";
    commentsButton.dataset.action = "task-comments-list";
    commentsButton.dataset.taskId = task.id;

    const queryButton = document.createElement("button");
    queryButton.type = "button";
    queryButton.className = "task-list-edit";
    queryButton.textContent = "Query";
    queryButton.dataset.action = "task-query-draft";
    queryButton.dataset.taskId = task.id;

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

    if (options.showTodayPlanActions && task.status !== "complete") {
      const todayPlanButton = document.createElement("button");
      todayPlanButton.type = "button";
      todayPlanButton.className = "task-list-edit";
      todayPlanButton.textContent = task.plannedToday ? "Remove today" : "Today";
      todayPlanButton.dataset.action = task.plannedToday ? "task-day-remove-today" : "task-day-add-today";
      todayPlanButton.dataset.taskId = task.id;
      actions.append(todayPlanButton);
    }

    actions.append(editButton, commentsButton, queryButton);
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
      : `Running by ${task.activeTimerStartedByName || "someone"}${task.activeTimerDescription ? ` - ${task.activeTimerDescription}` : ""}`;
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

  if (task.assigneeName) {
    const assignee = document.createElement("span");
    assignee.className = "task-list-badge";
    assignee.textContent = `Assigned to ${task.assigneeName}`;
    meta.append(assignee);
  }

  if (task.jiraKey) {
    const jira = document.createElement("span");
    jira.className = "task-list-badge";
    jira.textContent = `Jira ${task.jiraKey}${task.jiraStatus ? ` (${task.jiraStatus})` : ""}`;
    meta.append(jira);
  }

  if (task.plannedToday) {
    const planned = document.createElement("span");
    planned.className = "task-list-badge planned";
    planned.textContent = "Today";
    meta.append(planned);
  }

  if (task.todayPlanResetNote) {
    const reset = document.createElement("span");
    reset.className = "task-list-badge reset";
    reset.textContent = task.todayPlanResetNote;
    meta.append(reset);
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

  if (message.isLocalOnly) {
    const shareActions = document.createElement("div");
    shareActions.className = "task-view-share-actions";

    const shareButton = document.createElement("button");
    shareButton.type = "button";
    shareButton.className = "task-list-edit primary-task-action";
    shareButton.textContent = "Share to group";
    shareButton.dataset.action = "task-share";
    shareButton.dataset.taskId = message.task.id;

    shareActions.append(shareButton);
    container.append(shareActions);
  }

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
    lead.property ? `Property ${lead.property}` : "",
    lead.location ? `Location ${lead.location}` : "",
    lead.pricePerGaj ? `Price ${lead.pricePerGaj}` : "",
    lead.postedBy ? `Posted by ${lead.postedBy}` : "",
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

function renderTeamMemberViewMessage(message) {
  const member = message.member;
  const container = document.createElement("div");
  container.className = "team-member-view-message";

  const header = document.createElement("div");
  header.className = "task-list-header";

  const title = document.createElement("strong");
  title.textContent = "Team member";

  const id = document.createElement("span");
  id.className = "task-list-count";
  id.textContent = formatTeamMemberId(member.id);

  header.append(title, id);
  container.append(header);
  container.append(renderTeamMemberPreviewCard(member));

  return container;
}

function renderTeamMemberListMessage(message) {
  const container = document.createElement("div");
  container.className = "team-member-list-message";

  const header = document.createElement("div");
  header.className = "task-list-header";

  const title = document.createElement("strong");
  title.textContent = message.heading || "Team members";

  const count = document.createElement("span");
  count.className = "task-list-count";
  count.textContent = `${message.members.length} member${message.members.length === 1 ? "" : "s"}`;

  header.append(title, count);
  container.append(header);

  const list = document.createElement("ol");
  list.className = "query-list";

  message.members.forEach((member) => {
    const item = document.createElement("li");
    item.append(renderTeamMemberPreviewCard(member, { localActions: true }));
    list.append(item);
  });

  container.append(list);
  return container;
}

function renderTeamMemberPreviewCard(member, options = {}) {
  const card = document.createElement("article");
  card.className = "query-preview-card team-member-preview-card";

  const top = document.createElement("div");
  top.className = "task-preview-top";

  const id = document.createElement("span");
  id.className = "task-list-id";
  id.textContent = formatTeamMemberId(member.id);
  id.title = member.id || "";

  const status = document.createElement("span");
  status.className = `query-preview-status ${member.status === "inactive" ? "answered" : "pending"}`;
  status.textContent = member.status || "active";

  top.append(id, status);

  const name = document.createElement("p");
  name.className = "task-preview-title";
  name.textContent = member.name || "Unnamed member";

  card.append(top, name);

  const meta = document.createElement("div");
  meta.className = "task-preview-meta";

  [
    member.role ? `Role ${member.role}` : "",
    member.designation ? `Designation ${member.designation}` : "",
    member.handle ? `Handle ${member.handle}` : "",
    member.email ? `Email ${member.email}` : "",
    member.createdByName ? `Added by ${member.createdByName}` : "",
  ]
    .filter(Boolean)
    .forEach((value) => {
      const item = document.createElement("span");
      item.textContent = value;
      meta.append(item);
    });

  const createdAt = document.createElement("span");
  createdAt.textContent = formatTaskTimestamp(member.createdAt);
  meta.append(createdAt);
  card.append(meta);

  if (member.notes) {
    const notes = document.createElement("p");
    notes.className = "query-linked-task";
    notes.textContent = member.notes;
    card.append(notes);
  }

  if (!options.hideActions) {
    const actions = document.createElement("div");
    actions.className = "task-list-actions";

    const updateButton = document.createElement("button");
    updateButton.type = "button";
    updateButton.className = "task-list-edit";
    updateButton.textContent = "Update";
    updateButton.dataset.action = "team-member-update-draft";
    updateButton.dataset.memberId = member.id || "";

    const followupButton = document.createElement("button");
    followupButton.type = "button";
    followupButton.className = "task-list-edit";
    followupButton.textContent = "Follow up";
    followupButton.dataset.action = "team-followup-member-draft";
    followupButton.dataset.memberId = member.id || "";

    actions.append(updateButton, followupButton);

    if (options.localActions) {
      const viewButton = document.createElement("button");
      viewButton.type = "button";
      viewButton.className = "task-list-edit";
      viewButton.textContent = "View";
      viewButton.dataset.action = "team-member-view";
      viewButton.dataset.memberId = member.id || "";
      actions.prepend(viewButton);
    }

    card.append(actions);
  }

  return card;
}

function renderTeamFollowupListMessage(message) {
  const container = document.createElement("div");
  container.className = "team-followup-list-message";

  const header = document.createElement("div");
  header.className = "task-list-header";

  const title = document.createElement("strong");
  title.textContent = message.heading || "Team followups";

  const count = document.createElement("span");
  count.className = "task-list-count";
  count.textContent = `${message.followups.length} followup${message.followups.length === 1 ? "" : "s"}`;

  header.append(title, count);
  container.append(header);

  const list = document.createElement("ol");
  list.className = "query-list";

  message.followups.forEach((followup) => {
    const item = document.createElement("li");
    item.append(renderTeamFollowupPreviewCard(followup));
    list.append(item);
  });

  container.append(list);
  return container;
}

function renderTeamFollowupPreviewCard(followup) {
  const card = document.createElement("article");
  card.className = "query-preview-card team-followup-preview-card";

  const top = document.createElement("div");
  top.className = "task-preview-top";

  const id = document.createElement("span");
  id.className = "task-list-id";
  id.textContent = formatTeamFollowupId(followup.id);
  id.title = followup.id || "";

  const status = document.createElement("span");
  status.className = `query-preview-status ${followup.status === "complete" ? "answered" : "pending"}`;
  status.textContent = followup.status === "complete" ? "Done" : "Pending";

  top.append(id, status);

  const title = document.createElement("p");
  title.className = "task-preview-title";
  title.textContent = followup.text || "Untitled followup";

  card.append(top, title);

  const meta = document.createElement("div");
  meta.className = "task-preview-meta";

  [
    formatTeamFollowupTarget(followup),
    followup.reminderAt ? `Reminder ${formatTaskTimestamp(followup.reminderAt)}` : "",
    `Repeats every ${formatDuration(getTeamFollowupIntervalMs(followup))}`,
    followup.createdByName ? `Created by ${followup.createdByName}` : "",
  ]
    .filter(Boolean)
    .forEach((value) => {
      const item = document.createElement("span");
      item.textContent = value;
      meta.append(item);
    });

  card.append(meta);

  if (followup.taskId && followup.taskDescription) {
    const task = document.createElement("p");
    task.className = "query-linked-task";
    task.textContent = `${formatTaskId(followup.taskId)} ${followup.taskDescription}`;
    card.append(task);
  }

  if (followup.status !== "complete") {
    const actions = document.createElement("div");
    actions.className = "task-list-actions";

    const doneButton = document.createElement("button");
    doneButton.type = "button";
    doneButton.className = "task-list-edit";
    doneButton.textContent = "Done";
    doneButton.dataset.action = "team-followup-done";
    doneButton.dataset.followupId = followup.id || "";

    actions.append(doneButton);
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
    running.textContent = `Running by ${task.activeTimerStartedByName || "someone"}${task.activeTimerDescription ? ` - ${task.activeTimerDescription}` : ""}`;
    meta.append(running);
  }

  if (task.assigneeName) {
    const assignee = document.createElement("span");
    assignee.textContent = `Assigned to ${task.assigneeName}`;
    meta.append(assignee);
  }

  if (task.jiraKey) {
    const jira = document.createElement("span");
    jira.textContent = `Jira ${task.jiraKey}${task.jiraStatus ? ` (${task.jiraStatus})` : ""}`;
    meta.append(jira);
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

  const actions = document.createElement("div");
  actions.className = "task-list-actions";

  const queryButton = document.createElement("button");
  queryButton.type = "button";
  queryButton.className = "task-list-edit";
  queryButton.textContent = "Query";
  queryButton.dataset.action = "task-query-draft";
  queryButton.dataset.taskId = message.task.id;

  actions.append(queryButton);
  container.append(actions);

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

  if (actionButton.dataset.action === "day-ai-coach") {
    runLocalAction(
      actionButton,
      () => queueDayCoachForCodex({
        trigger: actionButton.dataset.trigger || "reminder",
        taskId: actionButton.dataset.taskId || "",
      }),
      "AI day coach queued."
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

  if (actionButton.dataset.action === "message-reply") {
    beginMessageReply(actionButton.dataset.messageId || "");
  }

  if (actionButton.dataset.action === "message-scroll-to") {
    scrollToMessage(actionButton.dataset.messageId || "");
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

  if (actionButton.dataset.action === "task-share") {
    actionButton.disabled = true;
    void shareTaskView(actionButton.dataset.taskId || "").finally(() => {
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

  if (actionButton.dataset.action === "task-day-add-today") {
    runLocalAction(actionButton, () => addTaskToTodayPlan(actionButton.dataset.taskId || ""), "Task planned for today.");
  }

  if (actionButton.dataset.action === "task-day-remove-today") {
    runLocalAction(
      actionButton,
      () => removeTaskFromTodayPlan(actionButton.dataset.taskId || ""),
      "Task removed from today's plan."
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

  if (actionButton.dataset.action === "team-member-update-draft") {
    draftTeamMemberUpdate(actionButton.dataset.memberId || "");
  }

  if (actionButton.dataset.action === "team-followup-member-draft") {
    draftTeamMemberFollowup(actionButton.dataset.memberId || "");
  }

  if (actionButton.dataset.action === "team-member-view") {
    actionButton.disabled = true;
    void postTeamMemberView(actionButton.dataset.memberId || "").finally(() => {
      actionButton.disabled = false;
    });
  }

  if (actionButton.dataset.action === "team-followup-done") {
    runLocalAction(actionButton, () => completeTeamFollowup(actionButton.dataset.followupId || ""), "Followup completed.");
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
  voiceTypeButton.disabled = !enabled || !SpeechRecognitionConstructor;
  voiceRecordButton.disabled = !enabled || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder;
}

function renderVoiceMessage(message) {
  const container = document.createElement("div");
  container.className = "voice-message";

  const audio = document.createElement("audio");
  audio.controls = true;
  audio.preload = "metadata";
  audio.src = message.audioDataUrl;
  container.append(audio);

  if (message.text) {
    const note = document.createElement("p");
    note.className = "message-text voice-message-note";
    note.textContent = message.text;
    container.append(note);
  }

  return container;
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
      if (/\s/.test(character)) {
        return character;
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
  resetCommandHistoryNavigation();
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

function toggleVoiceTyping() {
  if (state.isVoiceTyping) {
    stopVoiceTyping();
    return;
  }

  if (!SpeechRecognitionConstructor) {
    setStatus("Voice typing is not supported in this browser.", "error");
    return;
  }

  const recognition = new SpeechRecognitionConstructor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = navigator.language || "en-US";

  state.voiceTypingBaseText = messageInput.value.trimEnd();
  recognition.onresult = (event) => {
    let finalTranscript = "";
    let interimTranscript = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = event.results[index][0]?.transcript || "";
      if (event.results[index].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    if (finalTranscript.trim()) {
      state.voiceTypingBaseText = joinComposerText(state.voiceTypingBaseText, finalTranscript.trim());
    }

    setVoiceTypedText(interimTranscript.trim());
  };

  recognition.onerror = () => {
    setStatus("Voice typing stopped.", "error");
    stopVoiceTyping();
  };
  recognition.onend = () => {
    stopVoiceTyping(false);
  };

  state.speechRecognition = recognition;
  state.isVoiceTyping = true;
  voiceTypeButton.textContent = "Stop voice";
  voiceTypeButton.classList.add("active");
  recognition.start();
  setStatus("Listening for voice typing.", "success");
}

function setVoiceTypedText(interimText = "") {
  messageInput.value = joinComposerText(state.voiceTypingBaseText, interimText);
  messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
  syncMessageMaskOverlay();
  updateCommandAutocomplete();
}

function joinComposerText(baseText = "", nextText = "") {
  const base = baseText.trimEnd();
  const next = nextText.trim();

  if (!base) {
    return next;
  }

  if (!next) {
    return base;
  }

  return `${base} ${next}`;
}

function stopVoiceTyping(stopRecognition = true) {
  if (stopRecognition && state.speechRecognition) {
    state.speechRecognition.stop();
  }

  state.speechRecognition = null;
  state.isVoiceTyping = false;
  state.voiceTypingBaseText = "";
  voiceTypeButton.textContent = "Voice type";
  voiceTypeButton.classList.remove("active");
}

async function toggleVoiceRecording() {
  if (state.mediaRecorder?.state === "recording") {
    state.mediaRecorder.stop();
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    setStatus("Voice messages are not supported in this browser.", "error");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    state.mediaRecorder = mediaRecorder;
    state.voiceRecordingChunks = [];
    state.voiceRecordingStartedAt = Date.now();

    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data?.size) {
        state.voiceRecordingChunks.push(event.data);
      }
    });

    mediaRecorder.addEventListener("stop", () => {
      stream.getTracks().forEach((track) => track.stop());
      void sendRecordedVoiceMessage(mediaRecorder.mimeType);
    });

    mediaRecorder.start();
    voiceRecordButton.textContent = "Send voice";
    voiceRecordButton.classList.add("recording");
    setStatus("Recording voice message.", "success");
    state.voiceRecordingTimeoutId = window.setTimeout(() => {
      if (state.mediaRecorder?.state === "recording") {
        state.mediaRecorder.stop();
      }
    }, VOICE_RECORDING_MAX_MS);
  } catch (error) {
    console.error(error);
    setStatus("Microphone access was blocked.", "error");
  }
}

async function sendRecordedVoiceMessage(mimeType) {
  if (state.voiceRecordingTimeoutId) {
    window.clearTimeout(state.voiceRecordingTimeoutId);
    state.voiceRecordingTimeoutId = null;
  }

  voiceRecordButton.textContent = "Record voice";
  voiceRecordButton.classList.remove("recording");

  const chunks = state.voiceRecordingChunks;
  state.voiceRecordingChunks = [];
  state.mediaRecorder = null;

  if (!chunks.length) {
    setStatus("No voice was recorded.", "error");
    return;
  }

  const audioBlob = new Blob(chunks, { type: mimeType || "audio/webm" });
  if (audioBlob.size > VOICE_RECORDING_MAX_BYTES) {
    setStatus("Voice message is too long. Try a shorter recording.", "error");
    return;
  }

  try {
    const audioDataUrl = await blobToDataUrl(audioBlob);
    const durationSeconds = Math.max(1, Math.round((Date.now() - state.voiceRecordingStartedAt) / 1000));
    await addDoc(collection(state.db, "rooms", state.roomId, "messages"), {
      type: "voice",
      text: `Voice message (${durationSeconds}s)`,
      audioDataUrl,
      audioMimeType: audioBlob.type,
      audioSize: audioBlob.size,
      durationSeconds,
      senderId: state.profile.id,
      senderName: getProfileDisplayName(),
      createdAt: serverTimestamp(),
    });
    setStatus("Voice message sent.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Voice message send failed. Check room permissions.", "error");
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
}

function handleMessageInputKeydown(event) {
  if (handleCommandAutocompleteKeydown(event)) {
    return;
  }

  if (handleCommandHistoryKeydown(event)) {
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

    if (isChangeCommand(text)) {
      await handleChangeCommand(text);
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

    if (isSelfReminderCommand(text)) {
      handleSelfReminderCommand(text);
      return;
    }

    if (isDebugCommand(text)) {
      handleDebugCommand(text);
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

    if (isTeamCommand(text)) {
      await handleTeamCommand(text);
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

    if (state.pendingReply) {
      messagePayload.replyTo = { ...state.pendingReply };
    }

    await addDoc(collection(state.db, "rooms", state.roomId, "messages"), messagePayload);
    clearPendingReply();

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
        : isChangeCommand(text)
          ? "Change command failed. Check the command and room permissions."
        : isCodexCommand(text)
          ? "Codex command failed. Check the command and room permissions."
        : isQueryCommand(text)
          ? "Query command failed. Check the command and room permissions."
        : isPluginCommand(text)
          ? "Plugin command failed. Check the command and room permissions."
        : isLeadCommand(text)
          ? "Lead command failed. Check the command and room permissions."
        : isTeamCommand(text)
          ? "Team command failed. Check the command and room permissions."
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

  if (isRoomPluginEnabled(PLUGIN_TEAM)) {
    commands.push(
      {
        label: "/team member add name:<name>",
        insertText: "/team member add name:",
        hint: "Add member",
      },
      {
        label: "/team member list",
        insertText: "/team member list",
        hint: "Team members",
      },
      {
        label: "/team task assign <task-id> <member-id>",
        insertText: "/team task assign ",
        hint: "Assign task",
      },
      {
        label: "/team task list [member-id]",
        insertText: "/team task list ",
        hint: "Team tasks",
      },
      {
        label: "/team task jira <task-id> <JIRA-KEY> [url]",
        insertText: "/team task jira ",
        hint: "Link Jira",
      },
      {
        label: "/team followup add <member-id> after 1d <text>",
        insertText: "/team followup add ",
        hint: "Member followup",
      },
      {
        label: "/team followup task <task-id> after 1d <text>",
        insertText: "/team followup task ",
        hint: "Task followup",
      },
      {
        label: "/team followup list",
        insertText: "/team followup list",
        hint: "Followups",
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

function handleCommandHistoryKeydown(event) {
  if (!["ArrowUp", "ArrowDown"].includes(event.key) || shouldSkipCommandHistoryNavigation()) {
    return false;
  }

  if (event.key === "ArrowDown" && state.commandHistoryIndex === null) {
    return false;
  }

  if (state.commandHistory.length === 0 && state.commandHistoryIndex === null) {
    return false;
  }

  event.preventDefault();

  if (state.commandHistoryIndex === null) {
    state.commandHistoryDraft = messageInput.value;
    state.commandHistoryIndex = state.commandHistory.length;
  }

  if (event.key === "ArrowUp") {
    state.commandHistoryIndex = Math.max(0, state.commandHistoryIndex - 1);
  } else {
    state.commandHistoryIndex = Math.min(state.commandHistory.length, state.commandHistoryIndex + 1);
  }

  const nextValue =
    state.commandHistoryIndex === state.commandHistory.length
      ? state.commandHistoryDraft
      : state.commandHistory[state.commandHistoryIndex] || "";

  messageInput.value = nextValue;
  messageInput.setSelectionRange(nextValue.length, nextValue.length);
  syncMessageMaskOverlay();
  hideCommandAutocomplete();

  return true;
}

function shouldSkipCommandHistoryNavigation() {
  if (messageInput.selectionStart !== messageInput.selectionEnd) {
    return true;
  }

  const cursorIndex = messageInput.selectionStart ?? messageInput.value.length;
  return cursorIndex !== 0 && cursorIndex !== messageInput.value.length;
}

function resetCommandHistoryNavigation() {
  state.commandHistoryIndex = null;
  state.commandHistoryDraft = "";
}

function recordCommandHistory(text) {
  const command = String(text || "").trim();

  resetCommandHistoryNavigation();

  if (!shouldRecordCommandHistory(command)) {
    return;
  }

  state.commandHistory = [
    ...state.commandHistory.filter((entry) => entry !== command),
    command,
  ].slice(-COMMAND_HISTORY_LIMIT);
  saveCommandHistory();
}

function shouldRecordCommandHistory(command) {
  if (!command || !isHandledCommand(command) || isPrivacyHistoryCommand(command)) {
    return false;
  }

  return true;
}

function isHandledCommand(command) {
  return (
    handleLocalCommandWouldMatch(command) ||
    isTaskCommand(command) ||
    isDayCommand(command) ||
    isChangeCommand(command) ||
    isCodexCommand(command) ||
    isQueryCommand(command) ||
    isSelfReminderCommand(command) ||
    isDebugCommand(command) ||
    isPluginCommand(command) ||
    isLeadCommand(command) ||
    isTeamCommand(command)
  );
}

function handleLocalCommandWouldMatch(command) {
  const normalized = command.trim().toLowerCase();
  return ADVANCED_SETTINGS_COMMANDS.has(normalized) || normalized === GET_LINK_COMMAND;
}

function isPrivacyHistoryCommand(command) {
  const normalized = command.trim().toLowerCase();
  const normalizedWithoutSlash = normalized.startsWith("/") ? normalized.slice(1) : normalized;
  const roomCommands = getEffectiveRoomCommands(state.roomId, state.groupRoomCommands);

  if (normalized === PRIVACY_INVITE_COMMAND || normalized.startsWith(`${PRIVACY_INVITE_COMMAND} `)) {
    return true;
  }

  if (PRIVACY_HIDE_ALL_COMMANDS.has(normalized)) {
    return true;
  }

  if (normalized === EXPORT_MESSAGES_COMMAND || normalized.startsWith(`${EXPORT_MESSAGES_COMMAND} `)) {
    return true;
  }

  if (matchesCommand(normalizedWithoutSlash, DEFAULT_ROOM_COMMANDS.enable, roomCommands.enable)) {
    return true;
  }

  return Boolean(
    matchCommandWithOptionalCount(normalized, [
      DEFAULT_ROOM_COMMANDS.disable,
      roomCommands.disable,
      `/${DEFAULT_ROOM_COMMANDS.disable}`,
      `/${roomCommands.disable}`,
      ...DEFAULT_REVEAL_ALIASES,
      roomCommands.reveal,
      ...Array.from(DEFAULT_REVEAL_ALIASES, (alias) => `/${alias}`),
      `/${roomCommands.reveal}`,
    ])
  );
}

function getCommandHistoryStorageKey() {
  const userId = state.profile?.id || state.authUser?.uid || "pending-auth";
  const roomId = state.roomId || "pending-room";
  return `${COMMAND_HISTORY_KEY_PREFIX}:${userId}:${roomId}`;
}

function loadCommandHistory() {
  try {
    const raw = localStorage.getItem(getCommandHistoryStorageKey());

    if (!raw) {
      return [];
    }

    const entries = JSON.parse(raw);

    if (!Array.isArray(entries)) {
      return [];
    }

    return entries
      .map((entry) => String(entry || "").trim())
      .filter(shouldRecordCommandHistory)
      .slice(-COMMAND_HISTORY_LIMIT);
  } catch (error) {
    console.error(error);
    localStorage.removeItem(getCommandHistoryStorageKey());
    return [];
  }
}

function saveCommandHistory() {
  localStorage.setItem(
    getCommandHistoryStorageKey(),
    JSON.stringify(state.commandHistory.filter(shouldRecordCommandHistory).slice(-COMMAND_HISTORY_LIMIT))
  );
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

  if (normalized === EXPORT_MESSAGES_COMMAND || normalized.startsWith(`${EXPORT_MESSAGES_COMMAND} `)) {
    void exportChatMessages(text.trim().slice(EXPORT_MESSAGES_COMMAND.length).trim());
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

function isChangeCommand(text) {
  const normalized = text.trim().toLowerCase();
  return normalized === CHANGE_COMMAND || normalized.startsWith(`${CHANGE_COMMAND} `);
}

function isCodexCommand(text) {
  const normalized = text.trim().toLowerCase();
  return normalized === CODEX_COMMAND || normalized.startsWith(`${CODEX_COMMAND} `);
}

function isQueryCommand(text) {
  const normalized = text.trim().toLowerCase();
  return normalized === QUERY_COMMAND || normalized.startsWith(`${QUERY_COMMAND} `);
}

function isSelfReminderCommand(text) {
  const normalized = text.trim().toLowerCase();
  return normalized === SELF_REMINDER_COMMAND || normalized.startsWith(`${SELF_REMINDER_COMMAND} `);
}

function isDebugCommand(text) {
  const normalized = text.trim().toLowerCase();
  return normalized === DEBUG_COMMAND || normalized.startsWith(`${DEBUG_COMMAND} `);
}

function isPluginCommand(text) {
  const normalized = text.trim().toLowerCase();
  return normalized === PLUGIN_COMMAND || normalized.startsWith(`${PLUGIN_COMMAND} `);
}

function isLeadCommand(text) {
  const normalized = text.trim().toLowerCase();
  return normalized === LEAD_COMMAND || normalized.startsWith(`${LEAD_COMMAND} `);
}

function isTeamCommand(text) {
  const normalized = text.trim().toLowerCase();
  return normalized === TEAM_COMMAND || normalized.startsWith(`${TEAM_COMMAND} `);
}

async function handleTaskCommand(text) {
  const rawCommand = text.trim();
  const payload = rawCommand.slice(TASK_COMMAND.length).trim();
  const [action = "", ...rest] = payload.split(/\s+/);
  const normalizedAction = action.toLowerCase();

  if (!payload || normalizedAction === "help") {
    await postTaskMessage(
      "Task commands:\n/task create fix that issue #bug\n/task list\n/task list #bug\n/task completed\n/task completed #bug\n/task current\n/task today #abc123 #def456\n/task today list\n/task today review\n/task important [#label]\n/task summarize <id>\n/task view <id>\n/task share <id>\n/task codex <id> [instruction]\n/task process\n/task process #bug\n/task process continue\n/task process stop\n/task edit <id> <description> #label\n/task comment <id> <comment>\n/task comments <id>\n/task subtask <id> <description>\n/task subtasks <id>\n/task subtask done <id> <subtask>\n/task subtask reopen <id> <subtask>\n/task subtask remove <id> <subtask>\n/task start [description]\n/task start <id> [description]\n/task stop\n/task stop <id>\n/task continue\n/task continue <id>\n/task timers\n/task summary\n/task summary share\n/task complete <id>\n/task reopen <id>\n/task label <id> #bug\n/task unlabel <id> #bug\nMention a task id like #abc123 in a message to preview it.\nUse /day for attendance and leave commands."
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

  if (normalizedAction === "today") {
    await handleTaskTodayCommand(rest.join(" "));
    return;
  }

  if (normalizedAction === "important" || normalizedAction === "prioritize" || normalizedAction === "priority") {
    await queueImportantTasksForCodex(rest.join(" "));
    return;
  }

  if (normalizedAction === "summarize" || normalizedAction === "context") {
    await queueTaskContextSummaryForCodex(rest.join(" "));
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

  if (normalizedAction === "share") {
    await shareTaskView(rest.join(" "));
    return;
  }

  if (normalizedAction === "codex") {
    await queueTaskForCodex(rest.join(" "));
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
      "Day commands:\n/day start\n/day plan <plan>\n/day free <reason>\n/day status\n/day summary\n/day coach\n/day timesheet [today|yesterday|YYYY-MM-DD] [@handle]\n/day break start\n/day break stop\n/day break list\n/day end\n/day leave <date-or-range> <reason>\n/day leave list\n/day leave cancel <id>"
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

  if (normalizedAction === "summary") {
    await postDaySummary();
    return;
  }

  if (normalizedAction === "coach" || normalizedAction === "ai") {
    await queueDayCoachForCodex({ trigger: rest.join(" ").trim() || "manual" });
    return;
  }

  if (normalizedAction === "timesheet" || normalizedAction === "sheet") {
    await postTimesheet(rest.join(" "));
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

async function handleChangeCommand(text) {
  const rawCommand = text.trim();
  const payload = rawCommand.slice(CHANGE_COMMAND.length).trim();
  const [action = "", ...rest] = payload.split(/\s+/);
  const normalizedAction = action.toLowerCase();

  if (!payload || normalizedAction === "help") {
    postLocalChangeMessage(
      "Change commands:\n/change add <summary> #label\n/change list\n/change summary\n/change summary share"
    );
    return;
  }

  if (["add", "log", "record"].includes(normalizedAction)) {
    await addChangeLogEntry(rest.join(" "));
    return;
  }

  if (["list", "recent"].includes(normalizedAction)) {
    await postChangeLogList();
    return;
  }

  if (normalizedAction === "summary") {
    await postChangeLogSummary(rest.join(" "));
    return;
  }

  postLocalChangeMessage("Unknown change command. Use /change help.");
}

async function handleCodexCommand(text) {
  const rawCommand = text.trim();
  const prompt = rawCommand.slice(CODEX_COMMAND.length).trim();

  if (!prompt || prompt.toLowerCase() === "help") {
    postLocalCodexMessage(
      "Codex commands:\n/codex summarize this repo\n/codex review the latest diff\n/codex fix the failing test\n/codex results\n/task codex #abc123 fix this\nStart the local bridge with npm run codex:bridge -- --local-server --sandbox workspace-write --cwd <path>."
    );
    return;
  }

  if (["results", "result", "latest"].includes(prompt.toLowerCase())) {
    await postLatestLocalCodexResult();
    return;
  }

  await queueCodexPrompt(prompt);
}

async function queueCodexPrompt(prompt) {
  const bridgeUrl = getCodexLocalBridgeUrl();
  const response = await fetch(`${bridgeUrl}/commands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      roomId: state.roomId,
      requestedBy: state.profile.id,
      requestedByName: getProfileDisplayName(),
    }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || `Local Codex bridge returned HTTP ${response.status}.`);
  }

  if (payload.id) {
    state.localCodexPendingCommandIds.add(payload.id);
    saveLocalCodexPendingCommandIds();
  }

  postLocalCodexMessage(
    `Queued local Codex command ${payload.shortId || formatCodexCommandId(payload.id)} from ${getProfileDisplayName()}.\n${prompt}`
  );
  setStatus("Local Codex command queued.", "success");
}

async function queueFirebaseCodexPrompt(prompt) {
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

function getCodexLocalBridgeUrl() {
  return localStorage.getItem("codex-local-bridge-url") || DEFAULT_CODEX_LOCAL_BRIDGE_URL;
}

function startLocalCodexResultSync() {
  clearLocalCodexResultSync();
  void syncLocalCodexResults();
  state.localCodexResultSyncIntervalId = window.setInterval(() => {
    void syncLocalCodexResults();
  }, LOCAL_CODEX_RESULT_SYNC_MS);
}

function clearLocalCodexResultSync() {
  if (!state.localCodexResultSyncIntervalId) {
    return;
  }

  window.clearInterval(state.localCodexResultSyncIntervalId);
  state.localCodexResultSyncIntervalId = null;
}

async function syncLocalCodexResults() {
  if (state.localCodexPendingCommandIds.size === 0) {
    return;
  }

  for (const commandId of [...state.localCodexPendingCommandIds]) {
    try {
      const response = await fetch(`${getCodexLocalBridgeUrl()}/commands/${encodeURIComponent(commandId)}`);

      if (!response.ok) {
        continue;
      }

      const result = await response.json();

      if (result.status !== "completed" && result.status !== "failed") {
        continue;
      }

      postLocalCodexResult(result);
    } catch {
      // Local bridge is optional and may not be running.
    }
  }
}

function postLocalCodexResult(result, options = {}) {
  const resultKey = `${result.id}:${result.status}:${result.completedAt || ""}`;

  if (!options.force && state.localCodexSeenResultKeys.has(resultKey)) {
    return;
  }

  state.localCodexSeenResultKeys.add(resultKey);
  state.localCodexPendingCommandIds.delete(result.id);
  saveLocalCodexPendingCommandIds();

  const resultText =
    result.status === "completed"
      ? result.result || "Codex completed without a final message."
      : result.error || "Codex failed without an error message.";
  postLocalCodexMessage(`Local Codex command ${formatCodexCommandId(result.id)} ${result.status}.\n\n${resultText}`);
}

async function postLatestLocalCodexResult() {
  const response = await fetch(`${getCodexLocalBridgeUrl()}/results`);

  if (!response.ok) {
    postLocalCodexMessage(`Could not read local Codex results. HTTP ${response.status}.`);
    return;
  }

  const results = parseLocalCodexResultLines(await response.text())
    .filter((result) => result.status === "completed" || result.status === "failed");
  const latestResult = results.at(-1);

  if (!latestResult) {
    postLocalCodexMessage("No completed local Codex results yet.");
    return;
  }

  postLocalCodexResult(
    {
      ...latestResult,
      id: latestResult.id || "latest",
      completedAt: latestResult.completedAt || new Date().toISOString(),
    },
    { force: true }
  );
}

function parseLocalCodexResultLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function loadLocalCodexPendingCommandIds() {
  try {
    const ids = JSON.parse(localStorage.getItem(LOCAL_CODEX_PENDING_KEY) || "[]");
    return new Set(Array.isArray(ids) ? ids.filter(Boolean) : []);
  } catch {
    return new Set();
  }
}

function saveLocalCodexPendingCommandIds() {
  localStorage.setItem(LOCAL_CODEX_PENDING_KEY, JSON.stringify([...state.localCodexPendingCommandIds]));
}

async function queueTaskForCodex(payload) {
  const [taskIdInput = "", ...instructionParts] = payload.trim().split(/\s+/);

  if (!taskIdInput) {
    postLocalTaskMessage("Use /task codex <id> [instruction].");
    return;
  }

  const task = await findTaskById(taskIdInput);

  if (!task) {
    postLocalTaskMessage(`Task ${taskIdInput} was not found.`);
    return;
  }

  await queueCodexPrompt(buildTaskCodexPrompt(task, instructionParts.join(" ")));
}

function buildTaskCodexPrompt(task, instruction) {
  const labels = Array.isArray(task.labels) && task.labels.length > 0
    ? task.labels.map((label) => `#${label}`).join(" ")
    : "none";
  const creator = task.createdByName || "Unknown";
  const timeSummary = formatTaskTimeSummary(task).trim() || "none";
  const userInstruction = instruction.trim() || "Process this task and report what was done.";

  return [
    "Process this chat task through Codex.",
    "If the task lacks enough context, do not guess. Ask concise clarification questions using this exact chat command format:",
    `/query task ${formatTaskId(task.id)} <one clear question>`,
    "Ask at most 3 questions. If the next step is clear, proceed normally.",
    "",
    `Task: ${formatTaskId(task.id)}`,
    `Full ID: ${task.id}`,
    `Description: ${task.description || "Untitled task"}`,
    `Labels: ${labels}`,
    `Creator: ${creator}`,
    `Time: ${timeSummary}`,
    "",
    `Instruction: ${userInstruction}`,
  ].join("\n");
}

async function queueTaskContextSummaryForCodex(payload) {
  const [taskIdInput = ""] = payload.trim().split(/\s+/);

  if (!taskIdInput) {
    postLocalTaskMessage("Use /task summarize <id>.");
    return;
  }

  const task = await findTaskById(taskIdInput);

  if (!task) {
    postLocalTaskMessage(`Task ${taskIdInput} was not found.`);
    return;
  }

  const comments = await loadTaskComments(task.id);
  await queueCodexPrompt(buildTaskContextSummaryCodexPrompt(task, comments));
}

function buildTaskContextSummaryCodexPrompt(task, comments) {
  const labels = Array.isArray(task.labels) && task.labels.length > 0
    ? task.labels.map((label) => `#${label}`).join(" ")
    : "none";
  const commentLines = comments.slice(-TASK_CONTEXT_COMMENT_LIMIT).map(formatTaskCommentForCodex);

  return [
    "Summarize this task context into a clearer task description.",
    "",
    "Rules:",
    "- Do not edit files or task data.",
    "- Preserve known facts only; do not invent missing details.",
    "- If context is still unclear, list the missing questions using `/query task <id> <question>`.",
    "- Return one recommended command the user can copy:",
    `/task edit ${formatTaskId(task.id)} <clear one-sentence description>`,
    "",
    `Task: ${formatTaskId(task.id)}`,
    `Full ID: ${task.id}`,
    `Current description: ${task.description || "Untitled task"}`,
    `Labels: ${labels}`,
    "",
    `Recent comments (${commentLines.length}/${comments.length}):`,
    commentLines.length > 0 ? commentLines.join("\n") : "none",
  ].join("\n");
}

function formatTaskCommentForCodex(comment) {
  const author = comment.createdByName || "Unknown";
  const text = String(comment.text || "").replace(/\s+/g, " ").trim();
  return `- ${author}: ${text || "(empty)"}`;
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

function handleSelfReminderCommand(text) {
  const rawCommand = text.trim();
  const payload = rawCommand.slice(SELF_REMINDER_COMMAND.length).trim();
  const [action = "", ...rest] = payload.split(/\s+/);
  const normalizedAction = action.toLowerCase();

  if (!payload || normalizedAction === "help") {
    postLocalSelfReminderMessage(
      "Reminder commands:\n/remind 15m <note>\n/remind after 1h <note>\n/remind list\n/remind cancel <id>"
    );
    return;
  }

  if (normalizedAction === "list") {
    postSelfReminderList();
    return;
  }

  if (normalizedAction === "cancel" || normalizedAction === "done") {
    cancelSelfReminder(rest.join(" "));
    return;
  }

  createSelfReminder(payload);
}

function handleDebugCommand(text) {
  const payload = text.trim().slice(DEBUG_COMMAND.length).trim().toLowerCase();

  if (payload === "reads reset") {
    resetReadAnalytics();
    postLocalDebugMessage("Read analytics reset.");
    setStatus("Read analytics reset.", "success");
    return;
  }

  if (payload === "reads" || payload === "read") {
    postLocalDebugMessage(formatReadAnalyticsReport());
    setStatus("Read analytics shown.", "success");
    return;
  }

  postLocalDebugMessage("Debug commands:\n/debug reads\n/debug reads reset");
}

async function handlePluginCommand(text) {
  const rawCommand = text.trim();
  const payload = rawCommand.slice(PLUGIN_COMMAND.length).trim();
  const [action = "", pluginName = ""] = payload.split(/\s+/);
  const normalizedAction = action.toLowerCase();
  const normalizedPlugin = normalizePluginName(pluginName);

  if (!payload || normalizedAction === "help") {
    postLocalPluginMessage(
      "Plugin commands:\n/plugin enable leads\n/plugin disable leads\n/plugin enable team\n/plugin disable team\n/plugin list"
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
    postLocalPluginMessage("Supported plugins: leads, team.");
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
  if (normalizedPlugin === PLUGIN_TEAM) {
    if (enabled) {
      startTeamFollowupReminderSync();
    } else {
      clearTeamFollowupReminderSync();
      clearTeamFollowupReminders();
    }
  }
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
      "Lead commands:\n/lead <name> phone:<phone> email:<email> company:<company> source:<source> property:<property> location:<location> pricePerGaj:<price> postedBy:<name> notes:<notes>\n/lead x property is available at Jaipur for 50k per gaj, posted by Ritu\n/lead new\n/lead list\n/lead view <id>\n/lead update <id> status:<status> owner:<owner> pricePerGaj:<price> notes:<notes>"
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

async function handleTeamCommand(text) {
  if (!isRoomPluginEnabled(PLUGIN_TEAM)) {
    postLocalTeamMessage("Team is not enabled in this group. Enable it with /plugin enable team.");
    setStatus("Team plugin is disabled.", "error");
    return;
  }

  const rawCommand = text.trim();
  const payload = rawCommand.slice(TEAM_COMMAND.length).trim();
  const [section = "", ...rest] = payload.split(/\s+/);
  const normalizedSection = section.toLowerCase();

  if (!payload || normalizedSection === "help") {
    postLocalTeamMessage(
      "Team commands:\n/team member add name:<name> role:<role> designation:<designation> email:<email> handle:<handle> notes:<notes>\n/team member list\n/team member view <id>\n/team member update <id> role:<role> designation:<designation> status:<active|inactive> notes:<notes>\n/team task assign <task-id> <member-id>\n/team task list [member-id]\n/team task jira <task-id> <JIRA-KEY> [url]\n/team followup add <member-id> after 1d <text>\n/team followup task <task-id> after 1d <text>\n/team followup list\n/team followup done <id>"
    );
    return;
  }

  if (normalizedSection === "member" || normalizedSection === "members") {
    await handleTeamMemberCommand(rest.join(" "));
    return;
  }

  if (normalizedSection === "task" || normalizedSection === "tasks") {
    await handleTeamTaskCommand(rest.join(" "));
    return;
  }

  if (normalizedSection === "followup" || normalizedSection === "followups") {
    await handleTeamFollowupCommand(rest.join(" "));
    return;
  }

  postLocalTeamMessage("Unknown team command. Use /team help.");
  setStatus("Unknown team command.", "error");
}

async function handleTeamMemberCommand(input = "") {
  const [action = "", ...rest] = input.trim().split(/\s+/);
  const normalizedAction = action.toLowerCase();

  if (normalizedAction === "add" || normalizedAction === "new") {
    await addTeamMember(rest.join(" "));
    return;
  }

  if (normalizedAction === "list") {
    await postTeamMemberList();
    return;
  }

  if (normalizedAction === "view") {
    await postTeamMemberView(rest.join(" "));
    return;
  }

  if (normalizedAction === "update" || normalizedAction === "edit") {
    await updateTeamMember(rest.join(" "));
    return;
  }

  postLocalTeamMessage("Use /team member add, /team member list, /team member view <id>, or /team member update <id>.");
}

async function handleTeamTaskCommand(input = "") {
  const [action = "", ...rest] = input.trim().split(/\s+/);
  const normalizedAction = action.toLowerCase();

  if (normalizedAction === "assign") {
    await assignTeamTask(rest.join(" "));
    return;
  }

  if (normalizedAction === "list") {
    await postTeamTaskList(rest.join(" "));
    return;
  }

  if (normalizedAction === "jira") {
    await linkTaskToJira(rest.join(" "));
    return;
  }

  postLocalTeamMessage("Use /team task assign <task-id> <member-id>, /team task list [member-id], or /team task jira <task-id> <JIRA-KEY> [url].");
}

async function handleTeamFollowupCommand(input = "") {
  const [action = "", ...rest] = input.trim().split(/\s+/);
  const normalizedAction = action.toLowerCase();

  if (normalizedAction === "add") {
    await addMemberFollowup(rest.join(" "));
    return;
  }

  if (normalizedAction === "task") {
    await addTaskFollowup(rest.join(" "));
    return;
  }

  if (normalizedAction === "list") {
    await postTeamFollowupList();
    return;
  }

  if (normalizedAction === "done" || normalizedAction === "complete" || normalizedAction === "close") {
    await completeTeamFollowup(rest.join(" "));
    return;
  }

  postLocalTeamMessage("Use /team followup add <member-id> after 1d <text>, /team followup task <task-id> after 1d <text>, /team followup list, or /team followup done <id>.");
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
property: parsedLead.property,
location: parsedLead.location,
pricePerGaj: parsedLead.pricePerGaj,
postedBy: parsedLead.postedBy,
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
  const leadUpdates = {};

  LEAD_FIELDS.forEach((field) => {
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

async function addTeamMember(input) {
  const fields = parseTeamMemberFields(input);
  const name = normalizeTeamFieldValue(fields.name || removeTeamMemberFieldTokens(input));

  if (!name) {
    postLocalTeamMessage("Use /team member add name:<name> role:<role> designation:<designation> email:<email> handle:<handle> notes:<notes>.");
    return;
  }

  const now = new Date();
  const memberPayload = {
    name,
    role: normalizeTeamFieldValue(fields.role),
    designation: normalizeTeamFieldValue(fields.designation),
    email: normalizeTeamFieldValue(fields.email),
    handle: normalizeTeamHandle(fields.handle),
    status: normalizeTeamMemberStatus(fields.status),
    notes: normalizeTeamFieldValue(fields.notes),
    createdAt: serverTimestamp(),
    createdBy: state.profile.id,
    createdByName: getProfileDisplayName(),
    updatedAt: serverTimestamp(),
    updatedBy: state.profile.id,
    updatedByName: getProfileDisplayName(),
  };
  const memberRef = await addDoc(collection(state.db, "rooms", state.roomId, "teamMembers"), memberPayload);
  const memberData = {
    id: memberRef.id,
    ...memberPayload,
    createdAt: now,
    updatedAt: now,
  };

  await postTeamMemberViewMessage(memberData, "added");
  setStatus("Team member added.", "success");
}

async function updateTeamMember(input) {
  const [memberIdInput = "", ...updateParts] = input.trim().split(/\s+/);

  if (!memberIdInput || updateParts.length === 0) {
    postLocalTeamMessage("Use /team member update <id> role:<role> designation:<designation> status:<active|inactive> notes:<notes>.");
    return;
  }

  const member = await findTeamMemberById(memberIdInput);

  if (!member) {
    postLocalTeamMessage(`Team member ${memberIdInput} was not found.`);
    setStatus("Team member not found.", "error");
    return;
  }

  const fields = parseTeamMemberFields(updateParts.join(" "));
  const updates = {};

  TEAM_MEMBER_FIELDS.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(fields, field)) {
      return;
    }

    if (field === "status") {
      updates.status = normalizeTeamMemberStatus(fields.status, member.status || "active");
      return;
    }

    if (field === "handle") {
      updates.handle = normalizeTeamHandle(fields.handle);
      return;
    }

    updates[field] = normalizeTeamFieldValue(fields[field]);
  });

  if (Object.keys(updates).length === 0) {
    postLocalTeamMessage("Add at least one team member field to update.");
    return;
  }

  const updatedAt = new Date();
  await updateDoc(doc(state.db, "rooms", state.roomId, "teamMembers", member.id), {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy: state.profile.id,
    updatedByName: getProfileDisplayName(),
  });

  await postTeamMemberViewMessage({
    ...member,
    ...updates,
    updatedAt,
    updatedBy: state.profile.id,
    updatedByName: getProfileDisplayName(),
  }, "updated");
  setStatus("Team member updated.", "success");
}

async function postTeamMemberList() {
  const members = (await loadRoomTeamMembers())
    .sort(compareTeamMembersByName)
    .slice(0, TEAM_MEMBER_LIST_LIMIT);

  if (members.length === 0) {
    postLocalTeamMessage("No team members yet. Add one with /team member add name:<name>.");
    setStatus("No team members found.", "success");
    return;
  }

  postLocalMessage(
    `Team members: ${members.length}`,
    "Team (only you)",
    "team-member-list",
    [],
    {
      heading: "Team members",
      members: members.map(serializeTeamMemberForMessage),
    }
  );
  setStatus(`${members.length} team member${members.length === 1 ? "" : "s"} listed.`, "success");
}

async function postTeamMemberView(memberIdInput) {
  const memberId = String(memberIdInput || "").trim();

  if (!memberId) {
    postLocalTeamMessage("Use /team member view <id>.");
    return;
  }

  const member = await findTeamMemberById(memberId);

  if (!member) {
    postLocalTeamMessage(`Team member ${memberId} was not found.`);
    setStatus("Team member not found.", "error");
    return;
  }

  await postTeamMemberViewMessage(member, "shared");
  setStatus("Team member shared.", "success");
}

async function postTeamMemberViewMessage(member, action = "shared") {
  await addDoc(collection(state.db, "rooms", state.roomId, "messages"), {
    text: formatTeamMemberMessageText(member, action),
    senderId: state.profile.id,
    senderName: "Team",
    type: "team-member-view",
    member: serializeTeamMemberForMessage(member),
    createdAt: serverTimestamp(),
  });
}

async function assignTeamTask(input) {
  const [taskIdInput = "", memberIdInput = ""] = input.trim().split(/\s+/);

  if (!taskIdInput || !memberIdInput) {
    postLocalTeamMessage("Use /team task assign <task-id> <member-id>.");
    return;
  }

  const [task, member] = await Promise.all([
    findTaskById(taskIdInput),
    findTeamMemberById(memberIdInput),
  ]);

  if (!task) {
    postLocalTeamMessage(`Task ${taskIdInput} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  if (!member) {
    postLocalTeamMessage(`Team member ${memberIdInput} was not found.`);
    setStatus("Team member not found.", "error");
    return;
  }

  await updateDoc(doc(state.db, "rooms", state.roomId, "tasks", task.id), {
    assigneeMemberId: member.id,
    assigneeName: member.name,
    updatedAt: serverTimestamp(),
    updatedBy: state.profile.id,
    updatedByName: getProfileDisplayName(),
  });

  await postTaskMessage(`Task ${formatTaskId(task.id)} assigned to ${member.name}: ${task.description || "Untitled task"}`);
  setStatus("Task assigned.", "success");
}

async function postTeamTaskList(memberIdInput = "") {
  const requestedMemberId = String(memberIdInput || "").trim();
  let member = null;

  if (requestedMemberId) {
    member = await findTeamMemberById(requestedMemberId);

    if (!member) {
      postLocalTeamMessage(`Team member ${requestedMemberId} was not found.`);
      setStatus("Team member not found.", "error");
      return;
    }
  }

  const tasks = (await Promise.all((await loadRoomTasks())
    .filter((task) => task.assigneeMemberId || task.jiraKey || task.source === "jira")
    .filter((task) => !member || task.assigneeMemberId === member.id)
    .sort(compareTasksByCreatedAt)
    .map(loadTaskCommentSummary)));

  if (tasks.length === 0) {
    postLocalTeamMessage(member ? `No team tasks assigned to ${member.name}.` : "No team tasks yet.");
    setStatus("No team tasks found.", "success");
    return;
  }

  postLocalTaskListMessage(
    member ? `Tasks for ${member.name}` : "Team tasks",
    tasks,
    `${member ? `Tasks for ${member.name}` : "Team tasks"}:\n${tasks.map((task) => `${formatTaskId(task.id)} - ${task.description || "Untitled task"}`).join("\n")}`,
    {
      showTodayPlanActions: true,
    }
  );
  setStatus(`${tasks.length} team task${tasks.length === 1 ? "" : "s"} listed.`, "success");
}

async function linkTaskToJira(input) {
  const [taskIdInput = "", jiraKeyInput = "", jiraUrlInput = ""] = input.trim().split(/\s+/);
  const jiraKey = normalizeJiraKey(jiraKeyInput);

  if (!taskIdInput || !jiraKey) {
    postLocalTeamMessage("Use /team task jira <task-id> <JIRA-KEY> [url].");
    return;
  }

  const task = await findTaskById(taskIdInput);

  if (!task) {
    postLocalTeamMessage(`Task ${taskIdInput} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  const jiraUrl = normalizeTeamFieldValue(jiraUrlInput);
  await updateDoc(doc(state.db, "rooms", state.roomId, "tasks", task.id), {
    jiraKey,
    jiraUrl,
    jiraStatus: task.jiraStatus || "linked",
    jiraUpdatedAt: serverTimestamp(),
    source: task.source || "manual",
    updatedAt: serverTimestamp(),
    updatedBy: state.profile.id,
    updatedByName: getProfileDisplayName(),
  });

  await postTaskMessage(`Task ${formatTaskId(task.id)} linked to Jira ${jiraKey}${jiraUrl ? ` (${jiraUrl})` : ""}.`);
  setStatus("Jira reference linked.", "success");
}

async function addMemberFollowup(input) {
  const [memberIdInput = "", ...followupParts] = input.trim().split(/\s+/);

  if (!memberIdInput || followupParts.length === 0) {
    postLocalTeamMessage("Use /team followup add <member-id> after 1d <text>.");
    return;
  }

  const member = await findTeamMemberById(memberIdInput);

  if (!member) {
    postLocalTeamMessage(`Team member ${memberIdInput} was not found.`);
    setStatus("Team member not found.", "error");
    return;
  }

  await createTeamFollowup(followupParts.join(" "), { member });
}

async function addTaskFollowup(input) {
  const [taskIdInput = "", ...followupParts] = input.trim().split(/\s+/);

  if (!taskIdInput || followupParts.length === 0) {
    postLocalTeamMessage("Use /team followup task <task-id> after 1d <text>.");
    return;
  }

  const task = await findTaskById(taskIdInput);

  if (!task) {
    postLocalTeamMessage(`Task ${taskIdInput} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  let member = null;

  if (task.assigneeMemberId) {
    member = await findTeamMemberById(task.assigneeMemberId);
  }

  await createTeamFollowup(followupParts.join(" "), { task, member });
}

async function createTeamFollowup(input, options = {}) {
  const { text, reminderIntervalMs, error } = parseQueryReminderInput(input);

  if (!text) {
    postLocalTeamMessage(error || "Add followup text and reminder timing.");
    return;
  }

  const createdAt = new Date();
  const reminderAt = new Date(createdAt.getTime() + reminderIntervalMs);
  const followupPayload = {
    text,
    status: "pending",
    memberId: options.member?.id || null,
    memberName: options.member?.name || "",
    taskId: options.task?.id || null,
    taskDescription: options.task?.description || "",
    reminderAt,
    reminderIntervalMs,
    lastReminderAt: null,
    reminderCount: 0,
    createdAt: serverTimestamp(),
    createdBy: state.profile.id,
    createdByName: getProfileDisplayName(),
    completedAt: null,
    completedBy: null,
    completedByName: null,
  };
  const followupRef = await addDoc(collection(state.db, "rooms", state.roomId, "followups"), followupPayload);
  const followup = {
    id: followupRef.id,
    ...followupPayload,
    createdAt,
  };

  if (options.task) {
    await addQueryTaskComment(options.task.id, `Followup ${formatTeamFollowupId(followupRef.id)}: ${text}`);
  }

  scheduleTeamFollowupReminder(followup);
  postLocalTeamMessage(`Followup ${formatTeamFollowupId(followupRef.id)} added for ${formatTeamFollowupTarget(followup)}. Reminder in ${formatDuration(reminderIntervalMs)}.`);
  setStatus("Followup added.", "success");
}

async function postTeamFollowupList() {
  const followups = (await loadPendingTeamFollowups())
    .sort(compareTeamFollowupsByReminderAt)
    .slice(0, TEAM_FOLLOWUP_LIST_LIMIT);

  if (followups.length === 0) {
    postLocalTeamMessage("No pending team followups.");
    setStatus("No pending followups.", "success");
    return;
  }

  postLocalMessage(
    `Team followups: ${followups.length}`,
    "Team (only you)",
    "team-followup-list",
    [],
    {
      heading: "Team followups",
      followups: followups.map(serializeTeamFollowupForMessage),
    }
  );
  setStatus(`${followups.length} team followup${followups.length === 1 ? "" : "s"} listed.`, "success");
}

async function completeTeamFollowup(followupIdInput) {
  const followupId = String(followupIdInput || "").trim();

  if (!followupId) {
    postLocalTeamMessage("Use /team followup done <id>.");
    return;
  }

  const followup = await findTeamFollowupById(followupId);

  if (!followup) {
    postLocalTeamMessage(`Followup ${followupId} was not found.`);
    setStatus("Followup not found.", "error");
    return;
  }

  if (followup.status === "complete") {
    postLocalTeamMessage(`Followup ${formatTeamFollowupId(followup.id)} is already complete.`);
    setStatus("Followup already complete.", "success");
    return;
  }

  await updateDoc(doc(state.db, "rooms", state.roomId, "followups", followup.id), {
    status: "complete",
    completedAt: serverTimestamp(),
    completedBy: state.profile.id,
    completedByName: getProfileDisplayName(),
    updatedAt: serverTimestamp(),
  });

  clearTeamFollowupReminder(followup.id);
  postLocalTeamMessage(`Followup ${formatTeamFollowupId(followup.id)} completed: ${followup.text}`);
  setStatus("Followup completed.", "success");
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
  const locationText = leadData.location ? ` at ${leadData.location}` : leadData.company ? ` at ${leadData.company}` : "";
  const priceText = leadData.pricePerGaj ? ` for ${leadData.pricePerGaj}` : "";
  return `Lead ${formatLeadId(leadData.id)} ${actionText}: ${leadData.name || "Untitled lead"}${locationText}${priceText}`;
}

function parseLeadInput(input) {
  const fields = parseLeadFields(input);
  const propertyDetails = parsePropertyLeadText(input);
  const name = normalizeLeadFieldValue(
    fields.name ||
      propertyDetails.name ||
      removeLeadFieldTokens(input)
  );

  return {
    name,
    phone: normalizeLeadFieldValue(fields.phone),
    email: normalizeLeadFieldValue(fields.email),
    company: normalizeLeadFieldValue(fields.company),
    source: normalizeLeadFieldValue(fields.source),
    status: normalizeLeadFieldValue(fields.status),
    owner: normalizeLeadFieldValue(fields.owner),
    property: normalizeLeadFieldValue(fields.property || propertyDetails.property),
    location: normalizeLeadFieldValue(fields.location || propertyDetails.location),
    pricePerGaj: normalizeLeadFieldValue(fields.pricePerGaj || propertyDetails.pricePerGaj),
    postedBy: normalizeLeadFieldValue(fields.postedBy || propertyDetails.postedBy),
    notes: normalizeLeadFieldValue(fields.notes),
  };
}

function parseLeadFields(input) {
  const text = String(input || "");
  const fieldRegex = /\b(name|phone|email|company|source|status|owner|property|location|pricePerGaj|price|rate|postedBy|posted|notes):/gi;
  const matches = [...text.matchAll(fieldRegex)];
  const fields = {};

  matches.forEach((match, index) => {
    const key = normalizeLeadFieldKey(match[1]);

    if (!LEAD_FIELDS.includes(key)) {
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
    .replace(/\b(name|phone|email|company|source|status|owner|property|location|pricePerGaj|price|rate|postedBy|posted|notes):.*?(?=\s+\b(?:name|phone|email|company|source|status|owner|property|location|pricePerGaj|price|rate|postedBy|posted|notes):|$)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLeadFieldKey(key) {
  const normalizedKey = String(key || "").trim().toLowerCase();

  if (normalizedKey === "price" || normalizedKey === "rate") {
    return "pricePerGaj";
  }

  if (normalizedKey === "posted") {
    return "postedBy";
  }

  if (normalizedKey === "pricepergaj") {
    return "pricePerGaj";
  }

  if (normalizedKey === "postedby") {
    return "postedBy";
  }

  return normalizedKey;
}

function parsePropertyLeadText(input) {
  const text = normalizeLeadFieldValue(input);
  const propertyMatch = text.match(/^(.+?)\s+property\s+is\s+available\b/i);
  const locationMatch = text.match(/\bavailable\s+at\s+(.+?)(?=\s+for\s+|,\s*posted\s+by\b|\s+posted\s+by\b|$)/i);
  const priceMatch = text.match(/\bfor\s+(.+?)(?=,\s*posted\s+by\b|\s+posted\s+by\b|$)/i);
  const postedByMatch = text.match(/\bposted\s+by\s+(.+?)\s*$/i);
  const property = normalizeLeadFieldValue(propertyMatch?.[1]);

  return {
    name: property ? `${property} property` : "",
    property,
    location: normalizeLeadFieldValue(locationMatch?.[1]),
    pricePerGaj: normalizeLeadFieldValue(priceMatch?.[1]),
    postedBy: normalizeLeadFieldValue(postedByMatch?.[1]),
  };
}

function normalizeLeadFieldValue(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function parseTeamMemberFields(input) {
  const text = String(input || "");
  const fieldRegex = /\b(name|role|designation|email|handle|status|notes):/gi;
  const matches = [...text.matchAll(fieldRegex)];
  const fields = {};

  matches.forEach((match, index) => {
    const key = normalizeTeamMemberFieldKey(match[1]);

    if (!TEAM_MEMBER_FIELDS.includes(key)) {
      return;
    }

    const valueStart = match.index + match[0].length;
    const valueEnd = index + 1 < matches.length ? matches[index + 1].index : text.length;
    fields[key] = normalizeTeamFieldValue(text.slice(valueStart, valueEnd));
  });

  return fields;
}

function removeTeamMemberFieldTokens(input) {
  return String(input || "")
    .replace(/\b(name|role|designation|email|handle|status|notes):.*?(?=\s+\b(?:name|role|designation|email|handle|status|notes):|$)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTeamMemberFieldKey(key) {
  return String(key || "").trim().toLowerCase();
}

function normalizeTeamFieldValue(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeTeamHandle(value) {
  const normalized = normalizeTeamFieldValue(value).replace(/^@/, "");
  return normalized ? `@${normalized}` : "";
}

function normalizeTeamMemberStatus(value, fallback = "active") {
  const normalized = String(value || "").trim().toLowerCase();

  if (["inactive", "disabled", "archived"].includes(normalized)) {
    return "inactive";
  }

  if (["active", "enabled"].includes(normalized)) {
    return "active";
  }

  return fallback === "inactive" ? "inactive" : "active";
}

function normalizeJiraKey(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return /^[A-Z][A-Z0-9]+-\d+$/.test(normalized) ? normalized : "";
}

async function addChangeLogEntry(input) {
  const { text, labels } = extractLabels(input);

  if (!text) {
    postLocalChangeMessage("Use /change add <summary> #label.");
    return;
  }

  const changeRef = await addDoc(collection(state.db, "rooms", state.roomId, "changelog"), {
    text,
    labels,
    createdAt: serverTimestamp(),
    createdBy: state.profile.id,
    createdByName: getProfileDisplayName(),
  });

  await postChangeMessage(
    `Change ${formatChangeId(changeRef.id)} logged: ${text}${formatTaskLabels(labels)}`
  );
  setStatus("Change logged.", "success");
}

async function postChangeLogList() {
  const changes = await loadRoomChanges();

  if (changes.length === 0) {
    postLocalChangeMessage("No changes logged yet.");
    setStatus("No changes logged.", "success");
    return;
  }

  postLocalChangeMessage(formatChangeLogList(changes.slice(0, CHANGELOG_LIST_LIMIT)));
  setStatus(`${changes.length} change${changes.length === 1 ? "" : "s"} found.`, "success");
}

async function postChangeLogSummary(input = "") {
  const shouldShare = ["share", "send", "group"].includes(input.trim().toLowerCase());
  const changes = await loadRoomChanges();
  const summary = formatChangeLogSummary(changes);

  if (shouldShare) {
    await postChangeMessage(summary);
    setStatus("Change summary shared with the group.", "success");
    return;
  }

  postLocalChangeMessage(summary);
  setStatus("Change summary ready.", "success");
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

function createSelfReminder(input) {
  const parsedReminder = parseSelfReminderInput(input);

  if (parsedReminder.error) {
    postLocalSelfReminderMessage(parsedReminder.error);
    setStatus("Self reminder not created.", "error");
    return;
  }

  const createdAt = new Date();
  const reminder = {
    id: generateSelfReminderId(),
    text: parsedReminder.text,
    reminderIntervalMs: parsedReminder.reminderIntervalMs,
    createdAt: createdAt.toISOString(),
    reminderAt: new Date(createdAt.getTime() + parsedReminder.reminderIntervalMs).toISOString(),
  };
  const reminders = [...loadSelfReminders(), reminder].sort(compareSelfRemindersByReminderAt);

  saveSelfReminders(reminders);
  scheduleSelfReminder(reminder);
  postLocalSelfReminderMessage(
    `Reminder ${formatSelfReminderId(reminder.id)} set for ${formatSelfReminderTime(reminder.reminderAt)} (${formatDuration(parsedReminder.reminderIntervalMs)}): ${reminder.text}`
  );
  setStatus("Self reminder set.", "success");
}

function parseSelfReminderInput(input) {
  const tokens = String(input || "").trim().split(/\s+/).filter(Boolean);
  const firstToken = tokens[0] || "";
  const secondToken = tokens[1] || "";
  const hasDuration =
    isQueryReminderDurationToken(firstToken) ||
    (["after", "in", "remind", "reminder"].includes(firstToken.toLowerCase()) &&
      isQueryReminderDurationToken(secondToken));

  if (!hasDuration) {
    return {
      text: "",
      reminderIntervalMs: QUERY_REMINDER_MS,
      error: "Use /remind 15m <note>, /remind 1h <note>, or /remind 1d <note>.",
    };
  }

  const parsedReminder = parseQueryReminderInput(input);

  if (parsedReminder.error) {
    return parsedReminder;
  }

  if (parsedReminder.reminderIntervalMs > SELF_REMINDER_MAX_MS) {
    return {
      text: "",
      reminderIntervalMs: QUERY_REMINDER_MS,
      error: `Self reminder duration must be ${formatDuration(SELF_REMINDER_MAX_MS)} or less.`,
    };
  }

  if (!parsedReminder.text) {
    return {
      text: "",
      reminderIntervalMs: parsedReminder.reminderIntervalMs,
      error: "Add a note after the reminder time.",
    };
  }

  return parsedReminder;
}

function postSelfReminderList() {
  const reminders = loadSelfReminders().sort(compareSelfRemindersByReminderAt);

  if (reminders.length === 0) {
    postLocalSelfReminderMessage("No self reminders.");
    setStatus("No self reminders.", "success");
    return;
  }

  postLocalSelfReminderMessage(
    `Self reminders:\n${reminders
      .map((reminder) => `${formatSelfReminderId(reminder.id)} - ${formatSelfReminderTime(reminder.reminderAt)} - ${reminder.text}`)
      .join("\n")}`
  );
  setStatus(`${reminders.length} self reminder${reminders.length === 1 ? "" : "s"} listed.`, "success");
}

function cancelSelfReminder(reminderIdInput) {
  const reminderId = normalizeSelfReminderId(reminderIdInput);

  if (!reminderId) {
    postLocalSelfReminderMessage("Use /remind cancel <id>.");
    setStatus("Reminder id needed.", "error");
    return;
  }

  const reminders = loadSelfReminders();
  const reminder = reminders.find((item) => normalizeSelfReminderId(item.id) === reminderId);

  if (!reminder) {
    postLocalSelfReminderMessage(`Reminder ${reminderIdInput} was not found.`);
    setStatus("Self reminder not found.", "error");
    return;
  }

  saveSelfReminders(reminders.filter((item) => normalizeSelfReminderId(item.id) !== reminderId));
  clearSelfReminder(reminder.id);
  postLocalSelfReminderMessage(`Canceled reminder ${formatSelfReminderId(reminder.id)}: ${reminder.text}`);
  setStatus("Self reminder canceled.", "success");
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
  const pendingTasksWithPlanState = await attachTodayPlanState(pendingTasks);
  const todayPlanResetHint = await buildTodayPlanResetHint();

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
  const taskLines = pendingTasksWithPlanState.map((task) => {
    const createdAt = formatTaskTimestamp(task.createdAt);
    const createdBy = task.createdByName || "Unknown";
    const metadata = maskIdentity ? `created ${createdAt}` : `${createdBy}, ${createdAt}`;
    return `${formatTaskId(task.id)} - ${task.description}${formatTaskLabels(task.labels)}${formatTaskTimeSummary(task, { maskIdentity })} (${metadata})`;
  });

  const heading =
    requestedLabels.length > 0
      ? `Pending tasks ${formatTaskLabels(requestedLabels).trim()}:`
      : "Pending tasks:";
  const totalLine = `Total: ${pendingTasksWithPlanState.length} task${pendingTasksWithPlanState.length === 1 ? "" : "s"}`;
  postLocalTaskListMessage(
    heading.replace(/:$/, ""),
    pendingTasksWithPlanState,
    `${heading}\n${taskLines.join("\n")}\n${totalLine}`,
    { showTodayPlanActions: true, todayPlanResetHint }
  );
  setStatus(`${pendingTasksWithPlanState.length} pending task${pendingTasksWithPlanState.length === 1 ? "" : "s"} listed.`, "success");
}

async function queueImportantTasksForCodex(filterText = "") {
  const requestedLabels = parseLabels(filterText);
  const pendingTasks = await Promise.all((await loadPendingRoomTasks())
    .filter((task) => taskHasLabels(task, requestedLabels))
    .sort(compareImportantTaskContext)
    .slice(0, TASK_IMPORTANT_AI_LIMIT)
    .map(loadTaskCommentSummary));
  const tasksWithPlanState = await attachTodayPlanState(pendingTasks);

  if (tasksWithPlanState.length === 0) {
    postLocalTaskMessage(
      requestedLabels.length > 0
        ? `No pending tasks with ${formatTaskLabels(requestedLabels).trim()}.`
        : "No pending tasks to prioritize."
    );
    setStatus("No tasks to prioritize.", "success");
    return;
  }

  await queueCodexPrompt(buildImportantTasksCodexPrompt(tasksWithPlanState, requestedLabels));
  setStatus("Queued AI task priority review.", "success");
}

function buildImportantTasksCodexPrompt(tasks, requestedLabels) {
  const labelText = requestedLabels.length > 0 ? ` matching ${formatTaskLabels(requestedLabels).trim()}` : "";
  const taskLines = tasks.map(formatImportantTaskForCodex).join("\n");

  return [
    `Pick the most important pending tasks${labelText}.`,
    "",
    "Rules:",
    "- Recommend only; do not edit, assign, start, complete, or reorder tasks.",
    "- Prefer tasks that are blockers, urgent, customer-facing, deployment/release related, planned today, active/running, old, or owned/assigned.",
    "- Do not overvalue easy/vague tasks. Say when there is not enough context.",
    "- Return exactly this structure:",
    "Top picks:",
    "1. #shortId - reason - confidence High/Medium/Low - next action",
    "2. #shortId - reason - confidence High/Medium/Low - next action",
    "3. #shortId - reason - confidence High/Medium/Low - next action",
    "Watchouts:",
    "- Missing context or conflicts",
    "",
    `Candidate tasks (${tasks.length}, capped at ${TASK_IMPORTANT_AI_LIMIT}):`,
    taskLines,
  ].join("\n");
}

function formatImportantTaskForCodex(task) {
  const labels = formatTaskLabels(task.labels).trim() || "none";
  const ageDays = getTaskAgeDays(task);
  const subtaskSummary = getSubtaskSummary(task);
  const parts = [
    `${formatTaskId(task.id)} | full:${task.id}`,
    `desc:${task.description || "Untitled task"}`,
    `labels:${labels}`,
    `createdBy:${task.createdByName || "Unknown"}`,
    `ageDays:${ageDays}`,
    task.plannedToday ? "plannedToday:yes" : "plannedToday:no",
    task.activeTimerStartedAt ? `running:${task.activeTimerStartedByName || "someone"}` : "running:no",
    `comments:${Number.isFinite(task.commentCount) ? task.commentCount : 0}`,
    `subtasks:${subtaskSummary.completed}/${subtaskSummary.total}`,
    task.assigneeName ? `assignee:${task.assigneeName}` : "assignee:none",
    task.jiraKey ? `jira:${task.jiraKey}${task.jiraStatus ? ` ${task.jiraStatus}` : ""}` : "jira:none",
    formatTaskTimeSummary(task).trim() || "time:none",
  ];

  return `- ${parts.join(" | ")}`;
}

function getTaskAgeDays(task) {
  const createdAtMillis = getTimestampMillis(task.createdAt);

  if (!createdAtMillis) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - createdAtMillis) / (24 * 60 * 60 * 1000)));
}

function compareImportantTaskContext(left, right) {
  const leftScore = getImportantTaskContextScore(left);
  const rightScore = getImportantTaskContextScore(right);

  if (leftScore !== rightScore) {
    return rightScore - leftScore;
  }

  return compareTasksByCreatedAt(left, right);
}

function getImportantTaskContextScore(task) {
  const labels = new Set(Array.isArray(task.labels) ? task.labels.map((label) => String(label).toLowerCase()) : []);
  const text = `${task.description || ""} ${[...labels].join(" ")}`.toLowerCase();
  let score = 0;

  ["urgent", "blocker", "blocked", "deploy", "deployment", "release", "prod", "production", "customer", "client", "bug"].forEach((keyword) => {
    if (text.includes(keyword) || labels.has(keyword)) {
      score += 3;
    }
  });

  if (task.activeTimerStartedAt) score += 4;
  if (task.assigneeName || task.assigneeMemberId) score += 2;
  if (task.jiraKey) score += 2;
  score += Math.min(getTaskAgeDays(task), 14) / 2;

  return score;
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

async function handleTaskTodayCommand(input = "") {
  const trimmedInput = input.trim();
  const [action = "", ...rest] = trimmedInput.split(/\s+/);
  const normalizedAction = action.toLowerCase();

  if (!trimmedInput || normalizedAction === "help") {
    postLocalTaskMessage(
      "Today task commands:\n/task today #abc123 #def456\n/task today list\n/task today review"
    );
    return;
  }

  if (normalizedAction === "list") {
    await postDailyTaskPlan("today");
    return;
  }

  if (normalizedAction === "review") {
    await postDailyTaskRolloverReview({ auto: false });
    return;
  }

  await assignTasksToToday(trimmedInput);
}

async function assignTasksToToday(input) {
  const parts = input.trim().split(/\s+/).filter(Boolean);
  const dateKey = getTodayKey();
  const taskIdInputs = parts;

  if (taskIdInputs.length === 0) {
    postLocalTaskMessage("Use /task today #abc123 #def456.");
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

async function addTaskToTodayPlan(taskIdInput) {
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

  await setDoc(
    getWorkDayRef(todayKey),
    {
      userId: state.profile.id,
      userName: getProfileDisplayName(),
      dateKey: todayKey,
      plannedTaskIds,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  postLocalTaskMessage(`Planned Task ${formatTaskId(task.id)} for today: ${task.description || "Untitled task"}`);
  setStatus("Task planned for today.", "success");
}

async function removeTaskFromTodayPlan(taskIdInput) {
  const task = await findTaskById(taskIdInput);

  if (!task) {
    postLocalTaskMessage(`Task ${taskIdInput} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  const todayKey = getTodayKey();
  const workDay = await getWorkDay(todayKey);
  const plannedTaskIds = normalizeIdList(workDay?.plannedTaskIds).filter((taskId) => taskId !== task.id);

  await setDoc(
    getWorkDayRef(todayKey),
    {
      userId: state.profile.id,
      userName: getProfileDisplayName(),
      dateKey: todayKey,
      plannedTaskIds,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  postLocalTaskMessage(`Removed Task ${formatTaskId(task.id)} from today's plan.`);
  setStatus("Task removed from today's plan.", "success");
}

async function postDailyTaskPlan(dateInput = "") {
  const dateKey = parseDateKey(dateInput.trim() || "today");

  if (!dateKey) {
    postLocalTaskMessage("Use /task today list.");
    setStatus("Invalid date.", "error");
    return;
  }

  const workDay = await getWorkDay(dateKey);
  const plannedTaskIds = normalizeIdList(workDay?.plannedTaskIds);
  const tasks = await loadTasksByIds(plannedTaskIds);
  const tasksWithComments = await Promise.all(tasks.map(loadTaskCommentSummary));
  const tasksWithPlanState = await attachTodayPlanState(tasksWithComments);
  const todayPlanResetHint = dateKey === getTodayKey() ? await buildTodayPlanResetHint() : "";

  if (tasksWithPlanState.length === 0) {
    postLocalTaskMessage(
      [`No tasks planned for ${formatTaskPlanDate(dateKey)}.`, todayPlanResetHint].filter(Boolean).join("\n")
    );
    setStatus("No planned tasks.", "success");
    return;
  }

  postLocalTaskListMessage(
    `Planned tasks for ${formatTaskPlanDate(dateKey)}`,
    sortTasksByPlannedOrder(tasksWithPlanState, plannedTaskIds),
    `Planned tasks for ${formatTaskPlanDate(dateKey)}:\n${tasksWithPlanState
      .map((task) => `${formatTaskId(task.id)} - ${task.description || "Untitled task"}`)
      .join("\n")}`,
    { plannedDateKey: dateKey, showTodayPlanActions: dateKey === getTodayKey(), todayPlanResetHint }
  );
  setStatus(`${tasksWithPlanState.length} planned task${tasksWithPlanState.length === 1 ? "" : "s"} listed.`, "success");
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

  const [task] = await attachTodayPlanState([pendingTasks[0]]);
  const comments = await loadTaskComments(task.id);
  const taskWithComments = {
    ...task,
    commentCount: comments.length,
  };
  state.taskProcessSession.currentTaskId = task.id;
  saveTaskProcessState();
  postLocalTaskProcessMessage(taskWithComments, pendingTasks.length, comments, await buildTodayPlanResetHint());
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
    completionUpdate.activeTimerDescription = null;
    clearTaskTimerReminder(task.id);
  }

  await updateDoc(doc(state.db, "rooms", state.roomId, "tasks", task.id), completionUpdate);

  if (timerElapsedMs > 0) {
    await recordTaskTimeEntry(task, task.activeTimerStartedAt, new Date(), timerElapsedMs);
  }

  await postTaskMessage(
    `Task ${formatTaskId(task.id)} completed${timerElapsedMs > 0 ? ` and timer stopped after ${formatDuration(timerElapsedMs)}` : ""}: ${getTaskTimerDisplayDescription(task)}`
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
    postLocalTaskMessage("Use /task view <id> to view a task.");
    return;
  }

  const task = await findTaskById(taskId);

  if (!task) {
    postLocalTaskMessage(`Task ${taskId} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  const taskView = await buildTaskViewMessageData(task);

  postLocalMessage(
    `Task ${formatTaskId(task.id)}: ${task.description}`,
    "Tasks (only you)",
    "task-view",
    [],
    taskView
  );
  setStatus("Task shown only to you.", "success");
}

async function shareTaskView(taskIdInput) {
  const taskId = taskIdInput.trim();

  if (!taskId) {
    postLocalTaskMessage("Use /task share <id> to share a task with the group.");
    return;
  }

  const task = await findTaskById(taskId);

  if (!task) {
    postLocalTaskMessage(`Task ${taskId} was not found.`);
    setStatus("Task not found.", "error");
    return;
  }

  const taskView = await buildTaskViewMessageData(task);

  await addDoc(collection(state.db, "rooms", state.roomId, "messages"), {
    text: `Task ${formatTaskId(task.id)}: ${task.description}`,
    senderId: state.profile.id,
    senderName: "Tasks",
    type: "task-view",
    ...taskView,
    createdAt: serverTimestamp(),
  });
  setStatus("Task shared with group.", "success");
}

async function buildTaskViewMessageData(task) {
  const comments = await loadTaskComments(task.id);
  const taskPreview = serializeTaskForMessage({
    ...task,
    commentCount: comments.length,
  });

  return {
    task: taskPreview,
    comments: comments.map(serializeTaskCommentForMessage),
    maskIdentity: isPrivacyModeActive(),
  };
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
    `Current task\n${formatTaskId(currentTask.id)} - ${getTaskTimerDisplayDescription(currentTask)}`,
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

async function startTaskTimer(input) {
  const timerRequest = await parseTimerStartInput(input);
  const unavailableReason = await getTimerUnavailableReason();

  if (unavailableReason) {
    await postTaskMessage(unavailableReason);
    setStatus("Timer cannot start right now.", "error");
    return;
  }

  if (timerRequest.error) {
    await postTaskMessage(timerRequest.error);
    setStatus("Task not found.", "error");
    return;
  }

  if (!timerRequest.task) {
    await startGeneralTimer(timerRequest.description);
    return;
  }

  const task = timerRequest.task;
  const timerDescription = timerRequest.description;

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
    activeTimerDescription: timerDescription || null,
  });

  scheduleTaskTimerReminder({
    id: task.id,
    description: getTaskTimerDisplayDescription(task, timerDescription),
    startedAt,
    timerDescription,
  });
  clearDayIdleTaskReminder();
  await postTaskMessage(
    `Task ${formatTaskId(task.id)} timer started: ${getTaskTimerDisplayDescription(task, timerDescription)}`
  );
  setStatus("Task timer started.", "success");
}

async function parseTimerStartInput(input = "") {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return {
      task: null,
      description: "",
    };
  }

  const [firstToken = "", ...descriptionParts] = trimmedInput.split(/\s+/);
  const task = await findTaskById(firstToken);

  if (!task) {
    if (firstToken.startsWith("#")) {
      return {
        task: null,
        description: "",
        error: `Task ${firstToken} was not found.`,
      };
    }

    return {
      task: null,
      description: sanitizeTimerDescription(trimmedInput),
    };
  }

  return {
    task,
    description: sanitizeTimerDescription(descriptionParts.join(" ")),
  };
}

function sanitizeTimerDescription(description) {
  return String(description || "").trim().slice(0, 200);
}

async function stopTaskTimer(taskIdInput) {
  const taskId = taskIdInput.trim();

  if (!taskId) {
    await stopCurrentActiveTimer();
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
    activeTimerDescription: null,
  });

  await recordTaskTimeEntry(task, task.activeTimerStartedAt, stoppedAt, elapsedMs);
  clearTaskTimerReminder(task.id);
  scheduleDayIdleTaskReminder();
  await postTaskMessage(
    `Task ${formatTaskId(task.id)} timer stopped after ${formatDuration(elapsedMs)}: ${getTaskTimerDisplayDescription(task)}`
  );
  setStatus("Task timer stopped.", "success");
}

async function stopCurrentActiveTimer() {
  const activeTimer = await findCurrentActiveTimerForCurrentUser();

  if (!activeTimer) {
    await postTaskMessage("No active timer is running.");
    setStatus("No active timer.", "success");
    return;
  }

  if (activeTimer.type === "general") {
    await stopGeneralTimer();
    return;
  }

  await stopTaskTimer(activeTimer.task.id);
}

async function findCurrentActiveTimerForCurrentUser() {
  const [tasks, generalTimer] = await Promise.all([loadRoomTasks(), findActiveGeneralTimer()]);
  const activeTimers = tasks
    .filter((task) => task.activeTimerStartedAt && isCurrentUserTaskTimerOwner(task))
    .map((task) => ({
      type: "task",
      task,
      startedAt: task.activeTimerStartedAt,
    }));

  if (generalTimer?.data?.activeTimerStartedAt) {
    activeTimers.push({
      type: "general",
      workDay: generalTimer,
      startedAt: generalTimer.data.activeTimerStartedAt,
    });
  }

  return activeTimers.sort(compareActiveTimerRecordsByStartedAt)[0] || null;
}

async function startGeneralTimer(description = "") {
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
  const timerDescription = sanitizeTimerDescription(description);

  await setDoc(
    getWorkDayRef(),
    {
      userId: state.profile.id,
      userName: getProfileDisplayName(),
      dateKey: getTodayKey(),
      activeTimerStartedAt: startedAt,
      activeTimerStartedBy: state.profile.id,
      activeTimerStartedByName: getProfileDisplayName(),
      activeTimerDescription: timerDescription || null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  scheduleTaskTimerReminder({
    id: getGeneralTimerReminderId(),
    description: getGeneralTimerDisplayDescription(timerDescription),
    startedAt,
    isGeneralTimer: true,
    timerDescription,
  });
  clearDayIdleTaskReminder();
  await postTaskMessage(`General timer started${timerDescription ? `: ${timerDescription}` : ""}.`);
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
      activeTimerDescription: null,
      userId: state.profile.id,
      userName: getProfileDisplayName(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await recordGeneralTimeEntry(
    activeTimer.data.activeTimerStartedAt,
    stoppedAt,
    elapsedMs,
    activeTimer.ref,
    activeTimer.data.activeTimerDescription
  );
  clearGeneralTimerReminders();
  scheduleDayIdleTaskReminder();
  await postTaskMessage(
    `General timer stopped after ${formatDuration(elapsedMs)}${activeTimer.data.activeTimerDescription ? `: ${activeTimer.data.activeTimerDescription}` : ""}.`
  );
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
  const [activeTasks, activeGeneralTimer] = await Promise.all([
    loadCurrentUserActiveTaskTimers(),
    findActiveGeneralTimer(),
  ]);
  let pausedCount = 0;

  for (const task of activeTasks) {
    const elapsedMs = Math.max(0, stoppedAt.getTime() - getTimestampMillis(task.activeTimerStartedAt));

    await updateDoc(doc(state.db, "rooms", state.roomId, "tasks", task.id), {
      totalTrackedMs: increment(elapsedMs),
      activeTimerStartedAt: null,
      activeTimerStartedBy: null,
      activeTimerStartedByName: null,
      activeTimerDescription: null,
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
        activeTimerDescription: null,
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
        activeGeneralTimer.ref,
        activeGeneralTimer.data.activeTimerDescription
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
    description: getGeneralTimerDisplayDescription(activeTimer.data.activeTimerDescription),
    startedAt: new Date(),
    isGeneralTimer: true,
    timerDescription: activeTimer.data.activeTimerDescription || "",
    activeTimerDescription: activeTimer.data.activeTimerDescription || "",
    ref: activeTimer.ref,
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
    description: getTaskTimerDisplayDescription(task),
    startedAt: new Date(),
    timerDescription: task.activeTimerDescription || "",
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
  const actions = [];

  if (activeGeneralTimers.length > 0) {
    lines.push("General:");
    activeGeneralTimers.forEach((workDay) => {
      const ownerName = isPrivacyModeActive()
        ? "User"
        : workDay.activeTimerStartedByName || workDay.userName || "Someone";
      const elapsed = formatDuration(Date.now() - getTimestampMillis(workDay.activeTimerStartedAt));
      const description = getGeneralTimerDisplayDescription(workDay.activeTimerDescription);
      lines.push(`- ${ownerName}: ${elapsed}${description !== "General work" ? ` - ${description}` : ""}`);

      if (isCurrentUserWorkDay(workDay)) {
        actions.push({
          label: "Stop general",
          action: "general-timer-stop",
        });
      }
    });
  }

  if (activeTaskTimers.length > 0) {
    lines.push("Tasks:");
    activeTaskTimers.forEach((task) => {
      const ownerName = isPrivacyModeActive() ? "User" : getTaskTimerOwnerName(task);
      const elapsed = formatDuration(Date.now() - getTimestampMillis(task.activeTimerStartedAt));
      const taskId = formatTaskId(task.id);
      lines.push(`- ${taskId} ${getTaskTimerDisplayDescription(task)} (${ownerName}, ${elapsed})`);

      if (isCurrentUserTaskTimerOwner(task)) {
        actions.push(
          {
            label: `Stop ${taskId}`,
            action: "task-stop",
            taskId: task.id,
          },
          {
            label: `Complete ${taskId}`,
            action: "task-complete",
            taskId: task.id,
          }
        );
      }
    });
  }

  postLocalTaskMessage(lines.join("\n"), actions);
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
      dayIdleReminderCount: getDayIdleReminderCount(existingDay),
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
    const generalTimerDescription = getGeneralTimerDisplayDescription(activeGeneralTimer.data.activeTimerDescription);
    lines.push(
      `General timer: running ${formatDuration(Date.now() - getTimestampMillis(activeGeneralTimer.data.activeTimerStartedAt))}${generalTimerDescription !== "General work" ? ` - ${generalTimerDescription}` : ""}`
    );
  }

  if (activeTaskTimers.length > 0) {
    lines.push(`Task timers: ${activeTaskTimers.length} running`);
    activeTaskTimers.slice(0, 5).forEach((task) => {
      lines.push(
        `- ${formatTaskId(task.id)} ${getTaskTimerDisplayDescription(task)} (${formatDuration(Date.now() - getTimestampMillis(task.activeTimerStartedAt))})`
      );
    });
  }

  if (workDay?.activeBreakStartedAt) {
    lines.push(
      `Break: running ${formatDuration(Date.now() - getTimestampMillis(workDay.activeBreakStartedAt))}`
    );
  }

  lines.push(`Idle reminders today: ${getDayIdleReminderCount(workDay)}`);

  postLocalDayMessage(lines.join("\n"));
  setStatus("Day status ready.", "success");
}

async function postDaySummary() {
  const summary = await buildDailyTaskSummary({ includePlan: true });
  postLocalDayMessage(summary);
  setStatus("Day summary ready.", "success");
}

async function queueDayCoachForCodex(options = {}) {
  const summary = await buildDailyTaskSummary({ includePlan: true });
  const pendingTasks = await attachTodayPlanState(
    (await loadPendingRoomTasks())
      .sort(compareImportantTaskContext)
      .slice(0, DAY_COACH_TASK_LIMIT)
  );
  const focusTask = options.taskId ? await findTaskById(options.taskId) : null;

  await queueCodexPrompt(buildDayCoachCodexPrompt({
    trigger: options.trigger || "manual",
    summary,
    pendingTasks,
    focusTask,
  }));
  setStatus("AI day coach queued.", "success");
}

function buildDayCoachCodexPrompt({ trigger, summary, pendingTasks, focusTask }) {
  return [
    "Act as a practical day coach for this chat/task app.",
    "",
    "Goal:",
    "- Help optimize my day with concrete next steps.",
    "- Detect if I am idle, stuck too long, working on a vague/simple task too long, or missing an easier path.",
    "- Suggest where AI/Codex can help directly.",
    "",
    "Rules:",
    "- Recommend only; do not edit files, tasks, timers, or plans.",
    "- Keep it short and actionable.",
    "- If a task lacks context, ask a question using `/query task #id <question>`.",
    "- If Codex can help execute/summarize/review something, suggest the exact `/task codex #id <instruction>` command.",
    "- If the best move is to start/stop/continue a timer, give the exact command.",
    "",
    "Return exactly:",
    "1. Best next move",
    "2. Risk or bottleneck",
    "3. AI assist opportunity",
    "4. Suggested command",
    "",
    `Trigger: ${trigger}`,
    "",
    "Current day summary:",
    summary,
    "",
    focusTask ? `Focus task:\n${formatDayCoachTaskForCodex(focusTask)}` : "Focus task: none",
    "",
    `Candidate pending tasks (${pendingTasks.length}, capped at ${DAY_COACH_TASK_LIMIT}):`,
    pendingTasks.length > 0 ? pendingTasks.map(formatDayCoachTaskForCodex).join("\n") : "none",
  ].join("\n");
}

function formatDayCoachTaskForCodex(task) {
  return [
    `- ${formatTaskId(task.id)}`,
    `desc:${task.description || "Untitled task"}`,
    `labels:${formatTaskLabels(task.labels).trim() || "none"}`,
    task.plannedToday ? "plannedToday:yes" : "plannedToday:no",
    task.activeTimerStartedAt
      ? `running:${formatDuration(Date.now() - getTimestampMillis(task.activeTimerStartedAt))}`
      : "running:no",
    formatTaskTimeSummary(task).trim() || "time:none",
  ].join(" | ");
}

async function postTimesheet(input = "") {
  const request = parseTimesheetRequest(input);

  if (!request) {
    postLocalDayMessage("Use /day timesheet [today|yesterday|YYYY-MM-DD] [@handle].");
    setStatus("Timesheet request needs a valid date.", "error");
    return;
  }

  const timesheet = await buildTimesheet(request);
  postLocalDayMessage(timesheet);
  setStatus("Timesheet ready.", "success");
}

async function buildTimesheet({ dateKey, handle }) {
  const { start, end } = getDateBounds(dateKey);
  const tasks = await loadRoomTasks();
  const roomWorkDays = await loadRoomWorkDays();
  const matchingWorkDays = roomWorkDays.filter(
    (workDay) => workDay.dateKey === dateKey && workDayMatchesHandle(workDay, handle)
  );
  const workDay = selectTimesheetWorkDay(matchingWorkDays, handle);
  const taskEntriesByTask = await loadTimesheetTaskEntries(tasks, start, end, handle);
  const generalEntries = workDay
    ? (await loadWorkDayTimeEntries(workDay.ref)).filter((entry) => timesheetEntryMatches(entry, start, end, handle))
    : [];
  const breakEntries = workDay ? getTimesheetBreakEntries(workDay, start, end, handle) : [];
  const shouldShowRunningState = dateKey === getTodayKey();
  const activeTaskTimers = shouldShowRunningState
    ? tasks
        .filter((task) => task.activeTimerStartedAt && taskTimerMatchesHandle(task, handle))
        .sort(compareActiveTimersByStartedAt)
    : [];
  const taskTrackedMs = [...taskEntriesByTask.values()]
    .flat()
    .reduce((total, entry) => total + getTimeEntryDurationMs(entry), 0);
  const generalTrackedMs = generalEntries.reduce((total, entry) => total + getTimeEntryDurationMs(entry), 0);
  const breakMs = breakEntries.reduce((total, breakEntry) => total + getBreakDurationMs(breakEntry), 0);
  const personLabel = getTimesheetPersonLabel({ handle, workDay, taskEntriesByTask, generalEntries, breakEntries });
  const lines = [`Timesheet for ${personLabel} on ${dateKey}`];

  appendWorkDayStartEndLines(lines, workDay);
  lines.push(`Task time: ${formatDuration(taskTrackedMs)}`);
  lines.push(`General time: ${formatDuration(generalTrackedMs)}`);
  lines.push(`Break time: ${formatDuration(breakMs)}`);
  lines.push(`Total work time: ${formatDuration(taskTrackedMs + generalTrackedMs)}`);

  if (workDay?.availabilityStatus === "free") {
    lines.push(`Availability: ${formatDayAvailabilityStatus(workDay)}`);
  }

  const taskEntryGroups = [...taskEntriesByTask.entries()].filter(([, entries]) => entries.length > 0);
  if (taskEntryGroups.length > 0) {
    lines.push("Tasks:");
    taskEntryGroups.forEach(([task, entries]) => {
      const totalMs = entries.reduce((total, entry) => total + getTimeEntryDurationMs(entry), 0);
      lines.push(`- ${formatTaskId(task.id)} ${task.description || "Untitled task"}: ${formatDuration(totalMs)}`);
      entries.forEach((entry) => {
        lines.push(
          `  ${formatTimeEntryRange(entry)} (${formatDuration(getTimeEntryDurationMs(entry))})${entry.timerDescription ? ` - ${entry.timerDescription}` : ""}`
        );
      });
    });
  }

  if (generalEntries.length > 0) {
    lines.push("General entries:");
    generalEntries.forEach((entry) => {
      lines.push(
        `- ${formatTimeEntryRange(entry)} (${formatDuration(getTimeEntryDurationMs(entry))})${entry.timerDescription ? ` - ${entry.timerDescription}` : ""}`
      );
    });
  }

  if (breakEntries.length > 0) {
    lines.push("Breaks:");
    breakEntries.forEach((breakEntry) => {
      lines.push(`- ${formatBreakTimeRange(breakEntry)} (${formatDuration(getBreakDurationMs(breakEntry))})`);
    });
  }

  if (shouldShowRunningState && workDay?.activeTimerStartedAt) {
    const generalTimerDescription = getGeneralTimerDisplayDescription(workDay.activeTimerDescription);
    lines.push(
      `General timer running: ${formatDuration(Date.now() - getTimestampMillis(workDay.activeTimerStartedAt))}${generalTimerDescription !== "General work" ? ` - ${generalTimerDescription}` : ""}`
    );
  }

  if (shouldShowRunningState && workDay?.activeBreakStartedAt) {
    lines.push(`Break running: ${formatDuration(Date.now() - getTimestampMillis(workDay.activeBreakStartedAt))}`);
  }

  if (activeTaskTimers.length > 0) {
    lines.push("Running task timers:");
    activeTaskTimers.slice(0, 10).forEach((task) => {
      lines.push(
        `- ${formatTaskId(task.id)} ${getTaskTimerDisplayDescription(task)} (${formatDuration(Date.now() - getTimestampMillis(task.activeTimerStartedAt))})`
      );
    });
  }

  if (
    taskTrackedMs === 0 &&
    generalTrackedMs === 0 &&
    breakMs === 0 &&
    (!shouldShowRunningState || !workDay?.activeTimerStartedAt) &&
    (!shouldShowRunningState || !workDay?.activeBreakStartedAt) &&
    activeTaskTimers.length === 0
  ) {
    lines.push("No timesheet activity found.");
  }

  return lines.join("\n");
}

function appendWorkDayStartEndLines(lines, workDay) {
  if (workDay?.startedAt) {
    lines.push(`Day started: ${formatTaskTimestamp(workDay.startedAt)}`);
  } else {
    lines.push("Day started: not started");
  }

  if (workDay?.endedAt) {
    lines.push(`Day ended: ${formatTaskTimestamp(workDay.endedAt)}`);
  } else if (workDay?.startedAt) {
    lines.push("Day ended: not ended yet");
  } else {
    lines.push("Day ended: not ended");
  }
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
      const announcementSnapshot = await trackedGetDoc("leaves.announcements", announcementRef);

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

  appendWorkDayStartEndLines(lines, workDay);

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
  lines.push(`Idle reminders: ${getDayIdleReminderCount(workDay)}`);
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
    const generalTimerDescription = getGeneralTimerDisplayDescription(activeGeneralTimer.data.activeTimerDescription);
    lines.push(
      `General timer running: ${formatDuration(Date.now() - getTimestampMillis(activeGeneralTimer.data.activeTimerStartedAt))}${generalTimerDescription !== "General work" ? ` - ${generalTimerDescription}` : ""}`
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
      lines.push(`- ${getTaskTimerDisplayDescription(task)} (${formatDuration(Date.now() - getTimestampMillis(task.activeTimerStartedAt))})`);
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

  const directSnapshot = await trackedGetDoc("tasks.find", doc(state.db, "rooms", state.roomId, "tasks", normalizedId));

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
    activeTimerDescription: task.activeTimerDescription || "",
    commentCount: Number.isFinite(task.commentCount) ? task.commentCount : 0,
    assigneeMemberId: task.assigneeMemberId || "",
    assigneeName: task.assigneeName || "",
    jiraKey: task.jiraKey || "",
    jiraUrl: task.jiraUrl || "",
    jiraStatus: task.jiraStatus || "",
    jiraUpdatedAt: task.jiraUpdatedAt || null,
    source: task.source || "",
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
    property: leadData.property || "",
    location: leadData.location || "",
    pricePerGaj: leadData.pricePerGaj || "",
    postedBy: leadData.postedBy || "",
    notes: leadData.notes || "",
    createdAt: leadData.createdAt || null,
    createdBy: leadData.createdBy || null,
    createdByName: leadData.createdByName || "",
    updatedAt: leadData.updatedAt || null,
    updatedBy: leadData.updatedBy || null,
    updatedByName: leadData.updatedByName || "",
  };
}

function serializeTeamMemberForMessage(member) {
  return {
    id: member.id,
    name: member.name || "Unnamed member",
    role: member.role || "",
    designation: member.designation || "",
    email: member.email || "",
    handle: member.handle || "",
    status: member.status || "active",
    notes: member.notes || "",
    createdAt: member.createdAt || null,
    createdBy: member.createdBy || null,
    createdByName: member.createdByName || "",
    updatedAt: member.updatedAt || null,
    updatedBy: member.updatedBy || null,
    updatedByName: member.updatedByName || "",
  };
}

function serializeTeamFollowupForMessage(followup) {
  return {
    id: followup.id,
    text: followup.text || "Untitled followup",
    status: followup.status === "complete" ? "complete" : "pending",
    memberId: followup.memberId || null,
    memberName: followup.memberName || "",
    taskId: followup.taskId || null,
    taskDescription: followup.taskDescription || "",
    reminderAt: followup.reminderAt || null,
    reminderIntervalMs: Number.isFinite(followup.reminderIntervalMs) ? followup.reminderIntervalMs : QUERY_REMINDER_MS,
    lastReminderAt: followup.lastReminderAt || null,
    reminderCount: Number.isFinite(followup.reminderCount) ? followup.reminderCount : 0,
    createdAt: followup.createdAt || null,
    createdBy: followup.createdBy || null,
    createdByName: followup.createdByName || "",
    completedAt: followup.completedAt || null,
    completedBy: followup.completedBy || null,
    completedByName: followup.completedByName || "",
  };
}

async function findQueryById(queryIdInput) {
  const normalizedId = normalizeQueryId(queryIdInput);

  if (!normalizedId) {
    return null;
  }

  const directSnapshot = await trackedGetDoc("queries.find", doc(state.db, "rooms", state.roomId, "queries", normalizedId));

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
  const queriesSnapshot = await trackedGetDocs("queries.all", collection(state.db, "rooms", state.roomId, "queries"));

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
  const queriesSnapshot = await trackedGetDocs("queries.pending", pendingQueries);

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

  const directSnapshot = await trackedGetDoc("leads.find", doc(state.db, "rooms", state.roomId, "leads", normalizedId));

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

async function findTeamMemberById(memberIdInput) {
  const normalizedId = normalizeTeamMemberId(memberIdInput);

  if (!normalizedId) {
    return null;
  }

  const directSnapshot = await trackedGetDoc("teamMembers.find", doc(state.db, "rooms", state.roomId, "teamMembers", normalizedId));

  if (directSnapshot.exists()) {
    return {
      id: directSnapshot.id,
      ...directSnapshot.data(),
    };
  }

  const members = await loadRoomTeamMembers();
  const matches = members.filter((member) => {
    const memberId = member.id.toLowerCase();
    const handle = normalizeTeamHandle(member.handle).replace(/^@/, "");
    return memberId.startsWith(normalizedId) || (handle && handle === normalizedId);
  });

  return matches.length === 1 ? matches[0] : null;
}

async function findTeamFollowupById(followupIdInput) {
  const normalizedId = normalizeTeamFollowupId(followupIdInput);

  if (!normalizedId) {
    return null;
  }

  const directSnapshot = await trackedGetDoc("followups.find", doc(state.db, "rooms", state.roomId, "followups", normalizedId));

  if (directSnapshot.exists()) {
    return {
      id: directSnapshot.id,
      ...directSnapshot.data(),
    };
  }

  const followups = await loadRoomTeamFollowups();
  const matches = followups.filter((followup) => followup.id.toLowerCase().startsWith(normalizedId));

  return matches.length === 1 ? matches[0] : null;
}

async function loadRoomLeads() {
  const leadsSnapshot = await trackedGetDocs("leads.all", collection(state.db, "rooms", state.roomId, "leads"));

  return leadsSnapshot.docs.map((leadDoc) => ({
    id: leadDoc.id,
    ...leadDoc.data(),
  }));
}

async function loadRoomTeamMembers() {
  const membersSnapshot = await trackedGetDocs("teamMembers.all", collection(state.db, "rooms", state.roomId, "teamMembers"));

  return membersSnapshot.docs.map((memberDoc) => ({
    id: memberDoc.id,
    ...memberDoc.data(),
  }));
}

async function loadRoomTeamFollowups() {
  const followupsSnapshot = await trackedGetDocs("followups.all", collection(state.db, "rooms", state.roomId, "followups"));

  return followupsSnapshot.docs.map((followupDoc) => ({
    id: followupDoc.id,
    ...followupDoc.data(),
  }));
}

async function loadPendingTeamFollowups() {
  const followupsQuery = query(
    collection(state.db, "rooms", state.roomId, "followups"),
    where("status", "==", "pending")
  );
  const followupsSnapshot = await trackedGetDocs("followups.pending", followupsQuery);

  return followupsSnapshot.docs.map((followupDoc) => ({
    id: followupDoc.id,
    ...followupDoc.data(),
  }));
}

async function loadRoomChanges() {
  const changesQuery = query(
    collection(state.db, "rooms", state.roomId, "changelog"),
    orderBy("createdAt", "desc")
  );
  const changesSnapshot = await trackedGetDocs("changes.all", changesQuery);

  return changesSnapshot.docs.map((changeDoc) => ({
    id: changeDoc.id,
    ...changeDoc.data(),
  }));
}

async function loadRoomTasks() {
  const tasksSnapshot = await trackedGetDocs("tasks.all", collection(state.db, "rooms", state.roomId, "tasks"));

  return tasksSnapshot.docs.map((taskDoc) => ({
    id: taskDoc.id,
    ...taskDoc.data(),
  }));
}

async function loadCurrentUserActiveTaskTimers() {
  if (!state.profile?.id) {
    return [];
  }

  const activeTasksQuery = query(
    collection(state.db, "rooms", state.roomId, "tasks"),
    where("activeTimerStartedBy", "==", state.profile.id)
  );
  const tasksSnapshot = await trackedGetDocs("tasks.activeTimers", activeTasksQuery);

  return tasksSnapshot.docs
    .map((taskDoc) => ({
      id: taskDoc.id,
      ...taskDoc.data(),
    }))
    .filter((task) => task.status !== "complete" && task.activeTimerStartedAt && isCurrentUserTaskTimerOwner(task));
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
  const workDaysSnapshot = await trackedGetDocs("workDays.all", collection(state.db, "rooms", state.roomId, "workDays"));

  return workDaysSnapshot.docs.map((workDayDoc) => ({
    id: workDayDoc.id,
    ref: workDayDoc.ref,
    ...workDayDoc.data(),
  }));
}

async function loadTaskTimeEntries(taskId) {
  const entriesSnapshot = await trackedGetDocs(
    "taskTimeEntries",
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
  const commentsSnapshot = await trackedGetDocs("taskComments", commentsQuery);

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

async function loadWorkDayTimeEntries(workDayRef = getWorkDayRef()) {
  const entriesSnapshot = await trackedGetDocs("workDayTimeEntries", collection(workDayRef, "timeEntries"));

  return entriesSnapshot.docs.map((entryDoc) => ({
    id: entryDoc.id,
    ...entryDoc.data(),
  }));
}

async function getWorkDay(dateKey = getTodayKey()) {
  const snapshot = await trackedGetDoc("workDay.current", getWorkDayRef(dateKey));
  return snapshot.exists() ? snapshot.data() : null;
}

async function findActiveGeneralTimer() {
  const todaySnapshot = await trackedGetDoc("workDay.today", getWorkDayRef());

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

function parseTimesheetRequest(input = "") {
  const parts = input.trim().split(/\s+/).filter(Boolean);
  let dateKey = getTodayKey();
  const handleParts = [];

  for (const part of parts) {
    const parsedDateKey = parseDateKey(part);

    if (parsedDateKey) {
      dateKey = parsedDateKey;
      continue;
    }

    if (looksLikeDateToken(part)) {
      return null;
    }

    handleParts.push(part);
  }

  return {
    dateKey,
    handle: normalizeTimesheetHandle(handleParts.join(" ")),
  };
}

function looksLikeDateToken(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

function normalizeTimesheetHandle(value) {
  return String(value || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function workDayMatchesHandle(workDay, handle) {
  if (!handle) {
    return isCurrentUserWorkDay(workDay);
  }

  return doesPersonMatchHandle(workDay.userName, handle) || doesPersonMatchHandle(workDay.activeTimerStartedByName, handle);
}

function taskTimerMatchesHandle(task, handle) {
  if (!handle) {
    return isCurrentUserTaskTimerOwner(task);
  }

  return doesPersonMatchHandle(task.activeTimerStartedByName, handle);
}

function doesPersonMatchHandle(name, handle) {
  const normalizedName = normalizeProfileName(name);
  const normalizedHandle = normalizeTimesheetHandle(handle);

  if (!normalizedName || !normalizedHandle) {
    return false;
  }

  return normalizedName === normalizedHandle || normalizedName.replace(/\s+/g, "") === normalizedHandle;
}

function timesheetEntryMatches(entry, start, end, handle) {
  return isTimestampWithin(entry.stoppedAt, start, end) && (!handle || doesPersonMatchHandle(entry.userName, handle));
}

async function loadTimesheetTaskEntries(tasks, start, end, handle) {
  const entriesByTask = new Map();

  await Promise.all(
    tasks.map(async (task) => {
      const entries = (await loadTaskTimeEntries(task.id)).filter((entry) => {
        if (!isTimestampWithin(entry.stoppedAt, start, end)) {
          return false;
        }

        if (handle) {
          return doesPersonMatchHandle(entry.userName, handle);
        }

        return entry.userId === state.profile.id || doesPersonMatchHandle(entry.userName, state.profile.name);
      });

      entriesByTask.set(task, entries);
    })
  );

  return entriesByTask;
}

function selectTimesheetWorkDay(workDays, handle) {
  if (workDays.length === 0) {
    return null;
  }

  if (!handle) {
    return workDays.find((workDay) => workDay.userId === state.profile?.id) || workDays[0];
  }

  return workDays[0];
}

function getTimesheetBreakEntries(workDay, start, end, handle) {
  const completedBreaks = (Array.isArray(workDay?.breaks) ? workDay.breaks : []).filter(
    (breakEntry) =>
      timesheetEntryMatches(breakEntry, start, end, handle) ||
      (isTimestampWithin(breakEntry.startedAt, start, end) && (!handle || doesPersonMatchHandle(breakEntry.userName, handle)))
  );

  return completedBreaks;
}

function getTimesheetPersonLabel({ handle, workDay, taskEntriesByTask, generalEntries, breakEntries }) {
  if (workDay?.userName) {
    return workDay.userName;
  }

  const firstTaskEntry = [...taskEntriesByTask.values()].flat().find((entry) => entry.userName);
  if (firstTaskEntry?.userName) {
    return firstTaskEntry.userName;
  }

  const firstGeneralEntry = generalEntries.find((entry) => entry.userName);
  if (firstGeneralEntry?.userName) {
    return firstGeneralEntry.userName;
  }

  const firstBreakEntry = breakEntries.find((entry) => entry.userName);
  if (firstBreakEntry?.userName) {
    return firstBreakEntry.userName;
  }

  return handle ? `@${handle}` : getProfileDisplayName();
}

async function loadRoomLeaves() {
  const leavesSnapshot = await trackedGetDocs("leaves.all", collection(state.db, "rooms", state.roomId, "leaves"));

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

  const directSnapshot = await trackedGetDoc("leaves.find", doc(state.db, "rooms", state.roomId, "leaves", normalizedId));

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
  const tasksSnapshot = await trackedGetDocs("tasks.pending", pendingTasksQuery);

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
  const tasksSnapshot = await trackedGetDocs("tasks.completed", completedTasksQuery);

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

async function postChangeMessage(text) {
  await addDoc(collection(state.db, "rooms", state.roomId, "messages"), {
    text,
    senderId: state.profile.id,
    senderName: "Changelog",
    type: "change",
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
    timerDescription: task.activeTimerDescription || null,
    userId: state.profile.id,
    userName: getProfileDisplayName(),
    startedAt: normalizeTimestampDate(startedAt),
    stoppedAt,
    durationMs,
    createdAt: serverTimestamp(),
  });
}

async function recordGeneralTimeEntry(
  startedAt,
  stoppedAt,
  durationMs,
  workDayRef = getWorkDayRef(),
  description = ""
) {
  const timerDescription = sanitizeTimerDescription(description);

  await addDoc(collection(workDayRef, "timeEntries"), {
    description: getGeneralTimerDisplayDescription(timerDescription),
    timerDescription: timerDescription || null,
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

function postLocalChangeMessage(text) {
  postLocalMessage(text, "Changelog (only you)", "change");
}

function postLocalTaskListMessage(heading, tasks, fallbackText, options = {}) {
  postLocalMessage(fallbackText, "Tasks (only you)", "task-list", [], {
    heading,
    tasks,
    maskIdentity: isPrivacyModeActive(),
    rolloverReview: Boolean(options.rolloverReview),
    rolloverDateKey: options.rolloverDateKey || "",
    plannedDateKey: options.plannedDateKey || "",
    showTodayPlanActions: Boolean(options.showTodayPlanActions),
    todayPlanInfo: options.todayPlanResetHint || "",
    privateAliases: options.privateAliases || null,
  });
}

async function attachTodayPlanState(tasks) {
  const todayKey = getTodayKey();
  const sourceDateKey = getPreviousDateKey(todayKey);
  const [todayWorkDay, sourceWorkDay] = await Promise.all([getWorkDay(todayKey), getWorkDay(sourceDateKey)]);
  const plannedTaskIds = new Set(normalizeIdList(todayWorkDay?.plannedTaskIds));
  const sourcePlannedTaskIds = new Set(normalizeIdList(sourceWorkDay?.plannedTaskIds));
  const skippedTaskIds = new Set(normalizeIdList(todayWorkDay?.rolloverSkippedTaskIds));

  return tasks.map((task) => ({
    ...task,
    plannedToday: plannedTaskIds.has(task.id),
    todayPlanResetNote:
      task.status !== "complete" &&
      sourcePlannedTaskIds.has(task.id) &&
      !plannedTaskIds.has(task.id) &&
      !skippedTaskIds.has(task.id)
        ? `Removed from today's plan after ${formatTaskPlanDate(sourceDateKey)} reset`
        : "",
  }));
}

async function buildTodayPlanResetHint() {
  const todayKey = getTodayKey();
  const sourceDateKey = getPreviousDateKey(todayKey);
  const sourceWorkDay = await getWorkDay(sourceDateKey);
  const todayWorkDay = await getWorkDay(todayKey);
  const sourcePlannedTaskIds = normalizeIdList(sourceWorkDay?.plannedTaskIds);

  if (sourcePlannedTaskIds.length === 0) {
    return "";
  }

  const todayPlannedTaskIds = new Set(normalizeIdList(todayWorkDay?.plannedTaskIds));
  const skippedTaskIds = new Set(normalizeIdList(todayWorkDay?.rolloverSkippedTaskIds));
  const resetTasks = (await loadTasksByIds(sourcePlannedTaskIds))
    .filter((task) => task.status !== "complete")
    .filter((task) => !todayPlannedTaskIds.has(task.id))
    .filter((task) => !skippedTaskIds.has(task.id));

  if (resetTasks.length === 0) {
    return "";
  }

  return `Yesterday's plan reset: ${resetTasks.length} unfinished task${resetTasks.length === 1 ? "" : "s"} no longer marked Today. Affected tasks are tagged below; use /task today review to carry them.`;
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

function postLocalTaskProcessMessage(task, remainingCount, comments = [], todayPlanResetHint = "") {
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
      label: task.plannedToday ? "Remove today" : "Plan today",
      action: task.plannedToday ? "task-day-remove-today" : "task-day-add-today",
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
      hint: [
        todayPlanResetHint,
        "Send /task process next to skip this task, or /task process stop to end the process.",
      ]
        .filter(Boolean)
        .join(" "),
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

function postLocalSelfReminderMessage(text, actions = [], extra = {}) {
  postLocalMessage(text, "Reminders (only you)", extra.type || "self-reminder", actions, extra);
}

function postLocalDebugMessage(text) {
  postLocalMessage(text, "Debug (only you)", "debug");
}

function postLocalPluginMessage(text) {
  postLocalMessage(text, "Plugins (only you)", "plugin");
}

function postLocalLeadMessage(text, actions = [], extra = {}) {
  postLocalMessage(text, "Leads (only you)", extra.type || "lead", actions, extra);
}

function postLocalTeamMessage(text, actions = [], extra = {}) {
  postLocalMessage(text, "Team (only you)", extra.type || "team", actions, extra);
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
  if (state.isRemoteSyncPaused || document.visibilityState !== "visible") {
    return;
  }

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

function scheduleSelfReminders() {
  clearSelfReminders();
  loadSelfReminders().forEach((reminder) => scheduleSelfReminder(reminder));
}

function scheduleSelfReminder(reminder) {
  clearSelfReminder(reminder.id);

  const reminderTime = getSelfReminderTime(reminder.reminderAt);

  if (!reminderTime) {
    return;
  }

  const delayMs = Math.max(0, reminderTime - Date.now());
  const timeoutId = window.setTimeout(() => {
    handleSelfReminderDue(reminder.id);
  }, delayMs);

  state.selfReminderTimeouts.set(reminder.id, { timeoutId });
}

function handleSelfReminderDue(reminderId) {
  state.selfReminderTimeouts.delete(reminderId);

  const reminders = loadSelfReminders();
  const reminder = reminders.find((item) => item.id === reminderId);

  if (!reminder) {
    return;
  }

  saveSelfReminders(reminders.filter((item) => item.id !== reminderId));
  postLocalSelfReminderMessage(`Reminder ${formatSelfReminderId(reminder.id)}: ${reminder.text}`);
  void showSelfReminderNotification(reminder);
  setStatus("Self reminder.", "success");
}

function clearSelfReminder(reminderId) {
  const reminder = state.selfReminderTimeouts.get(reminderId);

  if (!reminder?.timeoutId) {
    return;
  }

  window.clearTimeout(reminder.timeoutId);
  state.selfReminderTimeouts.delete(reminderId);
}

function clearSelfReminders() {
  state.selfReminderTimeouts.forEach((reminder) => {
    if (reminder?.timeoutId) {
      window.clearTimeout(reminder.timeoutId);
    }
  });
  state.selfReminderTimeouts.clear();
}

function loadSelfReminders() {
  const key = getSelfReminderStorageKey();

  if (!key) {
    return [];
  }

  try {
    const reminders = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(reminders)
      ? reminders.filter((reminder) => reminder?.id && reminder?.text && getSelfReminderTime(reminder.reminderAt) > 0)
      : [];
  } catch (error) {
    console.warn("Self reminders could not be loaded:", error);
    return [];
  }
}

function saveSelfReminders(reminders) {
  const key = getSelfReminderStorageKey();

  if (!key) {
    return;
  }

  try {
    localStorage.setItem(key, JSON.stringify(reminders));
  } catch (error) {
    console.warn("Self reminders could not be saved:", error);
  }
}

function getSelfReminderStorageKey() {
  if (!state.roomId || !state.profile?.id) {
    return "";
  }

  return `selfReminders:${state.roomId}:${state.profile.id}`;
}

function generateSelfReminderId() {
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

function formatSelfReminderId(reminderId) {
  const normalizedId = normalizeSelfReminderId(reminderId);
  return normalizedId ? `#${normalizedId.slice(0, 6)}` : "#reminder";
}

function normalizeSelfReminderId(reminderId) {
  return String(reminderId || "").trim().replace(/^#/, "").toLowerCase();
}

function compareSelfRemindersByReminderAt(left, right) {
  return getSelfReminderTime(left.reminderAt) - getSelfReminderTime(right.reminderAt);
}

function getSelfReminderTime(value) {
  if (value instanceof Date) {
    return value.getTime();
  }

  const time = Date.parse(String(value || ""));
  return Number.isFinite(time) ? time : 0;
}

function formatSelfReminderTime(value) {
  const time = getSelfReminderTime(value);

  if (!time) {
    return "unknown time";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(time));
}

function startTeamFollowupReminderSync() {
  if (state.isRemoteSyncPaused || document.visibilityState !== "visible") {
    return;
  }

  clearTeamFollowupReminderSync();
  void syncTeamFollowupReminders();

  state.teamFollowupReminderSyncIntervalId = window.setInterval(() => {
    void syncTeamFollowupReminders();
  }, QUERY_REMINDER_SYNC_MS);
}

async function syncTeamFollowupReminders() {
  if (!state.db || !state.roomId || !state.profile || !isRoomPluginEnabled(PLUGIN_TEAM)) {
    return;
  }

  try {
    const followups = await loadPendingTeamFollowups();
    const activeFollowupIds = new Set();

    followups.forEach((followup) => {
      activeFollowupIds.add(followup.id);

      if (!state.teamFollowupReminderTimeouts.has(followup.id)) {
        scheduleTeamFollowupReminder(followup);
      }
    });

    [...state.teamFollowupReminderTimeouts.keys()].forEach((followupId) => {
      if (!activeFollowupIds.has(followupId)) {
        clearTeamFollowupReminder(followupId);
      }
    });
  } catch (error) {
    console.error("Team followup reminder sync failed:", error);
  }
}

function scheduleTeamFollowupReminder(followup) {
  clearTeamFollowupReminder(followup.id);

  if (followup.status === "complete") {
    return;
  }

  const nextReminderTime = getTeamFollowupNextReminderTime(followup);
  const delayMs = Math.max(0, nextReminderTime - Date.now());
  const timeoutId = window.setTimeout(() => {
    void handleTeamFollowupReminder(followup.id);
  }, delayMs);

  state.teamFollowupReminderTimeouts.set(followup.id, { timeoutId });
}

async function handleTeamFollowupReminder(followupId) {
  state.teamFollowupReminderTimeouts.delete(followupId);

  const followup = await findTeamFollowupById(followupId);

  if (!followup || followup.status === "complete") {
    return;
  }

  const reminderCount = Number.isFinite(followup.reminderCount) ? followup.reminderCount : 0;
  const remindedAt = new Date();
  const remindedFollowup = {
    ...followup,
    lastReminderAt: remindedAt,
    reminderCount: reminderCount + 1,
  };

  await updateDoc(doc(state.db, "rooms", state.roomId, "followups", followup.id), {
    lastReminderAt: serverTimestamp(),
    reminderCount: reminderCount + 1,
    updatedAt: serverTimestamp(),
  });

  postLocalTeamMessage(
    `Team followup reminder\n${formatTeamFollowupId(followup.id)} for ${formatTeamFollowupTarget(followup)}: ${followup.text}\nMark done with /team followup done ${formatTeamFollowupId(followup.id)}.`,
    [],
    {
      type: "team-followup-list",
      heading: "Team followup reminder",
      followups: [serializeTeamFollowupForMessage(remindedFollowup)],
    }
  );
  void showTeamFollowupNotification(remindedFollowup);
  scheduleTeamFollowupReminder(remindedFollowup);
  setStatus("Team followup reminder.", "success");
}

function clearTeamFollowupReminder(followupId) {
  const reminder = state.teamFollowupReminderTimeouts.get(followupId);

  if (!reminder?.timeoutId) {
    return;
  }

  window.clearTimeout(reminder.timeoutId);
  state.teamFollowupReminderTimeouts.delete(followupId);
}

function clearTeamFollowupReminders() {
  state.teamFollowupReminderTimeouts.forEach((reminder) => {
    if (reminder?.timeoutId) {
      window.clearTimeout(reminder.timeoutId);
    }
  });
  state.teamFollowupReminderTimeouts.clear();
}

function clearTeamFollowupReminderSync() {
  if (!state.teamFollowupReminderSyncIntervalId) {
    return;
  }

  window.clearInterval(state.teamFollowupReminderSyncIntervalId);
  state.teamFollowupReminderSyncIntervalId = null;
}

function getTeamFollowupIntervalMs(followup) {
  return Number.isFinite(followup.reminderIntervalMs) && followup.reminderIntervalMs > 0
    ? followup.reminderIntervalMs
    : QUERY_REMINDER_MS;
}

function getTeamFollowupNextReminderTime(followup) {
  const lastReminderTime = getTimestampMillis(followup.lastReminderAt);

  if (lastReminderTime > 0) {
    return lastReminderTime + getTeamFollowupIntervalMs(followup);
  }

  const reminderTime = getTimestampMillis(followup.reminderAt);
  return reminderTime > 0 ? reminderTime : Date.now() + getTeamFollowupIntervalMs(followup);
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
  if (state.isRemoteSyncPaused || document.visibilityState !== "visible") {
    return;
  }

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

    const [activeOwnedTasks, activeGeneralTimer] = await Promise.all([
      loadCurrentUserActiveTaskTimers(),
      findActiveGeneralTimer(),
    ]);
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

  const elapsedMs = Math.max(
    0,
    Date.now() - getTimestampMillis(latestTask.activeTimerStartedAt || latestTask.startedAt)
  );

  postLocalTaskMessage(
    `Reminder: Task ${formatTaskId(latestTask.id)} has been running for ${formatDuration(elapsedMs)}: ${latestTask.description}`,
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
      {
        label: "Ask AI",
        action: "day-ai-coach",
        trigger: isFollowUp ? "repeated task timer reminder" : "task timer reminder",
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

  const elapsedMs = Math.max(
    0,
    Date.now() - getTimestampMillis(latestTimer.activeTimerStartedAt || latestTimer.startedAt)
  );

  postLocalTaskMessage(
    `Reminder: General timer has been running for ${formatDuration(elapsedMs)}.`,
    [
      {
        label: "Continue",
        action: "general-timer-continue",
      },
      {
        label: "Stop",
        action: "general-timer-stop",
      },
      {
        label: "Ask AI",
        action: "day-ai-coach",
        trigger: isFollowUp ? "repeated general timer reminder" : "general timer reminder",
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
    activeTimerDescription: null,
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
      activeTimerDescription: null,
      userId: state.profile.id,
      userName: getProfileDisplayName(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  if (elapsedMs > 0) {
    await recordGeneralTimeEntry(
      timer.activeTimerStartedAt || timer.startedAt,
      stoppedAt,
      elapsedMs,
      timer.ref || getWorkDayRef(),
      timer.timerDescription || timer.activeTimerDescription
    );
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
      description: getTaskTimerDisplayDescription(latestTask, task.timerDescription),
      startedAt: latestTask.activeTimerStartedAt || task.startedAt,
      activeTimerStartedAt: latestTask.activeTimerStartedAt,
      timerDescription: latestTask.activeTimerDescription || task.timerDescription || "",
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
      description: getGeneralTimerDisplayDescription(activeTimer.data.activeTimerDescription || timer.timerDescription),
      startedAt: activeTimer.data.activeTimerStartedAt || timer.startedAt,
      activeTimerStartedAt: activeTimer.data.activeTimerStartedAt,
      isGeneralTimer: true,
      timerDescription: activeTimer.data.activeTimerDescription || timer.timerDescription || "",
      activeTimerDescription: activeTimer.data.activeTimerDescription || timer.activeTimerDescription || "",
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

  if (document.hidden || !claimDayIdleTaskReminder()) {
    scheduleDayIdleTaskReminder();
    return;
  }

  try {
    const workDay = await getWorkDay();
    const shouldRemind = await shouldRemindForIdleWorkDay(workDay);

    if (!shouldRemind) {
      return;
    }

    const reminderCount = await recordDayIdleTaskReminder(workDay);

    postLocalDayMessage(
      `Reminder #${reminderCount}: Your day is started, but no timer is running.\nStart a general timer with /task start, start a task with /task start <id>, or create one with /task create <description>.`,
      [
        {
          label: "Ask AI",
          action: "day-ai-coach",
          trigger: "idle day reminder",
        },
      ]
    );
    scheduleDayIdleTaskReminder();
    setStatus("No task running reminder.", "success");
  } finally {
    releaseDayIdleTaskReminderClaim();
  }
}

async function shouldRemindForIdleWorkDay(workDay = null) {
  try {
    const currentWorkDay = workDay || (await getWorkDay());

    if (!currentWorkDay?.startedAt || currentWorkDay.endedAt) {
      return false;
    }

    if (currentWorkDay.activeBreakStartedAt) {
      return false;
    }

    if (await findActiveGeneralTimer()) {
      return false;
    }

    const activeTasks = await loadCurrentUserActiveTaskTimers();
    return activeTasks.length === 0;
  } catch (error) {
    console.error("Idle task reminder check failed:", error);
    return false;
  }
}

async function recordDayIdleTaskReminder(workDay) {
  const reminderCount = getDayIdleReminderCount(workDay) + 1;

  await setDoc(
    getWorkDayRef(),
    {
      userId: state.profile.id,
      userName: getProfileDisplayName(),
      dateKey: getTodayKey(),
      dayIdleReminderCount: increment(1),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  const updatedWorkDay = await getWorkDay();
  return getDayIdleReminderCount(updatedWorkDay) || reminderCount;
}

function getDayIdleReminderCount(workDay) {
  return Number.isFinite(workDay?.dayIdleReminderCount) ? workDay.dayIdleReminderCount : 0;
}

function claimDayIdleTaskReminder() {
  const key = getDayIdleTaskReminderLockKey();

  if (!key) {
    return true;
  }

  try {
    const now = Date.now();
    const existingClaim = JSON.parse(localStorage.getItem(key) || "null");

    if (
      existingClaim?.expiresAt > now &&
      existingClaim?.clientId &&
      existingClaim.clientId !== state.dayIdleTaskReminderClientId
    ) {
      return false;
    }

    localStorage.setItem(
      key,
      JSON.stringify({
        clientId: state.dayIdleTaskReminderClientId,
        expiresAt: now + DAY_IDLE_TASK_REMINDER_LOCK_MS,
      })
    );

    const savedClaim = JSON.parse(localStorage.getItem(key) || "null");
    return savedClaim?.clientId === state.dayIdleTaskReminderClientId;
  } catch (error) {
    console.warn("Day idle reminder lock failed:", error);
    return true;
  }
}

function releaseDayIdleTaskReminderClaim() {
  const key = getDayIdleTaskReminderLockKey();

  if (!key) {
    return;
  }

  try {
    const existingClaim = JSON.parse(localStorage.getItem(key) || "null");

    if (existingClaim?.clientId === state.dayIdleTaskReminderClientId) {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.warn("Day idle reminder unlock failed:", error);
  }
}

function getDayIdleTaskReminderLockKey() {
  if (!state.roomId || !state.profile?.id) {
    return "";
  }

  return `dayIdleTaskReminder:${state.roomId}:${state.profile.id}:${getTodayKey()}`;
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

function compareActiveTimerRecordsByStartedAt(left, right) {
  const leftTime = getTimestampMillis(left.startedAt);
  const rightTime = getTimestampMillis(right.startedAt);

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return String(left.task?.id || left.workDay?.id || "").localeCompare(
    String(right.task?.id || right.workDay?.id || "")
  );
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

function compareTeamMembersByName(left, right) {
  const nameCompare = String(left.name || "").localeCompare(String(right.name || ""));

  if (nameCompare !== 0) {
    return nameCompare;
  }

  return String(left.id || "").localeCompare(String(right.id || ""));
}

function compareTeamFollowupsByReminderAt(left, right) {
  const leftTime = getTimestampMillis(left.reminderAt);
  const rightTime = getTimestampMillis(right.reminderAt);

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return String(left.id || "").localeCompare(String(right.id || ""));
}

function formatChangeLogList(changes) {
  const lines = ["Recent changes:"];

  changes.forEach((change) => {
    lines.push(`- ${formatChangeLine(change)}`);
  });

  return lines.join("\n");
}

function formatChangeLogSummary(changes) {
  if (changes.length === 0) {
    return "Project changelog summary:\nNo changes logged yet.";
  }

  const labels = countChangeLabels(changes);
  const lines = [
    "Project changelog summary:",
    `Total changes: ${changes.length}`,
  ];

  if (labels.length > 0) {
    lines.push(`Labels: ${labels.map(([label, count]) => `#${label} (${count})`).join(", ")}`);
  }

  lines.push("", "Changes:");
  changes.slice(0, CHANGELOG_LIST_LIMIT).forEach((change) => {
    lines.push(`- ${formatChangeLine(change)}`);
  });

  if (changes.length > CHANGELOG_LIST_LIMIT) {
    lines.push(`- ...and ${changes.length - CHANGELOG_LIST_LIMIT} more.`);
  }

  return lines.join("\n");
}

function formatChangeLine(change) {
  const timestamp = formatTaskTimestamp(change.createdAt);
  const author = isPrivacyModeActive() ? "User" : change.createdByName || "Unknown";
  const labels = formatTaskLabels(change.labels);
  return `${formatChangeId(change.id)} ${change.text || "Untitled change"}${labels} (${author}${timestamp ? `, ${timestamp}` : ""})`;
}

function countChangeLabels(changes) {
  const counts = new Map();

  changes.forEach((change) => {
    (Array.isArray(change.labels) ? change.labels : []).forEach((label) => {
      counts.set(label, (counts.get(label) || 0) + 1);
    });
  });

  return [...counts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    return left[0].localeCompare(right[0]);
  });
}

function formatChangeId(changeId) {
  return `#${String(changeId || "").slice(0, 6)}`;
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
  messageInput.value = "/lead name phone: email: company: source: property: location: pricePerGaj: postedBy: notes:";
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

  messageInput.value = `/lead update ${formatLeadId(leadId)} status: owner: pricePerGaj: postedBy: notes:`;
  messageInput.focus();
  messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
  syncMessageMaskOverlay();
  handleMessageInputChange();
  setStatus("Update the lead fields and send when ready.", "success");
}

function draftTeamMemberUpdate(memberId) {
  if (!memberId) {
    return;
  }

  messageInput.value = `/team member update ${formatTeamMemberId(memberId)} role: designation: status:active notes:`;
  messageInput.focus();
  messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
  syncMessageMaskOverlay();
  handleMessageInputChange();
  setStatus("Update the team member fields and send when ready.", "success");
}

function draftTeamMemberFollowup(memberId) {
  if (!memberId) {
    return;
  }

  messageInput.value = `/team followup add ${formatTeamMemberId(memberId)} after 1d `;
  messageInput.focus();
  messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
  syncMessageMaskOverlay();
  handleMessageInputChange();
  setStatus("Write the followup and send when ready.", "success");
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

function formatTeamMemberId(memberId) {
  return `%${String(memberId || "").slice(0, 6)}`;
}

function formatTeamFollowupId(followupId) {
  return `!${String(followupId || "").slice(0, 6)}`;
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

function normalizeTeamMemberId(memberId) {
  return String(memberId || "")
    .trim()
    .replace(/^[%#@]/, "")
    .toLowerCase();
}

function normalizeTeamFollowupId(followupId) {
  return String(followupId || "")
    .trim()
    .replace(/^[!#]/, "")
    .toLowerCase();
}

function formatTeamMemberMessageText(member, action = "shared") {
  const actionText = action === "added" ? "added" : action === "updated" ? "updated" : "shared";
  const roleText = member.role ? `, ${member.role}` : "";
  const designationText = member.designation ? ` (${member.designation})` : "";
  return `Team member ${formatTeamMemberId(member.id)} ${actionText}: ${member.name || "Unnamed member"}${roleText}${designationText}`;
}

function formatTeamFollowupTarget(followup) {
  if (followup.memberName) {
    return followup.memberName;
  }

  if (followup.taskId) {
    return `Task ${formatTaskId(followup.taskId)}`;
  }

  return "Team";
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
    const aliasKey = getTaskCommentAliasKey(comment, index);

    if (aliases.has(aliasKey)) {
      return;
    }

    aliases.set(aliasKey, `Note ${index}`);
    index += 1;
  });

  return aliases;
}

function getTaskCommentAliasKey(comment, fallbackIndex = 0) {
  return comment.id || `${comment.createdBy || "comment"}-${fallbackIndex}`;
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
  if (options.maskIdentity) {
    return privateAliases?.get?.(getTaskCommentAliasKey(comment)) || "Note";
  }

  return formatTaskPersonName(comment.createdBy, comment.createdByName || "Unknown", privateAliases, options);
}

function formatTaskCommentText(comment, privateAliases = null, options = {}) {
  const text = comment.text || "";

  if (!options.maskIdentity) {
    return text;
  }

  const storedName = escapeRegExp(comment.createdByName || state.profile?.name || "");
  let noteText = text.replace(/^Response to Query\s+([^:]+?)\s+from\s+[^:]+:/i, "Response note for Query $1:");
  noteText = noteText.replace(/^Response to Query\s+([^:]+):/i, "Response note for Query $1:");

  if (storedName) {
    noteText = noteText.replace(new RegExp(`\\bfrom\\s+${storedName}:`, "gi"), "note:");
  }

  return noteText;
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
      parts.push(`running by ${owner}${task.activeTimerDescription ? ` - ${task.activeTimerDescription}` : ""}`);
    }
  }

  return parts.length > 0 ? ` [${parts.join(", ")}]` : "";
}

function getTaskTimerDisplayDescription(task, timerDescription = task?.activeTimerDescription || "") {
  const description = sanitizeTimerDescription(timerDescription);
  const taskDescription = task?.description || "Untitled task";

  return description ? `${taskDescription} - ${description}` : taskDescription;
}

function getGeneralTimerDisplayDescription(timerDescription = "") {
  const description = sanitizeTimerDescription(timerDescription);
  return description || "General work";
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

function getTimeEntryDurationMs(entry) {
  if (Number.isFinite(entry?.durationMs)) {
    return entry.durationMs;
  }

  const startedAt = getTimestampMillis(entry?.startedAt);
  const stoppedAt = getTimestampMillis(entry?.stoppedAt);
  return startedAt && stoppedAt ? Math.max(0, stoppedAt - startedAt) : 0;
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
  return formatTimeRange(breakEntry?.startedAt, breakEntry?.stoppedAt);
}

function formatTimeEntryRange(entry) {
  return formatTimeRange(entry?.startedAt, entry?.stoppedAt);
}

function formatTimeRange(startedAtValue, stoppedAtValue) {
  const startedAt = normalizeTimestampDate(startedAtValue);
  const stoppedAt = normalizeTimestampDate(stoppedAtValue);
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

function getDateBounds(dateKey) {
  const start = new Date(`${dateKey}T00:00:00`);
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

  if (normalizedValue === "yesterday") {
    const yesterday = new Date();
    yesterday.setHours(0, 0, 0, 0);
    yesterday.setDate(yesterday.getDate() - 1);
    return formatDateKey(yesterday);
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

async function exportChatMessages(input = "") {
  const parts = input.trim().split(/\s+/).filter(Boolean);
  const wantsSystemFile = parts[0]?.toLowerCase() === "file";
  const normalizedInput = wantsSystemFile ? (parts[1] || "10").toLowerCase() : input.trim().toLowerCase();
  const count =
    normalizedInput === "all"
      ? state.messages.length
      : Number.parseInt(normalizedInput || "10", 10);

  if (!Number.isInteger(count) || count <= 0) {
    setStatus("Use /export 10, /export all, /export file 10, or /export file all.", "error");
    return;
  }

  const messages = state.messages.slice(-Math.min(count, state.messages.length));

  if (messages.length === 0) {
    setStatus("No messages to export.", "error");
    return;
  }

  const exportedAt = new Date();
  const lines = [
    "OpenBox chat export",
    `Room: ${state.roomId || "unknown"}`,
    `Exported: ${formatExportTimestamp(exportedAt)}`,
    `Messages: ${messages.length}`,
    "",
    ...messages.map(formatMessageForExport),
    "",
  ].join("\n");

  if (wantsSystemFile) {
    try {
      const exportTarget = await writeExportToSystemFile(lines);
      setStatus(
        exportTarget === "file"
          ? `${messages.length} message${messages.length === 1 ? "" : "s"} written to export file.`
          : `${messages.length} message${messages.length === 1 ? "" : "s"} downloaded.`,
        "success"
      );
    } catch (error) {
      if (error?.name === "AbortError") {
        setStatus("Export canceled.", "error");
        return;
      }

      console.error("Export failed:", error);
      setStatus("Export failed. Check browser file permissions.", "error");
    }
    return;
  }

  downloadExportText(lines);
  setStatus(`${messages.length} message${messages.length === 1 ? "" : "s"} exported.`, "success");
}

async function writeExportToSystemFile(text) {
  if (!window.showSaveFilePicker) {
    downloadExportText(text);
    return "download";
  }

  if (!state.exportFileHandle) {
    state.exportFileHandle = await window.showSaveFilePicker({
      suggestedName: "openbox-chat-export.txt",
      types: [
        {
          description: "Text file",
          accept: { "text/plain": [".txt"] },
        },
      ],
    });
  }

  const writable = await state.exportFileHandle.createWritable();
  await writable.write(text);
  await writable.close();
  return "file";
}

function downloadExportText(text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "openbox-chat-export.txt";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatMessageForExport(message) {
  const timestamp = formatExportTimestamp(getMessageExportDate(message));
  const sender = message.senderName || "Anonymous";
  const text = getMessageExportText(message);
  return `[${timestamp}] ${sender}: ${text}`;
}

function getMessageExportText(message) {
  if (message.text) {
    return String(message.text).replace(/\r?\n/g, "\n  ");
  }

  if (message.audioDataUrl) {
    return `[voice message: ${message.audioMimeType || "audio"}]`;
  }

  return `[${message.type || "message"}]`;
}

function getMessageExportDate(message) {
  if (message.createdAt instanceof Date) {
    return message.createdAt;
  }

  return message.createdAt?.toDate?.() || new Date();
}

function formatExportTimestamp(date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatExportFilenameDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

function sanitizeExportFilename(value) {
  return String(value || "chat")
    .trim()
    .replace(/[^a-z0-9_-]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "chat";
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

  state.unsubscribeReadReceipts = trackedOnSnapshot(
    "readReceipts.live",
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

async function showSelfReminderNotification(reminder) {
  if (
    !state.isNotificationsEnabled ||
    typeof Notification === "undefined" ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  try {
    await showBrowserNotification("Self reminder", {
      body: reminder.text || "A reminder is due.",
      tag: `self-reminder-${state.roomId}-${reminder.id}`,
      renotify: true,
      badge: "./icons/icon-192.png",
      icon: "./icons/icon-192.png",
      data: {
        roomId: state.roomId,
        reminderId: reminder.id,
        notificationType: "self-reminder",
      },
    });
  } catch (error) {
    console.error("Self reminder notification failed:", error);
  }
}

async function showTeamFollowupNotification(followup) {
  if (
    !state.isNotificationsEnabled ||
    typeof Notification === "undefined" ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  try {
    await showBrowserNotification("Team followup", {
      body: `${formatTeamFollowupTarget(followup)}: ${followup.text || "A team followup is pending."}`,
      tag: `team-followup-${state.roomId}-${followup.id}`,
      renotify: true,
      badge: "./icons/icon-192.png",
      icon: "./icons/icon-192.png",
      data: {
        roomId: state.roomId,
        followupId: followup.id,
        notificationType: "team-followup",
      },
    });
  } catch (error) {
    console.error("Team followup notification failed:", error);
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

  let isRefreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (isRefreshing) {
      return;
    }

    isRefreshing = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((registration) => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) {
            return;
          }

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        return registration.update();
      })
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
        (message) => !hiddenIds.has(message.id) && (!isOwnMessage(message) || isPrivacyVisibleOwnMessage(message))
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

function isPrivacyVisibleOwnMessage(message) {
  return message.type === "task" && message.senderName === "Tasks";
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

  if (document.visibilityState === "hidden") {
    pauseRemoteSync();
    return;
  }

  if (document.visibilityState === "visible") {
    resumeRemoteSync();
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
  if (pluginName === PLUGIN_LEADS) {
    return "Leads";
  }

  if (pluginName === PLUGIN_TEAM) {
    return "Team";
  }

  return pluginName;
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
