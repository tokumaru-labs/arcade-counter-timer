# 0.2.0 release candidate — publication pending approval

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
and new UI captures. Approval is required before publishing or applying the
permission expansion to an installed copy. No publication is performed by tests.

## Update/rollback

Update the existing extension ID; never uninstall to update. Daily statistics,
timer/count, theme and explicit OFF settings remain. The upgrade retains a
separate raw snapshot under upgradeBackupV020. Legacy stateVersion remains 2.
Already-pruned data cannot be recovered.

Keep the release candidate uninstalled in the user's profile until approved.
Rollback must keep the same extension identity and preserve a complete local
data export first. Reverting to 0.1.3 reintroduces that version's age pruning and
does not show 0.2.0 notices. Do not suggest uninstall/reinstall as rollback.
