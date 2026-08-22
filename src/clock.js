const CLOCK_UPDATE_MS = 1000;

function sampleClock(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  const valid = !Number.isNaN(date.getTime());
  const parts = valid
    ? [date.getHours(), date.getMinutes(), date.getSeconds()]
    : [0, 0, 0];
  const [hour, minute, second] = parts.map((part) => String(part).padStart(2, '0'));

  return {
    epochMs: valid ? date.getTime() : null,
    hour,
    minute,
    second,
    text: `${hour}:${minute}:${second}`
  };
}

/** Format a Date-like value as local 24-hour HH:MM:SS. */
export function formatClockTime(value = new Date()) {
  return sampleClock(value).text;
}

/** Classify one system-time sample without inventing or replaying transitions. */
export function clockMotion(previous, current) {
  if (!previous || previous.text === current.text) return 'none';
  if (!Number.isFinite(previous.epochMs) || !Number.isFinite(current.epochMs)) return 'resync';

  const elapsedSeconds = Math.floor(current.epochMs / 1000) - Math.floor(previous.epochMs / 1000);
  if (elapsedSeconds !== 1) return 'resync';

  if (previous.minute === '59' && previous.second === '59' && current.minute === '00' && current.second === '00') {
    return 'hour';
  }
  if (previous.second === '59' && current.second === '00') return 'minute';
  return 'second';
}

/** Build the exact text plus the one discrete motion appropriate to this sample. */
export function clockFrame(value = new Date(), previous = null) {
  const current = sampleClock(value);
  return { ...current, motion: clockMotion(previous, current) };
}

/**
 * Own the popup clock's single update loop.
 *
 * Every callback formats a fresh system-time sample. Delayed callbacks,
 * browser throttling and sleep therefore resynchronise instead of accumulating
 * timer drift. The injected functions keep lifecycle behaviour testable.
 */
export function createClockController({
  render,
  setVisible = () => {},
  now = () => new Date(),
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval
} = {}) {
  if (typeof render !== 'function') throw new TypeError('render must be a function');

  let intervalId = null;
  let previous = null;

  const tick = () => {
    const frame = clockFrame(now(), previous);
    previous = frame;
    render(frame);
  };

  const stop = () => {
    if (intervalId !== null) {
      clearIntervalFn(intervalId);
      intervalId = null;
    }
    previous = null;
  };

  return {
    setEnabled(enabled) {
      if (!enabled) {
        stop();
        setVisible(false);
        return;
      }

      setVisible(true);
      if (intervalId !== null) return;
      tick();
      intervalId = setIntervalFn(tick, CLOCK_UPDATE_MS);
    },

    /** Immediate one-shot resample for visibility recovery and isolated QA. */
    refresh() {
      if (intervalId === null) return false;
      tick();
      return true;
    },

    isRunning() {
      return intervalId !== null;
    },

    dispose() {
      stop();
      setVisible(false);
    }
  };
}
