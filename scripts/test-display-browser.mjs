// Real extension, isolated profile, synthetic data. No installed user profile.
// PLAYWRIGHT_MODULE may point to an existing installation; no runtime dependency.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync, cpSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(import.meta.dirname, '..');
const qa = join(root, '.render', `display-qa-${Date.now()}`);
const extension = join(qa, 'extension');
const profile = join(qa, 'profile');
mkdirSync(extension, { recursive: true });
const base = '8925b8d382f10553cb39274ad3d8b3e2c6890859';
const files = ['manifest.json', 'popup.html', 'popup.css', 'popup.js', ...readdirSync(join(root, 'src')).map((name) => `src/${name}`)];
for (const file of files) {
  try {
    const content = execFileSync('git', ['show', `${base}:${file}`], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] });
    mkdirSync(resolve(extension, file, '..'), { recursive: true }); writeFileSync(join(extension, file), content);
  } catch { /* new modules do not exist in the upgrade source */ }
}
for (const dir of ['assets', '_locales']) cpSync(join(root, dir), join(extension, dir), { recursive: true });
const server = createServer((_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><html><head><title>Arcade QA · Study page</title><style>body{margin:0;background:#ecf1f5;color:#243342;font:18px system-ui}header{background:#10243a;color:#9ffaff;padding:24px}main{padding:28px;display:grid;grid-template-columns:2fr 1fr;gap:24px}.video{background:linear-gradient(135deg,#253557,#7182a8);height:380px;border-radius:14px;display:grid;place-items:center;color:white;font-size:42px}aside{background:white;padding:24px;border-radius:14px}input{font:inherit;width:90%;padding:12px}p{line-height:1.8}.long{height:1400px}</style></head><body><header>STUDY SESSION / Video & notes</header><main><section><div class="video">▶ Learning video</div><h1>Your space, your pace.</h1><p>Use the timer without covering your learning materials.</p><input aria-label="Notes" placeholder="Take a note…"><div class="long"></div></section><aside><h2>Transcript</h2><p>00:00 Introduction<br>03:12 Core concepts<br>08:25 Worked example</p></aside></main><script>window.spaceCount=0;addEventListener('keydown',e=>{if(e.code==='Space')window.spaceCount++})</script></body></html>`);
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const fixtureUrl = `http://127.0.0.1:${server.address().port}`;
let context;
const checks = [], images = [];
const launch = () => chromium.launchPersistentContext(profile, {
  headless: true, channel: 'chromium', viewport: { width: 1280, height: 900 }, locale: 'ja-JP',
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--enable-unsafe-extension-debugging']
});
const record = (name) => { checks.push(name); console.log(`PASS ${name}`); };
async function idFrom(cdp) {
  const { extensions } = await cdp.send('Extensions.getExtensions');
  const found = extensions.find((item) => item.name === 'Arcade Counter Timer');
  assert.ok(found, 'extension installed in isolated profile'); return found.id;
}
async function screenshot(page, name, options = {}) {
  const path = join(qa, `${name}.png`); await page.screenshot({ path, ...options }); images.push(path);
}
try {
  context = await launch();
  let browserCdp = await context.browser().newBrowserCDPSession();
  const id = await idFrom(browserCdp);
  const oldPage = await context.newPage();
  await oldPage.goto(`chrome-extension://${id}/popup.html`);
  const seed = { stateVersion: 2, timer: { running: false, sessionElapsedMs: 1458000, runStartedAt: null }, sessionCount: 73,
    history: { '2024-01-02': { timeMs: 7200000, count: 319 }, '2026-09-21': { timeMs: 8100000, count: 412 } },
    theme: 'arcade', settings: { clock: true, sound: false, flyText: true, chainEffect: true, subtleCrt: true } };
  await oldPage.evaluate(async (data) => { await chrome.storage.local.set(data); }, seed);
  await oldPage.close();
  for (const file of [...files, 'background.js']) { mkdirSync(resolve(extension, file, '..'), { recursive: true }); cpSync(join(root, file), join(extension, file)); }
  await browserCdp.send('Extensions.loadUnpacked', { path: extension });
  assert.equal(await idFrom(browserCdp), id, 'update must keep extension ID');
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  await worker.evaluate(async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });
  const after = await worker.evaluate(() => chrome.storage.local.get(null));
  for (const key of Object.keys(seed)) assert.deepEqual(after[key], seed[key], `update preserves ${key}`);
  assert.deepEqual(after.upgradeBackupV020, seed);
  assert.equal(after.releaseNotice.pending.version, '0.2.0');
  record('real 0.1.3 → 0.2.0 update preserves historical statistics and creates backup');

  const popup = await context.newPage();
  const errors = [];
  context.on('page', (page) => page.on('pageerror', (error) => errors.push(error.message)));
  popup.on('pageerror', (error) => errors.push(error.message));
  await popup.setViewportSize({ width: 360, height: 540 });
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.locator('#screen:not([inert])').waitFor();
  await popup.locator('#release-notice:not([hidden])').waitFor();
  assert.equal(await popup.locator('#count-value').innerText(), '73');
  await screenshot(popup, 'arcade-update-notice');
  const footerBottom = await popup.locator('.footer').evaluate((el) => el.getBoundingClientRect().bottom);
  assert.ok(footerBottom <= 540, `notice must fit: ${footerBottom}`);
  await popup.reload();
  await popup.locator('#screen:not([inert])').waitFor();
  assert.equal(await popup.locator('#release-notice').isVisible(), false);
  record('update notice renders under COUNT once and does not replay on reopen');
  for (const theme of ['original', 'editorial']) {
    await popup.locator('#btn-settings').click();
    await popup.locator(`label[for="theme-${theme}"]`).click();
    await popup.locator(`#screen[data-theme="${theme}"]`).waitFor();
    await popup.locator('#btn-back').click();
    // Visual fixture only: show bundled text again to inspect all theme skins.
    await popup.evaluate(async () => {
      const { updateNotice } = await import('./src/release.js');
      await chrome.storage.local.set({ releaseNotice: { pending: updateNotice('0.1.3') } });
    });
    await popup.reload(); await popup.locator('#release-notice:not([hidden])').waitFor();
    await screenshot(popup, `${theme}-update-notice`);
  }
  record('all three theme-specific update strips render');
  await popup.locator('#notice-close').click();
  await popup.locator('#btn-settings').click();
  await popup.locator('label[for="theme-arcade"]').click();
  await popup.locator('#display-mode').selectOption('floating');
  await popup.waitForFunction(() => document.querySelector('#display-mode').value === 'floating');
  // Wait for the actual action configuration, not just the local select value.
  await worker.evaluate(async () => {
    for (let i = 0; i < 50; i++) { if (await chrome.action.getPopup({}) === '') return; await new Promise((r) => setTimeout(r, 20)); }
    throw new Error('action configuration did not settle');
  });
  const web = await context.newPage(); await web.goto(fixtureUrl); await web.bringToFront();
  const { targetInfos } = await browserCdp.send('Target.getTargets', { filter: [{ type: 'tab', exclude: false }] });
  const targetInfo = targetInfos.find((target) => target.url === web.url());
  assert.ok(targetInfo, 'native tab target exists');
  await browserCdp.send('Extensions.triggerAction', { id, targetId: targetInfo.targetId });
  await web.locator('[data-arcade-counter-timer]').waitFor();
  let floating;
  for (let i = 0; i < 60 && !floating; i++) {
    floating = web.frames().find((f) => f.url().includes('surface=floating'));
    if (!floating) await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(floating, 'floating iframe attached');
  await floating.locator('#screen:not([inert])').waitFor();
  assert.equal(await floating.locator('#count-value').innerText(), '73');
  assert.ok(await floating.locator('.footer').evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight), 'compact controls must fit');
  await floating.locator('#btn-count').click();
  await floating.locator('#count-value').filter({ hasText: '74' }).waitFor();
  record('native extension action grants activeTab and floating view counts');
  const host = web.locator('[data-arcade-counter-timer]');
  const beforeMove = await host.boundingBox();
  await web.mouse.move(beforeMove.x + 70, beforeMove.y + 16); await web.mouse.down();
  await web.mouse.move(640, 530, { steps: 12 }); await web.mouse.up();
  const moved = await host.boundingBox();
  assert.ok(moved.x > beforeMove.x + 200 && moved.y > beforeMove.y + 200);
  await web.mouse.click(moved.x + moved.width - 80, moved.y + 16);
  await web.mouse.move(moved.x + 65, moved.y + 16); await web.mouse.down();
  await web.mouse.move(200, 200, { steps: 5 }); await web.mouse.up();
  assert.deepEqual(await host.boundingBox(), moved, 'locked placement must not drag');
  await web.mouse.click(moved.x + moved.width - 80, moved.y + 16);
  await web.mouse.click(moved.x + moved.width - 50, moved.y + 16);
  assert.equal(Math.round((await host.boundingBox()).width), 360);
  const full = await host.boundingBox();
  await web.mouse.click(full.x + full.width - 50, full.y + 16);
  assert.equal(Math.round((await host.boundingBox()).width), 272);
  await screenshot(web, 'floating-on-study-page');
  await web.locator('input').click(); await web.keyboard.type('Note'); await web.keyboard.press('Space');
  assert.equal(await web.evaluate(() => window.spaceCount), 1);
  assert.equal(await floating.locator('#count-value').innerText(), '74');
  record('drag and page-keyboard isolation work');
  const unauthorizedUrl = await worker.evaluate(() => chrome.runtime.getURL('popup.html?surface=floating&token=invalid'));
  await web.evaluate((url) => { const iframe = document.createElement('iframe'); iframe.id = 'unauthorized'; iframe.src = url; document.body.appendChild(iframe); }, unauthorizedUrl);
  let unauthorized;
  for (let i = 0; i < 60 && !unauthorized; i++) {
    unauthorized = web.frames().find((frame) => frame.url().includes('token=invalid'));
    if (!unauthorized) await new Promise((resolve) => setTimeout(resolve, 50));
  }
  await unauthorized.locator('#app-error:not([hidden])').waitFor();
  assert.equal(await unauthorized.locator('#screen').getAttribute('inert'), '');
  assert.equal(await unauthorized.locator('#count-value').innerText(), '0');
  await web.locator('#unauthorized').evaluate((el) => el.remove());
  record('an unauthorized web embedding cannot read statistics or enable controls');
  await web.setViewportSize({ width: 800, height: 640 });
  await web.waitForFunction(() => { const box = document.querySelector('[data-arcade-counter-timer]').getBoundingClientRect(); return box.right <= innerWidth + 1 && box.bottom <= innerHeight + 1; });
  const small = await host.boundingBox(); assert.ok(small.x + small.width <= 801 && small.y + small.height <= 641);
  const previousFrame = floating;
  await Promise.all([
    web.waitForEvent('framedetached', { predicate: (frame) => frame === previousFrame }),
    browserCdp.send('Extensions.triggerAction', { id, targetId: targetInfo.targetId })
  ]);
  floating = null;
  for (let i = 0; i < 60 && !floating; i++) {
    floating = web.frames().find((f) => f.url().includes('surface=floating'));
    if (!floating) await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(await host.count(), 1);
  await floating.locator('#screen:not([inert])').waitFor();
  record('repeated open avoids duplicates and viewport resize keeps timer reachable');
  await floating.locator('#btn-settings').click();
  await floating.locator('#display-mode').selectOption('sidepanel');
  await floating.locator('#btn-open-display').click();
  await host.waitFor({ state: 'detached' });
  const panels = await worker.evaluate(() => chrome.runtime.getContexts({ contextTypes: ['SIDE_PANEL'] }));
  assert.equal(panels.length, 1);
  record('user button opens a real native side panel and removes floating view');
  const panelPreview = await context.newPage();
  await panelPreview.setViewportSize({ width: 360, height: 800 });
  await panelPreview.goto(`chrome-extension://${id}/popup.html?surface=sidepanel`);
  await panelPreview.locator('#screen:not([inert])').waitFor();
  await screenshot(panelPreview, 'sidepanel-layout');
  await panelPreview.locator('#btn-count').click();
  await popup.locator('#btn-back').click();
  await popup.locator('#count-value').filter({ hasText: '75' }).waitFor();
  record('all open extension views receive shared count updates');
  await panelPreview.locator('#btn-settings').click();
  await panelPreview.locator('#display-mode').selectOption('popup');
  await panelPreview.locator('#btn-open-display').click();
  await worker.evaluate(async () => {
    for (let i = 0; i < 50; i++) { if ((await chrome.runtime.getContexts({ contextTypes: ['SIDE_PANEL'] })).length === 0) return; await new Promise((r) => setTimeout(r, 20)); }
    throw new Error('native side panel did not close');
  });
  assert.equal((await worker.evaluate(() => chrome.runtime.getContexts({ contextTypes: ['POPUP'] }))).length, 1);
  record('switching back opens the native popup and closes the side panel');
  await web.bringToFront();
  await panelPreview.locator('#display-mode').selectOption('sidepanel');
  await worker.evaluate(async () => {
    for (let i = 0; i < 50; i++) { if ((await chrome.sidePanel.getPanelBehavior()).openPanelOnActionClick) return; await new Promise((r) => setTimeout(r, 20)); }
    throw new Error('native side panel action was not configured');
  });
  await web.bringToFront();
  await browserCdp.send('Extensions.triggerAction', { id, targetId: targetInfo.targetId });
  await worker.evaluate(async () => {
    for (let i = 0; i < 50; i++) { if ((await chrome.runtime.getContexts({ contextTypes: ['SIDE_PANEL'] })).length) return; await new Promise((r) => setTimeout(r, 20)); }
    throw new Error('toolbar action did not open native side panel');
  });
  record('native toolbar action follows the selected side-panel mode');
  assert.deepEqual((await worker.evaluate(() => chrome.storage.local.get('history'))).history['2024-01-02'], seed.history['2024-01-02']);
  assert.deepEqual(errors, []);
  record('historical records remain and no uncaught page errors');
  await context.close();
  context = await launch();
  const restartedWorker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const restartedData = await restartedWorker.evaluate(() => chrome.storage.local.get(null));
  assert.equal(restartedData.sessionCount, 75);
  assert.deepEqual(restartedData.history['2024-01-02'], seed.history['2024-01-02']);
  assert.equal(restartedData.releaseNotice.pending, null);
  assert.equal(restartedData.displayPreferences.mode, 'sidepanel');
  record('browser restart preserves statistics, display mode and notice receipt');
  writeFileSync(join(qa, 'results.json'), JSON.stringify({ browser: context.browser().version(), checks, images }, null, 2));
  writeFileSync(join(root, '.render', 'latest-display-qa.json'), JSON.stringify({ directory: qa, checks, images }, null, 2));
  console.log(`Browser checks: ${checks.length}; artifacts: ${qa}`);
} finally {
  await context?.close(); server.close();
}
