import { Router } from 'express';
import { randomUUID } from 'crypto';
import { pool } from '../db';

type StockType = 'limited' | 'unlimited';

type ItemRow = {
  id: number;
  serial_number: string;
  name: string;
  selling_price: string;
  category: string;
  stock_quantity: number;
  is_active: boolean;
  stock_type: StockType;
  created_at: Date;
  updated_at: Date;
};

type ItemPayload = {
  name?: string;
  selling_price?: number;
  category?: string;
  stock_quantity?: number;
  is_active?: boolean;
  stock_type?: StockType;
};

const IMMUTABLE_FIELDS = new Set(['id', 'serial_number', 'created_at', 'updated_at']);
const ALLOWED_MUTABLE_FIELDS = new Set([
  'name',
  'selling_price',
  'category',
  'stock_quantity',
  'is_active',
  'stock_type',
]);

async function ensureCategoryExists(category: string): Promise<void> {
  const result = await pool.query<{ id: number }>(
    'SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND is_active = true LIMIT 1;',
    [category]
  );

  if (result.rowCount === 0) {
    throw new Error('category does not exist in active categories list.');
  }
}

function hasImmutableField(body: Record<string, unknown>): string | null {
  for (const key of Object.keys(body)) {
    if (IMMUTABLE_FIELDS.has(key)) {
      return key;
    }
  }
  return null;
}

function parseBooleanQuery(value: unknown): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') {
      return true;
    }
    if (value.toLowerCase() === 'false') {
      return false;
    }
  }

  throw new Error('is_active must be true or false when provided.');
}

function parseItemPayload(rawBody: unknown, allowPartial: boolean): ItemPayload {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    throw new Error('Request body must be a valid object.');
  }

  const body = rawBody as Record<string, unknown>;

  for (const key of Object.keys(body)) {
    if (!ALLOWED_MUTABLE_FIELDS.has(key) && !IMMUTABLE_FIELDS.has(key)) {
      throw new Error(`${key} is not an allowed field.`);
    }
  }

  const immutableField = hasImmutableField(body);
  if (immutableField) {
    throw new Error(`${immutableField} is immutable and cannot be set.`);
  }

  const parsed: ItemPayload = {};

  if ('name' in body) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      throw new Error('name must be a non-empty string.');
    }
    parsed.name = body.name.trim();
  }

  if ('selling_price' in body) {
    const num = Number(body.selling_price);
    if (!Number.isFinite(num) || num < 0) {
      throw new Error('selling_price must be a valid non-negative number.');
    }
    parsed.selling_price = Number(num.toFixed(2));
  }

  if ('category' in body) {
    if (typeof body.category !== 'string' || body.category.trim().length === 0) {
      throw new Error('category must be a non-empty string.');
    }
    parsed.category = body.category.trim();
  }

  if ('stock_quantity' in body) {
    const qty = Number(body.stock_quantity);
    if (!Number.isInteger(qty) || qty < 0) {
      throw new Error('stock_quantity must be an integer greater than or equal to 0.');
    }
    parsed.stock_quantity = qty;
  }

  if ('is_active' in body) {
    if (typeof body.is_active !== 'boolean') {
      throw new Error('is_active must be a boolean.');
    }
    parsed.is_active = body.is_active;
  }

  if ('stock_type' in body) {
    if (body.stock_type !== 'limited' && body.stock_type !== 'unlimited') {
      throw new Error("stock_type must be either 'limited' or 'unlimited'.");
    }
    parsed.stock_type = body.stock_type;
  }

  if (!allowPartial) {
    if (
      !parsed.name ||
      parsed.selling_price === undefined ||
      !parsed.category ||
      !parsed.stock_type ||
      parsed.stock_quantity === undefined
    ) {
      throw new Error('name, selling_price, category, stock_type, and stock_quantity are required.');
    }
  }

  if (allowPartial && Object.keys(parsed).length === 0) {
    throw new Error('At least one mutable field is required for update.');
  }

  return parsed;
}

export const itemsRouter = Router();

itemsRouter.post('/', async (req, res) => {
  try {
    const payload = parseItemPayload(req.body, false);
    await ensureCategoryExists(payload.category as string);

    const result = await pool.query<ItemRow>(
      `
      INSERT INTO items (serial_number, name, selling_price, category, stock_quantity, is_active, stock_type)
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, true), $7)
      RETURNING *;
      `,
      [
        randomUUID(),
        payload.name,
        payload.selling_price,
        payload.category,
        payload.stock_quantity,
        payload.is_active,
        payload.stock_type,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create item.';
    res.status(400).json({ message });
  }
});

itemsRouter.get('/', async (req, res) => {
  try {
    const whereParts: string[] = [];
    const params: Array<string | boolean> = [];

    if (typeof req.query.category === 'string' && req.query.category.trim()) {
      params.push(req.query.category.trim());
      whereParts.push(`category = $${params.length}`);
    }

    const isActive = parseBooleanQuery(req.query.is_active);
    if (isActive !== undefined) {
      params.push(isActive);
      whereParts.push(`is_active = $${params.length}`);
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    const result = await pool.query<ItemRow>(
      `
      SELECT *
      FROM items
      ${whereClause}
      ORDER BY id ASC;
      `,
      params
    );

    res.json(result.rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch items.';
    res.status(400).json({ message });
  }
});

itemsRouter.get('/:id', async (req, res) => {
  const itemId = Number(req.params.id);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    res.status(400).json({ message: 'id must be a positive integer.' });
    return;
  }

  const result = await pool.query<ItemRow>('SELECT * FROM items WHERE id = $1;', [itemId]);
  if (result.rowCount === 0) {
    res.status(404).json({ message: 'Item not found.' });
    return;
  }

  res.json(result.rows[0]);
});

itemsRouter.put('/:id', async (req, res) => {
  const itemId = Number(req.params.id);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    res.status(400).json({ message: 'id must be a positive integer.' });
    return;
  }

  try {
    const payload = parseItemPayload(req.body, true);
    if (payload.category) {
      await ensureCategoryExists(payload.category);
    }

    const updates: string[] = [];
    const values: Array<string | number | boolean> = [];

    const allowedEntries = Object.entries(payload) as Array<[keyof ItemPayload, string | number | boolean]>;
    for (const [key, value] of allowedEntries) {
      updates.push(`${key} = $${values.length + 1}`);
      values.push(value);
    }

    values.push(itemId);

    const result = await pool.query<ItemRow>(
      `
      UPDATE items
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING *;
      `,
      values
    );

    if (result.rowCount === 0) {
      res.status(404).json({ message: 'Item not found.' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update item.';
    res.status(400).json({ message });
  }
});

itemsRouter.delete('/:id', async (req, res) => {
  const itemId = Number(req.params.id);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    res.status(400).json({ message: 'id must be a positive integer.' });
    return;
  }

  const result = await pool.query<ItemRow>(
    `
    UPDATE items
    SET is_active = false, updated_at = NOW()
    WHERE id = $1
    RETURNING *;
    `,
    [itemId]
  );

  if (result.rowCount === 0) {
    res.status(404).json({ message: 'Item not found.' });
    return;
  }

  res.json({ message: 'Item soft-deleted successfully.', item: result.rows[0] });
});
