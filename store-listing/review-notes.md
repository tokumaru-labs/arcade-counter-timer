# Notes for reviewers — 0.3.0

Paste the block into the Developer Dashboard. Existing item cfonffmpidgimppooikhhhlceaoipkeb.

```
Arcade Counter Timer is a local count-up timer and counter. This updates the same item from 0.2.0 to 0.3.0 with six themes and repeatable COUNT undo. No login, remote service, new permission or paid feature is needed.

1. Open the toolbar popup and press START/STOP. Closing and reopening preserves elapsed time.
2. Press COUNT three times, then UNDO repeatedly. Each operation removes one retained count and its original day's statistics. Reopen Chrome between operations to verify that undo history persists. Older aggregate counts are not retrospectively undoable; a valid one-step receipt from a prior build imports as one step.
3. Settings offers Space Age, Arcade, Editorial, Steampunk, Art Deco and Nixie. Space Age replaces the old default while preserving all records. Steampunk flips changed digit halves; Nixie shows complete glass housings. Sound and effects are optional, and reduced motion is respected.
4. Try the existing FLOATING mode on a normal HTTPS page and the native SIDE PANEL. All views share the same timer, counts and undo history. Protected browser/Web Store pages cannot host floating UI.
5. Hold RESET TIMER, RESET COUNT or SESSION RESET. Daily statistics remain; all undo history clears. START/STOP, theme and ordinary settings changes preserve undo history. Use disposable data for reset tests. CLEAR ALL DATA remains confirmation-protected.
6. Update the existing 0.2.0 item without uninstalling. Records/settings and any existing upgradeBackupV020 snapshot remain. The 0.3.0 NEW FEATURE notice appears once, then does not replay on reopen or same-version reload. Fresh installs show no update notice.

Only storage, activeTab, scripting and sidePanel are requested. No persistent host permissions. User-triggered code places its own UI without extracting page contents. A local worker serializes changes. Stored records include timer, count, local undo history, daily totals, preferences, an existing recovery snapshot and notice receipt. Nothing is transmitted. All fonts, images and scripts are bundled; attribution is accessible in settings.
```
