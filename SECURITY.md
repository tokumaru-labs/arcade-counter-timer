# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 0.1.0 | Yes |

## Reporting a vulnerability

**Please do not open a public issue containing vulnerability details**, and do
not include secrets, credentials or personal data in any report.

The public source repository has not been created yet, so there is no reporting
channel at this time. This section will be updated as soon as the repository
exists.

Once it does:

- Use GitHub's **private vulnerability reporting** on the repository's Security
  tab if it is available. That keeps the report confidential until a fix ships.
- If private reporting is not available, open a public issue that says only that
  you have found a security problem and asks for a private channel — with no
  technical detail.

## Scope

Arcade Counter Timer is a Chrome extension that runs entirely in the browser
popup. It requests the `storage` permission only, has no host permissions, no
content scripts, no background service worker, and makes no network requests, so
its attack surface is limited to the popup itself and the data it keeps in
`chrome.storage.local`.

Reports about the extension loading remote code, requesting additional
permissions, or transmitting data are especially welcome — none of those are
supposed to be possible.
