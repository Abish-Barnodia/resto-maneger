import { Pool, types } from 'pg';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

types.setTypeParser(1114, (value: string) => {
  const normalizedValue = value.trim().replace(' ', 'T');
  return new Date(`${normalizedValue}+05:30`);
});

const envCandidates = [
  path.resolve(process.cwd(), 'apps/api/.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  const hasLegacyUri = Boolean(process.env.DATABASE_URI);
  const hint = hasLegacyUri
    ? 'Found DATABASE_URI, but this API now requires PostgreSQL DATABASE_URL.'
    : 'Set DATABASE_URL in apps/api/.env.';

  throw new Error(`DATABASE_URL is required to start the API. ${hint}`);
}

export const pool = new Pool({
  connectionString,
  options: '-c timezone=Asia/Kolkata',
});

export async function initializeDatabase(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR NOT NULL UNIQUE,
      display_name VARCHAR NOT NULL,
      role VARCHAR NOT NULL DEFAULT 'ADMIN',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    INSERT INTO users (username, display_name, role)
    VALUES ('system_admin', 'System Admin', 'ADMIN')
    ON CONFLICT (username) DO NOTHING;
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_type') THEN
        CREATE TYPE stock_type AS ENUM ('limited', 'unlimited');
      END IF;
    END
    $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR NOT NULL UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      serial_number UUID NOT NULL UNIQUE,
      name VARCHAR NOT NULL,
      selling_price NUMERIC(10,2) NOT NULL,
      category VARCHAR NOT NULL,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      stock_type stock_type NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE items
    ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE items
    ADD COLUMN IF NOT EXISTS image_url TEXT;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS gst_config (
      id SERIAL PRIMARY KEY,
      label VARCHAR NOT NULL,
      category VARCHAR NOT NULL,
      gst_percentage NUMERIC(5,2) NOT NULL CHECK (gst_percentage >= 0),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE gst_config ADD COLUMN IF NOT EXISTS label VARCHAR;
  `);

  await pool.query(`
    UPDATE gst_config SET label = category WHERE label IS NULL;
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gst_config' AND column_name='gst_rate') THEN
        ALTER TABLE gst_config RENAME COLUMN gst_rate TO gst_percentage;
      END IF;
    END
    $$;
  `);

  await pool.query(`
    INSERT INTO gst_config (label, category, gst_percentage)
    SELECT c.name, c.name, 5.00
    FROM categories c
    ON CONFLICT DO NOTHING;
  `);

  await pool.query(`
    CREATE SEQUENCE IF NOT EXISTS bill_serial_number_seq START 1001;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bills (
      id SERIAL PRIMARY KEY,
      bill_serial_number INTEGER NOT NULL UNIQUE DEFAULT nextval('bill_serial_number_seq'),
      cashier_id INTEGER NOT NULL REFERENCES users(id),
      subtotal NUMERIC(10,2) NOT NULL,
      gst_total NUMERIC(10,2) NOT NULL,
      grand_total NUMERIC(10,2) NOT NULL,
      status VARCHAR NOT NULL CHECK (status IN ('draft', 'completed', 'printed')),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bill_items (
      id SERIAL PRIMARY KEY,
      bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES items(id),
      item_name VARCHAR NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price NUMERIC(10,2) NOT NULL,
      gst_rate NUMERIC(5,2) NOT NULL,
      gst_amount NUMERIC(10,2) NOT NULL,
      line_total NUMERIC(10,2) NOT NULL
    );
  `);

  await pool.query(`
    CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await pool.query(`
    DROP TRIGGER IF EXISTS set_items_updated_at ON items;
    CREATE TRIGGER set_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();
  `);

  await pool.query(`
    DROP TRIGGER IF EXISTS set_categories_updated_at ON categories;
    CREATE TRIGGER set_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();
  `);

  await pool.query(`
    DROP TRIGGER IF EXISTS set_gst_config_updated_at ON gst_config;
    CREATE TRIGGER set_gst_config_updated_at
    BEFORE UPDATE ON gst_config
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_items_is_active ON items(is_active);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_gst_config_category ON gst_config(category);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at);');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS receipt_layout (
      id SERIAL PRIMARY KEY,
      logo_url TEXT,
      header_text TEXT,
      footer_text TEXT,
      show_gst_breakdown BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    INSERT INTO receipt_layout (header_text, footer_text)
    SELECT 'RestroManager Hotel', 'Thank you for visiting! Come again.'
    WHERE NOT EXISTS (SELECT 1 FROM receipt_layout);
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id);');
}
