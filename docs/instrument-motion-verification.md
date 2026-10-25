# Split-flap and Nixie housing repair

Review base: `6e2fc01a0b9cd6cf21ecccdf16166252c752a70f`.
This change repairs Steampunk readout motion and Nixie tube presentation only.
The worker, persisted state, statistics, undo receipts, permissions and version
0.2.0 are unchanged. No push, merge, store upload or publication was performed.

## Behavior

- Steampunk retains digit nodes. Only a changed digit gets a temporary,
  aria-hidden face layer. During the first 220ms the old upper half rotates
  down to the central hinge; during the next 220ms the new lower half opens.
  The underlying text and accessible name update immediately. Cancellation,
  theme switches and view disposal remove obsolete faces. There are no new
  JavaScript animation timers. Reduced motion skips new faces and cancels
  active Web Animations when the preference changes.
- Nixie retains the glass housing and socket nodes while changing the inner
  cathode photo. Glass shoulders, evacuation tip, reflections and the black
  socket remain visible. Normal popup tubes are about 115px tall; narrow and
  long-value views use the existing shrinking rules. Axis-specific CSS photo
  sizing keeps the complete digit inside the window, excluding the adjacent
  photographed tube. No dimming, idle brightness or brightness setting exists.
- The housing is an imagegen-edited derivative of a CC0 photo by TofDir. It is
  combined with Hellbus's original CC BY-SA 3.0 Z566M photographs, not an exact
  hardware-model reproduction. The PNG is copied unchanged from the supplied
  asset (SHA-256 `9ddd12e96ae34275301cd239dc94e29816960a49fc55bc7e524c962db3fc2976`).
  CREDITS and the separate provenance JSON record source, license and edits.
  All eleven tube assets must load before photos replace the visible text;
  forced colors keeps the readable text fallback.

## Verification

- `npm test`: **100 passed**, including four red-first renderer regressions for
  immediate values, changed-digit identity, rapid changes, rollover, undo,
  stale cancellation, completion cleanup, disposal and reduced motion.
- `scripts/test-instruments-browser.mjs`: **5 passed**, real extension in an
  isolated Chromium profile. Covers fixed Nixie housing/socket identity,
  9→10, rapid 98→102→UNDO 101, running 00:59:59→01:00:00, stop, theme changes,
  and both initial and dynamically changed reduced-motion preferences.
- The temporal test pauses actual face Web Animations at 0/110/220/330ms.
  At 110ms the old top is at −45° and the new bottom remains at 90°; at 330ms
  the old top is at −90° and the new bottom is at 45°. Computed transform
  origins put both leaves on the center hinge. Screenshots were inspected
  at 110/330ms, with old and new glyph halves visibly distinct. A real UI WebM
  is retained; there is no raster compositing or generated demonstration.
- `scripts/test-themes-browser.mjs`: **22 passed**. All six themes at popup,
  floating 272×390 and sidepanel 300×620 sizes; count/undo, timer controls,
  long values, footer bounds, reduced motion, local fonts/images, forced
  colors, missing photo fallback, popup resizing and zero page errors or
  external network requests.
- `npm run package`, `npm run verify`, `git diff --check`: passed. The ZIP's
  53 allowlisted runtime files match current source bytes; existing original
  photo provenance hashes also match. No new dependency or permission.

## Evidence (local, excluded from runtime ZIP)

- Unit output: `.render/instrument-unit-tests.txt`.
- Temporal results, frame PNGs and WebM:
  `.render/instruments-qa-1792892066641/`.
- All digits at normal size: `nixie-all-digits.png` in that directory uses
  TIME 03:24:56 and COUNT 07891, covering 0–9 without a tiny long readout.
- Six-theme matrix: `.render/themes-qa-1792892079703/`.
- Package/verify outputs: `.render/instrument-package.txt` and
  `.render/instrument-verify.txt`.
- Local development ZIP: `dist/arcade-counter-timer-v0.2.0-chrome-web-store.zip`,
  **10,024,815 bytes**, SHA-256
  `fe19f37a72f0197cf717ba7edf0c3c6bbb1a6cbcab55a696b9724ffabe551c22`.

The previous native upgrade/display checks are recorded in
`material-themes-verification.md`; they were not rerun for this presentation-only
change. This evidence does not claim a new store release or a physical device test.
Rollback is the bounded code/asset change after the review base; no data migration
or history restoration is required.
