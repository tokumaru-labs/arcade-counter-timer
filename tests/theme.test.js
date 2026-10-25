import test from 'node:test';
import assert from 'node:assert/strict';

import {
  defaultState,
  loadState,
  mergeState,
  normalizeTheme,
  resetTimer,
  resetCount,
  resetSession,
  saveState
} from '../src/storage.js';
import { createStore } from '../src/controller.js';

const themes = ['space-age', 'arcade', 'editorial', 'steampunk', 'art-deco', 'nixie'];

test('Space Age replaces Original for fresh, existing and unspecified preferences', () => {
  assert.equal(defaultState().theme, 'space-age');
  assert.equal(mergeState({}).theme, 'space-age');
  assert.equal(mergeState({ theme: 'original' }).theme, 'space-age');
});

test('all supported themes survive storage merging', () => {
  for (const theme of themes) {
    assert.equal(mergeState({ theme }).theme, theme);
  }
});

test('unknown or corrupt theme values safely fall back to Space Age', () => {
  for (const value of ['neon', '', null, 42, {}, undefined]) {
    assert.equal(normalizeTheme(value), 'space-age');
  }
});

test('legacy Original migration and all six theme changes preserve history, settings and valid undo', async () => {
  const time = new Date(2026, 9, 25, 12).getTime();
  const data = { stateVersion: 3, theme: 'original', timer: { running: false, sessionElapsedMs: 9000, runStartedAt: null },
    sessionCount: 42, countUndo: { id: 'saved-count', day: '2026-10-24', sessionCount: 42 },
    history: { '2024-01-02': { count: 319, timeMs: 7200000 }, '2026-10-24': { count: 42, timeMs: 9000 } },
    settings: { clock: false, sound: false, flyText: false, chainEffect: false, subtleCrt: false } };
  let writes = 0;
  const store = createStore({
    async get(keys) { return structuredClone(Object.fromEntries(keys.filter((key) => key in data).map((key) => [key, data[key]]))); },
    async set(patch) { Object.assign(data, structuredClone(patch)); writes++; }
  }, () => time);
  const first = (await store.dispatch({ action: 'get' })).state;
  assert.equal(first.theme, 'space-age');
  assert.equal(writes, 0, 'reading migrates presentation without rewriting saved history');
  for (const theme of themes) {
    const result = (await store.dispatch({ action: 'theme', value: theme })).state;
    assert.equal(result.theme, theme);
    for (const key of ['timer', 'sessionCount', 'countUndo', 'history', 'settings']) assert.deepEqual(result[key], first[key]);
  }
  assert.equal((await store.dispatch({ action: 'undoCount', receiptId: 'saved-count' })).undone, true);
  assert.equal(data.sessionCount, 41);
  assert.equal(data.history['2026-10-24'].count, 41);
});

test('timer, count and session resets preserve the selected theme', () => {
  const state = { ...defaultState(), theme: 'editorial' };
  assert.equal(resetTimer(state).theme, 'editorial');
  assert.equal(resetCount(state).theme, 'editorial');
  assert.equal(resetSession(state).theme, 'editorial');
});

test('the selected theme round-trips through chrome.storage.local', async () => {
  const stored = {};
  globalThis.chrome = {
    storage: {
      local: {
        async get(keys) {
          return Object.fromEntries(keys.filter((key) => key in stored).map((key) => [key, stored[key]]));
        },
        async set(values) {
          Object.assign(stored, values);
        }
      }
    }
  };

  try {
    await saveState({ ...defaultState(), theme: 'arcade' });
    assert.equal(stored.theme, 'arcade');
    assert.equal((await loadState()).theme, 'arcade');
  } finally {
    delete globalThis.chrome;
  }
});
