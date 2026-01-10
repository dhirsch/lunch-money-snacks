import { useState, useEffect, useCallback } from 'react';
import { CategoryManager } from '../components/Settings/CategoryManager';
import { getAllCategories, getStorageStats, exportAllData, importData } from '../storage/storage';
import type { CategoryInfo, StorageStats, StorageKey, BudgetLineData } from '../storage/schema';

export function SettingsApp() {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [categoriesData, statsData] = await Promise.all([getAllCategories(), getStorageStats()]);
      setCategories(categoriesData);
      setStats(statsData);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = useCallback(async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lunch-money-budget-notes-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Data exported successfully' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to export data' });
    }
  }, []);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.data || typeof data.data !== 'object') {
          throw new Error('Invalid backup format');
        }

        const merge = window.confirm(
          'Merge with existing data? Click OK to merge, Cancel to replace all data.'
        );
        await importData(data.data as Record<StorageKey, BudgetLineData>, merge);
        await loadData();
        setMessage({ type: 'success', text: 'Data imported successfully' });
      } catch {
        setMessage({ type: 'error', text: 'Failed to import data. Make sure the file is a valid backup.' });
      }
    };
    input.click();
  }, [loadData]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="settings-app">
      <header className="settings-header">
        <h1>Lunch Money Budget Enhancer</h1>
        <p className="settings-subtitle">Manage your budget notes and categories</p>
      </header>

      {message && (
        <div className={`settings-message settings-message--${message.type}`}>
          {message.text}
          <button type="button" onClick={() => setMessage(null)}>
            &times;
          </button>
        </div>
      )}

      {/* Storage Stats */}
      <section className="settings-section">
        <h2>Storage Usage</h2>
        {stats && (
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{formatBytes(stats.bytesUsed)}</span>
              <span className="stat-label">Used</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.categories}</span>
              <span className="stat-label">Categories</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.months}</span>
              <span className="stat-label">Months</span>
            </div>
          </div>
        )}
      </section>

      {/* Import/Export */}
      <section className="settings-section">
        <h2>Backup & Restore</h2>
        <div className="settings-actions">
          <button type="button" className="settings-btn" onClick={handleExport}>
            Export Data
          </button>
          <button type="button" className="settings-btn" onClick={handleImport}>
            Import Data
          </button>
        </div>
      </section>

      {/* Category Management */}
      <section className="settings-section">
        <h2>Category Management</h2>
        <p className="settings-help">
          If you renamed a category in Lunch Money, use this section to merge your notes from the
          old category name to the new one.
        </p>
        {isLoading ? (
          <div className="settings-loading">Loading categories...</div>
        ) : (
          <CategoryManager categories={categories} onRefresh={loadData} />
        )}
      </section>
    </div>
  );
}
