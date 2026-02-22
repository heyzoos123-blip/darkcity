/**
 * Payout Service - Handle SOL payments to agents
 */
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction
} from '@solana/web3.js';
import { PayoutRequest } from '../types';

export class PayoutService {
  private connection: Connection;
  private payerKeypair: Keypair | null = null;

  constructor(rpcUrl: string = 'https://api.mainnet-beta.solana.com') {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Initialize with payer keypair
   */
  initialize(secretKey: Uint8Array) {
    this.payerKeypair = Keypair.fromSecretKey(secretKey);
  }

  /**
   * Execute payout to agent
   */
  async executePayout(request: PayoutRequest): Promise<string> {
    if (!this.payerKeypair) {
      throw new Error('Payout service not initialized');
    }

    const recipient = new PublicKey(request.recipientWallet);
    const lamports = Math.floor(request.amountSol * LAMPORTS_PER_SOL);

    // Create transfer transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.payerKeypair.publicKey,
        toPubkey: recipient,
        lamports
      })
    );

    // Send and confirm
    const signature = await this.connection.sendTransaction(
      transaction,
      [this.payerKeypair],
      { skipPreflight: false }
    );

    await this.connection.confirmTransaction(signature, 'confirmed');

    return signature;
  }

  /**
   * Get balance of payer account
   */
  async getBalance(): Promise<number> {
    if (!this.payerKeypair) {
      throw new Error('Payout service not initialized');
    }

    const balance = await this.connection.getBalance(this.payerKeypair.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  /**
   * Verify transaction
   */
  async verifyTransaction(signature: string): Promise<boolean> {
    try {
      const status = await this.connection.getSignatureStatus(signature);
      return status.value?.confirmationStatus === 'confirmed' ||
             status.value?.confirmationStatus === 'finalized';
    } catch (error) {
      return false;
    }
  }

  /**
   * Batch payouts (for efficiency)
   */
  async batchPayouts(requests: PayoutRequest[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    for (const request of requests) {
      try {
        const signature = await this.executePayout(request);
        results.set(request.acceptanceId, signature);
      } catch (error: any) {
        console.error(`Payout failed for ${request.acceptanceId}:`, error.message);
        results.set(request.acceptanceId, `ERROR: ${error.message}`);
      }
    }

    return results;
  }
}
