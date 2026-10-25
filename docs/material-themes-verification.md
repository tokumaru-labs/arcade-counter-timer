# Photographic material theme rebuild

Review base: `f8982ee2ade805eaaf24f7494fa52d6503e6bbfa`. Scope is four material
faces plus their readout presentation, local assets and packaging. Arcade and
Editorial remain available. The serialized worker, storage migration, statistics,
timer accounting, undo receipt semantics, permissions and version 0.2.0 are unchanged.
No push, merge, store upload or publication was performed.

## Result

- Four material popups now request 600×520. Equal TIME/COUNT instruments sit above
  a 100px operation row with similarly sized START/COUNT and a separate UNDO.
  Arcade and Editorial retain 360×540. Floating 272×390 and sidepanel 300×620 use
  a vertical layout with visible controls, readouts and session reset.
- Space Age uses a photographed enamel panel, recessed dark glass, aluminium-like
  bezels, orange edge marks and pushbuttons. Steampunk adds an actual clockwork
  photograph beneath metal plates, photographic screw heads, textured red/black
  controls and mechanical digit flaps. Art Deco has deep green lacquer, gold metal
  inlays, symmetric hardware and tall Bodoni numerals. Nixie uses photographed
  illuminated Z566M digits, scratched steel, a round orange start switch and vents.
- The concept guided proportions and material treatment; this is a live interface
  interpretation, not an identical raster reproduction of the generated concept.
- Small material counts are visually padded to five digits. The underlying value,
  accessible readout name and statistics remain unpadded. Long counts still use
  grouped digits. Timer text continues to represent actual elapsed HH:MM:SS.
- Nixie photograph readiness is checked once per view. If any image fails, all
  digit text stays visible. Forced colors also uses text. Live text and the
  unpadded accessible name remain in the DOM when photographs are shown.
- All 18 photographic originals (one Commons-provided enamel thumbnail), three
  font files, licenses and precise provenance are bundled. No bitmap editing was
  applied; display crops and tints are CSS. COMMONS-SOURCES.json records authors,
  source/download URLs, licenses, sizes and SHA-256 hashes. Settings opens CREDITS.

## Verification

- `npm test`: 96 passing regressions, including legacy theme migration, shared
  receipts, midnight/year correction, reset semantics and persistence failures.
- Theme browser harness: 22 checks, Chromium 149.0.7827.55, isolated synthetic
  extension profile. Six themes across all three dimensions, COUNT/UNDO and timer
  operations; 185:24:38 and 1,234,567,890; readout/control/footer bounds; reduced
  motion; accessible name 42 for visual 00042; all photographs/fonts decoded.
  All theme changes update the requested popup body size. Native Chrome owns the
  outer popup window resize; other Chromium browsers were not tested.
- A real aborted local Nixie photo request proves visible text fallback and working
  COUNT/UNDO. Forced-colors text fallback is separately captured. No page errors
  or external HTTP(S) requests were observed. 32 screenshots were captured.
- Native display harness: 16 checks. Real 0.1.3 update, retained historical data,
  native activeTab floating iframe, all six themes across shared views, keyboard
  and pointer routing, unauthorized iframe rejection, native side-panel/popup
  creation and switching, full browser/worker restart with durable undo.
  Sidepanel geometry is checked in a page using the same surface URL; native
  side-panel existence and open/close behavior are separately confirmed by Chrome.
- Packaging uses an explicit 50-file allowlist. Verification compares every ZIP
  runtime file with current source and all 18 photographic hashes with provenance.
  Source links in the inert attribution JSON are the sole packaging URL-scan
  exception; executable HTML/CSS/JS/other JSON remain scanned for remote URLs.
- `git diff --check` and JavaScript syntax checks pass. Parent visually compared
  the final four normal layouts with the concept; independent bounded code review
  follows this commit.

## Evidence and limitations

- `.render/themes-qa-1792890956179/results.json`: final 22 checks and 32 captures.
  Main layouts: `{space-age,steampunk,art-deco,nixie}-popup.png`.
- `.render/display-qa-1792890644762/results.json`: 16 native workflow checks on the
  final layout/CSS. A subsequent markup-only readout accessibility role change
  and a 6px compact footer spacing fix are covered by the final theme matrix
  above. The compact session-label bounds now also stay above the decorative
  lower edge; this catches the label occlusion missed by viewport-only bounds.
- `.render/package-materials.log` and `.render/verify-materials.log`: package checks.
- Existing store artwork is historical and is not shipped in the runtime ZIP.
  The capture/composition helpers accept the new popup sizes; production store
  artwork was not replaced. This ZIP is a development artifact, not a release.
- The 18 real photographs increase the archive to about 8 MB. They are loaded
  locally, and the ten Nixie images preload only when that theme is selected.

Development ZIP: `dist/arcade-counter-timer-v0.2.0-chrome-web-store.zip`,
8,223,615 bytes. SHA-256:
`d90bf2acf02e61ee751c0e6d758251dad8f7e4ec6820676b299755ca81fc7211`.
