# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 0.1.0 | Yes |

## Reporting a vulnerability

**Please do not open a public issue containing vulnerability details**, and do
not include secrets, credentials or personal data in any report.

The repository is https://github.com/bhcir/arcade-counter-timer.

**GitHub private vulnerability reporting is not currently enabled on this
repository**, so there is no confidential channel available right now. Until
that changes:

- Open an issue at
  https://github.com/bhcir/arcade-counter-timer/issues that says only that you
  have found a security problem and asks for a private channel. Include **no**
  technical detail, no proof of concept, and no logs.
- Wait for a private channel to be arranged before sending anything further.

If private vulnerability reporting is enabled later, it will become the
preferred route — check the repository's Security tab, and this file will be
updated at the same time.

## Scope

Arcade Counter Timer is a Chrome extension that runs entirely in the browser
popup. It requests the `storage` permission only, has no host permissions, no
content scripts, no background service worker, and makes no network requests, so
its attack surface is limited to the popup itself and the data it keeps in
`chrome.storage.local`.

Reports about the extension loading remote code, requesting additional
permissions, or transmitting data are especially welcome — none of those are
supposed to be possible.
