import { describe, expect, it } from 'vitest';
import {
  buildAmazonCharges,
  matchAmazonChargeItems,
  parseAmazonCsv,
} from '../../src/amazon/amazon-csv';

describe('Amazon CSV utilities', () => {
  const csvText = [
    'date,order_id,section,status,payment_method,charged_amount,merchant,order_placed,order_subtotal,order_shipping,order_tax,order_grand_total,item_num,item_title,item_asin,item_price,item_quantity,item_condition,item_sold_by',
    '"May 8, 2026",113-2143912-8516210,Completed,Completed,Visa ****0158,-$27.63,,"May 8, 2026",$43.84,$0.00,$4.71,$48.55,1,"Work Gloves, X-Large",B0D7BPJRMJ,$9.90,1,New,HANDLANDY',
    '"May 8, 2026",113-2143912-8516210,Completed,Completed,Visa ****0158,-$27.63,,"May 8, 2026",$43.84,$0.00,$4.71,$48.55,2,"Cooling Gardening Gloves",B09WRKT2YT,$8.99,1,New,Brigic',
    '"May 8, 2026",113-2143912-8516210,Completed,Completed,Visa ****0158,-$27.63,,"May 8, 2026",$43.84,$0.00,$4.71,$48.55,3,"Garden Tool Set",B01MUXL5V8,$24.95,1,New,Amazon.com',
    '"May 8, 2026",113-2143912-8516210,Completed,Completed,Visa ****0158,-$20.92,,"May 8, 2026",$43.84,$0.00,$4.71,$48.55,1,"Work Gloves, X-Large",B0D7BPJRMJ,$9.90,1,New,HANDLANDY',
    '"May 8, 2026",113-2143912-8516210,Completed,Completed,Visa ****0158,-$20.92,,"May 8, 2026",$43.84,$0.00,$4.71,$48.55,2,"Cooling Gardening Gloves",B09WRKT2YT,$8.99,1,New,Brigic',
    '"May 8, 2026",113-2143912-8516210,Completed,Completed,Visa ****0158,-$20.92,,"May 8, 2026",$43.84,$0.00,$4.71,$48.55,3,"Garden Tool Set",B01MUXL5V8,$24.95,1,New,Amazon.com',
  ].join('\n');

  it('parses Amazon CSV rows', () => {
    const rows = parseAmazonCsv(csvText);

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toMatchObject({
      date: '2026-05-08',
      orderId: '113-2143912-8516210',
      chargedAmount: -27.63,
      itemNum: '1',
    });
  });

  it('builds distinct charges by date, order, and charged amount', () => {
    const rows = parseAmazonCsv(csvText);
    const charges = buildAmazonCharges(rows);

    expect(charges.some((charge) => charge.chargedAmount === -27.63)).toBe(true);
    expect(charges.some((charge) => charge.chargedAmount === -20.92)).toBe(true);
  });

  it('matches split charges to item subsets using allocated order totals', () => {
    const rows = parseAmazonCsv(csvText);
    const charges = buildAmazonCharges(rows);
    const largerCharge = charges.find((charge) => charge.chargedAmount === -27.63);
    const smallerCharge = charges.find((charge) => charge.chargedAmount === -20.92);

    expect(largerCharge).toBeDefined();
    expect(smallerCharge).toBeDefined();

    const largerMatch = matchAmazonChargeItems(rows, largerCharge!);
    const smallerMatch = matchAmazonChargeItems(rows, smallerCharge!);

    expect(largerMatch?.matchedItems.map((item) => item.itemNum)).toEqual(['3']);
    expect(smallerMatch?.matchedItems.map((item) => item.itemNum).sort()).toEqual(['1', '2']);
  });

  it('matches every item row for a whole-order charge with multiple items', () => {
    const multiItemCsv = [
      'date,order_id,section,status,payment_method,charged_amount,merchant,order_placed,order_subtotal,order_shipping,order_tax,order_grand_total,item_num,item_title,item_asin,item_price,item_quantity,item_condition,item_sold_by',
      '"May 12, 2026",113-3139360-4261804,Completed,Completed,Visa ****0158,-$44.48,,"May 12, 2026",$41.96,$2.99,$4.32,$44.48,1,"Shoe Cleaner Foam",B0DZ6QFXCB,$11.99,1,New,JILI DIRECT',
      '"May 12, 2026",113-3139360-4261804,Completed,Completed,Visa ****0158,-$44.48,,"May 12, 2026",$41.96,$2.99,$4.32,$44.48,2,"Pumpkin Seed Protein Powder",B0F4RPJ23S,$29.97,1,New,Sunwarrior',
    ].join('\n');
    const rows = parseAmazonCsv(multiItemCsv);
    const charge = buildAmazonCharges(rows)[0];

    const match = matchAmazonChargeItems(rows, charge);

    expect(match?.matchedItems.map((item) => item.title)).toEqual([
      'Shoe Cleaner Foam',
      'Pumpkin Seed Protein Powder',
    ]);
  });
});
