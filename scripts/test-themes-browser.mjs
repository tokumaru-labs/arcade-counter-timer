// Real extension, isolated synthetic-data profile. No installed user data.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
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
  const materialFiles = JSON.parse(readFileSync(join(root, 'assets/themes/COMMONS-SOURCES.json'), 'utf8')).map((item) => item.file);
  for (const theme of themes) {
    for (const [surface, width, height] of [['popup', ['arcade','editorial'].includes(theme) ? 360 : 600, ['arcade','editorial'].includes(theme) ? 540 : 520], ['floating', 272, 390], ['sidepanel', 300, 620]]) {
      await worker.evaluate(async ({ theme }) => {
        await chrome.storage.local.set({ stateVersion: 3, theme, sessionCount: 42, countUndo: null,
          timer: { running: false, sessionElapsedMs: 1458000, runStartedAt: null },
          history: {}, settings: { clock: true, sound: false, flyText: true, chainEffect: true, subtleCrt: true } });
      }, { theme });
      await page.setViewportSize({ width, height });
      await page.goto(`chrome-extension://${id}/popup.html?surface=${surface}`);
      await page.locator('#screen:not([inert])').waitFor();
      await page.locator('#btn-count').click();
      await page.waitForFunction(() => document.querySelector('#count-value').getAttribute('aria-label') === '43');
      await page.locator('#btn-undo-count:enabled').waitFor();
      await page.locator('#btn-undo-count').click();
      await page.waitForFunction(() => document.querySelector('#count-value').getAttribute('aria-label') === '42');
      await settled(page);
      assert.equal(await page.getByRole('img', { name: '42', exact: true }).count(), 1, 'accessible readout names the canonical count, not its padding');
      if (theme === 'nixie') {
        await page.waitForFunction(() => document.body.dataset.tubesReady === 'true');
        assert.ok(await page.locator('#count-value .instrument-digit').evaluateAll((digits) => digits.every((digit) =>
          getComputedStyle(digit,'::before').backgroundImage.includes(`nixie-${digit.textContent}.jpg`) && getComputedStyle(digit).color === 'rgba(0, 0, 0, 0)')));
      }
      await assertLayout(page, `${theme}-${surface}`);
      if (surface === 'floating' && !['arcade','editorial'].includes(theme)) {
        assert.ok(await page.locator('#btn-reset .hold__label').evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight - 11), 'session label stays above decorative lower edge');
      }
      await capture(page, `${theme}-${surface}`);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.locator('#btn-count').click();
      await page.waitForFunction(() => document.querySelector('#count-value').getAttribute('aria-label') === '43');
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
    if (theme === 'art-deco') assert.ok(await page.evaluate(() => document.fonts.check('16px "Instrument Bodoni"')));
    assert.ok(await page.evaluate(() => [...document.querySelectorAll('.theme-gear')].every((img) => img.complete && img.naturalWidth > 0)));
    if (!['arcade', 'editorial'].includes(theme)) assert.ok(await page.evaluate(() => document.fonts.check('500 16px "Instrument Sans"')));
  }
  const decoded = await page.evaluate((files) => Promise.all(files.map((file) => new Promise((resolve) => {
    const image = new Image(); image.onload = () => resolve(image.naturalWidth > 0); image.onerror = () => resolve(false); image.src = `assets/themes/${file}`;
  }))), materialFiles);
  assert.ok(decoded.every(Boolean), 'every bundled photographic material decodes');
  record('all 18 original photographic materials and two local typefaces decode');

  // The native popup's requested size must follow theme changes, while the
  // surrounding Chrome window manages the resulting popup resize.
  await page.setViewportSize({ width: 600, height: 520 });
  await page.goto(`chrome-extension://${id}/popup.html`);
  await page.locator('#screen:not([inert])').waitFor();
  await page.locator('#btn-settings').click();
  for (const theme of themes) {
    await page.locator(`label[for="theme-${theme}"]`).click();
    const expected = ['arcade','editorial'].includes(theme) ? { width: 360, height: 540 } : { width: 600, height: 520 };
    await page.waitForFunction(({ theme, expected }) => {
      const rect = document.body.getBoundingClientRect();
      return document.body.dataset.theme === theme && rect.width === expected.width && rect.height === expected.height;
    }, { theme, expected });
    await page.setViewportSize(expected);
  }
  await page.locator('#btn-back').click();
  await page.emulateMedia({ forcedColors: 'active' });
  assert.ok(await page.locator('#count-value .instrument-digit').evaluateAll((digits) => digits.every((digit) =>
    (getComputedStyle(digit,'::before').display === 'none' && getComputedStyle(digit.querySelector('.nixie-housing')).display === 'none') && getComputedStyle(digit).color !== 'rgba(0, 0, 0, 0)')));
  await capture(page, 'nixie-forced-colors');
  await page.emulateMedia({ forcedColors: 'none' });
  record('six theme switches resize the popup; forced colors exposes live text instead of photos');

  // Real failed image request in a fresh extension view, not a class-only mock.
  let failedRequests = 0;
  await context.route('**/nixie-7.jpg', (route) => { failedRequests++; return route.abort(); });
  const fallback = await context.newPage();
  await fallback.setViewportSize({ width: 600, height: 520 });
  await fallback.goto(`chrome-extension://${id}/popup.html`);
  await fallback.waitForFunction(() => document.body.dataset.tubesReady === 'false');
  assert.ok(failedRequests > 0, 'failure fixture intercepted the actual local photo');
  assert.ok(await fallback.locator('#count-value .instrument-digit').evaluateAll((digits) => digits.length > 0 && digits.every((digit) =>
    (getComputedStyle(digit,'::before').display === 'none' && getComputedStyle(digit.querySelector('.nixie-housing')).display === 'none') && getComputedStyle(digit).color !== 'rgba(0, 0, 0, 0)')));
  await fallback.locator('#btn-count').click();
  await fallback.locator('#btn-undo-count:enabled').waitFor();
  await fallback.locator('#btn-undo-count').click();
  await fallback.locator('#btn-undo-count:disabled').waitFor();
  await capture(fallback, 'nixie-missing-photo-fallback');
  await context.unroute('**/nixie-7.jpg');
  await fallback.close();
  record('failed local photo keeps visible live digits and functional COUNT/UNDO');
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  record('all six themes use bundled assets with no page errors or external network requests');
  writeFileSync(join(qa, 'results.json'), JSON.stringify({ browser: context.browser().version(), checks, images }, null, 2));
  writeFileSync(join(root, '.render', 'latest-themes-qa.json'), JSON.stringify({ directory: qa, checks, images }, null, 2));
  console.log(`Browser checks: ${checks.length}; artifacts: ${qa}`);
} finally { await context.close(); }
