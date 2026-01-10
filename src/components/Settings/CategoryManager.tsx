import { useState, useCallback } from 'react';
import { CategoryRow } from './CategoryRow';
import { renameCategory, deleteCategory } from '../../storage/storage';
import type { CategoryInfo } from '../../storage/schema';

interface CategoryManagerProps {
  categories: CategoryInfo[];
  onRefresh: () => void;
}

export function CategoryManager({ categories, onRefresh }: CategoryManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRename = useCallback(
    async (oldName: string, newName: string) => {
      if (!newName.trim()) {
        setError('New category name cannot be empty');
        return;
      }

      setIsProcessing(true);
      setError(null);

      try {
        await renameCategory(oldName, newName.trim());
        onRefresh();
      } catch (err) {
        setError(`Failed to rename category: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [onRefresh]
  );

  const handleDelete = useCallback(
    async (category: string) => {
      const confirm = window.confirm(
        `Are you sure you want to delete all notes for "${category}"? This action cannot be undone.`
      );
      if (!confirm) return;

      setIsProcessing(true);
      setError(null);

      try {
        await deleteCategory(category);
        onRefresh();
      } catch (err) {
        setError(`Failed to delete category: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [onRefresh]
  );

  if (categories.length === 0) {
    return (
      <div className="category-manager-empty">
        <p>No categories with saved notes yet.</p>
        <p>Start adding notes in your Lunch Money budget view!</p>
      </div>
    );
  }

  return (
    <div className="category-manager">
      {error && <div className="category-manager-error">{error}</div>}

      <div className="category-search">
        <input
          type="text"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="category-search-input"
        />
      </div>

      <div className="category-list">
        {filteredCategories.length === 0 ? (
          <div className="category-list-empty">No categories match your search</div>
        ) : (
          filteredCategories.map((category) => (
            <CategoryRow
              key={category.name}
              category={category}
              onRename={handleRename}
              onDelete={handleDelete}
              disabled={isProcessing}
            />
          ))
        )}
      </div>
    </div>
  );
}
