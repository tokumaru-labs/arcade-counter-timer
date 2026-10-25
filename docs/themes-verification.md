# Six-theme development update

Theme-only scope above reviewed COUNT undo commit
`a41292300cecc1528fb9fd61bd50e665fca516a9`. No store submission, push,
merge or release was performed. Package and manifest remain version 0.2.0.

## User-visible result

- Space Age replaces Original as the default: ivory enamel, aluminium bezels,
  recessed orange instruments and tactile controls.
- Steampunk uses bundled machinery, brass gears and live mechanical digit
  flaps. Gears make a finite step on count changes rather than running a loop.
- Art Deco uses emerald lacquer, gold geometry and bundled Bodoni numerals.
- Nixie uses a graphite metal casing and individual glass tubes around live
  amber digits.
- Arcade and Editorial remain available. Six choices appear in settings;
  Original is absent. Existing Original/absent/invalid preferences normalize
  to Space Age. Read-time normalization does not rewrite history or settings.
- Timer, count, history, settings and a valid one-step undo receipt are preserved
  across the legacy preference migration and all six theme changes.
- Assets and SIL OFL / image attribution are local. Settings links to
  `assets/themes/CREDITS.txt`. No new dependencies, permissions or remote runtime
  resources were introduced. The existing shared-view asset allowlist adds only
  `themes.css`.

## Verification

- `npm test`: **96 tests pass**. Four updated/added theme migration assertions
  were red before implementation and green afterward. The worker regression
  preserves a historical day, timer, settings and an exact undo receipt through
  Original migration and all six theme choices, then successfully consumes it.
- `scripts/test-themes-browser.mjs`: **19 checks pass**, Chromium 149.0.7827.55,
  isolated synthetic profile. All 6 themes × popup 360×540, floating-frame layout
  272×390 and side-panel layout 300×620. Actual DOM bounds assert that numbers
  stay inside their instrument, COUNT is not overlapped and the footer remains
  visible. Also checks `185:24:38`, `1,234,567,890`, COUNT/UNDO, timer start/stop,
  reduced motion, loaded local font/images, no page errors and zero external
  requests. **30 captures** including six long-value floating views.
- A compact-layout regression was reproduced first: Space Age digits extended
  beyond their panel, and Steampunk/Nixie tubes/flaps and the footer overflowed.
  Compact instrument sizes, minimum panel height and footer controls now fit.
  Long counts also exposed Arcade's existing fixed compact font size; a bounded
  font rule now contains the value. Tube/flap reduced-motion specificity was
  corrected after the browser assertion detected it.
- `scripts/test-display-browser.mjs`: **16 checks pass** on final runtime CSS.
  Real old-version upgrade preservation, activeTab-authorized native floating
  iframe, native side-panel opening and closing, cross-view shared state,
  keyboard/pointer routing, unauthorized-frame rejection and browser restart.
  All six themes were operated in the real floating iframe. Side-panel layout
  interactions use the same URL in a Playwright page; native panel existence is
  separately confirmed through Chrome's API.
- `npm run package` and `npm run verify` pass. Verification decompresses every
  packaged runtime file (including font/images/licenses) and compares its bytes
  with current source. Archive has only the allowlisted runtime files.
- `git diff --check` passes. Root independently inspected the four themes and
  rechecked the corrected compact captures before the bounded code review.

## Local evidence

- `.render/themes-qa-1792888068134/results.json` — 19-check layout matrix.
- `.render/display-qa-1792888187838/results.json` — 16-check extension workflow.
- `.render/latest-themes-qa.json` and `.render/latest-display-qa.json` — indexes.
- `dist/arcade-counter-timer-v0.2.0-chrome-web-store.zip` — **711057 bytes**;
  SHA-256 `e820b500e81291fef4cfb34ae6dc0508c5a6e0e2a701547936ba90f162142482`.

The ZIP is a local development artifact, not an uploaded/public release. Existing
store screenshots are historical; the capture helper now supports all six themes
but production store artwork has not been replaced as part of this task.
