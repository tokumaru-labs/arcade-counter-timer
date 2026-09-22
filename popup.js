import {
  formatDuration,
  formatCount,
  addIntervalToHistory,
  computeStats,
  clampMs,
  chainLevel
} from './src/time.js';
import { request, surface } from './src/client.js';
import { sounds, praiseForStreak, flyText, chainBurst, clearFx } from './src/effects.js';
import { shortcutFor, isPointerActivation } from './src/input.js';
import { createClockController } from './src/clock.js';

const STREAK_WINDOW_MS = 650;
const SESSION_HOLD_MS = 650;
const PART_HOLD_MS = 500;
const TICK_MS = 250;


const $ = (id) => document.getElementById(id);

const el = {
  screen: $('screen'),
  viewMain: $('view-main'),
  viewStats: $('view-stats'),
  runDot: $('run-dot'),
  timer: $('timer'),
  timerValue: $('timer-value'),
  timerState: $('timer-state'),
  clock: $('clock'),
  clockValue: $('clock-value'),
  clockHour: $('clock-hour'),
  clockMinute: $('clock-minute'),
  clockSecond: $('clock-second'),
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
  btnClear: $('btn-clear'),
  displayMode: $('display-mode'),
  btnOpenDisplay: $('btn-open-display'),
  displayHint: $('display-hint'),
  notice: $('release-notice'),
  noticeVersion: $('notice-version'),
  noticeText: $('notice-text'),
  noticeClose: $('notice-close'),
  error: $('app-error')
};

/** In-memory mirror of the stored state. */
let state = null;
/** Streak is intentionally ephemeral — it dies with the popup. */
let streak = 0;
let lastCountAt = 0;
let tickTimer = null;
let preferences = null;
let context = null;
let operations = Promise.resolve();
let noticeChecked = false;
const clockTestHook = globalThis.__ARCADE_CLOCK_TEST__;

function clearClockMotion() {
  el.clock.classList.remove('is-minute-change', 'is-hour-change', 'is-resync');
  el.clockHour.classList.remove('is-hour-change');
  el.clockMinute.classList.remove('is-minute-change');
  el.clockSecond.classList.remove('is-second-change');
  el.clock.dataset.motion = 'none';
}

function renderClock(frame) {
  el.clockHour.textContent = frame.hour;
  el.clockMinute.textContent = frame.minute;
  el.clockSecond.textContent = frame.second;
  clearClockMotion();
  if (frame.motion === 'none') return;

  // Restart only the one finite animation for this real system-time change.
  void el.clock.offsetWidth;
  el.clock.dataset.motion = frame.motion;
  if (frame.motion === 'second') el.clockSecond.classList.add('is-second-change');
  else if (frame.motion === 'minute') {
    el.clock.classList.add('is-minute-change');
    el.clockMinute.classList.add('is-minute-change');
  } else if (frame.motion === 'hour') {
    el.clock.classList.add('is-hour-change');
    el.clockHour.classList.add('is-hour-change');
  } else if (frame.motion === 'resync') {
    el.clock.classList.add('is-resync');
  }
}

const clockController = createClockController({
  render: renderClock,
  setVisible: (visible) => {
    el.clock.hidden = !visible;
    if (!visible) clearClockMotion();
  },
  // Opt-in page-local QA injection only; normal extension use always samples Date.
  now: clockTestHook?.enabled && typeof clockTestHook.now === 'function'
    ? () => clockTestHook.now()
    : undefined
});

if (clockTestHook?.enabled) {
  clockTestHook.refresh = () => clockController.refresh();
  clockTestHook.isRunning = () => clockController.isRunning();
}
/** Hold controller for SESSION RESET, so the R key can drive the same button. */
let sessionHold = null;

/* ------------------------------------------------------------ persist -- */

function reportError(error) {
  el.error.textContent = error.message || 'Could not save. Reopen the timer and try again.';
  el.error.hidden = false;
}

function applySnapshot(snapshot) {
  state = snapshot.state;
  preferences = snapshot.preferences;
  renderTimer(); renderCount(); renderTheme(); renderSettings();
  if (statsVisible()) renderStats();
  el.displayMode.value = preferences.mode;
}

function perform(action, extra = {}) {
  const result = operations.then(async () => {
    const snapshot = await request(action, extra);
    applySnapshot(snapshot);
    el.error.hidden = true;
    return snapshot;
  });
  operations = result.catch(reportError);
  return result;
}

/* ------------------------------------------------------------- render -- */

/** Only the digits change on every tick; the controls change on toggle. */
function renderTimer() {
  const timer = state.timer;
  const live = timer.running && Number.isFinite(timer.runStartedAt)
    ? timer.sessionElapsedMs + clampMs(Date.now() - timer.runStartedAt)
    : timer.sessionElapsedMs;
  const text = formatDuration(live);
  el.timerValue.textContent = text;
  el.timerValue.style.setProperty('--digits', String(text.length));
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

function renderTheme() {
  el.screen.dataset.theme = state.theme;
  for (const input of document.querySelectorAll('[data-theme-option]')) {
    input.checked = input.value === state.theme;
  }
}

function renderSettings() {
  for (const input of document.querySelectorAll('[data-setting]')) {
    input.checked = Boolean(state.settings[input.dataset.setting]);
  }
  el.screen.classList.toggle('crt', state.settings.subtleCrt);
  clockController.setEnabled(state.settings.clock);
}

function renderStats() {
  const history = state.timer.running
    ? addIntervalToHistory(state.history, Math.min(state.timer.runStartedAt, Date.now()), Date.now())
    : state.history;
  const stats = computeStats(history, new Date());
  for (const key of ['today', 'week', 'month', 'year']) {
    $(`stat-${key}-time`).textContent = formatDuration(stats[key].timeMs);
    $(`stat-${key}-count`).textContent = formatCount(stats[key].count);
  }
}

function announce(message) {
  el.live.textContent = message;
}

/* -------------------------------------------------------------- timer -- */

async function toggleTimer() {
  try {
    await perform('toggle');
    if (state.settings.sound) sounds.toggle(state.timer.running);
    announce(state.timer.running ? 'Timer started' : 'Timer stopped');
  } catch { /* perform reports storage failures without pretending to save. */ }
}

/* ------------------------------------------------------------- counter -- */

async function addCount() {
  const now = Date.now();
  streak = now - lastCountAt <= STREAK_WINDOW_MS ? streak + 1 : 1;
  lastCountAt = now;

  try { await perform('count'); } catch { return; }

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
  button.classList.add('is-done');
  setTimeout(() => button.classList.remove('is-done'), 560);
  announce(message);
}

async function doResetTimer() {
  try { await perform('resetTimer'); } catch { return; }
  if (state.settings.sound) sounds.reset(false);
  finishReset(el.btnResetTimer, 'Timer reset. Count and statistics kept.');
}

async function doResetCount() {
  try { await perform('resetCount'); } catch { return; }
  clearEphemeral();
  if (state.settings.sound) sounds.clear();
  finishReset(el.btnResetCount, 'Count reset. Timer and statistics kept.');
}

async function doResetSession() {
  try { await perform('resetSession'); } catch { return; }
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
  renderStats();
  el.viewMain.hidden = true;
  el.viewStats.hidden = false;
  el.btnBack.focus();
}

function showMain() {
  el.viewStats.hidden = true;
  el.viewMain.hidden = false;
  el.btnSettings.focus();
  maybeShowNotice();
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
      perform('setting', { key: input.dataset.setting, value: input.checked }).catch(() => renderSettings());
    });
  }
  for (const input of document.querySelectorAll('[data-theme-option]')) {
    input.addEventListener('change', () => {
      if (input.checked) perform('theme', { value: input.value }).catch(() => renderTheme());
    });
  }
  el.btnClear.addEventListener('click', async () => {
    if (!window.confirm('Clear all data? Timer, count, history, the upgrade backup and settings reset.')) return;
    try { await perform('clear'); clearEphemeral(); announce('All data cleared'); } catch { /* reported */ }
  });
  el.displayMode.addEventListener('change', () => {
    perform('preferences', { value: { mode: el.displayMode.value } }).catch(() => {});
  });
  el.btnOpenDisplay.addEventListener('click', openSelectedView);
  el.noticeClose.addEventListener('click', () => { el.notice.hidden = true; });
  document.addEventListener('visibilitychange', maybeShowNotice);
  chrome.storage.onChanged.addListener(onStorageChanged);

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  window.addEventListener('pagehide', () => {
    clockController.dispose();
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

async function maybeShowNotice() {
  if (noticeChecked || !state || statsVisible() || document.visibilityState === 'hidden') return;
  noticeChecked = true;
  try {
    const notice = await request('claimNotice');
    if (!notice) return;
    const japanese = chrome.i18n.getUILanguage().startsWith('ja');
    el.noticeVersion.textContent = `v${notice.version}`;
    el.noticeText.textContent = notice.notes.map((note) => note[japanese ? 'ja' : 'en']).join(' / ');
    el.notice.hidden = false;
  } catch (error) { noticeChecked = false; reportError(error); }
}

async function openSelectedView() {
  const mode = el.displayMode.value;
  try {
    // Start this API call synchronously within the button's user gesture.
    const opening = mode === 'sidepanel' ? chrome.sidePanel.open({ windowId: context.windowId }) : null;
    if (opening) await opening;
    await perform('preferences', { value: { mode } });
    if (mode === 'floating') await request('openFloating');
    if (mode === 'popup') {
      if (surface !== 'popup' && chrome.action.openPopup) {
        await chrome.action.openPopup();
        await request('leaveSurface', { surface });
        return;
      }
      el.displayHint.textContent = 'Saved. Click the toolbar icon to open the popup.';
      return;
    }
    if (surface !== mode) {
      if (surface === 'popup') window.close();
      else await request('leaveSurface', { surface });
    }
  } catch (error) { reportError(error); }
}

function onStorageChanged(changes, area) {
  if (area === 'local' && ['timer', 'sessionCount', 'history', 'theme', 'settings', 'displayPreferences'].some((key) => key in changes)) {
    perform('get').catch(() => {});
  }
}

/* ---------------------------------------------------------------- boot -- */
async function init() {
  if (document.body) document.body.dataset.surface = surface;
  const result = await request('get');
  context = await request('context');
  await request('prepareSidepanel');
  applySnapshot(result);
  bindEvents();
  el.screen.removeAttribute('inert');
  tickTimer = setInterval(() => { renderTimer(); if (statsVisible()) renderStats(); }, TICK_MS);
  maybeShowNotice();
  const error = new URLSearchParams(globalThis.location?.search || '').get('error');
  if (error) {
    reportError(new Error(error));
    // Restore the preferred action after opening a failure explanation.
    request('preferences', { value: {} }).catch(reportError);
  }
}

window.addEventListener('unload', () => {
  clearInterval(tickTimer);
  clockController.dispose();
  chrome.storage.onChanged.removeListener(onStorageChanged);
});

init().catch(reportError);
