import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Chrome storage API for tests
const mockStorage: Record<string, unknown> = {};

const chromeStorageMock = {
  local: {
    get: vi.fn((keys: string | string[] | null, callback: (result: Record<string, unknown>) => void) => {
      let result: Record<string, unknown> = {};
      if (keys === null) {
        result = { ...mockStorage };
      } else if (typeof keys === 'string') {
        result = { [keys]: mockStorage[keys] };
      } else {
        keys.forEach((key) => {
          result[key] = mockStorage[key];
        });
      }
      queueMicrotask(() => callback(result));
    }),
    set: vi.fn((items: Record<string, unknown>, callback?: () => void) => {
      Object.assign(mockStorage, items);
      if (callback) queueMicrotask(() => callback());
    }),
    remove: vi.fn((keys: string | string[], callback?: () => void) => {
      const keysArray = typeof keys === 'string' ? [keys] : keys;
      keysArray.forEach((key) => {
        delete mockStorage[key];
      });
      if (callback) queueMicrotask(() => callback());
    }),
    getBytesInUse: vi.fn((keys: string | string[] | null, callback: (bytesInUse: number) => void) => {
      const size = JSON.stringify(mockStorage).length;
      queueMicrotask(() => callback(size));
    }),
    clear: vi.fn((callback?: () => void) => {
      Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
      if (callback) queueMicrotask(() => callback());
    }),
  },
  sync: {},
  managed: {},
  session: {},
  onChanged: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(),
  },
};

const chromeRuntimeMock = {
  lastError: null as chrome.runtime.LastError | null,
  openOptionsPage: vi.fn(),
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(),
  },
};

const chromeActionMock = {
  onClicked: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(),
  },
};

Object.defineProperty(globalThis, 'browser', {
  value: {
    storage: chromeStorageMock,
    runtime: chromeRuntimeMock,
    action: chromeActionMock,
  },
  writable: true,
});

// Assign to globalThis
Object.defineProperty(globalThis, 'chrome', {
  value: {
    storage: chromeStorageMock,
    runtime: chromeRuntimeMock,
    action: chromeActionMock,
  },
  writable: true,
});

Object.defineProperty(globalThis, 'browser', {
  value: {
    storage: chromeStorageMock,
    runtime: chromeRuntimeMock,
    action: chromeActionMock,
  },
  writable: true,
});

// Helper to reset mock storage between tests
export const resetMockStorage = () => {
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  chromeRuntimeMock.lastError = null;
  vi.clearAllMocks();
};

// Helper to seed mock storage with data
export const seedMockStorage = (data: Record<string, unknown>) => {
  Object.assign(mockStorage, data);
};
