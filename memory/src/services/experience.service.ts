/**
 * Experience Recording Service
 * API for recording agent experiences (episodic memory)
 */

import { v4 as uuidv4 } from 'uuid';
import DatabaseService from '../database';
import LLMService from './llm.service';
import type {
  ExperienceEntry,
  ExperienceType,
  Perception,
  Consequences,
  MemoryConfig,
  WorkingMemory,
} from '../types';

export class ExperienceService {
  private db: DatabaseService;
  private llm: LLMService;
  private config: MemoryConfig;

  constructor(config: MemoryConfig) {
    this.config = config;
    this.db = DatabaseService.getInstance(config);
    this.llm = new LLMService(config);
  }

  // ========================================================================
  // Record Experiences
  // ========================================================================

  async recordExperience(experience: Omit<ExperienceEntry, 'id' | 'timestamp' | 'embedding'>): Promise<ExperienceEntry> {
    const id = uuidv4();
    const timestamp = new Date();

    // Insert into PostgreSQL
    const result = await this.db.queryOne<ExperienceEntry>(`
      INSERT INTO experiences (
        id, agent_id, timestamp, type,
        event_type, event_description, event_location, event_participants, event_metadata,
        emotional_valence, emotional_arousal, significance, surprise,
        relationship_deltas, resource_deltas, knowledge_gained, reputation_deltas,
        tags
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17,
        $18
      ) RETURNING *
    `, [
      id,
      experience.agentId,
      timestamp,
      experience.type,
      experience.event.type,
      experience.event.description,
      experience.event.location,
      experience.event.participants,
      JSON.stringify(experience.event.metadata || {}),
      experience.perception.emotional_valence,
      experience.perception.emotional_arousal,
      experience.perception.significance,
      experience.perception.surprise,
      JSON.stringify(experience.consequences.relationships),
      JSON.stringify(experience.consequences.resources),
      experience.consequences.knowledge,
      JSON.stringify(experience.consequences.reputation),
      experience.tags,
    ]);

    if (!result) {
      throw new Error('Failed to record experience');
    }

    // Update working memory
    await this.updateWorkingMemory(experience.agentId, result);

    // Generate embedding asynchronously (don't block)
    this.generateAndStoreEmbedding(result).catch(err => {
      console.error('Failed to generate embedding:', err);
    });

    return result;
  }

  async recordConversation(
    agentId: string,
    otherAgentId: string,
    location: string,
    messages: Array<{ from: string; content: string; timestamp: Date }>,
    perception: Perception
  ): Promise<ExperienceEntry> {
    const description = `Had a conversation with agent ${otherAgentId.slice(0, 8)}`;
    const messageCount = messages.length;
    
    return this.recordExperience({
      agentId,
      type: 'CONVERSATION',
      event: {
        type: 'CONVERSATION',
        description,
        location,
        participants: [otherAgentId],
        metadata: {
          messageCount,
          duration: messages[messages.length - 1].timestamp.getTime() - messages[0].timestamp.getTime(),
          preview: messages.slice(0, 3).map(m => m.content.slice(0, 100)),
        },
      },
      perception,
      consequences: {
        relationships: [{
          agentId: otherAgentId,
          sentimentDelta: perception.emotional_valence * 10,
          trustDelta: perception.significance * 5,
          reason: 'conversation',
        }],
        resources: [],
        knowledge: [],
        reputation: [],
      },
      tags: ['conversation', 'social'],
    });
  }

  async recordTransaction(
    agentId: string,
    otherAgentId: string,
    location: string,
    amount: number,
    currency: string,
    itemId?: string,
    perception?: Perception
  ): Promise<ExperienceEntry> {
    const description = `Transaction: ${amount} ${currency}${itemId ? ` for item ${itemId}` : ''}`;
    
    return this.recordExperience({
      agentId,
      type: 'TRANSACTION',
      event: {
        type: 'TRANSACTION',
        description,
        location,
        participants: [otherAgentId],
        metadata: {
          amount,
          currency,
          itemId,
        },
      },
      perception: perception || {
        emotional_valence: 0.3,
        emotional_arousal: 0.4,
        significance: Math.min(amount / 1000, 1),
        surprise: 0.2,
      },
      consequences: {
        relationships: [{
          agentId: otherAgentId,
          sentimentDelta: 2,
          trustDelta: 5,
          reason: 'successful transaction',
        }],
        resources: [{
          type: currency === 'DARKFLOBI' ? 'DARKFLOBI' : 'DARKCOIN',
          amount: -amount,
          itemId,
        }],
        knowledge: [],
        reputation: [{
          scope: 'GLOBAL',
          delta: 1,
          reason: 'completed transaction',
        }],
      },
      tags: ['transaction', 'economy'],
    });
  }

  async recordLocationVisit(
    agentId: string,
    location: string,
    duration: number,
    perception?: Perception
  ): Promise<ExperienceEntry> {
    return this.recordExperience({
      agentId,
      type: 'LOCATION_VISITED',
      event: {
        type: 'LOCATION_VISIT',
        description: `Visited location ${location}`,
        location,
        participants: [],
        metadata: { duration },
      },
      perception: perception || {
        emotional_valence: 0,
        emotional_arousal: 0.3,
        significance: 0.1,
        surprise: 0.2,
      },
      consequences: {
        relationships: [],
        resources: [],
        knowledge: [`visited_${location}`],
        reputation: [],
      },
      tags: ['location', 'travel'],
    });
  }

  async recordEvent(
    agentId: string,
    eventType: string,
    description: string,
    location: string,
    participants: string[],
    perception: Perception,
    consequences?: Partial<Consequences>
  ): Promise<ExperienceEntry> {
    return this.recordExperience({
      agentId,
      type: participants.length > 0 ? 'EVENT_PARTICIPATED' : 'EVENT_WITNESSED',
      event: {
        type: eventType,
        description,
        location,
        participants,
      },
      perception,
      consequences: {
        relationships: consequences?.relationships || [],
        resources: consequences?.resources || [],
        knowledge: consequences?.knowledge || [],
        reputation: consequences?.reputation || [],
      },
      tags: ['event', eventType.toLowerCase()],
    });
  }

  // ========================================================================
  // Working Memory Management
  // ========================================================================

  private async updateWorkingMemory(agentId: string, experience: ExperienceEntry): Promise<void> {
    const key = `agent:${agentId}:working_memory`;
    
    // Get current working memory
    let workingMemory = await this.db.getWorkingMemory<WorkingMemory>(key);
    
    if (!workingMemory) {
      workingMemory = {
        agentId,
        currentLocation: experience.event.location,
        status: 'ACTIVE',
        mood: {
          valence: experience.perception.emotional_valence,
          arousal: experience.perception.emotional_arousal,
          dominantEmotion: 'neutral',
        },
        activeConversations: [],
        recentEvents: [],
        shortTermGoals: [],
        immediateContext: {},
        ttl: 3600,
        lastUpdated: new Date(),
      };
    }

    // Update mood (weighted average with decay)
    const decayFactor = 0.7;
    workingMemory.mood.valence = 
      (workingMemory.mood.valence * decayFactor) + 
      (experience.perception.emotional_valence * (1 - decayFactor));
    workingMemory.mood.arousal = 
      (workingMemory.mood.arousal * decayFactor) + 
      (experience.perception.emotional_arousal * (1 - decayFactor));

    // Update recent events (keep last 10)
    workingMemory.recentEvents.unshift(experience.id);
    workingMemory.recentEvents = workingMemory.recentEvents.slice(0, 10);

    // Update location if changed
    if (experience.type === 'LOCATION_VISITED') {
      workingMemory.currentLocation = experience.event.location;
    }

    workingMemory.lastUpdated = new Date();

    // Store back to Redis
    await this.db.setWorkingMemory(key, workingMemory, 3600);
  }

  async getWorkingMemory(agentId: string): Promise<WorkingMemory | null> {
    const key = `agent:${agentId}:working_memory`;
    return this.db.getWorkingMemory<WorkingMemory>(key);
  }

  // ========================================================================
  // Embedding Generation
  // ========================================================================

  private async generateAndStoreEmbedding(experience: ExperienceEntry): Promise<void> {
    try {
      // Create text representation for embedding
      const text = this.experienceToText(experience);
      
      // Generate embedding
      const embedding = await this.llm.generateEmbedding(text);

      // Store in Qdrant
      const collectionName = `agent_${experience.agentId}_memories`;
      await this.db.upsertVectors(collectionName, [{
        id: experience.id,
        vector: embedding,
        payload: {
          agentId: experience.agentId,
          type: experience.type,
          timestamp: experience.timestamp.toISOString(),
          location: experience.event.location,
          participants: experience.event.participants,
          significance: experience.perception.significance,
          tags: experience.tags,
          description: experience.event.description,
        },
      }]);

      // Update PostgreSQL with embedding reference
      await this.db.query(`
        UPDATE experiences 
        SET consolidated_into = $1 
        WHERE id = $2
      `, [collectionName, experience.id]);

      console.log(`Generated embedding for experience ${experience.id}`);
    } catch (error) {
      console.error('Embedding generation failed:', error);
      // Don't throw - embedding is nice to have but not critical
    }
  }

  private experienceToText(experience: ExperienceEntry): string {
    const parts = [
      `Type: ${experience.type}`,
      `Description: ${experience.event.description}`,
      `Location: ${experience.event.location}`,
    ];

    if (experience.event.participants.length > 0) {
      parts.push(`Participants: ${experience.event.participants.join(', ')}`);
    }

    if (experience.tags.length > 0) {
      parts.push(`Tags: ${experience.tags.join(', ')}`);
    }

    if (experience.consequences.knowledge.length > 0) {
      parts.push(`Knowledge: ${experience.consequences.knowledge.join(', ')}`);
    }

    return parts.join('\n');
  }

  // ========================================================================
  // Query Experiences
  // ========================================================================

  async getExperienceById(id: string): Promise<ExperienceEntry | null> {
    return this.db.queryOne<ExperienceEntry>(`
      SELECT * FROM experiences WHERE id = $1
    `, [id]);
  }

  async getExperiencesByAgent(
    agentId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<ExperienceEntry[]> {
    return this.db.query<ExperienceEntry>(`
      SELECT * FROM experiences 
      WHERE agent_id = $1 
      ORDER BY timestamp DESC 
      LIMIT $2 OFFSET $3
    `, [agentId, limit, offset]);
  }

  async getExperiencesByDateRange(
    agentId: string,
    start: Date,
    end: Date
  ): Promise<ExperienceEntry[]> {
    return this.db.query<ExperienceEntry>(`
      SELECT * FROM experiences 
      WHERE agent_id = $1 
        AND timestamp >= $2 
        AND timestamp <= $3
      ORDER BY timestamp ASC
    `, [agentId, start, end]);
  }

  async getExperienceCount(agentId: string): Promise<number> {
    const result = await this.db.queryOne<{ count: string }>(`
      SELECT COUNT(*) as count 
      FROM experiences 
      WHERE agent_id = $1
    `, [agentId]);

    return parseInt(result?.count || '0');
  }
}

export default ExperienceService;
