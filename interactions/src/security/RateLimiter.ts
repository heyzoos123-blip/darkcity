/**
 * Rate Limiting and Abuse Prevention
 * Protects against spam and API abuse
 */

import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { Logger } from 'winston';

export interface RateLimitConfig {
  interactionsPerHour: number;
  messagesPerMinute: number;
  tokensPerHour: number;
  maxConcurrentInteractions: number;
}

export class RateLimiter {
  private redis: Redis;
  private logger: Logger;
  
  // Rate limiters
  private interactionLimiter: RateLimiterRedis;
  private messageLimiter: RateLimiterRedis;
  private tokenLimiter: RateLimiterRedis;

  constructor(redis: Redis, config: RateLimitConfig, logger: Logger) {
    this.redis = redis;
    this.logger = logger;

    // Interaction rate limiter (per hour)
    this.interactionLimiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'ratelimit:interactions',
      points: config.interactionsPerHour,
      duration: 3600, // 1 hour
      blockDuration: 600, // Block for 10 minutes if exceeded
    });

    // Message rate limiter (per minute)
    this.messageLimiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'ratelimit:messages',
      points: config.messagesPerMinute,
      duration: 60, // 1 minute
      blockDuration: 120, // Block for 2 minutes if exceeded
    });

    // Token usage limiter (per hour)
    this.tokenLimiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'ratelimit:tokens',
      points: config.tokensPerHour,
      duration: 3600, // 1 hour
      blockDuration: 1800, // Block for 30 minutes if exceeded
    });
  }

  /**
   * Check if agent can start interaction
   */
  async checkInteractionLimit(agentId: string): Promise<void> {
    try {
      await this.interactionLimiter.consume(agentId, 1);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error('Interaction rate limit exceeded');
      }
      
      const rateLimitError = error as RateLimiterRes;
      const retryAfter = Math.ceil(rateLimitError.msBeforeNext / 1000);
      
      this.logger.warn('Interaction rate limit exceeded', {
        agentId,
        retryAfter,
      });
      
      throw new Error(
        `Interaction rate limit exceeded. Try again in ${retryAfter} seconds.`
      );
    }
  }

  /**
   * Check if agent can send message
   */
  async checkMessageLimit(agentId: string): Promise<void> {
    try {
      await this.messageLimiter.consume(agentId, 1);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error('Message rate limit exceeded');
      }
      
      const rateLimitError = error as RateLimiterRes;
      const retryAfter = Math.ceil(rateLimitError.msBeforeNext / 1000);
      
      this.logger.warn('Message rate limit exceeded', {
        agentId,
        retryAfter,
      });
      
      throw new Error(
        `Message rate limit exceeded. Try again in ${retryAfter} seconds.`
      );
    }
  }

  /**
   * Check token usage limit
   */
  async checkTokenLimit(agentId: string, tokens: number): Promise<void> {
    try {
      await this.tokenLimiter.consume(agentId, tokens);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error('Token usage limit exceeded');
      }
      
      const rateLimitError = error as RateLimiterRes;
      const retryAfter = Math.ceil(rateLimitError.msBeforeNext / 1000);
      
      this.logger.warn('Token usage limit exceeded', {
        agentId,
        tokens,
        retryAfter,
      });
      
      throw new Error(
        `Token usage limit exceeded. Try again in ${retryAfter} seconds.`
      );
    }
  }

  /**
   * Check concurrent interaction limit
   */
  async checkConcurrentLimit(
    agentId: string,
    maxConcurrent: number
  ): Promise<void> {
    const lockKey = `concurrent:${agentId}`;
    const current = await this.redis.get(lockKey);
    
    if (current && parseInt(current) >= maxConcurrent) {
      throw new Error(
        `Maximum concurrent interactions (${maxConcurrent}) reached`
      );
    }
  }

  /**
   * Increment concurrent counter
   */
  async incrementConcurrent(agentId: string): Promise<void> {
    const lockKey = `concurrent:${agentId}`;
    await this.redis.incr(lockKey);
    await this.redis.expire(lockKey, 3600); // 1 hour expiry
  }

  /**
   * Decrement concurrent counter
   */
  async decrementConcurrent(agentId: string): Promise<void> {
    const lockKey = `concurrent:${agentId}`;
    const current = await this.redis.get(lockKey);
    
    if (current && parseInt(current) > 0) {
      await this.redis.decr(lockKey);
    }
  }

  /**
   * Get remaining limits for agent
   */
  async getRemainingLimits(agentId: string): Promise<{
    interactions: number;
    messages: number;
    tokens: number;
  }> {
    const [interactions, messages, tokens] = await Promise.all([
      this.interactionLimiter.get(agentId),
      this.messageLimiter.get(agentId),
      this.tokenLimiter.get(agentId),
    ]);

    return {
      interactions: interactions
        ? interactions.remainingPoints
        : this.interactionLimiter.points,
      messages: messages
        ? messages.remainingPoints
        : this.messageLimiter.points,
      tokens: tokens ? tokens.remainingPoints : this.tokenLimiter.points,
    };
  }

  /**
   * Reset limits for agent (admin action)
   */
  async resetLimits(agentId: string): Promise<void> {
    await Promise.all([
      this.interactionLimiter.delete(agentId),
      this.messageLimiter.delete(agentId),
      this.tokenLimiter.delete(agentId),
      this.redis.del(`concurrent:${agentId}`),
    ]);

    this.logger.info('Rate limits reset', { agentId });
  }

  /**
   * Check for suspicious activity
   */
  async detectSuspiciousActivity(agentId: string): Promise<boolean> {
    // Check for rapid-fire interactions
    const recentInteractions = await this.redis.zcount(
      `activity:${agentId}`,
      Date.now() - 60000, // Last minute
      Date.now()
    );

    if (recentInteractions > 20) {
      this.logger.warn('Suspicious activity detected', {
        agentId,
        recentInteractions,
      });
      return true;
    }

    // Check for message spam
    const recentMessages = await this.redis.zcount(
      `messages:${agentId}`,
      Date.now() - 10000, // Last 10 seconds
      Date.now()
    );

    if (recentMessages > 10) {
      this.logger.warn('Message spam detected', {
        agentId,
        recentMessages,
      });
      return true;
    }

    return false;
  }

  /**
   * Temporarily ban agent
   */
  async banAgent(
    agentId: string,
    durationSeconds: number,
    reason: string
  ): Promise<void> {
    await this.redis.setex(
      `ban:${agentId}`,
      durationSeconds,
      JSON.stringify({
        reason,
        bannedAt: new Date().toISOString(),
        expiresAt: new Date(
          Date.now() + durationSeconds * 1000
        ).toISOString(),
      })
    );

    this.logger.warn('Agent banned', {
      agentId,
      duration: durationSeconds,
      reason,
    });
  }

  /**
   * Check if agent is banned
   */
  async isBanned(agentId: string): Promise<boolean> {
    const banInfo = await this.redis.get(`ban:${agentId}`);
    return banInfo !== null;
  }

  /**
   * Get ban info
   */
  async getBanInfo(agentId: string): Promise<any | null> {
    const banInfo = await this.redis.get(`ban:${agentId}`);
    return banInfo ? JSON.parse(banInfo) : null;
  }
}
