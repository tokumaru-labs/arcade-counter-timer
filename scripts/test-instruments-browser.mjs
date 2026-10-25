// Real extension and deterministic animation-frame inspection, synthetic data.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=resolve(import.meta.dirname,'..');
const qa=join(root,'.render',`instruments-qa-${Date.now()}`);
mkdirSync(qa,{recursive:true});
const context=await chromium.launchPersistentContext(join(qa,'profile'),{headless:true,channel:'chromium',viewport:{width:600,height:520},recordVideo:{dir:join(qa,'video'),size:{width:600,height:520}},args:[`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
const checks=[],images=[],errors=[],timingFrames=[];
const record=name=>{checks.push(name);console.log(`PASS ${name}`)};
const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
const capture=async name=>{const path=join(qa,`${name}.png`);await page.screenshot({path});images.push(path)};
let videoPath;
try{
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 const id=new URL(worker.url()).host;
 const seed=async(theme,count=9,time=3599000)=>worker.evaluate(({theme,count,time})=>chrome.storage.local.set({stateVersion:3,theme,sessionCount:count,countUndo:null,timer:{running:false,sessionElapsedMs:time,runStartedAt:null},history:{},settings:{clock:true,sound:false,flyText:false,chainEffect:false,subtleCrt:false}}),{theme,count,time});
 await seed('nixie',7891,12296000);
 await page.goto(`chrome-extension://${id}/popup.html`);await page.locator('#screen:not([inert])').waitFor();await page.waitForFunction(()=>document.body.dataset.tubesReady==='true');await page.evaluate(()=>document.fonts.ready);
 // Valid timer/count values together show every cathode at the normal size.
 assert.equal(await page.locator('.instrument-digit').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.dataset.digit))].sort().join('')),'0123456789');
 await capture('nixie-all-digits');
 await seed('nixie',42,1458000);await page.waitForFunction(()=>document.querySelector('#count-value').textContent==='00042');
 await page.evaluate(()=>{window.beforeTubes=[...document.querySelectorAll('#count-value .instrument-digit')];window.beforeHousings=window.beforeTubes.map(n=>n.querySelector('.nixie-housing'));});
 await capture('nixie-housing-before');
 await page.locator('#btn-count').click();await page.waitForFunction(()=>document.querySelector('#count-value').getAttribute('aria-label')==='43');
 assert.ok(await page.evaluate(()=>window.beforeTubes.every((n,i)=>document.querySelectorAll('#count-value .instrument-digit')[i]===n&&n.querySelector('.nixie-housing')===window.beforeHousings[i])));
 assert.ok(await page.locator('#count-value .instrument-digit').evaluateAll(nodes=>nodes.every(n=>n.querySelector('.nixie-housing').complete&&n.querySelector('.nixie-housing').naturalWidth===841&&getComputedStyle(n,'::before').backgroundImage.includes(`nixie-${n.dataset.digit}.jpg`))));
 await page.locator('#count-value').evaluate(el=>Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{}))));
 await capture('nixie-housing-after');record('Nixie changes the cathode only; complete housing nodes stay fixed');
 await seed('steampunk');await page.locator('#screen[data-theme="steampunk"]').waitFor();await page.waitForFunction(()=>document.querySelector('#count-value').textContent==='00009');
 await page.evaluate(()=>{window.beforeFlaps=[...document.querySelector('#count-value').children]});
 await page.locator('#btn-count').click();await page.waitForFunction(()=>document.querySelector('#count-value').textContent==='00010');
 const anatomy=await page.evaluate(()=>{
  const value=document.querySelector('#count-value');window.flapAnimations=value.getAnimations({subtree:true}).filter(a=>a.effect.target.classList.contains('flap-face'));window.flapAnimations.forEach(a=>{a.pause();a.currentTime=0});
  return{count:value.textContent,frames:window.flapAnimations.length,same:[...value.children].every((node,i)=>node===window.beforeFlaps[i]),layers:[...value.children].map(n=>n.querySelectorAll('.flap-layer').length),glyphs:[...value.lastElementChild.querySelectorAll('.flap-face')].map(n=>n.dataset.glyph)};
 });
 assert.deepEqual(anatomy,{count:'00010',frames:6,same:true,layers:[0,0,0,1,1],glyphs:['9','9','0']});
 // Parent press effect can finish while the physical leaves remain paused.
 await page.waitForTimeout(220);
 for(const at of [0,110,220,330]){
  await page.evaluate(t=>{window.flapAnimations.forEach(a=>{a.currentTime=t})},at);await page.evaluate(()=>new Promise(requestAnimationFrame));
  const frames=await page.locator('#count-value .instrument-digit').last().evaluate(node=>{
   const top=node.querySelector('.flap-old-top'),bottom=node.querySelector('.flap-new-bottom');
   const ts=getComputedStyle(top),bs=getComputedStyle(bottom),tm=new DOMMatrixReadOnly(ts.transform),bm=new DOMMatrixReadOnly(bs.transform);
   return{top:ts.transform,bottom:bs.transform,topOrigin:ts.transformOrigin,bottomOrigin:bs.transformOrigin,faceHeight:parseFloat(ts.height),topCos:tm.m22,topSin:tm.m23,bottomCos:bm.m22,bottomSin:bm.m23};
  });
  assert.notEqual(frames.top,'none');assert.notEqual(frames.bottom,'none');
  timingFrames.push({at,...frames});
  assert.ok(Math.abs(parseFloat(frames.topOrigin.split(' ')[1])-frames.faceHeight)<.01);assert.ok(frames.bottomOrigin.endsWith(' 0px'));
  if(at===110){assert.ok(Math.abs(frames.topCos-Math.SQRT1_2)<.01&&frames.topSin<-.7);assert.ok(Math.abs(frames.bottomCos)<.01);}
  if(at===330){assert.ok(Math.abs(frames.topCos)<.01);assert.ok(Math.abs(frames.bottomCos-Math.SQRT1_2)<.01&&frames.bottomSin>.7);}
  await capture(`steampunk-flap-${at}ms`);
 }
 await page.evaluate(()=>window.flapAnimations.forEach(a=>a.finish()));await page.waitForFunction(()=>document.querySelectorAll('.flap-layer').length===0);await capture('steampunk-flap-final');record('9 to 10 uses two persistent split flaps with old/new glyphs and captured 0/110/220/330 ms stages');
 await page.locator('#btn-undo-count').click();await page.waitForFunction(()=>document.querySelector('#count-value').textContent==='00009');await page.waitForTimeout(550);
 await seed('steampunk',98);await page.waitForFunction(()=>document.querySelector('#count-value').textContent==='00098');await page.waitForTimeout(500);
 for(let i=0;i<4;i++)await page.locator('#btn-count').click();
 await page.waitForFunction(()=>document.querySelector('#count-value').textContent==='00102');await page.locator('#btn-undo-count').click();await page.waitForFunction(()=>document.querySelector('#count-value').textContent==='00101');await page.waitForTimeout(550);
 assert.equal(await page.locator('.flap-layer').count(),0);assert.equal((await worker.evaluate(()=>chrome.storage.local.get('sessionCount'))).sessionCount,101);record('rapid 99 to 100 rollover and UNDO settle to worker value with no old layers');
 await seed('steampunk',101,3599000);await page.waitForFunction(()=>document.querySelector('#timer-value').textContent==='00:59:59');await page.waitForTimeout(500);
 await page.locator('#btn-start-stop').click();await page.waitForFunction(()=>document.querySelector('#timer-value').textContent==='01:00:00');assert.ok(await page.locator('#timer-value .flap-layer').count()>0);await capture('steampunk-timer-rollover');await page.locator('#btn-start-stop').click();await page.waitForTimeout(550);assert.equal(await page.locator('.flap-layer').count(),0);record('running timer 59 to 00 flips changed digits and stop leaves no stale faces');
 await page.locator('#btn-count').click();await page.locator('#count-value .flap-layer').first().waitFor();await page.evaluate(()=>chrome.runtime.sendMessage({channel:'arcade',action:'theme',value:'arcade'}));await page.locator('#screen[data-theme="arcade"]').waitFor();assert.equal(await page.locator('.flap-layer').count(),0);
 await page.evaluate(()=>chrome.runtime.sendMessage({channel:'arcade',action:'theme',value:'steampunk'}));await page.locator('#screen[data-theme="steampunk"]').waitFor();await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#btn-count').click();await page.waitForFunction(()=>document.querySelector('#count-value').textContent==='00103');assert.equal(await page.locator('.flap-layer').count(),0);
 assert.equal(await page.locator('#count-value').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.effect.target.classList.contains('flap-face')).length),0);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#btn-count').click();await page.locator('.flap-layer').first().waitFor();await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelectorAll('.flap-layer').length===0);
 assert.equal(await page.locator('#count-value').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.effect.target.classList.contains('flap-face')).length),0);
 record('theme changes cancel faces; reduced motion skips or cancels active WAAPI animations');
 assert.deepEqual(errors,[]);videoPath=await page.video().path();
 writeFileSync(join(qa,'results.json'),JSON.stringify({checks,images,timingFrames,video:videoPath},null,2));writeFileSync(join(root,'.render','latest-instruments-qa.json'),JSON.stringify({directory:qa,checks,images,video:videoPath},null,2));console.log(`Instrument checks: ${checks.length}; artifacts: ${qa}`);
}finally{await context.close()}
