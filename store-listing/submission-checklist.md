# Chrome Web Store submission checklist

Work through this in the Developer Dashboard. Everything is prepared in advance;
this file is the order to use it in. **Nothing here is automated — the upload,
the declarations and the final "Submit for review" are all manual.**

## Before you start

- [ ] `npm test` passes
- [ ] `npm run verify` passes
- [ ] `npm run package` has produced
      `dist/arcade-counter-timer-v0.1.2-chrome-web-store.zip`
- [ ] The ZIP has been loaded unpacked in Chrome once and manually exercised
- [ ] The URLs in `urls.md` still load

## Package

- [ ] Upload `dist/arcade-counter-timer-v0.1.2-chrome-web-store.zip`
- [ ] The Dashboard's manifest analysis reports version **0.1.2**
- [ ] It reports the **storage** permission and nothing else
- [ ] It reports no host permissions and no remote code warnings
- [ ] The item name and description are picked up from `_locales/en` — the
      Dashboard shows the English text, not `__MSG_extensionName__`

## Store listing

- [ ] Name: `Arcade Counter Timer` (from `en-US.md`)
- [ ] Summary: the 110-character line from `en-US.md`
- [ ] Detailed description: the block from `en-US.md`
- [ ] Category: **Productivity**
- [ ] Language: English (United States)
- [ ] Japanese listing added from `ja.md`, if publishing a second locale

## Graphics

- [ ] Store icon 128×128 — `store-assets/store-icon-128.png`
- [ ] At least one screenshot 1280×800 — `store-assets/screenshot-main-1280x800.png`
- [ ] Second screenshot 1280×800 — `store-assets/screenshot-stats-1280x800.png`
- [ ] Small promo tile 440×280 — `store-assets/small-promo-440x280.png`
- [ ] Marquee promo tile 1400×560 — `store-assets/marquee-promo-1400x560.png` (optional)
- [ ] Every screenshot shows the real, current UI — no mock-ups, no invented
      features, no misleading numbers

## Privacy practices

Answers are in `privacy-declarations.md`. Confirm the Dashboard's current
wording before entering them.

- [ ] Single purpose statement
- [ ] `storage` permission justification
- [ ] Remote code: **No**
- [ ] Data collection: none of the categories apply
- [ ] The three data-handling certifications ticked
- [ ] Privacy policy URL entered (required — the item stores user data)

## Distribution

- [ ] Visibility chosen deliberately: **Unlisted** is the safer first submission;
      switch to Public once the listing has been reviewed end to end
- [ ] Distribution regions selected
- [ ] Pricing: free

## Support and links

Fill in from `urls.md` — leave blank rather than entering a guess.

- [ ] Homepage URL
- [ ] Support URL
- [ ] Privacy policy URL

## Final steps

- [ ] Notes for reviewers pasted from `review-notes.md`
- [ ] Preview the listing and re-read it for claims the extension does not make
- [ ] One last manual test of the exact ZIP being submitted
- [ ] **Submit for review** (manual, deliberate action)

## After submission

- [ ] Record the item ID
- [ ] Tag the release in git and publish release notes from `CHANGELOG.md`
- [ ] Add the store URL to `README.md` and `README_JA.md`
