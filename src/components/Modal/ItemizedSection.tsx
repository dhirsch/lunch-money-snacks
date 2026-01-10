import { useState, useRef, useCallback } from 'react';
import { ItemRow } from './ItemRow';
import { createItemizedItem } from '../../storage/schema';
import { formatCurrency, calculateSum, parseCurrency } from '../../utils/currency';
import type { ItemizedItem } from '../../storage/schema';

interface ItemizedSectionProps {
  items: ItemizedItem[];
  onChange: (items: ItemizedItem[]) => void;
  onInsertTotal: () => void;
}

/**
 * Itemized breakdown section with quick-entry form and running total
 */
export function ItemizedSection({ items, onChange, onInsertTotal }: ItemizedSectionProps) {
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const descriptionInputRef = useRef<HTMLInputElement>(null);

  const total = calculateSum(items.map((item) => item.amount));

  const handleAddItem = useCallback(() => {
    const amount = parseCurrency(newAmount);
    if (!newDescription.trim() && amount === 0) return;

    const newItem = createItemizedItem(newDescription.trim() || 'Unnamed item', amount);
    onChange([...items, newItem]);
    setNewDescription('');
    setNewAmount('');
    descriptionInputRef.current?.focus();
  }, [newDescription, newAmount, items, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddItem();
      }
    },
    [handleAddItem]
  );

  const handleUpdateItem = useCallback(
    (id: string, updates: Partial<ItemizedItem>) => {
      onChange(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    },
    [items, onChange]
  );

  const handleDeleteItem = useCallback(
    (id: string) => {
      onChange(items.filter((item) => item.id !== id));
    },
    [items, onChange]
  );

  return (
    <div className="lme-itemized-section">
      <label className="lme-section-label">Itemized Breakdown</label>

      {/* Quick-entry form */}
      <div className="lme-quick-entry">
        <input
          ref={descriptionInputRef}
          type="text"
          className="lme-quick-entry__description"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Description"
          aria-label="Item description"
        />
        <input
          type="text"
          className="lme-quick-entry__amount"
          value={newAmount}
          onChange={(e) => setNewAmount(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="0.00"
          aria-label="Item amount"
        />
        <button
          type="button"
          className="lme-btn lme-btn--icon"
          onClick={handleAddItem}
          aria-label="Add item"
        >
          +
        </button>
      </div>

      {/* Item list */}
      {items.length > 0 && (
        <div className="lme-item-list">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onUpdate={(updates) => handleUpdateItem(item.id, updates)}
              onDelete={() => handleDeleteItem(item.id)}
            />
          ))}
        </div>
      )}

      {/* Total and Insert button */}
      <div className="lme-itemized-footer">
        <div className="lme-itemized-total">
          <span className="lme-itemized-total__label">Total:</span>
          <span className="lme-itemized-total__value">{formatCurrency(total)}</span>
        </div>
        <button
          type="button"
          className="lme-btn lme-btn--accent"
          onClick={onInsertTotal}
          disabled={items.length === 0}
          title={items.length === 0 ? '' : 'Alt+Enter or Cmd+Enter'}
        >
          Insert Total
        </button>
      </div>
    </div>
  );
}
