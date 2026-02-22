/**
 * DARKCITY Memory Service
 * Experience logging, retrieval, and consolidation
 */

import { prisma } from '../config/database.config';
import { Experience, ExperienceType, DailySummary, Prisma } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateExperienceInput {
  agentId: string;
  type: ExperienceType;
  description: string;
  locationId?: string;
  participants?: string[];
  
  // Perception
  emotionalValence?: number;
  emotionalArousal?: number;
  significance?: number;
  
  // Outcomes
  consequences?: Record<string, any>;
  tags?: string[];
}

export interface SearchMemoriesInput {
  agentId: string;
  query?: string;
  type?: ExperienceType;
  fromDate?: Date;
  toDate?: Date;
  minSignificance?: number;
  limit?: number;
}

export interface RelationshipContext {
  agentId: string;
  otherAgentId: string;
  relationship: {
    type: string;
    sentiment: number;
    trust: number;
    interactionCount: number;
  } | null;
  sharedExperiences: Experience[];
  recentInteractions: Experience[];
}

// ============================================================================
// MEMORY SERVICE
// ============================================================================

export class MemoryService {
  /**
   * Record a new experience
   */
  async recordExperience(input: CreateExperienceInput): Promise<Experience> {
    try {
      const experience = await prisma.experience.create({
        data: {
          agentId: input.agentId,
          type: input.type,
          description: input.description,
          locationId: input.locationId,
          participants: input.participants || [],
          emotionalValence: input.emotionalValence ?? 0,
          emotionalArousal: input.emotionalArousal ?? 0.5,
          significance: input.significance ?? 0.5,
          consequences: input.consequences || {},
          tags: input.tags || [],
        },
      });
      
      // Update last active timestamp
      await prisma.agent.update({
        where: { id: input.agentId },
        data: { lastActiveAt: new Date() },
      });
      
      return experience;
    } catch (error) {
      console.error('Error recording experience:', error);
      throw new Error('Failed to record experience');
    }
  }

  /**
   * Get experiences for an agent
   */
  async getExperiences(
    agentId: string,
    options: {
      limit?: number;
      offset?: number;
      type?: ExperienceType;
      minSignificance?: number;
    } = {}
  ): Promise<Experience[]> {
    try {
      const where: Prisma.ExperienceWhereInput = {
        agentId,
        ...(options.type && { type: options.type }),
        ...(options.minSignificance && {
          significance: { gte: options.minSignificance },
        }),
      };
      
      return await prisma.experience.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
      });
    } catch (error) {
      console.error('Error fetching experiences:', error);
      throw new Error('Failed to fetch experiences');
    }
  }

  /**
   * Get significant experiences (for memory retrieval)
   */
  async getSignificantExperiences(
    agentId: string,
    limit: number = 10
  ): Promise<Experience[]> {
    return this.getExperiences(agentId, {
      limit,
      minSignificance: 0.7,
    });
  }

  /**
   * Get recent experiences
   */
  async getRecentExperiences(
    agentId: string,
    hours: number = 24,
    limit: number = 20
  ): Promise<Experience[]> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      return await prisma.experience.findMany({
        where: {
          agentId,
          timestamp: { gte: since },
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });
    } catch (error) {
      console.error('Error fetching recent experiences:', error);
      throw new Error('Failed to fetch recent experiences');
    }
  }

  /**
   * Search experiences by tags
   */
  async searchByTags(
    agentId: string,
    tags: string[],
    limit: number = 20
  ): Promise<Experience[]> {
    try {
      return await prisma.experience.findMany({
        where: {
          agentId,
          tags: {
            hasSome: tags,
          },
        },
        orderBy: [
          { significance: 'desc' },
          { timestamp: 'desc' },
        ],
        take: limit,
      });
    } catch (error) {
      console.error('Error searching experiences by tags:', error);
      throw new Error('Failed to search experiences');
    }
  }

  /**
   * Get experiences with another agent
   */
  async getSharedExperiences(
    agentId: string,
    otherAgentId: string,
    limit: number = 10
  ): Promise<Experience[]> {
    try {
      return await prisma.experience.findMany({
        where: {
          agentId,
          participants: {
            has: otherAgentId,
          },
        },
        orderBy: [
          { significance: 'desc' },
          { timestamp: 'desc' },
        ],
        take: limit,
      });
    } catch (error) {
      console.error('Error fetching shared experiences:', error);
      throw new Error('Failed to fetch shared experiences');
    }
  }

  /**
   * Get relationship context for interaction
   */
  async getRelationshipContext(
    agentId: string,
    otherAgentId: string
  ): Promise<RelationshipContext> {
    try {
      // Get relationship record
      const relationship = await prisma.relationship.findUnique({
        where: {
          agentId_otherAgentId: {
            agentId,
            otherAgentId,
          },
        },
      });
      
      // Get shared experiences (all time)
      const sharedExperiences = await this.getSharedExperiences(
        agentId,
        otherAgentId,
        5
      );
      
      // Get recent interactions (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentInteractions = await prisma.experience.findMany({
        where: {
          agentId,
          participants: { has: otherAgentId },
          timestamp: { gte: weekAgo },
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
      });
      
      return {
        agentId,
        otherAgentId,
        relationship: relationship ? {
          type: relationship.type,
          sentiment: relationship.sentiment,
          trust: relationship.trust,
          interactionCount: relationship.interactionCount,
        } : null,
        sharedExperiences,
        recentInteractions,
      };
    } catch (error) {
      console.error('Error getting relationship context:', error);
      throw new Error('Failed to get relationship context');
    }
  }

  /**
   * Update or create relationship
   */
  async updateRelationship(
    agentId: string,
    otherAgentId: string,
    updates: {
      sentimentDelta?: number;
      trustDelta?: number;
      type?: string;
      memorableMoment?: string;
    }
  ): Promise<void> {
    try {
      const existing = await prisma.relationship.findUnique({
        where: {
          agentId_otherAgentId: {
            agentId,
            otherAgentId,
          },
        },
      });
      
      if (existing) {
        // Update existing relationship
        await prisma.relationship.update({
          where: {
            agentId_otherAgentId: {
              agentId,
              otherAgentId,
            },
          },
          data: {
            ...(updates.sentimentDelta && {
              sentiment: Math.max(-100, Math.min(100,
                existing.sentiment + updates.sentimentDelta
              )),
            }),
            ...(updates.trustDelta && {
              trust: Math.max(0, Math.min(100,
                existing.trust + updates.trustDelta
              )),
            }),
            ...(updates.type && { type: updates.type as any }),
            interactionCount: { increment: 1 },
            lastInteractionAt: new Date(),
            ...(updates.memorableMoment && {
              memorableMoments: {
                push: updates.memorableMoment,
              },
            }),
          },
        });
      } else {
        // Create new relationship
        await prisma.relationship.create({
          data: {
            agentId,
            otherAgentId,
            type: (updates.type as any) || 'ACQUAINTANCE',
            sentiment: updates.sentimentDelta || 0,
            trust: 50 + (updates.trustDelta || 0),
            interactionCount: 1,
            lastInteractionAt: new Date(),
            memorableMoments: updates.memorableMoment ? [updates.memorableMoment] : [],
          },
        });
      }
    } catch (error) {
      console.error('Error updating relationship:', error);
      throw new Error('Failed to update relationship');
    }
  }

  /**
   * Create daily summary
   */
  async createDailySummary(
    agentId: string,
    date: Date,
    summary: {
      narrative: string;
      highlights: Record<string, any>;
      emotionalJourney: Record<string, any>;
      lessonsLearned?: string[];
      personalityInfluences?: Record<string, any>[];
      embedding?: string;
    }
  ): Promise<DailySummary> {
    try {
      return await prisma.dailySummary.create({
        data: {
          agentId,
          date,
          narrative: summary.narrative,
          highlights: summary.highlights,
          emotionalJourney: summary.emotionalJourney,
          lessonsLearned: summary.lessonsLearned || [],
          personalityInfluences: summary.personalityInfluences || [],
          embedding: summary.embedding,
        },
      });
    } catch (error) {
      console.error('Error creating daily summary:', error);
      throw new Error('Failed to create daily summary');
    }
  }

  /**
   * Get daily summaries for an agent
   */
  async getDailySummaries(
    agentId: string,
    options: {
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
    } = {}
  ): Promise<DailySummary[]> {
    try {
      const where: Prisma.DailySummaryWhereInput = {
        agentId,
        ...(options.fromDate && { date: { gte: options.fromDate } }),
        ...(options.toDate && { date: { lte: options.toDate } }),
      };
      
      return await prisma.dailySummary.findMany({
        where,
        orderBy: { date: 'desc' },
        take: options.limit || 30,
      });
    } catch (error) {
      console.error('Error fetching daily summaries:', error);
      throw new Error('Failed to fetch daily summaries');
    }
  }

  /**
   * Consolidate experiences into daily summary
   */
  async consolidateDay(
    agentId: string,
    date: Date
  ): Promise<DailySummary | null> {
    try {
      // Get all experiences from that day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const experiences = await prisma.experience.findMany({
        where: {
          agentId,
          timestamp: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        orderBy: { timestamp: 'asc' },
      });
      
      if (experiences.length === 0) {
        return null;
      }
      
      // Calculate highlights
      const significantEvents = experiences
        .filter(e => (e.significance as any) > 0.6)
        .sort((a, b) => (b.significance as any) - (a.significance as any))
        .slice(0, 5);
      
      const uniqueLocations = [
        ...new Set(experiences.filter(e => e.locationId).map(e => e.locationId))
      ];
      
      // Calculate emotional journey
      const emotionalData = experiences.map(e => ({
        timestamp: e.timestamp,
        valence: e.emotionalValence,
        arousal: e.emotionalArousal,
      }));
      
      const avgValence = experiences.reduce(
        (sum, e) => sum + (e.emotionalValence as any), 0
      ) / experiences.length;
      
      // Create summary (narrative would be generated by AI in production)
      const summary = await this.createDailySummary(agentId, date, {
        narrative: `Day summary for ${date.toDateString()}`,
        highlights: {
          totalExperiences: experiences.length,
          significantEvents: significantEvents.map(e => e.id),
          locationsVisited: uniqueLocations,
          interactionCount: experiences.filter(e =>
            e.type === 'CONVERSATION' || e.type === 'TRANSACTION'
          ).length,
        },
        emotionalJourney: {
          averageValence: avgValence,
          timeline: emotionalData,
        },
        lessonsLearned: [],
        personalityInfluences: [],
      });
      
      // Mark experiences as consolidated
      await prisma.experience.updateMany({
        where: {
          agentId,
          timestamp: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        data: {
          consolidatedInto: summary.id,
          consolidatedAt: new Date(),
        },
      });
      
      return summary;
    } catch (error) {
      console.error('Error consolidating day:', error);
      throw new Error('Failed to consolidate day');
    }
  }

  /**
   * Get agent's identity (personality and derived traits)
   */
  async getIdentity(agentId: string) {
    try {
      return await prisma.agentIdentity.findUnique({
        where: { agentId },
      });
    } catch (error) {
      console.error('Error fetching identity:', error);
      throw new Error('Failed to fetch identity');
    }
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(agentId: string): Promise<{
    totalExperiences: number;
    significantExperiences: number;
    dailySummaries: number;
    relationships: number;
    lastExperienceAt: Date | null;
  }> {
    try {
      const [
        totalExperiences,
        significantExperiences,
        dailySummaries,
        relationships,
        lastExperience,
      ] = await Promise.all([
        prisma.experience.count({ where: { agentId } }),
        prisma.experience.count({
          where: { agentId, significance: { gte: 0.7 } },
        }),
        prisma.dailySummary.count({ where: { agentId } }),
        prisma.relationship.count({ where: { agentId } }),
        prisma.experience.findFirst({
          where: { agentId },
          orderBy: { timestamp: 'desc' },
          select: { timestamp: true },
        }),
      ]);
      
      return {
        totalExperiences,
        significantExperiences,
        dailySummaries,
        relationships,
        lastExperienceAt: lastExperience?.timestamp || null,
      };
    } catch (error) {
      console.error('Error fetching memory stats:', error);
      throw new Error('Failed to fetch memory stats');
    }
  }
}

// Export singleton instance
export const memoryService = new MemoryService();
