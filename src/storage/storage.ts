/**
 * Chrome storage wrapper for Budget Notes extension
 * Provides typed access to chrome.storage.local API
 */

import {
  BudgetLineData,
  CategoryInfo,
  StorageKey,
  StorageStats,
  createStorageKey,
  parseStorageKey,
  isValidMonthFormat
} from './schema';

/**
 * Error thrown when storage operations fail
 */
export class StorageError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Validates month format and throws if invalid
 */
function validateMonth(month: string): void {
  if (!isValidMonthFormat(month)) {
    throw new StorageError(`Invalid month format: "${month}". Expected YYYY-MM format.`);
  }
}

/**
 * Validates category name and throws if invalid
 */
function validateCategory(category: string): void {
  if (!category || typeof category !== 'string') {
    throw new StorageError('Category name is required and must be a non-empty string.');
  }
  if (category.includes(':')) {
    throw new StorageError('Category name cannot contain colon (:) character.');
  }
}

/**
 * Wraps chrome.storage.local operations with error handling
 */
async function chromeStorageGet<T>(keys: string | string[] | null): Promise<Record<string, T>> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(new StorageError(
            `Failed to read from storage: ${chrome.runtime.lastError.message}`,
            chrome.runtime.lastError
          ));
        } else {
          resolve(result as Record<string, T>);
        }
      });
    } catch (error) {
      reject(new StorageError('Chrome storage API not available', error));
    }
  });
}

/**
 * Wraps chrome.storage.local.set with error handling
 */
async function chromeStorageSet(items: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.set(items, () => {
        if (chrome.runtime.lastError) {
          reject(new StorageError(
            `Failed to write to storage: ${chrome.runtime.lastError.message}`,
            chrome.runtime.lastError
          ));
        } else {
          resolve();
        }
      });
    } catch (error) {
      reject(new StorageError('Chrome storage API not available', error));
    }
  });
}

/**
 * Wraps chrome.storage.local.remove with error handling
 */
async function chromeStorageRemove(keys: string | string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.remove(keys, () => {
        if (chrome.runtime.lastError) {
          reject(new StorageError(
            `Failed to remove from storage: ${chrome.runtime.lastError.message}`,
            chrome.runtime.lastError
          ));
        } else {
          resolve();
        }
      });
    } catch (error) {
      reject(new StorageError('Chrome storage API not available', error));
    }
  });
}

/**
 * Wraps chrome.storage.local.getBytesInUse with error handling
 */
async function chromeStorageGetBytesInUse(keys: string | string[] | null = null): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.getBytesInUse(keys, (bytesInUse) => {
        if (chrome.runtime.lastError) {
          reject(new StorageError(
            `Failed to get storage usage: ${chrome.runtime.lastError.message}`,
            chrome.runtime.lastError
          ));
        } else {
          resolve(bytesInUse);
        }
      });
    } catch (error) {
      reject(new StorageError('Chrome storage API not available', error));
    }
  });
}

/**
 * Saves budget line data for a specific month and category
 * @param month - Month in YYYY-MM format
 * @param category - Category name
 * @param data - Budget line data to save
 * @throws StorageError if save fails
 */
export async function saveLineData(
  month: string,
  category: string,
  data: BudgetLineData
): Promise<void> {
  validateMonth(month);
  validateCategory(category);

  const key = createStorageKey(month, category);

  // Ensure lastModified is updated
  const dataToSave: BudgetLineData = {
    ...data,
    lastModified: Date.now()
  };

  await chromeStorageSet({ [key]: dataToSave });
}

/**
 * Retrieves budget line data for a specific month and category
 * @param month - Month in YYYY-MM format
 * @param category - Category name
 * @returns Budget line data or null if not found
 * @throws StorageError if read fails
 */
export async function getLineData(
  month: string,
  category: string
): Promise<BudgetLineData | null> {
  validateMonth(month);
  validateCategory(category);

  const key = createStorageKey(month, category);
  const result = await chromeStorageGet<BudgetLineData>([key]);

  return result[key] ?? null;
}

/**
 * Retrieves all categories that have saved data across all months
 * @returns Array of category information including months with data
 * @throws StorageError if read fails
 */
export async function getAllCategories(): Promise<CategoryInfo[]> {
  const allData = await chromeStorageGet<BudgetLineData>(null);

  // Group by category
  const categoryMap = new Map<string, Set<string>>();

  for (const key of Object.keys(allData)) {
    const parsed = parseStorageKey(key);
    if (parsed) {
      const { month, category } = parsed;

      if (!categoryMap.has(category)) {
        categoryMap.set(category, new Set());
      }
      categoryMap.get(category)!.add(month);
    }
  }

  // Convert to CategoryInfo array
  const categories: CategoryInfo[] = [];

  for (const [name, monthsSet] of categoryMap) {
    const months = Array.from(monthsSet).sort();
    categories.push({
      name,
      months,
      entryCount: months.length
    });
  }

  // Sort alphabetically by category name
  return categories.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Renames a category across all months, merging data if the new name already exists
 * @param oldName - Current category name
 * @param newName - New category name
 * @throws StorageError if operation fails
 */
export async function renameCategory(oldName: string, newName: string): Promise<void> {
  validateCategory(oldName);
  validateCategory(newName);

  if (oldName === newName) {
    return; // Nothing to do
  }

  const allData = await chromeStorageGet<BudgetLineData>(null);

  const keysToRemove: string[] = [];
  const dataToSet: Record<string, BudgetLineData> = {};

  for (const [key, value] of Object.entries(allData)) {
    const parsed = parseStorageKey(key);
    if (parsed && parsed.category === oldName) {
      keysToRemove.push(key);

      const newKey = createStorageKey(parsed.month, newName);
      const existingData = allData[newKey];

      if (existingData) {
        // Merge data: combine items, append notes, use latest timestamp
        const mergedData: BudgetLineData = {
          notes: existingData.notes
            ? `${existingData.notes}\n\n--- Merged from "${oldName}" ---\n${value.notes}`
            : value.notes,
          items: [...existingData.items, ...value.items],
          lastModified: Math.max(existingData.lastModified, value.lastModified, Date.now())
        };
        dataToSet[newKey] = mergedData;
      } else {
        // Simply rename
        dataToSet[newKey] = {
          ...value,
          lastModified: Date.now()
        };
      }
    }
  }

  // Apply changes: set new data first, then remove old keys
  if (Object.keys(dataToSet).length > 0) {
    await chromeStorageSet(dataToSet);
  }

  if (keysToRemove.length > 0) {
    await chromeStorageRemove(keysToRemove);
  }
}

/**
 * Deletes all data for a category across all months
 * @param category - Category name to delete
 * @throws StorageError if operation fails
 */
export async function deleteCategory(category: string): Promise<void> {
  validateCategory(category);

  const allData = await chromeStorageGet<BudgetLineData>(null);

  const keysToRemove: string[] = [];

  for (const key of Object.keys(allData)) {
    const parsed = parseStorageKey(key);
    if (parsed && parsed.category === category) {
      keysToRemove.push(key);
    }
  }

  if (keysToRemove.length > 0) {
    await chromeStorageRemove(keysToRemove);
  }
}

/**
 * Gets storage statistics
 * @returns Object containing bytes used, category count, and month count
 * @throws StorageError if operation fails
 */
export async function getStorageStats(): Promise<StorageStats> {
  const [allData, bytesUsed] = await Promise.all([
    chromeStorageGet<BudgetLineData>(null),
    chromeStorageGetBytesInUse(null)
  ]);

  const categories = new Set<string>();
  const months = new Set<string>();

  for (const key of Object.keys(allData)) {
    const parsed = parseStorageKey(key);
    if (parsed) {
      categories.add(parsed.category);
      months.add(parsed.month);
    }
  }

  return {
    bytesUsed,
    categories: categories.size,
    months: months.size
  };
}

/**
 * Deletes all stored data (use with caution)
 * @throws StorageError if operation fails
 */
export async function clearAllData(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          reject(new StorageError(
            `Failed to clear storage: ${chrome.runtime.lastError.message}`,
            chrome.runtime.lastError
          ));
        } else {
          resolve();
        }
      });
    } catch (error) {
      reject(new StorageError('Chrome storage API not available', error));
    }
  });
}

/**
 * Gets all data for a specific month across all categories
 * @param month - Month in YYYY-MM format
 * @returns Map of category names to budget line data
 * @throws StorageError if operation fails
 */
export async function getMonthData(month: string): Promise<Map<string, BudgetLineData>> {
  validateMonth(month);

  const allData = await chromeStorageGet<BudgetLineData>(null);
  const monthData = new Map<string, BudgetLineData>();

  for (const [key, value] of Object.entries(allData)) {
    const parsed = parseStorageKey(key);
    if (parsed && parsed.month === month) {
      monthData.set(parsed.category, value);
    }
  }

  return monthData;
}

/**
 * Exports all stored data for backup purposes
 * @returns Object containing all stored data with metadata
 * @throws StorageError if operation fails
 */
export async function exportAllData(): Promise<{
  version: number;
  exportedAt: number;
  data: Record<StorageKey, BudgetLineData>;
}> {
  const allData = await chromeStorageGet<BudgetLineData>(null);

  // Filter to only include valid budget line data keys
  const budgetData: Record<StorageKey, BudgetLineData> = {};

  for (const [key, value] of Object.entries(allData)) {
    const parsed = parseStorageKey(key);
    if (parsed) {
      budgetData[key as StorageKey] = value;
    }
  }

  return {
    version: 1,
    exportedAt: Date.now(),
    data: budgetData
  };
}

/**
 * Imports data from a backup, optionally merging with existing data
 * @param backupData - Data to import
 * @param merge - If true, merge with existing data; if false, replace
 * @throws StorageError if operation fails
 */
export async function importData(
  backupData: Record<StorageKey, BudgetLineData>,
  merge: boolean = true
): Promise<void> {
  if (!merge) {
    await clearAllData();
  }

  const dataToSet: Record<string, BudgetLineData> = {};

  for (const [key, value] of Object.entries(backupData)) {
    const parsed = parseStorageKey(key);
    if (parsed) {
      if (merge) {
        const existing = await chromeStorageGet<BudgetLineData>([key]);
        if (existing[key]) {
          // Keep the more recent version
          if (value.lastModified > existing[key].lastModified) {
            dataToSet[key] = value;
          }
        } else {
          dataToSet[key] = value;
        }
      } else {
        dataToSet[key] = value;
      }
    }
  }

  if (Object.keys(dataToSet).length > 0) {
    await chromeStorageSet(dataToSet);
  }
}
