/** Injected only after the user invokes the extension on a permitted tab.
 * This function is self-contained because chrome.scripting serializes it.
 */
export function mountOverlay(url, token, preferences) {
  globalThis.__arcadeOverlay?.dispose();
  const host = document.createElement('div');
  host.setAttribute('data-arcade-counter-timer', '');
  host.style.cssText = 'all:initial!important;position:fixed!important;z-index:2147483647!important;display:block!important;';
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = `
    :host{color-scheme:dark} *{box-sizing:border-box}
    .widget{border:1px solid #67e6e6;border-radius:5px;background:#070b18;box-shadow:0 10px 35px #0009;overflow:hidden}
    .bar{height:32px;display:flex;align-items:center;gap:4px;padding:2px 5px;color:#a7dada;font:11px Consolas,monospace;background:#101b2c;user-select:none}
    .grip{flex:1;cursor:grab;padding:5px;touch-action:none;white-space:nowrap}
    button{font:12px Consolas,monospace;color:inherit;background:transparent;border:1px solid #456270;border-radius:3px;cursor:pointer;min-width:27px;height:25px}
    button:focus-visible,.grip:focus-visible{outline:2px solid #6fffff;outline-offset:-2px}
    iframe{display:block;width:100%;border:0;background:#070b18}
  `;
  const widget = document.createElement('div'); widget.className = 'widget';
  const bar = document.createElement('div'); bar.className = 'bar';
  const grip = document.createElement('span'); grip.className = 'grip';
  grip.textContent = '⠿ ARCADE'; grip.tabIndex = 0; grip.setAttribute('role', 'button');
  grip.setAttribute('aria-label', 'Move timer. Drag or use arrow keys.');
  const button = (text, title) => {
    const el = document.createElement('button'); el.type = 'button'; el.textContent = text; el.title = title;
    el.setAttribute('aria-label', title); bar.appendChild(el); return el;
  };
  bar.appendChild(grip);
  const lock = button('◇', 'Lock position');
  const size = button('↔', 'Toggle compact size');
  const close = button('×', 'Close timer');
  const frame = document.createElement('iframe');
  frame.title = 'Arcade Counter Timer';
  frame.src = url;
  widget.append(bar, frame); shadow.append(style, widget); document.documentElement.appendChild(host);
  let prefs = { ...preferences }, drag = null;
  function send(action, extra = {}) {
    return chrome.runtime.sendMessage({ channel: 'arcade-overlay', token, action, ...extra }).catch(() => null);
  }
  function layout() {
    const width = Math.min(prefs.compact ? 272 : 360, Math.max(160, innerWidth - 16));
    const height = Math.min(prefs.compact ? 424 : 576, Math.max(140, innerHeight - 16));
    prefs.x = Math.max(0, Math.min(prefs.x, innerWidth - width));
    prefs.y = Math.max(0, Math.min(prefs.y, innerHeight - height));
    host.style.setProperty('left', `${prefs.x}px`, 'important');
    host.style.setProperty('top', `${prefs.y}px`, 'important');
    host.style.setProperty('width', `${width}px`, 'important');
    frame.style.height = `${height - 34}px`;
    lock.textContent = prefs.locked ? '◆' : '◇'; lock.setAttribute('aria-pressed', String(prefs.locked));
    size.setAttribute('aria-pressed', String(prefs.compact));
    grip.style.cursor = prefs.locked ? 'default' : 'grab';
  }
  const save = () => send('placement', { value: { x: prefs.x, y: prefs.y, compact: prefs.compact, locked: prefs.locked } });
  grip.addEventListener('pointerdown', (event) => {
    if (prefs.locked || event.button !== 0) return;
    event.preventDefault(); drag = { x: event.clientX - prefs.x, y: event.clientY - prefs.y };
    grip.setPointerCapture(event.pointerId);
  });
  grip.addEventListener('pointermove', (event) => {
    if (!drag) return;
    prefs.x = event.clientX - drag.x; prefs.y = event.clientY - drag.y; layout();
  });
  const endDrag = () => { if (drag) { drag = null; save(); } };
  grip.addEventListener('pointerup', endDrag); grip.addEventListener('pointercancel', endDrag);
  grip.addEventListener('keydown', (event) => {
    if (prefs.locked || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const step = event.shiftKey ? 40 : 10;
    if (event.key === 'ArrowLeft') prefs.x -= step;
    if (event.key === 'ArrowRight') prefs.x += step;
    if (event.key === 'ArrowUp') prefs.y -= step;
    if (event.key === 'ArrowDown') prefs.y += step;
    layout(); save();
  });
  lock.addEventListener('click', () => { prefs.locked = !prefs.locked; layout(); save(); });
  size.addEventListener('click', () => { prefs.compact = !prefs.compact; layout(); save(); });
  function dispose() {
    host.remove(); window.removeEventListener('resize', layout); chrome.runtime.onMessage.removeListener(onMessage);
  }
  function onMessage(message) {
    if (message?.channel === 'arcade-overlay' && message.action === 'close') dispose();
  }
  close.addEventListener('click', () => { send('close'); dispose(); });
  chrome.runtime.onMessage.addListener(onMessage);
  window.addEventListener('resize', layout);
  globalThis.__arcadeOverlay = { dispose };
  layout();
}
