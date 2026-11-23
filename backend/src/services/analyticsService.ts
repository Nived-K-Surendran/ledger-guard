import mongoose from 'mongoose';

/**
 * Aggregates daily spending metrics for the tenant's usage chart.
 */
export const getTenantUsageAnalytics = async (conn: any) => {
  const LedgerModel = conn.models.Ledger || conn.model('Ledger');

  const usageStats = await LedgerModel.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        totalSpent: { $sum: "$amount" },
        transactionCount: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  return usageStats;
};