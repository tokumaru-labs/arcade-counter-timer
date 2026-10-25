# 0.3.0 Chrome Web Store submission

Update existing item `cfonffmpidgimppooikhhhlceaoipkeb` from public 0.2.0.
Six themes and repeated COUNT undo; unchanged four permissions, distribution and pricing.
The user authorized publication on 2026-10-25. This kit itself does not upload or publish.

## Files

- `arcade-counter-timer-v0.3.0-chrome-web-store.zip` and its SHA-256 file.
- `description-en-US.txt` / `description-ja.txt`: exact detailed descriptions.
- Five 1280×800 screenshots per language (`screenshot-*-1280x800.png`, Japanese names contain `-ja-`).
  Main shows Space Age; machinery shows Steampunk/Nixie; style shows Art Deco/Editorial;
  arcade shows Arcade/local statistics; undo shows actual 42→40 after two undo operations.
- Small and marquee promotional tiles, store icon, reviewer notes, privacy declarations and URLs.

Use the five English images for the all-languages fallback and the Japanese five
for the Japanese locale. Replace old artwork rather than appending an obsolete
Original theme image. Upload the ZIP and update the existing locale descriptions.
Keep the current local-activity disclosure; add undo history to the storage reason.
Do not declare new host access or data transmission. Submit for review with automatic
publication after approval; record dashboard status and separately confirm public release.

## Data compatibility

Same-ID updates retain records and settings. Schema 3's one valid undo receipt
imports as one step; schema 1/2 aggregates do not invent past operations. New
COUNTs add steps, compressed by consecutive date. Timer/count/session resets
clear undo history without erasing cumulative totals. Start/stop and settings
preserve it. Existing `upgradeBackupV020` is deliberately retained, never renamed
or overwritten. Schema 4 cannot be edited safely by older workers: keep a data
export and use a compatible forward fix rather than uninstall/reinstall or a downgrade.
