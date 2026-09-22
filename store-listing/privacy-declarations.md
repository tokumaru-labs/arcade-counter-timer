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
The storage permission saves timer state, session count, daily history, theme, settings, display preferences, upgrade backup and one-time notice receipts on the device. Session storage temporarily holds tab-bound grants for floating views. No data is sent to a server.
```

**`activeTab`**

```
Temporary access to the tab where the user invokes the extension is needed to display the floating timer. It is used only after user interaction, with no persistent access to all sites. The extension does not extract page text, form contents or browsing history.
```

**`scripting`**

```
Injects packaged code that inserts the floating timer into the user-authorized tab. The code creates only the timer container, handles its drag/size/lock controls and reads viewport dimensions for positioning. It does not collect the webpage's contents or load remote code.
```

**`sidePanel`**

```
Displays the same timer, tally counter and local statistics in Chrome's native side panel when the user selects that display mode.
```

**Host permissions** — none requested, so no justification is required. If the
Dashboard asks anyway, state that the extension requests no host permissions.

**Remote code**

```
No. The extension does not use remote code.
```

All logic ships inside the package: `background.js`, `popup.js` and the modules in `src/`. There
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
| Web history | **No** | Temporary activeTab metadata is used only to place the timer; page URLs/titles are not stored or transmitted |
| User activity (clicks, keystrokes, mouse position) | **Yes, local only** | Retain this existing Dashboard disclosure for timer/count inputs and saved timer position. No general browsing activity is recorded and no activity is transmitted |
| Website content (text, images, page data) | **No** | User-triggered injected code positions its own UI and does not extract webpage text, forms or other content |

The extension stores its own timer values, session count, daily history, theme,
settings, display preferences, upgrade backup and notice receipts in local
storage. Temporary tab-bound floating-view grants are held in session storage.
Both are on the user's device. No user data is transmitted or collected by the
developer. Local processing still requires disclosure under the
[Chrome Web Store user-data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).
The live Dashboard on 2026-09-22 already selected User activity; retain that
selection and leave the other collection categories unselected.

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

Required because the item stores user data. Use the verified public policy URL:

`https://github.com/tokumaru-labs/arcade-counter-timer/blob/main/PRIVACY.md`
