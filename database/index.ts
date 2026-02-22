/**
 * DARKCITY Database Layer
 * Main entry point for database services
 */

// ============================================================================
// DATABASE CLIENTS
// ============================================================================

export { prisma, DatabasePool } from './config/database.config';
export { 
  RedisManager, 
  CacheService, 
  PubSubService, 
  RateLimiter,
  cache,
  pubsub,
  rateLimiter,
  REDIS_CONFIG,
} from './config/redis.config';

// ============================================================================
// SERVICES
// ============================================================================

export { 
  agentService,
  AgentService,
  type CreateAgentInput,
  type UpdateAgentInput,
  type AgentWithIdentity,
} from './services/agent.service';

export {
  memoryService,
  MemoryService,
  type CreateExperienceInput,
  type SearchMemoriesInput,
  type RelationshipContext,
} from './services/memory.service';

// ============================================================================
// PRISMA TYPES
// ============================================================================

export type {
  Agent,
  AgentIdentity,
  AgentStatus,
  Experience,
  ExperienceType,
  DailySummary,
  Relationship,
  RelationshipType,
  District,
  Zone,
  ZoneType,
  Location,
  LocationType,
  Interaction,
  InteractionType,
  InteractionStatus,
  InteractionParticipant,
  Message,
  Transaction,
  TransactionType,
  TransactionStatus,
  Currency,
  Event,
  EventType,
  EventScope,
  ReputationEvent,
  ReputationEventType,
  ReputationScope,
  User,
} from '@prisma/client';

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Initialize database connections
 */
export async function initializeDatabase() {
  console.log('🔌 Initializing database connections...');
  
  try {
    // Test PostgreSQL connection
    const dbHealth = await DatabasePool.healthCheck();
    if (!dbHealth.primary) {
      throw new Error('Primary database connection failed');
    }
    console.log('✅ PostgreSQL connected');
    
    // Test Redis connection
    const redisHealth = await RedisManager.healthCheck();
    if (!redisHealth) {
      throw new Error('Redis connection failed');
    }
    console.log('✅ Redis connected');
    
    console.log('🎉 Database initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Close all database connections gracefully
 */
export async function closeDatabase() {
  console.log('👋 Closing database connections...');
  
  try {
    await Promise.all([
      DatabasePool.close(),
      RedisManager.close(),
    ]);
    
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
    throw error;
  }
}

/**
 * Health check for all database systems
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  postgres: {
    primary: boolean;
    replicas: boolean[];
  };
  redis: boolean;
  timestamp: string;
}> {
  try {
    const [postgresHealth, redisHealth] = await Promise.all([
      DatabasePool.healthCheck(),
      RedisManager.healthCheck(),
    ]);
    
    const allHealthy = postgresHealth.primary && redisHealth;
    const someHealthy = postgresHealth.primary || redisHealth;
    
    return {
      status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
      postgres: postgresHealth,
      redis: redisHealth,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Health check error:', error);
    return {
      status: 'unhealthy',
      postgres: { primary: false, replicas: [] },
      redis: false,
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // Clients
  prisma,
  DatabasePool,
  RedisManager,
  cache,
  pubsub,
  rateLimiter,
  
  // Services
  agentService,
  memoryService,
  
  // Utilities
  initializeDatabase,
  closeDatabase,
  healthCheck,
};
