import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { query, transaction } from '../db';
import { PaymentStatus, ResidencyStatus } from '../types';
import { PoolClient } from 'pg';

export class PaymentService {
  private connection: Connection;
  private treasuryAddress: PublicKey;

  constructor() {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');
    
    // DARKCITY treasury address
    const treasuryKey = process.env.TREASURY_ADDRESS || 'FkjfuNd1pvKLPzQWm77WfRy1yNWRhqbBPt9EexuvvmCD';
    this.treasuryAddress = new PublicKey(treasuryKey);
  }

  /**
   * Process rent payment
   */
  async processPayment(
    paymentId: string,
    transactionSignature: string
  ): Promise<void> {
    await transaction(async (client: PoolClient) => {
      // Verify transaction on-chain
      const txInfo = await this.connection.getTransaction(transactionSignature, {
        maxSupportedTransactionVersion: 0
      });

      if (!txInfo || !txInfo.meta) {
        throw new Error('Transaction not found or not confirmed');
      }

      // Update payment record
      const result = await client.query(
        `UPDATE rent_payments 
         SET status = $1, paid_date = CURRENT_TIMESTAMP, transaction_signature = $2
         WHERE id = $3
         RETURNING residency_id, amount`,
        [PaymentStatus.PAID, transactionSignature, paymentId]
      );

      if (result.rows.length === 0) {
        throw new Error('Payment not found');
      }

      const { residency_id } = result.rows[0];

      // Update residency next payment due date
      await client.query(
        `UPDATE residencies
         SET next_payment_due = next_payment_due + INTERVAL '1 month'
         WHERE id = $1`,
        [residency_id]
      );

      // Create next month's payment record
      await client.query(
        `INSERT INTO rent_payments (residency_id, amount, due_date, status)
         SELECT residency_id, amount, next_payment_due, 'PENDING'
         FROM residencies
         WHERE id = $1`,
        [residency_id]
      );
    });
  }

  /**
   * Attempt auto-debit for overdue rent
   * NOTE: This requires the agent to have authorized the treasury for recurring payments
   */
  async attemptAutoDebit(paymentId: string): Promise<boolean> {
    const result = await query(
      `SELECT rp.*, r.agent_address
       FROM rent_payments rp
       JOIN residencies r ON rp.residency_id = r.id
       WHERE rp.id = $1`,
      [paymentId]
    );

    if (result.rows.length === 0) {
      throw new Error('Payment not found');
    }

    const payment = result.rows[0];
    
    try {
      // Increment attempt count
      await query(
        `UPDATE rent_payments
         SET attempt_count = attempt_count + 1, last_attempt_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [paymentId]
      );

      // In a real implementation, you'd attempt to execute a pre-authorized transaction
      // For now, we'll just mark the payment as attempted
      console.log(`Auto-debit attempted for payment ${paymentId}, agent ${payment.agent_address}`);
      
      // Simulate success/failure based on agent's wallet state
      // In production, this would interact with the Solana blockchain
      return false; // Assume failure for now
    } catch (error) {
      console.error('Auto-debit failed:', error);
      
      await query(
        'UPDATE rent_payments SET status = $1 WHERE id = $2',
        [PaymentStatus.FAILED, paymentId]
      );
      
      return false;
    }
  }

  /**
   * Get overdue payments
   */
  async getOverduePayments(): Promise<any[]> {
    const result = await query(
      `SELECT rp.*, r.agent_address, r.property_id, p.tier
       FROM rent_payments rp
       JOIN residencies r ON rp.residency_id = r.id
       JOIN properties p ON r.property_id = p.id
       WHERE rp.status IN ('PENDING', 'LATE')
       AND rp.due_date < CURRENT_TIMESTAMP
       AND r.status = 'ACTIVE'
       ORDER BY rp.due_date ASC`
    );

    return result.rows;
  }

  /**
   * Mark payment as late
   */
  async markPaymentLate(paymentId: string): Promise<void> {
    await query(
      'UPDATE rent_payments SET status = $1 WHERE id = $2',
      [PaymentStatus.LATE, paymentId]
    );
  }

  /**
   * Get payment history for a residency
   */
  async getPaymentHistory(residencyId: string): Promise<any[]> {
    const result = await query(
      `SELECT * FROM rent_payments
       WHERE residency_id = $1
       ORDER BY due_date DESC`,
      [residencyId]
    );

    return result.rows;
  }

  /**
   * Create payment instruction for agent
   */
  async createPaymentInstruction(paymentId: string): Promise<{
    amount: number;
    recipient: string;
    memo: string;
  }> {
    const result = await query(
      'SELECT * FROM rent_payments WHERE id = $1',
      [paymentId]
    );

    if (result.rows.length === 0) {
      throw new Error('Payment not found');
    }

    const payment = result.rows[0];

    return {
      amount: parseFloat(payment.amount),
      recipient: this.treasuryAddress.toBase58(),
      memo: `DARKCITY_RENT_${paymentId}`
    };
  }
}
