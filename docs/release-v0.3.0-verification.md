# 0.3.0 publication preparation

Release-only review base: `277497af099e146e568ba00f02d1c93e383067bd`.
The six-theme, complete-Nixie and repeated-undo implementation was already
verified before this release diff. This preparation does not itself publish.

## Changes

- Manifest, package, bundled release notes and verification assumptions agree
  on 0.3.0. No lockfile existed and none was created; no new dependency or
  permission was added. Storage remains schema 4, and upgradeBackupV020 keeps
  its existing contract and name.
- The 0.3.0 notice describes six themes and repeated COUNT undo in English and
  Japanese. A real upgrade screenshot exposed material-theme notice text being
  clipped by its grid row. A red-first containment assertion reproduced it;
  one `min-height: min-content` declaration fixes the notice without changing
  ordinary screens. All six notice themes and two compact views were checked.
- README, changelog, privacy/local-undo descriptions and English/Japanese
  listings, review instructions, URLs and submission kit now describe 0.3.0.
  The short reviewer field is 398 characters (limit 500).
- Store artwork uses real extension pages and controller operations in an
  isolated profile. 13 native captures cover six themes, stats and a real
  42→41→40 undo sequence. System.Drawing only scales complete captures and
  adds captions. Five 1280×800 images per language, plus refreshed small and
  marquee promo tiles, were all visually checked. Old composed Original-era
  screenshot files were removed. All image/font assets remain local.

## Validation

- **109 unit tests passed**. Includes the new 0.2.0 update-note test proving
  records and the existing recovery snapshot remain, and the notice is claimed once.
- **3 bounded real-extension release checks passed**. Old source commit
  `42a4b3caa5835e5e5040ac388cefd742e4f135d1` reports manifest 0.2.0, then loads
  the current 0.3.0 files with the same extension ID. Stored records/settings
  and backup are unchanged; no notice replay; new COUNTs normalize to schema 4
  and repeated undo restores their totals. No older operations are invented.
- Source capture: no page errors or external network requests. Entire composed
  screenshots, labels and full Nixie housings were inspected in both languages.
- Package, verify, submission-kit generation and `git diff --check` passed.
  All 53 runtime ZIP entries match the current source. Store image dimensions
  are validated; source-image byte provenance remains intact.
- The previous full functional/UI suites are recorded in
  `deep-undo-verification.md`; no unrelated feature audit was repeated.

## Exact artifacts

- Final ZIP: `dist/arcade-counter-timer-v0.3.0-chrome-web-store.zip`
- Bytes: **10,025,711**
- SHA-256: `1795ba2868272f88b8d3b8888dd0232b771145f266c3322ce4090b992dfdbc73`
- Kit: `dist/chrome-web-store-v0.3.0/`
- Kit file hashes: `dist/chrome-web-store-v0.3.0/submission-files.sha256`
- Descriptions: kit `description-en-US.txt` and `description-ja.txt`
- Short test field: kit `review-instructions-short.txt`
- Images: kit `screenshot-{main,machinery,style,arcade,undo}-1280x800.png`
  and the matching `-ja-1280x800.png` files, plus `small-promo-440x280.png`,
  `marquee-promo-1400x560.png` and `store-icon-128.png`.
- Native capture evidence: `.render/store-capture-1792894051993/`
- Upgrade/notice evidence: `.render/release-upgrade-1792894413844/`
- Logs: `.render/release-unit.txt`, `.render/release-notice-red.txt`,
  `.render/release-package.txt`, `.render/release-verify.txt`, `.render/release-kit.txt`

Upload only to existing item `cfonffmpidgimppooikhhhlceaoipkeb`. Keep current
distribution, free pricing and local-activity disclosure. Git push/merge and
Web Store submission are handled by the parent task after this immutable handoff.
The user's active trial profile and counter/timer were not touched.
