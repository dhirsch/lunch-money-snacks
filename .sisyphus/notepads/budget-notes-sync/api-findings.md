## API Validation Findings

### API Base URL
**Confirmed**: `https://api.lunchmoney.dev/v2`
- Source: `api-1.yaml` line 47
- Manifest updated with host permission: `https://api.lunchmoney.dev/*`

### external_id Queryability
**CRITICAL**: `external_id` is NOT a queryable parameter in GET /transactions

**Available query parameters**:
- start_date/end_date (date range)
- category_id (filter by category)
- manual_account_id/plaid_account_id
- recurring_id
- tag_id
- status (reviewed/unreviewed/delete_pending)
- is_pending
- is_group_parent

**Lookup Strategy**:
To find budget note transactions for a specific month (e.g., `budget-notes-2024-01`):
1. Query GET /transactions with:
   - `category_id={budgetNotesCategoryId}` (the hidden "Budget Notes" category)
   - `start_date=2024-01-01`
   - `end_date=2024-01-31`
   - `include_metadata=true` (to get custom_metadata)
2. Filter results client-side by `external_id` matching pattern `budget-notes-2024-01` or `budget-notes-2024-01-p{n}`

**Performance Impact**: Minimal - the hidden category should only contain budget note transactions, so the result set will be small even without external_id filtering.

### custom_metadata Size Limit
**Confirmed**: 4096 bytes (stringified JSON)
- Source: `api-1.yaml` line 1229-1236
- Measurement: Use `new TextEncoder().encode(JSON.stringify(metadata)).length`
- Split threshold: If payload exceeds 4096 bytes, split into multiple transactions with suffixed external_id

### Authentication
**Method**: Bearer token in Authorization header
- Header format: `Authorization: Bearer {apiKey}`
- API key stored in extension storage (UserSettings.apiKey)
