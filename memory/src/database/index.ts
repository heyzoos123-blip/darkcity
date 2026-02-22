/**
 * Database Connection Layer
 * Manages connections to PostgreSQL, Redis, and Qdrant
 */

import { Pool, PoolClient } from 'pg';
import Redis from 'ioredis';
import { QdrantClient } from '@qdrant/js-client-rest';
import type { MemoryConfig } from '../types';

export class DatabaseService {
  private static instance: DatabaseService;
  
  private pgPool: Pool;
  private redis: Redis;
  private qdrant: QdrantClient;
  private config: MemoryConfig;

  private constructor(config: MemoryConfig) {
    this.config = config;

    // PostgreSQL connection pool
    this.pgPool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'darkcity',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Redis connection
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    // Qdrant connection
    this.qdrant = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY,
    });

    this.setupEventHandlers();
  }

  static getInstance(config: MemoryConfig): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService(config);
    }
    return DatabaseService.instance;
  }

  private setupEventHandlers(): void {
    this.pgPool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
    });

    this.redis.on('error', (err) => {
      console.error('Redis error:', err);
    });

    this.redis.on('connect', () => {
      console.log('Redis connected');
    });
  }

  // ========================================================================
  // PostgreSQL Methods
  // ========================================================================

  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const start = Date.now();
    const res = await this.pgPool.query(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      console.warn(`Slow query (${duration}ms):`, text);
    }
    
    return res.rows as T[];
  }

  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(text, params);
    return rows[0] || null;
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pgPool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ========================================================================
  // Redis Methods
  // ========================================================================

  async setWorkingMemory(key: string, value: any, ttl: number = 3600): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async getWorkingMemory<T = any>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async deleteWorkingMemory(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async addToList(key: string, value: any, maxLength?: number): Promise<void> {
    await this.redis.lpush(key, JSON.stringify(value));
    if (maxLength) {
      await this.redis.ltrim(key, 0, maxLength - 1);
    }
  }

  async getList<T = any>(key: string, start = 0, end = -1): Promise<T[]> {
    const values = await this.redis.lrange(key, start, end);
    return values.map(v => JSON.parse(v));
  }

  async setHash(key: string, field: string, value: any): Promise<void> {
    await this.redis.hset(key, field, JSON.stringify(value));
  }

  async getHash<T = any>(key: string, field: string): Promise<T | null> {
    const value = await this.redis.hget(key, field);
    return value ? JSON.parse(value) : null;
  }

  async getAllHash<T = any>(key: string): Promise<Record<string, T>> {
    const data = await this.redis.hgetall(key);
    const result: Record<string, T> = {};
    
    for (const [field, value] of Object.entries(data)) {
      result[field] = JSON.parse(value);
    }
    
    return result;
  }

  // ========================================================================
  // Qdrant Methods
  // ========================================================================

  async ensureCollection(collectionName: string): Promise<void> {
    try {
      await this.qdrant.getCollection(collectionName);
    } catch {
      await this.qdrant.createCollection(collectionName, {
        vectors: {
          size: this.config.vectorDimensions,
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 2,
      });
      
      console.log(`Created Qdrant collection: ${collectionName}`);
    }
  }

  async upsertVectors(
    collectionName: string,
    points: Array<{
      id: string;
      vector: number[];
      payload: Record<string, any>;
    }>
  ): Promise<void> {
    await this.ensureCollection(collectionName);
    
    await this.qdrant.upsert(collectionName, {
      wait: true,
      points: points.map(p => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload,
      })),
    });
  }

  async searchVectors(
    collectionName: string,
    vector: number[],
    limit: number,
    filter?: Record<string, any>
  ): Promise<Array<{ id: string; score: number; payload: Record<string, any> }>> {
    try {
      const results = await this.qdrant.search(collectionName, {
        vector,
        limit,
        filter,
        with_payload: true,
      });

      return results.map(r => ({
        id: r.id as string,
        score: r.score,
        payload: r.payload as Record<string, any>,
      }));
    } catch (error) {
      console.error('Vector search error:', error);
      return [];
    }
  }

  async deleteVector(collectionName: string, id: string): Promise<void> {
    await this.qdrant.delete(collectionName, {
      wait: true,
      points: [id],
    });
  }

  // ========================================================================
  // Health Checks
  // ========================================================================

  async healthCheck(): Promise<{
    postgres: boolean;
    redis: boolean;
    qdrant: boolean;
  }> {
    const health = {
      postgres: false,
      redis: false,
      qdrant: false,
    };

    // PostgreSQL
    try {
      await this.query('SELECT 1');
      health.postgres = true;
    } catch (error) {
      console.error('PostgreSQL health check failed:', error);
    }

    // Redis
    try {
      await this.redis.ping();
      health.redis = true;
    } catch (error) {
      console.error('Redis health check failed:', error);
    }

    // Qdrant
    try {
      await this.qdrant.getCollections();
      health.qdrant = true;
    } catch (error) {
      console.error('Qdrant health check failed:', error);
    }

    return health;
  }

  // ========================================================================
  // Cleanup
  // ========================================================================

  async close(): Promise<void> {
    await this.pgPool.end();
    await this.redis.quit();
    console.log('Database connections closed');
  }
}

export default DatabaseService;
