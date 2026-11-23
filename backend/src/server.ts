import pkg from 'express';
const { Request, Response, NextFunction } = pkg;
import dotenv from 'dotenv';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { apiGateway, type TenantRequest } from './middleware/authGateway.ts';
import { processLedgerTransaction } from './services/ledgerService.ts';
import { getTenantUsageAnalytics } from './services/analyticsService.ts';

dotenv.config();

const app = pkg();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(pkg.json());

// 1. Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'success', message: 'LedgerGuard API Gateway is online!' });
});

// 2. Mock Login Route (Issues Tenant JWT Token)
app.post('/api/auth/login', (req, res) => {
  const { tenantId } = req.body;
  
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant ID is required' });
    return;
  }

  const secret = process.env.JWT_SECRET || 'fallback_secret';
  const token = jwt.sign({ tenantId }, secret, { expiresIn: '2h' });

  res.json({ token, tenantId });
});

// 3. Protected Ledger Transaction Route
app.post('/api/ledger/charge', apiGateway, async (req: TenantRequest, res: any) => {
  const { eventId, amount } = req.body;

  if (!eventId || amount === undefined) {
    res.status(400).json({ error: 'eventId and amount are required' });
    return;
  }

  const result = await processLedgerTransaction(req.tenantDb!, eventId, Number(amount));

  if (!result.success) {
    res.status(400).json({ status: 'ROLLED_BACK', error: result.error });
    return;
  }

  res.json({ status: 'SUCCESS', tenantId: req.tenantId, transaction: result.transaction });
});

// 4. Protected Analytics Aggregation Route
app.get('/api/analytics/usage', apiGateway, async (req: TenantRequest, res: any) => {
  try {
    const usageStats = await getTenantUsageAnalytics(req.tenantDb!);
    res.json({ tenantId: req.tenantId, usageStats });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch usage analytics', details: error.message });
  }
});

// Start Backend Server
app.listen(PORT, () => {
  console.log(`[LedgerGuard Backend] API Gateway running on http://localhost:${PORT}`);
});