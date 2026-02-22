import { DatabaseService } from './database';
import { MemoryType, MemoryImportance } from '@darkcity/shared';
import { v4 as uuidv4 } from 'uuid';

export class MemoryService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  async initialize() {
    console.log('Memory service initialized');
  }

  // Create new memory
  async createMemory(data: {
    agentId: string;
    type: MemoryType;
    content: string;
    importance: MemoryImportance;
    metadata?: any;
  }) {
    const memory = await this.db.createMemory({
      id: uuidv4(),
      agentId: data.agentId,
      type: data.type,
      content: data.content,
      importance: data.importance,
      metadata: data.metadata || {},
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 0
    });
    
    return memory;
  }

  // Get agent memories
  async getMemories(agentId: string, filters?: {
    type?: MemoryType;
    importance?: MemoryImportance;
    limit?: number;
  }) {
    const memories = await this.db.getMemories(agentId, {
      type: filters?.type,
      importance: filters?.importance
    });
    
    const limit = filters?.limit || 100;
    return memories.slice(0, limit);
  }

  // Search memories (semantic search would use Qdrant here)
  async searchMemories(agentId: string, query: string, limit: number = 10) {
    // For now, simple text search
    const allMemories = await this.db.getMemories(agentId);
    
    const results = allMemories
      .filter((m: any) => m.content.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);
    
    return results;
  }

  // Working memory (short-term context in Redis)
  async setWorkingMemory(agentId: string, data: any) {
    await this.db.setWorkingMemory(agentId, data, 3600); // 1 hour TTL
  }

  async getWorkingMemory(agentId: string) {
    return this.db.getWorkingMemory(agentId);
  }

  // Update working memory field
  async updateWorkingMemory(agentId: string, updates: any) {
    const current = await this.getWorkingMemory(agentId) || {};
    const updated = { ...current, ...updates };
    await this.setWorkingMemory(agentId, updated);
    return updated;
  }

  // Get recent significant memories for context
  async getContextMemories(agentId: string, limit: number = 10) {
    const memories = await this.db.getMemories(agentId, {
      importance: { in: [MemoryImportance.SIGNIFICANT, MemoryImportance.CRITICAL] }
    });
    
    return memories.slice(0, limit);
  }

  // Record experience (from event)
  async recordExperience(agentId: string, eventId: string, description: string, importance: MemoryImportance) {
    return this.createMemory({
      agentId,
      type: MemoryType.EXPERIENCE,
      content: description,
      importance,
      metadata: {
        eventId,
        timestamp: new Date()
      }
    });
  }

  // Record conversation
  async recordConversation(agentId: string, interactionId: string, summary: string, participants: string[]) {
    return this.createMemory({
      agentId,
      type: MemoryType.CONVERSATION,
      content: summary,
      importance: MemoryImportance.MODERATE,
      metadata: {
        interactionId,
        participants,
        timestamp: new Date()
      }
    });
  }

  // Cleanup old trivial memories (optional background task)
  async cleanupOldMemories(agentId: string, olderThanDays: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    // In a real implementation, would delete trivial memories older than cutoff
    // For now, just return count
    const memories = await this.db.getMemories(agentId);
    const oldTrivial = memories.filter(
      (m: any) => m.importance === MemoryImportance.TRIVIAL && 
           m.createdAt < cutoffDate
    );
    
    return oldTrivial.length;
  }
}
