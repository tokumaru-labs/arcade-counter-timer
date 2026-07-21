// chrome.storage.local access with defaults merging.

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
      sound: bool(settings.sound, base.settings.sound),
      flyText: bool(settings.flyText, base.settings.flyText),
      chainEffect: bool(settings.chainEffect, base.settings.chainEffect),
      subtleCrt: bool(settings.subtleCrt, base.settings.subtleCrt)
    }
  };
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
