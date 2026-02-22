/**
 * Memory Retrieval Service
 * Handles semantic search, context assembly, and memory ranking
 */

import DatabaseService from '../database';
import LLMService from './llm.service';
import type {
  MemoryConfig,
  MemoryQuery,
  MemoryResult,
  ExperienceEntry,
  RelationshipContext,
  Relationship,
} from '../types';

export class RetrievalService {
  private db: DatabaseService;
  private llm: LLMService;
  private config: MemoryConfig;

  constructor(config: MemoryConfig) {
    this.config = config;
    this.db = DatabaseService.getInstance(config);
    this.llm = new LLMService(config);
  }

  // ========================================================================
  // Semantic Memory Retrieval
  // ========================================================================

  async getRelevantMemories(
    agentId: string,
    context: string,
    limit: number = 10
  ): Promise<MemoryResult[]> {
    // Generate embedding for context
    const contextVector = await this.llm.generateEmbedding(context);

    // Search semantic memory (Qdrant)
    const collectionName = `agent_${agentId}_memories`;
    const semanticMatches = await this.db.searchVectors(
      collectionName,
      contextVector,
      limit * 2,
      {
        must: [
          {
            key: 'agentId',
            match: { value: agentId },
          },
        ],
        should: [
          {
            key: 'significance',
            range: {
              gte: this.config.vectorSimilarityThreshold,
            },
          },
        ],
      }
    );

    // Fetch full experiences from PostgreSQL
    const experienceIds = semanticMatches.map(m => m.id);
    
    if (experienceIds.length === 0) {
      return [];
    }

    const experiences = await this.db.query<ExperienceEntry>(`
      SELECT * FROM experiences 
      WHERE id = ANY($1)
    `, [experienceIds]);

    // Also get recent memories (recency bias)
    const recentExperiences = await this.db.query<ExperienceEntry>(`
      SELECT * FROM experiences 
      WHERE agent_id = $1 
        AND timestamp > NOW() - INTERVAL '24 hours'
      ORDER BY significance DESC
      LIMIT 5
    `, [agentId]);

    // Merge and rank
    const allExperiences = [...experiences, ...recentExperiences];
    const uniqueExperiences = this.deduplicateExperiences(allExperiences);
    
    return this.rankMemories(uniqueExperiences, semanticMatches, {
      recencyWeight: 0.3,
      relevanceWeight: 0.5,
      significanceWeight: 0.2,
    }).slice(0, limit);
  }

  async queryMemories(query: MemoryQuery): Promise<MemoryResult[]> {
    let sqlQuery = `
      SELECT * FROM experiences 
      WHERE agent_id = $1
    `;
    
    const params: any[] = [query.agentId];
    let paramIndex = 2;

    // Time range filter
    if (query.timeRange) {
      sqlQuery += ` AND timestamp BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(query.timeRange.start, query.timeRange.end);
      paramIndex += 2;
    }

    // Location filter
    if (query.location) {
      sqlQuery += ` AND event_location = $${paramIndex}`;
      params.push(query.location);
      paramIndex++;
    }

    // Participants filter
    if (query.participants && query.participants.length > 0) {
      sqlQuery += ` AND event_participants && $${paramIndex}`;
      params.push(query.participants);
      paramIndex++;
    }

    // Type filter
    if (query.types && query.types.length > 0) {
      sqlQuery += ` AND type = ANY($${paramIndex})`;
      params.push(query.types);
      paramIndex++;
    }

    // Tags filter
    if (query.tags && query.tags.length > 0) {
      sqlQuery += ` AND tags && $${paramIndex}`;
      params.push(query.tags);
      paramIndex++;
    }

    // Significance filter
    if (query.minSignificance !== undefined) {
      sqlQuery += ` AND significance >= $${paramIndex}`;
      params.push(query.minSignificance);
      paramIndex++;
    }

    sqlQuery += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`;
    params.push(query.limit || 100);

    const experiences = await this.db.query<ExperienceEntry>(sqlQuery, params);

    // If context is provided, rank by semantic similarity
    if (query.context) {
      const contextVector = await this.llm.generateEmbedding(query.context);
      const collectionName = `agent_${query.agentId}_memories`;
      const semanticMatches = await this.db.searchVectors(
        collectionName,
        contextVector,
        experiences.length
      );

      return this.rankMemories(experiences, semanticMatches);
    }

    // Otherwise, rank by recency and significance
    return experiences.map(exp => ({
      experience: exp,
      relevanceScore: 0,
      recencyScore: this.calculateRecencyScore(exp.timestamp),
      combinedScore: exp.perception.significance,
    }));
  }

  // ========================================================================
  // Relationship Context
  // ========================================================================

  async getRelationshipContext(
    agentId: string,
    otherAgentId: string
  ): Promise<RelationshipContext | null> {
    // Get relationship summary
    const relationship = await this.db.queryOne<Relationship>(`
      SELECT * FROM relationships 
      WHERE agent_id = $1 AND other_agent_id = $2
    `, [agentId, otherAgentId]);

    if (!relationship) {
      return null;
    }

    // Get memorable shared experiences
    const memorableExperiences = await this.db.query<ExperienceEntry>(`
      SELECT * FROM experiences 
      WHERE agent_id = $1 
        AND $2 = ANY(event_participants)
      ORDER BY significance DESC 
      LIMIT 5
    `, [agentId, otherAgentId]);

    // Get recent interactions
    const recentInteractions = await this.db.query<ExperienceEntry>(`
      SELECT * FROM experiences 
      WHERE agent_id = $1 
        AND $2 = ANY(event_participants)
        AND timestamp > NOW() - INTERVAL '7 days'
      ORDER BY timestamp DESC 
      LIMIT 10
    `, [agentId, otherAgentId]);

    return {
      relationship,
      memorableExperiences,
      recentInteractions,
    };
  }

  // ========================================================================
  // Memory Ranking
  // ========================================================================

  private rankMemories(
    experiences: ExperienceEntry[],
    semanticMatches: Array<{ id: string; score: number }>,
    weights = {
      recencyWeight: 0.3,
      relevanceWeight: 0.5,
      significanceWeight: 0.2,
    }
  ): MemoryResult[] {
    const semanticScoreMap = new Map(
      semanticMatches.map(m => [m.id, m.score])
    );

    return experiences
      .map(exp => {
        const recencyScore = this.calculateRecencyScore(exp.timestamp);
        const relevanceScore = semanticScoreMap.get(exp.id) || 0;
        const significanceScore = exp.perception.significance;

        const combinedScore =
          (recencyScore * weights.recencyWeight) +
          (relevanceScore * weights.relevanceWeight) +
          (significanceScore * weights.significanceWeight);

        return {
          experience: exp,
          relevanceScore,
          recencyScore,
          combinedScore,
        };
      })
      .sort((a, b) => b.combinedScore - a.combinedScore);
  }

  private calculateRecencyScore(timestamp: Date): number {
    const now = new Date();
    const ageInDays = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
    
    // Exponential decay: score = decay^days
    return Math.pow(this.config.recencyDecay, ageInDays);
  }

  private deduplicateExperiences(experiences: ExperienceEntry[]): ExperienceEntry[] {
    const seen = new Set<string>();
    return experiences.filter(exp => {
      if (seen.has(exp.id)) {
        return false;
      }
      seen.add(exp.id);
      return true;
    });
  }

  // ========================================================================
  // Context Assembly
  // ========================================================================

  async assembleConversationContext(
    agentId: string,
    otherAgentId: string,
    currentContext: string
  ): Promise<{
    workingMemory: any;
    relevantMemories: MemoryResult[];
    relationshipContext: RelationshipContext | null;
    identity: any;
  }> {
    // Get working memory
    const workingMemoryKey = `agent:${agentId}:working_memory`;
    const workingMemory = await this.db.getWorkingMemory(workingMemoryKey);

    // Get relevant memories
    const relevantMemories = await this.getRelevantMemories(
      agentId,
      currentContext,
      10
    );

    // Get relationship context
    const relationshipContext = await this.getRelationshipContext(
      agentId,
      otherAgentId
    );

    // Get identity core
    const identity = await this.db.queryOne(`
      SELECT * FROM identity_cores WHERE agent_id = $1
    `, [agentId]);

    return {
      workingMemory,
      relevantMemories,
      relationshipContext,
      identity,
    };
  }

  // ========================================================================
  // Memory Search
  // ========================================================================

  async searchMemories(
    agentId: string,
    searchText: string,
    limit: number = 20
  ): Promise<MemoryResult[]> {
    // Generate embedding for search
    const searchVector = await this.llm.generateEmbedding(searchText);

    // Search Qdrant
    const collectionName = `agent_${agentId}_memories`;
    const results = await this.db.searchVectors(
      collectionName,
      searchVector,
      limit
    );

    // Fetch full experiences
    const experienceIds = results.map(r => r.id);
    
    if (experienceIds.length === 0) {
      return [];
    }

    const experiences = await this.db.query<ExperienceEntry>(`
      SELECT * FROM experiences 
      WHERE id = ANY($1)
    `, [experienceIds]);

    return this.rankMemories(experiences, results);
  }

  async findSimilarExperiences(
    agentId: string,
    experienceId: string,
    limit: number = 5
  ): Promise<MemoryResult[]> {
    // Get the experience
    const experience = await this.db.queryOne<ExperienceEntry>(`
      SELECT * FROM experiences WHERE id = $1
    `, [experienceId]);

    if (!experience) {
      return [];
    }

    // Create text representation
    const text = this.experienceToText(experience);

    // Find similar
    return this.searchMemories(agentId, text, limit);
  }

  private experienceToText(experience: ExperienceEntry): string {
    return [
      experience.event.description,
      experience.event.type,
      ...experience.tags,
      ...experience.consequences.knowledge,
    ].join(' ');
  }

  // ========================================================================
  // Memory Statistics
  // ========================================================================

  async getMemoryStats(agentId: string): Promise<{
    totalExperiences: number;
    experiencesByType: Record<string, number>;
    significantExperiences: number;
    consolidatedDays: number;
    lastActivity: Date | null;
  }> {
    const [
      totalResult,
      typeResults,
      significantResult,
      consolidatedResult,
      lastActivityResult,
    ] = await Promise.all([
      this.db.queryOne<{ count: string }>(`
        SELECT COUNT(*) as count FROM experiences WHERE agent_id = $1
      `, [agentId]),
      
      this.db.query<{ type: string; count: string }>(`
        SELECT type, COUNT(*) as count 
        FROM experiences 
        WHERE agent_id = $1 
        GROUP BY type
      `, [agentId]),
      
      this.db.queryOne<{ count: string }>(`
        SELECT COUNT(*) as count 
        FROM experiences 
        WHERE agent_id = $1 AND significance >= 0.7
      `, [agentId]),
      
      this.db.queryOne<{ count: string }>(`
        SELECT COUNT(*) as count 
        FROM daily_summaries 
        WHERE agent_id = $1
      `, [agentId]),
      
      this.db.queryOne<{ timestamp: Date }>(`
        SELECT MAX(timestamp) as timestamp 
        FROM experiences 
        WHERE agent_id = $1
      `, [agentId]),
    ]);

    const experiencesByType: Record<string, number> = {};
    for (const row of typeResults) {
      experiencesByType[row.type] = parseInt(row.count);
    }

    return {
      totalExperiences: parseInt(totalResult?.count || '0'),
      experiencesByType,
      significantExperiences: parseInt(significantResult?.count || '0'),
      consolidatedDays: parseInt(consolidatedResult?.count || '0'),
      lastActivity: lastActivityResult?.timestamp || null,
    };
  }
}

export default RetrievalService;
