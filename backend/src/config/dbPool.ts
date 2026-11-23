import mongoose from 'mongoose';

const tenantConnections: Record<string, any> = {};

export const getTenantConnection = async (tenantId: string): Promise<any> => {
  if (tenantConnections[tenantId]) {
    return tenantConnections[tenantId];
  }

  const baseUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
  const tenantUri = `${baseUri}/ledgerguard_${tenantId}`;

  const conn = await mongoose.createConnection(tenantUri).asPromise();
  tenantConnections[tenantId] = conn;
  
  console.log(`[Database Pool] Connected to isolated cluster for tenant: ${tenantId}`);
  return conn;
};