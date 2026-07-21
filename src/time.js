// Pure date / duration / statistics helpers.
// No DOM, no chrome APIs — safe to import from node:test.

const MAX_HISTORY_DAYS = 400;

/** Clamp a possibly negative / bogus duration to a sane non-negative number. */
export function clampMs(ms) {
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return ms;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * HH:MM:SS. Hours are not capped at 2 digits: 100h+ renders as e.g. "184:20:11".
 */
export function formatDuration(ms) {
  const totalSeconds = Math.floor(clampMs(ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

/** 4921 -> "4,921" */
export function formatCount(n) {
  const value = Number.isFinite(n) ? Math.floor(n) : 0;
  return value.toLocaleString('en-US');
}

/** Local calendar day key, "YYYY-MM-DD". */
export function dayKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Next local midnight strictly after `date`.
 * Built from the Date constructor (not +24h) so DST shifts stay correct.
 */
export function nextLocalMidnight(date) {
  const d = date instanceof Date ? date : new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
}

/**
 * Split [startMs, endMs) into per-local-day segments.
 * Returns [] for empty or reversed intervals.
 */
export function splitIntervalByDay(startMs, endMs) {
  const segments = [];
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return segments;
  if (endMs <= startMs) return segments;

  let cursor = startMs;
  while (cursor < endMs) {
    const boundary = nextLocalMidnight(new Date(cursor)).getTime();
    const segmentEnd = Math.min(boundary, endMs);
    segments.push({ dayKey: dayKey(new Date(cursor)), ms: segmentEnd - cursor });
    cursor = segmentEnd;
  }
  return segments;
}

function ensureDay(history, key) {
  if (!history[key]) history[key] = { timeMs: 0, count: 0 };
  return history[key];
}

/** Add an elapsed interval to the day-history, splitting across midnights. */
export function addIntervalToHistory(history, startMs, endMs) {
  const next = { ...history };
  for (const segment of splitIntervalByDay(startMs, endMs)) {
    const day = { ...ensureDay(next, segment.dayKey) };
    day.timeMs += segment.ms;
    next[segment.dayKey] = day;
  }
  return next;
}

/** Add `delta` counts to a local day. */
export function addCountToHistory(history, date, delta = 1) {
  const key = dayKey(date);
  const next = { ...history };
  const day = { ...ensureDay(next, key) };
  day.count += delta;
  next[key] = day;
  return next;
}

/** Monday-based week containing `date`, as inclusive { start, end } day keys. */
export function weekRange(date) {
  const d = date instanceof Date ? date : new Date(date);
  const offset = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return { start: dayKey(monday), end: dayKey(sunday) };
}

function emptyTotals() {
  return { timeMs: 0, count: 0 };
}

function sumWhere(history, predicate) {
  const totals = emptyTotals();
  for (const [key, day] of Object.entries(history || {})) {
    if (!day || !predicate(key)) continue;
    totals.timeMs += clampMs(day.timeMs);
    totals.count += Number.isFinite(day.count) && day.count > 0 ? day.count : 0;
  }
  return totals;
}

/** Inclusive day-key range sum. Keys sort lexicographically as dates. */
export function sumRange(history, startKey, endKey) {
  return sumWhere(history, (key) => key >= startKey && key <= endKey);
}

export function sumPrefix(history, prefix) {
  return sumWhere(history, (key) => key.startsWith(prefix));
}

/** TODAY / WEEK / MONTH / YEAR totals derived solely from the day history. */
export function computeStats(history, date) {
  const d = date instanceof Date ? date : new Date(date);
  const today = dayKey(d);
  const week = weekRange(d);
  return {
    today: sumRange(history, today, today),
    week: sumRange(history, week.start, week.end),
    month: sumPrefix(history, `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`),
    year: sumPrefix(history, `${d.getFullYear()}`)
  };
}

/** Drop day entries older than `maxDays` before `date`. */
export function pruneHistory(history, date, maxDays = MAX_HISTORY_DAYS) {
  const d = date instanceof Date ? date : new Date(date);
  const cutoff = dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - maxDays));
  const next = {};
  for (const [key, day] of Object.entries(history || {})) {
    if (key >= cutoff) next[key] = day;
  }
  return next;
}

/**
 * Live elapsed time for a timer state, from stored timestamps.
 * Backwards clock jumps are clamped to 0 rather than stored as negatives.
 */
export function elapsedMs(timer, now = Date.now()) {
  const base = clampMs(timer && timer.sessionElapsedMs);
  if (!timer || !timer.running || !Number.isFinite(timer.runStartedAt)) return base;
  return base + clampMs(now - timer.runStartedAt);
}

/** Chain level for a session count: 10 -> 1, 20 -> 2 … 0 when not a multiple. */
export function chainLevel(sessionCount) {
  if (!Number.isFinite(sessionCount) || sessionCount <= 0) return 0;
  if (sessionCount % 10 !== 0) return 0;
  return Math.floor(sessionCount / 10);
}
