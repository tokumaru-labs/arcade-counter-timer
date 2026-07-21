// Original Web Audio blips + lightweight visual effects.
// Nothing here loads external assets; every sound is synthesised on the fly.

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------------- audio -- */

let ctx = null;

/** Lazily create the AudioContext — only ever called from a user gesture. */
function audio() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function blip(ac, { freq, start, duration, peak, type = 'square', sweepTo = null }) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (sweepTo !== null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, sweepTo), start + duration);
  }
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export const sounds = {
  /** Short, dry click. Pitch creeps up slightly with the streak. */
  count(streak = 1) {
    const ac = audio();
    if (!ac) return;
    const now = ac.currentTime;
    const step = Math.min(streak - 1, 8);
    blip(ac, {
      freq: 620 + step * 34,
      start: now,
      duration: 0.055,
      peak: 0.12,
      type: 'square',
      sweepTo: 420 + step * 30
    });
  },

  /** Rising arpeggio; 50 / 100 chains get an extra top note. */
  chain(level = 1) {
    const ac = audio();
    if (!ac) return;
    const now = ac.currentTime;
    const root = 440 * Math.pow(2, Math.min(level - 1, 6) / 12);
    const steps = [0, 4, 7];
    if (level % 5 === 0) steps.push(12);
    steps.forEach((semitone, i) => {
      blip(ac, {
        freq: root * Math.pow(2, semitone / 12),
        start: now + i * 0.075,
        duration: 0.16,
        peak: 0.1,
        type: i === steps.length - 1 ? 'triangle' : 'square'
      });
    });
  },

  /** Gentle descending sweep for reset. */
  reset() {
    const ac = audio();
    if (!ac) return;
    const now = ac.currentTime;
    blip(ac, {
      freq: 330,
      start: now,
      duration: 0.28,
      peak: 0.09,
      type: 'triangle',
      sweepTo: 110
    });
  },

  /** Soft tick when the timer toggles. */
  toggle(on) {
    const ac = audio();
    if (!ac) return;
    const now = ac.currentTime;
    blip(ac, {
      freq: on ? 520 : 380,
      start: now,
      duration: 0.07,
      peak: 0.07,
      type: 'triangle',
      sweepTo: on ? 700 : 260
    });
  }
};

/* --------------------------------------------------------------- visuals -- */

const PRAISE = [
  { streak: 3, text: 'GOOD!', tone: 'good' },
  { streak: 5, text: 'NICE!', tone: 'nice' },
  { streak: 7, text: 'GREAT!', tone: 'great' },
  { streak: 9, text: 'FANTASTIC!', tone: 'fantastic' }
];

/** Which praise (if any) a streak earns. Null means stay quiet. */
export function praiseForStreak(streak) {
  const exact = PRAISE.find((p) => p.streak === streak);
  if (exact) return exact;
  if (streak >= 13 && (streak - 13) % 4 === 0) {
    return { streak, text: 'FANTASTIC!', tone: 'fantastic' };
  }
  return null;
}

function rand(range) {
  return (Math.random() * 2 - 1) * range;
}

export function flyText(layer, text, tone) {
  const el = document.createElement('div');
  el.className = `fly fly--${tone}`;
  el.textContent = text;
  el.style.setProperty('--dx', `${rand(10).toFixed(1)}px`);
  el.style.setProperty('--dy', `${rand(6).toFixed(1)}px`);
  layer.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

export function chainBurst(layer, level, screen) {
  const el = document.createElement('div');
  el.className = 'fly fly--chain';
  el.textContent = level === 1 ? 'CHAIN!' : `${level} CHAIN!`;
  if (level % 5 === 0) el.classList.add('fly--chain-major');
  layer.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });

  screen.classList.add('is-flash');
  setTimeout(() => screen.classList.remove('is-flash'), 260);

  if (reducedMotion()) return;

  const sparks = level % 5 === 0 ? 12 : 8;
  for (let i = 0; i < sparks; i += 1) {
    const spark = document.createElement('span');
    spark.className = 'spark';
    const angle = (Math.PI * 2 * i) / sparks + Math.random() * 0.4;
    const distance = 26 + Math.random() * 22;
    spark.style.setProperty('--sx', `${Math.cos(angle) * distance}px`);
    spark.style.setProperty('--sy', `${Math.sin(angle) * distance}px`);
    layer.appendChild(spark);
    spark.addEventListener('animationend', () => spark.remove(), { once: true });
  }
}
