import { describe, expect, it } from 'vitest';
import { buildAmazonCharges, matchSplitCharge, parseAmazonCsv, type AmazonCharge } from '../../src/amazon/amazon-csv';

const HEADER =
  'Order ID,Order Date,Total Amount,Currency,Total Savings,Status,Item Title,Item ASIN,Item Quantity,Item Price,Item Discount,Promotions,Item URL,Details URL,Recipient Name,Recipient Street,Recipient City / Postal,Recipient Country';

describe('Amazon CSV utilities', () => {
  const csvText = [
    HEADER,
    '113-8285202-4396238,2026-10-16,58.97,USD,9.7,Delivered October 18,"Sunscreen SPF 50+, 6 Fl Oz",B00K3JQO9Y,2,14.99,0,Additional discount: €9.7,https://www.amazon.com/dp/B00K3JQO9Y,https://www.amazon.com/details,Jennifer Bramen,10804 Kelmore St,"Culver City, CA 90230",United States',
    '113-8285202-4396238,2026-10-16,58.97,USD,,Delivered October 18,"Lip Gloss Jelly",B08L186PH4,2,16,0,,https://www.amazon.com/dp/B08L186PH4,https://www.amazon.com/details,,,,',
    '113-5245636-5823443,2026-10-15,33.36,USD,0,Delivered October 18,"Strapless Bra 36"" Band",B0BPHN8L6D,1,29.99,0,,https://www.amazon.com/dp/B0BPHN8L6D,https://www.amazon.com/details,Jennifer Bramen,10804 Kelmore St,"Culver City, CA 90230",United States',
  ].join('\n');

  it('parses rows from the Order History Exporter format', () => {
    const rows = parseAmazonCsv(csvText);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({
      date: '2026-10-16',
      orderId: '113-8285202-4396238',
      totalAmount: 58.97,
      itemTitle: 'Sunscreen SPF 50+, 6 Fl Oz',
      itemAsin: 'B00K3JQO9Y',
      itemPrice: 14.99,
      itemQuantity: 2,
    });
    expect(rows[2].itemTitle).toBe('Strapless Bra 36" Band');
  });

  it('rejects CSVs missing required columns', () => {
    expect(() => parseAmazonCsv('date,order_id\n2026-01-01,1')).toThrow(/missing required columns/);
  });

  it('builds one charge per order with all of its items', () => {
    const charges = buildAmazonCharges(parseAmazonCsv(csvText));

    expect(charges).toHaveLength(2);
    expect(charges[0]).toMatchObject({
      date: '2026-10-16',
      orderId: '113-8285202-4396238',
      chargedAmount: 58.97,
    });
    expect(charges[0].items.map((item) => item.asin)).toEqual(['B00K3JQO9Y', 'B08L186PH4']);
    expect(charges[1].items).toHaveLength(1);
  });
});

describe('matchSplitCharge', () => {
  const charge: AmazonCharge = {
    date: '2026-09-12',
    orderId: '111-9375319-3142639',
    chargedAmount: 100,
    items: [
      { title: 'Tweezers', asin: 'A', price: 20, quantity: 1 },
      { title: 'Whisk', asin: 'B', price: 30, quantity: 1 },
      { title: 'Glucose monitor', asin: 'C', price: 40, quantity: 2 },
    ],
  };

  it('finds the unique set of transactions that sums to the order total and splits the items', () => {
    // base total 130, ratio 100/130: Tweezers+Whisk -> 38.46, Monitor -> 61.54
    const result = matchSplitCharge(charge, [
      { id: 1, amount: -38.46 },
      { id: 2, amount: -61.54 },
      { id: 3, amount: -12.5 },
    ]);

    expect(result).not.toBeNull();
    const byId = new Map(result!.map((a) => [a.candidateId, a.items.map((i) => i.asin).sort()]));
    expect(byId.get(1)).toEqual(['A', 'B']);
    expect(byId.get(2)).toEqual(['C']);
  });

  it('returns null when no transactions add up to the total', () => {
    expect(matchSplitCharge(charge, [{ id: 1, amount: 40 }, { id: 2, amount: 50 }])).toBeNull();
  });

  it('returns null when more than one set of transactions adds up to the total', () => {
    expect(
      matchSplitCharge(charge, [
        { id: 1, amount: 40 },
        { id: 2, amount: 60 },
        { id: 3, amount: 30 },
        { id: 4, amount: 70 },
      ]),
    ).toBeNull();
  });
});
