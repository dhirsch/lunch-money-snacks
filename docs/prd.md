# Product Requirements Document: Lunch Money Budget Enhancer Chrome Extension

## Overview
A Chrome extension that enhances the Lunch Money budget view by allowing users to add detailed notes and itemized breakdowns to budget line items, with data stored locally in the browser.

## Scope
- **In Scope**: Budget View tab only
- **Out of Scope**: Other Lunch Money views (Transactions, Settings, etc.), cloud sync functionality

## Core Features

### 1. Budget Line Item Details Modal

**Trigger**
- Small icon appears next to each budget input field (including the rollover row)
- Visual indicator shows when a line item has saved data
- Clicking icon opens a modal dialog

**Modal Contents**

The modal contains two sections:

1. **Text Notes Section**
   - Free-form text area for general notes about the budget category
   - Available for all line items including rollover

2. **Itemized Breakdown Section** (NOT available for rollover row)
   - Quick-entry form with two fields: Description | Amount
   - Enter key adds the item to the list below
   - List displays all added items with inline editing capability
   - Individual items can be deleted
   - Running sum total displayed prominently
   - "Insert Total" button that:
     - Populates the Lunch Money budget field with the calculated sum
     - Closes the modal automatically

**Modal Actions**
- **Save**: Button click or Ctrl+Enter saves changes and closes modal
- **Cancel**: Discards unsaved changes and closes modal
- Data persists per month per category

### 2. Month Navigation
- Extension automatically detects month changes in Lunch Money
- Loads corresponding saved data for the current month
- Each month's data stored independently

### 3. Category Management Screen

**Purpose**: Handle category renames in Lunch Money

**Functionality**
- Accessible settings/management interface
- Lists all categories with saved notes across all months
- Allows user to manually reassign/merge notes from old category name to new category name
- Shows which categories have data

### 4. Data Storage

**Storage Method**
- Chrome local storage API
- Data structure: keyed by month + category name
- Each entry contains:
  - Text notes (string)
  - Itemized breakdown (array of {description, amount} objects)
  - Timestamp of last modification

**Data Scope**
- Local to browser only (MVP)
- No cloud sync
- No version history

## Technical Constraints

### Category Identification
- Categories identified by text name (no unique IDs exposed by Lunch Money)
- Extension must handle category hierarchy (e.g., "Food > Groceries and Household")
- User responsible for managing renamed categories via management screen

### Rollover Row Behavior
- Note icon appears on rollover row
- Modal opens with ONLY text notes section visible
- Itemized breakdown and "Insert Total" functionality disabled for this row

## User Experience Requirements

### Visual Indicators
- Distinct icon for "has data" vs "no data" states
- Modal design should feel native to Lunch Money's interface
- Clear visual hierarchy between text notes and itemized breakdown sections

### Form Behavior
- Quick-entry form should feel fast and keyboard-friendly
- Tab navigation between description and amount fields
- Enter key adds item and focuses back on description field
- Sum updates in real-time as items are added/edited/deleted

## Success Criteria
- User can add, edit, and delete notes/breakdowns without losing data
- Data persists across browser sessions
- Month switching correctly loads corresponding data
- Budget totals can be easily calculated and inserted from itemized breakdowns
- Category management allows recovery from renamed categories

## Future Considerations (Out of Scope for MVP)
- Cloud sync across devices
- Export/backup functionality
- Version history
- Advanced features for other Lunch Money views