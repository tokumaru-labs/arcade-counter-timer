# Promo video plan (shot list only)

A 25-second capture that reads correctly with the sound off, since store and
social players usually start muted. **This file is a plan. No footage has been
recorded, edited or uploaded.**

## Constraints

- Length: 25 seconds
- Must make sense silently — the extension's sounds are a bonus, not the message
- Screen capture of the real popup only; no mock-ups, no invented UI
- No captions claiming features that do not exist
- Capture at 2× the popup size (720×1080) and downscale, so the digits stay crisp

## Shot list

| Time | Shot | On-screen text |
| --- | --- | --- |
| 0:00–0:04 | Toolbar icon is clicked, the popup opens at 00:00:00, stopped | — |
| 0:04–0:08 | START is pressed; the label flips to STOP, the run dot lights, digits begin climbing | `START` |
| 0:08–0:14 | COUNT pressed steadily; the number bumps each press and GOOD! / NICE! / GREAT! rise beside it | `ONE PRESS, ONE COUNT` |
| 0:14–0:18 | The 10th count lands and the CHAIN burst fires | `EVERY 10TH IS A CHAIN` |
| 0:18–0:22 | Gear icon opens the statistics screen; TODAY / WEEK / MONTH / YEAR are visible | `LOCAL STATISTICS ONLY` |
| 0:22–0:25 | Back to the main screen, timer still running; icon and name | `Arcade Counter Timer` |

## Preparation

- Seed a realistic history first so the statistics screen is not all zeros —
  `npm run capture` shows how the sample session is built
- Keep the mouse pointer visible so it is clear which control is being pressed
- Leave the CRT and effect settings at their defaults
- Record the counting section in one take; do not cut mid-streak, as the streak
  is what earns the fly text

## Do not

- Speed up or slow down the footage to make effects look longer or livelier
- Add sound effects that the extension does not produce
- Show a browser with other extensions or personal tabs visible
- Include Chrome or Google branding beyond the unavoidable browser chrome
