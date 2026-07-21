# Arcade Counter Timer

A deliberately small Chrome extension: a count-up timer and a tally counter, in one
popup. It stays quiet while you work, and only for a moment — when you tap the
counter quickly, or every 10th count — does it turn into a little arcade machine.

No build step, no frameworks, no external libraries, fonts, or CDNs. All artwork,
animation and sound is generated in the extension itself (sound via the Web Audio API).

## v0.1 features

- Count-up timer, `HH:MM:SS`, correct past 100 hours
- Timer keeps running while the popup is closed and across browser restarts
  (elapsed time is derived from a stored timestamp, not from an interval)
- Counter with `+1`, plus separate hold-to-confirm resets for the timer, the
  count, and the whole session
- Fly text (`GOOD!` / `NICE!` / `GREAT!` / `FANTASTIC!`) on fast streaks
- `CHAIN!` burst every 10 counts, with a slightly bigger flourish at 50 and 100
- Original Web Audio blips for count, chain and reset
- TODAY / WEEK / MONTH / YEAR statistics, derived from a single daily history
- Toggles for sound, fly text, chain effect and the subtle CRT scanlines

## Keyboard

| Key | Action |
| --- | --- |
| `Enter` | Start / stop the timer |
| `Space` | +1 count |
| `R` (hold 650 ms) | Reset the current session |
| `Esc` | Return from stats to the timer |

Held keys auto-repeat is ignored, so one press is always exactly one count.

Every action also has a visible button: **▶ START / ■ STOP** under the timer and
**+ COUNT** under the number. The timer display and the big count area stay
clickable as mouse shortcuts for those buttons. All entry points call the same
`toggleTimer()` / `addCount()`, so behaviour cannot drift between them.

When a button has keyboard focus, its own `Space`/`Enter` activation wins and the
global shortcut stands down — one keypress is always exactly one action.

## Resets

Every reset button is press-and-hold; a short click does nothing, and releasing
or moving off the button early cancels it.

| Button | Hold | Clears | Keeps |
| --- | --- | --- | --- |
| `RESET TIMER` | 500 ms | Timer only (stopped, back to `00:00:00`) | Count, streak, statistics |
| `RESET COUNT` | 500 ms | Session count, streak, chain state | Timer, statistics |
| `SESSION RESET` (or hold `R`) | 650 ms | Timer **and** count, streak, chain | Statistics, settings |
| `CLEAR ALL DATA` (stats screen) | confirm dialog | Everything, including history and settings | — |

If the timer is running when it is reset, the time elapsed up to that moment is
first credited to the correct day(s) in the history, so statistics never lose it.
Resetting the count never decrements the count statistics — only the number on
screen goes back to 0. The daily history is only ever discarded by
**CLEAR ALL DATA**.

## Load in Chrome

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select this project folder

## Tests

```
npm test
```

Uses Node's built-in `node:test` runner — there are no dependencies to install.
The tests cover duration formatting, midnight/month/year interval splitting,
Monday-based week ranges, the TODAY/WEEK/MONTH/YEAR aggregates, and clamping of
negative time differences.

## Stored data

Everything lives in `chrome.storage.local` on this machine:

| Key | Meaning |
| --- | --- |
| `stateVersion` | Schema version |
| `timer` | `{ running, sessionElapsedMs, runStartedAt }` |
| `sessionCount` | Current session count |
| `history` | `{ "YYYY-MM-DD": { timeMs, count } }` — the only source of truth for stats |
| `settings` | `{ sound, flyText, chainEffect, subtleCrt }` |

Week, month and year totals are derived from `history`, never stored separately.
Timer intervals that cross local midnight are split at midnight and credited to
each day. History older than ~400 days is pruned on startup. Missing or outdated
stored data is merged onto the defaults rather than failing to start.

**CLEAR ALL DATA** (in the stats screen, behind a confirmation) resets everything
including settings.

## Limitations (v0.1)

- Streaks are per-popup-session; closing the popup ends the current streak
- One timer and one counter — no named tasks or multiple counters
- Statistics are numbers only; no graphs or export
- No icons are shipped yet, so Chrome uses its default puzzle-piece icon
- If the system clock jumps backwards, the affected interval counts as zero
  rather than as negative time
- Time that elapses while the popup is closed is credited to the correct days,
  but only written to storage the next time the popup is opened

## Privacy

Fully local. The only permission requested is `storage`. There are no host
permissions, no content scripts, no background service worker, no network
requests, no analytics, and no cloud sync. Nothing ever leaves your browser.
