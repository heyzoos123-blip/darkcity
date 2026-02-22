/**
 * DARKCITY Memory System
 * Main entry point and public API
 */

import DatabaseService from './database';
import ExperienceService from './services/experience.service';
import RetrievalService from './services/retrieval.service';
import ConsolidationService from './services/consolidation.service';
import LLMService from './services/llm.service';

import type {
  MemoryConfig,
  ExperienceEntry,
  MemoryQuery,
  MemoryResult,
  WorkingMemory,
  RelationshipContext,
} from './types';

import { DEFAULT_CONFIG } from './types';

export * from './types';

export class MemorySystem {
  private config: MemoryConfig;
  private db: DatabaseService;
  
  public experience: ExperienceService;
  public retrieval: RetrievalService;
  public consolidation: ConsolidationService;
  public llm: LLMService;

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.db = DatabaseService.getInstance(this.config);

    this.experience = new ExperienceService(this.config);
    this.retrieval = new RetrievalService(this.config);
    this.consolidation = new ConsolidationService(this.config);
    this.llm = new LLMService(this.config);
  }

  // ========================================================================
  // Convenience Methods
  // ========================================================================

  /**
   * Record an experience for an agent
   */
  async recordExperience(
    experience: Omit<ExperienceEntry, 'id' | 'timestamp' | 'embedding'>
  ): Promise<ExperienceEntry> {
    return this.experience.recordExperience(experience);
  }

  /**
   * Get relevant memories for a given context
   */
  async getRelevantMemories(
    agentId: string,
    context: string,
    limit?: number
  ): Promise<MemoryResult[]> {
    return this.retrieval.getRelevantMemories(agentId, context, limit);
  }

  /**
   * Query memories with filters
   */
  async queryMemories(query: MemoryQuery): Promise<MemoryResult[]> {
    return this.retrieval.queryMemories(query);
  }

  /**
   * Get working memory for an agent
   */
  async getWorkingMemory(agentId: string): Promise<WorkingMemory | null> {
    return this.experience.getWorkingMemory(agentId);
  }

  /**
   * Get relationship context between two agents
   */
  async getRelationshipContext(
    agentId: string,
    otherAgentId: string
  ): Promise<RelationshipContext | null> {
    return this.retrieval.getRelationshipContext(agentId, otherAgentId);
  }

  /**
   * Assemble complete context for a conversation
   */
  async assembleConversationContext(
    agentId: string,
    otherAgentId: string,
    currentContext: string
  ) {
    return this.retrieval.assembleConversationContext(
      agentId,
      otherAgentId,
      currentContext
    );
  }

  /**
   * Search memories semantically
   */
  async searchMemories(
    agentId: string,
    searchText: string,
    limit?: number
  ): Promise<MemoryResult[]> {
    return this.retrieval.searchMemories(agentId, searchText, limit);
  }

  /**
   * Get memory statistics for an agent
   */
  async getMemoryStats(agentId: string) {
    return this.retrieval.getMemoryStats(agentId);
  }

  /**
   * Run consolidation for all agents on a given date
   */
  async consolidateAllAgents(date: Date = new Date()) {
    return this.consolidation.consolidateAllAgents(date);
  }

  /**
   * Run consolidation for a specific agent
   */
  async consolidateAgent(agentId: string, date: Date = new Date()) {
    return this.consolidation.consolidateAgent(agentId, date);
  }

  // ========================================================================
  // Specialized Recording Methods
  // ========================================================================

  async recordConversation(
    agentId: string,
    otherAgentId: string,
    location: string,
    messages: Array<{ from: string; content: string; timestamp: Date }>,
    perception: any
  ) {
    return this.experience.recordConversation(
      agentId,
      otherAgentId,
      location,
      messages,
      perception
    );
  }

  async recordTransaction(
    agentId: string,
    otherAgentId: string,
    location: string,
    amount: number,
    currency: string,
    itemId?: string,
    perception?: any
  ) {
    return this.experience.recordTransaction(
      agentId,
      otherAgentId,
      location,
      amount,
      currency,
      itemId,
      perception
    );
  }

  async recordLocationVisit(
    agentId: string,
    location: string,
    duration: number,
    perception?: any
  ) {
    return this.experience.recordLocationVisit(agentId, location, duration, perception);
  }

  async recordEvent(
    agentId: string,
    eventType: string,
    description: string,
    location: string,
    participants: string[],
    perception: any,
    consequences?: any
  ) {
    return this.experience.recordEvent(
      agentId,
      eventType,
      description,
      location,
      participants,
      perception,
      consequences
    );
  }

  // ========================================================================
  // System Management
  // ========================================================================

  async healthCheck() {
    return this.db.healthCheck();
  }

  async close() {
    await this.db.close();
  }
}

// Default export
export default MemorySystem;

// Named exports for individual services
export {
  DatabaseService,
  ExperienceService,
  RetrievalService,
  ConsolidationService,
  LLMService,
};
