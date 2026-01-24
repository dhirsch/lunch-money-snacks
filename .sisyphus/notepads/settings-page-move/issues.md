# Issues - settings-page-move

## Problems & Gotchas

## Settings Page Error: Failed to load data

### Symptom
Options page shows "Failed to load data" with no console errors.

### Cause (likely)
`extensionApi` resolved to `webextension-polyfill` instead of the native `chrome` API in the options page. In some contexts, the polyfill object can be incomplete (missing `storage`), causing storage calls to throw and be caught by `SettingsApp` with the generic error message.

### Fix Applied
Changed `extensionApi` preference order to use global `chrome` before the polyfill:
- Old: `globalBrowser ?? browser ?? globalChrome`
- New: `globalBrowser ?? globalChrome ?? browser`

This ensures extension pages use the native `chrome` APIs when available, avoiding polyfill initialization gaps.

### Verification Steps
1. Rebuild and reload extension from `dist/chrome`.
2. Open settings page via icon.
3. Confirm storage stats and categories render without error.
