import { Router } from 'express';
import { pool } from '../db';

export const tablesRouter = Router();

// GET /tables - list all tables
tablesRouter.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT table_id, table_number, status, created_at FROM tables ORDER BY table_number`
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error('GET /tables error:', err);
    res.status(500).json({ message: 'Failed to fetch tables' });
  }
});

// GET /tables/:tableId - get single table
tablesRouter.get('/:tableId', async (req, res) => {
  const { tableId } = req.params;
  try {
    const result = await pool.query(
      `SELECT table_id, table_number, status, created_at FROM tables WHERE table_id = $1`,
      [tableId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Table not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('GET /tables/:tableId error:', err);
    res.status(500).json({ message: 'Failed to fetch table' });
  }
});

// POST /tables - create table
tablesRouter.post('/', async (req, res) => {
  const { table_number } = req.body;
  if (!table_number) return res.status(400).json({ message: 'table_number is required' });
  try {
    const result = await pool.query(
      `INSERT INTO tables (table_number) VALUES ($1) RETURNING table_id, table_number, status, created_at`,
      [table_number]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ message: 'Table number already exists' });
    console.error('POST /tables error:', err);
    res.status(500).json({ message: 'Failed to create table' });
  }
});

// DELETE /tables/:tableId - delete table
tablesRouter.delete('/:tableId', async (req, res) => {
  const { tableId } = req.params;
  try {
    const existing = await pool.query(`SELECT status FROM tables WHERE table_id = $1`, [tableId]);
    if (existing.rows.length === 0) return res.status(404).json({ message: 'Table not found' });
    if (existing.rows[0].status === 'occupied')
      return res.status(400).json({ message: 'Cannot delete occupied table' });

    await pool.query(`DELETE FROM tables WHERE table_id = $1`, [tableId]);
    res.json({ message: 'Table deleted successfully' });
  } catch (err: any) {
    console.error('DELETE /tables/:tableId error:', err);
    res.status(500).json({ message: 'Failed to delete table' });
  }
});

// GET /tables/:tableId/orders - get all orders for a table
tablesRouter.get('/:tableId/orders', async (req, res) => {
  const { tableId } = req.params;
  try {
    const ordersResult = await pool.query(
      `SELECT o.order_id, o.table_id, o.order_phase, o.status, o.created_at
       FROM orders o WHERE o.table_id = $1 ORDER BY o.order_phase`,
      [tableId]
    );

    const orders = await Promise.all(
      ordersResult.rows.map(async (order) => {
        const itemsResult = await pool.query(
          `SELECT oi.order_item_id, oi.item_id, i.name as item_name,
                  oi.quantity, oi.price_at_billing, oi.gst_percent_at_billing
           FROM order_items oi
           LEFT JOIN items i ON i.id = oi.item_id
           WHERE oi.order_id = $1`,
          [order.order_id]
        );
        return { ...order, items: itemsResult.rows };
      })
    );

    res.json(orders);
  } catch (err: any) {
    console.error('GET /tables/:tableId/orders error:', err);
    res.status(500).json({ message: 'Failed to fetch table orders' });
  }
});

// POST /tables/:tableId/orders - create an order for a table
tablesRouter.post('/:tableId/orders', async (req, res) => {
  const { tableId } = req.params;
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'items array is required and cannot be empty' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check table exists
    const tableCheck = await client.query(`SELECT table_id, status FROM tables WHERE table_id = $1`, [tableId]);
    if (tableCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Table not found' });
    }

    // Determine next order phase for this table
    const phaseResult = await client.query(
      `SELECT COALESCE(MAX(order_phase), 0) + 1 as next_phase FROM orders WHERE table_id = $1`,
      [tableId]
    );
    const orderPhase = phaseResult.rows[0].next_phase;

    // Create the order
    const orderResult = await client.query(
      `INSERT INTO orders (table_id, order_phase, status)
       VALUES ($1, $2, 'open') RETURNING order_id, table_id, order_phase, status, created_at`,
      [tableId, orderPhase]
    );
    const newOrder = orderResult.rows[0];

    // Insert order items
    const orderItems = await Promise.all(
      items.map(async (item: any) => {
        const itemData = await client.query(
          `SELECT id, name, selling_price FROM items WHERE id = $1`,
          [item.id || item.item_id]
        );
        if (itemData.rows.length === 0) throw new Error(`Item ${item.id || item.item_id} not found`);
        const dbItem = itemData.rows[0];

        const itemResult = await client.query(
          `INSERT INTO order_items (order_id, item_id, quantity, price_at_billing, gst_percent_at_billing)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING order_item_id, item_id, quantity, price_at_billing`,
          [newOrder.order_id, dbItem.id, item.quantity || 1, dbItem.selling_price, item.gstRate || 5]
        );
        return { ...itemResult.rows[0], item_name: dbItem.name };
      })
    );

    // Mark table as occupied
    await client.query(`UPDATE tables SET status = 'occupied' WHERE table_id = $1`, [tableId]);

    await client.query('COMMIT');
    res.status(201).json({ ...newOrder, items: orderItems });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('POST /tables/:tableId/orders error:', err);
    res.status(500).json({ message: err.message || 'Failed to create order' });
  } finally {
    client.release();
  }
});
