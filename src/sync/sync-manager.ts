import { extensionApi } from '../utils/extension-api';
import { parseStorageKey, SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS } from '../storage/schema';
import type { UserSettings } from '../storage/schema';

export interface SyncManagerOptions {
  debounceMs?: number;
}

export interface PullSyncResult {
  pulled: number;
  conflicts: number;
}

export interface PushSyncResult {
  pushed: number;
  created: number;
  updated: number;
}

export interface SyncStatus {
  enabled: boolean;
  lastSyncAt?: number;
  lastSyncError?: string;
}

export interface MigrationResult {
  totalPushed: number;
  skipped?: boolean;
}

type ExtendedUserSettings = UserSettings & {
  initialMigrationComplete?: boolean;
};

export class SyncManager {
  private debounceMs: number;
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private debounceVersions: Map<string, number> = new Map();
  private migrationComplete = false;

  constructor(options: SyncManagerOptions = {}) {
    this.debounceMs = options.debounceMs ?? 2000;
  }

  isSyncEnabled(): Promise<boolean> {
    return new Promise((resolve) => {
      extensionApi.storage.local.get([SETTINGS_STORAGE_KEY], (result: Record<string, unknown>) => {
        const stored = result[SETTINGS_STORAGE_KEY] as Partial<ExtendedUserSettings> | undefined;
        if (stored === undefined) {
          resolve(false);
          return;
        }
        const settings = { ...DEFAULT_SETTINGS, ...stored } as ExtendedUserSettings;
        resolve(Boolean(settings.syncEnabled && settings.apiKey));
      });
    });
  }

  pullSync(month: string): Promise<PullSyncResult> {
    return new Promise((resolve, reject) => {
      extensionApi.storage.local.get([SETTINGS_STORAGE_KEY], (result: Record<string, unknown>) => {
        const stored = result[SETTINGS_STORAGE_KEY] as Partial<ExtendedUserSettings> | undefined;
        
        if (stored !== undefined) {
          const settings = { ...DEFAULT_SETTINGS, ...stored } as ExtendedUserSettings;
          const enabled = Boolean(settings.syncEnabled && settings.apiKey);
          if (!enabled) {
            reject(new Error('Sync is not enabled'));
            return;
          }
        }

        extensionApi.runtime.sendMessage({
          type: 'sync:pull',
          payload: { month },
        }).then((response: { success: boolean; data?: PullSyncResult; error?: string }) => {
          if (!response.success) {
            reject(new Error(response.error));
          } else {
            resolve(response.data!);
          }
        }).catch(reject);
      });
    });
  }

  pushSync(month: string): Promise<PushSyncResult> {
    return new Promise((resolve, reject) => {
      extensionApi.storage.local.get([SETTINGS_STORAGE_KEY], (result: Record<string, unknown>) => {
        const stored = result[SETTINGS_STORAGE_KEY] as Partial<ExtendedUserSettings> | undefined;
        
        if (stored !== undefined) {
          const settings = { ...DEFAULT_SETTINGS, ...stored } as ExtendedUserSettings;
          const enabled = Boolean(settings.syncEnabled && settings.apiKey);
          if (!enabled) {
            reject(new Error('Sync is not enabled'));
            return;
          }
        }

        extensionApi.runtime.sendMessage({
          type: 'sync:push',
          payload: { month },
        }).then((response: { success: boolean; data?: PushSyncResult; error?: string }) => {
          if (!response.success) {
            reject(new Error(response.error));
          } else {
            resolve(response.data!);
          }
        }).catch(reject);
      });
    });
  }

  debouncedPush(month: string): void {
    const existingTimer = this.debounceTimers.get(month);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.debounceTimers.delete(month);
    }

    const version = (this.debounceVersions.get(month) || 0) + 1;
    this.debounceVersions.set(month, version);

    extensionApi.storage.local.get([SETTINGS_STORAGE_KEY], (result: Record<string, unknown>) => {
      if (this.debounceVersions.get(month) !== version) {
        return;
      }

      const stored = result[SETTINGS_STORAGE_KEY] as Partial<ExtendedUserSettings> | undefined;
      
      if (stored !== undefined) {
        const settings = { ...DEFAULT_SETTINGS, ...stored } as ExtendedUserSettings;
        const enabled = Boolean(settings.syncEnabled && settings.apiKey);
        if (!enabled) {
          return;
        }
      }

      const timer = setTimeout(() => {
        this.debounceTimers.delete(month);
        extensionApi.runtime.sendMessage({
          type: 'sync:push',
          payload: { month },
        }).catch(() => {});
      }, this.debounceMs);

      this.debounceTimers.set(month, timer);
    });
  }

  cancelPendingSync(month?: string): void {
    if (month) {
      const timer = this.debounceTimers.get(month);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(month);
      }
      this.debounceVersions.set(month, (this.debounceVersions.get(month) || 0) + 1);
    } else {
      for (const timer of this.debounceTimers.values()) {
        clearTimeout(timer);
      }
      this.debounceTimers.clear();
      for (const m of this.debounceVersions.keys()) {
        this.debounceVersions.set(m, (this.debounceVersions.get(m) || 0) + 1);
      }
    }
  }

  performInitialMigration(): Promise<MigrationResult> {
    return new Promise((resolve) => {
      extensionApi.storage.local.get(null, (allData: Record<string, unknown>) => {
        const stored = allData[SETTINGS_STORAGE_KEY] as Partial<ExtendedUserSettings> | undefined;
        const settings = { ...DEFAULT_SETTINGS, ...stored } as ExtendedUserSettings;

        if (settings.initialMigrationComplete) {
          this.migrationComplete = true;
          resolve({ totalPushed: 0, skipped: true });
          return;
        }

        const months = new Set<string>();
        for (const key of Object.keys(allData)) {
          const parsed = parseStorageKey(key);
          if (parsed) {
            months.add(parsed.month);
          }
        }

        if (months.size === 0) {
          this.migrationComplete = true;
          this.markMigrationCompleteCallback(() => {
            resolve({ totalPushed: 0 });
          });
          return;
        }

        this.pushMonthsSequentially(Array.from(months), 0, 0, (totalPushed) => {
          this.migrationComplete = true;
          this.markMigrationCompleteCallback(() => {
            resolve({ totalPushed });
          });
        });
      });
    });
  }

  private pushMonthsSequentially(
    months: string[],
    index: number,
    totalPushed: number,
    callback: (totalPushed: number) => void
  ): void {
    if (index >= months.length) {
      callback(totalPushed);
      return;
    }

    extensionApi.runtime.sendMessage({
      type: 'sync:push',
      payload: { month: months[index] },
    }).then((response: { success: boolean; data?: { pushed?: number } }) => {
      const pushed = response.success && response.data ? (response.data.pushed || 0) : 0;
      this.pushMonthsSequentially(months, index + 1, totalPushed + pushed, callback);
    }).catch(() => {
      this.pushMonthsSequentially(months, index + 1, totalPushed, callback);
    });
  }

  private markMigrationCompleteCallback(callback: () => void): void {
    extensionApi.storage.local.get([SETTINGS_STORAGE_KEY], (result: Record<string, unknown>) => {
      const stored = result[SETTINGS_STORAGE_KEY] as Partial<ExtendedUserSettings> | undefined;
      const settings = { ...DEFAULT_SETTINGS, ...stored } as ExtendedUserSettings;
      
      extensionApi.storage.local.set({
        [SETTINGS_STORAGE_KEY]: { ...settings, initialMigrationComplete: true },
      }, callback);
    });
  }

  isMigrationComplete(): boolean {
    return this.migrationComplete;
  }

  getSyncStatus(): Promise<SyncStatus> {
    return extensionApi.runtime.sendMessage({
      type: 'sync:status',
    }).then((response: { data: SyncStatus }) => response.data);
  }
}
