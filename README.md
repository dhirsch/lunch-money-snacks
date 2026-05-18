# Lunch Money Snacks

Browser extension enhancements for [Lunch Money](https://lunchmoney.app/), focused on making the budget and transaction review workflows more useful without turning Lunch Money into a whole new app.

The extension started as budget notes for the Lunch Money budget page and now includes optional sync and Amazon transaction memo helpers.

## Features

### Budget notes and itemized breakdowns

- Add free-form notes to Lunch Money budget categories.
- Add itemized breakdown rows with descriptions and amounts.
- See running totals for itemized breakdowns.
- Insert an itemized total back into a Lunch Money budget field.
- Data is scoped by month and category.
- Rollover rows support notes only.

### Budget page enhancements

- Adds per-category note indicators in the Lunch Money budget table.
- Adds a period summary card for expected inflow and budgeted outflow.
- Detects month navigation and reloads the matching saved notes.

### Settings and data management

- Toggle extension features on and off.
- Review extension storage usage.
- Rename/merge saved category data when Lunch Money category names change.
- Export and import local extension data for backup/restore.

### Optional Lunch Money API sync

When enabled, the extension can use a Lunch Money API key to sync budget notes across browsers.

Sync stores budget-note records as reviewed zero-dollar Lunch Money transactions with `external_id` values prefixed by `budget-notes:`. The extension uses those records to push/pull note data for the selected month.

Sync is off by default.

### Optional Amazon transaction memos

The settings page includes an Amazon CSV workflow:

1. Upload an Amazon item CSV.
2. Match Amazon charges against Lunch Money Amazon transactions for a selected month.
3. Use OpenRouter to summarize item titles and suggest a Lunch Money category.
4. Preview all proposed transaction updates.
5. Apply selected updates to Lunch Money transaction notes/categories.

This workflow requires both a Lunch Money API key and an OpenRouter API key. Nothing is applied until the user previews and confirms the selected updates.

## Privacy and data flow

By default, budget notes are stored locally in browser extension storage and are not sent anywhere.

Optional features change that behavior:

- **Lunch Money API sync** sends budget-note data to Lunch Money by creating/updating sync transactions.
- **Amazon transaction memos** sends Amazon item titles and available Lunch Money categories to OpenRouter for summarization/category suggestions, then can update selected Lunch Money transactions through the Lunch Money API.

API keys are stored in browser extension storage. Treat an installed development build like any other local app that can access those keys.

## Installation for development

```bash
git clone https://github.com/dhirsch/lunch-money-snacks.git
cd lunch-money-snacks
npm install
npm run dev
```

Then load the extension from the generated `dist/chrome` directory:

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `dist/chrome`.

For a production-style Chrome build:

```bash
npm run build:chrome
```

The built extension will be in `dist/chrome`.

## Browser targets

The repo includes manifest patch files and package scripts for multiple browser targets:

```bash
npm run build:chrome
npm run build:firefox
npm run build:safari
npm run build:all
npm run package:chrome
npm run package:firefox
npm run package:safari
```

Chrome is the primary development target unless a task explicitly says otherwise.

## Usage

### Budget notes

1. Navigate to the Lunch Money budget page.
2. Look for the snack/note icon next to each supported budget row.
3. Click the icon to open the budget modal.
4. Add notes and/or itemized breakdown items.
5. Save with the button or `Ctrl+Enter`.
6. Use **Insert Total** to populate the matching Lunch Money budget field with the itemized sum.

### Category management

1. Open the extension options page from the browser extension UI.
2. Review categories with saved data.
3. Use rename/merge when a Lunch Money category was renamed and saved notes need to follow it.
4. Use export/import before risky cleanup or migration work.

### Sync

1. Open the extension options page.
2. Enter a Lunch Money API key from Lunch Money Settings → Developers.
3. Choose a conflict policy.
4. Enable sync.

Current conflict policies:

- `last-write-wins` — default/recommended.
- `local-wins` — keep local data when both local and remote exist.
- `remote-wins` — prefer remote sync transaction data.

### Amazon transaction memos

1. Open the extension options page.
2. Enter a Lunch Money API key.
3. Enter an OpenRouter API key and model.
4. Choose a month and upload an Amazon item CSV.
5. Preview updates.
6. Review matched and skipped items.
7. Apply only the selected transaction updates.

## Development

### Project structure

```text
src/
├── amazon/             # Amazon CSV parsing and charge/item matching
├── api/                # Lunch Money and OpenRouter clients
├── background/         # MV3 service worker message handlers
├── components/         # React components for modal/settings/content UI
├── content/            # Content script entry and Lunch Money DOM hooks
├── hooks/              # Shared React hooks
├── settings/           # Options page app
├── storage/            # Extension storage schema and wrapper
├── sync/               # Sync manager and codecs
├── test/               # Test setup
├── types/              # Lunch Money DOM and extension types
└── utils/              # DOM, currency, UUID, extension API helpers
```

### Key commands

```bash
npm install             # install dependencies
npm run build           # type-check and build default target
npm run build:chrome    # build Chrome target
npm test -- --run       # run unit tests once
npm test                # run Vitest in watch mode
npm run test:coverage   # run coverage report
```

### Testing expectations

Before opening a PR, run:

```bash
npm run build
npm test -- --run
```

For changes touching browser-specific packaging, also run the relevant target build, for example:

```bash
npm run build:chrome
```

## Implementation notes

- The content script depends on Lunch Money DOM structure and CSS classes. Prefer resilient selectors and graceful failure states; Lunch Money can change markup without notice.
- Keep the default experience local-first. Networked behavior should remain opt-in and clearly documented.
- Any feature that writes to Lunch Money should provide a preview/confirmation step unless the user has explicitly configured automation.
- Avoid logging sensitive values such as API keys, transaction notes, or Amazon item details.
- Do not commit generated build output from `dist/`.

## Known maintenance items

- Dependency audit currently reports issues in the development/build toolchain. Review before public distribution.
- README/docs should stay aligned with privacy behavior whenever API or AI-assisted features change.
- DOM integration should be manually checked against the live Lunch Money budget page after selector changes.

## License

MIT
