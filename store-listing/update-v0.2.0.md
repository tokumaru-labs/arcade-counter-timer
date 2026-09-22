# 0.2.0 Chrome Web Store update

Floating placement, native side panel, existing popup, and one-time themed
release notices. Same-ID updates preserve statistics. No automatic age pruning.

## Permission declarations

- storage: timer/count/history/settings, placement, update receipt and one
  pre-update backup; all local.
- activeTab + scripting: user-triggered insertion of the floating timer only.
- sidePanel: native browser side panel.
- No persistent host permissions, automatic site access, remote code, telemetry,
  accounts or paid API.

The previous 0.1.x permission/privacy declarations and screenshots are historical
and must not be submitted as 0.2.0 declarations. Use the current PRIVACY files
and new UI captures. The owner approved proceeding with this Store update on
2026-09-22 after testing and merging PR #1. No publication is performed by tests.

## Submission

Use the existing Arcade Counter Timer item, currently version 0.1.3; do not
create a new item. Upload the ZIP in this kit, copy the detailed descriptions
from listing-en-US.md and listing-ja.md into the existing locales, and replace
outdated screenshots with the four current screenshots in the kit.

Enter all four permission justifications from privacy-declarations.md, retain
the existing distribution, and add review-notes.md as reviewer instructions.
Submit for review with automatic publication after approval. Record the actual
Dashboard status; submitted for review is not the same as publicly available.

## Update/rollback

Update the existing extension ID; never uninstall to update. Daily statistics,
timer/count, theme and explicit OFF settings remain. The upgrade retains a
separate raw snapshot under upgradeBackupV020. Legacy stateVersion remains 2.
Already-pruned data cannot be recovered.

The owner has tested an unpacked copy. Its data is separate if its ID differs.
Rollback must keep the same extension identity and preserve a complete local
data export first. Reverting to 0.1.3 reintroduces that version's age pruning and
does not show 0.2.0 notices. Do not suggest uninstall/reinstall as rollback.
