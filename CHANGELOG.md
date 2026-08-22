# Changelog

All notable changes to Arcade Counter Timer are recorded here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [0.1.2] — 2026-08-22

Optional local digital clock release. No new permissions, dependencies or
external data flows.

### Added

- A compact `NOW HH:MM:SS` 24-hour clock that stays independent of the elapsed
  timer and always resynchronises from system time
- Finite second, minute and hour arcade feedback with reduced-motion support

### Changed

- `CLOCK` is enabled by default for new or previously uninitialised settings;
  an explicitly saved off preference remains off

## [0.1.1] — 2026-07-21

Store listing localization. No change to the interface, the features, the stored
data format or the requested permissions.

### Added

- `_locales/en/messages.json` and `_locales/ja/messages.json` holding the
  extension name and description
- `default_locale: "en"` in the manifest

### Changed

- The manifest's `name`, `description` and `action.default_title` now reference
  the localized messages as `__MSG_extensionName__` and
  `__MSG_extensionDescription__`, so Chrome and the Web Store show Japanese text
  to Japanese users
- Release verification and packaging check the locale files, their message keys,
  the description length limit and the `_locales` entries inside the ZIP

The popup interface itself is still English only.

## [0.1.0] — 2026-07-21

Initial public release.

### Added

- Count-up timer with `HH:MM:SS` display, correct beyond 100 hours, whose
  elapsed time is derived from stored timestamps so it survives closing the
  popup and restarting the browser
- Tally counter with one increment per input
- Visible `START` / `STOP` and `COUNT` controls, plus click targets on the
  timer and count displays
- Separate hold-to-confirm resets for the timer (500 ms) and the count (500 ms)
- Session reset (650 ms hold, or hold `R`) for both at once
- Local statistics for TODAY, WEEK (Monday to Sunday), MONTH and YEAR, derived
  from a single daily history, with timer intervals split at local midnight
- Fly text on fast counting streaks
- CHAIN milestone effect on every 10th count of a session
- Original count, chain and reset sound effects generated with the Web Audio
  API — no audio files
- Settings for sound, fly text, chain effect and the subtle CRT scanlines, plus
  a confirmed `CLEAR ALL DATA` action
- Keyboard shortcuts: `Enter` to start/stop, `Space` to count, hold `R` to reset
  the session, `Esc` to leave the statistics screen
- Local-only storage in `chrome.storage.local`, requesting the `storage`
  permission and nothing else
