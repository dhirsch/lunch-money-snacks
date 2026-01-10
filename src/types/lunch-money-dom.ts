/**
 * Lunch Money Budget Page DOM Analysis
 *
 * This file contains TypeScript types and constants for interacting with
 * the Lunch Money budget page DOM. These selectors are based on analysis
 * of the production Lunch Money budget page structure.
 *
 * @module lunch-money-dom
 */

// =============================================================================
// MAIN CONTAINER SELECTORS
// =============================================================================

/**
 * Main budget page container class.
 * This is the top-level container that wraps the entire budget view.
 *
 * Location: <div class="ui container g-budget">
 */
export const BUDGET_CONTAINER = '.g-budget';

/**
 * The container for each budget table section (Inflow/Outflow).
 * Multiple table-containers exist on the page - one for Inflow and one for Outflow.
 *
 * Location: <div class="table-container mb-1rem">
 */
export const TABLE_CONTAINER = '.table-container';

/**
 * The main budget table class.
 * Each section (Inflow/Outflow) has its own table with this class.
 *
 * Location: <table class="ui celled fixed selectable sortable unstackable table p-budget-table">
 */
export const BUDGET_TABLE = '.p-budget-table';

// =============================================================================
// MONTH/DATE SELECTORS
// =============================================================================

/**
 * Month header selector - the main displayed month at the top of the page.
 * The text content will be in format "MMM YYYY" (e.g., "Jan 2026").
 *
 * Location: <h1 class="ui header">Jan 2026</h1>
 * Parent: .toggle-header-container > .flex--align-center
 */
export const MONTH_HEADER = '.toggle-header-container h1.ui.header';

/**
 * Alternative month selector - the "Jump to period" dropdown.
 * The selected item shows the current month.
 *
 * Location: <div class="ui selection dropdown jump-dropdown">
 */
export const MONTH_DROPDOWN = '.jump-dropdown';

/**
 * Selected month in the dropdown - has the "selected" class.
 *
 * Location: <div role="option" class="selected item"><span class="text">Jan 2026</span></div>
 */
export const SELECTED_MONTH_OPTION = '.jump-dropdown .selected.item .text';

/**
 * Navigation arrows for changing months.
 *
 * Location: .toggle-header-container .chevron.left/.right.icon
 */
export const MONTH_NAV_LEFT = '.toggle-header-container .chevron.left.icon';
export const MONTH_NAV_RIGHT = '.toggle-header-container .chevron.right.icon';

/**
 * URL pattern for budget pages.
 * Format: /budget/YYYY/MM or /budget/YYYY/MM/DD
 */
export const BUDGET_URL_PATTERN = /\/budget\/(\d{4})\/(\d{2})(?:\/\d{2})?/;

// =============================================================================
// BUDGET ROW SELECTORS
// =============================================================================

/**
 * All budget rows in the table.
 * Each row represents either a category, category group, or special row (rollover).
 *
 * Location: <tr class="fixed-height">
 */
export const BUDGET_ROW = 'tr.fixed-height';

/**
 * Category group rows (parent categories that can be expanded/collapsed).
 * These rows have a caret icon and the emphasized-row class.
 * Examples: "Income", "Food", "Business Expenses", "Insurance", "Funds"
 *
 * Location: <tr class="fixed-height emphasized-row">
 */
export const CATEGORY_GROUP_ROW = 'tr.fixed-height.emphasized-row';

/**
 * The caret icon that indicates an expandable/collapsible category group.
 * The presence of "caret down" means expanded, "caret right" would mean collapsed.
 *
 * Location: <i class="caret down icon mr-1rem">
 */
export const CATEGORY_GROUP_CARET = '.caret.down.icon, .caret.right.icon';

// =============================================================================
// BUDGET INPUT FIELD SELECTORS
// =============================================================================

/**
 * Budget input cell - the table cell containing the editable budget amount.
 * This cell has the "editable" class when it can be edited.
 *
 * Location: <td class="right-align table-cell-input editable">
 */
export const BUDGET_INPUT_CELL = 'td.table-cell-input.editable';

/**
 * The editable text container for budget amounts.
 * This wrapper contains the actual clickable/editable content.
 *
 * Location: <div class="g-editable-text right-align editable-price-inline-edit" id="budget-period-parent">
 *
 * Note: The id="budget-period-parent" appears on multiple elements (not unique),
 * so use the class-based selector instead.
 */
export const EDITABLE_BUDGET_WRAPPER = '.g-editable-text.editable-price-inline-edit';

/**
 * The inner state div that shows current budget state.
 * - With "empty-state" class: Shows "Set budget" text (no budget set)
 * - Without "empty-state" class: Shows the budget amount (e.g., "$1,700.00")
 *
 * Location: <div class="default-state empty-state"><span class="primary">Set budget</span></div>
 * Or: <div class="default-state"><span class="primary">$1,700.00</span></div>
 */
export const BUDGET_STATE_CONTAINER = '.g-editable-text .default-state';

/**
 * Empty budget state - indicates no budget has been set for this category.
 *
 * Location: <div class="default-state empty-state">
 */
export const EMPTY_BUDGET_STATE = '.g-editable-text .default-state.empty-state';

/**
 * The span containing the actual budget value or "Set budget" text.
 *
 * Location: <span class="primary">$1,700.00</span>
 */
export const BUDGET_VALUE_SPAN = '.g-editable-text .default-state .primary';

// =============================================================================
// CATEGORY NAME SELECTORS
// =============================================================================

/**
 * Category name cell - the table cell containing the category name.
 * For top-level categories: colspan="3" with class="padded-cell"
 * For subcategories: just class="padded-cell" (after the yellow border cell)
 *
 * Location (top-level): <td colspan="3" class="padded-cell">
 * Location (subcategory): <td class="padded-cell">
 */
export const CATEGORY_NAME_CELL = 'td.padded-cell';

/**
 * Category group header cell selector in the table header.
 * Shows "Inflow" or "Outflow" as the section header.
 *
 * Location: <th class="table-cell-category">Inflow</th>
 */
export const CATEGORY_HEADER_CELL = 'th.table-cell-category';

/**
 * Selector for the direct text content container within a category cell.
 * The category name is inside a span or directly as text in a div.
 *
 * For regular categories:
 * <div class="flex--space-between-flex-start">
 *   <div class="display--flex"><span>Category Name</span></div>
 *   ...
 * </div>
 *
 * For category groups (with caret):
 * <div class="flex--space-between-flex-start">
 *   <div class="display--flex">
 *     <div class="clickable"><i class="caret down icon mr-1rem"></i>Group Name</div>
 *   </div>
 *   ...
 * </div>
 */
export const CATEGORY_NAME_WRAPPER = '.flex--space-between-flex-start';

// =============================================================================
// CHILD CATEGORY INDICATORS
// =============================================================================

/**
 * Child category indicator - the yellow left border cell.
 * When a row has colspan="1" with this specific styling, it indicates
 * the category is a child of the previous category group.
 *
 * Location:
 * <td colspan="1" class="padded-cell"
 *     style="width: 10px; border-right: 1px solid rgb(248, 181, 0); background-color: rgb(252, 252, 252); border-top: 0px;">
 *
 * The rgb(248, 181, 0) is Lunch Money's yellow/gold brand color.
 */
export const CHILD_CATEGORY_BORDER_CELL = 'td[colspan="1"].padded-cell';

/**
 * Inline style pattern for identifying child category border.
 * The border-right color rgb(248, 181, 0) is the key indicator.
 */
export const CHILD_BORDER_COLOR = 'rgb(248, 181, 0)';

/**
 * CSS pattern to identify child category rows by their border styling.
 */
export const CHILD_CATEGORY_BORDER_STYLE = 'border-right: 1px solid rgb(248, 181, 0)';

// =============================================================================
// ROLLOVER ROW SELECTOR
// =============================================================================

/**
 * Rollover row - special row showing rollover from previous period.
 * This row has colspan="7" and contains text starting with "Rollover from previous period".
 *
 * Location:
 * <tr class="fixed-height">
 *   <td colspan="7" class="padded-cell">Rollover from previous period (Mon, 12/1 - Wed, 12/31)</td>
 *   ...
 * </tr>
 *
 * Note: The rollover amount is shown in the subsequent td cells with color--red or color--green class.
 */
export const ROLLOVER_ROW_CELL = 'td[colspan="7"].padded-cell';

/**
 * Text pattern to identify rollover row content.
 */
export const ROLLOVER_TEXT_PATTERN = /Rollover from previous period/i;

/**
 * The rollover amount display - usually in red (negative) or green (positive).
 *
 * Location: <div class="underline-text color--red">-$3,848.70</div>
 */
export const ROLLOVER_AMOUNT = '.color--red, .color--green';

// =============================================================================
// SPECIAL ROWS
// =============================================================================

/**
 * Starting Balance row - shows the starting balance for the period.
 * Contains text "Starting Balance" in the first cell.
 */
export const STARTING_BALANCE_TEXT = 'Starting Balance';

/**
 * Totals row in the table footer.
 *
 * Location: <tfoot> <tr class="transaction-row">
 */
export const TOTALS_ROW = 'tfoot tr.transaction-row';

// =============================================================================
// AMOUNT DISPLAY SELECTORS
// =============================================================================

/**
 * Activity column cells - shows spending/income activity for the period.
 *
 * Location: <td class="padded-cell-lr right-align table-cell-amounts">
 */
export const ACTIVITY_CELL = 'td.table-cell-amounts';

/**
 * Available/Budgetable column cells - shows remaining budget.
 * This is where positive (green) or negative (red) amounts are shown.
 */
export const AVAILABLE_CELL = 'td.padded-cell-lr.right-align.table-cell-amounts';

/**
 * Color classes for amount display.
 */
export const COLOR_GREEN = '.color--green';
export const COLOR_RED = '.color--red';
export const UNDERLINE_TEXT = '.underline-text';

// =============================================================================
// INTERACTIVE ELEMENTS
// =============================================================================

/**
 * Settings icon at the end of each row.
 *
 * Location: <i class="angle right fitted icon clickable green-on-hover color--grey">
 */
export const ROW_SETTINGS_ICON = '.angle.right.fitted.icon.clickable';

/**
 * Recurring indicator icon (info circle).
 *
 * Location: <i class="info circle icon ml-05rem">
 */
export const RECURRING_INDICATOR = '.info.circle.icon';

/**
 * Fund/envelope icon - indicates a savings goal category.
 *
 * Location: <i class="envelope open outline icon hide-on-hover clickable">
 */
export const FUND_ENVELOPE_ICON = '.envelope.open.outline.icon';

/**
 * Transfer/exchange icon.
 *
 * Location: <i class="exchange icon show-on-hover clickable">
 */
export const EXCHANGE_ICON = '.exchange.icon';

/**
 * Search/magnify icon for viewing transactions.
 *
 * Location: <i class="search plus fitted icon color--grey clickable dark-grey-on-hover">
 */
export const SEARCH_TRANSACTIONS_ICON = '.search.plus.fitted.icon';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Represents the type of budget row.
 */
export type BudgetRowType =
  | 'rollover'
  | 'starting-balance'
  | 'category-group'
  | 'category'
  | 'subcategory'
  | 'totals';

/**
 * Represents a parsed budget row from the DOM.
 */
export interface ParsedBudgetRow {
  /** The row element */
  element: HTMLTableRowElement;

  /** Type of this row */
  type: BudgetRowType;

  /** Category name (if applicable) */
  categoryName?: string;

  /** Parent category name (for subcategories) */
  parentCategoryName?: string;

  /** Full hierarchical category path (e.g., "Food > Groceries and Household") */
  fullCategoryPath?: string;

  /** The budget input element (if this row has one) */
  budgetInputElement?: HTMLElement;

  /** Whether a budget value has been set */
  hasBudgetSet?: boolean;

  /** The current budget value (parsed number, or null if not set) */
  budgetValue?: number | null;
}

/**
 * Represents the current month context from the page.
 */
export interface MonthContext {
  /** Display format (e.g., "Jan 2026") */
  display: string;

  /** Year as number */
  year: number;

  /** Month as number (1-12) */
  month: number;

  /** ISO format (YYYY-MM) */
  isoFormat: string;
}

/**
 * Budget section type (Inflow = income, Outflow = expenses).
 */
export type BudgetSectionType = 'inflow' | 'outflow';

/**
 * Represents a budget table section.
 */
export interface BudgetSection {
  /** The section type */
  type: BudgetSectionType;

  /** The table element */
  tableElement: HTMLTableElement;

  /** All rows in this section */
  rows: ParsedBudgetRow[];
}

// =============================================================================
// UTILITY PATTERNS
// =============================================================================

/**
 * Month name abbreviations used in Lunch Money.
 */
export const MONTH_ABBREVIATIONS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/**
 * Pattern to parse month display format (e.g., "Jan 2026").
 */
export const MONTH_DISPLAY_PATTERN = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/;

/**
 * Pattern to parse currency values (e.g., "$1,700.00", "-$3,848.70").
 */
export const CURRENCY_PATTERN = /^-?\$[\d,]+\.\d{2}$/;

/**
 * Pattern to extract numeric value from currency string.
 */
export const CURRENCY_VALUE_PATTERN = /^(-?)\$([\d,]+\.\d{2})$/;

// =============================================================================
// CSS CLASS CONSTANTS
// =============================================================================

/**
 * Common CSS classes used in the Lunch Money budget page.
 */
export const CSS_CLASSES = {
  /** Fixed height row */
  FIXED_HEIGHT: 'fixed-height',

  /** Emphasized row (category groups) */
  EMPHASIZED_ROW: 'emphasized-row',

  /** Padded cell */
  PADDED_CELL: 'padded-cell',

  /** Right-aligned content */
  RIGHT_ALIGN: 'right-align',

  /** Editable cell */
  EDITABLE: 'editable',

  /** Empty state (no value set) */
  EMPTY_STATE: 'empty-state',

  /** Default state container */
  DEFAULT_STATE: 'default-state',

  /** Clickable element */
  CLICKABLE: 'clickable',

  /** Green color (positive values) */
  COLOR_GREEN: 'color--green',

  /** Red color (negative values) */
  COLOR_RED: 'color--red',

  /** Grey color */
  COLOR_GREY: 'color--grey',

  /** Underlined text */
  UNDERLINE_TEXT: 'underline-text',

  /** Show on hover */
  SHOW_ON_HOVER: 'show-on-hover',

  /** Hide on hover */
  HIDE_ON_HOVER: 'hide-on-hover',
} as const;

// =============================================================================
// SELECTOR COMBINATIONS FOR COMMON OPERATIONS
// =============================================================================

/**
 * Combined selectors for common operations.
 */
export const COMBINED_SELECTORS = {
  /**
   * All editable budget input fields on the page.
   * Use this to find all places where the extension can inject icons.
   */
  ALL_BUDGET_INPUTS: `${BUDGET_TABLE} ${BUDGET_INPUT_CELL} ${EDITABLE_BUDGET_WRAPPER}`,

  /**
   * All category rows (excluding rollover, starting balance, and totals).
   */
  ALL_CATEGORY_ROWS: `${BUDGET_TABLE} tbody ${BUDGET_ROW}:not(:has(${ROLLOVER_ROW_CELL}))`,

  /**
   * Category group rows only.
   */
  CATEGORY_GROUPS: `${BUDGET_TABLE} tbody ${CATEGORY_GROUP_ROW}`,

  /**
   * Subcategory rows only (rows with the yellow left border).
   */
  SUBCATEGORY_ROWS: `${BUDGET_TABLE} tbody ${BUDGET_ROW}:has(${CHILD_CATEGORY_BORDER_CELL})`,

  /**
   * Rollover row specifically.
   */
  ROLLOVER_ROW: `${BUDGET_TABLE} tbody tr:has(${ROLLOVER_ROW_CELL})`,
} as const;

// =============================================================================
// EXTENSION INJECTION POINTS
// =============================================================================

/**
 * Defines where the extension should inject its UI elements.
 */
export const INJECTION_POINTS = {
  /**
   * Where to inject the suggestion icon next to budget inputs.
   * Should be inserted adjacent to the EDITABLE_BUDGET_WRAPPER element.
   *
   * Recommended: Insert as a sibling before or after the wrapper,
   * or as a child at the beginning/end.
   */
  BUDGET_ICON_ADJACENT_TO: EDITABLE_BUDGET_WRAPPER,

  /**
   * The parent cell that contains the budget input.
   * Use this to position icons relative to the cell.
   */
  BUDGET_ICON_PARENT_CELL: BUDGET_INPUT_CELL,
} as const;

// =============================================================================
// BACKWARDS COMPATIBLE SELECTORS OBJECT
// =============================================================================

/**
 * Combined SELECTORS object for easier importing.
 * Maps to the individual selector constants.
 */
export const SELECTORS = {
  BUDGET_TABLE,
  BUDGET_ROW,
  BUDGET_INPUT: BUDGET_INPUT_CELL,
  MONTH_SELECTOR: MONTH_HEADER,
  MONTH_CONTAINER: '.toggle-header-container',
  MONTH_PREV_BUTTON: MONTH_NAV_LEFT,
  MONTH_NEXT_BUTTON: MONTH_NAV_RIGHT,
  ROLLOVER_ROW_CELL,
  CATEGORY_NAME_CELL,
  CATEGORY_GROUP_ROW,
  EDITABLE_BUDGET_WRAPPER,
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a row element is the rollover row.
 */
export function isRolloverRow(rowElement: HTMLElement): boolean {
  const rolloverCell = rowElement.querySelector(ROLLOVER_ROW_CELL);
  if (!rolloverCell) return false;
  return ROLLOVER_TEXT_PATTERN.test(rolloverCell.textContent || '');
}

/**
 * Get the category name from a budget row element.
 * Handles both regular categories and subcategories.
 */
export function getCategoryName(rowElement: HTMLElement): string | null {
  // Check if it's a rollover row
  if (isRolloverRow(rowElement)) {
    return 'Rollover';
  }

  // Find the category name cell
  const cells = rowElement.querySelectorAll('td.padded-cell');

  for (const cell of cells) {
    const cellEl = cell as HTMLElement;
    // Skip the yellow border indicator cell
    if (cellEl.getAttribute('colspan') === '1' && cellEl.style.borderRight) {
      continue;
    }

    // Look for the category name in the flex container
    const wrapper = cellEl.querySelector('.flex--space-between-flex-start');
    if (wrapper) {
      // For category groups with caret icon
      const clickable = wrapper.querySelector('.clickable');
      if (clickable) {
        // Get text content excluding the icon
        const text = clickable.textContent?.trim();
        if (text) return text;
      }

      // For regular categories with span
      const span = wrapper.querySelector('span');
      if (span) {
        return span.textContent?.trim() || null;
      }

      // For categories with .display--flex wrapper
      const displayFlex = wrapper.querySelector('.display--flex');
      if (displayFlex) {
        const text = displayFlex.textContent?.trim();
        if (text) return text;
      }

      // For subcategories: try the first direct child div
      const firstDiv = wrapper.querySelector(':scope > div');
      if (firstDiv) {
        const text = firstDiv.textContent?.trim();
        if (text) return text;
      }
    }

    // Fallback: direct text content
    const text = cellEl.textContent?.trim();
    if (text && !text.includes('$') && text.length > 0) {
      return text;
    }
  }

  return null;
}
