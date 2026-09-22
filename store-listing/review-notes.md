# Notes for the reviewer

Paste into the **Notes for reviewers** box in the Developer Dashboard.

```
Arcade Counter Timer is a local count-up timer and tally counter with a popup, user-triggered floating view and native Chrome side panel. No login or external service is required. This is a 0.1.3 to 0.2.0 update of the existing item; keep the same extension ID.

How to test:

1. Click the extension's toolbar icon to open the popup.
2. Click START to begin the timer. The display updates once per second and the label changes to STOP. Closing and reopening the popup shows the timer still running, because elapsed time is derived from a stored timestamp.
3. Click COUNT, or press the Space key, to increment the counter. Each press adds exactly one.
4. Press COUNT several times in quick succession. A short line of text (GOOD!, NICE!, GREAT!, FANTASTIC!) appears briefly, and every tenth count shows a CHAIN effect with a short generated sound.
5. Click the gear icon in the top right to see TODAY / WEEK / MONTH / YEAR statistics and the settings. Select Original, Arcade or Editorial to change the visual theme; timer and counter behavior stays the same. Sound and the visual effects can each be switched off here. Press Escape or the back arrow to return.
6. Press and hold RESET TIMER or RESET COUNT for about half a second to reset one of them; hold SESSION RESET (or the R key) for about two thirds of a second to reset both. A short click deliberately does nothing. Statistics are preserved by all three.
7. On a regular HTTPS webpage, open settings and select FLOATING, then open the selected view. Drag the header, switch size, lock the position and count. Chrome settings and the Chrome Web Store are protected pages and cannot host the floating view. Click the toolbar icon on a different normal page to place it there.
8. Select SIDE PANEL and open it, then select POPUP to return. All views share timer/count/statistics and persist display preferences. Floating mode does not require permanent host permissions.
9. Upgrade the same extension from 0.1.3 to 0.2.0 with existing statistics. Confirm records remain and NEW FEATURE appears once below COUNT on the first visible main view. It must not replay on reopening, same-version reload or fresh installation. A raw pre-upgrade snapshot is retained locally; history is no longer age-pruned.
10. CLEAR ALL DATA, at the bottom of settings, clears statistics and settings after confirmation. A notice receipt remains to prevent replay. Use disposable test data for this destructive check; it is not part of the update procedure.

Notes:

- No account, login, or external service is required or offered.
- There are no paid features, no in-app purchases and no advertising.
- The extension makes no network requests. It contains no remote code, no external scripts, no CDN references and no external fonts. All sound is synthesised at runtime with the Web Audio API; there are no audio files in the package.
- Local storage holds timer/count/history/settings, display preferences, the upgrade snapshot and notice receipt. Session storage holds temporary tab-bound grants for floating views.
- Permissions: storage, activeTab, scripting and sidePanel. No persistent host permissions. User-triggered packaged code inserts its own UI without extracting page contents; a packaged worker serializes shared state writes.
- Source code is available under GPL-3.0-only.
```
