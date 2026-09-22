import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, displayPreferences } from '../src/controller.js';
import { dayKey } from '../src/time.js';
import { updateNotice } from '../src/release.js';

function fixture(seed = {}, now = new Date(2026, 8, 22, 12).getTime()) {
  let data = structuredClone(seed), fail = false, writes = 0;
  const storage = {
    async get(keys) { return structuredClone(Object.fromEntries(keys.filter((key) => key in data).map((key) => [key, data[key]]))); },
    async set(patch) { if (fail) throw new Error('disk full'); writes++; Object.assign(data, structuredClone(patch)); }
  };
  return { store: createStore(storage, () => now), storage, data: () => structuredClone(data), fail: (value) => { fail = value; }, writes: () => writes };
}
const old = {
  stateVersion: 1,
  timer: { running: true, sessionElapsedMs: 90000, runStartedAt: new Date(2026, 8, 22, 11, 59).getTime() },
  sessionCount: 731,
  history: { '2024-01-02': { timeMs: 7200000, count: 319 }, '2026-09-21': { timeMs: 8100000, count: 412 } },
  theme: 'arcade', settings: { clock: false, sound: false, flyText: false, chainEffect: false, subtleCrt: false }
};

test('updating preserves every old data key exactly and saves a separate recovery snapshot', async () => {
  const f = fixture(old);
  await f.store.dispatch({ action: 'installed', reason: 'update', previousVersion: '0.1.3' });
  const actual = f.data();
  for (const key of Object.keys(old)) assert.deepEqual(actual[key], old[key], key);
  assert.deepEqual(actual.upgradeBackupV020, old);
  assert.equal(actual.releaseNotice.pending.version, '0.2.0');
  await f.store.dispatch({ action: 'installed', reason: 'update', previousVersion: '0.1.3' });
  assert.deepEqual(f.data().upgradeBackupV020, old);
});

test('reads and every display-mode switch preserve history older than 400 days', async () => {
  const f = fixture(old);
  await f.store.dispatch({ action: 'get' });
  assert.equal(f.writes(), 0);
  for (const mode of ['floating', 'sidepanel', 'popup']) await f.store.dispatch({ action: 'preferences', value: { mode } });
  assert.deepEqual(f.data().history, old.history);
  assert.deepEqual(f.data().timer, old.timer);
  assert.deepEqual(f.data().settings, old.settings);
  assert.equal(f.data().sessionCount, old.sessionCount);
});

test('concurrent clients cannot lose counts or credit elapsed time twice', async () => {
  const f = fixture(old);
  await Promise.all(Array.from({ length: 100 }, () => f.store.dispatch({ action: 'count' })));
  assert.equal(f.data().sessionCount, 831);
  const today = f.data().history['2026-09-22'];
  assert.deepEqual(today, { count: 100, timeMs: 60000 });
  assert.equal(f.data().timer.sessionElapsedMs, 150000);
  assert.deepEqual(f.data().history['2024-01-02'], old.history['2024-01-02']);
});

test('worker restart reads durable state, retaining clock, theme, timer and counts', async () => {
  const f = fixture(old);
  await f.store.dispatch({ action: 'count' });
  const restarted = createStore(f.storage, () => new Date(2026, 8, 22, 12, 1).getTime());
  await restarted.dispatch({ action: 'toggle' });
  const result = (await restarted.dispatch({ action: 'get' })).state;
  assert.equal(result.sessionCount, 732);
  assert.equal(result.timer.running, false);
  assert.equal(result.timer.sessionElapsedMs, 210000);
  assert.equal(result.settings.clock, false);
  assert.equal(result.theme, 'arcade');
});

test('update notification is claimed once across clients, reloads, resets and restarts', async () => {
  const f = fixture(old);
  await f.store.dispatch({ action: 'installed', reason: 'update', previousVersion: '0.1.3' });
  const claims = await Promise.all([f.store.dispatch({ action: 'claimNotice' }), f.store.dispatch({ action: 'claimNotice' })]);
  assert.equal(claims.filter(Boolean).length, 1);
  await f.store.dispatch({ action: 'resetSession' });
  await f.store.dispatch({ action: 'installed', reason: 'update', previousVersion: '0.1.3' });
  const restarted = createStore(f.storage);
  assert.equal(await restarted.dispatch({ action: 'claimNotice' }), null);
  await restarted.dispatch({ action: 'clear' });
  assert.equal(await restarted.dispatch({ action: 'claimNotice' }), null);
  assert.deepEqual(f.data().history, {});
  assert.equal(f.data().upgradeBackupV020, null);
});

test('fresh installation, same-version reload and downgrade never announce an update', async () => {
  for (const details of [{ reason: 'install' }, { reason: 'update', previousVersion: '0.2.0' }, { reason: 'update', previousVersion: '0.3.0' }]) {
    const f = fixture();
    await f.store.dispatch({ action: 'installed', ...details });
    assert.equal(await f.store.dispatch({ action: 'claimNotice' }), null);
  }
});

test('skipped releases mention only features added after the installed version', () => {
  assert.equal(updateNotice('0.1.3').notes.length, 1);
  assert.deepEqual(updateNotice('0.1.2').notes.map((note) => note.version), ['0.1.3', '0.2.0']);
});

test('a failed save makes no optimistic mutation; subsequent operations can recover', async () => {
  const f = fixture(old); f.fail(true);
  await assert.rejects(f.store.dispatch({ action: 'count' }), /disk full/);
  assert.deepEqual(f.data(), old);
  f.fail(false); await f.store.dispatch({ action: 'count' });
  assert.equal(f.data().sessionCount, 732);
});

test('future storage schemas fail closed without overwriting saved data', async () => {
  const f = fixture({ ...old, stateVersion: 99 });
  await assert.rejects(f.store.dispatch({ action: 'count' }), /newer version/);
  assert.equal(f.writes(), 0);
});

test('running session reset credits time across midnight and preserves all historical counts', async () => {
  const start = new Date(2026, 8, 21, 23, 59, 50).getTime();
  const end = new Date(2026, 8, 22, 0, 0, 10).getTime();
  const f = fixture({ ...old, timer: { running: true, sessionElapsedMs: 0, runStartedAt: start } }, end);
  await f.store.dispatch({ action: 'resetSession' });
  assert.equal(f.data().history[dayKey(start)].timeMs, 8110000);
  assert.equal(f.data().history[dayKey(end)].timeMs, 10000);
  assert.equal(f.data().history[dayKey(start)].count, 412);
  assert.equal(f.data().sessionCount, 0);
});

test('placement normalization is bounded and invalid operations never write', async () => {
  assert.deepEqual(displayPreferences({ x: -1, y: NaN, mode: 'unknown' }), { mode: 'popup', x: 0, y: 96, compact: true, locked: false });
  const f = fixture(old);
  for (const message of [{ action: 'preferences', value: { mode: 'bad' } }, { action: 'setting', key: '__proto__', value: true }, { action: 'theme', value: 'bad' }]) {
    await assert.rejects(f.store.dispatch(message));
  }
  assert.equal(f.writes(), 0);
});
