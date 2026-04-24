import express from 'express';
import cors from 'cors';
import * as path from 'path';
import dotenv from 'dotenv';
import { initializeDatabase } from './db';
import { requireAdminRole } from './middleware/admin-auth';
import { itemsRouter } from './items/items.routes';
import { categoriesRouter } from './categories/categories.routes';
import { billsRouter } from './bills/bills.routes';
import { gstRouter } from './gst/gst.routes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/api', requireAdminRole);

app.use('/api/items', itemsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/bills', billsRouter);
app.use('/api/gst', gstRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.send({ message: 'API is healthy', status: 'ok', timestamp: new Date() });
});

// Basic Root Route
app.get('/api', (req, res) => {
  res.send({ message: 'Welcome to the Hotel Management API' });
});

const port = process.env.PORT || 3333;
initializeDatabase()
  .then(() => {
    const server = app.listen(port, () => {
      console.log(`Listening at http://localhost:${port}/api`);
    });
    server.on('error', console.error);
  })
  .catch((error) => {
    console.error('Failed to initialize database schema:', error);
    process.exit(1);
  });
