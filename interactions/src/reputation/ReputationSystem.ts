/**
 * Reputation System
 * Tracks agent reputation with decay, scoring, and titles
 */

import { Pool } from 'pg';
import Redis from 'ioredis';
import { Logger } from 'winston';
import { ReputationDelta } from '../types/interaction.types';

export interface Reputation {
  agentId: string;
  overall: number;
  byDistrict: Record<string, number>;
  byFaction: Record<string, number>;
  titles: ReputationTitle[];
  lastUpdated: Date;
}

export interface ReputationTitle {
  title: string;
  earnedAt: Date;
  requirement: string;
}

export interface ReputationChange {
  agentId: string;
  delta: number;
  scope: 'OVERALL' | 'DISTRICT' | 'FACTION';
  scopeId?: string;
  reason: string;
  timestamp: Date;
}

export class ReputationSystem {
  private db: Pool;
  private redis: Redis;
  private logger: Logger;

  // Configuration
  private readonly DECAY_RATE = 0.99; // Daily decay multiplier
  private readonly MIN_REPUTATION = -1000;
  private readonly MAX_REPUTATION = 1000;

  constructor(db: Pool, redis: Redis, logger: Logger) {
    this.db = db;
    this.redis = redis;
    this.logger = logger;
  }

  /**
   * Get agent reputation
   */
  async getReputation(agentId: string): Promise<Reputation> {
    // Check cache
    const cached = await this.redis.get(`reputation:${agentId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Load from database
    const result = await this.db.query(
      'SELECT * FROM agent_reputation WHERE agent_id = $1',
      [agentId]
    );

    if (result.rows.length === 0) {
      // Initialize new reputation
      return this.initializeReputation(agentId);
    }

    const reputation: Reputation = {
      agentId: result.rows[0].agent_id,
      overall: result.rows[0].overall,
      byDistrict: result.rows[0].by_district || {},
      byFaction: result.rows[0].by_faction || {},
      titles: result.rows[0].titles || [],
      lastUpdated: result.rows[0].last_updated,
    };

    // Cache for 5 minutes
    await this.redis.setex(
      `reputation:${agentId}`,
      300,
      JSON.stringify(reputation)
    );

    return reputation;
  }

  /**
   * Apply reputation change
   */
  async applyChange(change: ReputationChange): Promise<Reputation> {
    const reputation = await this.getReputation(change.agentId);

    // Apply change based on scope
    if (change.scope === 'OVERALL') {
      reputation.overall = this.clamp(
        reputation.overall + change.delta,
        this.MIN_REPUTATION,
        this.MAX_REPUTATION
      );
    } else if (change.scope === 'DISTRICT' && change.scopeId) {
      const current = reputation.byDistrict[change.scopeId] || 0;
      reputation.byDistrict[change.scopeId] = this.clamp(
        current + change.delta,
        this.MIN_REPUTATION,
        this.MAX_REPUTATION
      );
    } else if (change.scope === 'FACTION' && change.scopeId) {
      const current = reputation.byFaction[change.scopeId] || 0;
      reputation.byFaction[change.scopeId] = this.clamp(
        current + change.delta,
        this.MIN_REPUTATION,
        this.MAX_REPUTATION
      );
    }

    reputation.lastUpdated = new Date();

    // Check for new titles
    const newTitles = await this.checkTitleEligibility(reputation);
    reputation.titles.push(...newTitles);

    // Save to database
    await this.saveReputation(reputation);

    // Log change
    await this.logReputationChange(change);

    // Invalidate cache
    await this.redis.del(`reputation:${change.agentId}`);

    this.logger.info('Reputation updated', {
      agentId: change.agentId,
      delta: change.delta,
      newOverall: reputation.overall,
      reason: change.reason,
    });

    return reputation;
  }

  /**
   * Apply daily decay
   */
  async applyDailyDecay(agentId: string): Promise<Reputation> {
    const reputation = await this.getReputation(agentId);

    // Decay overall reputation towards 0
    if (reputation.overall > 0) {
      reputation.overall = Math.floor(reputation.overall * this.DECAY_RATE);
    } else if (reputation.overall < 0) {
      reputation.overall = Math.ceil(reputation.overall * this.DECAY_RATE);
    }

    // Decay district reputation
    for (const district in reputation.byDistrict) {
      const value = reputation.byDistrict[district];
      if (value > 0) {
        reputation.byDistrict[district] = Math.floor(value * this.DECAY_RATE);
      } else if (value < 0) {
        reputation.byDistrict[district] = Math.ceil(value * this.DECAY_RATE);
      }
    }

    // Decay faction reputation
    for (const faction in reputation.byFaction) {
      const value = reputation.byFaction[faction];
      if (value > 0) {
        reputation.byFaction[faction] = Math.floor(value * this.DECAY_RATE);
      } else if (value < 0) {
        reputation.byFaction[faction] = Math.ceil(value * this.DECAY_RATE);
      }
    }

    reputation.lastUpdated = new Date();
    await this.saveReputation(reputation);

    return reputation;
  }

  /**
   * Check title eligibility
   */
  private async checkTitleEligibility(
    reputation: Reputation
  ): Promise<ReputationTitle[]> {
    const newTitles: ReputationTitle[] = [];
    const existingTitles = new Set(reputation.titles.map((t) => t.title));

    // Overall reputation titles
    if (reputation.overall >= 500 && !existingTitles.has('The Respected')) {
      newTitles.push({
        title: 'The Respected',
        earnedAt: new Date(),
        requirement: 'Reach 500 overall reputation',
      });
    }

    if (reputation.overall >= 800 && !existingTitles.has('The Legendary')) {
      newTitles.push({
        title: 'The Legendary',
        earnedAt: new Date(),
        requirement: 'Reach 800 overall reputation',
      });
    }

    if (reputation.overall <= -500 && !existingTitles.has('The Notorious')) {
      newTitles.push({
        title: 'The Notorious',
        earnedAt: new Date(),
        requirement: 'Reach -500 overall reputation',
      });
    }

    // District-specific titles
    for (const [district, score] of Object.entries(reputation.byDistrict)) {
      const title = `${district} Regular`;
      if (score >= 300 && !existingTitles.has(title)) {
        newTitles.push({
          title,
          earnedAt: new Date(),
          requirement: `Reach 300 reputation in ${district}`,
        });
      }
    }

    // Check transaction-based titles
    const transactionCount = await this.getTransactionCount(reputation.agentId);
    if (transactionCount >= 100 && !existingTitles.has('The Merchant')) {
      newTitles.push({
        title: 'The Merchant',
        earnedAt: new Date(),
        requirement: 'Complete 100 transactions',
      });
    }

    return newTitles;
  }

  /**
   * Initialize reputation for new agent
   */
  private async initializeReputation(agentId: string): Promise<Reputation> {
    const reputation: Reputation = {
      agentId,
      overall: 0,
      byDistrict: {},
      byFaction: {},
      titles: [],
      lastUpdated: new Date(),
    };

    await this.saveReputation(reputation);
    return reputation;
  }

  /**
   * Save reputation to database
   */
  private async saveReputation(reputation: Reputation): Promise<void> {
    await this.db.query(
      `INSERT INTO agent_reputation 
       (agent_id, overall, by_district, by_faction, titles, last_updated)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (agent_id)
       DO UPDATE SET
         overall = $2,
         by_district = $3,
         by_faction = $4,
         titles = $5,
         last_updated = $6`,
      [
        reputation.agentId,
        reputation.overall,
        JSON.stringify(reputation.byDistrict),
        JSON.stringify(reputation.byFaction),
        JSON.stringify(reputation.titles),
        reputation.lastUpdated,
      ]
    );
  }

  /**
   * Log reputation change
   */
  private async logReputationChange(change: ReputationChange): Promise<void> {
    await this.db.query(
      `INSERT INTO reputation_history
       (agent_id, delta, scope, scope_id, reason, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        change.agentId,
        change.delta,
        change.scope,
        change.scopeId,
        change.reason,
        change.timestamp,
      ]
    );
  }

  /**
   * Get transaction count for agent
   */
  private async getTransactionCount(agentId: string): Promise<number> {
    const result = await this.db.query(
      `SELECT COUNT(*) as count FROM transactions 
       WHERE buyer = $1 OR seller = $1`,
      [agentId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Get reputation history
   */
  async getHistory(
    agentId: string,
    limit: number = 100
  ): Promise<ReputationChange[]> {
    const result = await this.db.query(
      `SELECT * FROM reputation_history 
       WHERE agent_id = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [agentId, limit]
    );

    return result.rows.map((row) => ({
      agentId: row.agent_id,
      delta: row.delta,
      scope: row.scope,
      scopeId: row.scope_id,
      reason: row.reason,
      timestamp: row.timestamp,
    }));
  }

  /**
   * Get top agents by reputation
   */
  async getLeaderboard(
    scope: 'OVERALL' | 'DISTRICT' | 'FACTION',
    scopeId?: string,
    limit: number = 100
  ): Promise<Array<{ agentId: string; score: number }>> {
    let query: string;
    let params: any[];

    if (scope === 'OVERALL') {
      query = `
        SELECT agent_id, overall as score 
        FROM agent_reputation 
        ORDER BY overall DESC 
        LIMIT $1
      `;
      params = [limit];
    } else if (scope === 'DISTRICT') {
      query = `
        SELECT agent_id, (by_district->>$1)::int as score 
        FROM agent_reputation 
        WHERE by_district ? $1
        ORDER BY score DESC 
        LIMIT $2
      `;
      params = [scopeId, limit];
    } else {
      query = `
        SELECT agent_id, (by_faction->>$1)::int as score 
        FROM agent_reputation 
        WHERE by_faction ? $1
        ORDER BY score DESC 
        LIMIT $2
      `;
      params = [scopeId, limit];
    }

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Utility: clamp value
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
