import express from 'express'; // Trigger rebuild
import cors from 'cors';
import * as path from 'path';
import dotenv from 'dotenv';
import { initializeDatabase } from './db';
import { requireAdminRole } from './middleware/admin-auth';
import { itemsRouter } from './items/items.routes';
import { categoriesRouter } from './categories/categories.routes';
import { billsRouter } from './bills/bills.routes';
import { gstRouter } from './gst/gst.routes';
import { receiptRouter } from './receipt/receipt.routes';

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    'http://localhost:4200',
    'https://localhost:4200',
    process.env.FRONTEND_URL || 'http://localhost:4200'
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
// Health check (Public)
app.get('/api/health', (req, res) => {
  console.log('Health check ping received');
  res.send({
    message: 'API is healthy',
    status: 'ok',
    timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })
  });
});

app.use('/api', requireAdminRole);

app.use('/api/items', itemsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/bills', billsRouter);
app.use('/api/gst-config', gstRouter);
app.use('/api/receipt-layout', receiptRouter);

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
