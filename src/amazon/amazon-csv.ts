export interface AmazonCsvRow {
  date: string;
  orderId: string;
  totalAmount: number;
  itemTitle: string;
  itemAsin: string;
  itemPrice: number;
  itemQuantity: number;
}

export interface AmazonItem {
  title: string;
  asin: string;
  price: number;
  quantity: number;
}

export interface AmazonCharge {
  date: string;
  orderId: string;
  chargedAmount: number;
  items: AmazonItem[];
}

// Columns from the "Order History Exporter for Amazon" extension (one row per order item).
const REQUIRED_HEADERS = [
  'Order ID',
  'Order Date',
  'Total Amount',
  'Item Title',
  'Item ASIN',
  'Item Quantity',
  'Item Price',
];

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function parseMoney(value: string): number {
  const cleaned = value.trim().replace(/[$,]/g, '');
  if (!cleaned) return 0;
  return Number(cleaned);
}

function normalizeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid Amazon CSV date: ${value}`);
  }
  return date.toISOString().slice(0, 10);
}

export function parseAmazonCsv(csvText: string): AmazonCsvRow[] {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error('Amazon CSV must include a header and at least one row.');
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length > 0) {
    throw new Error(`Amazon CSV is missing required columns: ${missing.join(', ')}`);
  }

  const index = new Map(headers.map((header, i) => [header, i]));
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const get = (header: string): string => values[index.get(header) ?? -1] ?? '';

    return {
      date: normalizeDate(get('Order Date')),
      orderId: get('Order ID'),
      totalAmount: parseMoney(get('Total Amount')),
      itemTitle: get('Item Title'),
      itemAsin: get('Item ASIN'),
      itemPrice: parseMoney(get('Item Price')),
      itemQuantity: Number(get('Item Quantity') || 1),
    };
  });
}

/**
 * The export has no per-charge data, so each order becomes one charge for its
 * Total Amount. Orders that Amazon billed in several charges won't match a
 * single Lunch Money transaction and end up in the skipped list.
 */
export function buildAmazonCharges(rows: AmazonCsvRow[]): AmazonCharge[] {
  const charges = new Map<string, AmazonCharge>();

  for (const row of rows) {
    let charge = charges.get(row.orderId);
    if (!charge) {
      charge = {
        date: row.date,
        orderId: row.orderId,
        chargedAmount: row.totalAmount,
        items: [],
      };
      charges.set(row.orderId, charge);
    }

    if (!charge.items.some((item) => item.asin === row.itemAsin && item.title === row.itemTitle)) {
      charge.items.push({
        title: row.itemTitle,
        asin: row.itemAsin,
        price: row.itemPrice,
        quantity: row.itemQuantity,
      });
    }
  }

  return Array.from(charges.values());
}

export interface SplitCandidate {
  id: number;
  amount: number;
}

export interface SplitAssignment {
  candidateId: number;
  items: AmazonItem[];
}

const MAX_SPLIT_CANDIDATES = 14;
const MAX_SPLIT_ITEMS = 10;
const MAX_SPLIT_ASSIGNMENTS = 200_000;
const SPLIT_ASSIGNMENT_AMBIGUITY = 1;

function cents(value: number): number {
  return Math.round(value * 100);
}

function itemBase(item: AmazonItem): number {
  return item.price * item.quantity;
}

function findCandidateSubsets(candidates: SplitCandidate[], targetCents: number): SplitCandidate[][] {
  const matches: SplitCandidate[][] = [];

  const search = (index: number, selected: SplitCandidate[], sumCents: number): void => {
    if (matches.length > 1 || sumCents > targetCents + 1) return;
    if (index >= candidates.length) {
      if (selected.length >= 2 && Math.abs(sumCents - targetCents) <= 1) {
        matches.push([...selected]);
      }
      return;
    }

    search(index + 1, selected, sumCents);
    selected.push(candidates[index]);
    search(index + 1, selected, sumCents + cents(Math.abs(candidates[index].amount)));
    selected.pop();
  };

  search(0, [], 0);
  return matches;
}

/**
 * Split the order's items across the charges. The export has no tax or shipping per item,
 * so each item's share is its base price scaled by (order total / sum of base prices).
 */
function assignItemsToCharges(
  charge: AmazonCharge,
  subset: SplitCandidate[],
): SplitAssignment[] | null {
  const items = charge.items;
  const k = subset.length;
  const baseTotal = items.reduce((sum, item) => sum + itemBase(item), 0);
  if (baseTotal <= 0 || items.length < k || items.length > MAX_SPLIT_ITEMS) return null;
  if (k ** items.length > MAX_SPLIT_ASSIGNMENTS) return null;

  const ratio = Math.abs(charge.chargedAmount) / baseTotal;
  const amounts = subset.map((candidate) => Math.abs(candidate.amount));
  const valid: Array<{ groups: number[]; error: number }> = [];

  const search = (index: number, groups: number[], sums: number[]): void => {
    if (index >= items.length) {
      if (!sums.every((sum, g) => groups.includes(g) && sum > 0)) return;
      const errors = sums.map((sum, g) => Math.abs(sum * ratio - amounts[g]));
      const withinTolerance = errors.every((error, g) => error <= Math.max(1, amounts[g] * 0.05));
      if (withinTolerance) {
        valid.push({ groups: [...groups], error: errors.reduce((a, b) => a + b, 0) });
      }
      return;
    }

    for (let g = 0; g < k; g++) {
      groups.push(g);
      sums[g] += itemBase(items[index]);
      search(index + 1, groups, sums);
      sums[g] -= itemBase(items[index]);
      groups.pop();
    }
  };

  search(0, [], new Array(k).fill(0));
  if (valid.length === 0) return null;

  valid.sort((a, b) => a.error - b.error);
  if (valid.length > 1 && valid[1].error - valid[0].error < SPLIT_ASSIGNMENT_AMBIGUITY) return null;

  return subset.map((candidate, g) => ({
    candidateId: candidate.id,
    items: items.filter((_, i) => valid[0].groups[i] === g),
  }));
}

/**
 * Tries to explain an order that matched no single transaction as several charges.
 * Returns null unless exactly one set of candidate transactions sums to the order total
 * and the items split across them unambiguously.
 */
export function matchSplitCharge(
  charge: AmazonCharge,
  candidates: SplitCandidate[],
): SplitAssignment[] | null {
  const totalCents = cents(Math.abs(charge.chargedAmount));
  const usable = candidates
    .filter((candidate) => cents(Math.abs(candidate.amount)) < totalCents)
    .slice(0, MAX_SPLIT_CANDIDATES);

  const subsets = findCandidateSubsets(usable, totalCents);
  if (subsets.length !== 1) return null;

  return assignItemsToCharges(charge, subsets[0]);
}
