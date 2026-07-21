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
