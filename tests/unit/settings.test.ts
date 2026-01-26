import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/storage/schema';
import type { UserSettings } from '../../src/storage/schema';

describe('Settings Schema', () => {
  it('has correct default values for new sync settings', () => {
    const settings: UserSettings = DEFAULT_SETTINGS;
    
    expect(settings.syncEnabled).toBe(false);
    expect(settings.apiKey).toBeUndefined();
    expect(settings.conflictPolicy).toBe('last-write-wins');
    expect(settings.lastSyncAt).toBeUndefined();
    expect(settings.lastSyncError).toBeUndefined();
  });

  it('allows valid conflict policies', () => {
    const policies: UserSettings['conflictPolicy'][] = ['last-write-wins', 'local-wins', 'remote-wins'];
    expect(policies).toContain('last-write-wins');
    expect(policies).toContain('local-wins');
    expect(policies).toContain('remote-wins');
  });
});
