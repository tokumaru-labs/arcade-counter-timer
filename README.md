English | [日本語](README_JA.md)

# Arcade Counter Timer

A count-up timer and tally counter that stays out of your way, and turns into a
small arcade machine for a fraction of a second when you hit a milestone.

<img src="store-assets/source/popup-main.png" alt="The Arcade Counter Timer popup: a running timer, a large count, and START and COUNT buttons" width="300">

Version 0.1.0 · by Tokumaru Labs · Chrome Extension (Manifest V3)

## What it does

Two things, well:

- **A count-up timer** — `HH:MM:SS`, correct past 100 hours, that keeps running
  while the popup is closed and across browser restarts.
- **A tally counter** — one press, one count.

Everything else is feedback. Counting quickly earns a brief line of fly text,
and every 10th count sets off a short CHAIN burst with an original sound. The
effects last a few hundred milliseconds and never block input; if you would
rather work in silence, each one can be switched off.

## Features

- Count-up timer with start/stop and its own reset
- Session counter with its own reset
- Session reset for both at once
- TODAY / WEEK / MONTH / YEAR statistics, kept locally
- Fly text on fast streaks (`GOOD!` → `NICE!` → `GREAT!` → `FANTASTIC!`)
- CHAIN milestone effect on every 10th count
- Original sound effects generated with the Web Audio API — no audio files
- Settings for sound, fly text, chain effect and the subtle CRT scanlines
- Works entirely offline, with no account

## Main controls

| Control | Action |
| --- | --- |
| **▶ START / ■ STOP** | Start or stop the timer |
| **+ COUNT** | Add one to the count |
| `RESET TIMER` | Hold 500 ms — timer only |
| `RESET COUNT` | Hold 500 ms — count only |
| `SESSION RESET` | Hold 650 ms — timer and count |
| ⚙ (gear) | Statistics and settings |

The timer readout and the big count area are also clickable, as mouse shortcuts
for the two buttons.

## Keyboard

| Key | Action |
| --- | --- |
| `Enter` | Start / stop the timer |
| `Space` | +1 count |
| `R` (hold 650 ms) | Session reset |
| `Esc` | Back from statistics to the timer |

Auto-repeat is ignored, so holding a key never runs away with the count. When a
button has keyboard focus its own `Space` / `Enter` activation takes over, so one
keypress is always exactly one action. After a mouse, touch or pen press the
button hands focus back, and the shortcuts resume their global meaning.

## Resets

Every reset is press-and-hold; a short click does nothing, and releasing or
moving off the button early cancels it.

| Reset | Hold | Clears | Keeps |
| --- | --- | --- | --- |
| `RESET TIMER` | 500 ms | Timer only | Count, streak, statistics |
| `RESET COUNT` | 500 ms | Count, streak, chain state | Timer, statistics |
| `SESSION RESET` (or hold `R`) | 650 ms | Timer **and** count, streak, chain | Statistics, settings |
| `CLEAR ALL DATA` | confirmation dialog | Everything, including history and settings | — |

If the timer is running when it is reset, the time elapsed up to that moment is
credited to the correct day first, so statistics never lose it. Resetting the
count never decrements the count statistics.

## Statistics

The gear opens a second screen with TODAY, WEEK, MONTH and YEAR totals for both
time and count. Only a daily history is stored; the week (Monday to Sunday),
month and year totals are derived from it, so there is nothing to get out of
sync at a boundary. Timer intervals that cross local midnight are split at
midnight and credited to each day.

## Fly text and CHAIN

Counting faster than roughly one press every 650 ms builds a streak:

| Streak | Text |
| --- | --- |
| 3 | `GOOD!` |
| 5 | `NICE!` |
| 7 | `GREAT!` |
| 9 | `FANTASTIC!` |
| 13, then every 4th | `FANTASTIC!` |

Every 10th count of the session shows a CHAIN burst instead — `CHAIN!`,
`2 CHAIN!`, `3 CHAIN!` and so on — with a rising arpeggio, a few sparks and a
brief flash. The 50th and 100th add one extra note. Streaks live only as long as
the popup is open; they are never stored.

Reduced-motion preferences are respected: sparks, strong scaling and the flash
are toned down when the system asks for less motion.

## Install

The extension is not published to the Chrome Web Store yet. To run it from
source:

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select this project folder

## Development

No build step, no dependencies, no bundler. Vanilla HTML, CSS and ES modules.

```
npm test              # 47 unit tests, Node's built-in node:test runner
npm run verify        # release checks: manifest, permissions, icons, no remote code
npm run package       # build the Chrome Web Store ZIP into dist/
```

Helper scripts, none of which are needed to run the extension:

```
npm run icons         # re-render assets/icons/*.png from the SVG source
npm run capture       # screenshot the real popup with headless Chrome
npm run store-assets  # compose the 1280x800 store screenshots
```

Tests cover the pure logic — duration formatting, midnight/month/year interval
splitting, Monday-based week ranges, the statistics aggregates, the reset state
transitions and the keyboard routing rules. They import the same modules the
extension uses; there is no DOM test harness and no test dependency.

## Privacy

Everything happens on your machine. See [PRIVACY.md](PRIVACY.md) for the full
statement.

- **Permissions:** `storage`, and nothing else
- No host permissions, no content scripts, no background service worker
- No network requests, no analytics, no ads, no account, no cloud sync
- Timer state, session count, daily history and settings live in
  `chrome.storage.local` on your device

## Limitations in 0.1.0

- Streaks are per-popup-session; closing the popup ends the current streak
- One timer and one counter — no named tasks or multiple counters
- Statistics are numbers only; no graphs or export
- Time that elapses while the popup is closed is credited to the correct days,
  but written to storage the next time the popup is opened
- If the system clock jumps backwards, the affected interval counts as zero

## License

[GPL-3.0-only](LICENSE). Copyright © 2026 Tokumaru Labs.
