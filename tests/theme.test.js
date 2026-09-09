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

test('Original is the default theme for new and existing users', () => {
  assert.equal(defaultState().theme, 'original');
  assert.equal(mergeState({}).theme, 'original');
});

test('all supported themes survive storage merging', () => {
  for (const theme of ['original', 'arcade', 'editorial']) {
    assert.equal(mergeState({ theme }).theme, theme);
  }
});

test('unknown or corrupt theme values safely fall back to Original', () => {
  for (const value of ['neon', '', null, 42, {}, undefined]) {
    assert.equal(normalizeTheme(value), 'original');
  }
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
