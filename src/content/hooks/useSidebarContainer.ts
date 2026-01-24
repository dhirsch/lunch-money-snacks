import { useState, useEffect } from 'react';

const SIDEBAR_SELECTOR = '#sticky';
const BUDGET_OVERVIEW_CARD_SELECTOR = '#sticky > .ui.card';
const PERIOD_SUMMARY_CONTAINER_ID = 'lme-period-summary-container';

export function useSidebarContainer(): HTMLElement | null {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const findOrCreateContainer = (): HTMLElement | null => {
      let existingContainer = document.getElementById(PERIOD_SUMMARY_CONTAINER_ID);
      if (existingContainer) {
        return existingContainer;
      }

      const budgetOverviewCard = document.querySelector(BUDGET_OVERVIEW_CARD_SELECTOR);
      if (!budgetOverviewCard) {
        return null;
      }

      const newContainer = document.createElement('div');
      newContainer.id = PERIOD_SUMMARY_CONTAINER_ID;
      budgetOverviewCard.insertAdjacentElement('afterend', newContainer);

      return newContainer;
    };

    const initialContainer = findOrCreateContainer();
    setContainer(initialContainer);

    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    if (!initialContainer) {
      retryTimeout = setTimeout(() => {
        const retryContainer = findOrCreateContainer();
        if (retryContainer) {
          setContainer(retryContainer);
        }
      }, 2000);
    }

    const observer = new MutationObserver(() => {
      if (!document.getElementById(PERIOD_SUMMARY_CONTAINER_ID)) {
        const newContainer = findOrCreateContainer();
        if (newContainer) {
          setContainer(newContainer);
        }
      }
    });

    const sidebar = document.querySelector(SIDEBAR_SELECTOR);
    if (sidebar) {
      observer.observe(sidebar, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      observer.disconnect();
    };
  }, []);

  return container;
}
