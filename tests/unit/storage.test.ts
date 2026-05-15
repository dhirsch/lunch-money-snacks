import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetMockStorage, seedMockStorage } from '../../src/test/setup';

vi.mock('webextension-polyfill', () => ({
  default: (globalThis as any).chrome,
}));

import {
  saveLineData,
  getLineData,
  getAllCategories,
  renameCategory,
  deleteCategory,
  getStorageStats,
} from '../../src/storage/storage';
import {
  createStorageKey,
  parseStorageKey,
  isValidMonthFormat,
  createEmptyLineData,
  createItemizedItem,
} from '../../src/storage/schema';
import type { BudgetLineData } from '../../src/storage/schema';

describe('Storage Schema', () => {
  describe('createStorageKey', () => {
    it('creates correct key format', () => {
      expect(createStorageKey('2024-01', 'Groceries')).toBe('2024-01:Groceries');
      expect(createStorageKey('2024-12', 'Food > Dining Out')).toBe('2024-12:Food > Dining Out');
    });
  });

  describe('parseStorageKey', () => {
    it('parses valid keys correctly', () => {
      const result = parseStorageKey('2024-01:Groceries');
      expect(result).toEqual({ month: '2024-01', category: 'Groceries' });
    });

    it('handles categories with special characters', () => {
      const result = parseStorageKey('2024-01:Food > Dining Out');
      expect(result).toEqual({ month: '2024-01', category: 'Food > Dining Out' });
    });

    it('returns null for invalid keys', () => {
      expect(parseStorageKey('invalid')).toBeNull();
      expect(parseStorageKey('2024-1:Category')).toBeNull(); // Invalid month format
      expect(parseStorageKey('2024-01:')).toBeNull(); // Empty category
    });
  });

  describe('isValidMonthFormat', () => {
    it('validates correct formats', () => {
      expect(isValidMonthFormat('2024-01')).toBe(true);
      expect(isValidMonthFormat('2024-12')).toBe(true);
      expect(isValidMonthFormat('1999-06')).toBe(true);
    });

    it('rejects invalid formats', () => {
      expect(isValidMonthFormat('2024-1')).toBe(false);
      expect(isValidMonthFormat('24-01')).toBe(false);
      expect(isValidMonthFormat('2024/01')).toBe(false);
      expect(isValidMonthFormat('January 2024')).toBe(false);
    });
  });

  describe('createEmptyLineData', () => {
    it('creates data with empty values and current timestamp', () => {
      const before = Date.now();
      const data = createEmptyLineData();
      const after = Date.now();

      expect(data.notes).toBe('');
      expect(data.items).toEqual([]);
      expect(data.lastModified).toBeGreaterThanOrEqual(before);
      expect(data.lastModified).toBeLessThanOrEqual(after);
    });
  });

  describe('createItemizedItem', () => {
    it('creates item with UUID and provided values', () => {
      const item = createItemizedItem('Coffee', 5.99);

      expect(item.description).toBe('Coffee');
      expect(item.amount).toBe(5.99);
      expect(item.id).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i);
    });

    it('generates unique IDs', () => {
      const item1 = createItemizedItem('Item 1', 10);
      const item2 = createItemizedItem('Item 2', 20);

      expect(item1.id).not.toBe(item2.id);
    });
  });
});

describe('Storage Operations', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  describe('saveLineData and getLineData', () => {
    it('saves and retrieves data correctly', async () => {
      const data: BudgetLineData = {
        notes: 'Test notes',
        items: [createItemizedItem('Test item', 10)],
        lastModified: Date.now(),
      };

      await saveLineData('2024-01', 'Groceries', data);
      const retrieved = await getLineData('2024-01', 'Groceries');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.notes).toBe('Test notes');
      expect(retrieved?.items).toHaveLength(1);
      expect(retrieved?.items[0].description).toBe('Test item');
    });

    it('returns null for non-existent data', async () => {
      const result = await getLineData('2024-01', 'NonExistent');
      expect(result).toBeNull();
    });

    it('updates lastModified on save', async () => {
      const initialData: BudgetLineData = {
        notes: 'Initial',
        items: [],
        lastModified: 1000,
      };

      const before = Date.now();
      await saveLineData('2024-01', 'Test', initialData);
      const after = Date.now();

      const retrieved = await getLineData('2024-01', 'Test');
      expect(retrieved?.lastModified).toBeGreaterThanOrEqual(before);
      expect(retrieved?.lastModified).toBeLessThanOrEqual(after);
    });
  });

  describe('getAllCategories', () => {
    it('returns empty array when no data', async () => {
      const categories = await getAllCategories();
      expect(categories).toEqual([]);
    });

    it('groups data by category across months', async () => {
      await saveLineData('2024-01', 'Groceries', createEmptyLineData());
      await saveLineData('2024-02', 'Groceries', createEmptyLineData());
      await saveLineData('2024-01', 'Utilities', createEmptyLineData());

      const categories = await getAllCategories();

      expect(categories).toHaveLength(2);

      const groceries = categories.find((c) => c.name === 'Groceries');
      expect(groceries?.months).toEqual(['2024-01', '2024-02']);
      expect(groceries?.entryCount).toBe(2);

      const utilities = categories.find((c) => c.name === 'Utilities');
      expect(utilities?.months).toEqual(['2024-01']);
      expect(utilities?.entryCount).toBe(1);
    });

    it('returns categories sorted alphabetically', async () => {
      await saveLineData('2024-01', 'Zebra', createEmptyLineData());
      await saveLineData('2024-01', 'Apple', createEmptyLineData());
      await saveLineData('2024-01', 'Mango', createEmptyLineData());

      const categories = await getAllCategories();

      expect(categories.map((c) => c.name)).toEqual(['Apple', 'Mango', 'Zebra']);
    });
  });

  describe('renameCategory', () => {
    it('renames category across all months', async () => {
      await saveLineData('2024-01', 'OldName', {
        notes: 'Notes 1',
        items: [],
        lastModified: Date.now(),
      });
      await saveLineData('2024-02', 'OldName', {
        notes: 'Notes 2',
        items: [],
        lastModified: Date.now(),
      });

      await renameCategory('OldName', 'NewName');

      expect(await getLineData('2024-01', 'OldName')).toBeNull();
      expect(await getLineData('2024-02', 'OldName')).toBeNull();

      const jan = await getLineData('2024-01', 'NewName');
      const feb = await getLineData('2024-02', 'NewName');

      expect(jan?.notes).toBe('Notes 1');
      expect(feb?.notes).toBe('Notes 2');
    });

    it('does nothing when old and new names are the same', async () => {
      await saveLineData('2024-01', 'Category', {
        notes: 'Original',
        items: [],
        lastModified: Date.now(),
      });

      await renameCategory('Category', 'Category');

      const data = await getLineData('2024-01', 'Category');
      expect(data?.notes).toBe('Original');
    });
  });

  describe('deleteCategory', () => {
    it('deletes category data across all months', async () => {
      await saveLineData('2024-01', 'ToDelete', createEmptyLineData());
      await saveLineData('2024-02', 'ToDelete', createEmptyLineData());
      await saveLineData('2024-01', 'ToKeep', createEmptyLineData());

      await deleteCategory('ToDelete');

      expect(await getLineData('2024-01', 'ToDelete')).toBeNull();
      expect(await getLineData('2024-02', 'ToDelete')).toBeNull();
      expect(await getLineData('2024-01', 'ToKeep')).not.toBeNull();
    });
  });

  describe('getStorageStats', () => {
    it('returns correct statistics', async () => {
      await saveLineData('2024-01', 'Cat1', createEmptyLineData());
      await saveLineData('2024-01', 'Cat2', createEmptyLineData());
      await saveLineData('2024-02', 'Cat1', createEmptyLineData());

      const stats = await getStorageStats();

      expect(stats.categories).toBe(2);
      expect(stats.months).toBe(2);
      expect(stats.bytesUsed).toBeGreaterThan(0);
    });

    it('returns zeros when empty', async () => {
      const stats = await getStorageStats();

      expect(stats.categories).toBe(0);
      expect(stats.months).toBe(0);
    });
  });
});
