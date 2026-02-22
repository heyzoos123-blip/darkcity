/**
 * DARKCITY Redis Configuration
 * Caching, Pub/Sub, and Session Management
 */

import Redis, { RedisOptions, Cluster } from 'ioredis';

// ============================================================================
// REDIS CONFIGURATION
// ============================================================================

export const REDIS_CONFIG = {
  // Connection settings
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  
  // Cluster mode (for production)
  cluster: {
    enabled: process.env.REDIS_CLUSTER_ENABLED === 'true',
    nodes: process.env.REDIS_CLUSTER_NODES?.split(',').map(node => {
      const [host, port] = node.split(':');
      return { host, port: parseInt(port) };
    }) || [],
  },
  
  // Connection pool settings
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableReadyCheck: true,
  enableOfflineQueue: true,
  
  // TTL defaults (in seconds)
  ttl: {
    agentState: 3600,           // 1 hour
    session: 86400,             // 24 hours
    cache: 300,                 // 5 minutes
    districtCache: 3600,        // 1 hour
    rateLimit: 60,              // 1 minute
  },
  
  // Key prefixes
  prefixes: {
    agent: 'agent:',
    zone: 'zone:',
    session: 'session:',
    cache: 'cache:',
    rate: 'rate:',
    pubsub: 'pubsub:',
  },
};

// ============================================================================
// REDIS CLIENT MANAGER
// ============================================================================

export class RedisManager {
  private static mainClient: Redis | Cluster | null = null;
  private static pubClient: Redis | Cluster | null = null;
  private static subClient: Redis | Cluster | null = null;

  /**
   * Get the main Redis client for general operations
   */
  static getClient(): Redis | Cluster {
    if (!this.mainClient) {
      this.mainClient = this.createClient();
      
      this.mainClient.on('error', (err) => {
        console.error('Redis client error:', err);
      });
      
      this.mainClient.on('connect', () => {
        console.log('Redis client connected');
      });
    }
    
    return this.mainClient;
  }

  /**
   * Get the Pub client (for publishing messages)
   */
  static getPubClient(): Redis | Cluster {
    if (!this.pubClient) {
      this.pubClient = this.createClient();
      
      this.pubClient.on('error', (err) => {
        console.error('Redis pub client error:', err);
      });
    }
    
    return this.pubClient;
  }

  /**
   * Get the Sub client (for subscribing to channels)
   */
  static getSubClient(): Redis | Cluster {
    if (!this.subClient) {
      this.subClient = this.createClient();
      
      this.subClient.on('error', (err) => {
        console.error('Redis sub client error:', err);
      });
      
      this.subClient.on('message', (channel, message) => {
        // Message will be handled by specific subscribers
      });
    }
    
    return this.subClient;
  }

  /**
   * Create a new Redis client based on configuration
   */
  private static createClient(): Redis | Cluster {
    if (REDIS_CONFIG.cluster.enabled && REDIS_CONFIG.cluster.nodes.length > 0) {
      // Cluster mode
      return new Redis.Cluster(REDIS_CONFIG.cluster.nodes, {
        redisOptions: {
          password: REDIS_CONFIG.password,
          maxRetriesPerRequest: REDIS_CONFIG.maxRetriesPerRequest,
          retryStrategy: REDIS_CONFIG.retryStrategy,
        },
        enableReadyCheck: REDIS_CONFIG.enableReadyCheck,
        enableOfflineQueue: REDIS_CONFIG.enableOfflineQueue,
      });
    } else {
      // Standalone mode
      const options: RedisOptions = {
        host: REDIS_CONFIG.host,
        port: REDIS_CONFIG.port,
        password: REDIS_CONFIG.password,
        db: REDIS_CONFIG.db,
        maxRetriesPerRequest: REDIS_CONFIG.maxRetriesPerRequest,
        retryStrategy: REDIS_CONFIG.retryStrategy,
        enableReadyCheck: REDIS_CONFIG.enableReadyCheck,
        enableOfflineQueue: REDIS_CONFIG.enableOfflineQueue,
      };
      
      return new Redis(options);
    }
  }

  /**
   * Close all Redis connections
   */
  static async close(): Promise<void> {
    const promises: Promise<'OK'>[] = [];
    
    if (this.mainClient) {
      promises.push(this.mainClient.quit());
    }
    if (this.pubClient) {
      promises.push(this.pubClient.quit());
    }
    if (this.subClient) {
      promises.push(this.subClient.quit());
    }
    
    await Promise.all(promises);
    
    this.mainClient = null;
    this.pubClient = null;
    this.subClient = null;
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const result = await this.getClient().ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }
}

// ============================================================================
// CACHE HELPER
// ============================================================================

export class CacheService {
  private client: Redis | Cluster;

  constructor() {
    this.client = RedisManager.getClient();
  }

  /**
   * Get a value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set a value in cache with TTL
   */
  async set(
    key: string,
    value: any,
    ttlSeconds?: number
  ): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;
      
      await this.client.del(...keys);
      return keys.length;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return 0;
    }
  }

  /**
   * Get or set (fetch if not cached)
   */
  async getOrSet<T = any>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    // Fetch and cache
    const value = await fetchFn();
    await this.set(key, value, ttlSeconds);
    
    return value;
  }

  /**
   * Increment a counter
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.client.incrby(key, amount);
    } catch (error) {
      console.error('Cache increment error:', error);
      throw error;
    }
  }

  /**
   * Set expiration on existing key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Add to set
   */
  async addToSet(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.sadd(key, ...members);
    } catch (error) {
      console.error('Cache addToSet error:', error);
      throw error;
    }
  }

  /**
   * Remove from set
   */
  async removeFromSet(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.srem(key, ...members);
    } catch (error) {
      console.error('Cache removeFromSet error:', error);
      throw error;
    }
  }

  /**
   * Get set members
   */
  async getSetMembers(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      console.error('Cache getSetMembers error:', error);
      return [];
    }
  }

  /**
   * Add to sorted set with score
   */
  async addToSortedSet(
    key: string,
    score: number,
    member: string
  ): Promise<number> {
    try {
      return await this.client.zadd(key, score, member);
    } catch (error) {
      console.error('Cache addToSortedSet error:', error);
      throw error;
    }
  }

  /**
   * Get sorted set range by score
   */
  async getSortedSetRangeByScore(
    key: string,
    min: number | string,
    max: number | string
  ): Promise<string[]> {
    try {
      return await this.client.zrangebyscore(key, min, max);
    } catch (error) {
      console.error('Cache getSortedSetRangeByScore error:', error);
      return [];
    }
  }

  /**
   * Remove from sorted set
   */
  async removeFromSortedSet(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.zrem(key, ...members);
    } catch (error) {
      console.error('Cache removeFromSortedSet error:', error);
      throw error;
    }
  }
}

// ============================================================================
// PUB/SUB HELPER
// ============================================================================

export class PubSubService {
  private pubClient: Redis | Cluster;
  private subClient: Redis | Cluster;

  constructor() {
    this.pubClient = RedisManager.getPubClient();
    this.subClient = RedisManager.getSubClient();
  }

  /**
   * Publish a message to a channel
   */
  async publish(channel: string, message: any): Promise<number> {
    try {
      const serialized = JSON.stringify(message);
      return await this.pubClient.publish(channel, serialized);
    } catch (error) {
      console.error('PubSub publish error:', error);
      throw error;
    }
  }

  /**
   * Subscribe to a channel
   */
  async subscribe(
    channel: string,
    handler: (message: any) => void | Promise<void>
  ): Promise<void> {
    try {
      await this.subClient.subscribe(channel);
      
      this.subClient.on('message', async (chan, msg) => {
        if (chan === channel) {
          try {
            const parsed = JSON.parse(msg);
            await handler(parsed);
          } catch (error) {
            console.error('PubSub message handler error:', error);
          }
        }
      });
    } catch (error) {
      console.error('PubSub subscribe error:', error);
      throw error;
    }
  }

  /**
   * Subscribe to a pattern
   */
  async subscribePattern(
    pattern: string,
    handler: (channel: string, message: any) => void | Promise<void>
  ): Promise<void> {
    try {
      await this.subClient.psubscribe(pattern);
      
      this.subClient.on('pmessage', async (pat, chan, msg) => {
        if (pat === pattern) {
          try {
            const parsed = JSON.parse(msg);
            await handler(chan, parsed);
          } catch (error) {
            console.error('PubSub pattern message handler error:', error);
          }
        }
      });
    } catch (error) {
      console.error('PubSub subscribe pattern error:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string): Promise<void> {
    try {
      await this.subClient.unsubscribe(channel);
    } catch (error) {
      console.error('PubSub unsubscribe error:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from a pattern
   */
  async unsubscribePattern(pattern: string): Promise<void> {
    try {
      await this.subClient.punsubscribe(pattern);
    } catch (error) {
      console.error('PubSub unsubscribe pattern error:', error);
      throw error;
    }
  }
}

// ============================================================================
// RATE LIMITING
// ============================================================================

export class RateLimiter {
  private cache: CacheService;

  constructor() {
    this.cache = new CacheService();
  }

  /**
   * Check and increment rate limit
   * Returns true if allowed, false if rate limited
   */
  async checkRateLimit(
    identifier: string,
    limit: number,
    windowSeconds: number = 60
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = `${REDIS_CONFIG.prefixes.rate}${identifier}`;
    
    try {
      const current = await this.cache.increment(key);
      
      // Set expiration on first request
      if (current === 1) {
        await this.cache.expire(key, windowSeconds);
      }
      
      const allowed = current <= limit;
      const remaining = Math.max(0, limit - current);
      const resetAt = Date.now() + (windowSeconds * 1000);
      
      return { allowed, remaining, resetAt };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Fail open (allow request on error)
      return { allowed: true, remaining: limit, resetAt: Date.now() + windowSeconds * 1000 };
    }
  }

  /**
   * Reset rate limit for identifier
   */
  async resetRateLimit(identifier: string): Promise<boolean> {
    const key = `${REDIS_CONFIG.prefixes.rate}${identifier}`;
    return await this.cache.delete(key);
  }
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing Redis connections...');
  await RedisManager.close();
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing Redis connections...');
  await RedisManager.close();
});

// Export singleton instances
export const cache = new CacheService();
export const pubsub = new PubSubService();
export const rateLimiter = new RateLimiter();
