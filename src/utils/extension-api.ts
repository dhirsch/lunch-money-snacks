import browser from 'webextension-polyfill';

type BrowserAPI = typeof browser;

type ExtensionGlobals = typeof globalThis & {
  browser?: BrowserAPI;
  chrome?: typeof chrome;
};

const globalBrowser = (globalThis as ExtensionGlobals).browser;
const globalChrome = (globalThis as ExtensionGlobals).chrome;

export const extensionApi = (globalBrowser ?? browser ?? globalChrome)!;
