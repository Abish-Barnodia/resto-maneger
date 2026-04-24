import { Router } from 'express';
import { pool } from '../db';

type GstConfigRow = {
  id: number;
  category: string;
  gst_rate: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

export const gstRouter = Router();

gstRouter.get('/config', async (_req, res) => {
  try {
    const result = await pool.query<GstConfigRow>(
      'SELECT * FROM gst_config WHERE is_active = true ORDER BY category ASC;'
    );

    res.json(result.rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch GST configuration.';
    res.status(400).json({ message });
  }
});
