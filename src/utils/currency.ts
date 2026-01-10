/**
 * Parse a currency string into a number
 * Handles formats like "$1,234.56", "1234.56", "-$50.00", etc.
 */
export function parseCurrency(value: string): number {
  if (!value || value.trim() === '') return 0;

  // Remove currency symbols, commas, and whitespace
  const cleaned = value.replace(/[$,\s]/g, '');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format a number as currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number for input field (no currency symbol)
 */
export function formatForInput(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Calculate the sum of itemized amounts
 */
export function calculateSum(amounts: number[]): number {
  return amounts.reduce((sum, amount) => sum + amount, 0);
}
