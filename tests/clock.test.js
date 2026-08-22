import test from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';

import { clockFrame, createClockController, formatClockTime } from '../src/clock.js';
import { defaultState, loadState, mergeState, saveState } from '../src/storage.js';

function fakeScheduler() {
  let nextId = 1;
  const active = new Map();
  return {
    active,
    setIntervalFn(callback, delay) {
      const id = nextId++;
      active.set(id, { callback, delay });
      return id;
    },
    clearIntervalFn(id) {
      active.delete(id);
    }
  };
}

test('default clock state is OFF and stale states inherit OFF', () => {
  assert.equal(defaultState().settings.clock, false);
  assert.equal(mergeState({ settings: { sound: false } }).settings.clock, false);
});

test('formats local system time as 24-hour HH:MM:SS', () => {
  assert.equal(formatClockTime(new Date(2026, 7, 22, 0, 5, 9)), '00:05:09');
  assert.equal(formatClockTime(new Date(2026, 7, 22, 23, 59, 58)), '23:59:58');
});

test('classifies adjacent second, minute and hour transitions', () => {
  const second = clockFrame(new Date(2026, 7, 22, 12, 34, 59), clockFrame(new Date(2026, 7, 22, 12, 34, 58)));
  const minute = clockFrame(new Date(2026, 7, 22, 12, 35, 0), second);
  const beforeHour = clockFrame(new Date(2026, 7, 22, 12, 59, 59));
  const hour = clockFrame(new Date(2026, 7, 22, 13, 0, 0), beforeHour);

  assert.equal(second.motion, 'second');
  assert.equal(minute.motion, 'minute');
  assert.equal(hour.motion, 'hour');
});

test('midnight is an hour transition without a replay queue', () => {
  const before = clockFrame(new Date(2026, 7, 22, 23, 59, 59));
  const after = clockFrame(new Date(2026, 7, 23, 0, 0, 0), before);
  assert.equal(after.text, '00:00:00');
  assert.equal(after.motion, 'hour');
});

test('OFF hides the clock and schedules no updates', () => {
  const scheduler = fakeScheduler();
  const rendered = [];
  const visibility = [];
  const clock = createClockController({
    render: (frame) => rendered.push(frame),
    setVisible: (visible) => visibility.push(visible),
    ...scheduler
  });

  clock.setEnabled(false);

  assert.deepEqual(visibility, [false]);
  assert.deepEqual(rendered, []);
  assert.equal(scheduler.active.size, 0);
});

test('ON shows and immediately renders the digital clock', () => {
  const scheduler = fakeScheduler();
  const rendered = [];
  const visibility = [];
  const now = new Date(2026, 7, 22, 14, 3, 7);
  const clock = createClockController({
    render: (value) => rendered.push(value),
    setVisible: (visible) => visibility.push(visible),
    now: () => now,
    ...scheduler
  });

  clock.setEnabled(true);

  assert.deepEqual(visibility, [true]);
  assert.deepEqual(rendered.map(({ text }) => text), ['14:03:07']);
  assert.equal(rendered[0].motion, 'none');
  assert.equal(scheduler.active.size, 1);
  assert.equal([...scheduler.active.values()][0].delay, 1000);
});

test('the clock setting round-trips through the existing storage state', async () => {
  const stored = {};
  const previousChrome = globalThis.chrome;
  globalThis.chrome = {
    storage: {
      local: {
        async get(keys) {
          return Object.fromEntries(keys.filter((key) => key in stored).map((key) => [key, stored[key]]));
        },
        async set(value) {
          Object.assign(stored, value);
        }
      }
    }
  };

  try {
    const state = defaultState();
    state.settings.clock = true;
    await saveState(state);
    assert.equal((await loadState()).settings.clock, true);
  } finally {
    if (previousChrome === undefined) delete globalThis.chrome;
    else globalThis.chrome = previousChrome;
  }
});

test('a delayed callback resynchronises from Date instead of accumulated ticks', () => {
  const scheduler = fakeScheduler();
  const rendered = [];
  let systemNow = new Date(2026, 7, 22, 12, 0, 1);
  const clock = createClockController({
    render: (frame) => rendered.push(frame),
    now: () => systemNow,
    ...scheduler
  });

  clock.setEnabled(true);
  systemNow = new Date(2026, 7, 22, 12, 47, 33);
  [...scheduler.active.values()][0].callback();

  assert.deepEqual(rendered.map(({ text }) => text), ['12:00:01', '12:47:33']);
  assert.deepEqual(rendered.map(({ motion }) => motion), ['none', 'resync']);

  systemNow = new Date(2026, 7, 22, 12, 47, 34);
  [...scheduler.active.values()][0].callback();
  assert.equal(rendered.at(-1).motion, 'second');
});

test('ON/OFF/ON owns at most one interval and dispose cleans it up', () => {
  const scheduler = fakeScheduler();
  const visibility = [];
  const rendered = [];
  const clock = createClockController({
    render: (frame) => rendered.push(frame),
    setVisible: (visible) => visibility.push(visible),
    ...scheduler
  });

  clock.setEnabled(true);
  clock.setEnabled(true);
  assert.equal(scheduler.active.size, 1);
  assert.equal(rendered.at(-1).motion, 'none');

  clock.setEnabled(false);
  assert.equal(scheduler.active.size, 0);

  clock.setEnabled(true);
  assert.equal(scheduler.active.size, 1);

  clock.dispose();
  assert.equal(scheduler.active.size, 0);
  assert.equal(visibility.at(-1), false);
});

test('clock motion CSS is finite, restrained and reduced-motion safe', () => {
  const css = readFileSync(new URL('../popup.css', import.meta.url), 'utf8');

  assert.match(css, /clock-second-change 90ms/);
  assert.match(css, /clock-minute-change 160ms/);
  assert.match(css, /clock-hour-panel 300ms/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.clock__second\.is-second-change[\s\S]*animation: none/);
  assert.doesNotMatch(css, /clock-[\w-]+[^;{}]*infinite/i);
});
