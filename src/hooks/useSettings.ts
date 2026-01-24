import { useState, useEffect, useCallback } from 'react';
import { getUserSettings, saveUserSettings } from '../storage/storage';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '../storage/schema';
import { extensionApi } from '../utils/extension-api';
import type { UserSettings } from '../storage/schema';

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getUserSettings().then((loaded) => {
      setSettings(loaded);
      setIsLoading(false);
    });

    const handleStorageChange = (
      changes: Record<string, { oldValue?: unknown; newValue?: unknown }>
    ) => {
      if (SETTINGS_STORAGE_KEY in changes) {
        const newValue = changes[SETTINGS_STORAGE_KEY].newValue as Partial<UserSettings> | undefined;
        setSettings({ ...DEFAULT_SETTINGS, ...newValue });
      }
    };

    extensionApi.storage.onChanged.addListener(handleStorageChange);
    return () => {
      extensionApi.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const updateSettings = useCallback(async (patch: Partial<UserSettings>) => {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    await saveUserSettings(updated);
  }, [settings]);

  return { settings, updateSettings, isLoading } as const;
}
