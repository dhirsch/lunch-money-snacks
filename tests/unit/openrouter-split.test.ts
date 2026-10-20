import { describe, expect, it } from 'vitest';
import { parseSplitMatches } from '../../src/api/openrouter-client';

const order = {
  orderId: '1',
  date: '2026-09-12',
  total: 100,
  items: [
    { title: 'A', asin: 'A', price: 10, quantity: 1 },
    { title: 'B', asin: 'B', price: 20, quantity: 1 },
  ],
};
const transactions = [
  { id: 1, date: '2026-09-13', amount: 40, notes: null },
  { id: 2, date: '2026-09-15', amount: 60, notes: null },
];

describe('parseSplitMatches', () => {
  it('maps item numbers back to items', () => {
    const guesses = parseSplitMatches(
      '{"matches":[{"transaction_id":1,"item_numbers":[1]},{"transaction_id":2,"item_numbers":[2]}]}',
      order,
      transactions,
    );
    expect(guesses.map((g) => [g.transactionId, g.items.map((i) => i.asin)])).toEqual([
      [1, ['A']],
      [2, ['B']],
    ]);
  });

  it('ignores unknown transactions and reused items', () => {
    const guesses = parseSplitMatches(
      '{"matches":[{"transaction_id":99,"item_numbers":[1]},{"transaction_id":1,"item_numbers":[1]},{"transaction_id":2,"item_numbers":[1]}]}',
      order,
      transactions,
    );
    expect(guesses.map((g) => g.transactionId)).toEqual([1]);
  });

  it('rejects matches whose transactions exceed the order total', () => {
    const big = [{ id: 1, date: '2026-09-13', amount: 150, notes: null }];
    expect(parseSplitMatches('{"matches":[{"transaction_id":1,"item_numbers":[1]}]}', order, big)).toEqual([]);
  });
});
