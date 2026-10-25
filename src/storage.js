// chrome.storage.local access, defaults merging and session reset transitions.

import { addIntervalToHistory } from './time.js';

// Older writers must not leave a stale receipt behind after changing counts.
export const STATE_VERSION = 4;
export const THEMES = Object.freeze(['space-age', 'arcade', 'editorial', 'steampunk', 'art-deco', 'nixie']);

export function normalizeTheme(value) {
  // Original's initial/default role moves to Space Age; no data is reset.
  return THEMES.includes(value) ? value : 'space-age';
}

export function defaultState() {
  return {
    stateVersion: STATE_VERSION,
    timer: {
      running: false,
      sessionElapsedMs: 0,
      runStartedAt: null
    },
    sessionCount: 0,
    countUndo: null,
    history: {},
    theme: 'space-age',
    settings: {
      clock: true,
      sound: true,
      flyText: true,
      chainEffect: true,
      subtleCrt: true
    }
  };
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function num(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function bool(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function validDay(day) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(`${day}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
}

function countReceipt(value, sessionCount, history, legacy = false) {
  if (!isPlainObject(value) || typeof value.id !== 'string' || !value.id ||
      !validDay(value.day) || value.sessionCount !== sessionCount ||
      !Number.isSafeInteger(sessionCount) || sessionCount < 1) return null;
  // Schema 3 only knew its last successful COUNT. Never infer older operations
  // from aggregate statistics. Schema 4 with missing/corrupt runs fails closed.
  const source = legacy ? [{ day: value.day, count: 1 }] : value.runs;
  if (!Array.isArray(source) || !source.length || source.at(-1)?.day !== value.day) return null;
  const runs = [], byDay = new Map();
  let total = 0;
  for (const run of source) {
    if (!isPlainObject(run) || !validDay(run.day) || !Number.isSafeInteger(run.count) || run.count < 1) return null;
    total += run.count;
    const dayTotal = (byDay.get(run.day) || 0) + run.count;
    if (!Number.isSafeInteger(total) || total > sessionCount || !(history[run.day]?.count >= dayTotal)) return null;
    byDay.set(run.day, dayTotal);
    runs.push({ day: run.day, count: run.count });
  }
  return { id: value.id, day: value.day, sessionCount, runs };
}

export function assertSupportedVersion(stored) {
  if (Number.isFinite(stored?.stateVersion) && stored.stateVersion > STATE_VERSION) {
    throw new Error('Data belongs to a newer version. Update the extension before editing it.');
  }
}

/** Merge a possibly missing / stale / corrupt stored blob onto the defaults. */
export function mergeState(stored) {
  const base = defaultState();
  if (!isPlainObject(stored)) return base;

  const timer = isPlainObject(stored.timer) ? stored.timer : {};
  const settings = isPlainObject(stored.settings) ? stored.settings : {};
  const running = bool(timer.running, false);
  const runStartedAt = Number.isFinite(timer.runStartedAt) ? timer.runStartedAt : null;

  const history = {};
  if (isPlainObject(stored.history)) {
    for (const [key, day] of Object.entries(stored.history)) {
      if (!isPlainObject(day)) continue;
      history[key] = {
        timeMs: num(day.timeMs, 0),
        count: num(day.count, 0)
      };
    }
  }

  return {
    stateVersion: STATE_VERSION,
    timer: {
      running: running && runStartedAt !== null,
      sessionElapsedMs: num(timer.sessionElapsedMs, 0),
      runStartedAt: running ? runStartedAt : null
    },
    sessionCount: num(stored.sessionCount, 0),
    countUndo: countReceipt(stored.countUndo, num(stored.sessionCount, 0), history, stored.stateVersion === 3),
    history,
    theme: normalizeTheme(stored.theme),
    settings: {
      clock: bool(settings.clock, base.settings.clock),
      sound: bool(settings.sound, base.settings.sound),
      flyText: bool(settings.flyText, base.settings.flyText),
      chainEffect: bool(settings.chainEffect, base.settings.chainEffect),
      subtleCrt: bool(settings.subtleCrt, base.settings.subtleCrt)
    }
  };
}

/* ----------------------------------------------------- reset transitions -- */
// Pure: they take a state and return a new one. History and settings are only
// ever discarded by clearAll().

/** Credit any in-flight run time to the day history before stopping the clock. */
function settleRun(state, now) {
  const timer = state.timer;
  if (!timer.running || !Number.isFinite(timer.runStartedAt)) return state.history;
  return addIntervalToHistory(state.history, Math.min(timer.runStartedAt, now), now);
}

/** Timer back to 00:00:00 and stopped. Session count is untouched. */
export function resetTimer(state, now = Date.now()) {
  return {
    ...state,
    countUndo: null,
    history: settleRun(state, now),
    timer: { running: false, sessionElapsedMs: 0, runStartedAt: null }
  };
}

/** Session count back to 0. Statistics are never decremented. */
export function resetCount(state) {
  return { ...state, sessionCount: 0, countUndo: null };
}

/** Both of the above, in one step. */
export function resetSession(state, now = Date.now()) {
  return resetCount(resetTimer(state, now));
}

const KEYS = ['stateVersion', 'timer', 'sessionCount', 'countUndo', 'history', 'theme', 'settings'];

export async function loadState() {
  const stored = await chrome.storage.local.get(KEYS);
  assertSupportedVersion(stored);
  return mergeState(stored);
}

export async function saveState(state) {
  assertSupportedVersion(state);
  assertSupportedVersion(await chrome.storage.local.get(['stateVersion']));
  await chrome.storage.local.set({
    stateVersion: STATE_VERSION,
    timer: state.timer,
    sessionCount: state.sessionCount,
    countUndo: countReceipt(state.countUndo, state.sessionCount, state.history, state.stateVersion === 3),
    history: state.history,
    theme: normalizeTheme(state.theme),
    settings: state.settings
  });
}

export async function clearAll() {
  assertSupportedVersion(await chrome.storage.local.get(['stateVersion']));
  await chrome.storage.local.clear();
  const fresh = defaultState();
  await saveState(fresh);
  return fresh;
}
