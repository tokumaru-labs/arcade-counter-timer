// Bounded release test: real 0.2.0 extension -> current package, isolated data.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join, dirname } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(import.meta.dirname, '..');
const base = '42a4b3caa5835e5e5040ac388cefd742e4f135d1';
const qa = join(root, '.render', `release-upgrade-${Date.now()}`);
const extension = join(qa, 'extension');
mkdirSync(extension, { recursive: true });
const files = execFileSync('git', ['ls-tree', '-r', '--name-only', base], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/)
  .filter(name => /^(manifest.json|popup\.(html|css|js)|themes.css|background.js|src\/|assets\/|_locales\/)/.test(name));
for (const file of files) {
  const dest = join(extension, file); mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, execFileSync('git', ['show', `${base}:${file}`], { cwd: root }));
}
const context = await chromium.launchPersistentContext(join(qa, 'profile'), {
  headless: true, channel: 'chromium', viewport: { width: 600, height: 520 },
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--enable-unsafe-extension-debugging']
});
const checks = [], errors = [];
const record = name => { checks.push(name); console.log(`PASS ${name}`); };
context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
try {
  const oldWorker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const id = new URL(oldWorker.url()).host;
  assert.equal(await oldWorker.evaluate(() => chrome.runtime.getManifest().version), '0.2.0');
  const seed = { stateVersion: 2, sessionCount: 42, theme: 'original',
    timer: { running: false, sessionElapsedMs: 1458000, runStartedAt: null },
    history: { '2025-01-02': { count: 42, timeMs: 1458000 } },
    settings: { clock: false, sound: false, flyText: false, chainEffect: false, subtleCrt: false },
    upgradeBackupV020: { preserved: 'existing recovery snapshot' },
    releaseNotice: { seenVersion: '0.2.0', pending: null } };
  await oldWorker.evaluate(data => chrome.storage.local.set(data), seed);
  for (const file of ['manifest.json', 'popup.html', 'popup.css', 'popup.js', 'themes.css', 'background.js']) cpSync(join(root, file), join(extension, file));
  for (const dir of ['src', 'assets', '_locales']) cpSync(join(root, dir), join(extension, dir), { recursive: true });
  const cdp = await context.browser().newBrowserCDPSession();
  await cdp.send('Extensions.loadUnpacked', { path: extension });
  const page = await context.newPage(); await page.goto(`chrome-extension://${id}/popup.html`);
  await page.locator('#screen:not([inert])').waitFor();
  await page.locator('#release-notice:not([hidden])').waitFor();
  assert.equal(await page.evaluate(() => chrome.runtime.getManifest().version), '0.3.0');
  const data = await page.evaluate(() => chrome.storage.local.get(null));
  for (const key of Object.keys(seed).filter(k => k !== 'releaseNotice')) assert.deepEqual(data[key], seed[key]);
  assert.equal(data.releaseNotice.seenVersion, '0.3.0');
  const notice = await page.locator('#release-notice').innerText();
  assert.match(notice, /Six themes.*undo|6つのテーマ.*取り消し/);
  assert.doesNotMatch(notice, /Original/);
  assert.ok(await page.locator('#release-notice').evaluate(el => {
    const pane = el.getBoundingClientRect();
    return [...el.querySelectorAll('p')].every(p => p.getBoundingClientRect().bottom <= pane.bottom - 2);
  }), 'the update description must fit inside its visible notice');
  assert.ok(await page.locator('.footer').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight));
  await page.screenshot({ path: join(qa, 'update-0.2-to-0.3.png') });
  record('actual 0.2.0 -> 0.3.0 retains every stored record and existing backup, with the new notice');
  await page.reload(); await page.locator('#screen:not([inert])').waitFor();
  assert.equal(await page.locator('#release-notice').isHidden(), true);
  await page.locator('#btn-count').click(); await page.locator('#btn-count').click();
  await page.waitForFunction(() => document.querySelector('#count-value').getAttribute('aria-label') === '44');
  await page.locator('#btn-undo-count').click(); await page.locator('#btn-undo-count').click();
  await page.waitForFunction(() => document.querySelector('#count-value').getAttribute('aria-label') === '42');
  const migrated = await page.evaluate(() => chrome.storage.local.get(null));
  assert.equal(migrated.stateVersion, 4); assert.equal(migrated.theme, 'space-age'); assert.equal(migrated.countUndo, null);
  assert.deepEqual(migrated.history['2025-01-02'], seed.history['2025-01-02']);
  assert.deepEqual(migrated.upgradeBackupV020, seed.upgradeBackupV020);
  record('notice is one-time; first new counts use schema 4 and undo without inventing older steps');
  for (const [theme, width, height] of [
    ['space-age',600,520],['arcade',360,540],['editorial',360,540],['steampunk',600,520],
    ['art-deco',600,520],['nixie',600,520],['space-age',272,390],['nixie',272,390]
  ]) {
    await page.evaluate(async theme => {
      const { updateNotice } = await import('./src/release.js');
      await chrome.storage.local.set({ theme, releaseNotice: { pending: updateNotice('0.2.0') } });
    }, theme);
    await page.setViewportSize({width,height});
    await page.goto(`chrome-extension://${id}/popup.html${width===272?'?surface=floating':''}`);
    await page.locator('#release-notice:not([hidden])').waitFor();
    await page.locator('#release-notice').scrollIntoViewIfNeeded();
    assert.ok(await page.locator('#release-notice').evaluate(el => {
      const pane = el.getBoundingClientRect();
      return [...el.querySelectorAll('p')].every(p => p.getBoundingClientRect().bottom <= pane.bottom - 2);
    }), `${theme} ${width}: complete notice text`);
    if (width===272) await page.screenshot({path:join(qa,`notice-${theme}-compact.png`)});
  }
  record('notice text remains complete in all six themes and compact material views');
  assert.deepEqual(errors, []);
  writeFileSync(join(qa, 'results.json'), JSON.stringify({ base, checks, errors }, null, 2));
  writeFileSync(join(root, '.render', 'latest-release-upgrade.json'), JSON.stringify({ directory: qa, checks }, null, 2));
  console.log(`Release checks: ${checks.length}; artifacts: ${qa}`);
} finally { await context.close(); }
