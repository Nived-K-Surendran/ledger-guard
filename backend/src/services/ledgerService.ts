import mongoose from 'mongoose';

// Define the Ledger Schema
const LedgerSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
  status: { type: String, enum: ['SUCCESS', 'ROLLED_BACK'], default: 'SUCCESS' },
  createdAt: { type: Date, default: Date.now }
});

/**
 * Processes a ledger transaction inside an isolated MongoDB ACID transaction session.
 */
export const processLedgerTransaction = async (conn: any, eventId: string, amount: number) => {
  const LedgerModel = conn.models.Ledger || conn.model('Ledger', LedgerSchema);
  
  const session = await conn.startSession();
  session.startTransaction();

  try {
    const existingTransaction = await LedgerModel.findOne({ eventId }).session(session);
    if (existingTransaction) {
      throw new Error('Duplicate transaction event ID detected (Idempotency violation)');
    }

    const transaction = new LedgerModel({
      eventId,
      amount,
      type: 'DEBIT',
      status: 'SUCCESS'
    });
    
    await transaction.save({ session });
    await session.commitTransaction();
    session.endSession();

    return { success: true, transaction };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    
    console.error(`[Ledger Rollback] Transaction rolled back due to: ${error.message}`);
    return { success: false, error: error.message };
  }
};