# Complete Nixie housings and repeatable undo

Review base: `a08fa0baa7b6024beaa57b0ddba7c8f55f8b57cf`.
Scope: Nixie housing presentation, persisted COUNT undo history, associated
tests and user documentation. Extension version remains 0.2.0. No dependencies,
permissions, image assets, push, merge, store upload or publication were added.
All QA used isolated synthetic profiles; the user's active trial was untouched.

## Behavior and data contract

- Nixie now draws the entire existing 841×1871 transparent PNG as one `img`.
  Its original aspect ratio, `object-fit: contain` and clearance inside each
  instrument preserve the tip, shoulders, glass body and black socket. The
  prior vertical stretching and two clipped housing layers are removed. The
  supplied image has no separately exposed terminal pins. The inner cathode
  still changes while the housing node remains fixed. No dimming was added.
- Storage schema 4 retains `countUndo` as a head token, last day, session count
  and ordered `{ day, count }` runs. Consecutive COUNTs on the same local date
  increment one run, so 1,500 same-day counts occupy one run. There is no
  arbitrary operation-count cap or age pruning. Date order is operation order,
  including a manually moved-back local date.
- Each successful COUNT or UNDO rotates the head token. Popping to an older
  operation never revives its former token. Duplicate, concurrent or stale
  requests therefore cannot remove the next count. All views use the existing
  serialized worker, with state and undo saved together in one storage write.
- Undo corrects the original recorded date and session total without rewinding
  time. Timer/count/session/full resets clear all undo steps; start/stop, theme,
  settings and display changes retain them. A COUNT after undo adds a new step;
  no redo is provided. Failed storage writes preserve the prior data and head.
- A valid schema 3 receipt becomes exactly one undo step. Older operations are
  never inferred from statistics. Malformed, mismatched or overdrawn runs are
  discarded without decrementing counts. Runs must fit both the session total
  and the recorded daily counts. Future schemas are rejected without writes,
  including the shared storage helpers.
- Physical storage capacity and JavaScript's safe integer range still apply.
  A failed save or unrepresentable next count changes no saved state. Schema 3
  and older schema-aware workers reject schema 4; do not downgrade a used profile.
  For rollback, the visual change can be reverted independently; persisted
  schema 4 requires a compatible fix or an explicit data migration, not clearing
  the user's history or silently reopening it with an older writer.

## Verification

- `npm test`: **108 passed**. New red-first regressions include 1,500 counts
  followed by 1,500 undos with a recreated store each time, compact run storage,
  schema 3 migration, deep failed-write recovery, cross-year/day reversal,
  branch-after-undo, corrupt runs, stale head replay, multi-step reset clearing,
  future-schema helper protection and safe-integer failure.
- `scripts/test-deep-undo-browser.mjs`: **5 passed**. Real extension schema 3
  migration, parallel popup/panel requests, keyboard repeat undo, full browser
  and worker restart, count branching and running timer preservation. Complete
  housing dimensions and clearance are checked at 600×520, 272×390 and 300×620.
  Screenshots at all three sizes were inspected for full outer shape, with all
  digits 0–9 displayed together. These are actual UI captures, not CSS-only tests.
- `scripts/test-display-browser.mjs`: **16 passed**, including actual native
  popup, injected floating view, native side panel, old-version upgrade,
  keyboard/pointer behavior, shared updates and all retained undo steps after
  browser restart.
- `scripts/test-themes-browser.mjs`: **22 passed** across six themes and three
  surfaces, including long counts/durations, reduced motion, assets, forced
  colors, image failure fallback, controls/footer bounds and no external requests.
- `scripts/test-instruments-browser.mjs`: **5 passed**; existing split-flap
  temporal frames, rapid counts/undo and reduced motion still behave correctly.
- Package, verify and diff checks passed. All 53 runtime ZIP entries match the
  working sources; existing bundled source-image hashes remain unchanged.

## Local evidence (not included in runtime ZIP)

- `.render/deep-undo-red.txt`, `.render/deep-undo-unit.txt`
- `.render/deep-undo-qa-1792892657996/` — real multi-step flow, image bounds,
  `nixie-complete-{popup,floating,sidepanel}.png`
- `.render/display-qa-1792892693858/` — native/upgrade checks
- `.render/themes-qa-1792892746559/` — six-theme matrix and narrow long values
- `.render/instruments-qa-1792892600607/` — transient frames and real UI WebM
- `.render/deep-undo-package.txt`, `.render/deep-undo-verify.txt`
- `dist/arcade-counter-timer-v0.2.0-chrome-web-store.zip`: **10,025,644 bytes**,
  SHA-256 `dc6d2b55477c9117b78203e5f31e86f0f719df75fd94e7d67ad557980f59cf7d`.

Earlier verification documents describe their historical commit scopes. This
record supersedes their one-step undo and split/clipped housing descriptions.
