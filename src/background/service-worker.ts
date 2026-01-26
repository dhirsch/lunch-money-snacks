import { extensionApi } from '../utils/extension-api';
import { getUserSettings, saveUserSettings, getMonthData } from '../storage/storage';
import {
  getTransactions,
  createTransactions,
  updateTransaction,
  type Transaction,
  type InsertTransaction,
} from '../api/lunch-money-client';
import type { BudgetLineData, UserSettings } from '../storage/schema';

extensionApi.action.onClicked.addListener(() => {
  extensionApi.runtime.openOptionsPage();
});

interface SyncMessage {
  type: 'sync:status' | 'sync:pull' | 'sync:push';
  payload?: { month?: string };
}

interface SyncStatusResponse {
  success: true;
  data: {
    enabled: boolean;
    lastSyncAt: number | undefined;
    lastSyncError: string | undefined;
  };
}

interface SyncPullResponse {
  success: true;
  data: { pulled: number; conflicts: number };
}

interface SyncPushResponse {
  success: true;
  data: { pushed: number; created: number; updated: number };
}

interface SyncErrorResponse {
  success: false;
  error: string;
}

type SyncResponse = SyncStatusResponse | SyncPullResponse | SyncPushResponse | SyncErrorResponse;

function getMonthDateRange(month: string): { start_date: string; end_date: string } {
  const [year, monthNum] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNum, 0).getDate();
  return {
    start_date: `${month}-01`,
    end_date: `${month}-${String(lastDay).padStart(2, '0')}`,
  };
}

function parseExternalId(externalId: string | null): { month: string; category: string } | null {
  if (!externalId?.startsWith('budget-notes:')) return null;
  const parts = externalId.slice('budget-notes:'.length).split(':');
  if (parts.length < 2) return null;
  let monthPart = parts[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(monthPart)) {
    monthPart = monthPart.slice(0, 7);
  }
  return { month: monthPart, category: parts.slice(1).join(':') };
}

function parseBudgetLineData(notes: string | null): BudgetLineData | null {
  if (!notes) return null;
  try {
    const data = JSON.parse(notes);
    if (typeof data.notes === 'string' && Array.isArray(data.items) && typeof data.lastModified === 'number') {
      return data as BudgetLineData;
    }
    return null;
  } catch {
    return null;
  }
}

function shouldUseRemote(
  local: BudgetLineData,
  remote: BudgetLineData,
  policy: UserSettings['conflictPolicy'],
): boolean {
  if (policy === 'local-wins') return false;
  if (policy === 'remote-wins') return true;
  return remote.lastModified >= local.lastModified;
}

function isEmptyBudgetData(data: BudgetLineData): boolean {
  return !data.notes && data.items.length === 0;
}

async function handleSyncStatus(): Promise<SyncStatusResponse> {
  const settings = await getUserSettings();
  return {
    success: true,
    data: {
      enabled: settings.syncEnabled ?? false,
      lastSyncAt: settings.lastSyncAt,
      lastSyncError: settings.lastSyncError,
    },
  };
}

async function handleSyncPull(month: string): Promise<SyncPullResponse | SyncErrorResponse> {
  const settings = await getUserSettings();

  if (!settings.syncEnabled) {
    return { success: false, error: 'Sync is not enabled' };
  }
  if (!settings.apiKey) {
    return { success: false, error: 'API key is not configured' };
  }

  try {
    const { start_date, end_date } = getMonthDateRange(month);
    const transactions = await getTransactions(settings.apiKey, {
      start_date,
      end_date,
      include_metadata: true,
    });

    const localData = await getMonthData(month);
    let pulled = 0;
    let conflicts = 0;

    const updates: Record<string, BudgetLineData> = {};

    for (const tx of transactions) {
      const parsed = parseExternalId(tx.external_id);
      if (!parsed || parsed.month !== month) continue;

      const remoteData = parseBudgetLineData(tx.notes);
      if (!remoteData) continue;

      const localEntry = localData.get(parsed.category);
      if (localEntry) {
        conflicts++;
        if (shouldUseRemote(localEntry, remoteData, settings.conflictPolicy)) {
          updates[`${month}:${parsed.category}`] = remoteData;
          pulled++;
        }
      } else {
        updates[`${month}:${parsed.category}`] = remoteData;
        pulled++;
      }
    }

    if (Object.keys(updates).length > 0) {
      await new Promise<void>((resolve, reject) => {
        extensionApi.storage.local.set(updates, () => {
          if (extensionApi.runtime?.lastError) {
            reject(new Error(extensionApi.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    }

    await saveUserSettings({ ...settings, lastSyncAt: Date.now(), lastSyncError: undefined });

    return { success: true, data: { pulled, conflicts } };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await saveUserSettings({ ...settings, lastSyncError: errorMessage });
    return { success: false, error: errorMessage };
  }
}

async function handleSyncPush(month: string): Promise<SyncPushResponse | SyncErrorResponse> {
  const settings = await getUserSettings();

  if (!settings.syncEnabled) {
    return { success: false, error: 'Sync is not enabled' };
  }
  if (!settings.apiKey) {
    return { success: false, error: 'API key is not configured' };
  }

  try {
    const { start_date, end_date } = getMonthDateRange(month);
    const remoteTransactions = await getTransactions(settings.apiKey, {
      start_date,
      end_date,
      include_metadata: true,
    });

    const remoteByExternalId = new Map<string, Transaction>();
    for (const tx of remoteTransactions) {
      if (tx.external_id?.startsWith('budget-notes:')) {
        remoteByExternalId.set(tx.external_id, tx);
      }
    }

    const localData = await getMonthData(month);
    let pushed = 0;
    let created = 0;
    let updated = 0;

    const toCreate: InsertTransaction[] = [];
    const toUpdate: Array<{ id: number; data: BudgetLineData }> = [];

    for (const [category, data] of localData) {
      if (isEmptyBudgetData(data)) continue;

      const externalId = `budget-notes:${month}:${category}`;
      const existingTx = remoteByExternalId.get(externalId);

      if (existingTx) {
        toUpdate.push({ id: existingTx.id, data });
      } else {
        toCreate.push({
          date: `${month}-15`,
          amount: 0,
          payee: 'Budget Notes Sync',
          notes: JSON.stringify(data),
          external_id: externalId,
          status: 'reviewed',
        });
      }
      pushed++;
    }

    if (toCreate.length > 0) {
      await createTransactions(settings.apiKey, toCreate);
      created = toCreate.length;
    }

    for (const { id, data } of toUpdate) {
      await updateTransaction(settings.apiKey, id, { notes: JSON.stringify(data) });
      updated++;
    }

    await saveUserSettings({ ...settings, lastSyncAt: Date.now(), lastSyncError: undefined });

    return { success: true, data: { pushed, created, updated } };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await saveUserSettings({ ...settings, lastSyncError: errorMessage });
    return { success: false, error: errorMessage };
  }
}

extensionApi.runtime.onMessage.addListener(
  (message: SyncMessage, _sender: unknown, sendResponse: (response: SyncResponse) => void) => {
    const handleMessage = async (): Promise<SyncResponse> => {
      switch (message.type) {
        case 'sync:status':
          return handleSyncStatus();
        case 'sync:pull':
          return handleSyncPull(message.payload?.month ?? getCurrentMonth());
        case 'sync:push':
          return handleSyncPush(message.payload?.month ?? getCurrentMonth());
        default:
          return { success: false, error: `Unknown message type: ${(message as SyncMessage).type}` };
      }
    };

    handleMessage().then(sendResponse);
    return true;
  },
);

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
