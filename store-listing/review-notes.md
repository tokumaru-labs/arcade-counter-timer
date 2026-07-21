# Notes for the reviewer

Paste into the **Notes for reviewers** box in the Developer Dashboard.

```
Arcade Counter Timer is a count-up timer and a tally counter that runs entirely inside its popup. There is nothing to sign in to and nothing to configure before use.

How to test:

1. Click the extension's toolbar icon to open the popup.
2. Click START to begin the timer. The display updates once per second and the label changes to STOP. Closing and reopening the popup shows the timer still running, because elapsed time is derived from a stored timestamp.
3. Click COUNT, or press the Space key, to increment the counter. Each press adds exactly one.
4. Press COUNT several times in quick succession. A short line of text (GOOD!, NICE!, GREAT!, FANTASTIC!) appears briefly, and every tenth count shows a CHAIN effect with a short generated sound.
5. Click the gear icon in the top right to see TODAY / WEEK / MONTH / YEAR statistics and the settings. Sound and the visual effects can each be switched off here. Press Escape or the back arrow to return.
6. Press and hold RESET TIMER or RESET COUNT for about half a second to reset one of them; hold SESSION RESET (or the R key) for about two thirds of a second to reset both. A short click deliberately does nothing. Statistics are preserved by all three.
7. CLEAR ALL DATA, at the bottom of the statistics screen, resets everything including statistics and settings, after a confirmation dialog.

Notes:

- No account, login, or external service is required or offered.
- There are no paid features, no in-app purchases and no advertising.
- The extension makes no network requests. It contains no remote code, no external scripts, no CDN references and no external fonts. All sound is synthesised at runtime with the Web Audio API; there are no audio files in the package.
- All data is stored locally with chrome.storage.local: timer state, session count, a per-day history used for the statistics, and the four settings toggles.
- Permissions: "storage" only. No host permissions, no content scripts, no background service worker, so the extension has no access to any web page.
- Source code is available under GPL-3.0-only.
```
