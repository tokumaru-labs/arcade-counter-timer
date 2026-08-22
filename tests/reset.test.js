import test from 'node:test';
import assert from 'node:assert/strict';

import { defaultState, resetTimer, resetCount, resetSession } from '../src/storage.js';

const MINUTE = 60_000;
const at = (y, m, d, hh = 0, mm = 0, ss = 0) => new Date(y, m - 1, d, hh, mm, ss).getTime();

const NOW = at(2026, 7, 21, 10, 30, 0);

/** A running timer, a live count, and some existing statistics. */
function busyState() {
  return {
    ...defaultState(),
    timer: { running: true, sessionElapsedMs: 5 * MINUTE, runStartedAt: at(2026, 7, 21, 10, 0, 0) },
    sessionCount: 27,
    history: { '2026-07-20': { timeMs: 3 * MINUTE, count: 12 } }
  };
}

test('resetting the timer zeroes and stops it', () => {
  const next = resetTimer(busyState(), NOW);
  assert.deepEqual(next.timer, { running: false, sessionElapsedMs: 0, runStartedAt: null });
});

test('resetting the timer keeps the session count', () => {
  assert.equal(resetTimer(busyState(), NOW).sessionCount, 27);
});

test('resetting a running timer credits the elapsed run to the day history', () => {
  const next = resetTimer(busyState(), NOW);
  assert.equal(next.history['2026-07-21'].timeMs, 30 * MINUTE);
  assert.equal(next.history['2026-07-20'].timeMs, 3 * MINUTE);
});

test('resetting a stopped timer adds no time to the history', () => {
  const stopped = {
    ...busyState(),
    timer: { running: false, sessionElapsedMs: 5 * MINUTE, runStartedAt: null }
  };
  const next = resetTimer(stopped, NOW);
  assert.equal(next.history['2026-07-21'], undefined);
  assert.equal(next.timer.sessionElapsedMs, 0);
});

test('resetting the count zeroes it', () => {
  assert.equal(resetCount(busyState()).sessionCount, 0);
});

test('resetting the count leaves the timer running and untouched', () => {
  const next = resetCount(busyState());
  assert.deepEqual(next.timer, busyState().timer);
});

test('resetting the count never decrements the count statistics', () => {
  assert.equal(resetCount(busyState()).history['2026-07-20'].count, 12);
});

test('a session reset zeroes both the timer and the count', () => {
  const next = resetSession(busyState(), NOW);
  assert.equal(next.sessionCount, 0);
  assert.deepEqual(next.timer, { running: false, sessionElapsedMs: 0, runStartedAt: null });
});

test('no session-level reset discards history or settings', () => {
  const before = busyState();
  before.settings.sound = false;
  for (const next of [resetTimer(before, NOW), resetCount(before), resetSession(before, NOW)]) {
    assert.equal(next.history['2026-07-20'].count, 12);
    assert.equal(next.history['2026-07-20'].timeMs, 3 * MINUTE);
    assert.equal(next.settings.sound, false);
  }
});

test('only a full clear returns to the default empty state', () => {
  // clearAll() writes defaultState(); that shape is what carries no history.
  const fresh = defaultState();
  assert.deepEqual(fresh.history, {});
  assert.equal(fresh.sessionCount, 0);
  assert.deepEqual(fresh.timer, { running: false, sessionElapsedMs: 0, runStartedAt: null });
  assert.deepEqual(fresh.settings, {
    clock: false,
    sound: true,
    flyText: true,
    chainEffect: true,
    subtleCrt: true
  });
});

test('the reset transitions do not mutate the state they are given', () => {
  const before = busyState();
  resetTimer(before, NOW);
  resetCount(before);
  resetSession(before, NOW);
  assert.equal(before.sessionCount, 27);
  assert.equal(before.timer.running, true);
  assert.equal(before.history['2026-07-21'], undefined);
});
