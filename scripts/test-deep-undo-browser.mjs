// Isolated real-extension profile; never accesses the user's trial or installed data.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(import.meta.dirname, '..');
const qa = join(root, '.render', `deep-undo-qa-${Date.now()}`);
mkdirSync(qa, { recursive: true });
const profile = join(qa, 'profile');
const checks = [], images = [], errors = [], network = [], bounds = [];
let context;
const launch = async () => {
  context = await chromium.launchPersistentContext(profile, {
    headless: true, channel: 'chromium', viewport: { width: 600, height: 520 },
    args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`]
  });
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  context.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  return { worker, id: new URL(worker.url()).host };
};
const record = name => { checks.push(name); console.log(`PASS ${name}`); };
const ready = page => page.locator('#screen:not([inert])').waitFor();
const value = (page, n) => page.waitForFunction(n => document.querySelector('#count-value').getAttribute('aria-label') === String(n), n);
const capture = async (page, name) => {
  const path = join(qa, `${name}.png`); await page.screenshot({ path }); images.push(path);
};
try {
  let { worker, id } = await launch();
  await worker.evaluate(() => chrome.storage.local.set({ stateVersion: 3, theme: 'nixie', sessionCount: 7,
    countUndo: { id: 'v3-head', day: '2026-10-24', sessionCount: 7 }, history: { '2026-10-24': { count: 7, timeMs: 5000 } },
    timer: { running: false, sessionElapsedMs: 0, runStartedAt: null },
    settings: { clock: false, sound: false, flyText: false, chainEffect: false, subtleCrt: false } }));
  let popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`); await ready(popup); await value(popup, 7);
  const panel = await context.newPage(); await panel.goto(`chrome-extension://${id}/popup.html?surface=sidepanel`); await ready(panel);
  for (let i = 0; i < 3; i++) await popup.locator('#btn-count').click();
  await value(popup, 10); await value(panel, 10);
  const head = (await worker.evaluate(() => chrome.storage.local.get('countUndo'))).countUndo;
  const requestUndo = page => page.evaluate(receiptId => chrome.runtime.sendMessage({ channel: 'arcade', action: 'undoCount', receiptId }), head.id);
  const concurrent = await Promise.all([requestUndo(popup), requestUndo(panel)]);
  assert.equal(concurrent.filter(result => result.value.undone).length, 1);
  await value(popup, 9); await value(panel, 9);
  await panel.locator('#btn-undo-count').focus(); await panel.keyboard.press('Space'); await value(popup, 8);
  assert.equal(await popup.locator('#btn-undo-count').isEnabled(), true);
  const replay = await popup.evaluate(() => chrome.runtime.sendMessage({ channel: 'arcade', action: 'undoCount', receiptId: 'v3-head' }));
  assert.equal(replay.value.undone, false);
  record('schema 3 single receipt joins new counts; parallel views and keyboard undo rotate the shared head safely');

  await context.close(); ({ worker, id } = await launch());
  popup = await context.newPage(); await popup.goto(`chrome-extension://${id}/popup.html`); await ready(popup); await value(popup, 8);
  await popup.locator('#btn-count').click(); await value(popup, 9);
  await popup.locator('#btn-start-stop').click(); await popup.waitForTimeout(150);
  for (const n of [8, 7, 6]) { await popup.locator('#btn-undo-count').click(); await value(popup, n); }
  assert.equal(await popup.locator('#btn-undo-count').isDisabled(), true);
  const persisted = await worker.evaluate(() => chrome.storage.local.get(['sessionCount', 'countUndo', 'timer', 'history', 'stateVersion']));
  assert.equal(persisted.sessionCount, 6); assert.equal(persisted.countUndo, null); assert.equal(persisted.stateVersion, 4);
  assert.equal(persisted.timer.running, true); assert.ok(persisted.timer.sessionElapsedMs >= 100);
  assert.equal(persisted.history['2026-10-24'].count, 6);
  record('browser/worker restart preserves deep undo; a new COUNT branches and undo leaves the running timer intact');

  await worker.evaluate(() => chrome.storage.local.set({ stateVersion: 4, theme: 'nixie', sessionCount: 7891, countUndo: null,
    timer: { running: false, sessionElapsedMs: 12296000, runStartedAt: null }, history: {} }));
  for (const [surface, width, height] of [['popup', 600, 520], ['floating', 272, 390], ['sidepanel', 300, 620]]) {
    await popup.setViewportSize({ width, height }); await popup.goto(`chrome-extension://${id}/popup.html?surface=${surface}`);
    await ready(popup); await popup.waitForFunction(() => document.body.dataset.tubesReady === 'true');
    await popup.evaluate(() => document.fonts.ready);
    const silhouettes = await popup.locator('.nixie-housing').evaluateAll(nodes => nodes.map(img => {
      const rect = img.getBoundingClientRect(), pane = img.closest('.timer,.countpad').getBoundingClientRect();
      return { loaded: img.complete && img.naturalWidth === 841 && img.naturalHeight === 1871,
        ratio: rect.width / rect.height, rect: rect.toJSON(), pane: pane.toJSON(),
        clip: getComputedStyle(img).clipPath, fit: getComputedStyle(img).objectFit };
    }));
    assert.equal(silhouettes.length, 11);
    for (const shape of silhouettes) {
      assert.ok(shape.loaded); assert.equal(shape.clip, 'none'); assert.equal(shape.fit, 'contain');
      assert.ok(Math.abs(shape.ratio - 841 / 1871) < .002);
      assert.ok(shape.rect.top > shape.pane.top + 2 && shape.rect.bottom < shape.pane.bottom - 2);
      assert.ok(shape.rect.left > shape.pane.left + 2 && shape.rect.right < shape.pane.right - 2);
    }
    bounds.push({ surface, silhouettes });
    await capture(popup, `nixie-complete-${surface}`);
    record(`${surface}: all 11 complete tube images retain source proportions and clearance inside the instrument`);
  }
  assert.deepEqual(errors, []); assert.deepEqual(network, []);
  writeFileSync(join(qa, 'results.json'), JSON.stringify({ checks, images, bounds, errors, network }, null, 2));
  writeFileSync(join(root, '.render', 'latest-deep-undo-qa.json'), JSON.stringify({ directory: qa, checks, images }, null, 2));
  console.log(`Deep undo checks: ${checks.length}; artifacts: ${qa}`);
} finally { await context?.close(); }
