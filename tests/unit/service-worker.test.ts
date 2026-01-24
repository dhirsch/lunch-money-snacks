import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetMockStorage } from '../../src/test/setup';

// Mock the webextension-polyfill to prevent browser extension check
vi.mock('webextension-polyfill', () => ({
  default: (globalThis as any).chrome,
}));

describe('Service Worker - Options Page Click Handler', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  it('registers a listener on action.onClicked', async () => {
    // Clear mocks and reimport to get fresh listener registration
    vi.resetModules();
    await import('../../src/background/service-worker');

    // Verify that addListener was called
    expect((globalThis as any).chrome.action.onClicked.addListener).toHaveBeenCalled();
  });

  it('calls runtime.openOptionsPage when listener is invoked', async () => {
    // Clear mocks and reimport to get fresh listener registration
    vi.resetModules();
    await import('../../src/background/service-worker');

    // Get the listener function that was passed to addListener
    const addListenerCall = (globalThis as any).chrome.action.onClicked.addListener.mock.calls[0];
    expect(addListenerCall).toBeDefined();

    const listenerFunction = addListenerCall[0];
    expect(typeof listenerFunction).toBe('function');

    // Invoke the listener
    listenerFunction();

    // Verify that openOptionsPage was called
    expect((globalThis as any).chrome.runtime.openOptionsPage).toHaveBeenCalled();
  });

  it('listener is called exactly once when registered', async () => {
    // Clear mocks and reimport to get fresh listener registration
    vi.resetModules();
    await import('../../src/background/service-worker');

    // Verify addListener was called exactly once
    expect((globalThis as any).chrome.action.onClicked.addListener).toHaveBeenCalledTimes(1);
  });
});
