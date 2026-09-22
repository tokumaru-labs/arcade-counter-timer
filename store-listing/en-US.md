# Chrome Web Store listing — en-US

Copy each field below into the corresponding box in the Developer Dashboard.
This listing describes version 0.2.0.

---

## Name

```
Arcade Counter Timer
```

## Summary / short description

Maximum 132 characters. This text is 108 characters and matches
`_locales/en/messages.json`'s `extensionDescription` exactly, which is what
`manifest.json` now references as `__MSG_extensionDescription__`.

```
A fast arcade-style count-up timer and tally counter with local statistics and satisfying milestone effects.
```

## Category

**Productivity**

It is a work-tracking tool: a timer and a counter with statistics. The arcade
feedback is presentation, not a game.

## Language

English (United States). A Japanese listing is prepared in `ja.md`.

---

## Detailed description

```
Arcade Counter Timer combines a count-up timer and a tally counter. Choose a toolbar popup, a draggable timer on a web page, or Chrome's side panel. It stays quiet while you work and celebrates milestones with brief arcade-style feedback.

CHOOSE YOUR PLACEMENT
Open settings with the gear icon and select POPUP, FLOATING or SIDE PANEL. The floating timer supports dragging, position memory, compact/full size and a position lock. To place it on a new page, click the extension icon on that page. Chrome settings, the Web Store and other protected pages do not support floating placement. Keyboard shortcuts apply while the timer itself has focus.

UPDATES THAT KEEP YOUR RECORDS
Normal updates to this same extension keep your statistics and settings. Version 0.2.0 also keeps a local pre-update snapshot and stops automatically deleting older daily history. After a version upgrade, a themed NEW FEATURE strip appears once below COUNT. It does not appear on fresh installation or each reopening. Uninstalling removes local data; update the existing extension to keep your records.

TIMER
Press START to begin and STOP to pause. The time is shown as HH:MM:SS and stays correct past 100 hours. The timer keeps running while the popup is closed and after you restart the browser, because elapsed time is calculated from a saved timestamp rather than from a running script. An optional small clock in the header shows the current local time.

COUNTER
Press COUNT, or the Space key, to add one. One press is always exactly one count — holding a key down does not run away with the total.

RESETS
Every reset is press-and-hold, so a stray click cannot wipe your session. RESET TIMER clears only the timer. RESET COUNT clears only the count. SESSION RESET clears both. None of them touch your statistics: if the timer was running, the time it had accumulated is credited to the right day first.

STATISTICS
The gear icon opens a second screen with your totals for TODAY, WEEK, MONTH and YEAR, for both time and count. Only a daily history is stored, and the longer periods are derived from it, so nothing drifts out of step when a week or month rolls over. Time that crosses local midnight is split and credited to each day.

MILESTONE EFFECTS
Counting at a steady rhythm shows a brief line of encouragement — GOOD!, NICE!, GREAT!, FANTASTIC! Every tenth count of a session sets off a CHAIN burst instead, with a rising arpeggio, a few sparks and a soft flash. Effects last a few hundred milliseconds and never block what you are doing.

SOUND
All sound effects are generated in the extension with the Web Audio API. There are no audio files and no downloads. Sound can be switched off.

SETTINGS
Choose from three visual themes: Original, Arcade and Editorial. The theme changes presentation only; all timer, counter, reset and statistics behavior stays the same. The local clock, sound, fly text, chain effect and subtle CRT scanlines can each be turned on or off. CLEAR ALL DATA, behind a confirmation dialog, returns everything to defaults. The extension also respects your system's reduced-motion preference.

KEYBOARD
Enter starts and stops the timer. Space adds a count. Holding R resets the session. Escape returns from the statistics screen.

PRIVACY
Arcade Counter Timer works entirely on your device. It uses storage to save your records, activeTab and scripting to insert the floating timer only when you invoke it, and sidePanel for the native side panel. It has no persistent host permissions. The inserted code positions its own UI; it does not extract webpage text, forms or browsing history. A local background worker keeps open views in sync. No network requests, remote code, accounts, advertising, analytics or cloud sync are used. Your records stay in local extension storage.

Free and open source, licensed under GPL-3.0-only.
```

---

## Main features (for reference when filling in other fields)

- Count-up timer, correct past 100 hours, that survives closing the popup
- Tally counter with exactly one increment per input
- Visible START / STOP and COUNT controls
- Separate hold-to-confirm resets for timer and count, plus a session reset
- TODAY / WEEK / MONTH / YEAR statistics derived from a local daily history
- Fly text on fast streaks and a CHAIN effect every 10 counts
- Original Web Audio sound effects, all switchable
- Original, Arcade and Editorial visual themes with locally saved selection
- Optional current local time in the popup header
- Works offline; no account

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| Enter | Start / stop the timer |
| Space | Add one to the count |
| R (hold 650 ms) | Reset the session |
| Esc | Leave the statistics screen |

The extension does not register any browser-level command shortcuts; these keys
work while the timer view has focus, in any of its three display modes.

---

## Single purpose

```
Arcade Counter Timer provides a local count-up timer and tally counter with optional milestone effects and time-based statistics.
```

## Permission justification — storage

```
The storage permission is used to save timer state, session count, daily history, selected theme, and user settings locally so they remain available after the popup closes or the browser restarts.
```

Version 0.2.0 also requests activeTab, scripting and sidePanel. Copy their
separate justifications from `privacy-declarations.md`. No persistent host
permissions or automatically running content scripts are requested. A packaged
background service worker serializes local writes across views.

## Remote code

```
No. The extension does not use remote code.
```

All JavaScript is included in the package. There are no external scripts, no
CDN references, no `eval`, no `new Function`, and no dynamically fetched code.

## Data handling summary

```
The extension does not transmit user data. Timer, counter, history, theme, and settings data remain in chrome.storage.local.
```

Nothing is collected, sold, shared or transferred. See `privacy-declarations.md`
for the item-by-item answers.

## Support information

Support runs through the public repository's GitHub Issues page:

```
https://github.com/tokumaru-labs/arcade-counter-timer/issues
```

Enter it, together with the homepage and privacy policy URLs, from `urls.md`.
