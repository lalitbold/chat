export const DEFAULT_IDLE_THRESHOLD_MS = 60000;
export const DEFAULT_MERGE_GAP_MS = 120000;

// Keep a session open until input spans more than the merge window. Waiting
// for the next idle threshold lets a brief return remain part of the break.
export function observeIdle(tracker, sample, options = {}) {
  const threshold = options.idleThresholdMs ?? DEFAULT_IDLE_THRESHOLD_MS;
  const mergeGap = options.mergeGapMs ?? DEFAULT_MERGE_GAP_MS;
  const lastInputAt = sample.sampledAt - sample.idleMs;
  const previous = tracker.previous;
  const inputChanged = previous && lastInputAt > previous.lastInputAt + 50;
  const events = [];
  const start = (startedAt) => {
    tracker.current = { startedAt, returnedAt: null };
    events.push({ type: "start", startedAt });
  };

  // Recover a qualifying break that ended between two polls.
  if (!tracker.current && inputChanged && lastInputAt - previous.lastInputAt >= threshold) {
    start(previous.lastInputAt);
  }
  if (tracker.current && inputChanged && tracker.current.returnedAt === null) {
    tracker.current.returnedAt = lastInputAt;
  }
  if (tracker.current?.returnedAt != null && lastInputAt - tracker.current.returnedAt > mergeGap) {
    events.push({ type: "end", startedAt: tracker.current.startedAt, endedAt: tracker.current.returnedAt });
    tracker.current = null;
  }
  if (sample.idleMs >= threshold) {
    if (!tracker.current) start(lastInputAt);
    tracker.current.returnedAt = null;
  }
  tracker.previous = { ...sample, lastInputAt };
  return events;
}
