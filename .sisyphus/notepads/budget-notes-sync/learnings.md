## Codec Module Learnings (Task 3)

### Greedy Bin-Packing for Splitting
- Used greedy approach: iterate categories, accumulate into current part until adding next would exceed 4096 bytes, then start new part
- `measureBytes()` uses `new TextEncoder().encode(JSON.stringify(value)).length` — matches API's byte counting
- Each candidate measurement creates a new object spread `{ ...currentPart, [category]: lineData }` — simple but O(n²) for many categories. Acceptable since category count per month is typically <50

### Boundary Test Gotcha
- When constructing exact-boundary test data, must measure the base structure with empty notes first, then pad. Using a placeholder like `'x'` and subtracting gives off-by-one because the JSON string length changes (empty string `""` vs `"x"` differs by 1 char, not by the char itself)

### External ID Format
- Single part: `budget-notes-YYYY-MM` (no suffix)
- Multi-part: `budget-notes-YYYY-MM-p{n}` where n is 1-based
- `partIndex` in EncodedPart is 0-based; the `-p{n}` suffix in external_id is 1-based

### Test Conventions
- Project uses vitest with globals enabled, jsdom environment
- Tests import from `vitest` explicitly: `import { describe, it, expect } from 'vitest'`
- Test files live in `tests/unit/`
- Existing failures: `storage.test.ts` (webextension-polyfill browser env issue), `api-client.test.ts` (source not yet created by parallel Task 2)

### Roundtrip Validation
- `encodeMonthData` → `decodeMonthData` roundtrip preserves Map equality including emoji/non-ASCII keys and values
- `Object.fromEntries(map)` and `new Map(Object.entries(obj))` preserve insertion order, which matters for deterministic reassembly

## API Client Module Learnings (Task 2)

### Error Handling Pattern
- `ApiError` follows `StorageError` pattern: extends Error, sets `this.name`, has `cause` property
- Added `statusCode` field for HTTP status codes (not in StorageError since it's not HTTP)
- Single `apiRequest<T>()` helper wraps both fetch + response handling in one try/catch — converts all errors (network, HTTP, unexpected) to `ApiError`

### Mock Pattern Fix
- Pre-written tests called functions twice (once for `toThrow`, once for `toMatchObject`) but only mocked `fetch` once via `mockResolvedValueOnce`
- Fix: mock the response twice so both assertions get a proper response
- This is a common vitest gotcha: `await expect(fn()).rejects.toThrow()` actually invokes the function

### URL Construction
- Used `new URL()` + `searchParams.set()` for query parameter building — handles encoding automatically
- Only set optional params when `!== undefined` to avoid sending `undefined` as string

### No React Imports
- Module is service-worker safe — uses only `fetch` API, no DOM or React dependencies
- All types are plain interfaces, no runtime dependencies

### Type Accuracy vs API Spec
- `Category.order` is `number | null` per spec (not just `number`) — categories without explicit order return null
- `Transaction.status` should be union `'reviewed' | 'unreviewed' | 'delete_pending'` not plain `string`
- `Transaction.source` is `string | null` — null for some edge cases
- `custom_metadata` should be `Record<string, unknown> | null` (nullable) not just optional
- `InsertTransaction` fields like `category_id`, `manual_account_id` should be `number | null` to allow explicit null clearing
- `ChildCategory` has `is_group: false` (literal type) — children are never groups

### getTransactions Generic Param Loop
- Using `Object.entries(params)` loop instead of individual `if` checks is cleaner and auto-extends when new params are added to the interface
- All values are stringified via `String(value)` — works for numbers, booleans, and strings

## [2026-01-26] Final Integration Complete

### Verification Results
- All 7 implementation tasks complete
- 149/149 tests passing
- Build succeeds with no TypeScript errors
- All final checklist items verified

### Key Verifications
1. **Local-only behavior preserved**: SyncManager checks `settings.syncEnabled && settings.apiKey` before any sync operations
2. **Split/reassemble tested**: 22 codec tests verify >4096-byte payload handling
3. **Warning banner implemented**: BudgetEnhancer shows dismissible error banner on sync failures
4. **Sync integration complete**: 
   - BudgetEnhancer calls pullSync on month change
   - BudgetModal calls debouncedPush after save (2s debounce)
5. **Test infrastructure fixed**: Added runtime.onMessage mock to test setup

### Architecture Highlights
- **Stateless sync**: No background periodic sync, only on-demand
- **Conflict resolution**: User-configurable policy (last-write-wins default)
- **Error handling**: Soft-fail with UI feedback, no data loss
- **Hidden category**: "Budget Notes" excluded from budget totals
- **API lookup strategy**: Category filter + date range (external_id not queryable)

### Manual Testing Recommended
While all automated tests pass, hands-on browser testing would verify:
- API key configuration flow
- Cross-browser sync behavior
- Conflict resolution in practice
- Error banner UX
- Split transaction handling with real API

### Files Modified (Final)
- Core: 3 new modules (api-client, codec, sync-manager)
- Tests: 116 new tests across 5 test files
- Integration: 4 files (BudgetEnhancer, BudgetModal, service-worker, test setup)
- Config: 2 files (manifest, settings schema)

