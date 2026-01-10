import { describe, it, expect } from 'vitest';
import {
  parseCurrency,
  formatCurrency,
  formatForInput,
  calculateSum,
} from '../../src/utils/currency';

describe('Currency Utils', () => {
  describe('parseCurrency', () => {
    it('parses simple dollar amounts', () => {
      expect(parseCurrency('$100.00')).toBe(100);
      expect(parseCurrency('$50.50')).toBe(50.5);
      expect(parseCurrency('$0.99')).toBe(0.99);
    });

    it('parses amounts with commas', () => {
      expect(parseCurrency('$1,000.00')).toBe(1000);
      expect(parseCurrency('$1,234,567.89')).toBe(1234567.89);
    });

    it('parses negative amounts', () => {
      expect(parseCurrency('-$50.00')).toBe(-50);
      expect(parseCurrency('-$1,000.00')).toBe(-1000);
    });

    it('parses amounts without dollar sign', () => {
      expect(parseCurrency('100.00')).toBe(100);
      expect(parseCurrency('1,000.00')).toBe(1000);
    });

    it('handles whitespace', () => {
      expect(parseCurrency('  $100.00  ')).toBe(100);
      expect(parseCurrency(' $ 100.00 ')).toBe(100);
    });

    it('returns 0 for empty or invalid input', () => {
      expect(parseCurrency('')).toBe(0);
      expect(parseCurrency('   ')).toBe(0);
      expect(parseCurrency('abc')).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('formats positive amounts', () => {
      expect(formatCurrency(100)).toBe('$100.00');
      expect(formatCurrency(1000)).toBe('$1,000.00');
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');
    });

    it('formats negative amounts', () => {
      expect(formatCurrency(-50)).toBe('-$50.00');
      expect(formatCurrency(-1000)).toBe('-$1,000.00');
    });

    it('formats zero', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('rounds to two decimal places', () => {
      expect(formatCurrency(10.999)).toBe('$11.00');
      expect(formatCurrency(10.001)).toBe('$10.00');
      expect(formatCurrency(10.005)).toBe('$10.01');
    });
  });

  describe('formatForInput', () => {
    it('formats to two decimal places without currency symbol', () => {
      expect(formatForInput(100)).toBe('100.00');
      expect(formatForInput(50.5)).toBe('50.50');
      expect(formatForInput(0)).toBe('0.00');
    });

    it('formats negative values', () => {
      expect(formatForInput(-50)).toBe('-50.00');
    });
  });

  describe('calculateSum', () => {
    it('sums array of numbers', () => {
      expect(calculateSum([10, 20, 30])).toBe(60);
      expect(calculateSum([1.5, 2.5, 3.0])).toBe(7);
    });

    it('handles empty array', () => {
      expect(calculateSum([])).toBe(0);
    });

    it('handles single element', () => {
      expect(calculateSum([42])).toBe(42);
    });

    it('handles negative numbers', () => {
      expect(calculateSum([10, -5, 20])).toBe(25);
    });

    it('handles floating point precision', () => {
      // Common floating point issue: 0.1 + 0.2 !== 0.3
      const result = calculateSum([0.1, 0.2]);
      expect(result).toBeCloseTo(0.3, 10);
    });
  });
});
