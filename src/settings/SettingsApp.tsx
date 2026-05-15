import { useState, useEffect, useCallback } from 'react';
import { CategoryManager } from '../components/Settings/CategoryManager';
import { FeatureSettings } from '../components/Settings/FeatureSettings';
import { AmazonImport } from '../components/Settings/AmazonImport';
import { useSettings } from '../hooks/useSettings';
import { getAllCategories, getStorageStats, exportAllData, importData } from '../storage/storage';
import type { CategoryInfo, StorageStats, StorageKey, BudgetLineData, UserSettings } from '../storage/schema';

export function SettingsApp() {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { settings, updateSettings, isLoading: settingsLoading } = useSettings();

  const handleFeatureToggle = useCallback(
    (key: keyof UserSettings) => {
      updateSettings({ [key]: !settings[key] });
    },
    [settings, updateSettings]
  );

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

      {/* Feature Toggles */}
      <section className="settings-section">
        <h2>Features</h2>
        {settingsLoading ? (
          <div className="settings-loading">Loading settings...</div>
        ) : (
          <FeatureSettings
            settings={settings}
            onToggle={handleFeatureToggle}
          />
        )}
      </section>

      {/* Cloud Sync */}
      <section className="settings-section">
        <h2>Cloud Sync</h2>
        <p className="settings-help">
          Sync your budget notes across browsers using the Lunch Money API.
        </p>
        {settingsLoading ? (
          <div className="settings-loading">Loading settings...</div>
        ) : (
          <div className="settings-form">
            <div className="form-group">
              <label htmlFor="apiKey">
                API Key
                <span className="label-help">(Get from Lunch Money Settings → Developers)</span>
              </label>
              <input
                id="apiKey"
                type="password"
                value={settings.apiKey || ''}
                onChange={(e) => {
                  updateSettings({
                    apiKey: e.target.value,
                    lastSyncAt: undefined,
                    lastSyncError: undefined,
                  });
                }}
                placeholder="Enter your Lunch Money API key"
                className="settings-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="conflictPolicy">Conflict Resolution</label>
              <select
                id="conflictPolicy"
                value={settings.conflictPolicy || 'last-write-wins'}
                onChange={(e) => updateSettings({ conflictPolicy: e.target.value as 'last-write-wins' | 'local-wins' | 'remote-wins' })}
                className="settings-select"
              >
                <option value="last-write-wins">Last Write Wins (Recommended)</option>
                <option value="local-wins">Always Prefer Local</option>
                <option value="remote-wins">Always Prefer Remote</option>
              </select>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.syncEnabled || false}
                  onChange={(e) => updateSettings({ syncEnabled: e.target.checked })}
                  disabled={!settings.apiKey}
                />
                <span>Enable Sync</span>
              </label>
              {!settings.apiKey && (
                <p className="settings-help">API key required to enable sync</p>
              )}
            </div>

            {settings.lastSyncAt && (
              <div className="sync-status">
                Last synced: {new Date(settings.lastSyncAt).toLocaleString()}
              </div>
            )}
            {settings.lastSyncError && (
              <div className="sync-error">
                Error: {settings.lastSyncError}
              </div>
            )}
          </div>
        )}
      </section>

      {/* AI Settings */}
      <section className="settings-section">
        <h2>AI Settings</h2>
        <p className="settings-help">
          Used to summarize Amazon item titles and suggest categories through OpenRouter.
        </p>
        {settingsLoading ? (
          <div className="settings-loading">Loading settings...</div>
        ) : (
          <div className="settings-form">
            <div className="form-group">
              <label htmlFor="openRouterApiKey">OpenRouter API Key</label>
              <input
                id="openRouterApiKey"
                type="password"
                value={settings.openRouterApiKey || ''}
                onChange={(e) => updateSettings({ openRouterApiKey: e.target.value })}
                placeholder="Enter your OpenRouter API key"
                className="settings-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="openRouterModel">OpenRouter Model</label>
              <input
                id="openRouterModel"
                type="text"
                value={settings.openRouterModel || 'anthropic/claude-haiku-4.5'}
                onChange={(e) => updateSettings({ openRouterModel: e.target.value })}
                className="settings-input"
              />
            </div>
          </div>
        )}
      </section>

      {/* Amazon Import */}
      <section className="settings-section">
        <h2>Amazon Transaction Memos</h2>
        <p className="settings-help">
          Upload an Amazon item CSV, preview matched transactions, then append item summaries to
          Lunch Money notes.
        </p>
        <AmazonImport
          disabled={settingsLoading || !settings.apiKey || !settings.openRouterApiKey}
          onMessage={setMessage}
        />
        {!settings.apiKey && (
          <p className="settings-help">Lunch Money API key required to fetch and update transactions.</p>
        )}
        {!settings.openRouterApiKey && (
          <p className="settings-help">OpenRouter API key required to summarize item titles.</p>
        )}
      </section>

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
