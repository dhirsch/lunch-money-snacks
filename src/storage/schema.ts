/**
 * Storage schema types for the Budget Notes Chrome extension
 */

/**
 * Represents a single itemized expense or income item
 */
export interface ItemizedItem {
  /** Unique identifier (UUID) */
  id: string;
  /** Description of the item */
  description: string;
  /** Amount in currency units */
  amount: number;
}

/**
 * Data stored for a single budget line (category within a month)
 */
export interface BudgetLineData {
  /** User notes for this budget line */
  notes: string;
  /** List of itemized items */
  items: ItemizedItem[];
  /** Timestamp of last modification */
  lastModified: number;
}

/**
 * Storage key format: "{YYYY-MM}:{categoryName}"
 * Examples: "2024-01:Groceries", "2024-02:Utilities"
 */
export type StorageKey = `${string}:${string}`;

/**
 * Parses a storage key into its components
 */
export interface ParsedStorageKey {
  month: string; // Format: YYYY-MM
  category: string;
}

/**
 * Information about a category with saved data
 */
export interface CategoryInfo {
  /** Category name */
  name: string;
  /** List of months that have data for this category */
  months: string[];
  /** Total number of entries for this category */
  entryCount: number;
}

export interface UserSettings {
  budgetNotesEnabled: boolean;
  periodSummaryEnabled: boolean;
  syncEnabled?: boolean;
  apiKey?: string;
  openRouterApiKey?: string;
  openRouterModel?: string;
  conflictPolicy?: 'last-write-wins' | 'local-wins' | 'remote-wins';
  lastSyncAt?: number;
  lastSyncError?: string;
}

export const SETTINGS_STORAGE_KEY = '__settings__';

export const DEFAULT_SETTINGS: UserSettings = {
  budgetNotesEnabled: true,
  periodSummaryEnabled: true,
  syncEnabled: false,
  openRouterModel: 'anthropic/claude-haiku-4.5',
  conflictPolicy: 'last-write-wins',
};

/**
 * Storage statistics
 */
export interface StorageStats {
  /** Bytes used by stored data */
  bytesUsed: number;
  /** Number of unique categories */
  categories: number;
  /** Number of unique months with data */
  months: number;
}

/**
 * Creates a storage key from month and category
 * @param month - Month in YYYY-MM format
 * @param category - Category name
 * @returns Storage key in format "{YYYY-MM}:{categoryName}"
 */
export function createStorageKey(month: string, category: string): StorageKey {
  return `${month}:${category}` as StorageKey;
}

/**
 * Parses a storage key into month and category components
 * @param key - Storage key to parse
 * @returns Parsed key components or null if invalid
 */
export function parseStorageKey(key: string): ParsedStorageKey | null {
  const colonIndex = key.indexOf(':');
  if (colonIndex === -1) {
    return null;
  }

  const month = key.substring(0, colonIndex);
  const category = key.substring(colonIndex + 1);

  // Validate month format (YYYY-MM)
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return null;
  }

  if (!category) {
    return null;
  }

  return { month, category };
}

/**
 * Validates that a string is a valid month format (YYYY-MM)
 * @param month - String to validate
 * @returns True if valid month format
 */
export function isValidMonthFormat(month: string): boolean {
  return /^\d{4}-\d{2}$/.test(month);
}

/**
 * Creates a default empty BudgetLineData object
 * @returns Empty BudgetLineData with current timestamp
 */
export function createEmptyLineData(): BudgetLineData {
  return {
    notes: '',
    items: [],
    lastModified: Date.now()
  };
}

/**
 * Generates a UUID v4
 * @returns A new UUID string
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Creates a new ItemizedItem with a generated UUID
 * @param description - Description of the item
 * @param amount - Amount for the item
 * @returns New ItemizedItem
 */
export function createItemizedItem(description: string, amount: number): ItemizedItem {
  return {
    id: generateUUID(),
    description,
    amount
  };
}
