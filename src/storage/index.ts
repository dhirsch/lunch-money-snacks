/**
 * Storage module for Budget Notes Chrome extension
 *
 * This module provides a typed wrapper around Chrome's storage.local API
 * for storing budget notes and itemized breakdowns.
 *
 * Storage key format: "{YYYY-MM}:{categoryName}"
 * Example: "2024-01:Groceries"
 */

// Export all types and interfaces
export type {
  BudgetLineData,
  ItemizedItem,
  StorageKey,
  ParsedStorageKey,
  CategoryInfo,
  StorageStats
} from './schema';

// Export utility functions from schema
export {
  createStorageKey,
  parseStorageKey,
  isValidMonthFormat,
  createEmptyLineData,
  generateUUID,
  createItemizedItem
} from './schema';

// Export storage operations
export {
  saveLineData,
  getLineData,
  getAllCategories,
  renameCategory,
  deleteCategory,
  getStorageStats,
  clearAllData,
  getMonthData,
  exportAllData,
  importData,
  StorageError
} from './storage';
