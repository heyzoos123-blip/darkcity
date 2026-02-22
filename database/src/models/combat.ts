import { CombatStats, CombatReplay, CombatOutcome, CombatType, Prisma } from '@prisma/client';
import { getDatabase } from '../client';
import { getCacheManager } from '../cache/redis';

/**
 * Combat Statistics Service
 */
export class CombatService {
  private db = getDatabase();
  private cache = getCacheManager();

  /**
   * Get or create combat stats
   */
  async getStats(characterId: string): Promise<CombatStats> {
    let stats = await this.db.combatStats.findUnique({
      where: { characterId },
    });

    if (!stats) {
      stats = await this.db.combatStats.create({
        data: { characterId },
      });
    }

    return stats;
  }

  /**
   * Record combat result
   */
  async recordCombat(data: {
    attackerId: string;
    defenderId?: string;
    outcome: CombatOutcome;
    duration: number;
    rounds: number;
    events: any;
    finalStats: any;
    rewards?: any;
    location: string;
    combatType: CombatType;
  }): Promise<CombatReplay> {
    // Create replay
    const replay = await this.db.combatReplay.create({
      data,
    });

    // Update attacker stats
    await this.updateStatsAfterCombat(data.attackerId, data.outcome, data.finalStats.attacker);

    // Update defender stats if PvP
    if (data.defenderId) {
      const defenderOutcome = 
        data.outcome === CombatOutcome.VICTORY ? CombatOutcome.DEFEAT :
        data.outcome === CombatOutcome.DEFEAT ? CombatOutcome.VICTORY :
        data.outcome;
      
      await this.updateStatsAfterCombat(data.defenderId, defenderOutcome, data.finalStats.defender);
    }

    // Update leaderboards
    await this.updateLeaderboards(data.attackerId);
    if (data.defenderId) {
      await this.updateLeaderboards(data.defenderId);
    }

    return replay;
  }

  /**
   * Update stats after combat
   */
  private async updateStatsAfterCombat(
    characterId: string,
    outcome: CombatOutcome,
    finalStats: any
  ): Promise<void> {
    const stats = await this.getStats(characterId);

    const isWin = outcome === CombatOutcome.VICTORY;
    const isLoss = outcome === CombatOutcome.DEFEAT;
    const isDraw = outcome === CombatOutcome.DRAW;

    const updates: Prisma.CombatStatsUpdateInput = {
      totalCombats: stats.totalCombats + 1,
      wins: isWin ? stats.wins + 1 : stats.wins,
      losses: isLoss ? stats.losses + 1 : stats.losses,
      draws: isDraw ? stats.draws + 1 : stats.draws,
      totalDamageDealt: stats.totalDamageDealt + BigInt(finalStats.damageDealt || 0),
      totalDamageTaken: stats.totalDamageTaken + BigInt(finalStats.damageTaken || 0),
      kills: finalStats.kills ? stats.kills + finalStats.kills : stats.kills,
      deaths: finalStats.deaths ? stats.deaths + 1 : stats.deaths,
    };

    // Update highest damage
    if (finalStats.damageDealt > stats.highestDamage) {
      updates.highestDamage = finalStats.damageDealt;
    }

    // Update streak
    if (isWin) {
      const newStreak = stats.currentStreak >= 0 ? stats.currentStreak + 1 : 1;
      updates.currentStreak = newStreak;
      if (newStreak > stats.bestStreak) {
        updates.bestStreak = newStreak;
      }
    } else if (isLoss) {
      const newStreak = stats.currentStreak <= 0 ? stats.currentStreak - 1 : -1;
      updates.currentStreak = newStreak;
    }

    // Calculate KDR
    const totalKills = (stats.kills + (finalStats.kills || 0));
    const totalDeaths = stats.deaths + (finalStats.deaths ? 1 : 0);
    updates.kdr = totalDeaths > 0 ? totalKills / totalDeaths : totalKills;

    // Update ELO rating (simplified)
    if (isWin) {
      updates.rating = stats.rating + 25;
    } else if (isLoss) {
      updates.rating = Math.max(100, stats.rating - 20);
    }

    // Update rank based on rating
    updates.rank = this.calculateRank(updates.rating as number || stats.rating);

    await this.db.combatStats.update({
      where: { characterId },
      data: updates,
    });
  }

  /**
   * Calculate rank from rating
   */
  private calculateRank(rating: number): string {
    if (rating >= 2000) return 'Legend';
    if (rating >= 1800) return 'Master';
    if (rating >= 1600) return 'Diamond';
    if (rating >= 1400) return 'Platinum';
    if (rating >= 1200) return 'Gold';
    if (rating >= 1000) return 'Silver';
    if (rating >= 800) return 'Bronze';
    return 'Rookie';
  }

  /**
   * Update leaderboards
   */
  private async updateLeaderboards(characterId: string): Promise<void> {
    const stats = await this.getStats(characterId);

    // Update various leaderboards in Redis
    await this.cache.updateLeaderboard('rating', characterId, stats.rating);
    await this.cache.updateLeaderboard('wins', characterId, stats.wins);
    await this.cache.updateLeaderboard('kdr', characterId, stats.kdr);
    await this.cache.updateLeaderboard('streak', characterId, stats.bestStreak);
  }

  /**
   * Get combat replay
   */
  async getReplay(replayId: string): Promise<CombatReplay | null> {
    return this.db.combatReplay.findUnique({
      where: { id: replayId },
      include: {
        attacker: {
          select: { id: true, name: true, level: true },
        },
      },
    });
  }

  /**
   * Get character's combat history
   */
  async getHistory(characterId: string, limit: number = 50): Promise<CombatReplay[]> {
    return this.db.combatReplay.findMany({
      where: {
        OR: [
          { attackerId: characterId },
          { defenderId: characterId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        attacker: {
          select: { id: true, name: true, level: true },
        },
      },
    });
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(type: 'rating' | 'wins' | 'kdr' | 'streak', limit: number = 100): Promise<any[]> {
    const leaderboard = await this.cache.getLeaderboard(type, limit);
    
    // Fetch character details
    const characterIds = leaderboard.map(entry => entry.characterId);
    const characters = await this.db.character.findMany({
      where: { id: { in: characterIds } },
      select: { id: true, name: true, level: true, class: true },
    });

    // Merge data
    return leaderboard.map(entry => {
      const character = characters.find(c => c.id === entry.characterId);
      return {
        ...character,
        score: entry.score,
      };
    });
  }

  /**
   * Get character's rank
   */
  async getRank(characterId: string, type: 'rating' | 'wins' | 'kdr' | 'streak'): Promise<number | null> {
    return this.cache.getLeaderboardRank(type, characterId);
  }
}
