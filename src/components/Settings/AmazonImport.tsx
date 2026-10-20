import { useMemo, useState } from 'react';
import { extensionApi } from '../../utils/extension-api';

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
  isSupplement: boolean;
  orderId: string;
  matchType: 'exact' | 'split' | 'ai';
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

interface AmazonImportProps {
  disabled?: boolean;
  onMessage: (message: { type: 'success' | 'error'; text: string }) => void;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatAmount(amount: string): string {
  const value = Number(amount);
  if (Number.isNaN(value)) return amount;
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

export function AmazonImport({ disabled, onMessage }: AmazonImportProps) {
  const [month, setMonth] = useState(getCurrentMonth());
  const [csvText, setCsvText] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [previews, setPreviews] = useState<AmazonPreviewItem[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [skippedItems, setSkippedItems] = useState<AmazonSkippedItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [categoryIds, setCategoryIds] = useState<Set<number>>(new Set());

  const selectedPreviews = useMemo(
    () => previews.filter((preview) => selectedIds.has(preview.transactionId)),
    [previews, selectedIds],
  );

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    setCsvText(await file.text());
    setPreviews([]);
    setSkipped(0);
    setSkippedItems([]);
    setSelectedIds(new Set());
    setCategoryIds(new Set());
  };

  const handlePreview = async () => {
    if (!csvText) {
      onMessage({ type: 'error', text: 'Choose an Amazon CSV file first.' });
      return;
    }

    setIsPreviewing(true);
    try {
      const response = await extensionApi.runtime.sendMessage({
        type: 'amazon:preview',
        payload: { month, csvText },
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      const nextPreviews = response.data.previews as AmazonPreviewItem[];
      setPreviews(nextPreviews);
      setSkipped(response.data.skipped);
      setSkippedItems((response.data.skippedItems ?? []) as AmazonSkippedItem[]);
      // AI-guessed split matches are opt-in; everything else starts selected.
      setSelectedIds(
        new Set(
          nextPreviews
            .filter((preview) => preview.matchType !== 'ai')
            .map((preview) => preview.transactionId),
        ),
      );
      setCategoryIds(
        new Set(
          nextPreviews
            .filter((preview) => preview.suggestedCategoryId !== null)
            .map((preview) => preview.transactionId),
        ),
      );
      onMessage({
        type: 'success',
        text: `Previewed ${nextPreviews.length} Amazon transaction updates. Skipped ${response.data.skipped}.`,
      });
    } catch (error) {
      onMessage({ type: 'error', text: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleApply = async () => {
    if (selectedPreviews.length === 0) {
      onMessage({ type: 'error', text: 'Select at least one previewed transaction to apply.' });
      return;
    }

    setIsApplying(true);
    try {
      const response = await extensionApi.runtime.sendMessage({
        type: 'amazon:apply',
        payload: {
          updates: selectedPreviews.map((preview) => ({
            transactionId: preview.transactionId,
            currentNotes: preview.currentNotes,
            itemsText: preview.itemsText,
            categoryId: categoryIds.has(preview.transactionId)
              ? preview.suggestedCategoryId
              : null,
            addSupplementTag: preview.isSupplement,
          })),
        },
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      onMessage({ type: 'success', text: `Updated ${response.data.updated} Amazon transactions.` });
      setPreviews([]);
      setSelectedIds(new Set());
      setCategoryIds(new Set());
      setSkippedItems([]);
    } catch (error) {
      onMessage({ type: 'error', text: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsApplying(false);
    }
  };

  const toggleSet = (set: Set<number>, id: number): Set<number> => {
    const next = new Set(set);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  };

  const handleExportDebug = () => {
    const debug = {
      month,
      generatedAt: new Date().toISOString(),
      matched: previews,
      skipped: skippedItems,
    };
    const blob = new Blob([JSON.stringify(debug, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amazon-transaction-debug-${month}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="amazon-import">
      <div className="settings-form">
        <div className="form-group">
          <label htmlFor="amazonMonth">Month</label>
          <input
            id="amazonMonth"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="settings-input"
            disabled={disabled || isPreviewing || isApplying}
          />
        </div>

        <div className="form-group">
          <label htmlFor="amazonCsv">Amazon CSV</label>
          <input
            id="amazonCsv"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => handleFileChange(event.target.files?.[0])}
            className="settings-input"
            disabled={disabled || isPreviewing || isApplying}
          />
        </div>
      </div>

      <div className="settings-actions">
        <button
          type="button"
          className="settings-btn"
          onClick={handlePreview}
          disabled={disabled || isPreviewing || isApplying}
        >
          {isPreviewing ? 'Previewing...' : 'Preview Updates'}
        </button>
        <button
          type="button"
          className="settings-btn settings-btn--primary"
          onClick={handleApply}
          disabled={disabled || isPreviewing || isApplying || selectedPreviews.length === 0}
        >
          {isApplying ? 'Applying...' : 'Apply Selected'}
        </button>
        <button
          type="button"
          className="settings-btn"
          onClick={handleExportDebug}
          disabled={isPreviewing || isApplying || (previews.length === 0 && skippedItems.length === 0)}
        >
          Export Debug JSON
        </button>
      </div>

      {(previews.length > 0 || skipped > 0) && (
        <div className="amazon-preview">
          {skipped > 0 && (
            <details className="amazon-debug">
              <summary>Skipped {skipped} unmatched or ambiguous transactions</summary>
              <div className="amazon-debug__list">
                {skippedItems.map((item, index) => (
                  <div key={`${item.orderId}:${item.chargedAmount}:${index}`} className="amazon-debug__row">
                    <div className="amazon-debug__title">
                      {item.date} · {item.orderId} · {formatAmount(String(item.chargedAmount))}
                    </div>
                    <div className="amazon-debug__reason">{item.reason}</div>
                    <div className="amazon-debug__items">
                      {item.itemTitles.length > 0 ? item.itemTitles.join('; ') : 'No item titles'}
                    </div>
                    {item.matchingTransactions.length > 0 && (
                      <div className="amazon-debug__matches">
                        Matches: {item.matchingTransactions.map((tx) => `${tx.id} ${tx.payee} ${formatAmount(tx.amount)}`).join('; ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
          {previews.map((preview) => (
            <div key={preview.transactionId} className="amazon-preview__row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedIds.has(preview.transactionId)}
                  onChange={() => setSelectedIds((current) => toggleSet(current, preview.transactionId))}
                  disabled={isApplying}
                />
                <span>
                  {preview.date} · {preview.payee} · {formatAmount(preview.amount)}
                </span>
              </label>
              {preview.matchType !== 'exact' && (
                <div className="amazon-preview__memo">
                  {preview.matchType === 'ai' ? 'AI-guessed split charge' : 'Split charge'} of order{' '}
                  {preview.orderId}
                </div>
              )}
              <div className="amazon-preview__memo">Items: {preview.itemsText}</div>
              {preview.isSupplement && (
                <div className="amazon-preview__memo">Tag: Supplements</div>
              )}
              {preview.suggestedCategoryName && (
                <label className="checkbox-label amazon-preview__category">
                  <input
                    type="checkbox"
                    checked={categoryIds.has(preview.transactionId)}
                    onChange={() => setCategoryIds((current) => toggleSet(current, preview.transactionId))}
                    disabled={isApplying || !selectedIds.has(preview.transactionId)}
                  />
                  <span>Change category to {preview.suggestedCategoryName}</span>
                </label>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
