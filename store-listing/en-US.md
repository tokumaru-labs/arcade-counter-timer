# Chrome Web Store listing — en-US

Copy each field below into the corresponding box in the Developer Dashboard.
Nothing here describes a feature that is not in 0.1.2.

---

## Name

```
Arcade Counter Timer
```

## Summary / short description

Maximum 132 characters. This text is 110 characters and matches
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
Arcade Counter Timer is a count-up timer and a tally counter in one small popup. It stays quiet while you work, and turns into a little arcade machine for a fraction of a second when you hit a milestone.

TIMER
Press START to begin and STOP to pause. The time is shown as HH:MM:SS and stays correct past 100 hours. The timer keeps running while the popup is closed and after you restart the browser, because elapsed time is calculated from a saved timestamp rather than from a running script.

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
Sound, fly text, chain effect and the subtle CRT scanlines can each be turned on or off. CLEAR ALL DATA, behind a confirmation dialog, returns everything to defaults. The extension also respects your system's reduced-motion preference.

KEYBOARD
Enter starts and stops the timer. Space adds a count. Holding R resets the session. Escape returns from the statistics screen.

PRIVACY
Arcade Counter Timer works entirely on your device. It requests one permission, storage, and no host permissions. It has no content scripts and no background service worker, so it cannot see the pages you visit. It makes no network requests, includes no remote code, and has no account, no advertising, no analytics and no cloud sync. Your timer state, count, daily history and settings are kept in local extension storage and never leave your computer.

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
- Works offline; no account

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| Enter | Start / stop the timer |
| Space | Add one to the count |
| R (hold 650 ms) | Reset the session |
| Esc | Leave the statistics screen |

The extension does not register any browser-level command shortcuts; these keys
work inside the popup only.

---

## Single purpose

```
Arcade Counter Timer provides a local count-up timer and tally counter with optional milestone effects and time-based statistics.
```

## Permission justification — storage

```
The storage permission is used to save timer state, session count, daily history, and user settings locally so they remain available after the popup closes or the browser restarts.
```

No other permission is requested. There are no host permissions, no optional
permissions, no content scripts and no background service worker.

## Remote code

```
No. The extension does not use remote code.
```

All JavaScript is included in the package. There are no external scripts, no
CDN references, no `eval`, no `new Function`, and no dynamically fetched code.

## Data handling summary

```
The extension does not transmit user data. Timer, counter, history, and settings data remain in chrome.storage.local.
```

Nothing is collected, sold, shared or transferred. See `privacy-declarations.md`
for the item-by-item answers.

## Support information

Support runs through the public repository's GitHub Issues page:

```
https://github.com/tokumaru-labs/arcade-counter-timer/issues
```

Enter it, together with the homepage and privacy policy URLs, from `urls.md`.
