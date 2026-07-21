# Privacy declarations — Developer Dashboard

Answers for the **Privacy practices** tab, item by item.

> **Check the wording on the Dashboard before submitting.** Google revises these
> questions and their categories from time to time, and the exact labels below
> may no longer match what is on screen. Match each answer to the current
> Dashboard wording rather than assuming this file is up to date. Every answer
> here is taken from what the code actually does — nothing is assumed.

## Single purpose

```
Arcade Counter Timer provides a local count-up timer and tally counter with optional milestone effects and time-based statistics.
```

## Permission justification

**`storage`**

```
The storage permission is used to save timer state, session count, daily history, and user settings locally so they remain available after the popup closes or the browser restarts.
```

**Host permissions** — none requested, so no justification is required. If the
Dashboard asks anyway, state that the extension requests no host permissions.

**Remote code**

```
No. The extension does not use remote code.
```

All logic ships inside the package: `popup.js` and the modules in `src/`. There
is no `eval`, no `new Function`, no external `<script>`, no CDN, no external
fonts, and no dynamic import of anything fetched at runtime.

## Data usage — what is collected

| Category | Answer | Basis |
| --- | --- | --- |
| Personally identifiable information | **No** | Never read or stored |
| Health information | **No** | Never read or stored |
| Financial and payment information | **No** | Never read or stored |
| Authentication information | **No** | No sign-in of any kind |
| Personal communications | **No** | No access to messages or mail |
| Location | **No** | No geolocation API use, no IP handling |
| Web history | **No** | No `tabs`, `history` or host permissions |
| User activity (clicks, keystrokes, mouse position) | **No external collection** | Key and click input drives the timer and counter in the popup and is not recorded or transmitted |
| Website content (text, images, page data) | **No** | No content scripts and no host permissions, so page content is unreachable |

The only data that exists at all is the extension's own state — timer values,
session count, daily history and settings — written to `chrome.storage.local` on
the user's device.

## Data handling certifications

| Statement | Answer |
| --- | --- |
| I do not sell or transfer user data to third parties, outside of the approved use cases | **Certify: yes** — no data leaves the device, so there is nothing to sell or transfer |
| I do not use or transfer user data for purposes that are unrelated to my item's single purpose | **Certify: yes** |
| I do not use or transfer user data to determine creditworthiness or for lending purposes | **Certify: yes** |

## Other declarations

| Item | Answer |
| --- | --- |
| Analytics / telemetry | **None** |
| Advertising | **None** |
| Sale of data | **No** |
| Sharing of data | **No** |
| Cloud sync | **No** — `chrome.storage.sync` is not used |
| Accounts | **None** |
| Network requests | **None** |

## Privacy policy URL

Required because the item stores user data. Point it at the published
`PRIVACY.md` once the public repository exists — see `urls.md`. Do not submit an
invented URL.
