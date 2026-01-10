import { useState } from 'react';
import type { CategoryInfo } from '../../storage/schema';

interface CategoryRowProps {
  category: CategoryInfo;
  onRename: (oldName: string, newName: string) => void;
  onDelete: (name: string) => void;
  disabled: boolean;
}

export function CategoryRow({ category, onRename, onDelete, disabled }: CategoryRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(category.name);

  const handleSaveRename = () => {
    if (newName.trim() && newName !== category.name) {
      onRename(category.name, newName);
    }
    setIsEditing(false);
  };

  const handleCancelRename = () => {
    setNewName(category.name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      handleCancelRename();
    }
  };

  return (
    <div className="category-row">
      <div className="category-row__info">
        {isEditing ? (
          <input
            type="text"
            className="category-row__name-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSaveRename}
            autoFocus
            disabled={disabled}
          />
        ) : (
          <span className="category-row__name">{category.name}</span>
        )}
        <span className="category-row__meta">
          {category.entryCount} {category.entryCount === 1 ? 'month' : 'months'}
        </span>
      </div>

      <div className="category-row__actions">
        {isEditing ? (
          <>
            <button
              type="button"
              className="category-row__btn category-row__btn--save"
              onClick={handleSaveRename}
              disabled={disabled}
            >
              Save
            </button>
            <button
              type="button"
              className="category-row__btn category-row__btn--cancel"
              onClick={handleCancelRename}
              disabled={disabled}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="category-row__btn"
              onClick={() => setIsEditing(true)}
              disabled={disabled}
              title="Rename/merge category"
            >
              Rename
            </button>
            <button
              type="button"
              className="category-row__btn category-row__btn--danger"
              onClick={() => onDelete(category.name)}
              disabled={disabled}
              title="Delete all notes for this category"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
