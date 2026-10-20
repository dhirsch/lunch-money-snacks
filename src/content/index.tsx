import { createRoot, Root } from 'react-dom/client';
import { BudgetEnhancer } from './BudgetEnhancer';
import { waitForBudgetPageReady } from '../utils/dom-ready';

const BUDGET_PATH = /^\/budget/;
const BUDGET_CONTAINER = '.g-budget';

let root: Root | null = null;
let container: HTMLElement | null = null;
let mountInProgress = false;
let leaveObserver: MutationObserver | null = null;

function isBudgetPage(): boolean {
  return BUDGET_PATH.test(window.location.pathname);
}

// Watch for LM's SPA removing the budget container (real navigation away)
function watchForLeave() {
  if (leaveObserver) return;
  leaveObserver = new MutationObserver(() => {
    if (!document.querySelector(BUDGET_CONTAINER)) {
      unmount();
    }
  });
  leaveObserver.observe(document.body, { childList: true, subtree: true });
}

async function mount() {
  if (root || mountInProgress) return;
  mountInProgress = true;

  const isReady = await waitForBudgetPageReady();
  if (!isReady) {
    console.error('[LunchMoneyEnhancer] Budget page failed to load properly.');
  }

  mountInProgress = false;

  if (root) return;

  container = document.createElement('div');
  container.id = 'lunch-money-enhancer-root';
  document.body.appendChild(container);

  root = createRoot(container);
  root.render(<BudgetEnhancer />);

  // Use DOM observation (not URL) to detect real SPA navigation away
  watchForLeave();

  console.log('[LunchMoneyEnhancer] Mounted.');
}

function unmount() {
  if (!root) return;
  leaveObserver?.disconnect();
  leaveObserver = null;
  root.unmount();
  root = null;
  container?.remove();
  container = null;
  console.log('[LunchMoneyEnhancer] Unmounted.');
}

// Handle SPA navigation TO the budget page
function handleLocationChange() {
  if (isBudgetPage() && !root && !mountInProgress) {
    mount();
  }
}

// Patch History API to catch SPA navigation
const origPushState = history.pushState.bind(history);
const origReplaceState = history.replaceState.bind(history);

history.pushState = function (...args) {
  origPushState(...args);
  window.dispatchEvent(new Event('lme:locationchange'));
};

history.replaceState = function (...args) {
  origReplaceState(...args);
  window.dispatchEvent(new Event('lme:locationchange'));
};

window.addEventListener('popstate', () =>
  window.dispatchEvent(new Event('lme:locationchange'))
);
window.addEventListener('lme:locationchange', handleLocationChange);

// Initial mount — mirrors original behavior (no extra URL check that could regress)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => mount());
} else {
  mount();
}
