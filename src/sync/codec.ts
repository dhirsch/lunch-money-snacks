/**
 * Sync codec for serializing, splitting, and reassembling month budget data.
 *
 * Lunch Money custom_metadata has a 4096-byte limit (UTF-8 encoded JSON).
 * This module handles encoding month data into parts that fit within that
 * limit, and decoding parts back into the original data structure.
 */

import type { BudgetLineData } from '../storage/schema';

/** Maximum byte size for custom_metadata JSON payload */
export const MAX_METADATA_BYTES = 4096;

/**
 * A single encoded part of month data, ready to be stored as a
 * Lunch Money transaction's custom_metadata.
 */
export interface EncodedPart {
  /** External ID: "budget-notes-YYYY-MM" or "budget-notes-YYYY-MM-p{n}" */
  external_id: string;
  /** Subset of month data that fits within the byte limit */
  custom_metadata: Record<string, BudgetLineData>;
  /** 0-based part index */
  partIndex: number;
  /** Total number of parts */
  totalParts: number;
}

/**
 * Generates an external_id for a budget notes transaction.
 *
 * @param month - Month in YYYY-MM format
 * @param partIndex - Optional 1-based part index for multi-part data
 * @returns External ID string
 */
export function generateExternalId(month: string, partIndex?: number): string {
  const base = `budget-notes-${month}`;
  if (partIndex === undefined) {
    return base;
  }
  return `${base}-p${partIndex}`;
}

/**
 * Measures the UTF-8 byte length of a JSON-serialized value.
 */
function measureBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

/**
 * Encodes a month's budget data into one or more EncodedParts,
 * each fitting within the 4096-byte custom_metadata limit.
 *
 * @param month - Month in YYYY-MM format
 * @param data - Map of category name to BudgetLineData
 * @returns Array of EncodedPart objects
 */
export function encodeMonthData(
  month: string,
  data: Map<string, BudgetLineData>,
): EncodedPart[] {
  if (data.size === 0) {
    return [
      {
        external_id: generateExternalId(month),
        custom_metadata: {},
        partIndex: 0,
        totalParts: 1,
      },
    ];
  }

  const allEntries = Object.fromEntries(data);
  if (measureBytes(allEntries) <= MAX_METADATA_BYTES) {
    return [
      {
        external_id: generateExternalId(month),
        custom_metadata: allEntries,
        partIndex: 0,
        totalParts: 1,
      },
    ];
  }

  const parts: Record<string, BudgetLineData>[] = [];
  let currentPart: Record<string, BudgetLineData> = {};

  for (const [category, lineData] of data) {
    const candidate = { ...currentPart, [category]: lineData };
    if (measureBytes(candidate) <= MAX_METADATA_BYTES) {
      currentPart = candidate;
    } else {
      if (Object.keys(currentPart).length > 0) {
        parts.push(currentPart);
      }
      currentPart = { [category]: lineData };
    }
  }

  if (Object.keys(currentPart).length > 0) {
    parts.push(currentPart);
  }

  const totalParts = parts.length;
  return parts.map((metadata, index) => ({
    external_id:
      totalParts === 1
        ? generateExternalId(month)
        : generateExternalId(month, index + 1),
    custom_metadata: metadata,
    partIndex: index,
    totalParts,
  }));
}

/**
 * Decodes an array of EncodedParts back into the original month data Map.
 * Parts are sorted by partIndex before reassembly.
 *
 * @param parts - Array of EncodedPart objects (may be in any order)
 * @returns Reassembled Map of category name to BudgetLineData
 */
export function decodeMonthData(
  parts: EncodedPart[],
): Map<string, BudgetLineData> {
  if (parts.length === 0) {
    return new Map();
  }

  const sorted = [...parts].sort((a, b) => a.partIndex - b.partIndex);

  const result = new Map<string, BudgetLineData>();
  for (const part of sorted) {
    for (const [category, lineData] of Object.entries(part.custom_metadata)) {
      result.set(category, lineData);
    }
  }

  return result;
}
