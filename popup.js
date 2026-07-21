import {
  formatDuration,
  formatCount,
  addIntervalToHistory,
  addCountToHistory,
  computeStats,
  pruneHistory,
  clampMs,
  chainLevel
} from './src/time.js';
import {
  loadState,
  saveState,
  clearAll,
  resetTimer,
  resetCount,
  resetSession
} from './src/storage.js';
import { sounds, praiseForStreak, flyText, chainBurst, clearFx } from './src/effects.js';
import { shortcutFor, isPointerActivation } from './src/input.js';

const STREAK_WINDOW_MS = 650;
const SESSION_HOLD_MS = 650;
const PART_HOLD_MS = 500;
const TICK_MS = 250;
const FLUSH_MS = 10000;

const $ = (id) => document.getElementById(id);

const el = {
  screen: $('screen'),
  viewMain: $('view-main'),
  viewStats: $('view-stats'),
  runDot: $('run-dot'),
  timer: $('timer'),
  timerValue: $('timer-value'),
  timerState: $('timer-state'),
  btnStartStop: $('btn-start-stop'),
  startStopIcon: $('start-stop-icon'),
  startStopLabel: $('start-stop-label'),
  countPad: $('count-pad'),
  btnCount: $('btn-count'),
  countValue: $('count-value'),
  fxLayer: $('fx-layer'),
  live: $('live-region'),
  btnSettings: $('btn-settings'),
  btnBack: $('btn-back'),
  btnReset: $('btn-reset'),
  btnResetTimer: $('btn-reset-timer'),
  btnResetCount: $('btn-reset-count'),
  btnClear: $('btn-clear')
};

/** In-memory mirror of the stored state. */
let state = null;
/** Streak is intentionally ephemeral — it dies with the popup. */
let streak = 0;
let lastCountAt = 0;
let tickTimer = null;
let flushTimer = null;
/** Hold controller for SESSION RESET, so the R key can drive the same button. */
let sessionHold = null;

/* ------------------------------------------------------------ persist -- */

function persist() {
  saveState(state).catch(() => {
    /* storage failures must not break the UI */
  });
}

/**
 * Move the time accrued since `runStartedAt` into the day history and rebase
 * the run start. Called on open, periodically, on stop and on close so long
 * runs are attributed to the right calendar days.
 */
function flushRun(now = Date.now()) {
  const timer = state.timer;
  if (!timer.running || !Number.isFinite(timer.runStartedAt)) return false;
  const start = Math.min(timer.runStartedAt, now);
  const delta = clampMs(now - timer.runStartedAt);
  if (delta <= 0) {
    timer.runStartedAt = now;
    return false;
  }
  state.history = addIntervalToHistory(state.history, start, now);
  timer.sessionElapsedMs = clampMs(timer.sessionElapsedMs) + delta;
  timer.runStartedAt = now;
  return true;
}

/* ------------------------------------------------------------- render -- */

/** Only the digits change on every tick; the controls change on toggle. */
function renderTimer() {
  const timer = state.timer;
  const live = timer.running && Number.isFinite(timer.runStartedAt)
    ? timer.sessionElapsedMs + clampMs(Date.now() - timer.runStartedAt)
    : timer.sessionElapsedMs;
  el.timerValue.textContent = formatDuration(live);
  renderTimerControls();
}

let renderedRunning = null;

function renderTimerControls() {
  const running = state.timer.running;
  if (running === renderedRunning) return;
  renderedRunning = running;

  el.timerState.textContent = running ? 'RUNNING' : 'STOPPED';
  el.timer.classList.toggle('is-running', running);
  el.runDot.classList.toggle('is-running', running);

  el.startStopIcon.textContent = running ? '■' : '▶';
  el.startStopLabel.textContent = running ? 'STOP' : 'START';
  el.btnStartStop.classList.toggle('is-running', running);
  el.btnStartStop.setAttribute('aria-pressed', String(running));
  el.btnStartStop.setAttribute('aria-label', running ? 'Stop the timer' : 'Start the timer');
}

function renderCount() {
  el.countValue.textContent = formatCount(state.sessionCount);
}

function renderSettings() {
  for (const input of document.querySelectorAll('[data-setting]')) {
    input.checked = Boolean(state.settings[input.dataset.setting]);
  }
  el.screen.classList.toggle('crt', state.settings.subtleCrt);
}

function renderStats() {
  const stats = computeStats(state.history, new Date());
  for (const key of ['today', 'week', 'month', 'year']) {
    $(`stat-${key}-time`).textContent = formatDuration(stats[key].timeMs);
    $(`stat-${key}-count`).textContent = formatCount(stats[key].count);
  }
}

function announce(message) {
  el.live.textContent = message;
}

/* -------------------------------------------------------------- timer -- */

function toggleTimer() {
  const now = Date.now();
  if (state.timer.running) {
    flushRun(now);
    state.timer.running = false;
    state.timer.runStartedAt = null;
  } else {
    state.timer.running = true;
    state.timer.runStartedAt = now;
  }
  persist();
  renderTimer();
  if (state.settings.sound) sounds.toggle(state.timer.running);
  announce(state.timer.running ? 'Timer started' : 'Timer stopped');
}

/* ------------------------------------------------------------- counter -- */

function addCount() {
  const now = Date.now();
  streak = now - lastCountAt <= STREAK_WINDOW_MS ? streak + 1 : 1;
  lastCountAt = now;

  state.sessionCount += 1;
  state.history = addCountToHistory(state.history, new Date(now), 1);
  persist();
  renderCount();

  el.countValue.classList.remove('is-bump');
  void el.countValue.offsetWidth; // restart the animation
  el.countValue.classList.add('is-bump');

  if (state.settings.sound) sounds.count(streak);

  const level = chainLevel(state.sessionCount);
  if (level > 0) {
    if (state.settings.chainEffect) {
      chainBurst(el.fxLayer, level, el.screen);
      el.countValue.classList.remove('is-chain');
      void el.countValue.offsetWidth;
      el.countValue.classList.add('is-chain');
    }
    if (state.settings.sound) sounds.chain(level);
    announce(`${state.sessionCount}, chain ${level}`);
    return;
  }

  if (state.settings.flyText) {
    const praise = praiseForStreak(streak);
    if (praise) flyText(el.fxLayer, praise.text, praise.tone);
  }
}

/* -------------------------------------------------------------- resets -- */

/** Clear the ephemeral, popup-only streak / chain state. */
function clearEphemeral() {
  streak = 0;
  lastCountAt = 0;
  el.countValue.classList.remove('is-chain', 'is-bump');
  clearFx(el.fxLayer);
}

function finishReset(button, message) {
  persist();
  renderTimer();
  renderCount();
  button.classList.add('is-done');
  setTimeout(() => button.classList.remove('is-done'), 560);
  announce(message);
}

function doResetTimer() {
  // resetTimer() folds the in-flight run into the day history itself.
  state = resetTimer(state, Date.now());
  if (state.settings.sound) sounds.reset(false);
  finishReset(el.btnResetTimer, 'Timer reset. Count and statistics kept.');
}

function doResetCount() {
  state = resetCount(state);
  clearEphemeral();
  if (state.settings.sound) sounds.clear();
  finishReset(el.btnResetCount, 'Count reset. Timer and statistics kept.');
}

function doResetSession() {
  state = resetSession(state, Date.now());
  clearEphemeral();
  if (state.settings.sound) sounds.reset(true);
  finishReset(el.btnReset, 'Session reset. Statistics kept.');
}

/**
 * Wire a primary button (START/STOP, COUNT). Identical to a plain click
 * listener, except a pointer activation releases focus afterwards so the next
 * Space or Enter is read as a global shortcut instead of re-pressing the
 * button. Keyboard activation keeps focus and the focus ring.
 */
function bindPrimaryAction(element, callback) {
  let viaPointer = false;

  element.addEventListener('pointerdown', () => {
    viaPointer = true;
  });
  // A key press on the button means this activation is not pointer-driven,
  // even if an earlier pointerdown never produced a click.
  element.addEventListener('keydown', () => {
    viaPointer = false;
  });

  element.addEventListener('click', (e) => {
    const fromPointer = isPointerActivation({ detail: e.detail, viaPointer });
    viaPointer = false;
    callback();
    if (fromPointer) element.blur();
  });
}

/**
 * Hold-to-confirm: a short press does nothing, releasing or leaving early
 * cancels. Returns { start, cancel } so a key can drive the same button.
 */
function bindHoldAction(element, durationMs, callback) {
  let timer = null;

  element.style.setProperty('--hold-ms', `${durationMs}ms`);

  const cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    element.classList.remove('is-holding');
  };

  const start = () => {
    if (timer !== null) return;
    element.classList.add('is-holding');
    timer = setTimeout(() => {
      timer = null;
      element.classList.remove('is-holding');
      callback();
    }, durationMs);
  };

  element.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    start();
  });
  for (const type of ['pointerup', 'pointerleave', 'pointercancel']) {
    element.addEventListener(type, cancel);
  }
  // A plain click must never reset — the hold timer is the only path.
  element.addEventListener('click', (e) => e.preventDefault());

  // Same hold contract for keyboard users on the focused button.
  element.addEventListener('keydown', (e) => {
    if (e.repeat || (e.key !== 'Enter' && e.code !== 'Space')) return;
    e.preventDefault();
    start();
  });
  element.addEventListener('keyup', (e) => {
    if (e.key === 'Enter' || e.code === 'Space') cancel();
  });
  element.addEventListener('blur', cancel);

  return { start, cancel };
}

/* --------------------------------------------------------------- views -- */

function statsVisible() {
  return !el.viewStats.hidden;
}

function showStats() {
  flushRun();
  persist();
  renderStats();
  el.viewMain.hidden = true;
  el.viewStats.hidden = false;
  el.btnBack.focus();
}

function showMain() {
  el.viewStats.hidden = true;
  el.viewMain.hidden = false;
  el.btnSettings.focus();
}

/* ------------------------------------------------------------- events -- */

function bindEvents() {
  // Every entry point funnels into the same two functions — no duplicated
  // state changes. Timer/count displays are mouse shortcuts for the buttons.
  bindPrimaryAction(el.btnStartStop, toggleTimer);
  bindPrimaryAction(el.btnCount, addCount);
  el.timer.addEventListener('click', toggleTimer);
  el.countPad.addEventListener('click', addCount);
  el.btnSettings.addEventListener('click', showStats);
  el.btnBack.addEventListener('click', showMain);

  bindHoldAction(el.btnResetTimer, PART_HOLD_MS, doResetTimer);
  bindHoldAction(el.btnResetCount, PART_HOLD_MS, doResetCount);
  sessionHold = bindHoldAction(el.btnReset, SESSION_HOLD_MS, doResetSession);

  for (const input of document.querySelectorAll('[data-setting]')) {
    input.addEventListener('change', () => {
      state.settings[input.dataset.setting] = input.checked;
      persist();
      renderSettings();
    });
  }

  el.btnClear.addEventListener('click', async () => {
    if (!window.confirm('Clear all data? Timer, count, history and settings reset.')) return;
    state = await clearAll();
    clearEphemeral();
    renderTimer();
    renderCount();
    renderSettings();
    renderStats();
    announce('All data cleared');
  });

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  window.addEventListener('pagehide', () => {
    if (flushRun()) persist();
  });
}

function onKeyDown(e) {
  const action = shortcutFor({
    key: e.key,
    code: e.code,
    repeat: e.repeat,
    tagName: e.target instanceof HTMLElement ? e.target.tagName : '',
    statsVisible: statsVisible()
  });
  if (action === null) return;

  e.preventDefault();
  if (action === 'count') addCount();
  else if (action === 'timer') toggleTimer();
  else if (action === 'reset') sessionHold.start();
  else if (action === 'back') showMain();
}

function onKeyUp(e) {
  if ((e.key === 'r' || e.key === 'R') && sessionHold) sessionHold.cancel();
}

/* ---------------------------------------------------------------- boot -- */

async function init() {
  state = await loadState();

  // Attribute anything that elapsed while the popup was closed, then tidy up.
  const changed = flushRun();
  const pruned = pruneHistory(state.history, new Date());
  const prunedAny = Object.keys(pruned).length !== Object.keys(state.history).length;
  state.history = pruned;
  if (changed || prunedAny) persist();

  renderSettings();
  renderTimer();
  renderCount();
  bindEvents();

  tickTimer = setInterval(renderTimer, TICK_MS);
  flushTimer = setInterval(() => {
    if (flushRun()) persist();
  }, FLUSH_MS);
}

window.addEventListener('unload', () => {
  clearInterval(tickTimer);
  clearInterval(flushTimer);
});

init();
