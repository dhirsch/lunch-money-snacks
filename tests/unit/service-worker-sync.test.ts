import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { resetMockStorage, seedMockStorage } from '../../src/test/setup';
import type { BudgetLineData, UserSettings } from '../../src/storage/schema';
import type { Transaction } from '../../src/api/lunch-money-client';

// Mock the webextension-polyfill to prevent browser extension check
vi.mock('webextension-polyfill', () => ({
  default: (globalThis as any).chrome,
}));

// Mock the API client
vi.mock('../../src/api/lunch-money-client', () => ({
  getTransactions: vi.fn(),
  createTransactions: vi.fn(),
  updateTransaction: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public readonly statusCode?: number,
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

// Import mocked functions for test assertions
import * as apiClient from '../../src/api/lunch-money-client';

// Helper to simulate sending a message to the service worker
async function sendMessage(message: { type: string; payload?: unknown }): Promise<unknown> {
  // Get the message listener that was registered
  const addListenerCalls = (globalThis as any).chrome.runtime.onMessage?.addListener?.mock?.calls;
  if (!addListenerCalls || addListenerCalls.length === 0) {
    throw new Error('No message listener registered');
  }
  const listener = addListenerCalls[addListenerCalls.length - 1][0];

  // Create a promise that resolves when sendResponse is called
  return new Promise((resolve) => {
    listener(message, {}, resolve);
  });
}

// Helper to create mock transaction from budget data
function createMockTransaction(
  id: number,
  date: string,
  categoryId: number,
  notes: string,
): Transaction {
  return {
    id,
    date,
    amount: '0.00',
    currency: 'usd',
    to_base: 0,
    recurring_id: null,
    payee: 'Budget Notes Sync',
    category_id: categoryId,
    external_id: `budget-notes:${date}:${categoryId}`,
    tag_ids: [],
    notes,
    status: 'reviewed',
    is_pending: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    split_parent_id: null,
    is_group_parent: false,
    group_parent_id: null,
    source: 'api',
  };
}

describe('Service Worker - Sync Message Handlers', () => {
  beforeEach(() => {
    resetMockStorage();
    vi.resetModules();
    vi.clearAllMocks();

    // Add onMessage mock to chrome.runtime
    (globalThis as any).chrome.runtime.onMessage = {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
    };
  });

  describe('sync:status handler', () => {
    it('returns sync status when sync is disabled', async () => {
      const settings: UserSettings = {
        budgetNotesEnabled: true,
        periodSummaryEnabled: true,
        syncEnabled: false,
      };
      seedMockStorage({ __settings__: settings });

      await import('../../src/background/service-worker');

      const response = await sendMessage({ type: 'sync:status' });

      expect(response).toEqual({
        success: true,
        data: {
          enabled: false,
          lastSyncAt: undefined,
          lastSyncError: undefined,
        },
      });
    });

    it('returns sync status when sync is enabled', async () => {
      const lastSyncAt = Date.now() - 3600000; // 1 hour ago
      const settings: UserSettings = {
        budgetNotesEnabled: true,
        periodSummaryEnabled: true,
        syncEnabled: true,
        apiKey: 'test-api-key',
        lastSyncAt,
      };
      seedMockStorage({ __settings__: settings });

      await import('../../src/background/service-worker');

      const response = await sendMessage({ type: 'sync:status' });

      expect(response).toEqual({
        success: true,
        data: {
          enabled: true,
          lastSyncAt,
          lastSyncError: undefined,
        },
      });
    });

    it('returns sync error if present', async () => {
      const settings: UserSettings = {
        budgetNotesEnabled: true,
        periodSummaryEnabled: true,
        syncEnabled: true,
        apiKey: 'test-api-key',
        lastSyncError: 'API rate limit exceeded',
      };
      seedMockStorage({ __settings__: settings });

      await import('../../src/background/service-worker');

      const response = await sendMessage({ type: 'sync:status' });

      expect(response).toEqual({
        success: true,
        data: {
          enabled: true,
          lastSyncAt: undefined,
          lastSyncError: 'API rate limit exceeded',
        },
      });
    });
  });

  describe('sync:pull handler', () => {
    const mockApiKey = 'test-api-key-12345';

    beforeEach(() => {
      const settings: UserSettings = {
        budgetNotesEnabled: true,
        periodSummaryEnabled: true,
        syncEnabled: true,
        apiKey: mockApiKey,
        conflictPolicy: 'last-write-wins',
      };
      seedMockStorage({ __settings__: settings });
    });

    it('returns error when sync is disabled', async () => {
      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: false,
        },
      });

      await import('../../src/background/service-worker');

      const response = await sendMessage({ type: 'sync:pull' });

      expect(response).toEqual({
        success: false,
        error: 'Sync is not enabled',
      });
    });

    it('returns error when API key is missing', async () => {
      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: true,
          apiKey: undefined,
        },
      });

      await import('../../src/background/service-worker');

      const response = await sendMessage({ type: 'sync:pull' });

      expect(response).toEqual({
        success: false,
        error: 'API key is not configured',
      });
    });

    it('fetches transactions and updates local storage', async () => {
      const remoteData: BudgetLineData = {
        notes: 'Remote notes',
        items: [{ id: 'item-1', description: 'Remote item', amount: 100 }],
        lastModified: Date.now(),
      };

      const mockTransaction = createMockTransaction(
        1,
        '2024-01-15',
        42,
        JSON.stringify(remoteData),
      );

      (apiClient.getTransactions as Mock).mockResolvedValue([mockTransaction]);

      await import('../../src/background/service-worker');

      const response = await sendMessage({
        type: 'sync:pull',
        payload: { month: '2024-01' },
      });

      expect(apiClient.getTransactions).toHaveBeenCalledWith(mockApiKey, {
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        include_metadata: true,
      });

      expect(response).toEqual({
        success: true,
        data: { pulled: 1, conflicts: 0 },
      });
    });

    it('handles conflict resolution with last-write-wins policy', async () => {
      const localData: BudgetLineData = {
        notes: 'Local notes',
        items: [],
        lastModified: Date.now() - 1000, // Older
      };

      const remoteData: BudgetLineData = {
        notes: 'Remote notes',
        items: [],
        lastModified: Date.now(), // Newer
      };

      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: true,
          apiKey: mockApiKey,
          conflictPolicy: 'last-write-wins',
        },
        '2024-01:Groceries': localData,
      });

      const mockTransaction = createMockTransaction(
        1,
        '2024-01-15',
        42,
        JSON.stringify(remoteData),
      );
      mockTransaction.external_id = 'budget-notes:2024-01:Groceries';

      (apiClient.getTransactions as Mock).mockResolvedValue([mockTransaction]);

      await import('../../src/background/service-worker');

      const response = await sendMessage({
        type: 'sync:pull',
        payload: { month: '2024-01' },
      });

      expect(response).toEqual({
        success: true,
        data: { pulled: 1, conflicts: 1 },
      });
    });

    it('handles conflict resolution with local-wins policy', async () => {
      const localData: BudgetLineData = {
        notes: 'Local notes',
        items: [],
        lastModified: Date.now() - 1000, // Older but local-wins
      };

      const remoteData: BudgetLineData = {
        notes: 'Remote notes',
        items: [],
        lastModified: Date.now(), // Newer
      };

      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: true,
          apiKey: mockApiKey,
          conflictPolicy: 'local-wins',
        },
        '2024-01:Groceries': localData,
      });

      const mockTransaction = createMockTransaction(
        1,
        '2024-01-15',
        42,
        JSON.stringify(remoteData),
      );
      mockTransaction.external_id = 'budget-notes:2024-01:Groceries';

      (apiClient.getTransactions as Mock).mockResolvedValue([mockTransaction]);

      await import('../../src/background/service-worker');

      const response = await sendMessage({
        type: 'sync:pull',
        payload: { month: '2024-01' },
      });

      // Local wins, so remote data is ignored
      expect(response).toEqual({
        success: true,
        data: { pulled: 0, conflicts: 1 },
      });
    });

    it('handles conflict resolution with remote-wins policy', async () => {
      const localData: BudgetLineData = {
        notes: 'Local notes',
        items: [],
        lastModified: Date.now(), // Newer but remote-wins
      };

      const remoteData: BudgetLineData = {
        notes: 'Remote notes',
        items: [],
        lastModified: Date.now() - 1000, // Older
      };

      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: true,
          apiKey: mockApiKey,
          conflictPolicy: 'remote-wins',
        },
        '2024-01:Groceries': localData,
      });

      const mockTransaction = createMockTransaction(
        1,
        '2024-01-15',
        42,
        JSON.stringify(remoteData),
      );
      mockTransaction.external_id = 'budget-notes:2024-01:Groceries';

      (apiClient.getTransactions as Mock).mockResolvedValue([mockTransaction]);

      await import('../../src/background/service-worker');

      const response = await sendMessage({
        type: 'sync:pull',
        payload: { month: '2024-01' },
      });

      // Remote wins regardless of timestamp
      expect(response).toEqual({
        success: true,
        data: { pulled: 1, conflicts: 1 },
      });
    });

    it('handles API errors gracefully', async () => {
      (apiClient.getTransactions as Mock).mockRejectedValue(
        new apiClient.ApiError('Rate limit exceeded', 429),
      );

      await import('../../src/background/service-worker');

      const response = await sendMessage({
        type: 'sync:pull',
        payload: { month: '2024-01' },
      });

      expect(response).toEqual({
        success: false,
        error: 'Rate limit exceeded',
      });
    });

    it('handles network errors gracefully', async () => {
      (apiClient.getTransactions as Mock).mockRejectedValue(new Error('Network error'));

      await import('../../src/background/service-worker');

      const response = await sendMessage({
        type: 'sync:pull',
        payload: { month: '2024-01' },
      });

      expect(response).toEqual({
        success: false,
        error: 'Network error',
      });
    });

    it('skips transactions with invalid JSON in notes', async () => {
      const mockTransaction = createMockTransaction(1, '2024-01-15', 42, 'not valid json');

      (apiClient.getTransactions as Mock).mockResolvedValue([mockTransaction]);

      await import('../../src/background/service-worker');

      const response = await sendMessage({
        type: 'sync:pull',
        payload: { month: '2024-01' },
      });

      expect(response).toEqual({
        success: true,
        data: { pulled: 0, conflicts: 0 },
      });
    });

    it('updates lastSyncAt on successful pull', async () => {
      (apiClient.getTransactions as Mock).mockResolvedValue([]);

      await import('../../src/background/service-worker');

      const beforeSync = Date.now();
      await sendMessage({
        type: 'sync:pull',
        payload: { month: '2024-01' },
      });

      // Verify lastSyncAt was updated
      const statusResponse = (await sendMessage({ type: 'sync:status' })) as {
        success: boolean;
        data: { lastSyncAt: number };
      };
      expect(statusResponse.data.lastSyncAt).toBeGreaterThanOrEqual(beforeSync);
    });
  });

  describe('sync:push handler', () => {
    const mockApiKey = 'test-api-key-12345';

    beforeEach(() => {
      const settings: UserSettings = {
        budgetNotesEnabled: true,
        periodSummaryEnabled: true,
        syncEnabled: true,
        apiKey: mockApiKey,
      };
      seedMockStorage({ __settings__: settings });
    });

    it('returns error when sync is disabled', async () => {
      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: false,
        },
      });

      await import('../../src/background/service-worker');

      const response = await sendMessage({ type: 'sync:push' });

      expect(response).toEqual({
        success: false,
        error: 'Sync is not enabled',
      });
    });

    it('returns error when API key is missing', async () => {
      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: true,
          apiKey: undefined,
        },
      });

      await import('../../src/background/service-worker');

      const response = await sendMessage({ type: 'sync:push' });

      expect(response).toEqual({
        success: false,
        error: 'API key is not configured',
      });
    });

    it('serializes and creates new transactions for local data', async () => {
      const localData: BudgetLineData = {
        notes: 'Test notes',
        items: [{ id: 'item-1', description: 'Test item', amount: 50 }],
        lastModified: Date.now(),
      };

      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: true,
          apiKey: mockApiKey,
        },
        '2024-01:Groceries': localData,
      });

      // No existing remote transactions
      (apiClient.getTransactions as Mock).mockResolvedValue([]);
      (apiClient.createTransactions as Mock).mockResolvedValue({
        transactions: [createMockTransaction(1, '2024-01-15', 42, JSON.stringify(localData))],
        skipped_duplicates: [],
      });

      await import('../../src/background/service-worker');

      const response = await sendMessage({
        type: 'sync:push',
        payload: { month: '2024-01' },
      });

      expect(apiClient.createTransactions).toHaveBeenCalledWith(mockApiKey, [
        expect.objectContaining({
          date: expect.stringMatching(/^2024-01-/),
          amount: 0,
          payee: 'Budget Notes Sync',
          notes: JSON.stringify(localData),
          external_id: 'budget-notes:2024-01:Groceries',
        }),
      ]);

      expect(response).toEqual({
        success: true,
        data: { pushed: 1, created: 1, updated: 0 },
      });
    });

    it('updates existing transactions when external_id matches', async () => {
      const localData: BudgetLineData = {
        notes: 'Updated notes',
        items: [],
        lastModified: Date.now(),
      };

      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: true,
          apiKey: mockApiKey,
        },
        '2024-01:Groceries': localData,
      });

      // Existing remote transaction
      const existingTransaction = createMockTransaction(
        123,
        '2024-01-15',
        42,
        JSON.stringify({ notes: 'Old notes', items: [], lastModified: Date.now() - 1000 }),
      );
      existingTransaction.external_id = 'budget-notes:2024-01:Groceries';

      (apiClient.getTransactions as Mock).mockResolvedValue([existingTransaction]);
      (apiClient.updateTransaction as Mock).mockResolvedValue({
        ...existingTransaction,
        notes: JSON.stringify(localData),
      });

      await import('../../src/background/service-worker');

      const response = await sendMessage({
        type: 'sync:push',
        payload: { month: '2024-01' },
      });

      expect(apiClient.updateTransaction).toHaveBeenCalledWith(mockApiKey, 123, {
        notes: JSON.stringify(localData),
      });

      expect(response).toEqual({
        success: true,
        data: { pushed: 1, created: 0, updated: 1 },
      });
    });

    it('handles multiple categories in a single push', async () => {
      const groceriesData: BudgetLineData = {
        notes: 'Groceries notes',
        items: [],
        lastModified: Date.now(),
      };

      const utilitiesData: BudgetLineData = {
        notes: 'Utilities notes',
        items: [],
        lastModified: Date.now(),
      };

      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: true,
          apiKey: mockApiKey,
        },
        '2024-01:Groceries': groceriesData,
        '2024-01:Utilities': utilitiesData,
      });

      (apiClient.getTransactions as Mock).mockResolvedValue([]);
      (apiClient.createTransactions as Mock).mockResolvedValue({
        transactions: [
          createMockTransaction(1, '2024-01-15', 42, JSON.stringify(groceriesData)),
          createMockTransaction(2, '2024-01-15', 43, JSON.stringify(utilitiesData)),
        ],
        skipped_duplicates: [],
      });

      await import('../../src/background/service-worker');

      const response = await sendMessage({
        type: 'sync:push',
        payload: { month: '2024-01' },
      });

      expect(response).toEqual({
        success: true,
        data: { pushed: 2, created: 2, updated: 0 },
      });
    });

    it('handles API errors gracefully', async () => {
      const localData: BudgetLineData = {
        notes: 'Test notes',
        items: [],
        lastModified: Date.now(),
      };

      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: true,
          apiKey: mockApiKey,
        },
        '2024-01:Groceries': localData,
      });

      (apiClient.getTransactions as Mock).mockResolvedValue([]);
      (apiClient.createTransactions as Mock).mockRejectedValue(
        new apiClient.ApiError('Unauthorized', 401),
      );

      await import('../../src/background/service-worker');

      const response = await sendMessage({
        type: 'sync:push',
        payload: { month: '2024-01' },
      });

      expect(response).toEqual({
        success: false,
        error: 'Unauthorized',
      });
    });

    it('handles network errors gracefully', async () => {
      const localData: BudgetLineData = {
        notes: 'Test notes',
        items: [],
        lastModified: Date.now(),
      };

      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: true,
          apiKey: mockApiKey,
        },
        '2024-01:Groceries': localData,
      });

      (apiClient.getTransactions as Mock).mockRejectedValue(new Error('Network error'));

      await import('../../src/background/service-worker');

      const response = await sendMessage({
        type: 'sync:push',
        payload: { month: '2024-01' },
      });

      expect(response).toEqual({
        success: false,
        error: 'Network error',
      });
    });

    it('skips empty budget data (no notes, no items)', async () => {
      const emptyData: BudgetLineData = {
        notes: '',
        items: [],
        lastModified: Date.now(),
      };

      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: true,
          apiKey: mockApiKey,
        },
        '2024-01:Groceries': emptyData,
      });

      (apiClient.getTransactions as Mock).mockResolvedValue([]);

      await import('../../src/background/service-worker');

      const response = await sendMessage({
        type: 'sync:push',
        payload: { month: '2024-01' },
      });

      expect(apiClient.createTransactions).not.toHaveBeenCalled();
      expect(response).toEqual({
        success: true,
        data: { pushed: 0, created: 0, updated: 0 },
      });
    });

    it('updates lastSyncAt on successful push', async () => {
      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: true,
          apiKey: mockApiKey,
        },
      });

      (apiClient.getTransactions as Mock).mockResolvedValue([]);

      await import('../../src/background/service-worker');

      const beforeSync = Date.now();
      await sendMessage({
        type: 'sync:push',
        payload: { month: '2024-01' },
      });

      // Verify lastSyncAt was updated
      const statusResponse = (await sendMessage({ type: 'sync:status' })) as {
        success: boolean;
        data: { lastSyncAt: number };
      };
      expect(statusResponse.data.lastSyncAt).toBeGreaterThanOrEqual(beforeSync);
    });
  });

  describe('error handling', () => {
    it('stores lastSyncError on pull failure', async () => {
      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: true,
          apiKey: 'test-key',
        },
      });

      (apiClient.getTransactions as Mock).mockRejectedValue(
        new apiClient.ApiError('Server error', 500),
      );

      await import('../../src/background/service-worker');

      await sendMessage({
        type: 'sync:pull',
        payload: { month: '2024-01' },
      });

      const statusResponse = (await sendMessage({ type: 'sync:status' })) as {
        success: boolean;
        data: { lastSyncError: string };
      };
      expect(statusResponse.data.lastSyncError).toBe('Server error');
    });

    it('stores lastSyncError on push failure', async () => {
      const localData: BudgetLineData = {
        notes: 'Test',
        items: [],
        lastModified: Date.now(),
      };

      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: true,
          apiKey: 'test-key',
        },
        '2024-01:Groceries': localData,
      });

      (apiClient.getTransactions as Mock).mockResolvedValue([]);
      (apiClient.createTransactions as Mock).mockRejectedValue(
        new apiClient.ApiError('Forbidden', 403),
      );

      await import('../../src/background/service-worker');

      await sendMessage({
        type: 'sync:push',
        payload: { month: '2024-01' },
      });

      const statusResponse = (await sendMessage({ type: 'sync:status' })) as {
        success: boolean;
        data: { lastSyncError: string };
      };
      expect(statusResponse.data.lastSyncError).toBe('Forbidden');
    });

    it('clears lastSyncError on successful sync', async () => {
      seedMockStorage({
        __settings__: {
          budgetNotesEnabled: true,
          periodSummaryEnabled: true,
          syncEnabled: true,
          apiKey: 'test-key',
          lastSyncError: 'Previous error',
        },
      });

      (apiClient.getTransactions as Mock).mockResolvedValue([]);

      await import('../../src/background/service-worker');

      await sendMessage({
        type: 'sync:pull',
        payload: { month: '2024-01' },
      });

      const statusResponse = (await sendMessage({ type: 'sync:status' })) as {
        success: boolean;
        data: { lastSyncError: string | undefined };
      };
      expect(statusResponse.data.lastSyncError).toBeUndefined();
    });
  });
});
