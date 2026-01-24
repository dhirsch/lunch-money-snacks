import '@testing-library/jest-dom';

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
      // Call the callback asynchronously to simulate real Chrome API
      setTimeout(() => callback(result), 0);
    }),
    set: vi.fn((items: Record<string, unknown>, callback?: () => void) => {
      Object.assign(mockStorage, items);
      if (callback) setTimeout(() => callback(), 0);
    }),
    remove: vi.fn((keys: string | string[], callback?: () => void) => {
      const keysArray = typeof keys === 'string' ? [keys] : keys;
      keysArray.forEach((key) => {
        delete mockStorage[key];
      });
      if (callback) setTimeout(() => callback(), 0);
    }),
    getBytesInUse: vi.fn((keys: string | string[] | null, callback: (bytesInUse: number) => void) => {
      const size = JSON.stringify(mockStorage).length;
      setTimeout(() => callback(size), 0);
    }),
    clear: vi.fn((callback?: () => void) => {
      Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
      if (callback) setTimeout(() => callback(), 0);
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
};

Object.defineProperty(globalThis, 'browser', {
  value: {
    storage: chromeStorageMock,
    runtime: chromeRuntimeMock,
  },
  writable: true,
});

// Assign to globalThis
Object.defineProperty(globalThis, 'chrome', {
  value: {
    storage: chromeStorageMock,
    runtime: chromeRuntimeMock,
  },
  writable: true,
});

Object.defineProperty(globalThis, 'browser', {
  value: {
    storage: chromeStorageMock,
    runtime: chromeRuntimeMock,
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
