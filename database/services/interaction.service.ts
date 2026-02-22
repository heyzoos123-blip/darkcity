/**
 * DARKCITY Interaction Service
 * Handles social interactions, conversations, and transactions
 */

import { prisma } from '../config/database.config';
import { cache, pubsub, REDIS_CONFIG } from '../config/redis.config';
import { 
  Interaction, 
  InteractionType, 
  InteractionStatus,
  Message,
  Transaction,
  TransactionStatus,
  Currency,
  Prisma,
} from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateInteractionInput {
  initiatorId: string;
  type: InteractionType;
  locationId?: string;
  targetIds: string[];
}

export interface CreateMessageInput {
  interactionId: string;
  fromAgentId: string;
  content: string;
  tone?: string;
  action?: string;
  offer?: Record<string, any>;
}

export interface CreateTransactionInput {
  buyerId: string;
  sellerId: string;
  items: any[];
  amount: bigint | number;
  currency: Currency;
}

export interface InteractionWithMessages extends Interaction {
  messages: Message[];
  participants: {
    agentId: string;
    role: string;
    joinedAt: Date;
  }[];
}

// ============================================================================
// INTERACTION SERVICE
// ============================================================================

export class InteractionService {
  /**
   * Start a new interaction
   */
  async createInteraction(input: CreateInteractionInput): Promise<Interaction> {
    try {
      // Check if initiator is available
      const initiator = await prisma.agent.findUnique({
        where: { id: input.initiatorId },
      });
      
      if (!initiator) {
        throw new Error('Initiator not found');
      }
      
      if (initiator.status === 'INTERACTING') {
        throw new Error('Initiator is already in an interaction');
      }
      
      // Check if targets are available
      const targets = await prisma.agent.findMany({
        where: {
          id: { in: input.targetIds },
          status: { not: 'INTERACTING' },
        },
      });
      
      if (targets.length !== input.targetIds.length) {
        throw new Error('One or more targets are unavailable');
      }
      
      // Create interaction and add participants in a transaction
      const interaction = await prisma.$transaction(async (tx) => {
        // Create interaction
        const newInteraction = await tx.interaction.create({
          data: {
            type: input.type,
            initiatorId: input.initiatorId,
            locationId: input.locationId,
            status: 'PENDING',
            metadata: {},
          },
        });
        
        // Add initiator as participant
        await tx.interactionParticipant.create({
          data: {
            interactionId: newInteraction.id,
            agentId: input.initiatorId,
            role: 'INITIATOR',
          },
        });
        
        // Add target participants
        for (const targetId of input.targetIds) {
          await tx.interactionParticipant.create({
            data: {
              interactionId: newInteraction.id,
              agentId: targetId,
              role: 'TARGET',
            },
          });
        }
        
        // Update agent statuses
        await tx.agent.update({
          where: { id: input.initiatorId },
          data: { status: 'INTERACTING' },
        });
        
        for (const targetId of input.targetIds) {
          await tx.agent.update({
            where: { id: targetId },
            data: { status: 'INTERACTING' },
          });
        }
        
        return newInteraction;
      });
      
      // Publish interaction started event
      await pubsub.publish(`${REDIS_CONFIG.prefixes.pubsub}global`, {
        type: 'INTERACTION_STARTED',
        interactionId: interaction.id,
        initiatorId: input.initiatorId,
        targetIds: input.targetIds,
        timestamp: new Date(),
      });
      
      return interaction;
    } catch (error) {
      console.error('Error creating interaction:', error);
      throw error;
    }
  }

  /**
   * Get interaction by ID with messages
   */
  async getInteraction(interactionId: string): Promise<InteractionWithMessages | null> {
    try {
      const interaction = await prisma.interaction.findUnique({
        where: { id: interactionId },
        include: {
          messages: {
            orderBy: { timestamp: 'asc' },
          },
          participants: {
            select: {
              agentId: true,
              role: true,
              joinedAt: true,
            },
          },
        },
      });
      
      return interaction as InteractionWithMessages | null;
    } catch (error) {
      console.error('Error fetching interaction:', error);
      throw new Error('Failed to fetch interaction');
    }
  }

  /**
   * Add message to interaction
   */
  async addMessage(input: CreateMessageInput): Promise<Message> {
    try {
      // Verify interaction exists and is active
      const interaction = await prisma.interaction.findUnique({
        where: { id: input.interactionId },
      });
      
      if (!interaction) {
        throw new Error('Interaction not found');
      }
      
      if (interaction.status !== 'ACTIVE' && interaction.status !== 'PENDING') {
        throw new Error('Interaction is not active');
      }
      
      // Verify sender is a participant
      const participant = await prisma.interactionParticipant.findUnique({
        where: {
          interactionId_agentId: {
            interactionId: input.interactionId,
            agentId: input.fromAgentId,
          },
        },
      });
      
      if (!participant) {
        throw new Error('Agent is not a participant in this interaction');
      }
      
      // Create message
      const message = await prisma.message.create({
        data: {
          interactionId: input.interactionId,
          fromAgentId: input.fromAgentId,
          content: input.content,
          tone: input.tone,
          action: input.action,
          offer: input.offer,
        },
      });
      
      // Update interaction status to active if pending
      if (interaction.status === 'PENDING') {
        await prisma.interaction.update({
          where: { id: input.interactionId },
          data: { status: 'ACTIVE' },
        });
      }
      
      // Publish message event
      await pubsub.publish(`${REDIS_CONFIG.prefixes.pubsub}interaction:${input.interactionId}`, {
        type: 'MESSAGE',
        message,
      });
      
      return message;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  /**
   * End an interaction
   */
  async endInteraction(
    interactionId: string,
    reason: string = 'COMPLETED'
  ): Promise<Interaction> {
    try {
      const interaction = await prisma.$transaction(async (tx) => {
        // Get interaction with participants
        const interaction = await tx.interaction.findUnique({
          where: { id: interactionId },
          include: {
            participants: true,
          },
        });
        
        if (!interaction) {
          throw new Error('Interaction not found');
        }
        
        // Update interaction status
        const updated = await tx.interaction.update({
          where: { id: interactionId },
          data: {
            status: reason === 'COMPLETED' ? 'COMPLETED' : 'ABANDONED',
            endedAt: new Date(),
          },
        });
        
        // Update participant left times
        await tx.interactionParticipant.updateMany({
          where: {
            interactionId,
            leftAt: null,
          },
          data: {
            leftAt: new Date(),
          },
        });
        
        // Release agent statuses
        for (const participant of interaction.participants) {
          await tx.agent.update({
            where: { id: participant.agentId },
            data: { status: 'IDLE' },
          });
        }
        
        return updated;
      });
      
      // Publish interaction ended event
      await pubsub.publish(`${REDIS_CONFIG.prefixes.pubsub}interaction:${interactionId}`, {
        type: 'INTERACTION_ENDED',
        interactionId,
        reason,
        timestamp: new Date(),
      });
      
      return interaction;
    } catch (error) {
      console.error('Error ending interaction:', error);
      throw error;
    }
  }

  /**
   * Get active interactions for an agent
   */
  async getActiveInteractions(agentId: string): Promise<Interaction[]> {
    try {
      const participants = await prisma.interactionParticipant.findMany({
        where: {
          agentId,
          leftAt: null,
        },
        include: {
          interaction: true,
        },
      });
      
      return participants
        .map(p => p.interaction)
        .filter(i => i.status === 'ACTIVE' || i.status === 'PENDING');
    } catch (error) {
      console.error('Error fetching active interactions:', error);
      throw new Error('Failed to fetch active interactions');
    }
  }

  /**
   * Get interaction history for an agent
   */
  async getInteractionHistory(
    agentId: string,
    limit: number = 20
  ): Promise<Interaction[]> {
    try {
      const participants = await prisma.interactionParticipant.findMany({
        where: { agentId },
        include: {
          interaction: true,
        },
        orderBy: {
          joinedAt: 'desc',
        },
        take: limit,
      });
      
      return participants.map(p => p.interaction);
    } catch (error) {
      console.error('Error fetching interaction history:', error);
      throw new Error('Failed to fetch interaction history');
    }
  }
}

// ============================================================================
// TRANSACTION SERVICE
// ============================================================================

export class TransactionService {
  /**
   * Create a new transaction
   */
  async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    try {
      // Verify buyer and seller exist
      const [buyer, seller] = await Promise.all([
        prisma.agent.findUnique({ where: { id: input.buyerId } }),
        prisma.agent.findUnique({ where: { id: input.sellerId } }),
      ]);
      
      if (!buyer || !seller) {
        throw new Error('Buyer or seller not found');
      }
      
      // Verify buyer has sufficient funds
      const field = input.currency === 'DARKCOIN' ? 'darkcoinBalance' : 'darkflobiBalance';
      const balance = buyer[field] as bigint;
      const amount = typeof input.amount === 'bigint' ? input.amount : BigInt(input.amount);
      
      if (balance < amount) {
        throw new Error('Insufficient balance');
      }
      
      // Create transaction
      const transaction = await prisma.transaction.create({
        data: {
          buyerId: input.buyerId,
          sellerId: input.sellerId,
          items: input.items,
          amount,
          currency: input.currency,
          type: 'PURCHASE',
          status: 'PENDING',
          negotiationHistory: [],
        },
      });
      
      return transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Execute a transaction (transfer funds)
   */
  async executeTransaction(transactionId: string): Promise<Transaction> {
    try {
      return await prisma.$transaction(async (tx) => {
        // Get transaction
        const transaction = await tx.transaction.findUnique({
          where: { id: transactionId },
        });
        
        if (!transaction) {
          throw new Error('Transaction not found');
        }
        
        if (transaction.status !== 'AGREED') {
          throw new Error('Transaction must be agreed upon before execution');
        }
        
        // Transfer funds
        const field = transaction.currency === 'DARKCOIN' 
          ? 'darkcoinBalance' 
          : 'darkflobiBalance';
        
        // Debit buyer
        await tx.agent.update({
          where: { id: transaction.buyerId },
          data: {
            [field]: { decrement: transaction.amount },
          },
        });
        
        // Credit seller
        await tx.agent.update({
          where: { id: transaction.sellerId },
          data: {
            [field]: { increment: transaction.amount },
          },
        });
        
        // Update transaction status
        const completed = await tx.transaction.update({
          where: { id: transactionId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });
        
        return completed;
      });
    } catch (error) {
      console.error('Error executing transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<Transaction | null> {
    try {
      return await prisma.transaction.findUnique({
        where: { id: transactionId },
      });
    } catch (error) {
      console.error('Error fetching transaction:', error);
      throw new Error('Failed to fetch transaction');
    }
  }

  /**
   * Get agent's transaction history
   */
  async getTransactionHistory(
    agentId: string,
    limit: number = 20
  ): Promise<Transaction[]> {
    try {
      return await prisma.transaction.findMany({
        where: {
          OR: [
            { buyerId: agentId },
            { sellerId: agentId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw new Error('Failed to fetch transaction history');
    }
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transactionId: string,
    status: TransactionStatus
  ): Promise<Transaction> {
    try {
      return await prisma.transaction.update({
        where: { id: transactionId },
        data: { status },
      });
    } catch (error) {
      console.error('Error updating transaction status:', error);
      throw error;
    }
  }
}

// Export singleton instances
export const interactionService = new InteractionService();
export const transactionService = new TransactionService();
