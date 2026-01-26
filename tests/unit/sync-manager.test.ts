import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { resetMockStorage, seedMockStorage } from '../../src/test/setup';
import type { BudgetLineData, UserSettings } from '../../src/storage/schema';

// Mock the webextension-polyfill to prevent browser extension check
vi.mock('webextension-polyfill', () => ({
  default: (globalThis as any).chrome,
}));

// Mock runtime.sendMessage for sync manager tests
const mockSendMessage = vi.fn();

describe('SyncManager', () => {
  beforeEach(() => {
    resetMockStorage();
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Setup runtime.sendMessage mock
    (globalThis as any).chrome.runtime.sendMessage = mockSendMessage;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('pullSync', () => {
    it('calls sync:pull message with current month', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        data: { pulled: 5, conflicts: 0 },
      });

      // Import after mocks are set up
      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager();

      const result = await syncManager.pullSync('2024-01');

      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'sync:pull',
        payload: { month: '2024-01' },
      });
      expect(result).toEqual({ pulled: 5, conflicts: 0 });
    });

    it('throws error when sync:pull fails', async () => {
      mockSendMessage.mockResolvedValue({
        success: false,
        error: 'API key is not configured',
      });

      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager();

      await expect(syncManager.pullSync('2024-01')).rejects.toThrow(
        'API key is not configured'
      );
    });

    it('handles network errors gracefully', async () => {
      mockSendMessage.mockRejectedValue(new Error('Network error'));

      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager();

      await expect(syncManager.pullSync('2024-01')).rejects.toThrow('Network error');
    });
  });

  describe('pushSync', () => {
    it('calls sync:push message with current month', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        data: { pushed: 3, created: 2, updated: 1 },
      });

      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager();

      const result = await syncManager.pushSync('2024-01');

      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'sync:push',
        payload: { month: '2024-01' },
      });
      expect(result).toEqual({ pushed: 3, created: 2, updated: 1 });
    });

    it('throws error when sync:push fails', async () => {
      mockSendMessage.mockResolvedValue({
        success: false,
        error: 'Unauthorized',
      });

      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager();

      await expect(syncManager.pushSync('2024-01')).rejects.toThrow('Unauthorized');
    });
  });

  describe('debounced push', () => {
    it('debounces multiple push calls within debounce window', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        data: { pushed: 1, created: 1, updated: 0 },
      });

      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager();

      // Trigger multiple debounced pushes rapidly
      syncManager.debouncedPush('2024-01');
      syncManager.debouncedPush('2024-01');
      syncManager.debouncedPush('2024-01');

      // Should not have called yet
      expect(mockSendMessage).not.toHaveBeenCalled();

      // Advance timers past debounce window (default 2000ms)
      await vi.advanceTimersByTimeAsync(2000);

      // Should only call once after debounce
      expect(mockSendMessage).toHaveBeenCalledTimes(1);
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'sync:push',
        payload: { month: '2024-01' },
      });
    });

    it('resets debounce timer on each call', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        data: { pushed: 1, created: 1, updated: 0 },
      });

      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager();

      // First call
      syncManager.debouncedPush('2024-01');

      // Advance 1500ms (less than 2000ms debounce)
      await vi.advanceTimersByTimeAsync(1500);
      expect(mockSendMessage).not.toHaveBeenCalled();

      // Second call resets timer
      syncManager.debouncedPush('2024-01');

      // Advance another 1500ms (total 3000ms from first, but only 1500ms from second)
      await vi.advanceTimersByTimeAsync(1500);
      expect(mockSendMessage).not.toHaveBeenCalled();

      // Advance remaining 500ms to complete debounce from second call
      await vi.advanceTimersByTimeAsync(500);
      expect(mockSendMessage).toHaveBeenCalledTimes(1);
    });

    it('handles different months separately', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        data: { pushed: 1, created: 1, updated: 0 },
      });

      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager();

      // Push for different months
      syncManager.debouncedPush('2024-01');
      syncManager.debouncedPush('2024-02');

      await vi.advanceTimersByTimeAsync(2000);

      // Should call for both months
      expect(mockSendMessage).toHaveBeenCalledTimes(2);
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'sync:push',
        payload: { month: '2024-01' },
      });
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'sync:push',
        payload: { month: '2024-02' },
      });
    });

    it('allows configurable debounce delay', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        data: { pushed: 1, created: 1, updated: 0 },
      });

      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager({ debounceMs: 500 });

      syncManager.debouncedPush('2024-01');

      // Should not fire at 400ms
      await vi.advanceTimersByTimeAsync(400);
      expect(mockSendMessage).not.toHaveBeenCalled();

      // Should fire at 500ms
      await vi.advanceTimersByTimeAsync(100);
      expect(mockSendMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('initial migration', () => {
    it('uploads all local data on first sync enable', async () => {
      const localData1: BudgetLineData = {
        notes: 'Groceries notes',
        items: [{ id: 'item-1', description: 'Food', amount: 100 }],
        lastModified: Date.now(),
      };
      const localData2: BudgetLineData = {
        notes: 'Utilities notes',
        items: [],
        lastModified: Date.now(),
      };

      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: true,
          apiKey: 'test-api-key',
        } as UserSettings,
        '2024-01:Groceries': localData1,
        '2024-01:Utilities': localData2,
        '2024-02:Groceries': localData1,
      });

      mockSendMessage.mockResolvedValue({
        success: true,
        data: { pushed: 3, created: 3, updated: 0 },
      });

      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager();

      const result = await syncManager.performInitialMigration();

      // Should push all months that have data
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'sync:push',
        payload: { month: '2024-01' },
      });
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'sync:push',
        payload: { month: '2024-02' },
      });
      expect(result.totalPushed).toBeGreaterThan(0);
    });

    it('marks migration as complete after successful upload', async () => {
      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: true,
          apiKey: 'test-api-key',
        } as UserSettings,
        '2024-01:Groceries': {
          notes: 'Test',
          items: [],
          lastModified: Date.now(),
        },
      });

      mockSendMessage.mockResolvedValue({
        success: true,
        data: { pushed: 1, created: 1, updated: 0 },
      });

      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager();

      await syncManager.performInitialMigration();

      // Verify migration flag is set
      expect(syncManager.isMigrationComplete()).toBe(true);
    });

    it('does not re-run migration if already complete', async () => {
      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: true,
          apiKey: 'test-api-key',
          initialMigrationComplete: true,
        } as UserSettings,
        '2024-01:Groceries': {
          notes: 'Test',
          items: [],
          lastModified: Date.now(),
        },
      });

      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager();

      // Should skip migration
      const result = await syncManager.performInitialMigration();

      expect(mockSendMessage).not.toHaveBeenCalled();
      expect(result.skipped).toBe(true);
    });

    it('handles empty local storage gracefully', async () => {
      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: true,
          apiKey: 'test-api-key',
        } as UserSettings,
      });

      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager();

      const result = await syncManager.performInitialMigration();

      expect(mockSendMessage).not.toHaveBeenCalled();
      expect(result.totalPushed).toBe(0);
      expect(syncManager.isMigrationComplete()).toBe(true);
    });
  });

  describe('disabled when no API key', () => {
    it('returns disabled status when API key is not set', async () => {
      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: true,
          apiKey: undefined,
        } as UserSettings,
      });

      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager();

      const isEnabled = await syncManager.isSyncEnabled();

      expect(isEnabled).toBe(false);
    });

    it('returns disabled status when API key is empty string', async () => {
      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: true,
          apiKey: '',
        } as UserSettings,
      });

      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager();

      const isEnabled = await syncManager.isSyncEnabled();

      expect(isEnabled).toBe(false);
    });

    it('returns disabled status when syncEnabled is false', async () => {
      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: false,
          apiKey: 'valid-api-key',
        } as UserSettings,
      });

      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager();

      const isEnabled = await syncManager.isSyncEnabled();

      expect(isEnabled).toBe(false);
    });

    it('returns enabled status when both syncEnabled and apiKey are set', async () => {
      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: true,
          apiKey: 'valid-api-key',
        } as UserSettings,
      });

      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager();

      const isEnabled = await syncManager.isSyncEnabled();

      expect(isEnabled).toBe(true);
    });

    it('skips debounced push when sync is disabled', async () => {
      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: false,
        } as UserSettings,
      });

      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager();

      syncManager.debouncedPush('2024-01');

      await vi.advanceTimersByTimeAsync(2000);

      // Should not call sendMessage when sync is disabled
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('throws error on pullSync when sync is disabled', async () => {
      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: false,
        } as UserSettings,
      });

      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager();

      await expect(syncManager.pullSync('2024-01')).rejects.toThrow(
        'Sync is not enabled'
      );
    });

    it('throws error on pushSync when sync is disabled', async () => {
      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: false,
        } as UserSettings,
      });

      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager();

      await expect(syncManager.pushSync('2024-01')).rejects.toThrow(
        'Sync is not enabled'
      );
    });
  });

  describe('getSyncStatus', () => {
    it('returns sync status from service worker', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        data: {
          enabled: true,
          lastSyncAt: 1704067200000,
          lastSyncError: undefined,
        },
      });

      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager();

      const status = await syncManager.getSyncStatus();

      expect(mockSendMessage).toHaveBeenCalledWith({ type: 'sync:status' });
      expect(status).toEqual({
        enabled: true,
        lastSyncAt: 1704067200000,
        lastSyncError: undefined,
      });
    });

    it('returns error status when present', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        data: {
          enabled: true,
          lastSyncAt: undefined,
          lastSyncError: 'Rate limit exceeded',
        },
      });

      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager();

      const status = await syncManager.getSyncStatus();

      expect(status.lastSyncError).toBe('Rate limit exceeded');
    });
  });

  describe('cancelPendingSync', () => {
    it('cancels pending debounced push', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        data: { pushed: 1, created: 1, updated: 0 },
      });

      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager();

      syncManager.debouncedPush('2024-01');

      // Cancel before debounce completes
      syncManager.cancelPendingSync('2024-01');

      await vi.advanceTimersByTimeAsync(2000);

      // Should not have called sendMessage
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('cancels all pending syncs when no month specified', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        data: { pushed: 1, created: 1, updated: 0 },
      });

      const { SyncManager } = await import('../../src/sync/sync-manager');
      const syncManager = new SyncManager();

      syncManager.debouncedPush('2024-01');
      syncManager.debouncedPush('2024-02');

      // Cancel all
      syncManager.cancelPendingSync();

      await vi.advanceTimersByTimeAsync(2000);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });
});
