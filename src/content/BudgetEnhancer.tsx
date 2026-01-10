import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BudgetModal } from '../components/Modal/BudgetModal';
import { BudgetIcon } from '../components/Icon/BudgetIcon';
import { useMonthDetector } from './hooks/useMonthDetector';
import { useBudgetRows } from './hooks/useBudgetRows';
import { getLineData } from '../storage/storage';

interface ModalState {
  isOpen: boolean;
  category: string;
  isRollover: boolean;
  targetInput: HTMLElement | null;
}

export function BudgetEnhancer() {
  const currentMonth = useMonthDetector();
  const budgetRows = useBudgetRows();
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    category: '',
    isRollover: false,
    targetInput: null,
  });
  const [dataStatus, setDataStatus] = useState<Record<string, boolean>>({});

  // Check which categories have data
  const refreshDataStatus = useCallback(async () => {
    if (!currentMonth) return;

    const status: Record<string, boolean> = {};
    for (const row of budgetRows) {
      const data = await getLineData(currentMonth, row.category);
      const hasData = data !== null && (data.notes.trim() !== '' || data.items.length > 0);
      status[row.category] = hasData;
    }
    setDataStatus(status);
  }, [currentMonth, budgetRows]);

  useEffect(() => {
    refreshDataStatus();
  }, [refreshDataStatus]);

  const handleIconClick = useCallback(
    (category: string, isRollover: boolean, targetInput: HTMLElement) => {
      setModalState({
        isOpen: true,
        category,
        isRollover,
        targetInput,
      });
    },
    []
  );

  const handleModalClose = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    refreshDataStatus();
  }, [refreshDataStatus]);

  const handleInsertTotal = useCallback(
    (total: number) => {
      if (modalState.targetInput) {
        console.log('[handleInsertTotal] Target input:', modalState.targetInput);

        // Find the editable wrapper element
        const editableWrapper = modalState.targetInput.querySelector(
          '.g-editable-text'
        ) as HTMLElement;

        console.log('[handleInsertTotal] Editable wrapper:', editableWrapper);

        if (editableWrapper) {
          // Find the default state element (this is what we click to edit)
          const defaultState = editableWrapper.querySelector('.default-state') as HTMLElement;
          console.log('[handleInsertTotal] Default state:', defaultState);

          if (defaultState) {
            // Trigger a click to enter edit mode
            defaultState.click();

            // Wait for the input to appear, then set its value
            setTimeout(() => {
              const input = editableWrapper.querySelector('input') as HTMLInputElement;
              console.log('[handleInsertTotal] Input found:', input);

              if (input) {
                input.value = total.toFixed(2);
                input.dispatchEvent(new Event('input', { bubbles: true }));
                // Focus the input so user can edit the value
                input.focus();
                input.select();
              }
            }, 100);
          }
        }
      }
      handleModalClose();
    },
    [modalState.targetInput, handleModalClose]
  );

  if (!currentMonth) {
    return null;
  }

  return (
    <>
      {/* Render icons next to each budget row */}
      {budgetRows.map((row) =>
        row.iconContainer
          ? createPortal(
              <BudgetIcon
                hasData={dataStatus[row.category] || false}
                onClick={() => handleIconClick(row.category, row.isRollover, row.inputElement)}
              />,
              row.iconContainer
            )
          : null
      )}

      {/* Modal */}
      {modalState.isOpen && (
        <BudgetModal
          month={currentMonth}
          category={modalState.category}
          isRollover={modalState.isRollover}
          onClose={handleModalClose}
          onInsertTotal={handleInsertTotal}
        />
      )}
    </>
  );
}
