import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatDuration,
  formatCount,
  dayKey,
  nextLocalMidnight,
  splitIntervalByDay,
  addIntervalToHistory,
  addCountToHistory,
  weekRange,
  computeStats,
  pruneHistory,
  clampMs,
  elapsedMs,
  chainLevel
} from '../src/time.js';

const HOUR = 3600_000;
const MINUTE = 60_000;
const SECOND = 1000;

/** Local-time helper so the tests are timezone-independent. */
const at = (y, m, d, hh = 0, mm = 0, ss = 0) => new Date(y, m - 1, d, hh, mm, ss).getTime();

/* ------------------------------------------------------------ formatting -- */

test('formats a duration as HH:MM:SS', () => {
  assert.equal(formatDuration(0), '00:00:00');
  assert.equal(formatDuration(9 * SECOND), '00:00:09');
  assert.equal(formatDuration(HOUR + 42 * MINUTE + 18 * SECOND), '01:42:18');
  assert.equal(formatDuration(HOUR - 1), '00:59:59');
});

test('formats durations beyond 100 hours without breaking digits', () => {
  assert.equal(formatDuration(184 * HOUR + 20 * MINUTE + 11 * SECOND), '184:20:11');
  assert.equal(formatDuration(1000 * HOUR), '1000:00:00');
});

test('formats counts with thousands separators', () => {
  assert.equal(formatCount(38), '38');
  assert.equal(formatCount(4921), '4,921');
});

/* --------------------------------------------------------------- clamping -- */

test('clamps negative and non-finite durations to zero', () => {
  assert.equal(clampMs(-5000), 0);
  assert.equal(clampMs(NaN), 0);
  assert.equal(clampMs(undefined), 0);
  assert.equal(clampMs(1234), 1234);
});

test('a backwards system clock yields zero extra elapsed time', () => {
  const timer = { running: true, sessionElapsedMs: 5000, runStartedAt: at(2026, 7, 21, 12, 0, 0) };
  const past = at(2026, 7, 21, 11, 0, 0);
  assert.equal(elapsedMs(timer, past), 5000);
  assert.equal(elapsedMs(timer, timer.runStartedAt + 2000), 7000);
  assert.equal(elapsedMs({ running: false, sessionElapsedMs: 5000, runStartedAt: null }), 5000);
});

/* ----------------------------------------------------------- day helpers -- */

test('next local midnight comes from the Date constructor, not +24h', () => {
  const midnight = nextLocalMidnight(new Date(at(2026, 7, 21, 23, 59, 50)));
  assert.equal(dayKey(midnight), '2026-07-22');
  assert.equal(midnight.getHours(), 0);
  assert.equal(midnight.getMinutes(), 0);
  assert.equal(midnight.getSeconds(), 0);
});

/* ----------------------------------------------------- interval splitting -- */

test('an interval inside one day stays on that day', () => {
  const segments = splitIntervalByDay(at(2026, 7, 21, 9, 0, 0), at(2026, 7, 21, 10, 30, 0));
  assert.deepEqual(segments, [{ dayKey: '2026-07-21', ms: 90 * MINUTE }]);
});

test('an interval crossing midnight splits across the two days', () => {
  const segments = splitIntervalByDay(at(2026, 7, 21, 23, 59, 50), at(2026, 7, 22, 0, 0, 20));
  assert.deepEqual(segments, [
    { dayKey: '2026-07-21', ms: 10 * SECOND },
    { dayKey: '2026-07-22', ms: 20 * SECOND }
  ]);
});

test('an interval crossing a month boundary splits across months', () => {
  const segments = splitIntervalByDay(at(2026, 7, 31, 23, 30, 0), at(2026, 8, 1, 0, 30, 0));
  assert.deepEqual(segments, [
    { dayKey: '2026-07-31', ms: 30 * MINUTE },
    { dayKey: '2026-08-01', ms: 30 * MINUTE }
  ]);

  const history = addIntervalToHistory({}, at(2026, 7, 31, 23, 30, 0), at(2026, 8, 1, 0, 30, 0));
  assert.equal(history['2026-07-31'].timeMs, 30 * MINUTE);
  assert.equal(history['2026-08-01'].timeMs, 30 * MINUTE);
});

test('an interval crossing a year boundary splits across years', () => {
  const segments = splitIntervalByDay(at(2026, 12, 31, 23, 45, 0), at(2027, 1, 1, 0, 15, 0));
  assert.deepEqual(segments, [
    { dayKey: '2026-12-31', ms: 15 * MINUTE },
    { dayKey: '2027-01-01', ms: 15 * MINUTE }
  ]);
});

test('a multi-day interval fills whole days in between', () => {
  const segments = splitIntervalByDay(at(2026, 7, 20, 22, 0, 0), at(2026, 7, 22, 2, 0, 0));
  assert.equal(segments.length, 3);
  assert.deepEqual(segments.map((s) => s.dayKey), ['2026-07-20', '2026-07-21', '2026-07-22']);
  assert.equal(segments[1].ms, 24 * HOUR);
});

test('empty and reversed intervals produce no segments', () => {
  assert.deepEqual(splitIntervalByDay(at(2026, 7, 21, 9), at(2026, 7, 21, 9)), []);
  assert.deepEqual(splitIntervalByDay(at(2026, 7, 21, 10), at(2026, 7, 21, 9)), []);
});

/* ------------------------------------------------------------ week range -- */

test('the week runs Monday to Sunday around the given day', () => {
  // 2026-07-21 is a Tuesday.
  assert.deepEqual(weekRange(new Date(at(2026, 7, 21, 12))), {
    start: '2026-07-20',
    end: '2026-07-26'
  });
  // Monday itself starts its own week.
  assert.deepEqual(weekRange(new Date(at(2026, 7, 20, 0, 1))), {
    start: '2026-07-20',
    end: '2026-07-26'
  });
  // Sunday belongs to the week that began the previous Monday.
  assert.deepEqual(weekRange(new Date(at(2026, 7, 26, 23, 30))), {
    start: '2026-07-20',
    end: '2026-07-26'
  });
});

/* ------------------------------------------------------------ aggregates -- */

const history = {
  '2025-12-31': { timeMs: 5 * HOUR, count: 500 }, // previous year
  '2026-06-15': { timeMs: 9 * HOUR, count: 300 }, // this year, other month
  '2026-07-19': { timeMs: 2 * HOUR, count: 40 }, // Sunday of the previous week
  '2026-07-20': { timeMs: 3 * HOUR, count: 60 }, // Monday of this week
  '2026-07-21': { timeMs: HOUR + 42 * MINUTE + 18 * SECOND, count: 38 }, // today
  '2026-07-26': { timeMs: HOUR, count: 10 } // Sunday of this week
};

const NOW = new Date(at(2026, 7, 21, 15, 0, 0));

test('TODAY totals only the current local day', () => {
  const { today } = computeStats(history, NOW);
  assert.equal(formatDuration(today.timeMs), '01:42:18');
  assert.equal(today.count, 38);
});

test('WEEK totals the Monday-to-Sunday week containing today', () => {
  const { week } = computeStats(history, NOW);
  assert.equal(week.timeMs, 3 * HOUR + HOUR + 42 * MINUTE + 18 * SECOND + HOUR);
  assert.equal(week.count, 60 + 38 + 10);
});

test('MONTH totals the current local year-month', () => {
  const { month } = computeStats(history, NOW);
  assert.equal(month.timeMs, 2 * HOUR + 3 * HOUR + HOUR + 42 * MINUTE + 18 * SECOND + HOUR);
  assert.equal(month.count, 40 + 60 + 38 + 10);
});

test('YEAR totals the current local year only', () => {
  const { year } = computeStats(history, NOW);
  assert.equal(year.count, 300 + 40 + 60 + 38 + 10);
  assert.equal(year.timeMs, 9 * HOUR + 2 * HOUR + 3 * HOUR + HOUR + 42 * MINUTE + 18 * SECOND + HOUR);
});

test('stats stay at zero for an empty history', () => {
  const stats = computeStats({}, NOW);
  for (const key of ['today', 'week', 'month', 'year']) {
    assert.deepEqual(stats[key], { timeMs: 0, count: 0 });
  }
});

/* -------------------------------------------------------------- counting -- */

test('each count increments exactly one local day', () => {
  let h = addCountToHistory({}, new Date(at(2026, 7, 21, 23, 59, 59)));
  h = addCountToHistory(h, new Date(at(2026, 7, 22, 0, 0, 1)));
  h = addCountToHistory(h, new Date(at(2026, 7, 22, 0, 0, 2)));
  assert.equal(h['2026-07-21'].count, 1);
  assert.equal(h['2026-07-22'].count, 2);
  assert.equal(h['2026-07-22'].timeMs, 0);
});

/* --------------------------------------------------------------- pruning -- */

test('history older than the retention window is dropped', () => {
  const old = dayKey(new Date(at(2026, 7, 21) - 500 * 24 * HOUR));
  const kept = dayKey(new Date(at(2026, 7, 21) - 100 * 24 * HOUR));
  const pruned = pruneHistory({ [old]: { timeMs: 1, count: 1 }, [kept]: { timeMs: 2, count: 2 } }, NOW);
  assert.equal(pruned[old], undefined);
  assert.ok(pruned[kept]);
});

/* ----------------------------------------------------------------- chain -- */

test('chain level fires only on multiples of ten', () => {
  assert.equal(chainLevel(9), 0);
  assert.equal(chainLevel(10), 1);
  assert.equal(chainLevel(20), 2);
  assert.equal(chainLevel(100), 10);
  assert.equal(chainLevel(0), 0);
});
