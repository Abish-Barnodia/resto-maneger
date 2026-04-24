import { Router } from 'express';
import { pool } from '../db';

type CategoryRow = {
  id: number;
  name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

export const categoriesRouter = Router();

categoriesRouter.get('/', async (req, res) => {
  try {
    const includeInactive = String(req.query.include_inactive ?? 'false').toLowerCase() === 'true';

    const result = includeInactive
      ? await pool.query<CategoryRow>('SELECT * FROM categories ORDER BY name ASC;')
      : await pool.query<CategoryRow>('SELECT * FROM categories WHERE is_active = true ORDER BY name ASC;');

    res.json(result.rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch categories.';
    res.status(400).json({ message });
  }
});

categoriesRouter.post('/', async (req, res) => {
  try {
    const { name } = req.body as { name?: unknown };

    if (typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ message: 'name must be a non-empty string.' });
      return;
    }

    const normalizedName = name.trim();

    const exists = await pool.query<CategoryRow>(
      'SELECT * FROM categories WHERE LOWER(name) = LOWER($1) LIMIT 1;',
      [normalizedName]
    );

    if (exists.rowCount && exists.rows[0]) {
      if (!exists.rows[0].is_active) {
        const revived = await pool.query<CategoryRow>(
          'UPDATE categories SET is_active = true, updated_at = NOW() WHERE id = $1 RETURNING *;',
          [exists.rows[0].id]
        );
        res.status(200).json(revived.rows[0]);
        return;
      }

      res.status(409).json({ message: 'Category already exists.' });
      return;
    }

    const result = await pool.query<CategoryRow>(
      'INSERT INTO categories (name, is_active) VALUES ($1, true) RETURNING *;',
      [normalizedName]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create category.';
    res.status(400).json({ message });
  }
});
