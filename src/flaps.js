// Presentation only: canonical values are committed by the shared controller.
// Decorative faces never add text nodes or delay a value/ARIA update.
export function createFlapRenderer(document, reducedMotion = () => false) {
  const views = new Map();
  const duration = 440;

  function stop(slot) {
    const transition = slot.transition;
    slot.transition = null;
    if (!transition) return;
    for (const animation of transition.animations) animation.cancel();
    transition.layer.remove();
  }

  function flip(slot, from, to) {
    stop(slot);
    if (reducedMotion() || typeof slot.node.animate !== 'function') return;
    const layer = document.createElement('span');
    layer.className = 'flap-layer';
    layer.setAttribute('aria-hidden', 'true');
    const faces = ['flap-old-top', 'flap-old-bottom', 'flap-new-bottom'].map((name, index) => {
      const face = document.createElement('span');
      face.className = `flap-face ${name}`;
      face.dataset.glyph = index === 2 ? to : from;
      layer.append(face);
      return face;
    });
    slot.node.append(layer);
    const options = { duration, fill: 'both', easing: 'linear' };
    const animations = [
      faces[0].animate([
        { transform: 'rotateX(0deg)', filter: 'brightness(1)', offset: 0 },
        { transform: 'rotateX(-90deg)', filter: 'brightness(.35)', offset: .5 },
        { transform: 'rotateX(-90deg)', filter: 'brightness(.35)', offset: 1 }
      ], options),
      faces[1].animate([
        { opacity: 1, offset: 0 }, { opacity: 1, offset: .499 },
        { opacity: 0, offset: .5 }, { opacity: 0, offset: 1 }
      ], options),
      faces[2].animate([
        { transform: 'rotateX(90deg)', filter: 'brightness(.35)', offset: 0 },
        { transform: 'rotateX(90deg)', filter: 'brightness(.35)', offset: .5 },
        { transform: 'rotateX(0deg)', filter: 'brightness(1)', offset: 1 }
      ], options)
    ];
    const transition = { layer, animations };
    slot.transition = transition;
    Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      if (slot.transition !== transition) return; // a newer count owns this digit
      slot.transition = null;
      layer.remove();
    });
  }

  function render(element, text) {
    const previous = views.get(element);
    if (previous?.text === text) return;
    const used = new Set();
    const slots = [...text].map((character, index) => {
      const isDigit = /\d/.test(character);
      // Right alignment preserves units through hour/count digit growth.
      const oldIndex = (previous?.text.length ?? 0) - text.length + index;
      let slot = previous?.slots[oldIndex];
      if (!slot || slot.isDigit !== isDigit) {
        const node = document.createElement('span');
        node.className = isDigit ? 'instrument-digit' : 'instrument-separator';
        const live = document.createElement('span');
        live.className = 'flap-live';
        node.append(live);
        slot = { node, live, isDigit, character, transition: null };
      }
      used.add(slot);
      const old = slot.character;
      slot.character = character;
      slot.live.textContent = character;
      if (isDigit) slot.node.dataset.digit = character;
      if (old !== character && isDigit) flip(slot, old, character);
      return slot;
    });
    for (const slot of previous?.slots ?? []) if (!used.has(slot)) stop(slot);
    // Moving existing nodes retains animations and listeners on unchanged digits.
    element.replaceChildren(...slots.map((slot) => slot.node));
    views.set(element, { text, slots });
  }

  function clear(element) {
    const view = views.get(element);
    if (!view) return;
    for (const slot of view.slots) stop(slot);
    views.delete(element);
  }

  function cancelMotion() {
    for (const view of views.values()) for (const slot of view.slots) stop(slot);
  }

  function dispose() {
    for (const element of views.keys()) clear(element);
  }

  return { render, clear, cancelMotion, dispose };
}
