import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/controller.js';
import { computeStats, dayKey } from '../src/time.js';
import { loadState, saveState } from '../src/storage.js';

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

test('COUNT exposes one durable receipt and UNDO corrects session and all statistics once', async () => {
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

test('two views cannot undo twice or use a stale receipt to remove a newer count', async () => {
  const f = fixture();
  const first = await count(f.store), second = await count(f.store);
  assert.notEqual(first.id, second.id, 'same-millisecond counts still have unique receipts');
  assert.equal((await undo(f.store, first)).undone, false);
  const results = await Promise.all([undo(f.store, second), undo(f.store, second)]);
  assert.equal(results.filter((result) => result.undone).length, 1);
  assert.equal(f.data().sessionCount, 1);
  assert.equal((await undo(f.store, first)).undone, false, 'older receipts never become available again');
  const third = await count(f.store);
  assert.equal((await undo(f.store, second)).undone, false);
  assert.equal(f.data().countUndo.id, third.id);
  assert.equal(f.data().sessionCount, 2);
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
