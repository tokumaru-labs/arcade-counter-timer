English | [日本語](PRIVACY_JA.md)

# Privacy Policy — Arcade Counter Timer

**Last updated: 2026-07-21**
**Applies to: Arcade Counter Timer 0.1.0, by Tokumaru Labs**

## Summary

Arcade Counter Timer does not collect anything. It has no server, makes no
network requests, and has no way to send your data anywhere. Everything it
remembers is stored by Chrome on your own device.

## What is stored, and where

The extension stores the following in `chrome.storage.local`, the local storage
area Chrome provides to extensions on your device:

| Data | Purpose |
| --- | --- |
| Timer state (running flag, elapsed milliseconds, start timestamp) | So the timer keeps running while the popup is closed and after a browser restart |
| Session count | So the current count survives closing the popup |
| Daily history (`{ "YYYY-MM-DD": { timeMs, count } }`) | To show TODAY / WEEK / MONTH / YEAR statistics |
| Settings (sound, fly text, chain effect, CRT effect) | To remember your preferences |

That is the complete list. Nothing else is recorded.

## What is not done

- **No transmission.** The extension makes no network requests of any kind. It
  contains no remote code, no external scripts, fonts, or media, and no CDN
  references.
- **No accounts.** There is no sign-in, and no user identifier is created.
- **No personal information.** Names, email addresses, location, browsing
  history, page content and similar data are never accessed or stored.
- **No analytics or telemetry.** Usage is not measured or reported.
- **No advertising.**
- **No selling or sharing.** Since no data leaves your device, there is nothing
  to sell, share, or transfer to any third party.
- **No cloud sync.** `chrome.storage.sync` is not used; data stays on the
  device where it was created.

## Permissions

The extension requests exactly one permission:

- **`storage`** — to save the timer state, session count, daily history and
  settings locally, so they are still there after the popup closes or the
  browser restarts.

It requests no host permissions, and it uses no content scripts and no
background service worker, so it has no access to the pages you visit.

## Your control over the data

- **Clear it from inside the extension.** Open the gear icon and use
  **CLEAR ALL DATA**. After the confirmation dialog, the timer, session count,
  daily history and settings are all returned to their defaults.
- **Clear it by uninstalling.** Removing the extension from Chrome also removes
  the local data Chrome maintains for it.

## Children

The extension is a timer and counter. It collects no data at all, from anyone,
regardless of age.

## Changes to this policy

If this policy changes, the updated version will be published in the extension's
public source repository and the "Last updated" date above will change.

## Contact

Questions about this policy are handled through the project's GitHub Issues page:

https://github.com/tokumaru-labs/arcade-counter-timer/issues

Please do not include personal information in an issue — it is a public page.
For suspected security problems, follow
[SECURITY.md](https://github.com/tokumaru-labs/arcade-counter-timer/blob/main/SECURITY.md)
instead.
