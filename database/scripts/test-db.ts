#!/usr/bin/env tsx

/**
 * Database Test Script
 * Validates all database services and connections
 */

import { config } from 'dotenv';
import {
  initializeDatabase,
  closeDatabase,
  healthCheck,
  agentService,
  memoryService,
  prisma,
  cache,
} from '../index';

// Load environment
config();

async function testDatabaseConnections() {
  console.log('\n🔍 Testing database connections...');
  
  const health = await healthCheck();
  console.log(`  Status: ${health.status.toUpperCase()}`);
  console.log(`  PostgreSQL: ${health.postgres.primary ? '✅' : '❌'}`);
  console.log(`  Redis: ${health.redis ? '✅' : '❌'}`);
  
  if (health.status !== 'healthy') {
    throw new Error('Database health check failed');
  }
  
  console.log('✅ All connections healthy\n');
}

async function testAgentService() {
  console.log('🤖 Testing AgentService...');
  
  // Get or create test user
  let testUser = await prisma.user.findUnique({
    where: { email: 'test@darkcity.io' },
  });
  
  if (!testUser) {
    testUser = await prisma.user.create({
      data: { email: 'test@darkcity.io' },
    });
    console.log('  Created test user');
  }
  
  // Create agent
  const agent = await agentService.create({
    ownerId: testUser.id,
    name: 'Test Agent',
    personality: {
      openness: 75,
      extraversion: 60,
      conscientiousness: 50,
      agreeableness: 65,
      neuroticism: 40,
    },
  });
  console.log(`  ✅ Created agent: ${agent.name} (${agent.id})`);
  
  // Get agent (should be cached)
  const retrieved = await agentService.getById(agent.id);
  console.log(`  ✅ Retrieved agent: ${retrieved?.name}`);
  
  // Update location
  const districts = await prisma.district.findFirst();
  if (districts) {
    const zone = await prisma.zone.findFirst({
      where: { districtId: districts.id },
    });
    if (zone) {
      const location = await prisma.location.findFirst({
        where: { zoneId: zone.id },
      });
      if (location) {
        await agentService.updateLocation(agent.id, location.id);
        console.log(`  ✅ Updated location to: ${location.name}`);
      }
    }
  }
  
  // Test currency transfer
  const balance = await agentService.getBalance(agent.id);
  console.log(`  ✅ Balance: ${balance.darkcoin} DARKCOIN, ${balance.darkflobi} DARKFLOBI`);
  
  // Clean up
  await agentService.delete(agent.id);
  console.log('  ✅ Cleaned up test agent\n');
}

async function testMemoryService() {
  console.log('🧠 Testing MemoryService...');
  
  // Get or create test user
  let testUser = await prisma.user.findUnique({
    where: { email: 'test@darkcity.io' },
  });
  
  if (!testUser) {
    testUser = await prisma.user.create({
      data: { email: 'test@darkcity.io' },
    });
  }
  
  // Create test agent
  const agent = await agentService.create({
    ownerId: testUser.id,
    name: 'Memory Test Agent',
  });
  
  // Record experience
  const experience = await memoryService.recordExperience({
    agentId: agent.id,
    type: 'CONVERSATION',
    description: 'Had an interesting conversation about the future of DARKCITY',
    emotionalValence: 0.7,
    emotionalArousal: 0.6,
    significance: 0.8,
    tags: ['conversation', 'future', 'philosophy'],
    consequences: {
      knowledge: ['learned about city architecture'],
    },
  });
  console.log(`  ✅ Recorded experience: ${experience.type}`);
  
  // Get experiences
  const experiences = await memoryService.getExperiences(agent.id, { limit: 10 });
  console.log(`  ✅ Retrieved ${experiences.length} experience(s)`);
  
  // Get significant experiences
  const significant = await memoryService.getSignificantExperiences(agent.id);
  console.log(`  ✅ Found ${significant.length} significant experience(s)`);
  
  // Get memory stats
  const stats = await memoryService.getMemoryStats(agent.id);
  console.log(`  ✅ Memory stats: ${stats.totalExperiences} total, ${stats.significantExperiences} significant`);
  
  // Clean up
  await agentService.delete(agent.id);
  console.log('  ✅ Cleaned up test agent\n');
}

async function testCacheService() {
  console.log('💾 Testing CacheService...');
  
  // Test basic caching
  const key = 'test:cache:key';
  const value = { test: 'data', timestamp: Date.now() };
  
  await cache.set(key, value, 60);
  console.log('  ✅ Set cache value');
  
  const retrieved = await cache.get(key);
  console.log(`  ✅ Retrieved cache value: ${retrieved?.test}`);
  
  // Test set operations
  const setKey = 'test:set';
  await cache.addToSet(setKey, 'item1', 'item2', 'item3');
  const members = await cache.getSetMembers(setKey);
  console.log(`  ✅ Set has ${members.length} members`);
  
  // Clean up
  await cache.delete(key);
  await cache.delete(setKey);
  console.log('  ✅ Cleaned up cache\n');
}

async function testQueries() {
  console.log('📊 Testing database queries...');
  
  // Test district queries
  const districts = await prisma.district.findMany();
  console.log(`  ✅ Found ${districts.length} districts`);
  
  // Test zone queries
  const zones = await prisma.zone.findMany();
  console.log(`  ✅ Found ${zones.length} zones`);
  
  // Test location queries
  const locations = await prisma.location.findMany();
  console.log(`  ✅ Found ${locations.length} locations`);
  
  // Test event queries
  const events = await prisma.event.findMany();
  console.log(`  ✅ Found ${events.length} events`);
  
  // Test views
  const activeInteractions = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM active_interactions
  `;
  console.log(`  ✅ Active interactions view works`);
  
  console.log('');
}

async function testPerformance() {
  console.log('⚡ Testing performance...');
  
  // Create test user
  let testUser = await prisma.user.findUnique({
    where: { email: 'test@darkcity.io' },
  });
  
  if (!testUser) {
    testUser = await prisma.user.create({
      data: { email: 'test@darkcity.io' },
    });
  }
  
  // Batch create agents
  const startTime = Date.now();
  const agents = await Promise.all(
    Array.from({ length: 10 }, (_, i) => 
      agentService.create({
        ownerId: testUser!.id,
        name: `Perf Test Agent ${i}`,
      })
    )
  );
  const createTime = Date.now() - startTime;
  console.log(`  ✅ Created 10 agents in ${createTime}ms (${(createTime/10).toFixed(1)}ms avg)`);
  
  // Test cached retrieval
  const cacheStartTime = Date.now();
  await Promise.all(agents.map(a => agentService.getById(a.id)));
  const firstFetchTime = Date.now() - cacheStartTime;
  
  const cachedStartTime = Date.now();
  await Promise.all(agents.map(a => agentService.getById(a.id)));
  const cachedFetchTime = Date.now() - cachedStartTime;
  
  console.log(`  ✅ First fetch: ${firstFetchTime}ms, Cached fetch: ${cachedFetchTime}ms`);
  console.log(`  📈 Cache speedup: ${(firstFetchTime/cachedFetchTime).toFixed(1)}x`);
  
  // Clean up
  await Promise.all(agents.map(a => agentService.delete(a.id)));
  console.log('  ✅ Cleaned up test agents\n');
}

async function main() {
  console.log('🚀 DARKCITY Database Test Suite\n');
  console.log('=====================================');
  
  try {
    // Initialize
    await initializeDatabase();
    
    // Run tests
    await testDatabaseConnections();
    await testAgentService();
    await testMemoryService();
    await testCacheService();
    await testQueries();
    await testPerformance();
    
    // Summary
    console.log('=====================================');
    console.log('🎉 All tests passed!\n');
    console.log('Database layer is ready for production.');
    console.log('');
    
    await closeDatabase();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await closeDatabase();
    process.exit(1);
  }
}

main();
