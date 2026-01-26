import { describe, it, expect } from 'vitest';
import type { BudgetLineData } from '../../src/storage/schema';
import {
  encodeMonthData,
  decodeMonthData,
  generateExternalId,
  MAX_METADATA_BYTES,
  type EncodedPart,
} from '../../src/sync/codec';

function makeLine(notes: string, itemCount = 0): BudgetLineData {
  return {
    notes,
    items: Array.from({ length: itemCount }, (_, i) => ({
      id: `id-${i}`,
      description: `Item ${i}`,
      amount: (i + 1) * 10,
    })),
    lastModified: 1700000000000,
  };
}

function measureBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

describe('generateExternalId', () => {
  it('returns base ID without partIndex', () => {
    expect(generateExternalId('2024-01')).toBe('budget-notes-2024-01');
  });

  it('returns suffixed ID with partIndex', () => {
    expect(generateExternalId('2024-01', 1)).toBe('budget-notes-2024-01-p1');
    expect(generateExternalId('2024-01', 2)).toBe('budget-notes-2024-01-p2');
  });

  it('handles various month formats', () => {
    expect(generateExternalId('2025-12')).toBe('budget-notes-2025-12');
    expect(generateExternalId('1999-06', 3)).toBe('budget-notes-1999-06-p3');
  });
});

describe('encodeMonthData', () => {
  describe('empty data', () => {
    it('returns single part with empty metadata', () => {
      const result = encodeMonthData('2024-01', new Map());

      expect(result).toHaveLength(1);
      expect(result[0].external_id).toBe('budget-notes-2024-01');
      expect(result[0].custom_metadata).toEqual({});
      expect(result[0].partIndex).toBe(0);
      expect(result[0].totalParts).toBe(1);
    });
  });

  describe('small data (fits in single part)', () => {
    it('encodes single category into one part', () => {
      const data = new Map<string, BudgetLineData>([
        ['Groceries', makeLine('Weekly groceries', 2)],
      ]);

      const result = encodeMonthData('2024-01', data);

      expect(result).toHaveLength(1);
      expect(result[0].external_id).toBe('budget-notes-2024-01');
      expect(result[0].custom_metadata['Groceries']).toBeDefined();
      expect(result[0].custom_metadata['Groceries'].notes).toBe('Weekly groceries');
      expect(result[0].partIndex).toBe(0);
      expect(result[0].totalParts).toBe(1);
    });

    it('encodes multiple categories into one part when under limit', () => {
      const data = new Map<string, BudgetLineData>([
        ['Groceries', makeLine('Food')],
        ['Rent', makeLine('Monthly rent')],
        ['Utilities', makeLine('Electric + water')],
      ]);

      const result = encodeMonthData('2024-03', data);

      expect(result).toHaveLength(1);
      expect(Object.keys(result[0].custom_metadata)).toHaveLength(3);
      expect(result[0].totalParts).toBe(1);
    });
  });

  describe('exact 4096 bytes boundary', () => {
    it('fits data exactly at the limit into a single part', () => {
      const data = new Map<string, BudgetLineData>();
      data.set('Cat', makeLine(''));

      const baseBytes = measureBytes(Object.fromEntries(data));
      const paddingNeeded = MAX_METADATA_BYTES - baseBytes;
      data.set('Cat', makeLine('a'.repeat(paddingNeeded)));

      const encoded = Object.fromEntries(data);
      expect(measureBytes(encoded)).toBe(MAX_METADATA_BYTES);

      const result = encodeMonthData('2024-01', data);
      expect(result).toHaveLength(1);
      expect(result[0].totalParts).toBe(1);
    });
  });

  describe('data exceeding 4096 bytes (split required)', () => {
    it('splits large data into multiple parts', () => {
      const data = new Map<string, BudgetLineData>();
      data.set('Category1', makeLine('A'.repeat(2000)));
      data.set('Category2', makeLine('B'.repeat(2000)));

      const totalBytes = measureBytes(Object.fromEntries(data));
      expect(totalBytes).toBeGreaterThan(MAX_METADATA_BYTES);

      const result = encodeMonthData('2024-06', data);

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0].external_id).toBe('budget-notes-2024-06-p1');
      expect(result[1].external_id).toBe('budget-notes-2024-06-p2');
      expect(result[0].partIndex).toBe(0);
      expect(result[1].partIndex).toBe(1);
      expect(result[0].totalParts).toBe(result.length);
      expect(result[1].totalParts).toBe(result.length);
    });

    it('each part fits within the byte limit', () => {
      const data = new Map<string, BudgetLineData>();
      for (let i = 0; i < 10; i++) {
        data.set(`Category${i}`, makeLine('X'.repeat(500), 3));
      }

      const result = encodeMonthData('2024-01', data);

      for (const part of result) {
        const bytes = measureBytes(part.custom_metadata);
        expect(bytes).toBeLessThanOrEqual(MAX_METADATA_BYTES);
      }
    });

    it('preserves all categories across parts', () => {
      const data = new Map<string, BudgetLineData>();
      data.set('Alpha', makeLine('A'.repeat(2000)));
      data.set('Beta', makeLine('B'.repeat(2000)));
      data.set('Gamma', makeLine('C'.repeat(2000)));

      const result = encodeMonthData('2024-01', data);

      const allCategories = result.flatMap((p) =>
        Object.keys(p.custom_metadata),
      );
      expect(allCategories.sort()).toEqual(['Alpha', 'Beta', 'Gamma']);
    });
  });

  describe('emoji and non-ASCII payloads (UTF-8 multi-byte)', () => {
    it('correctly measures emoji byte sizes', () => {
      const emoji = '🍕🍔🌮🥗';
      const emojiBytes = new TextEncoder().encode(emoji).length;
      expect(emojiBytes).toBe(16);

      const data = new Map<string, BudgetLineData>([
        ['Food', makeLine(emoji)],
      ]);

      const result = encodeMonthData('2024-01', data);
      expect(result).toHaveLength(1);

      for (const part of result) {
        expect(measureBytes(part.custom_metadata)).toBeLessThanOrEqual(
          MAX_METADATA_BYTES,
        );
      }
    });

    it('splits correctly when emoji notes push over the limit', () => {
      const data = new Map<string, BudgetLineData>();
      data.set('Emoji1', makeLine('🎉'.repeat(600)));
      data.set('Emoji2', makeLine('🚀'.repeat(600)));

      const totalBytes = measureBytes(Object.fromEntries(data));
      expect(totalBytes).toBeGreaterThan(MAX_METADATA_BYTES);

      const result = encodeMonthData('2024-01', data);
      expect(result.length).toBeGreaterThanOrEqual(2);

      for (const part of result) {
        expect(measureBytes(part.custom_metadata)).toBeLessThanOrEqual(
          MAX_METADATA_BYTES,
        );
      }
    });

    it('handles mixed ASCII and non-ASCII characters', () => {
      const data = new Map<string, BudgetLineData>([
        ['日本語カテゴリ', makeLine('これはテストです。金額: ¥1,000')],
        ['Café', makeLine('Résumé of expenses: €50, £30')],
      ]);

      const result = encodeMonthData('2024-01', data);
      expect(result.length).toBeGreaterThanOrEqual(1);

      const decoded = decodeMonthData(result);
      expect(decoded.get('日本語カテゴリ')?.notes).toBe(
        'これはテストです。金額: ¥1,000',
      );
      expect(decoded.get('Café')?.notes).toBe(
        'Résumé of expenses: €50, £30',
      );
    });
  });

  describe('very large payloads (multiple splits)', () => {
    it('handles 20+ categories requiring many parts', () => {
      const data = new Map<string, BudgetLineData>();
      for (let i = 0; i < 20; i++) {
        data.set(`LargeCategory${i.toString().padStart(2, '0')}`, makeLine('Z'.repeat(1000), 5));
      }

      const result = encodeMonthData('2024-01', data);

      expect(result.length).toBeGreaterThan(2);

      for (const part of result) {
        expect(measureBytes(part.custom_metadata)).toBeLessThanOrEqual(
          MAX_METADATA_BYTES,
        );
        expect(part.totalParts).toBe(result.length);
      }

      const allCategories = result.flatMap((p) =>
        Object.keys(p.custom_metadata),
      );
      expect(allCategories).toHaveLength(20);

      for (let i = 0; i < result.length; i++) {
        expect(result[i].partIndex).toBe(i);
        expect(result[i].external_id).toBe(
          `budget-notes-2024-01-p${i + 1}`,
        );
      }
    });
  });
});

describe('decodeMonthData', () => {
  it('returns empty map for empty parts array', () => {
    const result = decodeMonthData([]);
    expect(result).toEqual(new Map());
  });

  it('decodes single part correctly', () => {
    const parts: EncodedPart[] = [
      {
        external_id: 'budget-notes-2024-01',
        custom_metadata: {
          Groceries: makeLine('Weekly groceries', 2),
          Rent: makeLine('Monthly rent'),
        },
        partIndex: 0,
        totalParts: 1,
      },
    ];

    const result = decodeMonthData(parts);

    expect(result.size).toBe(2);
    expect(result.get('Groceries')?.notes).toBe('Weekly groceries');
    expect(result.get('Groceries')?.items).toHaveLength(2);
    expect(result.get('Rent')?.notes).toBe('Monthly rent');
  });

  it('reassembles multiple parts in order', () => {
    const parts: EncodedPart[] = [
      {
        external_id: 'budget-notes-2024-01-p2',
        custom_metadata: { Beta: makeLine('Second') },
        partIndex: 1,
        totalParts: 2,
      },
      {
        external_id: 'budget-notes-2024-01-p1',
        custom_metadata: { Alpha: makeLine('First') },
        partIndex: 0,
        totalParts: 2,
      },
    ];

    const result = decodeMonthData(parts);

    expect(result.size).toBe(2);
    const keys = [...result.keys()];
    expect(keys).toEqual(['Alpha', 'Beta']);
  });

  it('handles parts given in reverse order', () => {
    const parts: EncodedPart[] = [
      {
        external_id: 'budget-notes-2024-01-p3',
        custom_metadata: { C: makeLine('Third') },
        partIndex: 2,
        totalParts: 3,
      },
      {
        external_id: 'budget-notes-2024-01-p1',
        custom_metadata: { A: makeLine('First') },
        partIndex: 0,
        totalParts: 3,
      },
      {
        external_id: 'budget-notes-2024-01-p2',
        custom_metadata: { B: makeLine('Second') },
        partIndex: 1,
        totalParts: 3,
      },
    ];

    const result = decodeMonthData(parts);

    expect(result.size).toBe(3);
    const keys = [...result.keys()];
    expect(keys).toEqual(['A', 'B', 'C']);
  });
});

describe('encode → decode roundtrip', () => {
  it('roundtrips empty data', () => {
    const original = new Map<string, BudgetLineData>();
    const encoded = encodeMonthData('2024-01', original);
    const decoded = decodeMonthData(encoded);

    expect(decoded).toEqual(original);
  });

  it('roundtrips small data', () => {
    const original = new Map<string, BudgetLineData>([
      ['Groceries', makeLine('Weekly groceries', 3)],
      ['Rent', makeLine('Monthly rent', 0)],
    ]);

    const encoded = encodeMonthData('2024-01', original);
    const decoded = decodeMonthData(encoded);

    expect(decoded).toEqual(original);
  });

  it('roundtrips large data requiring splits', () => {
    const original = new Map<string, BudgetLineData>();
    for (let i = 0; i < 15; i++) {
      original.set(`Category${i}`, makeLine('N'.repeat(500), 2));
    }

    const encoded = encodeMonthData('2024-01', original);
    expect(encoded.length).toBeGreaterThan(1);

    const decoded = decodeMonthData(encoded);

    expect(decoded.size).toBe(original.size);
    for (const [key, value] of original) {
      expect(decoded.get(key)).toEqual(value);
    }
  });

  it('roundtrips emoji/non-ASCII data', () => {
    const original = new Map<string, BudgetLineData>([
      ['🍕 Pizza', makeLine('Ordered from 東京ピザ for ¥2,500')],
      ['Café ☕', makeLine('Résumé meeting — €15.50')],
    ]);

    const encoded = encodeMonthData('2024-01', original);
    const decoded = decodeMonthData(encoded);

    expect(decoded).toEqual(original);
  });
});
