# COUNT undo verification

Scope: one-step count correction. Original / Arcade / Editorial are retained;
no theme replacement, package version bump, dependencies or permissions added.
No release or store submission is part of this change.

## Behavior

The service worker's existing queue writes `countUndo` with the COUNT state in
one `storage.local.set`. The receipt has a unique ID, original local date and
post-count session value. UNDO checks the exact ID before settling elapsed time,
then decrements only the session and that day's count, and consumes the receipt.
Stale/replayed requests are read-only no-ops with `undone: false`.

All resets invalidate the receipt; timer toggles, settings and display changes
preserve it. Reopening views and worker/browser restarts preserve it. There is
no history stack or redo. Saving a failed transaction cannot consume a receipt.
Schema 3 keeps previous data readable while schema-aware older writers refuse
to edit it. No receipt is invented for historical counts.

## Verification

- Added 12 controller regressions first: all 12 failed before implementation.
- All 95 Node tests pass, including 13 undo cases (12 red-first controller cases
  and a load/save helper receipt round-trip). Covered exact-once
  corrections, stale/concurrent clients, Sunday/Monday, month/year boundaries,
  all reset paths, running-time accounting, failed writes, legacy/corrupt state
  and worker restart.
- `npm run verify` passes (no package built; release ZIP check intentionally skips).
- Real Chromium extension harness: 16 checks pass in an isolated synthetic-data
  profile. Includes real update preservation, native floating/side-panel opening,
  COUNT/UNDO shared state, keyboard and pointer routing, reopen/browser restart,
  unauthorized-frame rejection, and no uncaught page errors.
- Visual matrix: 3 themes at 360px popup, 272px floating and 300px side-panel
  layout. UNDO bounds are within each surface; reduced motion disables its
  animation. The native side panel is opened by Chrome's API; interaction/layout
  matrix uses the identical side-panel URL in a Playwright page.
- Captures and results are local QA artifacts under
  `.render/display-qa-1792887356618/`; `.render/latest-display-qa.json` is the index.
- Package/manifest remain 0.2.0; this is reviewed development source, not a new
  published version.

Independent review is performed separately against the committed change.
