/**
 * DARKCITY Memory System - Integration Tests
 */

import MemorySystem from '../index';
import { ExperienceType } from '../types';

describe('DARKCITY Memory System', () => {
  let memory: MemorySystem;
  const testAgentId = 'test-agent-001';
  const otherAgentId = 'test-agent-002';
  const testLocation = 'test-location-downtown';

  beforeAll(async () => {
    memory = new MemorySystem();
    
    // Check health
    const health = await memory.healthCheck();
    if (!health.postgres || !health.redis || !health.qdrant) {
      throw new Error('Database health check failed');
    }
  });

  afterAll(async () => {
    await memory.close();
  });

  describe('Experience Recording', () => {
    test('should record a location visit', async () => {
      const experience = await memory.recordLocationVisit(
        testAgentId,
        testLocation,
        1800,
        {
          emotional_valence: 0.5,
          emotional_arousal: 0.3,
          significance: 0.4,
          surprise: 0.2,
        }
      );

      expect(experience.id).toBeDefined();
      expect(experience.agentId).toBe(testAgentId);
      expect(experience.type).toBe('LOCATION_VISITED');
      expect(experience.event.location).toBe(testLocation);
    });

    test('should record a conversation', async () => {
      const messages = [
        { from: testAgentId, content: 'Hello!', timestamp: new Date() },
        { from: otherAgentId, content: 'Hi there!', timestamp: new Date() },
      ];

      const experience = await memory.recordConversation(
        testAgentId,
        otherAgentId,
        testLocation,
        messages,
        {
          emotional_valence: 0.7,
          emotional_arousal: 0.5,
          significance: 0.6,
          surprise: 0.3,
        }
      );

      expect(experience.type).toBe('CONVERSATION');
      expect(experience.event.participants).toContain(otherAgentId);
      expect(experience.consequences.relationships).toHaveLength(1);
    });

    test('should record a transaction', async () => {
      const experience = await memory.recordTransaction(
        testAgentId,
        otherAgentId,
        testLocation,
        50,
        'DARKCOIN'
      );

      expect(experience.type).toBe('TRANSACTION');
      expect(experience.consequences.resources).toBeDefined();
      expect(experience.consequences.resources[0].amount).toBe(-50);
    });

    test('should record a custom event', async () => {
      const experience = await memory.recordEvent(
        testAgentId,
        'TEST_EVENT',
        'This is a test event',
        testLocation,
        [otherAgentId],
        {
          emotional_valence: 0.8,
          emotional_arousal: 0.6,
          significance: 0.9,
          surprise: 0.7,
        },
        {
          reputation: [{
            scope: 'GLOBAL',
            delta: 5,
            reason: 'test achievement',
          }],
          knowledge: ['test_knowledge'],
        }
      );

      expect(experience.type).toBe('EVENT_PARTICIPATED');
      expect(experience.perception.significance).toBe(0.9);
      expect(experience.consequences.reputation).toHaveLength(1);
    });
  });

  describe('Working Memory', () => {
    test('should update working memory after experience', async () => {
      await memory.recordLocationVisit(
        testAgentId,
        testLocation,
        300,
        {
          emotional_valence: 0.6,
          emotional_arousal: 0.4,
          significance: 0.5,
          surprise: 0.3,
        }
      );

      const workingMemory = await memory.getWorkingMemory(testAgentId);

      expect(workingMemory).toBeDefined();
      expect(workingMemory?.agentId).toBe(testAgentId);
      expect(workingMemory?.currentLocation).toBe(testLocation);
      expect(workingMemory?.recentEvents.length).toBeGreaterThan(0);
    });

    test('should track emotional state in working memory', async () => {
      const workingMemory = await memory.getWorkingMemory(testAgentId);

      expect(workingMemory?.mood.valence).toBeDefined();
      expect(workingMemory?.mood.arousal).toBeDefined();
      expect(workingMemory?.mood.valence).toBeGreaterThanOrEqual(-1);
      expect(workingMemory?.mood.valence).toBeLessThanOrEqual(1);
    });
  });

  describe('Memory Retrieval', () => {
    beforeAll(async () => {
      // Record multiple experiences for testing retrieval
      for (let i = 0; i < 5; i++) {
        await memory.recordEvent(
          testAgentId,
          'TEST_SERIES',
          `Test event ${i}`,
          testLocation,
          [],
          {
            emotional_valence: Math.random() * 2 - 1,
            emotional_arousal: Math.random(),
            significance: Math.random(),
            surprise: Math.random(),
          }
        );
      }
    });

    test('should retrieve relevant memories by context', async () => {
      const memories = await memory.getRelevantMemories(
        testAgentId,
        'test events and activities',
        10
      );

      expect(memories).toBeDefined();
      expect(Array.isArray(memories)).toBe(true);
      
      if (memories.length > 0) {
        expect(memories[0].experience).toBeDefined();
        expect(memories[0].combinedScore).toBeDefined();
      }
    });

    test('should query memories with filters', async () => {
      const memories = await memory.queryMemories({
        agentId: testAgentId,
        types: ['EVENT_PARTICIPATED' as ExperienceType],
        minSignificance: 0.3,
        limit: 10,
      });

      expect(Array.isArray(memories)).toBe(true);
      
      for (const mem of memories) {
        expect(mem.experience.agentId).toBe(testAgentId);
        expect(mem.experience.perception.significance).toBeGreaterThanOrEqual(0.3);
      }
    });

    test('should search memories semantically', async () => {
      const results = await memory.searchMemories(
        testAgentId,
        'social interaction',
        5
      );

      expect(Array.isArray(results)).toBe(true);
    });

    test('should get memory statistics', async () => {
      const stats = await memory.getMemoryStats(testAgentId);

      expect(stats.totalExperiences).toBeGreaterThan(0);
      expect(stats.experiencesByType).toBeDefined();
      expect(typeof stats.experiencesByType).toBe('object');
    });
  });

  describe('Relationship Context', () => {
    beforeAll(async () => {
      // Record interactions to build relationship
      await memory.recordConversation(
        testAgentId,
        otherAgentId,
        testLocation,
        [
          { from: testAgentId, content: 'Hey!', timestamp: new Date() },
          { from: otherAgentId, content: 'Hello!', timestamp: new Date() },
        ],
        {
          emotional_valence: 0.8,
          emotional_arousal: 0.5,
          significance: 0.7,
          surprise: 0.4,
        }
      );
    });

    test('should retrieve relationship context', async () => {
      const context = await memory.getRelationshipContext(
        testAgentId,
        otherAgentId
      );

      expect(context).toBeDefined();
      
      if (context) {
        expect(context.relationship).toBeDefined();
        expect(context.relationship.type).toBeDefined();
        expect(context.recentInteractions).toBeDefined();
      }
    });

    test('should assemble conversation context', async () => {
      const context = await memory.assembleConversationContext(
        testAgentId,
        otherAgentId,
        'What should we talk about?'
      );

      expect(context.workingMemory).toBeDefined();
      expect(context.relevantMemories).toBeDefined();
      expect(Array.isArray(context.relevantMemories)).toBe(true);
    });
  });

  describe('Consolidation', () => {
    test('should consolidate memories for a single agent', async () => {
      const result = await memory.consolidateAgent(
        testAgentId,
        new Date()
      );

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.experiencesConsolidated).toBeGreaterThanOrEqual(0);
    }, 30000); // Longer timeout for LLM calls

    test('should create daily summary with narrative', async () => {
      const result = await memory.consolidateAgent(
        testAgentId,
        new Date()
      );

      if (result.summary.narrative) {
        expect(typeof result.summary.narrative).toBe('string');
        expect(result.summary.narrative.length).toBeGreaterThan(0);
      }
    }, 30000);
  });

  describe('Health and System', () => {
    test('should perform health check', async () => {
      const health = await memory.healthCheck();

      expect(health.postgres).toBe(true);
      expect(health.redis).toBe(true);
      expect(health.qdrant).toBe(true);
    });
  });
});
