import pkg from 'express';
const { Request, Response, NextFunction } = pkg;
import jwt from 'jsonwebtoken';
import { getTenantConnection } from '../config/dbPool.ts';

export interface TenantRequest extends pkg.Request {
  tenantId?: string;
  tenantDb?: any;
}

export const apiGateway = async (req: TenantRequest, res: pkg.Response, next: pkg.NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
    return; 
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const decoded = jwt.verify(token, secret) as { tenantId: string };

    req.tenantId = decoded.tenantId;
    req.tenantDb = await getTenantConnection(decoded.tenantId);

    next();
  } catch (err) {
    res.status(403).json({ error: 'Forbidden: Invalid token signature or expired session' });
  }
};
