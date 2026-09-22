function timestampMs(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value === "string") return Date.parse(value);
  if (typeof value === "number") return value;
  if (Number.isFinite(value?.seconds)) return value.seconds * 1000 + (value.nanoseconds || 0) / 1e6;
  return NaN;
}

export function clipIdleSession(session, start, end) {
  const startedAt = timestampMs(session.startedAt);
  const lower = Number(start);
  const upper = Number(end);
  if (!Number.isFinite(startedAt)) return null;
  if (!session.endedAt) return startedAt >= lower && startedAt < upper ? session : null;
  const endedAt = timestampMs(session.endedAt);
  const clippedStart = Math.max(startedAt, lower);
  const clippedEnd = Math.min(endedAt, upper);
  if (!Number.isFinite(clippedEnd) || clippedEnd <= clippedStart) return null;
  return {
    ...session,
    startedAt: new Date(clippedStart),
    endedAt: new Date(clippedEnd),
    durationMs: clippedEnd - clippedStart,
  };
}

export function formatIdleDuration(durationMs) {
  const seconds = Math.max(0, Math.floor((Number(durationMs) || 0) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  return [hours ? `${hours}h` : "", minutes ? `${minutes}m` : "", `${seconds % 60}s`].filter(Boolean).join(" ");
}
