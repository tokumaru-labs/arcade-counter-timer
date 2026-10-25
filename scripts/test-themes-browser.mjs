// Real extension, isolated synthetic-data profile. No installed user data.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(import.meta.dirname, '..');
const qa = join(root, '.render', `themes-qa-${Date.now()}`);
mkdirSync(qa, { recursive: true });
const themes = ['space-age', 'arcade', 'editorial', 'steampunk', 'art-deco', 'nixie'];
const context = await chromium.launchPersistentContext(join(qa, 'profile'), {
  headless: true, channel: 'chromium', locale: 'en-US',
  args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`]
});
const errors = [], external = [], checks = [], images = [];
context.on('page', (page) => page.on('pageerror', (error) => errors.push(error.message)));
context.on('request', (request) => { if (/^https?:/.test(request.url())) external.push(request.url()); });
const record = (name) => { checks.push(name); console.log(`PASS ${name}`); };
async function capture(page, name) {
  const path = join(qa, `${name}.png`); await page.screenshot({ path }); images.push(path);
}
async function settled(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#count-value').evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {}))));
}
async function assertLayout(page, name) {
  const metrics = await page.evaluate(() => {
    const box = (selector) => { const b = document.querySelector(selector).getBoundingClientRect(); return { top: b.top, left: b.left, right: b.right, bottom: b.bottom, height: b.height }; };
    return { pad: box('#count-pad'), count: box('#count-value'), timer: box('#timer'), time: box('#timer-value'),
      countButton: box('#btn-count'), undo: box('#btn-undo-count'), footer: box('.footer'), width: innerWidth, height: innerHeight };
  });
  for (const [value, parent] of [['count', 'pad'], ['time', 'timer']]) {
    const v = metrics[value], p = metrics[parent];
    assert.ok(v.top >= p.top && v.bottom <= p.bottom && v.left >= p.left && v.right <= p.right,
      `${name}: ${value} contained in ${parent}: ${JSON.stringify(metrics)}`);
  }
  for (const control of ['countButton', 'undo', 'footer']) {
    const b = metrics[control];
    assert.ok(b.left >= 0 && b.right <= metrics.width && b.bottom <= metrics.height, `${name}: ${control} visible: ${JSON.stringify(metrics)}`);
  }
  assert.ok(metrics.pad.bottom <= metrics.countButton.top, `${name}: count pad cannot overlap COUNT`);
}
try {
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).host;
  const page = await context.newPage();
  for (const theme of themes) {
    for (const [surface, width, height] of [['popup', 360, 540], ['floating', 272, 390], ['sidepanel', 300, 620]]) {
      await worker.evaluate(async ({ theme }) => {
        await chrome.storage.local.set({ stateVersion: 3, theme, sessionCount: 42, countUndo: null,
          timer: { running: false, sessionElapsedMs: 1458000, runStartedAt: null },
          history: {}, settings: { clock: true, sound: false, flyText: true, chainEffect: true, subtleCrt: true } });
      }, { theme });
      await page.setViewportSize({ width, height });
      await page.goto(`chrome-extension://${id}/popup.html?surface=${surface}`);
      await page.locator('#screen:not([inert])').waitFor();
      await page.locator('#btn-count').click();
      await page.waitForFunction(() => document.querySelector('#count-value').textContent === '43');
      await page.locator('#btn-undo-count:enabled').waitFor();
      await page.locator('#btn-undo-count').click();
      await page.waitForFunction(() => document.querySelector('#count-value').textContent === '42');
      await settled(page);
      await assertLayout(page, `${theme}-${surface}`);
      await capture(page, `${theme}-${surface}`);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.locator('#btn-count').click();
      await page.waitForFunction(() => document.querySelector('#count-value').textContent === '43');
      assert.equal(await page.locator('#count-value').evaluate((el) => getComputedStyle(el).animationName), 'none');
      assert.equal(await page.locator('#count-value').evaluate((el) => [...el.children].every((child) => getComputedStyle(child).animationName === 'none')), true);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await worker.evaluate(() => chrome.storage.local.set({ sessionCount: 1234567890, countUndo: null,
        timer: { running: false, sessionElapsedMs: (185 * 3600 + 24 * 60 + 38) * 1000, runStartedAt: null } }));
      await page.waitForFunction(() => document.querySelector('#count-value').textContent === '1,234,567,890' && document.querySelector('#timer-value').textContent === '185:24:38');
      await settled(page);
      await assertLayout(page, `${theme}-${surface}-long`);
      if (surface === 'floating') await capture(page, `${theme}-${surface}-long`);
      await page.locator('#btn-start-stop').click();
      await page.waitForFunction(() => document.querySelector('#timer-state').textContent === 'RUNNING');
      await page.locator('#btn-start-stop').click();
      await page.waitForFunction(() => document.querySelector('#timer-state').textContent === 'STOPPED');
      record(`${theme} ${surface}: count/undo, long values, timer controls, bounds and reduced motion`);
    }
    await page.locator('#btn-settings').click();
    assert.equal(await page.locator('[data-theme-option]').count(), 6);
    assert.equal(await page.locator('label[for="theme-original"]').count(), 0);
    await page.locator('#btn-clear').scrollIntoViewIfNeeded();
    await capture(page, `${theme}-settings`);
    if (['art-deco', 'nixie'].includes(theme)) assert.ok(await page.evaluate(() => document.fonts.check('16px "Instrument Bodoni"')));
    assert.ok(await page.evaluate(() => [...document.querySelectorAll('.theme-gear')].every((img) => img.complete && img.naturalWidth > 0)));
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  record('all six themes use bundled assets with no page errors or external network requests');
  writeFileSync(join(qa, 'results.json'), JSON.stringify({ browser: context.browser().version(), checks, images }, null, 2));
  writeFileSync(join(root, '.render', 'latest-themes-qa.json'), JSON.stringify({ directory: qa, checks, images }, null, 2));
  console.log(`Browser checks: ${checks.length}; artifacts: ${qa}`);
} finally { await context.close(); }
