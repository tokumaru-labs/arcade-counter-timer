import { STATE_VERSION, defaultState, mergeState, normalizeTheme, resetTimer, resetCount, resetSession } from './storage.js';
import { addIntervalToHistory, addCountToHistory, clampMs } from './time.js';
import { RELEASE_VERSION, updateNotice } from './release.js';

export const STATE_KEYS = ['stateVersion', 'timer', 'sessionCount', 'history', 'theme', 'settings'];
export const DISPLAY_MODES = ['popup', 'floating', 'sidepanel'];
export function displayPreferences(value = {}) {
  return {
    mode: DISPLAY_MODES.includes(value?.mode) ? value.mode : 'popup',
    x: Number.isFinite(value?.x) ? Math.max(0, value.x) : 24,
    y: Number.isFinite(value?.y) ? Math.max(0, value.y) : 96,
    locked: value?.locked === true,
    compact: value?.compact !== false
  };
}

export function settle(state, now) {
  const timer = state.timer;
  if (!timer.running || !Number.isFinite(timer.runStartedAt)) return state;
  const delta = clampMs(now - timer.runStartedAt);
  return {
    ...state,
    history: addIntervalToHistory(state.history, Math.min(timer.runStartedAt, now), now),
    timer: { ...timer, sessionElapsedMs: timer.sessionElapsedMs + delta, runStartedAt: now }
  };
}

/** One writer, even when popup, side panel and several tabs are open together.
 * Reload storage inside every queued transaction: worker restarts are harmless.
 * No age-based pruning, no install-time reset and no writes on ordinary reads.
 */
export function createStore(storage, now = () => Date.now()) {
  let tail = Promise.resolve();
  function dispatch(message) {
    const result = tail.then(() => execute(message));
    tail = result.catch(() => {});
    return result;
  }
  async function execute(message) {
    const raw = await storage.get([...STATE_KEYS, 'displayPreferences', 'releaseNotice', 'upgradeBackupV020']);
    if (Number.isFinite(raw.stateVersion) && raw.stateVersion > STATE_VERSION) {
      throw new Error('Data belongs to a newer version. Update the extension before editing it.');
    }
    let state = mergeState(raw);
    let preferences = displayPreferences(raw.displayPreferences);
    const action = message?.action;
    const snapshot = () => ({ state, preferences });
    if (action === 'get') return snapshot();
    if (action === 'installed') {
      const notice = message.reason === 'update' ? updateNotice(message.previousVersion) : null;
      const patch = {};
      // Only a real version upgrade can schedule a notice; reloads and fresh
      // installs never show one. Preserve an already-pending or consumed notice.
      if (notice && raw.releaseNotice?.seenVersion !== notice.version && raw.releaseNotice?.pending?.version !== notice.version) {
        patch.releaseNotice = { ...raw.releaseNotice, pending: notice };
      }
      if (notice && raw.upgradeBackupV020 === undefined && STATE_KEYS.some((key) => key in raw)) {
        patch.upgradeBackupV020 = Object.fromEntries(STATE_KEYS.filter((key) => key in raw).map((key) => [key, raw[key]]));
      }
      if (Object.keys(patch).length) await storage.set(patch);
      return snapshot();
    }
    if (action === 'claimNotice') {
      const pending = raw.releaseNotice?.pending;
      if (!pending || pending.version !== RELEASE_VERSION || raw.releaseNotice?.seenVersion === pending.version) return null;
      await storage.set({ releaseNotice: { seenVersion: pending.version, pending: null } });
      return pending;
    }
    if (action === 'preferences') {
      const patch = message.value || {};
      if (patch.mode !== undefined && !DISPLAY_MODES.includes(patch.mode)) throw new Error('Unknown display mode.');
      preferences = displayPreferences({ ...preferences, ...patch });
      await storage.set({ displayPreferences: preferences });
      return snapshot();
    }
    if (action === 'clear') {
      state = defaultState();
      preferences = displayPreferences();
      // Retain only the one-time notice receipt; a reset must not replay ads.
      await storage.set({ ...state, displayPreferences: preferences, upgradeBackupV020: null });
      return snapshot();
    }
    state = settle(state, now());
    switch (action) {
      case 'toggle':
        state.timer = { ...state.timer, running: !state.timer.running, runStartedAt: state.timer.running ? null : now() };
        break;
      case 'count':
        state.sessionCount++;
        state.history = addCountToHistory(state.history, new Date(now()), 1);
        break;
      case 'resetTimer': state = resetTimer(state, now()); break;
      case 'resetCount': state = resetCount(state); break;
      case 'resetSession': state = resetSession(state, now()); break;
      case 'theme':
        if (normalizeTheme(message.value) !== message.value) throw new Error('Unknown theme.');
        state.theme = message.value;
        break;
      case 'setting':
        if (!Object.hasOwn(defaultState().settings, message.key) || typeof message.value !== 'boolean') throw new Error('Unknown setting.');
        state.settings[message.key] = message.value;
        break;
      default: throw new Error('Unknown operation.');
    }
    await storage.set(state);
    return snapshot();
  }
  return { dispatch };
}
