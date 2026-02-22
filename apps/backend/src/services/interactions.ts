import { DatabaseService } from './database';
import { MemoryService } from './memory';
import { InteractionType, InteractionState, MemoryImportance } from '@darkcity/shared';
import { v4 as uuidv4 } from 'uuid';

export class InteractionService {
  private db: DatabaseService;
  private memory: MemoryService;

  constructor(db: DatabaseService, memory: MemoryService) {
    this.db = db;
    this.memory = memory;
  }

  async initialize() {
    console.log('Interaction service initialized');
  }

  // Create new interaction
  async createInteraction(data: {
    type: InteractionType;
    initiatorId: string;
    participantIds: string[];
    zoneId?: string;
    metadata?: any;
  }) {
    const interaction = await this.db.createInteraction({
      id: uuidv4(),
      type: data.type,
      state: InteractionState.PENDING,
      initiatorId: data.initiatorId,
      participantIds: data.participantIds,
      zoneId: data.zoneId,
      startedAt: new Date(),
      metadata: data.metadata || {}
    });
    
    // Publish to Redis for real-time updates
    await this.db.publish('interactions', {
      type: 'interaction:started',
      data: interaction
    });
    
    return interaction;
  }

  // Start interaction (move to ACTIVE state)
  async startInteraction(interactionId: string) {
    const interaction = await this.db.updateInteraction(interactionId, {
      state: InteractionState.ACTIVE,
      startedAt: new Date()
    });
    
    await this.db.publish('interactions', {
      type: 'interaction:updated',
      data: interaction
    });
    
    return interaction;
  }

  // End interaction
  async endInteraction(interactionId: string, state: InteractionState = InteractionState.COMPLETED) {
    const interaction = await this.db.updateInteraction(interactionId, {
      state,
      endedAt: new Date()
    });
    
    // Create memories for all participants
    if (interaction.type === InteractionType.CONVERSATION) {
      const summary = `Had a conversation with ${interaction.participantIds.length} agent(s)`;
      
      for (const agentId of [interaction.initiatorId, ...interaction.participantIds]) {
        await this.memory.recordConversation(
          agentId,
          interaction.id,
          summary,
          [interaction.initiatorId, ...interaction.participantIds]
        );
      }
    }
    
    await this.db.publish('interactions', {
      type: 'interaction:ended',
      data: interaction
    });
    
    return interaction;
  }

  // Send message in conversation
  async sendMessage(data: {
    interactionId: string;
    senderId: string;
    content: string;
  }) {
    const message = {
      id: uuidv4(),
      interactionId: data.interactionId,
      senderId: data.senderId,
      content: data.content,
      createdAt: new Date()
    };
    
    // Store message in database
    // (Assuming messages table exists in Prisma schema)
    
    // Update interaction metadata
    const interaction = await this.db.getInteraction(data.interactionId);
    const messageCount = (interaction?.metadata as any)?.messageCount || 0;
    
    await this.db.updateInteraction(data.interactionId, {
      metadata: {
        ...interaction?.metadata,
        messageCount: messageCount + 1,
        lastMessageAt: new Date()
      }
    });
    
    // Broadcast message
    await this.db.publish('messages', {
      type: 'message:sent',
      data: message
    });
    
    return message;
  }

  // Create transaction
  async createTransaction(data: {
    initiatorId: string;
    participantId: string;
    offerDetails: {
      type: 'SALE' | 'PURCHASE' | 'TRADE' | 'SERVICE';
      amount: number;
      itemId?: string;
      description: string;
    };
    zoneId?: string;
  }) {
    const interaction = await this.createInteraction({
      type: InteractionType.TRANSACTION,
      initiatorId: data.initiatorId,
      participantIds: [data.participantId],
      zoneId: data.zoneId,
      metadata: {
        offerDetails: data.offerDetails,
        status: 'PROPOSED'
      }
    });
    
    return interaction;
  }

  // Accept transaction
  async acceptTransaction(interactionId: string) {
    const interaction = await this.db.getInteraction(interactionId);
    
    if (!interaction || interaction.type !== InteractionType.TRANSACTION) {
      throw new Error('Invalid transaction');
    }
    
    const metadata = interaction.metadata as any;
    const { offerDetails } = metadata;
    
    // Execute transaction (transfer SOL, items, etc.)
    // This would integrate with Solana blockchain or internal ledger
    
    // Update interaction
    const updated = await this.db.updateInteraction(interactionId, {
      state: InteractionState.COMPLETED,
      endedAt: new Date(),
      metadata: {
        ...metadata,
        status: 'COMPLETED',
        finalAmount: offerDetails.amount
      }
    });
    
    // Record memories
    await this.memory.recordExperience(
      interaction.initiatorId,
      interactionId,
      `Completed ${offerDetails.type} transaction for ${offerDetails.amount} SOL`,
      MemoryImportance.MODERATE
    );
    
    await this.memory.recordExperience(
      interaction.participantIds[0],
      interactionId,
      `Completed ${offerDetails.type} transaction for ${offerDetails.amount} SOL`,
      MemoryImportance.MODERATE
    );
    
    return updated;
  }

  // Get agent interactions
  async getAgentInteractions(agentId: string, filters?: {
    type?: InteractionType;
    state?: InteractionState;
    limit?: number;
  }) {
    // Would query database for interactions where agentId is initiator or participant
    // Simplified for now
    return [];
  }

  // Update reputation based on interaction
  async updateReputation(agentId: string, change: number, reason: string) {
    const agent = await this.db.getAgent(agentId);
    
    if (!agent) {
      throw new Error('Agent not found');
    }
    
    const newReputation = (agent.reputation || 0) + change;
    
    await this.db.updateAgent(agentId, {
      reputation: newReputation
    });
    
    // Record in memory
    if (Math.abs(change) >= 10) {
      await this.memory.recordExperience(
        agentId,
        uuidv4(),
        `Reputation ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)}: ${reason}`,
        MemoryImportance.MODERATE
      );
    }
    
    return newReputation;
  }
}
