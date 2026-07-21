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
import { loadState, saveState, clearAll } from './src/storage.js';
import { sounds, praiseForStreak, flyText, chainBurst } from './src/effects.js';

const STREAK_WINDOW_MS = 650;
const RESET_HOLD_MS = 650;
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
  countPad: $('count-pad'),
  countValue: $('count-value'),
  fxLayer: $('fx-layer'),
  live: $('live-region'),
  btnSettings: $('btn-settings'),
  btnBack: $('btn-back'),
  btnReset: $('btn-reset'),
  btnClear: $('btn-clear')
};

/** In-memory mirror of the stored state. */
let state = null;
/** Streak is intentionally ephemeral — it dies with the popup. */
let streak = 0;
let lastCountAt = 0;
let tickTimer = null;
let flushTimer = null;
let holdTimer = null;

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

function renderTimer() {
  const timer = state.timer;
  const live = timer.running && Number.isFinite(timer.runStartedAt)
    ? timer.sessionElapsedMs + clampMs(Date.now() - timer.runStartedAt)
    : timer.sessionElapsedMs;
  el.timerValue.textContent = formatDuration(live);
  el.timerState.textContent = timer.running ? 'RUNNING' : 'STOPPED';
  el.timer.classList.toggle('is-running', timer.running);
  el.runDot.classList.toggle('is-running', timer.running);
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

/* ------------------------------------------------------- session reset -- */

function resetSession() {
  flushRun();
  state.timer.running = false;
  state.timer.runStartedAt = null;
  state.timer.sessionElapsedMs = 0;
  state.sessionCount = 0;
  streak = 0;
  lastCountAt = 0;
  persist();
  renderTimer();
  renderCount();

  if (state.settings.sound) sounds.reset();
  el.btnReset.classList.add('is-done');
  setTimeout(() => el.btnReset.classList.remove('is-done'), 560);
  announce('Session reset. Statistics kept.');
}

function startHold() {
  if (holdTimer !== null) return;
  el.btnReset.classList.add('is-holding');
  holdTimer = setTimeout(() => {
    holdTimer = null;
    el.btnReset.classList.remove('is-holding');
    resetSession();
  }, RESET_HOLD_MS);
}

function cancelHold() {
  if (holdTimer !== null) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
  el.btnReset.classList.remove('is-holding');
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
  el.timer.addEventListener('click', toggleTimer);
  el.countPad.addEventListener('click', addCount);
  el.btnSettings.addEventListener('click', showStats);
  el.btnBack.addEventListener('click', showMain);

  el.btnReset.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    startHold();
  });
  for (const type of ['pointerup', 'pointerleave', 'pointercancel']) {
    el.btnReset.addEventListener(type, cancelHold);
  }
  // A plain click must never reset — the hold timer is the only path.
  el.btnReset.addEventListener('click', (e) => e.preventDefault());

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
    streak = 0;
    lastCountAt = 0;
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
  if (e.key === 'Escape' && statsVisible()) {
    showMain();
    return;
  }
  // Auto-repeat must never drive the counter or the timer.
  if (e.repeat) return;
  if (statsVisible()) return;
  // Let focused controls handle their own activation keys.
  const tag = e.target instanceof HTMLElement ? e.target.tagName : '';
  const onControl = tag === 'BUTTON' || tag === 'INPUT';

  if (e.code === 'Space' && !onControl) {
    e.preventDefault();
    addCount();
  } else if (e.key === 'Enter' && !onControl) {
    e.preventDefault();
    toggleTimer();
  } else if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    startHold();
  }
}

function onKeyUp(e) {
  if (e.key === 'r' || e.key === 'R') cancelHold();
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
