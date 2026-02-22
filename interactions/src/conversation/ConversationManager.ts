/**
 * Conversation Threading System
 * Manages multi-turn conversations between agents
 */

import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { Logger } from 'winston';
import {
  Interaction,
  Message,
  MessageContent,
  AgentStatus,
  ConversationContext,
} from '../types/interaction.types';
import { InteractionStateMachine } from '../state/InteractionStateMachine';

export class ConversationManager {
  private redis: Redis;
  private db: Pool;
  private stateMachine: InteractionStateMachine;
  private logger: Logger;

  constructor(
    redis: Redis,
    db: Pool,
    stateMachine: InteractionStateMachine,
    logger: Logger
  ) {
    this.redis = redis;
    this.db = db;
    this.stateMachine = stateMachine;
    this.logger = logger;
  }

  /**
   * Initiate a new conversation
   */
  async startConversation(
    initiator: string,
    target: string,
    context: {
      location: string;
      openingMessage?: string;
      type?: string;
    }
  ): Promise<Interaction> {
    // Check availability
    const [initiatorStatus, targetStatus] = await Promise.all([
      this.getAgentStatus(initiator),
      this.getAgentStatus(target),
    ]);

    if (!initiatorStatus.online) {
      throw new Error('Initiator is offline');
    }

    if (targetStatus.availability === 'DO_NOT_DISTURB') {
      throw new Error('Target is not available');
    }

    if (targetStatus.inConversation) {
      throw new Error('Target is busy');
    }

    // Create thread
    const threadId = uuidv4();
    const interactionId = uuidv4();

    // Create interaction
    const interaction: Interaction = {
      id: interactionId,
      type: 'CONVERSATION',
      status: 'PENDING',
      initiator,
      targets: [target],
      location: context.location,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      threadId,
      messageCount: 0,
      metadata: {
        conversationType: context.type || 'casual',
      },
    };

    // Save to database
    await this.db.query(
      `INSERT INTO interactions 
       (id, type, status, initiator, targets, location, started_at, last_activity_at, thread_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        interaction.id,
        interaction.type,
        interaction.status,
        interaction.initiator,
        interaction.targets,
        interaction.location,
        interaction.startedAt,
        interaction.lastActivityAt,
        interaction.threadId,
        JSON.stringify(interaction.metadata),
      ]
    );

    // Create opening message if provided
    if (context.openingMessage) {
      await this.addMessage(interaction, {
        from: initiator,
        content: {
          text: context.openingMessage,
          tone: 'neutral',
        },
      });
    }

    // Lock agents
    await this.lockAgent(initiator, interactionId);
    await this.notifyTarget(target, interaction);

    this.logger.info('Conversation started', {
      interactionId,
      initiator,
      target,
      location: context.location,
    });

    return interaction;
  }

  /**
   * Accept a pending conversation
   */
  async acceptConversation(
    interactionId: string,
    acceptingAgent: string
  ): Promise<Interaction> {
    const interaction = await this.getInteraction(interactionId);

    if (!interaction.targets.includes(acceptingAgent)) {
      throw new Error('Agent is not a target of this interaction');
    }

    if (interaction.status !== 'PENDING') {
      throw new Error('Interaction is not pending');
    }

    // Transition to active
    const updated = await this.stateMachine.transition(
      interaction,
      'ACCEPT',
      {
        acceptedBy: acceptingAgent,
      }
    );

    // Lock target agent
    await this.lockAgent(acceptingAgent, interactionId);

    // Update database
    await this.updateInteraction(updated);

    return updated;
  }

  /**
   * Add message to conversation
   */
  async addMessage(
    interaction: Interaction,
    message: {
      from: string;
      content: MessageContent;
      offer?: any;
      response?: any;
      generationMetadata?: any;
    }
  ): Promise<Message> {
    const msg: Message = {
      id: uuidv4(),
      interactionId: interaction.id,
      threadId: interaction.threadId,
      from: message.from,
      timestamp: new Date(),
      content: message.content,
      offer: message.offer,
      response: message.response,
      generationMetadata: message.generationMetadata,
    };

    // Save to database
    await this.db.query(
      `INSERT INTO messages
       (id, interaction_id, thread_id, from_agent, timestamp, content, offer, response, generation_metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        msg.id,
        msg.interactionId,
        msg.threadId,
        msg.from,
        msg.timestamp,
        JSON.stringify(msg.content),
        msg.offer ? JSON.stringify(msg.offer) : null,
        msg.response ? JSON.stringify(msg.response) : null,
        msg.generationMetadata
          ? JSON.stringify(msg.generationMetadata)
          : null,
      ]
    );

    // Update interaction
    interaction.messageCount++;
    interaction.lastActivityAt = new Date();
    await this.updateInteraction(interaction);

    // Cache in Redis for quick access
    await this.redis.zadd(
      `thread:${interaction.threadId}`,
      msg.timestamp.getTime(),
      JSON.stringify(msg)
    );

    this.logger.debug('Message added', {
      interactionId: interaction.id,
      from: message.from,
      messageLength: message.content.text.length,
    });

    return msg;
  }

  /**
   * Get conversation thread
   */
  async getThread(threadId: string, limit: number = 50): Promise<Message[]> {
    // Try cache first
    const cached = await this.redis.zrevrange(
      `thread:${threadId}`,
      0,
      limit - 1
    );

    if (cached.length > 0) {
      return cached.map((msg) => JSON.parse(msg));
    }

    // Fallback to database
    const result = await this.db.query(
      `SELECT * FROM messages 
       WHERE thread_id = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [threadId, limit]
    );

    return result.rows.reverse().map(this.mapMessageFromRow);
  }

  /**
   * End conversation
   */
  async endConversation(
    interactionId: string,
    endingAgent: string,
    reason: 'COMPLETE' | 'ABANDON'
  ): Promise<Interaction> {
    const interaction = await this.getInteraction(interactionId);

    // Verify agent is participant
    const isParticipant =
      interaction.initiator === endingAgent ||
      interaction.targets.includes(endingAgent);

    if (!isParticipant) {
      throw new Error('Agent is not a participant');
    }

    // Transition
    const trigger = reason === 'COMPLETE' ? 'COMPLETE' : 'ABANDON';
    const updated = await this.stateMachine.transition(
      interaction,
      trigger,
      {
        endedBy: endingAgent,
        reason,
      }
    );

    // Calculate outcomes
    updated.outcomes = await this.calculateOutcomes(interaction);

    // Update database
    await this.updateInteraction(updated);

    // Unlock agents
    await this.unlockAgent(interaction.initiator);
    for (const target of interaction.targets) {
      await this.unlockAgent(target);
    }

    this.logger.info('Conversation ended', {
      interactionId,
      endedBy: endingAgent,
      reason,
      duration: updated.endedAt!.getTime() - updated.startedAt.getTime(),
      messageCount: updated.messageCount,
    });

    return updated;
  }

  /**
   * Calculate interaction outcomes
   */
  private async calculateOutcomes(
    interaction: Interaction
  ): Promise<any> {
    const messages = await this.getThread(interaction.threadId);

    // Simple heuristics for now
    // In production, use AI to analyze conversation sentiment and impact
    return {
      relationshipChanges: [],
      reputationChanges: [],
      emotionalImpact: {
        agentId: interaction.initiator,
        valence: 0.5,
        arousal: 0.3,
        dominantEmotion: 'neutral',
      },
      memorability: Math.min(messages.length / 20, 1),
    };
  }

  /**
   * Get interaction by ID
   */
  async getInteraction(interactionId: string): Promise<Interaction> {
    const result = await this.db.query(
      'SELECT * FROM interactions WHERE id = $1',
      [interactionId]
    );

    if (result.rows.length === 0) {
      throw new Error('Interaction not found');
    }

    return this.mapInteractionFromRow(result.rows[0]);
  }

  /**
   * Update interaction in database
   */
  private async updateInteraction(interaction: Interaction): Promise<void> {
    await this.db.query(
      `UPDATE interactions 
       SET status = $1, 
           last_activity_at = $2, 
           ended_at = $3, 
           message_count = $4,
           outcomes = $5,
           metadata = $6
       WHERE id = $7`,
      [
        interaction.status,
        interaction.lastActivityAt,
        interaction.endedAt || null,
        interaction.messageCount,
        interaction.outcomes ? JSON.stringify(interaction.outcomes) : null,
        JSON.stringify(interaction.metadata),
        interaction.id,
      ]
    );
  }

  /**
   * Get agent status
   */
  private async getAgentStatus(agentId: string): Promise<AgentStatus> {
    const cached = await this.redis.get(`agent:status:${agentId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Default status
    return {
      agentId,
      online: false,
      inConversation: false,
      currentLocation: 'unknown',
      lastSeen: new Date(),
      availability: 'AVAILABLE',
    };
  }

  /**
   * Lock agent (mark as in conversation)
   */
  private async lockAgent(
    agentId: string,
    interactionId: string
  ): Promise<void> {
    await this.redis.setex(
      `agent:lock:${agentId}`,
      3600, // 1 hour
      interactionId
    );
  }

  /**
   * Unlock agent
   */
  private async unlockAgent(agentId: string): Promise<void> {
    await this.redis.del(`agent:lock:${agentId}`);
  }

  /**
   * Notify target of new conversation
   */
  private async notifyTarget(
    targetId: string,
    interaction: Interaction
  ): Promise<void> {
    // Publish to Redis pub/sub for real-time notifications
    await this.redis.publish(
      `agent:${targetId}:notifications`,
      JSON.stringify({
        type: 'INTERACTION_REQUEST',
        interactionId: interaction.id,
        from: interaction.initiator,
        location: interaction.location,
      })
    );
  }

  /**
   * Map database row to Interaction
   */
  private mapInteractionFromRow(row: any): Interaction {
    return {
      id: row.id,
      type: row.type,
      status: row.status,
      initiator: row.initiator,
      targets: row.targets,
      location: row.location,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      lastActivityAt: row.last_activity_at,
      threadId: row.thread_id,
      messageCount: row.message_count,
      metadata: row.metadata || {},
      outcomes: row.outcomes,
    };
  }

  /**
   * Map database row to Message
   */
  private mapMessageFromRow(row: any): Message {
    return {
      id: row.id,
      interactionId: row.interaction_id,
      threadId: row.thread_id,
      from: row.from_agent,
      timestamp: row.timestamp,
      content: row.content,
      offer: row.offer,
      response: row.response,
      generationMetadata: row.generation_metadata,
    };
  }
}
