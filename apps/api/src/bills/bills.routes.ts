import { Router } from 'express';
import { PoolClient } from 'pg';
import { pool } from '../db';

type BillStatus = 'draft' | 'completed' | 'printed';

type BillRow = {
  id: number;
  bill_serial_number: number;
  cashier_id: number;
  subtotal: string;
  gst_total: string;
  grand_total: string;
  status: BillStatus;
  created_at: Date;
};

type BillListRow = BillRow & {
  items_count: number;
};

type BillItemRow = {
  id: number;
  bill_id: number;
  item_id: number;
  item_name: string;
  quantity: number;
  unit_price: string;
  gst_rate: string;
  gst_amount: string;
  line_total: string;
};

type CatalogItemRow = {
  id: number;
  name: string;
  category: string;
  selling_price: string;
  is_active: boolean;
};

type GstRow = {
  gst_rate: string;
};

type CreateBillLineInput = {
  item_id?: unknown;
  itemId?: unknown;
  quantity?: unknown;
};

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function parsePositiveInt(value: unknown, fieldName: string): number {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return num;
}

function parseCreateBillBody(rawBody: unknown): { cashierId: number; lines: Array<{ itemId: number; quantity: number }> } {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    throw new Error('Request body must be a valid object.');
  }

  const body = rawBody as { cashier_id?: unknown; items?: unknown };
  const cashierId = body.cashier_id === undefined ? 1 : parsePositiveInt(body.cashier_id, 'cashier_id');

  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new Error('items must be a non-empty array.');
  }

  const lines = body.items.map((line, index) => {
    if (!line || typeof line !== 'object' || Array.isArray(line)) {
      throw new Error(`items[${index}] must be an object.`);
    }

    const rawLine = line as CreateBillLineInput;
    const itemRaw = rawLine.item_id ?? rawLine.itemId;

    return {
      itemId: parsePositiveInt(itemRaw, `items[${index}].item_id`),
      quantity: parsePositiveInt(rawLine.quantity, `items[${index}].quantity`),
    };
  });

  return { cashierId, lines };
}

async function getGstRateForCategory(client: PoolClient, category: string): Promise<number> {
  const config = await client.query<GstRow>(
    'SELECT gst_rate FROM gst_config WHERE LOWER(category) = LOWER($1) AND is_active = true LIMIT 1;',
    [category]
  );

  if (config.rowCount === 0) {
    await client.query(
      'INSERT INTO gst_config (category, gst_rate, is_active) VALUES ($1, $2, true) ON CONFLICT (category) DO NOTHING;',
      [category, 5]
    );

    return 5;
  }

  return Number(config.rows[0].gst_rate);
}

export const billsRouter = Router();

billsRouter.post('/', async (req, res) => {
  const client = await pool.connect();

  try {
    const { cashierId, lines } = parseCreateBillBody(req.body);

    await client.query('BEGIN');

    const cashier = await client.query<{ id: number }>('SELECT id FROM users WHERE id = $1 LIMIT 1;', [cashierId]);
    if (cashier.rowCount === 0) {
      throw new Error('cashier_id does not exist.');
    }

    const mergedLineMap = new Map<number, number>();
    for (const line of lines) {
      mergedLineMap.set(line.itemId, (mergedLineMap.get(line.itemId) ?? 0) + line.quantity);
    }

    const uniqueItemIds = Array.from(mergedLineMap.keys());
    const itemRows = await client.query<CatalogItemRow>(
      'SELECT id, name, category, selling_price, is_active FROM items WHERE id = ANY($1::int[]);',
      [uniqueItemIds]
    );

    const itemById = new Map<number, CatalogItemRow>(itemRows.rows.map((row) => [row.id, row]));
    for (const itemId of uniqueItemIds) {
      const item = itemById.get(itemId);
      if (!item) {
        throw new Error(`Item ${itemId} not found.`);
      }
      if (!item.is_active) {
        throw new Error(`Item ${itemId} is inactive and cannot be billed.`);
      }
    }

    let subtotal = 0;
    let gstTotal = 0;

    const billItemsPayload: Array<{
      item_id: number;
      item_name: string;
      quantity: number;
      unit_price: number;
      gst_rate: number;
      gst_amount: number;
      line_total: number;
    }> = [];

    for (const [itemId, quantity] of mergedLineMap.entries()) {
      const item = itemById.get(itemId) as CatalogItemRow;
      const unitPrice = Number(item.selling_price);
      const gstRate = await getGstRateForCategory(client, item.category);

      const baseAmount = roundMoney(unitPrice * quantity);
      const gstAmount = roundMoney(baseAmount * (gstRate / 100));
      const lineTotal = roundMoney(baseAmount + gstAmount);

      subtotal = roundMoney(subtotal + baseAmount);
      gstTotal = roundMoney(gstTotal + gstAmount);

      billItemsPayload.push({
        item_id: item.id,
        item_name: item.name,
        quantity,
        unit_price: unitPrice,
        gst_rate: gstRate,
        gst_amount: gstAmount,
        line_total: lineTotal,
      });
    }

    const grandTotal = roundMoney(subtotal + gstTotal);

    const billResult = await client.query<BillRow>(
      `
      INSERT INTO bills (cashier_id, subtotal, gst_total, grand_total, status)
      VALUES ($1, $2, $3, $4, 'completed')
      RETURNING *;
      `,
      [cashierId, subtotal, gstTotal, grandTotal]
    );

    const bill = billResult.rows[0];

    for (const line of billItemsPayload) {
      await client.query(
        `
        INSERT INTO bill_items
          (bill_id, item_id, item_name, quantity, unit_price, gst_rate, gst_amount, line_total)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8);
        `,
        [
          bill.id,
          line.item_id,
          line.item_name,
          line.quantity,
          line.unit_price,
          line.gst_rate,
          line.gst_amount,
          line.line_total,
        ]
      );
    }

    const billItems = await client.query<BillItemRow>(
      'SELECT * FROM bill_items WHERE bill_id = $1 ORDER BY id ASC;',
      [bill.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      bill,
      items: billItems.rows,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Failed to create bill.';
    res.status(400).json({ message });
  } finally {
    client.release();
  }
});

billsRouter.get('/', async (_req, res) => {
  try {
    const result = await pool.query<BillListRow>(
      `
      SELECT
        b.*,
        COUNT(bi.id)::int AS items_count
      FROM bills b
      LEFT JOIN bill_items bi ON bi.bill_id = b.id
      GROUP BY b.id
      ORDER BY b.id DESC;
      `
    );

    res.json(result.rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch bills.';
    res.status(400).json({ message });
  }
});

billsRouter.get('/:id', async (req, res) => {
  const billId = Number(req.params.id);
  if (!Number.isInteger(billId) || billId <= 0) {
    res.status(400).json({ message: 'id must be a positive integer.' });
    return;
  }

  try {
    const billResult = await pool.query<BillRow>('SELECT * FROM bills WHERE id = $1;', [billId]);
    if (billResult.rowCount === 0) {
      res.status(404).json({ message: 'Bill not found.' });
      return;
    }

    const itemResult = await pool.query<BillItemRow>(
      'SELECT * FROM bill_items WHERE bill_id = $1 ORDER BY id ASC;',
      [billId]
    );

    res.json({
      bill: billResult.rows[0],
      items: itemResult.rows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch bill.';
    res.status(400).json({ message });
  }
});

billsRouter.post('/:id/print', async (req, res) => {
  const billId = Number(req.params.id);
  if (!Number.isInteger(billId) || billId <= 0) {
    res.status(400).json({ message: 'id must be a positive integer.' });
    return;
  }

  try {
    const existing = await pool.query<BillRow>('SELECT * FROM bills WHERE id = $1;', [billId]);
    if (existing.rowCount === 0) {
      res.status(404).json({ message: 'Bill not found.' });
      return;
    }

    const current = existing.rows[0];
    if (current.status === 'draft') {
      res.status(400).json({ message: 'Draft bills cannot be printed.' });
      return;
    }

    if (current.status === 'printed') {
      res.json(current);
      return;
    }

    const updated = await pool.query<BillRow>(
      "UPDATE bills SET status = 'printed' WHERE id = $1 RETURNING *;",
      [billId]
    );

    res.json(updated.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to print bill.';
    res.status(400).json({ message });
  }
});
