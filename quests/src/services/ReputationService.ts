/**
 * Reputation Service - Track and manage agent reputation
 */
import { getDatabase } from '../db/database';
import { AgentReputation, ReputationTier } from '../types';

export class ReputationService {
  private db = getDatabase();

  /**
   * Get agent reputation
   */
  getReputation(agentWallet: string): AgentReputation | null {
    const row = this.db.prepare(
      'SELECT * FROM agent_reputation WHERE agent_wallet = ?'
    ).get(agentWallet) as any;

    if (!row) return null;

    return this.rowToReputation(row);
  }

  /**
   * Get leaderboard (top agents by reputation)
   */
  getLeaderboard(limit: number = 100): AgentReputation[] {
    const rows = this.db.prepare(`
      SELECT * FROM agent_reputation
      ORDER BY reputation DESC, completed_quests DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map(row => this.rowToReputation(row));
  }

  /**
   * Get agents by tier
   */
  getAgentsByTier(tier: ReputationTier): AgentReputation[] {
    const rows = this.db.prepare(`
      SELECT * FROM agent_reputation
      WHERE tier = ?
      ORDER BY reputation DESC
    `).all(tier) as any[];

    return rows.map(row => this.rowToReputation(row));
  }

  /**
   * Get agent statistics
   */
  getStats(agentWallet: string): {
    reputation: AgentReputation | null;
    successRate: number;
    avgQuestValue: number;
    rank: number;
  } {
    const reputation = this.getReputation(agentWallet);
    
    if (!reputation) {
      return {
        reputation: null,
        successRate: 0,
        avgQuestValue: 0,
        rank: 0
      };
    }

    const successRate = reputation.totalQuests > 0
      ? (reputation.completedQuests / reputation.totalQuests) * 100
      : 0;

    const avgQuestValue = reputation.completedQuests > 0
      ? reputation.totalEarned / reputation.completedQuests
      : 0;

    // Calculate rank
    const rankResult = this.db.prepare(`
      SELECT COUNT(*) + 1 as rank
      FROM agent_reputation
      WHERE reputation > (
        SELECT reputation FROM agent_reputation WHERE agent_wallet = ?
      )
    `).get(agentWallet) as any;

    return {
      reputation,
      successRate,
      avgQuestValue,
      rank: rankResult?.rank || 0
    };
  }

  /**
   * Get global statistics
   */
  getGlobalStats(): {
    totalAgents: number;
    totalQuestsCompleted: number;
    totalSolDistributed: number;
    avgReputation: number;
  } {
    const result = this.db.prepare(`
      SELECT
        COUNT(*) as total_agents,
        SUM(completed_quests) as total_completed,
        SUM(total_earned) as total_sol,
        AVG(reputation) as avg_reputation
      FROM agent_reputation
    `).get() as any;

    return {
      totalAgents: result.total_agents || 0,
      totalQuestsCompleted: result.total_completed || 0,
      totalSolDistributed: result.total_sol || 0,
      avgReputation: result.avg_reputation || 0
    };
  }

  /**
   * Convert DB row to AgentReputation
   */
  private rowToReputation(row: any): AgentReputation {
    return {
      agentWallet: row.agent_wallet,
      totalQuests: row.total_quests,
      completedQuests: row.completed_quests,
      rejectedQuests: row.rejected_quests,
      totalEarned: row.total_earned,
      reputation: row.reputation,
      tier: row.tier as ReputationTier,
      lastActiveAt: row.last_active_at,
      joinedAt: row.joined_at
    };
  }
}
