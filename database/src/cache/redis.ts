import Redis, { Redis as RedisClient } from 'ioredis';
import { config } from '../config';

/**
 * Redis Cache Manager for DARKCITY
 * Handles sessions, matchmaking queues, and real-time state
 */
export class CacheManager {
  private redis: RedisClient;
  private readonly prefix = 'darkcity:';

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || config.redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    this.redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      console.log('✓ Redis connected');
    });
  }

  /**
   * Generate cache key with prefix
   */
  private key(namespace: string, id: string): string {
    return `${this.prefix}${namespace}:${id}`;
  }

  // ============================================================================
  // CHARACTER SESSIONS
  // ============================================================================

  async setActiveSession(characterId: string, sessionData: any, ttl: number = config.cacheTTL.session): Promise<void> {
    const key = this.key('session', characterId);
    await this.redis.setex(key, ttl, JSON.stringify(sessionData));
  }

  async getActiveSession(characterId: string): Promise<any | null> {
    const key = this.key('session', characterId);
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async endSession(characterId: string): Promise<void> {
    const key = this.key('session', characterId);
    await this.redis.del(key);
  }

  async getAllActiveSessions(): Promise<string[]> {
    const pattern = this.key('session', '*');
    return await this.redis.keys(pattern);
  }

  // ============================================================================
  // CHARACTER CACHE
  // ============================================================================

  async cacheCharacter(characterId: string, data: any, ttl: number = config.cacheTTL.character): Promise<void> {
    const key = this.key('character', characterId);
    await this.redis.setex(key, ttl, JSON.stringify(data));
  }

  async getCharacter(characterId: string): Promise<any | null> {
    const key = this.key('character', characterId);
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async invalidateCharacter(characterId: string): Promise<void> {
    const key = this.key('character', characterId);
    await this.redis.del(key);
  }

  // ============================================================================
  // INVENTORY CACHE
  // ============================================================================

  async cacheInventory(characterId: string, inventory: any, ttl: number = config.cacheTTL.inventory): Promise<void> {
    const key = this.key('inventory', characterId);
    await this.redis.setex(key, ttl, JSON.stringify(inventory));
  }

  async getInventory(characterId: string): Promise<any | null> {
    const key = this.key('inventory', characterId);
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async invalidateInventory(characterId: string): Promise<void> {
    const key = this.key('inventory', characterId);
    await this.redis.del(key);
  }

  // ============================================================================
  // MATCHMAKING QUEUES
  // ============================================================================

  async joinQueue(queueType: string, characterId: string, data: any): Promise<void> {
    const queueKey = this.key('queue', queueType);
    const score = Date.now(); // Use timestamp as score for FIFO
    await this.redis.zadd(queueKey, score, JSON.stringify({ characterId, ...data }));
  }

  async leaveQueue(queueType: string, characterId: string): Promise<void> {
    const queueKey = this.key('queue', queueType);
    const members = await this.redis.zrange(queueKey, 0, -1);
    
    for (const member of members) {
      const data = JSON.parse(member);
      if (data.characterId === characterId) {
        await this.redis.zrem(queueKey, member);
        break;
      }
    }
  }

  async getQueue(queueType: string, limit: number = 100): Promise<any[]> {
    const queueKey = this.key('queue', queueType);
    const members = await this.redis.zrange(queueKey, 0, limit - 1);
    return members.map(m => JSON.parse(m));
  }

  async getQueuePosition(queueType: string, characterId: string): Promise<number | null> {
    const queueKey = this.key('queue', queueType);
    const members = await this.redis.zrange(queueKey, 0, -1);
    
    for (let i = 0; i < members.length; i++) {
      const data = JSON.parse(members[i]);
      if (data.characterId === characterId) {
        return i;
      }
    }
    
    return null;
  }

  async clearQueue(queueType: string): Promise<void> {
    const queueKey = this.key('queue', queueType);
    await this.redis.del(queueKey);
  }

  // ============================================================================
  // COMBAT STATE
  // ============================================================================

  async setCombatState(combatId: string, state: any, ttl: number = 3600): Promise<void> {
    const key = this.key('combat', combatId);
    await this.redis.setex(key, ttl, JSON.stringify(state));
  }

  async getCombatState(combatId: string): Promise<any | null> {
    const key = this.key('combat', combatId);
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async endCombat(combatId: string): Promise<void> {
    const key = this.key('combat', combatId);
    await this.redis.del(key);
  }

  // ============================================================================
  // LEADERBOARDS
  // ============================================================================

  async updateLeaderboard(leaderboardType: string, characterId: string, score: number): Promise<void> {
    const key = this.key('leaderboard', leaderboardType);
    await this.redis.zadd(key, score, characterId);
  }

  async getLeaderboard(leaderboardType: string, limit: number = 100): Promise<Array<{ characterId: string; score: number }>> {
    const key = this.key('leaderboard', leaderboardType);
    const results = await this.redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');
    
    const leaderboard: Array<{ characterId: string; score: number }> = [];
    for (let i = 0; i < results.length; i += 2) {
      leaderboard.push({
        characterId: results[i],
        score: parseFloat(results[i + 1]),
      });
    }
    
    return leaderboard;
  }

  async getLeaderboardRank(leaderboardType: string, characterId: string): Promise<number | null> {
    const key = this.key('leaderboard', leaderboardType);
    const rank = await this.redis.zrevrank(key, characterId);
    return rank !== null ? rank + 1 : null; // Convert to 1-indexed
  }

  async getLeaderboardScore(leaderboardType: string, characterId: string): Promise<number | null> {
    const key = this.key('leaderboard', leaderboardType);
    const score = await this.redis.zscore(key, characterId);
    return score !== null ? parseFloat(score) : null;
  }

  // ============================================================================
  // REAL-TIME NOTIFICATIONS
  // ============================================================================

  async publishEvent(channel: string, event: any): Promise<void> {
    await this.redis.publish(this.key('event', channel), JSON.stringify(event));
  }

  async subscribeToEvents(channel: string, callback: (event: any) => void): Promise<void> {
    const subscriber = this.redis.duplicate();
    await subscriber.subscribe(this.key('event', channel));
    
    subscriber.on('message', (ch, message) => {
      if (ch === this.key('event', channel)) {
        callback(JSON.parse(message));
      }
    });
  }

  // ============================================================================
  // RATE LIMITING
  // ============================================================================

  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const rateLimitKey = this.key('ratelimit', key);
    const current = await this.redis.incr(rateLimitKey);
    
    if (current === 1) {
      await this.redis.expire(rateLimitKey, windowSeconds);
    }
    
    return current <= limit;
  }

  // ============================================================================
  // UTILITY
  // ============================================================================

  async clearAll(): Promise<void> {
    const pattern = `${this.prefix}*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async getStats(): Promise<any> {
    const info = await this.redis.info('stats');
    const dbSize = await this.redis.dbsize();
    
    return {
      connected: this.redis.status === 'ready',
      dbSize,
      info: info.split('\r\n').reduce((acc: any, line) => {
        const [key, value] = line.split(':');
        if (key && value) acc[key] = value;
        return acc;
      }, {}),
    };
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

// Singleton instance
let cacheManager: CacheManager | null = null;

export function getCacheManager(): CacheManager {
  if (!cacheManager) {
    cacheManager = new CacheManager();
  }
  return cacheManager;
}

export function resetCacheManager(): void {
  if (cacheManager) {
    cacheManager.disconnect();
    cacheManager = null;
  }
}
