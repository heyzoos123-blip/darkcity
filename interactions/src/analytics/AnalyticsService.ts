/**
 * Interaction Analytics Service
 * Tracks metrics, patterns, and insights
 */

import { Pool } from 'pg';
import Redis from 'ioredis';
import { Logger } from 'winston';
import {
  InteractionAnalytics,
  InteractionType,
  InteractionStatus,
} from '../types/interaction.types';

export class AnalyticsService {
  private db: Pool;
  private redis: Redis;
  private logger: Logger;

  constructor(db: Pool, redis: Redis, logger: Logger) {
    this.db = db;
    this.redis = redis;
    this.logger = logger;
  }

  /**
   * Track interaction event
   */
  async trackEvent(
    event: string,
    data: Record<string, any>
  ): Promise<void> {
    const timestamp = new Date().toISOString();

    // Store in time-series
    await this.redis.zadd(
      `analytics:events:${event}`,
      Date.now(),
      JSON.stringify({ ...data, timestamp })
    );

    // Increment counter
    await this.redis.hincrby('analytics:event_counts', event, 1);

    // Expire old events (keep 30 days)
    await this.redis.zremrangebyscore(
      `analytics:events:${event}`,
      0,
      Date.now() - 30 * 24 * 60 * 60 * 1000
    );
  }

  /**
   * Get interaction analytics
   */
  async getInteractionAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<InteractionAnalytics> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    // Total interactions
    const totalResult = await this.db.query(
      `SELECT COUNT(*) as count 
       FROM interactions 
       WHERE started_at BETWEEN $1 AND $2`,
      [start, end]
    );
    const totalInteractions = parseInt(totalResult.rows[0].count);

    // Average duration
    const durationResult = await this.db.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (ended_at - started_at))) as avg_duration
       FROM interactions
       WHERE started_at BETWEEN $1 AND $2 AND ended_at IS NOT NULL`,
      [start, end]
    );
    const averageDuration = parseFloat(durationResult.rows[0].avg_duration || 0);

    // Completion rate
    const completedResult = await this.db.query(
      `SELECT COUNT(*) as count 
       FROM interactions 
       WHERE started_at BETWEEN $1 AND $2 AND status = 'COMPLETED'`,
      [start, end]
    );
    const completedCount = parseInt(completedResult.rows[0].count);
    const completionRate = totalInteractions > 0 
      ? completedCount / totalInteractions 
      : 0;

    // By type
    const byTypeResult = await this.db.query(
      `SELECT type, COUNT(*) as count 
       FROM interactions 
       WHERE started_at BETWEEN $1 AND $2 
       GROUP BY type`,
      [start, end]
    );
    const byType: Record<InteractionType, number> = {} as any;
    for (const row of byTypeResult.rows) {
      byType[row.type as InteractionType] = parseInt(row.count);
    }

    // By status
    const byStatusResult = await this.db.query(
      `SELECT status, COUNT(*) as count 
       FROM interactions 
       WHERE started_at BETWEEN $1 AND $2 
       GROUP BY status`,
      [start, end]
    );
    const byStatus: Record<InteractionStatus, number> = {} as any;
    for (const row of byStatusResult.rows) {
      byStatus[row.status as InteractionStatus] = parseInt(row.count);
    }

    // Popular locations
    const locationsResult = await this.db.query(
      `SELECT location, COUNT(*) as count 
       FROM interactions 
       WHERE started_at BETWEEN $1 AND $2 
       GROUP BY location 
       ORDER BY count DESC 
       LIMIT 10`,
      [start, end]
    );
    const popularLocations = locationsResult.rows.map((row) => ({
      location: row.location,
      count: parseInt(row.count),
    }));

    // Top agent pairs
    const pairsResult = await this.db.query(
      `SELECT 
         initiator as agent1,
         targets[1] as agent2,
         COUNT(*) as count
       FROM interactions
       WHERE started_at BETWEEN $1 AND $2
         AND array_length(targets, 1) = 1
       GROUP BY initiator, targets[1]
       ORDER BY count DESC
       LIMIT 10`,
      [start, end]
    );
    const topPairs = pairsResult.rows.map((row) => ({
      agent1: row.agent1,
      agent2: row.agent2,
      count: parseInt(row.count),
    }));

    return {
      totalInteractions,
      averageDuration,
      completionRate,
      byType,
      byStatus,
      popularLocations,
      topPairs,
    };
  }

  /**
   * Get agent interaction stats
   */
  async getAgentStats(agentId: string): Promise<{
    totalInteractions: number;
    byType: Record<InteractionType, number>;
    averageMessagesPerInteraction: number;
    favoriteLocations: Array<{ location: string; count: number }>;
    topPartners: Array<{ agentId: string; count: number }>;
  }> {
    // Total interactions
    const totalResult = await this.db.query(
      `SELECT COUNT(*) as count 
       FROM interactions 
       WHERE initiator = $1 OR $1 = ANY(targets)`,
      [agentId]
    );
    const totalInteractions = parseInt(totalResult.rows[0].count);

    // By type
    const byTypeResult = await this.db.query(
      `SELECT type, COUNT(*) as count 
       FROM interactions 
       WHERE initiator = $1 OR $1 = ANY(targets)
       GROUP BY type`,
      [agentId]
    );
    const byType: Record<InteractionType, number> = {} as any;
    for (const row of byTypeResult.rows) {
      byType[row.type as InteractionType] = parseInt(row.count);
    }

    // Average messages
    const avgMessagesResult = await this.db.query(
      `SELECT AVG(message_count) as avg 
       FROM interactions 
       WHERE initiator = $1 OR $1 = ANY(targets)`,
      [agentId]
    );
    const averageMessagesPerInteraction = parseFloat(
      avgMessagesResult.rows[0].avg || 0
    );

    // Favorite locations
    const locationsResult = await this.db.query(
      `SELECT location, COUNT(*) as count 
       FROM interactions 
       WHERE initiator = $1 OR $1 = ANY(targets)
       GROUP BY location 
       ORDER BY count DESC 
       LIMIT 5`,
      [agentId]
    );
    const favoriteLocations = locationsResult.rows.map((row) => ({
      location: row.location,
      count: parseInt(row.count),
    }));

    // Top partners
    const partnersResult = await this.db.query(
      `SELECT 
         CASE 
           WHEN initiator = $1 THEN targets[1]
           ELSE initiator
         END as partner,
         COUNT(*) as count
       FROM interactions
       WHERE (initiator = $1 OR $1 = ANY(targets))
         AND array_length(targets, 1) = 1
       GROUP BY partner
       ORDER BY count DESC
       LIMIT 5`,
      [agentId]
    );
    const topPartners = partnersResult.rows.map((row) => ({
      agentId: row.partner,
      count: parseInt(row.count),
    }));

    return {
      totalInteractions,
      byType,
      averageMessagesPerInteraction,
      favoriteLocations,
      topPartners,
    };
  }

  /**
   * Get real-time metrics
   */
  async getRealtimeMetrics(): Promise<{
    activeInteractions: number;
    onlineAgents: number;
    messagesPerMinute: number;
    activeLocations: number;
  }> {
    // Active interactions
    const activeResult = await this.db.query(
      `SELECT COUNT(*) as count 
       FROM interactions 
       WHERE status = 'ACTIVE'`
    );
    const activeInteractions = parseInt(activeResult.rows[0].count);

    // Online agents (from Redis)
    const onlineAgents = await this.redis.hlen('agent:presence');

    // Messages per minute (from recent events)
    const oneMinuteAgo = Date.now() - 60 * 1000;
    const messageEvents = await this.redis.zcount(
      'analytics:events:message_sent',
      oneMinuteAgo,
      Date.now()
    );
    const messagesPerMinute = messageEvents;

    // Active locations (with interactions in last 5 min)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const locationsResult = await this.db.query(
      `SELECT COUNT(DISTINCT location) as count 
       FROM interactions 
       WHERE last_activity_at > $1`,
      [fiveMinutesAgo]
    );
    const activeLocations = parseInt(locationsResult.rows[0].count);

    return {
      activeInteractions,
      onlineAgents,
      messagesPerMinute,
      activeLocations,
    };
  }

  /**
   * Generate daily report
   */
  async generateDailyReport(date: Date): Promise<any> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const analytics = await this.getInteractionAnalytics(
      startOfDay,
      endOfDay
    );

    // Add additional daily metrics
    const peakHourResult = await this.db.query(
      `SELECT 
         EXTRACT(HOUR FROM started_at) as hour,
         COUNT(*) as count
       FROM interactions
       WHERE started_at BETWEEN $1 AND $2
       GROUP BY hour
       ORDER BY count DESC
       LIMIT 1`,
      [startOfDay, endOfDay]
    );

    const peakHour = peakHourResult.rows[0]
      ? {
          hour: parseInt(peakHourResult.rows[0].hour),
          interactions: parseInt(peakHourResult.rows[0].count),
        }
      : null;

    return {
      date: date.toISOString().split('T')[0],
      ...analytics,
      peakHour,
    };
  }
}
