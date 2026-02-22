/**
 * Transaction Protocol
 * Handles offers, negotiation, and atomic completion
 */

import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { Logger } from 'winston';
import {
  Offer,
  OfferResponse,
  TransactionItem,
  Interaction,
} from '../types/interaction.types';

export interface Transaction {
  id: string;
  interactionId: string;
  type: 'PURCHASE' | 'SALE' | 'SERVICE' | 'TRADE';
  buyer: string;
  seller: string;
  items: TransactionItem[];
  price: {
    amount: number;
    currency: 'DARKCOIN' | 'DARKFLOBI';
  };
  status: 'NEGOTIATING' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  negotiationHistory: Offer[];
  createdAt: Date;
  completedAt?: Date;
  transactionHash?: string;
}

export class TransactionService {
  private redis: Redis;
  private db: Pool;
  private logger: Logger;

  constructor(redis: Redis, db: Pool, logger: Logger) {
    this.redis = redis;
    this.db = db;
    this.logger = logger;
  }

  /**
   * Create an offer
   */
  async createOffer(
    interactionId: string,
    from: string,
    offer: Omit<Offer, 'id'>
  ): Promise<Offer> {
    const offerId = uuidv4();
    const fullOffer: Offer = {
      id: offerId,
      ...offer,
    };

    // Store offer
    await this.redis.setex(
      `offer:${offerId}`,
      3600, // 1 hour expiry
      JSON.stringify(fullOffer)
    );

    // Add to negotiation history
    await this.redis.rpush(
      `negotiation:${interactionId}`,
      JSON.stringify({
        offerId,
        from,
        timestamp: new Date().toISOString(),
      })
    );

    this.logger.info('Offer created', {
      offerId,
      interactionId,
      from,
      type: offer.type,
      amount: offer.price.amount,
    });

    return fullOffer;
  }

  /**
   * Respond to an offer
   */
  async respondToOffer(
    offerId: string,
    respondingAgent: string,
    response: OfferResponse
  ): Promise<{ action: string; transaction?: Transaction }> {
    const offerStr = await this.redis.get(`offer:${offerId}`);
    if (!offerStr) {
      throw new Error('Offer not found or expired');
    }

    const offer: Offer = JSON.parse(offerStr);

    if (response.action === 'ACCEPT') {
      // Create transaction
      const transaction = await this.executeTransaction(
        offer,
        respondingAgent
      );
      return { action: 'ACCEPT', transaction };
    } else if (response.action === 'COUNTER' && response.counterOffer) {
      // Create counter-offer
      const counterOffer = await this.createOffer(
        offer.id, // Use original offer ID as interaction reference
        respondingAgent,
        response.counterOffer
      );
      return { action: 'COUNTER' };
    } else {
      // Reject
      await this.redis.del(`offer:${offerId}`);
      return { action: 'REJECT' };
    }
  }

  /**
   * Execute transaction atomically
   */
  private async executeTransaction(
    offer: Offer,
    acceptingAgent: string
  ): Promise<Transaction> {
    const transactionId = uuidv4();

    // Determine buyer and seller
    const buyer = offer.type === 'BUY' ? acceptingAgent : offer.id;
    const seller = offer.type === 'BUY' ? offer.id : acceptingAgent;

    const transaction: Transaction = {
      id: transactionId,
      interactionId: offer.id,
      type: 'PURCHASE',
      buyer,
      seller,
      items: offer.items,
      price: offer.price,
      status: 'PENDING',
      negotiationHistory: [offer],
      createdAt: new Date(),
    };

    // Begin atomic transaction
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // 1. Verify buyer has funds
      const buyerBalance = await this.getBalance(client, buyer);
      if (buyerBalance < offer.price.amount) {
        throw new Error('Insufficient funds');
      }

      // 2. Verify seller has items
      for (const item of offer.items) {
        const hasItem = await this.verifyInventory(
          client,
          seller,
          item.id,
          item.quantity
        );
        if (!hasItem) {
          throw new Error(`Seller does not have item: ${item.id}`);
        }
      }

      // 3. Transfer funds
      await this.transferFunds(
        client,
        buyer,
        seller,
        offer.price.amount,
        offer.price.currency
      );

      // 4. Transfer items
      for (const item of offer.items) {
        await this.transferItem(
          client,
          seller,
          buyer,
          item.id,
          item.quantity
        );
      }

      // 5. Record transaction
      await client.query(
        `INSERT INTO transactions 
         (id, interaction_id, type, buyer, seller, items, price, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          transaction.id,
          transaction.interactionId,
          transaction.type,
          transaction.buyer,
          transaction.seller,
          JSON.stringify(transaction.items),
          JSON.stringify(transaction.price),
          'COMPLETED',
          transaction.createdAt,
        ]
      );

      await client.query('COMMIT');

      transaction.status = 'COMPLETED';
      transaction.completedAt = new Date();

      this.logger.info('Transaction completed', {
        transactionId,
        buyer,
        seller,
        amount: offer.price.amount,
      });

      return transaction;
    } catch (error) {
      await client.query('ROLLBACK');
      transaction.status = 'FAILED';
      
      this.logger.error('Transaction failed', {
        transactionId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get agent balance
   */
  private async getBalance(
    client: any,
    agentId: string
  ): Promise<number> {
    const result = await client.query(
      'SELECT balance FROM agent_balances WHERE agent_id = $1',
      [agentId]
    );
    return result.rows[0]?.balance || 0;
  }

  /**
   * Verify inventory
   */
  private async verifyInventory(
    client: any,
    agentId: string,
    itemId: string,
    quantity: number
  ): Promise<boolean> {
    const result = await client.query(
      `SELECT quantity FROM agent_inventory 
       WHERE agent_id = $1 AND item_id = $2`,
      [agentId, itemId]
    );
    return result.rows[0]?.quantity >= quantity;
  }

  /**
   * Transfer funds
   */
  private async transferFunds(
    client: any,
    from: string,
    to: string,
    amount: number,
    currency: string
  ): Promise<void> {
    // Deduct from sender
    await client.query(
      `UPDATE agent_balances 
       SET balance = balance - $1 
       WHERE agent_id = $2`,
      [amount, from]
    );

    // Add to recipient
    await client.query(
      `UPDATE agent_balances 
       SET balance = balance + $1 
       WHERE agent_id = $2`,
      [amount, to]
    );
  }

  /**
   * Transfer item
   */
  private async transferItem(
    client: any,
    from: string,
    to: string,
    itemId: string,
    quantity: number
  ): Promise<void> {
    // Remove from sender
    await client.query(
      `UPDATE agent_inventory 
       SET quantity = quantity - $1 
       WHERE agent_id = $2 AND item_id = $3`,
      [quantity, from, itemId]
    );

    // Add to recipient (upsert)
    await client.query(
      `INSERT INTO agent_inventory (agent_id, item_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (agent_id, item_id)
       DO UPDATE SET quantity = agent_inventory.quantity + $3`,
      [to, itemId, quantity]
    );
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    agentId: string,
    limit: number = 50
  ): Promise<Transaction[]> {
    const result = await this.db.query(
      `SELECT * FROM transactions 
       WHERE buyer = $1 OR seller = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [agentId, limit]
    );

    return result.rows.map(this.mapTransactionFromRow);
  }

  /**
   * Map database row to Transaction
   */
  private mapTransactionFromRow(row: any): Transaction {
    return {
      id: row.id,
      interactionId: row.interaction_id,
      type: row.type,
      buyer: row.buyer,
      seller: row.seller,
      items: row.items,
      price: row.price,
      status: row.status,
      negotiationHistory: row.negotiation_history || [],
      createdAt: row.created_at,
      completedAt: row.completed_at,
      transactionHash: row.transaction_hash,
    };
  }
}
