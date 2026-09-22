import test from "node:test";
import assert from "node:assert/strict";
import { observeIdle } from "./idle-tracker.mjs";
import { clipIdleSession, formatIdleDuration } from "../idle-time.js";
import { parseArgs, queueIdleSessionEvent, flushIdleWrites } from "./idle-helper.mjs";
import { runChatCommand } from "./chat-command.mjs";

function sample(tracker, seconds, lastInputSeconds, options) {
  return observeIdle(tracker, { sampledAt: seconds * 1000, idleMs: (seconds - lastInputSeconds) * 1000 }, options);
}

test("default policy counts one-minute breaks and merges two-minute activity", () => {
  const options = parseArgs([]);
  assert.equal(options.idleThresholdMs, 60000);
  assert.equal(options.mergeGapMs, 120000);
  assert.equal(options.pollMs, 5000);
  assert.equal(parseArgs(["--merge-gap-ms", "90000"]).mergeGapMs, 90000);
});

test("one-minute threshold includes the first minute", () => {
  const tracker = {};
  assert.deepEqual(sample(tracker, 59, 0), []);
  assert.deepEqual(sample(tracker, 60, 0), [{ type: "start", startedAt: 0 }]);
});

test("recovers a one-minute break ending between polls", () => {
  const tracker = {};
  sample(tracker, 58, 0);
  assert.deepEqual(sample(tracker, 63, 61), [{ type: "start", startedAt: 0 }]);
  assert.equal(tracker.current.returnedAt, 61000);
});

test("breaks shorter than one minute do not create sessions", () => {
  const tracker = {};
  sample(tracker, 50, 0);
  assert.deepEqual(sample(tracker, 55, 54), []);
  assert.equal(tracker.current, undefined);
});

test("activity gaps up to exactly two minutes remain one session", () => {
  for (const activitySeconds of [0, 30, 60, 90, 120]) {
    const tracker = {};
    sample(tracker, 60, 0);
    assert.deepEqual(sample(tracker, 300, 300), []);
    assert.deepEqual(sample(tracker, 300 + activitySeconds, 300 + activitySeconds), []);
    assert.deepEqual(sample(tracker, 360 + activitySeconds, 300 + activitySeconds), []);
    assert.equal(tracker.current.startedAt, 0);
    assert.equal(tracker.current.returnedAt, null);
    sample(tracker, 900, 900);
    assert.deepEqual(sample(tracker, 1021, 1021), [{ type: "end", startedAt: 0, endedAt: 900000 }]);
  }
});

test("sustained activity closes at the first return, excluding confirmation delay", () => {
  const tracker = {};
  sample(tracker, 60, 0);
  sample(tracker, 305, 302);
  assert.deepEqual(sample(tracker, 424, 423), [{ type: "end", startedAt: 0, endedAt: 302000 }]);
  assert.deepEqual(sample(tracker, 483, 423), [{ type: "start", startedAt: 423000 }]);
});

test("a delayed poll splits a long activity interval before starting another break", () => {
  const tracker = {};
  sample(tracker, 60, 0);
  sample(tracker, 300, 300);
  assert.deepEqual(sample(tracker, 550, 450), [
    { type: "end", startedAt: 0, endedAt: 300000 },
    { type: "start", startedAt: 450000 },
  ]);
});

test("small clock conversion jitter does not imply activity", () => {
  const tracker = {};
  sample(tracker, 60, 0);
  sample(tracker, 65, 0.002);
  assert.equal(tracker.current.returnedAt, null);
});

test("overnight sessions contribute only the selected day's portion", () => {
  const session = { id: "overnight", startedAt: "2026-09-21T21:48:00+05:30", endedAt: "2026-09-22T08:40:00+05:30", durationMs: 39120000 };
  const start = new Date("2026-09-22T00:00:00+05:30");
  const end = new Date("2026-09-23T00:00:00+05:30");
  const clipped = clipIdleSession(session, start, end);
  assert.equal(clipped.durationMs, (8 * 60 + 40) * 60000);
  assert.equal(clipped.startedAt.getTime(), start.getTime());
  assert.equal(session.durationMs, 39120000);
});

test("sessions spanning an entire day are included, boundary-only sessions excluded", () => {
  const start = new Date("2026-09-22T00:00:00Z");
  const end = new Date("2026-09-23T00:00:00Z");
  assert.equal(clipIdleSession({ startedAt: "2026-09-21T00:00:00Z", endedAt: "2026-09-24T00:00:00Z" }, start, end).durationMs, 86400000);
  assert.equal(clipIdleSession({ startedAt: "2026-09-21T23:00:00Z", endedAt: start }, start, end), null);
  assert.equal(clipIdleSession({ startedAt: end, endedAt: "2026-09-23T01:00:00Z" }, start, end), null);
});

test("clipping supports browser Firestore timestamps and terminal serialized timestamps", () => {
  const start = new Date("2026-09-22T00:00:00Z");
  const end = new Date("2026-09-23T00:00:00Z");
  for (const makeTimestamp of [ms => ({ toMillis: () => ms }), ms => ({ seconds: ms / 1000 })]) {
    const clipped = clipIdleSession({ startedAt: makeTimestamp(+start - 60000), endedAt: makeTimestamp(+start + 60000) }, start, end);
    assert.equal(clipped.durationMs, 60000);
  }
});

test("idle display retains seconds instead of rounding away minute differences", () => {
  assert.equal(formatIdleDuration(59999), "59s");
  assert.equal(formatIdleDuration(89999), "1m 29s");
  assert.equal(formatIdleDuration(905660), "15m 5s");
});

test("history and dated pending commands clip overnight records, undated pending retains full duration", async (t) => {
  const start = new Date("2026-09-22T00:00:00");
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => [{ document: {
      name: "projects/test/databases/(default)/documents/rooms/test/idleSessions/overnight",
      fields: {
        userName: { stringValue: "Lalit" },
        userId: { stringValue: "test-user" },
        decision: { stringValue: "pending" },
        startedAt: { timestampValue: new Date(+start - 132 * 60000).toISOString() },
        endedAt: { timestampValue: new Date(+start + 520 * 60000).toISOString() },
        durationMs: { integerValue: String(652 * 60000) },
      },
    } }],
  }));
  for (const commandText of ["/day idle 2026-09-22", "/day idle pending 2026-09-22", "/day idle pending"]) {
    const result = await runChatCommand({ commandText, roomId: "test", userName: "Lalit", auth: { idToken: "test-token", uid: "test-user" } });
    assert.match(result.text, commandText === "/day idle pending" ? /10h 52m 0s/ : /8h 40m 0s/);
  }
});

test("failed cloud writes retry the same session without losing the measured end", async (t) => {
  const state = {
    context: { userId: "test-user", roomId: "test-room", userName: "Test", token: "test-token" },
    pendingWrites: [], syncing: false, lastPresenceAt: Date.now(),
  };
  const now = new Date("2026-09-22T00:00:00Z");
  queueIdleSessionEvent(state, { type: "start", startedAt: +now }, now);
  queueIdleSessionEvent(state, { type: "end", startedAt: +now, endedAt: +now + 180000 }, now);
  const urls = [];
  let fail = true;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    urls.push(url);
    if (fail) throw new Error("offline");
    return { ok: true, json: async () => ({ name: state.pendingWrites[0].session.name, fields: JSON.parse(options.body).fields }) };
  });
  await flushIdleWrites(state);
  assert.equal(state.pendingWrites.length, 2);
  assert.equal(state.lastError, "offline");
  fail = false;
  await flushIdleWrites(state);
  assert.equal(urls[0], urls[1]);
  assert.equal(state.pendingWrites.length, 0);
  assert.equal(state.latestEndedSession.durationMs, 180000);
  assert.equal(state.latestEndedSession.endedAt, new Date(+now + 180000).toISOString());
  assert.equal(state.lastError, null);
});
