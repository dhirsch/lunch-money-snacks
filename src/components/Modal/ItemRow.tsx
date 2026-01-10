import { useState } from 'react';
import { formatCurrency, parseCurrency, formatForInput } from '../../utils/currency';
import type { ItemizedItem } from '../../storage/schema';

interface ItemRowProps {
  item: ItemizedItem;
  onUpdate: (updates: Partial<ItemizedItem>) => void;
  onDelete: () => void;
}

/**
 * A single row in the itemized breakdown list
 * Supports inline editing of description and amount
 */
export function ItemRow({ item, onUpdate, onDelete }: ItemRowProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [editDescription, setEditDescription] = useState(item.description);
  const [editAmount, setEditAmount] = useState(formatForInput(item.amount));

  const handleDescriptionBlur = () => {
    setIsEditingDescription(false);
    if (editDescription.trim() !== item.description) {
      onUpdate({ description: editDescription.trim() || 'Unnamed item' });
    }
  };

  const handleAmountBlur = () => {
    setIsEditingAmount(false);
    const newAmount = parseCurrency(editAmount);
    if (newAmount !== item.amount) {
      onUpdate({ amount: newAmount });
    }
    setEditAmount(formatForInput(newAmount));
  };

  const handleKeyDown = (e: React.KeyboardEvent, onBlur: () => void) => {
    if (e.key === 'Enter') {
      onBlur();
    } else if (e.key === 'Escape') {
      setEditDescription(item.description);
      setEditAmount(formatForInput(item.amount));
      setIsEditingDescription(false);
      setIsEditingAmount(false);
    }
  };

  return (
    <div className="lme-item-row">
      {/* Description */}
      {isEditingDescription ? (
        <input
          type="text"
          className="lme-item-row__description lme-item-row__description--editing"
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          onKeyDown={(e) => handleKeyDown(e, handleDescriptionBlur)}
          autoFocus
        />
      ) : (
        <span
          className="lme-item-row__description"
          onClick={() => {
            setIsEditingDescription(true);
            setEditDescription(item.description);
          }}
          title="Click to edit"
        >
          {item.description}
        </span>
      )}

      {/* Amount */}
      {isEditingAmount ? (
        <input
          type="text"
          className="lme-item-row__amount lme-item-row__amount--editing"
          value={editAmount}
          onChange={(e) => setEditAmount(e.target.value)}
          onBlur={handleAmountBlur}
          onKeyDown={(e) => handleKeyDown(e, handleAmountBlur)}
          autoFocus
        />
      ) : (
        <span
          className="lme-item-row__amount"
          onClick={() => {
            setIsEditingAmount(true);
            setEditAmount(formatForInput(item.amount));
          }}
          title="Click to edit"
        >
          {formatCurrency(item.amount)}
        </span>
      )}

      {/* Delete button */}
      <button
        type="button"
        className="lme-btn lme-btn--icon lme-btn--danger"
        onClick={onDelete}
        aria-label="Delete item"
      >
        &times;
      </button>
    </div>
  );
}
