# Manual Testing Checklist

Use this checklist to verify the extension works correctly before release.

## Installation

- [ ] Extension loads without errors in Chrome
- [ ] Extension icon appears in Chrome toolbar
- [ ] Settings popup opens when clicking the icon

## Budget View Integration

- [ ] Icons appear next to all budget input fields
- [ ] Icons appear next to rollover row
- [ ] Icons update appearance when data is saved (empty vs has-data states)
- [ ] Icons remain visible after scrolling
- [ ] Icons persist after Lunch Money page navigation

## Modal - Basic Functionality

- [ ] Modal opens when clicking any budget icon
- [ ] Modal displays correct category name
- [ ] Modal displays correct month
- [ ] Modal closes on Cancel button click
- [ ] Modal closes on Escape key press
- [ ] Modal closes when clicking outside
- [ ] Modal saves on Save button click
- [ ] Modal saves on Ctrl+Enter

## Modal - Notes Section

- [ ] Notes textarea is visible for all categories
- [ ] Notes textarea is visible for rollover row
- [ ] Notes can be typed and edited
- [ ] Notes persist after saving and reopening
- [ ] Long notes scroll properly

## Modal - Itemized Breakdown

- [ ] Itemized section visible for regular categories
- [ ] Itemized section NOT visible for rollover row
- [ ] Description field accepts text input
- [ ] Amount field accepts numeric input
- [ ] Enter key adds new item and clears form
- [ ] Tab navigation works between fields
- [ ] Running total updates in real-time
- [ ] Items can be clicked to edit inline
- [ ] Edited items save correctly
- [ ] Items can be deleted with X button
- [ ] "Insert Total" button populates budget field
- [ ] "Insert Total" closes modal

## Data Persistence

- [ ] Data persists across browser sessions
- [ ] Data persists across extension reloads
- [ ] Each month has independent data
- [ ] Switching months loads correct data
- [ ] Multiple categories can have independent data

## Month Navigation

- [ ] Extension detects current month correctly
- [ ] Clicking prev/next month buttons updates data
- [ ] URL navigation (typing) updates data
- [ ] Data for previous/next month is separate

## Settings Page

- [ ] Shows storage usage statistics
- [ ] Lists all categories with saved data
- [ ] Shows month count per category
- [ ] Search/filter works
- [ ] "Rename" button enables edit mode
- [ ] Category rename updates storage
- [ ] Category rename merges data if target exists
- [ ] "Delete" button removes category data
- [ ] Delete confirmation dialog appears
- [ ] Export creates valid JSON file
- [ ] Import loads data from JSON file
- [ ] Import merge option works
- [ ] Import replace option works

## Edge Cases

- [ ] Empty budget fields work correctly
- [ ] Very long category names display properly
- [ ] Categories with special characters work (>, &, etc.)
- [ ] Negative amounts in breakdown work
- [ ] Zero amounts handled correctly
- [ ] Rapid clicking doesn't cause issues
- [ ] Opening multiple modals in succession works
- [ ] Works with collapsed/expanded category groups

## Performance

- [ ] Page loads without noticeable delay
- [ ] Modal opens quickly
- [ ] Saving doesn't lag
- [ ] No memory leaks (check with DevTools)
- [ ] Works with many categories (50+)

## Error Handling

- [ ] Invalid input is handled gracefully
- [ ] Storage quota warning (if implemented)
- [ ] Network errors don't crash extension (N/A for local storage)

## Browser Compatibility

- [ ] Works in Chrome (latest)
- [ ] Works in Chrome (previous version)
- [ ] Works in Edge (Chromium-based)
- [ ] Works in Brave

## Accessibility

- [ ] Keyboard navigation works throughout
- [ ] Focus states are visible
- [ ] Screen reader announces modal properly
- [ ] Color contrast meets WCAG guidelines
