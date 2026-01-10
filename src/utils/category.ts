/**
 * Parse a category name that may include hierarchy
 * e.g., "Food > Groceries and Household" -> { full: "Food > Groceries and Household", parts: ["Food", "Groceries and Household"] }
 */
export interface ParsedCategory {
  full: string;
  parts: string[];
  isHierarchical: boolean;
}

export function parseCategory(categoryName: string): ParsedCategory {
  const trimmed = categoryName.trim();
  const parts = trimmed.split(/\s*>\s*/).map((part) => part.trim());

  return {
    full: trimmed,
    parts,
    isHierarchical: parts.length > 1,
  };
}

/**
 * Create a storage key from month and category
 * Format: "YYYY-MM:categoryName"
 */
export function createStorageKey(month: string, category: string): string {
  return `${month}:${category}`;
}

/**
 * Parse a storage key back into month and category
 */
export function parseStorageKey(key: string): { month: string; category: string } | null {
  const match = key.match(/^(\d{4}-\d{2}):(.+)$/);
  if (!match) return null;

  return {
    month: match[1],
    category: match[2],
  };
}

/**
 * Check if a storage key matches the budget data format
 */
export function isBudgetDataKey(key: string): boolean {
  return /^\d{4}-\d{2}:.+$/.test(key);
}

/**
 * Normalize category name for comparison
 */
export function normalizeCategory(category: string): string {
  return category.trim().toLowerCase();
}
