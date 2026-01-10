# Implementation Plan: Lunch Money Budget Enhancer Chrome Extension

## Technology Stack
- **Language**: TypeScript
- **UI Framework**: React
- **Build Tool**: Vite
- **Testing**: Vitest + React Testing Library
- **Storage**: Chrome Storage API (chrome.storage.local)
- **Styling**: Custom CSS matching Lunch Money's design system

## Project Structure
```
dinnermoney/
├── src/
│   ├── content/              # Content script (injected into Lunch Money)
│   │   ├── index.tsx         # Entry point, DOM injection orchestrator
│   │   ├── injector.ts       # Icon injection logic
│   │   ├── detector.ts       # Month/category detection
│   │   └── styles.css        # Injected styles
│   ├── components/           # React components
│   │   ├── Modal/
│   │   │   ├── BudgetModal.tsx
│   │   │   ├── NotesSection.tsx
│   │   │   ├── ItemizedSection.tsx
│   │   │   └── ItemRow.tsx
│   │   ├── Icon/
│   │   │   └── BudgetIcon.tsx
│   │   └── Settings/
│   │       ├── CategoryManager.tsx
│   │       └── CategoryRow.tsx
│   ├── storage/              # Storage layer
│   │   ├── schema.ts         # Data types and interfaces
│   │   ├── storage.ts        # Chrome storage wrapper
│   │   └── migrations.ts     # Future data migrations
│   ├── utils/                # Utilities
│   │   ├── category.ts       # Category parsing/matching
│   │   ├── currency.ts       # Amount parsing/formatting
│   │   └── dom.ts            # DOM manipulation helpers
│   ├── settings/             # Settings page
│   │   └── index.tsx         # Category management UI
│   └── types/                # TypeScript types
│       └── lunch-money.ts    # Lunch Money DOM structure types
├── public/
│   ├── manifest.json         # Chrome extension manifest
│   ├── icons/                # Extension icons
│   └── settings.html         # Settings page HTML
├── tests/
│   ├── unit/
│   └── integration/
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Phase 1: Project Foundation

### 1.1 Initialize Project
- [ ] Run `npm create vite@latest` with React + TypeScript template
- [ ] Install dependencies:
  - `@types/chrome` for Chrome API types
  - `vitest`, `@testing-library/react`, `@testing-library/jest-dom` for testing
  - `@crxjs/vite-plugin` for Chrome extension build support
- [ ] Configure `tsconfig.json` with Chrome types
- [ ] Set up Vite config for multi-entry build (content script, settings page)

### 1.2 Chrome Extension Manifest (manifest.json)
- [ ] Create Manifest V3 configuration:
  ```json
  {
    "manifest_version": 3,
    "name": "Lunch Money Budget Enhancer",
    "version": "0.1.0",
    "permissions": ["storage"],
    "host_permissions": ["https://my.lunchmoney.app/*"],
    "content_scripts": [{
      "matches": ["https://my.lunchmoney.app/budget*"],
      "js": ["src/content/index.tsx"],
      "css": ["src/content/styles.css"],
      "run_at": "document_idle"
    }],
    "action": {
      "default_popup": "settings.html"
    }
  }
  ```
- [ ] Add extension icons (16x16, 48x48, 128x128)

### 1.3 Storage Layer Design
Define data schema in `src/storage/schema.ts`:
```typescript
interface BudgetLineData {
  notes: string;
  items: ItemizedItem[];
  lastModified: number; // timestamp
}

interface ItemizedItem {
  id: string; // UUID
  description: string;
  amount: number;
}

// Storage key format: "{YYYY-MM}:{categoryName}"
type StorageKey = string;
```

Implement storage wrapper in `src/storage/storage.ts`:
- [ ] `saveLineData(month: string, category: string, data: BudgetLineData)`
- [ ] `getLineData(month: string, category: string): Promise<BudgetLineData | null>`
- [ ] `getAllCategories(): Promise<string[]>` - for category management
- [ ] `renameCategory(oldName: string, newName: string)` - merge data
- [ ] `deleteCategory(category: string)` - cleanup

## Phase 2: Lunch Money Integration

### 2.1 DOM Detection & Analysis
Research Lunch Money's DOM structure:
- [ ] Identify budget input field selectors/patterns from `docs/sample_budget_page.html`
- [ ] Identify category name location/hierarchy
- [ ] Identify month selector element
- [ ] Identify rollover row (special case)
- [ ] Document CSS classes and structure in `src/types/lunch-money.ts`

### 2.2 Icon Injection System (`src/content/injector.ts`)
- [ ] Scan for all budget input fields on page load
- [ ] Create icon insertion points next to each input
- [ ] Add MutationObserver to handle dynamic content updates
- [ ] Implement icon state management (has-data vs no-data)
- [ ] Attach click handlers to open modal

### 2.3 Month & Category Detection (`src/content/detector.ts`)
- [ ] Extract current month from Lunch Money UI
- [ ] Watch for month navigation events (prev/next buttons)
- [ ] Parse category names including hierarchy (e.g., "Food > Groceries")
- [ ] Distinguish rollover row from regular categories
- [ ] Emit events when month changes (to reload data)

## Phase 3: Modal Component

### 3.1 Modal Container (`src/components/Modal/BudgetModal.tsx`)
- [ ] Create React portal for modal rendering
- [ ] Modal overlay with click-outside to close
- [ ] Header with category name and month
- [ ] Footer with Save (Ctrl+Enter) and Cancel buttons
- [ ] Handle modal open/close state
- [ ] Load data on mount based on month + category
- [ ] Conditional rendering: hide ItemizedSection for rollover row

### 3.2 Notes Section (`src/components/Modal/NotesSection.tsx`)
- [ ] Textarea for free-form notes
- [ ] Character count (optional)
- [ ] Auto-resize textarea
- [ ] Local state management with unsaved changes tracking

### 3.3 Itemized Breakdown Section (`src/components/Modal/ItemizedSection.tsx`)
- [ ] Quick-entry form:
  - Description input (text)
  - Amount input (number with currency formatting)
  - Tab navigation between fields
  - Enter key adds item and refocuses description
- [ ] Item list display:
  - Render all items with inline editing
  - Delete button per item
  - Calculate running sum
- [ ] Running total display (prominent styling)
- [ ] "Insert Total" button:
  - Populate Lunch Money budget input field
  - Close modal automatically

### 3.4 Item Row Component (`src/components/Modal/ItemRow.tsx`)
- [ ] Inline editing for description and amount
- [ ] Delete confirmation (simple click or with confirm)
- [ ] Validation for amount field (must be numeric)

## Phase 4: Data Flow & State Management

### 4.1 Modal State Management
Options:
1. **React Context** (recommended for this scope)
   - Create `BudgetDataContext` to hold current line item data
   - Provide CRUD operations through context
   - Auto-save to Chrome storage on changes

2. **Component-local state**
   - Simpler but less flexible
   - Direct storage calls from modal component

Implementation approach:
- [ ] Choose state management pattern
- [ ] Implement state provider (if using Context)
- [ ] Connect modal components to state
- [ ] Implement auto-save or manual save logic
- [ ] Handle optimistic updates

### 4.2 Data Synchronization
- [ ] On modal open: load data from storage
- [ ] On save: persist to Chrome storage
- [ ] On month change: clear modal state, reload for new month
- [ ] Handle concurrent edits (last-write-wins for MVP)

## Phase 5: Settings/Category Management Page

### 5.1 Settings Page UI (`src/settings/index.tsx`)
- [ ] Create standalone HTML page (settings.html)
- [ ] List all categories with saved data
- [ ] Display month count per category
- [ ] Show total storage usage
- [ ] Provide category rename/merge interface:
  - Select source category
  - Enter new category name
  - Confirm merge operation
- [ ] Implement search/filter for categories
- [ ] Add export/import data functionality (bonus feature)

### 5.2 Category Operations
- [ ] Fetch all categories from storage on page load
- [ ] Group by category name across months
- [ ] Implement merge logic (combine data, delete old keys)
- [ ] Provide delete category option with confirmation

## Phase 6: Styling & Visual Integration

### 6.1 Extract Lunch Money Styles
- [ ] Inspect Lunch Money's CSS variables/classes
- [ ] Document color scheme, typography, spacing
- [ ] Extract button styles, input styles, modal patterns
- [ ] Create style guide document

### 6.2 Implement Custom Styles (`src/content/styles.css`)
- [ ] Icon styles (positioned next to budget inputs)
- [ ] Visual indicators for has-data vs no-data states
- [ ] Modal overlay and container
- [ ] Form element styling to match Lunch Money
- [ ] Responsive design (if Lunch Money is responsive)
- [ ] Focus states and accessibility

### 6.3 Icon Design
- [ ] Create SVG icon for "no data" state (subtle, gray)
- [ ] Create SVG icon for "has data" state (more prominent, colored)
- [ ] Ensure icons are accessible (aria-labels, keyboard navigation)

## Phase 7: Testing

### 7.1 Unit Tests
- [ ] `storage.ts`: Test all CRUD operations
  - Save and retrieve data
  - Rename category
  - Delete category
  - Handle missing data
- [ ] `category.ts`: Test category parsing and matching
- [ ] `currency.ts`: Test amount parsing and formatting
- [ ] ItemizedSection: Test sum calculation
- [ ] NotesSection: Test character limits (if implemented)

### 7.2 Integration Tests
- [ ] Full data flow: save → retrieve → update → delete
- [ ] Month switching: verify data isolation
- [ ] Modal interactions: open → edit → save → reopen (verify persistence)
- [ ] Category rename: verify data migration

### 7.3 Manual Testing Checklist
Create `tests/manual-checklist.md`:
- [ ] Install extension in Chrome
- [ ] Navigate to Lunch Money budget view
- [ ] Verify icons appear next to all budget inputs
- [ ] Open modal for regular category
- [ ] Add notes, save, reopen (verify persistence)
- [ ] Add itemized breakdown, verify sum calculation
- [ ] Click "Insert Total", verify budget field populated
- [ ] Open modal for rollover row (verify no itemized section)
- [ ] Switch months, verify data isolation
- [ ] Rename category in Lunch Money, use settings to merge data
- [ ] Test keyboard navigation (Tab, Enter, Ctrl+Enter, Esc)

## Phase 8: Edge Cases & Error Handling

### 8.1 Edge Cases
- [ ] Empty budget fields
- [ ] Very long category names (overflow handling)
- [ ] Large number of itemized items (scrolling, performance)
- [ ] Concurrent tabs editing same data
- [ ] Lunch Money UI updates/changes (graceful degradation)
- [ ] Negative amounts in itemized breakdown
- [ ] Non-numeric input in amount fields

### 8.2 Error Handling
- [ ] Storage quota exceeded (Chrome has limits)
- [ ] Invalid data format (data corruption)
- [ ] Network issues (shouldn't be relevant, but handle timeouts)
- [ ] DOM elements not found (Lunch Money UI changed)
- [ ] User feedback for errors (toast notifications or inline messages)

### 8.3 Performance Optimization
- [ ] Debounce auto-save operations
- [ ] Lazy load modal content
- [ ] Optimize MutationObserver (use debouncing)
- [ ] Minimize DOM queries (cache selectors)

## Phase 9: Build & Deployment

### 9.1 Build Configuration
- [ ] Configure Vite for production builds
- [ ] Ensure content script and settings page are bundled correctly
- [ ] Minify and optimize assets
- [ ] Generate source maps for debugging
- [ ] Test production build locally

### 9.2 Extension Packaging
- [ ] Create build script: `npm run build`
- [ ] Verify all files in `dist/` directory
- [ ] Test loading unpacked extension in Chrome
- [ ] Create ZIP file for distribution
- [ ] Write installation instructions in README.md

### 9.3 Documentation
- [ ] README.md with:
  - Project description
  - Installation instructions
  - Development setup
  - Build instructions
  - Usage guide
- [ ] CONTRIBUTING.md (if open source)
- [ ] Inline code comments for complex logic
- [ ] JSDoc for public functions

## Implementation Order Recommendations

### Sprint 1: Foundation (Estimated: 20-30% of total effort)
1. Project setup, dependencies, tooling
2. Basic manifest and extension structure
3. Storage layer implementation + unit tests
4. DOM detection research and documentation

### Sprint 2: Core Features (Estimated: 40-50% of total effort)
5. Icon injection system
6. Modal component structure
7. Notes section implementation
8. Itemized breakdown section implementation
9. Data flow and state management
10. Integration with Lunch Money budget fields

### Sprint 3: Polish & Completion (Estimated: 30-40% of total effort)
11. Styling and visual integration
12. Settings/category management page
13. Edge case handling
14. Comprehensive testing
15. Documentation

## Risk Mitigation

### High Risk: Lunch Money DOM Changes
- **Risk**: Lunch Money updates their UI, breaking selectors
- **Mitigation**:
  - Use resilient selector strategies (data attributes, fallback patterns)
  - Build selector abstraction layer for easy updates
  - Document all selectors in one place
  - Consider adding detection for UI changes with user notification

### Medium Risk: Storage Quota Limits
- **Risk**: Chrome storage limits (5MB for local storage)
- **Mitigation**:
  - Monitor storage usage in settings page
  - Implement data cleanup for old months (optional)
  - Compress data if needed (JSON.stringify is already efficient)

### Medium Risk: Category Identification
- **Risk**: Categories identified by name only (no unique IDs)
- **Mitigation**:
  - Robust category name parsing
  - Category management UI for user-driven corrections
  - Store category hierarchy for better matching

### Low Risk: Performance Issues
- **Risk**: Large number of budget categories slows down injection
- **Mitigation**:
  - Optimize DOM queries
  - Use efficient MutationObserver strategies
  - Lazy load modal components

## Success Metrics

- [ ] Extension loads without errors on Lunch Money budget page
- [ ] All budget line items display icons
- [ ] Modal opens/closes smoothly for all categories
- [ ] Data persists across browser sessions
- [ ] Month switching loads correct data
- [ ] Insert Total correctly populates budget fields
- [ ] Category management allows data recovery
- [ ] No memory leaks or performance degradation
- [ ] All unit and integration tests pass
- [ ] Manual testing checklist complete

## Future Enhancements (Post-MVP)

- Cloud sync using Lunch Money API (if available) or separate backend
- Export data to CSV/JSON
- Import data from previous exports
- Version history for budget line items
- Undo/redo functionality
- Templates for common itemized breakdowns
- Search across all notes
- Analytics (e.g., most expensive categories over time)
- Support for other Lunch Money views
