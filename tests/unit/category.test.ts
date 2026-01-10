import { describe, it, expect } from 'vitest';
import {
  parseCategory,
  createStorageKey,
  parseStorageKey,
  isBudgetDataKey,
  normalizeCategory,
} from '../../src/utils/category';

describe('Category Utils', () => {
  describe('parseCategory', () => {
    it('parses simple category names', () => {
      const result = parseCategory('Groceries');

      expect(result.full).toBe('Groceries');
      expect(result.parts).toEqual(['Groceries']);
      expect(result.isHierarchical).toBe(false);
    });

    it('parses hierarchical category names', () => {
      const result = parseCategory('Food > Groceries and Household');

      expect(result.full).toBe('Food > Groceries and Household');
      expect(result.parts).toEqual(['Food', 'Groceries and Household']);
      expect(result.isHierarchical).toBe(true);
    });

    it('handles multiple levels of hierarchy', () => {
      const result = parseCategory('Expenses > Food > Restaurants');

      expect(result.parts).toEqual(['Expenses', 'Food', 'Restaurants']);
      expect(result.isHierarchical).toBe(true);
    });

    it('trims whitespace', () => {
      const result = parseCategory('  Food  >  Groceries  ');

      expect(result.full).toBe('Food  >  Groceries');
      expect(result.parts).toEqual(['Food', 'Groceries']);
    });
  });

  describe('createStorageKey', () => {
    it('creates correct key format', () => {
      expect(createStorageKey('2024-01', 'Groceries')).toBe('2024-01:Groceries');
    });

    it('handles hierarchical categories', () => {
      expect(createStorageKey('2024-01', 'Food > Groceries')).toBe('2024-01:Food > Groceries');
    });
  });

  describe('parseStorageKey', () => {
    it('parses valid storage keys', () => {
      const result = parseStorageKey('2024-01:Groceries');

      expect(result).toEqual({
        month: '2024-01',
        category: 'Groceries',
      });
    });

    it('handles categories with colons in name', () => {
      // If category contains colon, only first colon is the delimiter
      const result = parseStorageKey('2024-01:Time: 5:30 PM');

      expect(result?.category).toBe('Time: 5:30 PM');
    });

    it('returns null for invalid keys', () => {
      expect(parseStorageKey('invalid')).toBeNull();
      expect(parseStorageKey('2024-1:Cat')).toBeNull(); // Invalid month
      expect(parseStorageKey(':Category')).toBeNull(); // Missing month
    });
  });

  describe('isBudgetDataKey', () => {
    it('identifies valid budget data keys', () => {
      expect(isBudgetDataKey('2024-01:Groceries')).toBe(true);
      expect(isBudgetDataKey('2024-12:Food > Dining')).toBe(true);
    });

    it('rejects invalid keys', () => {
      expect(isBudgetDataKey('settings')).toBe(false);
      expect(isBudgetDataKey('2024-1:Cat')).toBe(false);
      expect(isBudgetDataKey('')).toBe(false);
    });
  });

  describe('normalizeCategory', () => {
    it('converts to lowercase and trims', () => {
      expect(normalizeCategory('  Groceries  ')).toBe('groceries');
      expect(normalizeCategory('FOOD')).toBe('food');
    });

    it('preserves hierarchy structure', () => {
      expect(normalizeCategory('Food > Groceries')).toBe('food > groceries');
    });
  });
});
