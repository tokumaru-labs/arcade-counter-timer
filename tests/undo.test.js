import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/controller.js';
import { computeStats, dayKey } from '../src/time.js';
import { loadState, saveState, clearAll, defaultState } from '../src/storage.js';

function fixture(seed = {}, start = new Date(2026, 8, 22, 12).getTime()) {
  let data = structuredClone(seed), time = start, fail = false, writes = 0;
  const storage = {
    async get(keys) { return structuredClone(Object.fromEntries(keys.filter((key) => key in data).map((key) => [key, data[key]]))); },
    async set(patch) { if (fail) throw new Error('disk full'); writes++; Object.assign(data, structuredClone(patch)); }
  };
  return { store: createStore(storage, () => time), storage, data: () => structuredClone(data),
    now: () => time, advance: (ms) => { time += ms; }, fail: (value) => { fail = value; }, writes: () => writes };
}
const undo = (store, receipt) => store.dispatch({ action: 'undoCount', receiptId: receipt?.id });
const count = async (store) => (await store.dispatch({ action: 'count' })).state.countUndo;

test('each undo head authorizes exactly one correction of session and statistics', async () => {
  const f = fixture({ sessionCount: 8, history: { '2026-09-22': { count: 17, timeMs: 1234 } } });
  const receipt = await count(f.store);
  assert.ok(receipt?.id);
  assert.equal(f.data().sessionCount, 9);
  assert.equal(f.data().history['2026-09-22'].count, 18);
  assert.equal((await undo(f.store, receipt)).undone, true);
  assert.equal(f.data().sessionCount, 8);
  assert.deepEqual(f.data().history['2026-09-22'], { count: 17, timeMs: 1234 });
  assert.equal(f.data().countUndo, null);
  for (const totals of Object.values(computeStats(f.data().history, f.now()))) assert.equal(totals.count, 17);
  const writes = f.writes();
  assert.equal((await undo(f.store, receipt)).undone, false);
  assert.equal(f.writes(), writes, 'replaying an undo does not write');
});

test('two views cannot undo twice or replay a formerly visible head after popping back to it', async () => {
  const f = fixture();
  const first = await count(f.store), second = await count(f.store);
  assert.notEqual(first.id, second.id, 'same-millisecond counts still have unique receipts');
  assert.equal((await undo(f.store, first)).undone, false);
  const results = await Promise.all([undo(f.store, second), undo(f.store, second)]);
  assert.equal(results.filter((result) => result.undone).length, 1);
  assert.equal(f.data().sessionCount, 1);
  assert.ok(f.data().countUndo, 'the first count remains undoable with a fresh head');
  assert.notEqual(f.data().countUndo.id, first.id);
  assert.equal((await undo(f.store, first)).undone, false, 'older receipts never become available again');
  const third = await count(f.store);
  assert.equal((await undo(f.store, second)).undone, false);
  assert.equal(f.data().countUndo.id, third.id);
  assert.equal(f.data().sessionCount, 2);
});

test('1500 durable counts compress by consecutive day and can all be undone after restarts', async () => {
  const f = fixture();
  for (let i = 0; i < 1500; i++) await count(f.store);
  assert.deepEqual(f.data().countUndo.runs, [{ day: '2026-09-22', count: 1500 }]);
  assert.ok(JSON.stringify(f.data().countUndo).length < 250, 'storage grows by day runs, not each count');
  for (let i = 1500; i > 0; i--) {
    const restarted = createStore(f.storage, f.now);
    const head = (await restarted.dispatch({ action: 'get' })).state.countUndo;
    assert.equal((await undo(restarted, head)).undone, true);
    assert.equal(f.data().sessionCount, i - 1);
  }
  assert.equal(f.data().countUndo, null);
  assert.equal(f.data().history['2026-09-22'].count, 0);
});

test('deep undo crosses year and month boundaries, retains time, and branches from remaining counts', async () => {
  const f = fixture({}, new Date(2026, 11, 31, 23, 59, 58).getTime());
  await count(f.store); await count(f.store);
  f.advance(3000); await count(f.store); await count(f.store);
  const stale = f.data().countUndo;
  await undo(f.store, stale);
  await undo(f.store, f.data().countUndo);
  assert.equal(f.data().history['2027-01-01'].count, 0);
  assert.deepEqual(f.data().countUndo.runs, [{ day: '2026-12-31', count: 2 }]);
  await count(f.store);
  assert.equal((await undo(f.store, stale)).undone, false);
  for (let i = 0; i < 3; i++) await undo(f.store, f.data().countUndo);
  assert.equal(f.data().sessionCount, 0);
  assert.equal(f.data().history['2026-12-31'].count, 0);
  assert.equal(f.data().history['2027-01-01'].count, 0);
});

test('schema 3 receipt migrates only its recorded count and survives the first new count', async () => {
  const original = { id: 'legacy', day: '2026-09-21', sessionCount: 20 };
  const f = fixture({ stateVersion: 3, sessionCount: 20, countUndo: original,
    history: { '2026-09-21': { count: 20, timeMs: 4000 } } });
  assert.deepEqual((await f.store.dispatch({ action: 'get' })).state.countUndo.runs, [{ day: original.day, count: 1 }]);
  assert.equal(f.writes(), 0, 'read-only migration does not write');
  await count(f.store);
  await undo(f.store, f.data().countUndo);
  await undo(f.store, f.data().countUndo);
  assert.equal(f.data().sessionCount, 19);
  assert.equal(f.data().stateVersion, 4);
  assert.equal(f.data().countUndo, null, 'older 19 operations are not invented');
  assert.deepEqual(f.data().history[original.day], { count: 19, timeMs: 4000 });
});

test('failed deep undo preserves all remaining runs and head for retry', async () => {
  const f = fixture();
  await count(f.store); await count(f.store); await count(f.store);
  await undo(f.store, f.data().countUndo);
  const before = f.data();
  f.fail(true);
  await assert.rejects(undo(f.store, before.countUndo), /disk full/);
  assert.deepEqual(f.data(), before);
  f.fail(false);
  assert.equal((await undo(createStore(f.storage, f.now), before.countUndo)).undone, true);
  assert.ok(f.data().countUndo, 'one earlier count still available');
  assert.equal(f.data().sessionCount, 1);
});

test('schema 4 rejects corrupt or overdrawn runs without subtracting or inventing counts', async () => {
  for (const runs of [undefined, [], [{ day: '2026-09-22', count: 3 }], [{ day: '2026-09-22', count: -1 }],
    [{ day: '2026-09-22', count: 1.5 }], [{ day: '2026-09-23', count: 1 }],
    [{ day: '2026-09-22', count: 1 }, { day: '2026-09-22', count: 1 }]]) {
    const f = fixture({ stateVersion: 4, sessionCount: 2, history: { '2026-09-22': { count: 1, timeMs: 0 } },
      countUndo: { id: 'broken', day: '2026-09-22', sessionCount: 2, runs } });
    const state = (await f.store.dispatch({ action: 'get' })).state;
    assert.equal(state.countUndo, null);
    assert.equal((await undo(f.store, { id: 'broken' })).undone, false);
    assert.equal(f.writes(), 0);
  }
});

test('future schema is never rewritten by reads, resets, or mutation requests', async () => {
  const f = fixture({ stateVersion: 5, sessionCount: 20, countUndo: { future: 'data' } });
  const before = f.data();
  for (const action of ['get', 'count', 'undoCount', 'resetTimer', 'resetCount', 'resetSession', 'clear', 'installed', 'preferences']) {
    await assert.rejects(f.store.dispatch({ action, value: { mode: 'popup' } }), /newer version/);
  }
  assert.equal(f.writes(), 0); assert.deepEqual(f.data(), before);
  const previousChrome = globalThis.chrome;
  globalThis.chrome = { storage: { local: f.storage } };
  try {
    await assert.rejects(loadState(), /newer version/);
    await assert.rejects(saveState(defaultState()), /newer version/);
    await assert.rejects(clearAll(), /newer version/);
    assert.deepEqual(f.data(), before);
  } finally { globalThis.chrome = previousChrome; }
});

test('undo follows operation order if the local date moves backwards', async () => {
  const f = fixture();
  await count(f.store); f.advance(86400000); await count(f.store); f.advance(-86400000); await count(f.store);
  assert.deepEqual(f.data().countUndo.runs.map(r => r.day), ['2026-09-22', '2026-09-23', '2026-09-22']);
  await undo(f.store, f.data().countUndo);
  assert.equal(f.data().history['2026-09-22'].count, 1);
  await undo(f.store, f.data().countUndo);
  assert.equal(f.data().history['2026-09-23'].count, 0);
  await undo(f.store, f.data().countUndo);
  assert.equal(f.data().countUndo, null);
});

test('numeric safety rejects an unrepresentable count without consuming the undo history', async () => {
  const f = fixture({ stateVersion: 4, sessionCount: Number.MAX_SAFE_INTEGER });
  const before = f.data();
  await assert.rejects(count(f.store), /safely supported/);
  assert.deepEqual(f.data(), before);
});

for (const start of [new Date(2026, 8, 27, 23, 59, 59), new Date(2026, 8, 30, 23, 59, 59), new Date(2026, 11, 31, 23, 59, 59)]) {
  test(`undo across a calendar boundary corrects original day ${dayKey(start)}`, async () => {
    const f = fixture({ history: { [dayKey(start)]: { count: 12, timeMs: 456 } } }, start.getTime());
    const receipt = await count(f.store);
    f.advance(2000);
    await undo(f.store, receipt);
    assert.deepEqual(f.data().history, { [dayKey(start)]: { count: 12, timeMs: 456 } });
    assert.equal(computeStats(f.data().history, start).today.count, 12);
    assert.equal(computeStats(f.data().history, f.now()).today.count, 0);
  });
}

for (const action of ['resetTimer', 'resetCount', 'resetSession', 'clear']) {
  test(`${action} invalidates the receipt without letting a stale undo alter reset state`, async () => {
    const f = fixture();
    await count(f.store); await count(f.store);
    const receipt = await count(f.store);
    await f.store.dispatch({ action });
    const before = f.data();
    assert.equal(before.countUndo, null);
    assert.equal((await undo(f.store, receipt)).undone, false);
    assert.deepEqual(f.data(), before);
  });
}

test('timer toggles, themes, settings and display preferences retain undo without rolling back elapsed time', async () => {
  const start = new Date(2026, 8, 22, 23, 59, 58).getTime();
  const f = fixture({}, start);
  await f.store.dispatch({ action: 'toggle' });
  const receipt = await count(f.store);
  f.advance(3000);
  await f.store.dispatch({ action: 'theme', value: 'editorial' });
  await f.store.dispatch({ action: 'setting', key: 'sound', value: false });
  await f.store.dispatch({ action: 'preferences', value: { mode: 'floating' } });
  f.advance(2000);
  await f.store.dispatch({ action: 'toggle' });
  await f.store.dispatch({ action: 'toggle' });
  f.advance(1000);
  const result = await undo(f.store, receipt);
  assert.equal(result.undone, true);
  assert.deepEqual(result.state.timer, { running: true, sessionElapsedMs: 6000, runStartedAt: f.now() });
  assert.deepEqual(result.state.history['2026-09-22'], { timeMs: 2000, count: 0 });
  assert.deepEqual(result.state.history['2026-09-23'], { timeMs: 4000, count: 0 });
  assert.equal(result.state.theme, 'editorial');
  assert.equal(result.state.settings.sound, false);
  assert.equal(result.preferences.mode, 'floating');
});

test('storage failures preserve receipt and counts; retry is safe after worker restart', async () => {
  const f = fixture();
  const first = await count(f.store);
  const before = f.data();
  f.fail(true);
  await assert.rejects(count(f.store), /disk full/);
  assert.deepEqual(f.data(), before, 'failed COUNT does not replace the valid receipt');
  await assert.rejects(undo(f.store, first), /disk full/);
  assert.deepEqual(f.data(), before, 'failed UNDO is not consumed');
  f.fail(false);
  const restarted = createStore(f.storage, f.now);
  assert.deepEqual((await restarted.dispatch({ action: 'get' })).state.countUndo, first);
  assert.equal((await undo(restarted, first)).undone, true);
  assert.equal(f.data().sessionCount, 0);
});

test('legacy states do not invent an undo; malformed or inconsistent receipts fail closed', async () => {
  const seed = { stateVersion: 2, sessionCount: 42, history: { '2020-01-02': { count: 42, timeMs: 900 } } };
  for (const countUndo of [undefined, { id: 'bad', day: '2020-01-02', sessionCount: 43 }, { id: 'bad', day: 'missing', sessionCount: 42 }, { id: '', day: '2020-01-02', sessionCount: 42 }]) {
    const f = fixture({ ...seed, ...(countUndo === undefined ? {} : { countUndo }) });
    assert.equal((await f.store.dispatch({ action: 'get' })).state.countUndo, null);
    assert.equal((await undo(f.store, { id: 'bad' })).undone, false);
    assert.equal(f.writes(), 0);
    assert.deepEqual(f.data().history, seed.history);
    const receipt = await count(f.store);
    assert.ok(receipt.id);
    await undo(f.store, receipt);
    assert.equal(f.data().sessionCount, 42);
    assert.deepEqual(f.data().history['2020-01-02'], seed.history['2020-01-02']);
  }
});

test('shared load/save helpers round-trip a valid receipt and clear missing legacy receipts', async () => {
  const f = fixture();
  const receipt = await count(f.store);
  const previousChrome = globalThis.chrome;
  globalThis.chrome = { storage: { local: f.storage } };
  try {
    const loaded = await loadState();
    assert.deepEqual(loaded.countUndo, receipt);
    await saveState(loaded);
    assert.deepEqual(f.data().countUndo, receipt);
    const { runs: _runs, ...singleReceipt } = receipt;
    await saveState({ ...loaded, stateVersion: 3, countUndo: singleReceipt });
    assert.deepEqual(f.data().countUndo, receipt, 'direct schema 3 helper saves preserve its one recorded operation');
    const { countUndo: _receipt, ...legacy } = loaded;
    await saveState(legacy);
    assert.equal(f.data().countUndo, null);
    assert.equal((await undo(f.store, receipt)).undone, false);
    assert.equal(f.data().sessionCount, 1);
  } finally {
    if (previousChrome === undefined) delete globalThis.chrome;
    else globalThis.chrome = previousChrome;
  }
});
