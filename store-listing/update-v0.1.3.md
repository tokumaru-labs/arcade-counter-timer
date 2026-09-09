# Chrome Web Store update — v0.1.3

This is the shortest manual path for updating the existing item. The Developer
Dashboard cannot be automated from this workspace, so use the exact files and
text below.

## Package

Upload:

`dist/arcade-counter-timer-v0.1.3-chrome-web-store.zip`

After upload, confirm that the Dashboard reports:

- Version: **0.1.3**
- Permission: **storage** only
- No host permissions
- No background service worker
- No content scripts
- No remote-code warning

## What's new

Use this text if the Dashboard provides a release-notes field:

```
Added three locally saved visual themes: Original, Arcade and Editorial. Timer, counter, local clock, statistics, resets, privacy and permissions are unchanged.
```

Japanese version:

```
端末内に選択状態を保存する ORIGINAL、ARCADE、EDITORIAL の3テーマを追加しました。タイマー、カウンター、ローカル時計、統計、リセット、プライバシー、権限に変更はありません。
```

## Store listing updates

Replace the detailed description with the prepared block in `en-US.md`. If the
Japanese locale is enabled, replace it with the block in `ja.md`. The name,
category and short description do not change.

## Screenshots

Upload in this order:

1. `store-assets/screenshot-main-1280x800.png`
2. `store-assets/screenshot-arcade-1280x800.png`
3. `store-assets/screenshot-editorial-1280x800.png`
4. `store-assets/screenshot-stats-1280x800.png`

The 128×128 store icon and promo tiles are unchanged and may stay as they are.

## Privacy

The data categories and permission scope do not change. If the Dashboard asks
for the storage justification again, paste:

```
The storage permission is used to save timer state, session count, daily history, selected theme, and user settings locally so they remain available after the popup closes or the browser restarts.
```

Privacy policy URL:

`https://github.com/tokumaru-labs/arcade-counter-timer/blob/main/PRIVACY.md`

## Final manual actions

1. Preview the listing.
2. Test the exact uploaded package once.
3. Save the draft.
4. Submit it for review only when ready.
