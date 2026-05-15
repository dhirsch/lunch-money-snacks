export interface AmazonCsvRow {
  date: string;
  orderId: string;
  chargedAmount: number;
  orderSubtotal: number;
  orderShipping: number;
  orderTax: number;
  orderGrandTotal: number;
  itemNum: string;
  itemTitle: string;
  itemAsin: string;
  itemPrice: number;
  itemQuantity: number;
}

export interface AmazonItem {
  itemNum: string;
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

export interface AmazonChargeMatch {
  charge: AmazonCharge;
  matchedItems: AmazonItem[];
}

const REQUIRED_HEADERS = [
  'date',
  'order_id',
  'charged_amount',
  'order_subtotal',
  'order_shipping',
  'order_tax',
  'order_grand_total',
  'item_num',
  'item_title',
  'item_asin',
  'item_price',
  'item_quantity',
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
      date: normalizeDate(get('date')),
      orderId: get('order_id'),
      chargedAmount: parseMoney(get('charged_amount')),
      orderSubtotal: parseMoney(get('order_subtotal')),
      orderShipping: parseMoney(get('order_shipping')),
      orderTax: parseMoney(get('order_tax')),
      orderGrandTotal: parseMoney(get('order_grand_total')),
      itemNum: get('item_num'),
      itemTitle: get('item_title'),
      itemAsin: get('item_asin'),
      itemPrice: parseMoney(get('item_price')),
      itemQuantity: Number(get('item_quantity') || 1),
    };
  });
}

export function buildAmazonCharges(rows: AmazonCsvRow[]): AmazonCharge[] {
  const groups = new Map<string, AmazonCsvRow[]>();

  for (const row of rows) {
    const key = `${row.date}:${row.orderId}:${row.chargedAmount.toFixed(2)}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const charges: AmazonCharge[] = [];
  for (const groupRows of groups.values()) {
    const first = groupRows[0];
    const itemByKey = new Map<string, AmazonItem>();

    for (const row of groupRows) {
      const key = `${row.itemNum}:${row.itemTitle}`;
      if (!itemByKey.has(key)) {
        itemByKey.set(key, {
          itemNum: row.itemNum,
          title: row.itemTitle,
          asin: row.itemAsin,
          price: row.itemPrice,
          quantity: row.itemQuantity,
        });
      }
    }

    charges.push({
      date: first.date,
      orderId: first.orderId,
      chargedAmount: first.chargedAmount,
      items: Array.from(itemByKey.values()),
    });
  }

  return charges;
}

function itemBaseTotal(item: AmazonItem): number {
  return item.price * item.quantity;
}

function cents(value: number): number {
  return Math.round(value * 100);
}

function findUniqueSubset(items: AmazonItem[], target: number, ratio: number): AmazonItem[] | null {
  const targetCents = cents(target);
  const matches: AmazonItem[][] = [];

  const search = (index: number, selected: AmazonItem[], baseTotal: number): void => {
    if (matches.length > 1) return;
    if (index >= items.length) {
      const allocated = cents(baseTotal * ratio);
      if (Math.abs(allocated - targetCents) <= 1) {
        matches.push([...selected]);
      }
      return;
    }

    search(index + 1, selected, baseTotal);
    selected.push(items[index]);
    search(index + 1, selected, baseTotal + itemBaseTotal(items[index]));
    selected.pop();
  };

  search(0, [], 0);
  return matches.length === 1 ? matches[0] : null;
}

function getUniqueItems(rows: AmazonCsvRow[]): AmazonItem[] {
  const uniqueItems = new Map<string, AmazonItem>();
  for (const row of rows) {
    const key = `${row.itemNum}:${row.itemAsin}:${row.itemTitle}`;
    if (!uniqueItems.has(key)) {
      uniqueItems.set(key, {
        itemNum: row.itemNum,
        title: row.itemTitle,
        asin: row.itemAsin,
        price: row.itemPrice,
        quantity: row.itemQuantity,
      });
    }
  }
  return Array.from(uniqueItems.values());
}

export function matchAmazonChargeItems(rows: AmazonCsvRow[], charge: AmazonCharge): AmazonChargeMatch | null {
  const orderRows = rows.filter((row) => row.orderId === charge.orderId);
  const first = orderRows[0];
  if (!first || first.orderSubtotal <= 0 || first.orderGrandTotal <= 0) {
    return null;
  }

  const allOrderItems = getUniqueItems(orderRows);
  const uniqueChargeAmounts = new Set(orderRows.map((row) => cents(Math.abs(row.chargedAmount))));
  const isWholeOrderCharge =
    uniqueChargeAmounts.size === 1 ||
    Math.abs(cents(Math.abs(charge.chargedAmount)) - cents(first.orderGrandTotal)) <= 1;

  if (isWholeOrderCharge) {
    return { charge, matchedItems: allOrderItems };
  }

  const ratio = first.orderGrandTotal / first.orderSubtotal;
  const matchedItems = findUniqueSubset(
    allOrderItems,
    Math.abs(charge.chargedAmount),
    ratio,
  );

  if (!matchedItems || matchedItems.length === 0) {
    return null;
  }

  return { charge, matchedItems };
}
