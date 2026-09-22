English | [日本語](PRIVACY_JA.md)

# Privacy Policy — Arcade Counter Timer

**Last updated: 2026-09-22**
**Applies to: Arcade Counter Timer 0.2.0, by Tokumaru Labs (release candidate)**

The extension has no server, accounts, analytics, advertising, cloud sync or
remote code. It does not transmit data to any service.

## Local records

`chrome.storage.local` stores the timer state, session count, daily time/count
history, selected theme, clock/sound/effect settings, preferred display mode,
floating coordinates, size/lock preferences and the pending/seen release notice.
When updating to 0.2.0, it also saves one local copy of the previous timer,
statistics and settings. These records stay in the same browser profile.

`chrome.storage.session` temporarily stores an internal grant for each floating
view (tab identifier and a random token). It binds the inserted view to its tab,
is not a user identifier, and is cleared when the browser restarts.

Normal same-ID extension updates retain local data. Version 0.2.0 does not
automatically prune old daily history. Data pruned by older versions cannot be
reconstructed by this update.

## Permissions and page access

- `storage`: remember the records above locally.
- `activeTab`: temporary access to the tab where you invoke the extension.
- `scripting`: insert the floating timer UI in that permitted tab.
- `sidePanel`: display the timer in the browser side panel.

There are no persistent host permissions or automatic scripts on every site.
The injected script appends its own timer container and reads viewport dimensions
for positioning. It does not extract the webpage's text, forms or browsing
history. Browser-provided tab metadata is used only to place/open the timer;
page URLs and titles are not stored. The embedded view is an extension page,
and unauthorized embeddings cannot read or change timer data through its worker.

Packaged view assets are web-accessible using dynamic extension URLs so the
injected iframe can load them. This does not grant access to website contents.

## Your control

- Session/timer/count resets retain historical totals and settings.
- Confirmed **CLEAR ALL DATA** clears the timer, count, statistics, settings,
  display preferences and upgrade snapshot. A release-notice receipt is retained
  so clearing statistics does not replay an announcement.
- Uninstalling the extension removes its local data. Update the existing
  extension instead of uninstalling/reinstalling if you want to keep records.

No names, email addresses, location, webpage content or browsing history are
collected, sold or shared, for users of any age.

## Changes and contact

Policy changes are published in this repository with an updated date.
Questions: https://github.com/tokumaru-labs/arcade-counter-timer/issues
Do not post private information in public issues. For security reports follow
[SECURITY.md](SECURITY.md).
