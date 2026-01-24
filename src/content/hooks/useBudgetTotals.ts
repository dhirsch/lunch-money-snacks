import { useState, useEffect } from 'react';
import { BUDGET_TABLE, TOTALS_ROW } from '../../types/lunch-money-dom';

export interface BudgetTotals {
  expectedInflow: number;
  budgetedOutflow: number;
}

function parseCurrencyValue(text: string | null | undefined): number {
  if (!text) return 0;
  const cleaned = text.replace(/[$,]/g, '');
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}

function extractTotalsFromDOM(): BudgetTotals {
  const tables = document.querySelectorAll(BUDGET_TABLE);
  
  let expectedInflow = 0;
  let budgetedOutflow = 0;

  tables.forEach((table, index) => {
    const totalsRow = table.querySelector(TOTALS_ROW);
    if (!totalsRow) return;

    const cells = totalsRow.querySelectorAll('th');
    const budgetCell = Array.from(cells).find(
      (cell) => cell.classList.contains('table-cell-input') && cell.classList.contains('right-align')
    );

    if (budgetCell) {
      const value = parseCurrencyValue(budgetCell.textContent);
      if (index === 0) {
        expectedInflow = value;
      } else if (index === 1) {
        budgetedOutflow = value;
      }
    }
  });

  return { expectedInflow, budgetedOutflow };
}

export function useBudgetTotals(): BudgetTotals | null {
  const [totals, setTotals] = useState<BudgetTotals | null>(null);

  useEffect(() => {
    const updateTotals = () => {
      const newTotals = extractTotalsFromDOM();
      if (newTotals.expectedInflow > 0 || newTotals.budgetedOutflow > 0) {
        setTotals(newTotals);
      }
    };

    updateTotals();

    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    if (!totals) {
      retryTimeout = setTimeout(updateTotals, 2000);
    }

    const observer = new MutationObserver(() => {
      updateTotals();
    });

    const budgetContainer = document.querySelector('.g-budget');
    if (budgetContainer) {
      observer.observe(budgetContainer, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      observer.disconnect();
    };
  }, [totals]);

  return totals;
}
