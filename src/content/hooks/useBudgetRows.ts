import { useState, useEffect } from 'react';
import { SELECTORS, isRolloverRow, getCategoryName } from '../../types/lunch-money-dom';

export interface BudgetRow {
  category: string;
  isRollover: boolean;
  inputElement: HTMLElement;
  iconContainer: HTMLElement;
}

/**
 * Determines if a row is a main category (has td with colspan=3)
 */
function isMainCategoryRow(row: HTMLElement): boolean {
  const cell = row.querySelector('td.padded-cell[colspan="3"]');
  return cell !== null;
}

/**
 * Gets the category cell from a budget row.
 * - Main categories: td[colspan="3"].padded-cell
 * - Subcategories: the td.padded-cell that's NOT the yellow border cell
 */
function getCategoryCell(row: HTMLElement): HTMLElement | null {
  if (isMainCategoryRow(row)) {
    return row.querySelector('td.padded-cell[colspan="3"]');
  }

  // Subcategory: find the td.padded-cell that's not the yellow border indicator
  const cells = row.querySelectorAll('td.padded-cell');
  for (const cell of cells) {
    const cellEl = cell as HTMLElement;
    // Skip yellow border cell (has colspan=1 and border-right style)
    if (cellEl.getAttribute('colspan') === '1' && cellEl.style.borderRight) {
      continue;
    }
    return cellEl;
  }
  return null;
}

/**
 * Creates and inserts the icon container before the category text.
 * - Main category: inserts in div.display--flex, before the span
 * - Subcategory: inserts in the first div, before the text
 */
function createIconContainer(row: HTMLElement, categoryCell: HTMLElement): HTMLElement | null {
  // Check for existing icon container
  let iconContainer = categoryCell.querySelector('.lme-icon-container') as HTMLElement | null;
  if (iconContainer) {
    return iconContainer;
  }

  const flexWrapper = categoryCell.querySelector('.flex--space-between-flex-start') as HTMLElement | null;
  if (!flexWrapper) {
    return null;
  }

  iconContainer = document.createElement('div');
  iconContainer.className = 'lme-icon-container';
  iconContainer.style.display = 'inline-flex';
  iconContainer.style.alignItems = 'center';
  iconContainer.style.marginRight = '4px';

  if (isMainCategoryRow(row)) {
    // Main category structure:
    // div.flex--space-between-flex-start > div.display--flex > span (text)
    const displayFlex = flexWrapper.querySelector('.display--flex') as HTMLElement | null;
    if (displayFlex) {
      displayFlex.insertBefore(iconContainer, displayFlex.firstChild);
    } else {
      flexWrapper.insertBefore(iconContainer, flexWrapper.firstChild);
    }
  } else {
    // Subcategory structure:
    // div.flex--space-between-flex-start > div (text) + div.display--flex
    // Find the first div that is NOT .display--flex (that's the text container)
    const children = Array.from(flexWrapper.children) as HTMLElement[];
    const textContainer = children.find(
      (child) => child.tagName === 'DIV' && !child.classList.contains('display--flex')
    );

    if (textContainer) {
      textContainer.insertBefore(iconContainer, textContainer.firstChild);
    } else {
      flexWrapper.insertBefore(iconContainer, flexWrapper.firstChild);
    }
  }

  return iconContainer;
}

/**
 * Hook to find and track all budget rows in Lunch Money.
 * Creates icon containers next to each budget input.
 */
export function useBudgetRows(): BudgetRow[] {
  const [rows, setRows] = useState<BudgetRow[]>([]);

  useEffect(() => {
    const findBudgetRows = (): BudgetRow[] => {
      const budgetRows: BudgetRow[] = [];
      const rowElements = document.querySelectorAll(SELECTORS.BUDGET_ROW);

      rowElements.forEach((rowElement) => {
        const row = rowElement as HTMLElement;

        const inputElement = row.querySelector(SELECTORS.BUDGET_INPUT) as HTMLElement | null;
        if (!inputElement) return;

        const category = getCategoryName(row);
        if (!category) return;

        const isRollover = isRolloverRow(row);

        const categoryCell = getCategoryCell(row);
        if (!categoryCell) return;

        const iconContainer = createIconContainer(row, categoryCell);
        if (!iconContainer) return;

        budgetRows.push({
          category,
          isRollover,
          inputElement,
          iconContainer,
        });
      });

      return budgetRows;
    };

    // Initial detection
    const initialRows = findBudgetRows();
    setRows(initialRows);

    // Retry if no rows found initially (page may still be loading)
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    if (initialRows.length === 0) {
      retryTimeout = setTimeout(() => {
        const retryRows = findBudgetRows();
        if (retryRows.length > 0) {
          setRows(retryRows);
        }
      }, 2000);
    }

    // Watch for DOM changes (categories expanding/collapsing)
    const observer = new MutationObserver(() => {
      const newRows = findBudgetRows();
      if (newRows.length !== rows.length) {
        setRows(newRows);
      }
    });

    const budgetTable = document.querySelector(SELECTORS.BUDGET_TABLE);
    if (budgetTable) {
      observer.observe(budgetTable, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      observer.disconnect();
      document.querySelectorAll('.lme-icon-container').forEach((el) => el.remove());
    };
  }, [rows.length]);

  return rows;
}
