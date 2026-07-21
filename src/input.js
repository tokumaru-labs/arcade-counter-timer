// Pure keyboard routing. Keeps the "one input, one action" rules in one place,
// away from the DOM, so they can be tested directly.

const INTERACTIVE_TAGS = new Set(['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A']);

/**
 * Is the key event coming from a control that handles its own activation keys?
 * When it is, the control wins and the global shortcut stands down — that is
 * what stops one press from being handled twice.
 */
export function isInteractiveTarget(tagName) {
  return INTERACTIVE_TAGS.has(String(tagName || '').toUpperCase());
}

/**
 * Did a click come from a pointer (mouse / touch / pen) rather than a key?
 * Chrome reports `detail: 0` for clicks synthesised by Enter or Space, while a
 * real pointer press reports at least 1; `viaPointer` is the pointerdown seen
 * just before the click, which also covers touch and pen.
 *
 * Primary buttons blur themselves after a pointer activation so that Space and
 * Enter go back to their global meanings; after a keyboard activation focus
 * stays put.
 */
export function isPointerActivation({ detail = 0, viaPointer = false } = {}) {
  return viaPointer || detail > 0;
}

/**
 * Which global shortcut a keydown should run: 'count' | 'timer' | 'reset' |
 * 'back' | null. Never returns more than one action for a single event.
 */
export function shortcutFor({
  key,
  code,
  repeat = false,
  tagName = '',
  statsVisible = false
} = {}) {
  if (key === 'Escape') return statsVisible ? 'back' : null;
  // Auto-repeat must never drive the counter, the timer or a reset.
  if (repeat) return null;
  if (statsVisible) return null;
  // Hold-R stays available from anywhere on the main view; the hold timer,
  // not the keypress, is what actually resets.
  if (key === 'r' || key === 'R') return 'reset';
  if (isInteractiveTarget(tagName)) return null;
  if (code === 'Space') return 'count';
  if (key === 'Enter') return 'timer';
  return null;
}
