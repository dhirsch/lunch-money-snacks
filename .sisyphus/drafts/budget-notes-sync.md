# Draft: Budget Notes Sync

## Requirements (confirmed)
- Introduce ability to sync budget notes between browsers using the extension.
- Use Lunch Money API v2 as backing store for sync.
- Store notes per month using a $0 transaction with custom_metadata JSON.
- Use a dedicated category hidden from default views.
- On budget page load, find the appropriate transaction and sync to browser storage.
- Storage model decision: one transaction per month, with safeguards for the 4096-byte custom_metadata limit (compress or split into multiple transactions when needed).
- API key handling: add settings input and store key in extension storage.
- Conflict strategy should be user-configurable via settings (selectable policy).
- Sync triggers: pull on budget page load/month change; push on save (debounced).
- Hidden category: name "Budget Notes" with exclude_from_budget=true and exclude_from_totals=true.
- Transaction lookup: use external_id format `budget-notes-YYYY-MM`.
- If monthly payload exceeds 4096 bytes, split into multiple transactions with suffixed external_id.
- First-time sync should auto-upload existing local data.
- Test strategy: TDD with Vitest.
- API error handling: soft-fail (keep local), show warning banner, retry later.
- Warning banner location: top of budget page.

## Technical Decisions
- Sync record model: one transaction per month; plan for overflow handling.
- API key storage via settings.
- Conflict strategy exposed as a settings choice.
- Sync triggers: load + save.
- Hidden category behavior selected.
- External ID pattern for monthly transactions.
- Overflow handling: split into multiple monthly transactions.
- Initial migration: auto-upload local data on first sync.
- Verification: TDD with Vitest.
- API errors: non-blocking banner + retry on next load/save.
- Banner location: budget page top.
- Conflict policy configurable in settings (default to last write wins unless overridden).

## Research Findings
- `api-1.yaml` describes v2 API and includes `custom_metadata` on transactions (up to 4096 chars, JSON object).
- `GET /transactions` supports `include_metadata=true` to return `custom_metadata` and `plaid_metadata` (defaults to false).
- `GET /transactions/{id}` response includes `custom_metadata` (null or object) and `files` by default.
- `POST /transactions` (createNewTransactions) accepts `custom_metadata` and `external_id` in each `insertTransactionObject`.
- Storage uses `extensionApi.storage.local` (not sync) with key format `${YYYY-MM}:${category}` and `BudgetLineData` schema (`notes`, `items`, `lastModified`).
- Budget page month detection parses header text into `YYYY-MM` via `useMonthDetector`.
- Budget notes data is loaded in `BudgetEnhancer` and edited in `BudgetModal` via `getLineData`/`saveLineData`.
- Tests exist under `tests/unit` (storage, category, currency, service worker), implying a test framework is available.
- `package.json` defines `vitest` with `npm test`.
- Background service worker only opens options page; no message passing today.
- Settings UI uses `SettingsApp` with sections for Features and Storage/Backup; no sync settings yet.
- No existing API key storage or Lunch Money API client in codebase; manifest host permissions only target the web app, not `api.lunchmoney.dev`.

## Open Questions
- (None)

## Scope Boundaries
- INCLUDE: Sync for budget notes and itemized breakdowns across browsers via API v2.
- EXCLUDE: Any non-budget pages unless specified.
