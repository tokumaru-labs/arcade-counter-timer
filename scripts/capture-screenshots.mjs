/** Capture the shipped extension UI in an isolated Chromium profile.
 * Synthetic records only; no user profile, shim, CSS override or painted UI.
 * PLAYWRIGHT_MODULE may point to an existing development installation.
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(import.meta.dirname, '..');
const out = join(root, 'store-assets', 'source');
const qa = join(root, '.render', `store-capture-${Date.now()}`);
mkdirSync(out, { recursive: true }); mkdirSync(qa, { recursive: true });
const context = await chromium.launchPersistentContext(join(qa, 'profile'), {
  headless: true, channel: 'chromium', locale: 'en-US',
  args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`]
});
const images = [], errors = [], external = [];
context.on('request', req => { if (/^https?:/.test(req.url())) external.push(req.url()); });
try {
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).host;
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  const capture = async name => {
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#count-value').evaluate(el => Promise.all(el.getAnimations({subtree:true}).map(a => a.finished.catch(()=>{}))));
    const file = join(out, name); await page.screenshot({ path: file }); images.push(file); console.log(file);
  };
  for (const theme of ['space-age','arcade','editorial','steampunk','art-deco','nixie']) {
    await worker.evaluate(async theme => {
      const today = new Date(), key = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const history = {};
      for (let i=0;i<20;i++) { const d = new Date(today.getFullYear(),today.getMonth(),today.getDate()-i); history[key(d)]={count:20+i,timeMs:(25+i)*60000}; }
      await chrome.storage.local.set({stateVersion:4,theme,sessionCount:40,countUndo:null,history,
        timer:{running:false,sessionElapsedMs:1458000,runStartedAt:null},
        settings:{clock:false,sound:false,flyText:false,chainEffect:false,subtleCrt:false}});
    }, theme);
    await page.setViewportSize(['arcade','editorial'].includes(theme)?{width:360,height:540}:{width:600,height:520});
    await page.goto(`chrome-extension://${id}/popup.html`); await page.locator('#screen:not([inert])').waitFor();
    // Real controller operations establish two undoable steps and enable UNDO.
    await page.locator('#btn-count').click(); await page.locator('#btn-count').click();
    await page.waitForFunction(()=>document.querySelector('#count-value').getAttribute('aria-label')==='42');
    if(theme==='nixie') await page.waitForFunction(()=>document.body.dataset.tubesReady==='true');
    const stem = theme==='space-age'?'popup':`popup-${theme}`;
    await capture(`${stem}-main.png`);
    if(theme==='space-age') {
      await page.locator('#btn-undo-count').click(); await page.waitForFunction(()=>document.querySelector('#count-value').getAttribute('aria-label')==='41');
      await page.locator('#btn-undo-count').click(); await page.waitForFunction(()=>document.querySelector('#count-value').getAttribute('aria-label')==='40');
      await capture('popup-undo.png');
    }
    await page.locator('#btn-settings').click(); await capture(`${stem}-stats.png`);
  }
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  writeFileSync(join(qa,'results.json'),JSON.stringify({images,errors,external},null,2));
  writeFileSync(join(root,'.render','latest-store-capture.json'),JSON.stringify({directory:qa,images},null,2));
} finally { await context.close(); }
