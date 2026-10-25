import test from 'node:test';
import assert from 'node:assert/strict';
import { createFlapRenderer } from '../src/flaps.js';

class Node {
  constructor() { this.children=[]; this.dataset={}; this.attributes={}; this._text=''; this.animations=[]; }
  set textContent(value) { this._text=value; this.children=[]; }
  get textContent() { return this._text+this.children.map(n=>n.textContent).join(''); }
  setAttribute(k,v) { this.attributes[k]=v; }
  append(...nodes) { for(const node of nodes) { node.parent=this; this.children.push(node); } }
  replaceChildren(...nodes) { this._text=''; this.children=[]; this.append(...nodes); }
  remove() { if(this.parent) this.parent.children=this.parent.children.filter(n=>n!==this); }
  animate(frames,options) {
    let resolve,reject;
    const animation={frames,options,cancelled:false,finished:new Promise((a,b)=>{resolve=a;reject=b}),finish:()=>resolve(),cancel(){this.cancelled=true;reject(new Error('cancel'));}};
    this.animations.push(animation); return animation;
  }
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const setup=()=>{let reduced=false;const renderer=createFlapRenderer({createElement:()=>new Node()},()=>reduced);return {renderer,readout:new Node(),reduce:()=>{reduced=true}}};

test('split flap updates live text immediately and animates only the changed persistent digit',()=>{
  const {renderer,readout}=setup();renderer.render(readout,'00009');const old=[...readout.children];renderer.render(readout,'00010');
  assert.equal(readout.textContent,'00010');assert.equal(readout.children[0],old[0]);assert.equal(readout.children[4],old[4]);
  assert.equal(readout.children[0].children.length,1);
  const layer=readout.children[4].children[1];assert.equal(layer.attributes['aria-hidden'],'true');
  assert.deepEqual(layer.children.map(face=>face.dataset.glyph),['9','9','0']);
  assert.equal(layer.children[0].animations[0].frames[1].transform,'rotateX(-90deg)');
  assert.equal(layer.children[2].animations[0].frames[1].transform,'rotateX(90deg)');
  assert.equal(layer.children[2].animations[0].options.duration,440);
});
test('rapid changes, undo and rollover cancel stale frames without removing the latest transition',async()=>{
  const {renderer,readout}=setup();renderer.render(readout,'00099');renderer.render(readout,'00100');
  const prior=readout.children[4].children[1];renderer.render(readout,'00101');const latest=readout.children[4].children[1];
  assert.ok(prior.children.every(n=>n.animations[0].cancelled));await flush();assert.equal(readout.children[4].children[1],latest);
  renderer.render(readout,'00100');assert.equal(readout.textContent,'00100');
  renderer.render(readout,'00:59:59');renderer.render(readout,'01:00:00');assert.equal(readout.textContent,'01:00:00');
  renderer.render(readout,'100:00:00');assert.equal(readout.textContent,'100:00:00');
  renderer.dispose();await flush();assert.ok(readout.children.every(n=>n.children.length<=1));
});
test('completed transitions remove decorative layers and unchanged renders preserve an in-flight flap',async()=>{
  const {renderer,readout}=setup();renderer.render(readout,'00041');renderer.render(readout,'00042');const digit=readout.children[4],layer=digit.children[1];
  renderer.render(readout,'00042');assert.equal(digit.children[1],layer);
  for(const face of layer.children)face.animations[0].finish();await flush();assert.equal(digit.children.length,1);assert.equal(readout.textContent,'00042');
});
test('theme clear and reduced motion leave current text with no animation queue',async()=>{
  const {renderer,readout,reduce}=setup();renderer.render(readout,'00009');renderer.render(readout,'00010');
  const active=readout.children[4].children[1];renderer.cancelMotion();await flush();
  assert.ok(active.children.every(n=>n.animations[0].cancelled));assert.equal(readout.textContent,'00010');assert.ok(readout.children.every(n=>n.children.length<=1));
  renderer.render(readout,'00011');renderer.clear(readout);await flush();assert.equal(readout.textContent,'00011');assert.ok(readout.children.every(n=>n.children.length<=1));
  reduce();renderer.render(readout,'00011');renderer.render(readout,'00012');assert.equal(readout.textContent,'00012');assert.ok(readout.children.every(n=>n.children.length<=1));
});
