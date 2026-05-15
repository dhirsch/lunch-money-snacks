import { extensionApi } from '../utils/extension-api';
import { getUserSettings, saveUserSettings, getMonthData } from '../storage/storage';
import {
  getCategories,
  getTransactions,
  createTransactions,
  updateTransaction,
  type Transaction,
  type InsertTransaction,
} from '../api/lunch-money-client';
import { summarizeAmazonItems } from '../api/openrouter-client';
import {
  buildAmazonCharges,
  matchAmazonChargeItems,
  parseAmazonCsv,
  type AmazonItem,
} from '../amazon/amazon-csv';
import type { BudgetLineData, UserSettings } from '../storage/schema';

const AMAZON_DATE_MATCH_WINDOW_DAYS = 5;

extensionApi.action.onClicked.addListener(() => {
  extensionApi.runtime.openOptionsPage();
});

interface SyncMessage {
  type: 'sync:status' | 'sync:pull' | 'sync:push' | 'amazon:preview' | 'amazon:apply';
  payload?: {
    month?: string;
    csvText?: string;
    updates?: AmazonApplyUpdate[];
  };
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

interface AmazonPreviewItem {
  transactionId: number;
  date: string;
  amount: string;
  payee: string;
  currentNotes: string | null;
  itemsText: string;
  itemTitles: string[];
  suggestedCategoryId: number | null;
  suggestedCategoryName: string | null;
}

interface AmazonSkippedItem {
  date: string;
  orderId: string;
  chargedAmount: number;
  reason: string;
  itemTitles: string[];
  matchingTransactions: Array<{
    id: number;
    date: string;
    amount: string;
    payee: string;
    notes: string | null;
  }>;
}

interface AmazonPreviewResponse {
  success: true;
  data: {
    previews: AmazonPreviewItem[];
    skipped: number;
    skippedItems: AmazonSkippedItem[];
  };
}

interface AmazonApplyUpdate {
  transactionId: number;
  currentNotes: string | null;
  itemsText: string;
  categoryId?: number | null;
}

interface AmazonApplyResponse {
  success: true;
  data: { updated: number };
}

type SyncResponse =
  | SyncStatusResponse
  | SyncPullResponse
  | SyncPushResponse
  | AmazonPreviewResponse
  | AmazonApplyResponse
  | SyncErrorResponse;

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

function isAmazonTransaction(tx: Transaction): boolean {
  return /amazon/i.test(tx.payee);
}

function transactionAmountCents(tx: Transaction): number {
  return Math.round(Math.abs(Number(tx.amount)) * 100);
}

function parseDateOnly(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function daysBetween(dateA: string, dateB: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(
    Math.abs(parseDateOnly(dateA).getTime() - parseDateOnly(dateB).getTime()) / msPerDay,
  );
}

export function findAmazonCandidateTransactions(
  chargeDate: string,
  chargedAmount: number,
  transactions: Transaction[],
): Transaction[] {
  const chargeAmountCents = Math.round(Math.abs(chargedAmount) * 100);
  return transactions.filter(
    (tx) =>
      transactionAmountCents(tx) === chargeAmountCents &&
      daysBetween(tx.date, chargeDate) <= AMAZON_DATE_MATCH_WINDOW_DAYS,
  );
}

function appendItemsNote(currentNotes: string | null, itemsText: string): string {
  const itemNote = `Items: ${itemsText}`;
  const trimmed = currentNotes?.trim();
  if (!trimmed) return itemNote;
  if (trimmed.includes(itemNote)) return trimmed;
  return `${trimmed}\n${itemNote}`;
}

function toSkippedItem(
  charge: { date: string; orderId: string; chargedAmount: number; items: AmazonItem[] },
  reason: string,
  matchingTransactions: Transaction[] = [],
): AmazonSkippedItem {
  return {
    date: charge.date,
    orderId: charge.orderId,
    chargedAmount: charge.chargedAmount,
    reason,
    itemTitles: charge.items.map((item) => item.title),
    matchingTransactions: matchingTransactions.map((tx) => ({
      id: tx.id,
      date: tx.date,
      amount: tx.amount,
      payee: tx.payee,
      notes: tx.notes,
    })),
  };
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

async function handleAmazonPreview(
  month: string,
  csvText: string | undefined,
): Promise<AmazonPreviewResponse | SyncErrorResponse> {
  const settings = await getUserSettings();

  if (!settings.apiKey) {
    return { success: false, error: 'Lunch Money API key is not configured' };
  }
  if (!settings.openRouterApiKey) {
    return { success: false, error: 'OpenRouter API key is not configured' };
  }
  if (!csvText) {
    return { success: false, error: 'Amazon CSV file is required' };
  }

  try {
    const rows = parseAmazonCsv(csvText);
    const charges = buildAmazonCharges(rows).filter((charge) => charge.date.startsWith(month));
    const { start_date, end_date } = getMonthDateRange(month);
    const [transactions, categories] = await Promise.all([
      getTransactions(settings.apiKey, {
        start_date,
        end_date,
        include_metadata: true,
      }),
      getCategories(settings.apiKey),
    ]);

    const amazonTransactions = transactions.filter(isAmazonTransaction);
    const previews: AmazonPreviewItem[] = [];
    const skippedItems: AmazonSkippedItem[] = [];

    for (const charge of charges) {
      const matchingTransactions = findAmazonCandidateTransactions(
        charge.date,
        charge.chargedAmount,
        amazonTransactions,
      );
      if (matchingTransactions.length !== 1) {
        skippedItems.push(
          toSkippedItem(
            charge,
            matchingTransactions.length === 0
              ? `No Lunch Money Amazon transaction matched this amount within ${AMAZON_DATE_MATCH_WINDOW_DAYS} days.`
              : `Multiple Lunch Money Amazon transactions matched this amount within ${AMAZON_DATE_MATCH_WINDOW_DAYS} days.`,
            matchingTransactions,
          ),
        );
        continue;
      }

      const itemMatch = matchAmazonChargeItems(rows, charge);
      if (!itemMatch) {
        skippedItems.push(
          toSkippedItem(
            charge,
            'Could not map this charge amount to a unique set of items from the order.',
            matchingTransactions,
          ),
        );
        continue;
      }

      const tx = matchingTransactions[0];
      let suggestion;
      try {
        suggestion = await summarizeAmazonItems(
          settings.openRouterApiKey,
          settings.openRouterModel || 'anthropic/claude-haiku-4.5',
          itemMatch.matchedItems as AmazonItem[],
          categories,
        );
      } catch (error) {
        skippedItems.push(
          toSkippedItem(
            { ...charge, items: itemMatch.matchedItems },
            `OpenRouter summarization failed: ${error instanceof Error ? error.message : String(error)}`,
            matchingTransactions,
          ),
        );
        continue;
      }

      previews.push({
        transactionId: tx.id,
        date: tx.date,
        amount: tx.amount,
        payee: tx.payee,
        currentNotes: tx.notes,
        itemsText: suggestion.itemsText,
        itemTitles: itemMatch.matchedItems.map((item) => item.title),
        suggestedCategoryId: suggestion.categoryId,
        suggestedCategoryName: suggestion.categoryName,
      });
    }

    return { success: true, data: { previews, skipped: skippedItems.length, skippedItems } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function handleAmazonApply(
  updates: AmazonApplyUpdate[] | undefined,
): Promise<AmazonApplyResponse | SyncErrorResponse> {
  const settings = await getUserSettings();

  if (!settings.apiKey) {
    return { success: false, error: 'Lunch Money API key is not configured' };
  }
  if (!updates || updates.length === 0) {
    return { success: false, error: 'No Amazon transaction updates selected' };
  }

  try {
    let updated = 0;
    for (const item of updates) {
      await updateTransaction(settings.apiKey, item.transactionId, {
        notes: appendItemsNote(item.currentNotes, item.itemsText),
        category_id: item.categoryId ?? undefined,
      });
      updated++;
    }

    return { success: true, data: { updated } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
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
        case 'amazon:preview':
          return handleAmazonPreview(message.payload?.month ?? getCurrentMonth(), message.payload?.csvText);
        case 'amazon:apply':
          return handleAmazonApply(message.payload?.updates);
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
