import test from 'node:test';
import assert from 'node:assert/strict';

class FakeClassList {
  values = new Set();

  add(...names) {
    for (const name of names) this.values.add(name);
  }

  remove(...names) {
    for (const name of names) this.values.delete(name);
  }

  toggle(name, force) {
    const next = force === undefined ? !this.values.has(name) : Boolean(force);
    if (next) this.values.add(name);
    else this.values.delete(name);
    return next;
  }

  contains(name) {
    return this.values.has(name);
  }
}

class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.hidden = false;
    this.checked = false;
    this.dataset = {};
    this.classList = new FakeClassList();
    this.style = { setProperty() {} };
    this.listeners = new Map();
    this.attributes = new Map();
    this.offsetWidth = 100;
    this.textWrites = 0;
    this._textContent = '';
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(value) {
    this._textContent = String(value);
    this.textWrites += 1;
  }

  addEventListener(type, callback) {
    const callbacks = this.listeners.get(type) ?? [];
    callbacks.push(callback);
    this.listeners.set(type, callbacks);
  }

  dispatch(type, init = {}) {
    const event = {
      detail: 0,
      key: '',
      code: '',
      repeat: false,
      target: this,
      preventDefault() {},
      ...init
    };
    for (const callback of this.listeners.get(type) ?? []) callback(event);
  }

  click() {
    this.dispatch('click', { detail: 1 });
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  focus() {}
  blur() {}
  replaceChildren() {}
}

test('the production START/STOP path leaves the real-world clock loop active', async () => {
  const savedGlobals = {
    chrome: globalThis.chrome,
    document: globalThis.document,
    window: globalThis.window,
    HTMLElement: globalThis.HTMLElement,
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
    __ARCADE_CLOCK_TEST__: globalThis.__ARCADE_CLOCK_TEST__
  };

  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, new FakeElement(id));
    return elements.get(id);
  };

  const settingInputs = ['clock', 'sound', 'flyText', 'chainEffect', 'subtleCrt'].map((name) => {
    const input = element(`set-${name}`);
    input.dataset.setting = name;
    return input;
  });
  const documentListeners = new Map();
  const windowListeners = new Map();
  const intervals = new Map();
  const stored = {
    stateVersion: 1,
    timer: { running: false, sessionElapsedMs: 5000, runStartedAt: null },
    sessionCount: 0,
    history: {},
    settings: {
      sound: false,
      flyText: true,
      chainEffect: true,
      subtleCrt: false
    }
  };
  let nextIntervalId = 1;
  let clockNow = new Date(2026, 7, 22, 12, 34, 58);

  globalThis.HTMLElement = FakeElement;
  globalThis.document = {
    getElementById: element,
    querySelectorAll(selector) {
      return selector === '[data-setting]' ? settingInputs : [];
    },
    addEventListener(type, callback) {
      const callbacks = documentListeners.get(type) ?? [];
      callbacks.push(callback);
      documentListeners.set(type, callbacks);
    },
    createElement: () => new FakeElement()
  };
  globalThis.window = {
    confirm: () => false,
    matchMedia: () => ({ matches: false }),
    addEventListener(type, callback) {
      const callbacks = windowListeners.get(type) ?? [];
      callbacks.push(callback);
      windowListeners.set(type, callbacks);
    }
  };
  globalThis.chrome = {
    storage: {
      local: {
        async get(keys) {
          return Object.fromEntries(keys.filter((key) => key in stored).map((key) => [key, stored[key]]));
        },
        async set(value) {
          Object.assign(stored, value);
        },
        async clear() {
          for (const key of Object.keys(stored)) delete stored[key];
        }
      }
    }
  };
  globalThis.setInterval = (callback, delay) => {
    const id = nextIntervalId++;
    intervals.set(id, { callback, delay });
    return id;
  };
  globalThis.clearInterval = (id) => intervals.delete(id);
  globalThis.__ARCADE_CLOCK_TEST__ = {
    enabled: true,
    now: () => clockNow
  };

  try {
    await import(`../popup.js?popup-clock-integration=${Date.now()}`);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const clockInterval = () => [...intervals.values()].find(({ delay }) => delay === 1000);
    assert.ok(clockInterval(), 'clock interval should be active when an older stored state inherits CLOCK=ON');

    const startStop = element('btn-start-stop');
    startStop.click();
    assert.equal(stored.timer.running, true, 'actual popup START path should run');
    startStop.click();
    assert.equal(stored.timer.running, false, 'actual popup STOP path should run');
    assert.ok(clockInterval(), 'STOP must not clear the clock interval');

    const clockSecond = element('clock-second');
    const writesBeforeTick = clockSecond.textWrites;
    clockNow = new Date(2026, 7, 22, 12, 34, 59);
    clockInterval().callback();
    assert.equal(clockSecond.textWrites, writesBeforeTick + 1, 'clock must still render after STOP');
    assert.equal(element('clock').dataset.motion, 'second');
    assert.equal(clockSecond.classList.contains('is-second-change'), true);

    const clockInput = element('set-clock');
    clockInput.checked = false;
    clockInput.dispatch('change');
    assert.equal(clockInterval(), undefined, 'CLOCK=OFF must clear its interval');
    assert.equal(element('clock').hidden, true);
    assert.equal(element('clock').dataset.motion, 'none');
    assert.equal(clockSecond.classList.contains('is-second-change'), false);

    clockInput.checked = true;
    clockInput.dispatch('change');
    clockInput.dispatch('change');
    assert.equal([...intervals.values()].filter(({ delay }) => delay === 1000).length, 1);
    assert.equal(globalThis.__ARCADE_CLOCK_TEST__.isRunning(), true);

    for (const callback of windowListeners.get('unload') ?? []) callback();
    assert.equal(intervals.size, 0, 'popup disposal should clear every interval');
  } finally {
    for (const [name, value] of Object.entries(savedGlobals)) {
      if (value === undefined) delete globalThis[name];
      else globalThis[name] = value;
    }
  }
});
