// chrome.storage.local access, defaults merging and session reset transitions.

import { addIntervalToHistory } from './time.js';

// Older writers must not leave a stale receipt behind after changing counts.
export const STATE_VERSION = 3;
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

function countReceipt(value, sessionCount, history) {
  if (!isPlainObject(value) || typeof value.id !== 'string' || !value.id ||
      typeof value.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.day) ||
      value.sessionCount !== sessionCount || sessionCount < 1 || !(history[value.day]?.count >= 1)) return null;
  return { id: value.id, day: value.day, sessionCount };
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
    countUndo: countReceipt(stored.countUndo, num(stored.sessionCount, 0), history),
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
  return mergeState(stored);
}

export async function saveState(state) {
  await chrome.storage.local.set({
    stateVersion: STATE_VERSION,
    timer: state.timer,
    sessionCount: state.sessionCount,
    countUndo: countReceipt(state.countUndo, state.sessionCount, state.history),
    history: state.history,
    theme: normalizeTheme(state.theme),
    settings: state.settings
  });
}

export async function clearAll() {
  await chrome.storage.local.clear();
  const fresh = defaultState();
  await saveState(fresh);
  return fresh;
}
