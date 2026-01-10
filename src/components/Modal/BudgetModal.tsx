import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { NotesSection } from './NotesSection';
import { ItemizedSection } from './ItemizedSection';
import { getLineData, saveLineData } from '../../storage/storage';
import { createEmptyLineData } from '../../storage/schema';
import type { BudgetLineData, ItemizedItem } from '../../storage/schema';
import { calculateSum } from '../../utils/currency';

interface BudgetModalProps {
  month: string;
  category: string;
  isRollover: boolean;
  onClose: () => void;
  onInsertTotal: (total: number) => void;
}

export function BudgetModal({
  month,
  category,
  isRollover,
  onClose,
  onInsertTotal,
}: BudgetModalProps) {
  const [data, setData] = useState<BudgetLineData>(createEmptyLineData());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const savedData = await getLineData(month, category);
      if (savedData) {
        setData(savedData);
      } else {
        setData(createEmptyLineData());
      }
      setIsLoading(false);
    };
    loadData();
  }, [month, category]);

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirm) return;
    }
    onClose();
  }, [hasUnsavedChanges, onClose]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    await saveLineData(month, category, {
      ...data,
      lastModified: Date.now(),
    });
    setHasUnsavedChanges(false);
    setIsSaving(false);
    onClose();
  }, [month, category, data, onClose]);

  const handleNotesChange = useCallback((notes: string) => {
    setData((prev) => ({ ...prev, notes }));
    setHasUnsavedChanges(true);
  }, []);

  const handleItemsChange = useCallback((items: ItemizedItem[]) => {
    setData((prev) => ({ ...prev, items }));
    setHasUnsavedChanges(true);
  }, []);

  const handleInsertTotal = useCallback(() => {
    const total = calculateSum(data.items.map((item) => item.amount));
    // Save before inserting
    saveLineData(month, category, {
      ...data,
      lastModified: Date.now(),
    }).then(() => {
      onInsertTotal(total);
    });
  }, [month, category, data, onInsertTotal]);

  // Handle keyboard shortcuts and click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'Enter' && e.ctrlKey) {
        // Ctrl-Enter: Save and close
        handleSave();
      } else if (e.key === 'Enter' && (e.altKey || e.metaKey)) {
        // Alt-Enter or Cmd-Enter: Insert Total and close
        if (!isRollover && data.items.length > 0) {
          handleInsertTotal();
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRollover, data.items.length, handleClose, handleSave, handleInsertTotal]);

  // Format month for display
  const formatMonth = (monthStr: string): string => {
    const [year, monthNum] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const modalContent = (
    <div className="lme-modal-overlay">
      <div className="lme-modal" ref={modalRef} role="dialog" aria-modal="true">
        <div className="lme-modal__header">
          <div className="lme-modal__title">
            <span className="lme-modal__category">{category}</span>
            <span className="lme-modal__month">{formatMonth(month)}</span>
          </div>
          <button
            type="button"
            className="lme-modal__close"
            onClick={handleClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="lme-modal__content">
          {isLoading ? (
            <div className="lme-modal__loading">Loading...</div>
          ) : (
            <>
              <NotesSection value={data.notes} onChange={handleNotesChange} />

              {!isRollover && (
                <ItemizedSection
                  items={data.items}
                  onChange={handleItemsChange}
                  onInsertTotal={handleInsertTotal}
                />
              )}
            </>
          )}
        </div>

        <div className="lme-modal__footer">
          <button type="button" className="lme-btn lme-btn--secondary" onClick={handleClose}>
            Cancel
          </button>
          <button
            type="button"
            className="lme-btn lme-btn--primary"
            onClick={handleSave}
            disabled={isSaving}
            title="Ctrl+Enter"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
