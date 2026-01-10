import { useState, useEffect } from 'react';
import { SELECTORS } from '../../types/lunch-money-dom';

/**
 * Hook to detect and track the current month in Lunch Money
 * Returns the month in YYYY-MM format
 */
export function useMonthDetector(): string | null {
  const [currentMonth, setCurrentMonth] = useState<string | null>(null);

  useEffect(() => {
    const detectMonth = () => {
      // Try to find the month selector element
      console.log('[useMonthDetector] Looking for month selector:', SELECTORS.MONTH_SELECTOR);
      const monthElement = document.querySelector(SELECTORS.MONTH_SELECTOR);
      if (!monthElement) {
        console.warn('[useMonthDetector] Could not find month selector');
        const headers = document.querySelectorAll('h1.ui.header');
        console.log('[useMonthDetector] Available headers:', headers.length, Array.from(headers).map(h => h.textContent));
        return null;
      }

      // Parse the month text (e.g., "January 2024")
      const monthText = monthElement.textContent?.trim();
      console.log('[useMonthDetector] Found month text:', monthText);
      if (!monthText) return null;

      const parsed = parseMonthText(monthText);
      console.log('[useMonthDetector] Parsed month:', parsed);
      return parsed;
    };

    // Initial detection with retry
    const month = detectMonth();
    setCurrentMonth(month);

    // If month not found, retry after a delay
    if (!month) {
      console.log('[useMonthDetector] Month not found, will retry in 2 seconds...');
      const retryTimeout = setTimeout(() => {
        const retryMonth = detectMonth();
        if (retryMonth) {
          setCurrentMonth(retryMonth);
        }
      }, 2000);

      return () => clearTimeout(retryTimeout);
    }

    // Watch for month changes using MutationObserver
    const observer = new MutationObserver(() => {
      const newMonth = detectMonth();
      if (newMonth && newMonth !== currentMonth) {
        setCurrentMonth(newMonth);
      }
    });

    // Observe the month selector area for changes
    const monthContainer = document.querySelector(SELECTORS.MONTH_CONTAINER);
    if (monthContainer) {
      observer.observe(monthContainer, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    // Also watch for navigation button clicks
    const handleNavigation = () => {
      setTimeout(() => {
        const newMonth = detectMonth();
        if (newMonth) {
          setCurrentMonth(newMonth);
        }
      }, 100);
    };

    const prevButton = document.querySelector(SELECTORS.MONTH_PREV_BUTTON);
    const nextButton = document.querySelector(SELECTORS.MONTH_NEXT_BUTTON);

    prevButton?.addEventListener('click', handleNavigation);
    nextButton?.addEventListener('click', handleNavigation);

    return () => {
      observer.disconnect();
      prevButton?.removeEventListener('click', handleNavigation);
      nextButton?.removeEventListener('click', handleNavigation);
    };
  }, [currentMonth]);

  return currentMonth;
}

/**
 * Parse month text like "January 2024" or "Jan 2024" into "2024-01" format
 */
function parseMonthText(text: string): string | null {
  const months: Record<string, string> = {
    january: '01',
    jan: '01',
    february: '02',
    feb: '02',
    march: '03',
    mar: '03',
    april: '04',
    apr: '04',
    may: '05',
    june: '06',
    jun: '06',
    july: '07',
    jul: '07',
    august: '08',
    aug: '08',
    september: '09',
    sep: '09',
    sept: '09',
    october: '10',
    oct: '10',
    november: '11',
    nov: '11',
    december: '12',
    dec: '12',
  };

  const match = text.toLowerCase().match(/(\w+)\s+(\d{4})/);
  if (!match) return null;

  const [, monthName, year] = match;
  const monthNum = months[monthName];
  if (!monthNum) {
    console.warn('[parseMonthText] Unknown month name:', monthName);
    return null;
  }

  return `${year}-${monthNum}`;
}
