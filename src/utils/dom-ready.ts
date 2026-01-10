/**
 * Utility functions for waiting for DOM elements to appear in dynamic SPAs
 */

/**
 * Wait for an element to appear in the DOM
 * @param selector - CSS selector to wait for
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 * @returns Promise that resolves with the element or null if timeout
 */
export function waitForElement(
  selector: string,
  timeout: number = 10000
): Promise<Element | null> {
  return new Promise((resolve) => {
    // Check if element already exists
    const existing = document.querySelector(selector);
    if (existing) {
      console.log(`[waitForElement] Element found immediately: ${selector}`);
      resolve(existing);
      return;
    }

    console.log(`[waitForElement] Waiting for element: ${selector}`);
    const startTime = Date.now();

    // Set up MutationObserver to watch for the element
    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`[waitForElement] Element appeared: ${selector}`);
        observer.disconnect();
        resolve(element);
        return;
      }

      // Check timeout
      if (Date.now() - startTime > timeout) {
        console.warn(`[waitForElement] Timeout waiting for: ${selector}`);
        observer.disconnect();
        resolve(null);
      }
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also set a hard timeout
    setTimeout(() => {
      observer.disconnect();
      const element = document.querySelector(selector);
      if (!element) {
        console.warn(`[waitForElement] Hard timeout for: ${selector}`);
      }
      resolve(element);
    }, timeout);
  });
}

/**
 * Wait for multiple elements to appear in the DOM
 * @param selectors - Array of CSS selectors to wait for
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 * @returns Promise that resolves when all elements are found or timeout
 */
export async function waitForElements(
  selectors: string[],
  timeout: number = 10000
): Promise<boolean> {
  console.log(`[waitForElements] Waiting for ${selectors.length} elements...`);
  const promises = selectors.map((selector) => waitForElement(selector, timeout));
  const results = await Promise.all(promises);
  const allFound = results.every((el) => el !== null);

  if (allFound) {
    console.log('[waitForElements] All elements found!');
  } else {
    console.warn('[waitForElements] Some elements not found:',
      selectors.filter((_, i) => results[i] === null)
    );
  }

  return allFound;
}

/**
 * Wait for the Lunch Money budget page to be fully loaded
 * Waits for key elements that indicate the page is ready
 */
export async function waitForBudgetPageReady(timeout: number = 15000): Promise<boolean> {
  console.log('[waitForBudgetPageReady] Waiting for budget page to load...');

  // Wait for the budget table to appear (this is the main indicator)
  const budgetTable = await waitForElement('.p-budget-table', timeout);
  if (!budgetTable) {
    console.error('[waitForBudgetPageReady] Budget table never appeared');
    return false;
  }

  // Wait a bit more for rows to populate
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Check if we have budget rows
  const rows = document.querySelectorAll('tr.fixed-height');
  console.log(`[waitForBudgetPageReady] Found ${rows.length} budget rows`);

  if (rows.length === 0) {
    console.warn('[waitForBudgetPageReady] No budget rows found yet, waiting more...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('[waitForBudgetPageReady] Budget page ready!');
  return true;
}
