// chrome.storage.local access, defaults merging and session reset transitions.

import { addIntervalToHistory } from './time.js';

export const STATE_VERSION = 1;

export function defaultState() {
  return {
    stateVersion: STATE_VERSION,
    timer: {
      running: false,
      sessionElapsedMs: 0,
      runStartedAt: null
    },
    sessionCount: 0,
    history: {},
    settings: {
      clock: false,
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
    history,
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
    history: settleRun(state, now),
    timer: { running: false, sessionElapsedMs: 0, runStartedAt: null }
  };
}

/** Session count back to 0. Statistics are never decremented. */
export function resetCount(state) {
  return { ...state, sessionCount: 0 };
}

/** Both of the above, in one step. */
export function resetSession(state, now = Date.now()) {
  return resetCount(resetTimer(state, now));
}

const KEYS = ['stateVersion', 'timer', 'sessionCount', 'history', 'settings'];

export async function loadState() {
  const stored = await chrome.storage.local.get(KEYS);
  return mergeState(stored);
}

export async function saveState(state) {
  await chrome.storage.local.set({
    stateVersion: STATE_VERSION,
    timer: state.timer,
    sessionCount: state.sessionCount,
    history: state.history,
    settings: state.settings
  });
}

export async function clearAll() {
  await chrome.storage.local.clear();
  const fresh = defaultState();
  await saveState(fresh);
  return fresh;
}
