/**
 * Basic Usage Examples
 * Demonstrates core functionality of the DARKCITY Memory System
 */

import MemorySystem from '../src';

async function main() {
  console.log('🧠 DARKCITY Memory System - Basic Usage Examples\n');

  const memory = new MemorySystem();

  // Check system health
  console.log('1. Health Check');
  const health = await memory.healthCheck();
  console.log('   PostgreSQL:', health.postgres ? '✓' : '✗');
  console.log('   Redis:', health.redis ? '✓' : '✗');
  console.log('   Qdrant:', health.qdrant ? '✓' : '✗');
  console.log();

  // Create test agent IDs
  const aliceId = 'agent-alice-001';
  const bobId = 'agent-bob-002';
  const locationId = 'downtown-cafe';

  // ========================================================================
  // 2. Record Experiences
  // ========================================================================
  
  console.log('2. Recording Experiences');

  // Alice visits a cafe
  await memory.recordLocationVisit(
    aliceId,
    locationId,
    3600, // 1 hour
    {
      emotional_valence: 0.6,
      emotional_arousal: 0.3,
      significance: 0.4,
      surprise: 0.2,
    }
  );
  console.log('   ✓ Location visit recorded');

  // Alice has a conversation with Bob
  await memory.recordConversation(
    aliceId,
    bobId,
    locationId,
    [
      { from: aliceId, content: 'Hey Bob! Long time no see!', timestamp: new Date() },
      { from: bobId, content: 'Alice! How have you been?', timestamp: new Date() },
      { from: aliceId, content: 'Great! Working on some exciting projects.', timestamp: new Date() },
      { from: bobId, content: 'Tell me more!', timestamp: new Date() },
    ],
    {
      emotional_valence: 0.8,  // Positive interaction
      emotional_arousal: 0.6,  // Energetic
      significance: 0.7,       // Important reconnection
      surprise: 0.5,           // Somewhat unexpected
    }
  );
  console.log('   ✓ Conversation recorded');

  // Alice buys coffee
  await memory.recordTransaction(
    aliceId,
    'cafe-owner',
    locationId,
    5.50,
    'DARKCOIN'
  );
  console.log('   ✓ Transaction recorded');

  // Alice participates in a local event
  await memory.recordEvent(
    aliceId,
    'COMMUNITY_GATHERING',
    'Attended poetry reading at the cafe',
    locationId,
    [bobId, 'agent-charlie-003', 'agent-dave-004'],
    {
      emotional_valence: 0.7,
      emotional_arousal: 0.5,
      significance: 0.6,
      surprise: 0.3,
    },
    {
      reputation: [{
        scope: 'DISTRICT',
        scopeId: 'downtown',
        delta: 2,
        reason: 'community participation',
      }],
      knowledge: ['poetry_appreciation', 'downtown_culture'],
    }
  );
  console.log('   ✓ Event participation recorded');
  console.log();

  // ========================================================================
  // 3. Working Memory
  // ========================================================================
  
  console.log('3. Working Memory (Current State)');
  const workingMemory = await memory.getWorkingMemory(aliceId);
  
  if (workingMemory) {
    console.log('   Location:', workingMemory.currentLocation);
    console.log('   Status:', workingMemory.status);
    console.log('   Mood:', {
      valence: workingMemory.mood.valence.toFixed(2),
      arousal: workingMemory.mood.arousal.toFixed(2),
      emotion: workingMemory.mood.dominantEmotion,
    });
    console.log('   Recent events:', workingMemory.recentEvents.length);
  }
  console.log();

  // ========================================================================
  // 4. Memory Retrieval
  // ========================================================================
  
  console.log('4. Memory Retrieval');

  // Semantic search
  const relevantMemories = await memory.getRelevantMemories(
    aliceId,
    'social gathering with friends',
    5
  );
  console.log(`   Found ${relevantMemories.length} relevant memories`);
  
  if (relevantMemories.length > 0) {
    const top = relevantMemories[0];
    console.log('   Top match:');
    console.log('     -', top.experience.event.description);
    console.log('     - Relevance:', top.relevanceScore.toFixed(2));
    console.log('     - Recency:', top.recencyScore.toFixed(2));
    console.log('     - Combined:', top.combinedScore.toFixed(2));
  }
  console.log();

  // ========================================================================
  // 5. Relationship Context
  // ========================================================================
  
  console.log('5. Relationship Context');
  const relationshipContext = await memory.getRelationshipContext(aliceId, bobId);
  
  if (relationshipContext) {
    console.log('   Relationship type:', relationshipContext.relationship.type);
    console.log('   Sentiment:', relationshipContext.relationship.sentiment);
    console.log('   Trust:', relationshipContext.relationship.trust);
    console.log('   Interactions:', relationshipContext.relationship.interactionCount);
    console.log('   Memorable moments:', relationshipContext.memorableExperiences.length);
    console.log('   Recent interactions:', relationshipContext.recentInteractions.length);
  } else {
    console.log('   No relationship found (first interaction)');
  }
  console.log();

  // ========================================================================
  // 6. Memory Statistics
  // ========================================================================
  
  console.log('6. Memory Statistics');
  const stats = await memory.getMemoryStats(aliceId);
  console.log('   Total experiences:', stats.totalExperiences);
  console.log('   Significant events:', stats.significantExperiences);
  console.log('   Consolidated days:', stats.consolidatedDays);
  console.log('   Last activity:', stats.lastActivity?.toLocaleString());
  console.log('   By type:');
  
  for (const [type, count] of Object.entries(stats.experiencesByType)) {
    console.log(`     - ${type}: ${count}`);
  }
  console.log();

  // ========================================================================
  // 7. Semantic Search
  // ========================================================================
  
  console.log('7. Semantic Search');
  const searchResults = await memory.searchMemories(
    aliceId,
    'coffee and conversation',
    3
  );
  console.log(`   Found ${searchResults.length} matches:`);
  
  for (const result of searchResults) {
    console.log(`     - ${result.experience.event.description}`);
    console.log(`       Similarity: ${result.relevanceScore.toFixed(2)}`);
  }
  console.log();

  // ========================================================================
  // 8. Conversation Context Assembly
  // ========================================================================
  
  console.log('8. Conversation Context (for AI response)');
  const conversationContext = await memory.assembleConversationContext(
    aliceId,
    bobId,
    'What should we do next?'
  );
  
  console.log('   ✓ Working memory loaded');
  console.log('   ✓ Relevant memories:', conversationContext.relevantMemories.length);
  console.log('   ✓ Relationship context loaded');
  console.log('   ✓ Identity core loaded');
  console.log();

  // ========================================================================
  // 9. Consolidation (Preview)
  // ========================================================================
  
  console.log('9. Memory Consolidation');
  console.log('   To run consolidation:');
  console.log('     npm run consolidate -- --agent=' + aliceId);
  console.log('   This will:');
  console.log('     - Generate daily narrative summary');
  console.log('     - Update personality traits');
  console.log('     - Evolve relationships');
  console.log('     - Create semantic embeddings');
  console.log();

  // Cleanup
  await memory.close();
  console.log('✅ Examples complete!');
}

main().catch(console.error);
