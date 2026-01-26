# Budget Notes Sync (Lunch Money API v2)

## Context

### Original Request
Introduce cross-browser sync for budget notes using Lunch Money API v2 by storing per-month notes in $0 transactions with custom_metadata, tied to a hidden “Budget Notes” category. Sync on budget page load and on save.

### Interview Summary
**Key Discussions**:
- Storage model: one transaction per month; identify by external_id `budget-notes-YYYY-MM`; split into multiple transactions when custom_metadata exceeds 4096 bytes.
- Hidden category: name “Budget Notes” with exclude_from_budget=true and exclude_from_totals=true.
- API key: provided via settings input and stored in extension storage.
- Conflict strategy: user-configurable in settings; default to last-write-wins.
- Sync triggers: pull on budget page load/month change; push on save (debounced).
- Error handling: soft-fail with warning banner at top of budget page; retry on next load/save.
- Initial migration: auto-upload existing local-only data on first sync.
- Tests: TDD with Vitest.

**Research Findings**:
- Local storage schema: `{YYYY-MM}:{category}` → `BudgetLineData` in `src/storage/storage.ts` and `src/storage/schema.ts`.
- Budget UI integration: `BudgetEnhancer` and `BudgetModal` load/save via `getLineData`/`saveLineData`.
- API v2 spec (`api-1.yaml`):
  - `POST /transactions` accepts `custom_metadata` and `external_id` in `insertTransactionObject`.
  - `GET /transactions` supports `include_metadata=true` to return `custom_metadata`.
  - `GET /transactions/{id}` includes `custom_metadata`.
- No existing API client, host permissions, or sync UI; service worker only opens options page.

### Metis Review
**Identified Gaps (addressed)**:
- Add guardrails: no sync logic in React components, no all-month sync, no conflict UI, keep local-only behavior unchanged without API key.
- Add explicit validation tasks for API assumptions (base URL, external_id filtering, metadata limits).
- Add split/reassemble logic with TextEncoder byte measurement and unit tests.

---

## Work Objectives

### Core Objective
Enable cross-browser sync of budget notes and itemized breakdowns via Lunch Money API v2 using per-month $0 transactions with custom_metadata, while preserving current local-only behavior if sync is not configured.

### Concrete Deliverables
- API client module for Lunch Money v2 transactions + categories.
- Sync engine (serialize/deserialize month data, split/reassemble, conflict policy, debounce).
- Service worker message handlers for sync operations.
- Settings UI for API key + conflict policy + sync status.
- Budget page warning banner for sync failures.
- Manifest host permissions update for API access.
- Unit tests for sync codec, API client, and service worker message handlers.

### Definition of Done
- [ ] Sync works across browsers for the current month with API key configured.
- [ ] Local-only behavior remains unchanged when no API key is set.
- [ ] Split/reassemble logic handles >4096-byte payloads correctly.
- [ ] All Vitest tests pass: `npm test`.

### Must Have
- Sync is per-month and uses external_id `budget-notes-YYYY-MM` with splitting when needed.
- Hidden “Budget Notes” category created lazily with exclude_from_budget/exclude_from_totals.
- User-configurable conflict policy with default last-write-wins.

### Must NOT Have (Guardrails)
- No full-month historical sync on load; only current month.
- No conflict merge UI; policy-based only.
- No background periodic sync (no alarms/WebSocket).
- No behavior changes for users without API key configured.

---

## Verification Strategy (TDD)

### Test Decision
- **Infrastructure exists**: YES (Vitest)
- **User wants tests**: TDD
- **Framework**: Vitest (`npm test`)

Each TODO includes RED → GREEN → REFACTOR, plus manual verification.

---

## Task Flow

```
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 2, 3 | Independent modules (API client vs sync codec) |

---

## TODOs

- [x] 1. Validate API assumptions and permissions

  **What to do**:
- Confirm API base URL from `api-1.yaml` and ensure host permission matches (likely `https://api.lunchmoney.dev/v2/*`).
- Update `public/manifest.json` host_permissions to include the API base URL.
  - Verify `custom_metadata` size limit is 4096 bytes for JSON stringified payload (use `TextEncoder` for byte counts).
  - Validate whether `external_id` is queryable; if not, define fallback lookup by date range + category filter and client-side filtering.
  - Update plan notes in code comments or docs if assumptions differ.

  **Must NOT do**:
  - Do not implement sync logic yet.

  **Parallelizable**: NO

  **References**:
  - `api-1.yaml:5490` (POST /transactions examples with custom_metadata and external_id)
  - `api-1.yaml:5164` (include_metadata query param)
  - `api-1.yaml:6398` (GET /transactions/{id} includes custom_metadata)
  - `public/manifest.json` (host_permissions)

  **Acceptance Criteria**:
  - [x] Notes recorded on verified API URL and lookup strategy.
  - [x] Confirmed custom_metadata byte-limit measurement approach.

  **Manual Verification**:
  - [x] Inspect `api-1.yaml` and note final base URL + lookup plan in code comments or plan notes.

- [x] 2. Add API client module with tests (TDD)

  **What to do**:
  - **RED**: Add unit tests for API client (request headers, URL construction, error handling, include_metadata).
  - **GREEN**: Implement `src/api/lunch-money-client.ts` with functions:
    - `getCategories`, `createCategory` (with exclude_from_budget/exclude_from_totals)
    - `getTransactions` (date range, include_metadata, category filter)
    - `createTransactions`, `updateTransaction` (custom_metadata/external_id)
  - Ensure API key is passed via `Authorization: Bearer` header.
  - Add typed errors (e.g., `ApiError`) following `StorageError` pattern.

  **Must NOT do**:
  - Do not import React in the API client.

  **Parallelizable**: YES (with Task 3)

  **References**:
  - `src/storage/storage.ts#L23` (error class pattern)
  - `api-1.yaml:4995` (GET /transactions params)
  - `api-1.yaml:5481` (POST /transactions request body)

  **Acceptance Criteria**:
  - [x] New unit tests cover success + failure responses and header construction.
  - [x] `npm test` passes for API client tests.

  **Manual Verification**:
  - [x] Mocked fetch shows correct URL and Authorization header in tests.

- [x] 3. Build sync codec (serialize/split/reassemble) with tests (TDD)

  **What to do**:
  - **RED**: Add tests for encoding/decoding month data to custom_metadata, including:
    - empty data
    - exact 4096 bytes
    - >4096 bytes (split)
    - emoji/non-ASCII payloads
  - **GREEN**: Implement codec module (e.g., `src/sync/codec.ts`):
    - Serialize month map `{category: BudgetLineData}` to JSON
    - Compute byte size via `TextEncoder`
    - Split into multiple parts when over limit
    - Reassemble parts by `external_id` suffix ordering
  - Define external_id convention: `budget-notes-YYYY-MM` and `budget-notes-YYYY-MM-p{n}`.

  **Must NOT do**:
  - Do not alter `BudgetLineData` shape.

  **Parallelizable**: YES (with Task 2)

  **References**:
  - `src/storage/schema.ts#L20` (BudgetLineData)
  - `api-1.yaml:1229` (custom_metadata schema)

  **Acceptance Criteria**:
  - [x] Unit tests cover split/reassemble and byte limit edge cases.
  - [x] `npm test` passes for codec tests.

  **Manual Verification**:
  - [x] Test fixtures show correct part counts and reassembled equality.

- [ ] 4. Extend settings schema and UI for sync configuration (TDD)

  **What to do**:
  - **RED**: Add unit tests for settings persistence and default values.
  - **GREEN**: Extend `UserSettings` with:
    - `syncEnabled` (boolean)
    - `apiKey` (string)
    - `conflictPolicy` (`last-write-wins` | `local-wins` | `remote-wins`)
    - Optional `lastSyncAt` and `lastSyncError` for UI display
  - Default `conflictPolicy` to `last-write-wins` and `syncEnabled` to false until API key is present.
  - Add a new Settings section in `src/settings/SettingsApp.tsx` with API key input + conflict policy selector + sync enable toggle.
  - On API key changes, reset sync status fields (treat as new account).

  **Must NOT do**:
  - Do not remove existing feature toggles.

  **Parallelizable**: NO (depends on updated schema)

  **References**:
  - `src/storage/schema.ts#L55` (UserSettings)
  - `src/hooks/useSettings.ts` (settings hook)
  - `src/settings/SettingsApp.tsx` (settings layout)
  - `src/components/Settings/FeatureSettings.tsx` (toggle pattern)

  **Acceptance Criteria**:
  - [ ] Settings persist across reloads via `chrome.storage.local`.
  - [ ] API key is stored only in extension storage.
  - [ ] `npm test` passes for settings tests.

  **Manual Verification**:
  - [ ] Update API key and conflict policy, reload settings, values persist.

- [ ] 5. Add service worker sync handlers and messaging (TDD)

  **What to do**:
  - **RED**: Add unit tests for `runtime.onMessage` handlers and API calls with mocked fetch.
  - **GREEN**: Implement message handlers in `src/background/service-worker.ts` for:
    - `sync:pull` (fetch month data, apply conflict policy, update local storage)
    - `sync:push` (serialize month data, create/update transactions)
    - `sync:status` (return last sync status/error)
  - Use API client + codec modules.
  - Ensure handlers return structured errors for UI banner.

  **Must NOT do**:
  - Do not sync all months automatically.

  **Parallelizable**: NO (depends on Tasks 2–4)

  **References**:
  - `src/background/service-worker.ts` (existing service worker)
  - `tests/unit/service-worker.test.ts` (test pattern)
  - `src/utils/extension-api.ts` (runtime API wrapper)

  **Acceptance Criteria**:
  - [ ] Unit tests cover sync pull/push message flows.
  - [ ] `npm test` passes for service worker tests.

  **Manual Verification**:
  - [ ] Simulated message returns expected status object in tests.

- [ ] 6. Add sync orchestration in content script (TDD)

  **What to do**:
  - **RED**: Add tests for sync orchestrator logic (debounce, policy selection).
  - **GREEN**: Create `src/sync/sync-manager.ts` that:
    - Calls `sync:pull` on month change / initial load
    - Debounces `sync:push` after `saveLineData`
    - Updates local storage with remote data per policy
    - Performs initial migration: upload all existing local data once after sync is enabled
  - Integrate into `BudgetEnhancer` and `BudgetModal` without changing `saveLineData`/`getLineData` signatures.

  **Must NOT do**:
  - Do not embed API logic in React components.

  **Parallelizable**: NO (depends on Tasks 4–5)

  **References**:
  - `src/content/BudgetEnhancer.tsx` (month detection + data status)
  - `src/components/Modal/BudgetModal.tsx` (save flow)
  - `src/storage/storage.ts#L146` (saveLineData)

  **Acceptance Criteria**:
  - [ ] Debounced push occurs after save (use configurable interval).
  - [ ] Pull runs on month change and populates local storage.
  - [ ] `npm test` passes for sync-manager tests.

  **Manual Verification**:
  - [ ] Save notes, verify push call enqueued.

- [ ] 7. Add budget-page warning banner for sync failures (TDD)

  **What to do**:
  - **RED**: Add UI tests for banner rendering based on sync status.
  - **GREEN**: Add banner component in budget page UI to show last sync error, using top-of-page placement.
  - Wire banner to sync status from `sync-manager` or service worker.

  **Must NOT do**:
  - Do not add banner inside modal.

  **Parallelizable**: NO (depends on Task 6)

  **References**:
  - `src/content/BudgetEnhancer.tsx` (page-level rendering)
  - `src/settings/SettingsApp.tsx` (existing banner styling pattern)

  **Acceptance Criteria**:
  - [ ] Banner appears on API error and disappears after successful sync.
  - [ ] `npm test` passes for UI tests.

  **Manual Verification**:
  - [ ] Simulate sync failure and verify banner visibility on budget page.

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 2 | `feat(sync): add lunch money api client` | `src/api/lunch-money-client.ts`, tests | `npm test` |
| 3 | `feat(sync): add metadata codec` | `src/sync/codec.ts`, tests | `npm test` |
| 4 | `feat(sync): add sync settings` | settings + storage schema files | `npm test` |
| 5 | `feat(sync): add service worker sync` | `src/background/service-worker.ts`, tests | `npm test` |
| 6-7 | `feat(sync): add sync manager and banner` | content + UI files | `npm test` |

---

## Success Criteria

### Verification Commands
```bash
npm test
```

### Final Checklist
- [ ] Sync works across browsers for current month with API key configured.
- [ ] Local-only behavior unchanged without API key.
- [ ] Split/reassemble works for >4096-byte payloads.
- [ ] Warning banner shows on sync failure.
- [ ] All tests pass.
