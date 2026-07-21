import test from 'node:test';
import assert from 'node:assert/strict';

import { isInteractiveTarget, shortcutFor, isPointerActivation } from '../src/input.js';

const press = (over) => shortcutFor({ key: '', code: '', ...over });
const SPACE = { key: ' ', code: 'Space' };
const ENTER = { key: 'Enter', code: 'Enter' };

test('interactive targets are recognised regardless of case', () => {
  for (const tag of ['BUTTON', 'input', 'Select', 'TEXTAREA', 'a']) {
    assert.equal(isInteractiveTarget(tag), true, tag);
  }
  for (const tag of ['DIV', 'BODY', 'SPAN', '', undefined, null]) {
    assert.equal(isInteractiveTarget(tag), false, String(tag));
  }
});

test('Space counts and Enter toggles the timer from the page body', () => {
  assert.equal(press({ ...SPACE, tagName: 'BODY' }), 'count');
  assert.equal(press({ ...ENTER, tagName: 'DIV' }), 'timer');
});

test('a focused control keeps its own activation keys — no double handling', () => {
  // The button's native click does the work; the shortcut stands down.
  for (const tag of ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A']) {
    assert.equal(press({ ...SPACE, tagName: tag }), null, `Space on ${tag}`);
    assert.equal(press({ ...ENTER, tagName: tag }), null, `Enter on ${tag}`);
  }
});

test('auto-repeat never drives an action', () => {
  assert.equal(press({ ...SPACE, tagName: 'BODY', repeat: true }), null);
  assert.equal(press({ ...ENTER, tagName: 'BODY', repeat: true }), null);
  assert.equal(press({ key: 'r', tagName: 'BODY', repeat: true }), null);
});

test('one event yields at most one action', () => {
  const actions = [
    press({ ...SPACE, tagName: 'BODY' }),
    press({ ...ENTER, tagName: 'BODY' }),
    press({ key: 'R', tagName: 'BODY' })
  ];
  assert.deepEqual(actions, ['count', 'timer', 'reset']);
});

test('hold R starts a session reset from anywhere on the main view', () => {
  assert.equal(press({ key: 'r', tagName: 'BODY' }), 'reset');
  assert.equal(press({ key: 'R', tagName: 'BUTTON' }), 'reset');
});

test('the stats view only answers Escape', () => {
  assert.equal(press({ ...SPACE, tagName: 'BODY', statsVisible: true }), null);
  assert.equal(press({ ...ENTER, tagName: 'BODY', statsVisible: true }), null);
  assert.equal(press({ key: 'r', tagName: 'BODY', statsVisible: true }), null);
  assert.equal(press({ key: 'Escape', tagName: 'BODY', statsVisible: true }), 'back');
});

test('Escape does nothing on the main view', () => {
  assert.equal(press({ key: 'Escape', tagName: 'BODY' }), null);
});

test('unrelated keys are ignored', () => {
  for (const key of ['a', 'Tab', 'ArrowUp', 'Shift']) {
    assert.equal(press({ key, code: key, tagName: 'BODY' }), null, key);
  }
});

test('shortcutFor tolerates being called with no argument', () => {
  assert.equal(shortcutFor(), null);
});

/* ------------------------------------------------ pointer vs keyboard -- */

test('a mouse click is pointer-driven, so the button gives focus back', () => {
  // Chrome: click after a real press carries detail >= 1.
  assert.equal(isPointerActivation({ detail: 1, viaPointer: true }), true);
  assert.equal(isPointerActivation({ detail: 2, viaPointer: true }), true);
});

test('touch and pen count as pointer even when detail is unhelpful', () => {
  // The preceding pointerdown is what proves it, not detail.
  assert.equal(isPointerActivation({ detail: 0, viaPointer: true }), true);
});

test('a keyboard click keeps focus on the button', () => {
  // Enter and Space synthesise a click with detail 0 and no pointerdown.
  assert.equal(isPointerActivation({ detail: 0, viaPointer: false }), false);
});

test('a stray detail without a pointerdown is still treated as a pointer', () => {
  assert.equal(isPointerActivation({ detail: 1, viaPointer: false }), true);
});

test('isPointerActivation defaults to keyboard when told nothing', () => {
  assert.equal(isPointerActivation(), false);
  assert.equal(isPointerActivation({}), false);
});
