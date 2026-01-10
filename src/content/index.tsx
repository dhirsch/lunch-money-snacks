import { createRoot } from 'react-dom/client';
import { BudgetEnhancer } from './BudgetEnhancer';
import { waitForBudgetPageReady } from '../utils/dom-ready';

/**
 * Content script entry point
 * Injects the Budget Enhancer React app into the Lunch Money page
 */
async function init() {
  console.log('[LunchMoneyEnhancer] Content script loaded!');
  console.log('[LunchMoneyEnhancer] Current URL:', window.location.href);
  console.log('[LunchMoneyEnhancer] Document ready state:', document.readyState);

  // Wait for the Lunch Money budget page to fully load
  console.log('[LunchMoneyEnhancer] Waiting for budget page to be ready...');
  const isReady = await waitForBudgetPageReady();

  if (!isReady) {
    console.error('[LunchMoneyEnhancer] Budget page failed to load properly. Extension may not work correctly.');
    // Continue anyway - maybe some elements will appear later
  }

  // Create a container for our React app
  const container = document.createElement('div');
  container.id = 'lunch-money-enhancer-root';
  document.body.appendChild(container);

  console.log('[LunchMoneyEnhancer] Container created and mounted');

  // Mount the React application
  const root = createRoot(container);
  root.render(<BudgetEnhancer />);

  console.log('[LunchMoneyEnhancer] React app rendered');
}

// Wait for DOM to be ready before starting
if (document.readyState === 'loading') {
  console.log('[LunchMoneyEnhancer] Waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', init);
} else {
  console.log('[LunchMoneyEnhancer] DOM already loaded, initializing...');
  init();
}
