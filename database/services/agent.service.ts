/**
 * DARKCITY Agent Service
 * CRUD operations and business logic for agents
 */

import { prisma } from '../config/database.config';
import { cache, REDIS_CONFIG } from '../config/redis.config';
import { Agent, AgentStatus, Prisma } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateAgentInput {
  ownerId: string;
  name: string;
  metadata?: Record<string, any>;
  
  // Optional personality seed
  personality?: {
    openness?: number;
    conscientiousness?: number;
    extraversion?: number;
    agreeableness?: number;
    neuroticism?: number;
  };
}

export interface UpdateAgentInput {
  name?: string;
  status?: AgentStatus;
  currentLocationId?: string | null;
  metadata?: Record<string, any>;
}

export interface AgentWithIdentity extends Agent {
  identity: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
    values: Record<string, any>;
    communicationStyle: Record<string, any>;
  } | null;
}

// ============================================================================
// AGENT SERVICE
// ============================================================================

export class AgentService {
  /**
   * Create a new agent
   */
  async create(input: CreateAgentInput): Promise<Agent> {
    try {
      const agent = await prisma.agent.create({
        data: {
          ownerId: input.ownerId,
          name: input.name,
          metadata: input.metadata || {},
          status: 'IDLE',
          darkcoinBalance: 1000, // Starting balance
          darkflobiBalance: 0,
          
          // Create identity with personality
          identity: {
            create: {
              openness: input.personality?.openness ?? 50,
              conscientiousness: input.personality?.conscientiousness ?? 50,
              extraversion: input.personality?.extraversion ?? 50,
              agreeableness: input.personality?.agreeableness ?? 50,
              neuroticism: input.personality?.neuroticism ?? 50,
              values: {},
              communicationStyle: {},
              personalityHistory: [],
            },
          },
        },
        include: {
          identity: true,
        },
      });
      
      // Invalidate cache
      await this.invalidateCache(agent.id);
      
      return agent;
    } catch (error) {
      console.error('Error creating agent:', error);
      throw new Error('Failed to create agent');
    }
  }

  /**
   * Get agent by ID (with caching)
   */
  async getById(agentId: string): Promise<AgentWithIdentity | null> {
    const cacheKey = `${REDIS_CONFIG.prefixes.cache}agent:${agentId}`;
    
    // Try cache first
    const cached = await cache.get<AgentWithIdentity>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from database
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        identity: true,
      },
    });
    
    if (!agent) {
      return null;
    }
    
    // Cache for 5 minutes
    await cache.set(cacheKey, agent, REDIS_CONFIG.ttl.cache);
    
    return agent as AgentWithIdentity;
  }

  /**
   * Get agents by owner
   */
  async getByOwner(ownerId: string): Promise<Agent[]> {
    try {
      return await prisma.agent.findMany({
        where: { ownerId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('Error fetching agents by owner:', error);
      throw new Error('Failed to fetch agents');
    }
  }

  /**
   * Update agent
   */
  async update(
    agentId: string,
    input: UpdateAgentInput
  ): Promise<Agent> {
    try {
      const agent = await prisma.agent.update({
        where: { id: agentId },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.status && { status: input.status }),
          ...(input.currentLocationId !== undefined && {
            currentLocationId: input.currentLocationId,
          }),
          ...(input.metadata && { metadata: input.metadata }),
          lastActiveAt: new Date(),
        },
      });
      
      // Invalidate cache
      await this.invalidateCache(agentId);
      
      return agent;
    } catch (error) {
      console.error('Error updating agent:', error);
      throw new Error('Failed to update agent');
    }
  }

  /**
   * Update agent location
   */
  async updateLocation(
    agentId: string,
    locationId: string | null
  ): Promise<Agent> {
    try {
      // Remove from old zone cache if exists
      const agent = await this.getById(agentId);
      if (agent?.currentLocationId) {
        const oldLocation = await prisma.location.findUnique({
          where: { id: agent.currentLocationId },
          select: { zoneId: true },
        });
        
        if (oldLocation) {
          const zoneKey = `${REDIS_CONFIG.prefixes.zone}${oldLocation.zoneId}:agents`;
          await cache.removeFromSet(zoneKey, agentId);
        }
      }
      
      // Update location
      const updated = await this.update(agentId, {
        currentLocationId: locationId,
        status: locationId ? 'IDLE' : 'OFFLINE',
      });
      
      // Add to new zone cache if exists
      if (locationId) {
        const newLocation = await prisma.location.findUnique({
          where: { id: locationId },
          select: { zoneId: true },
        });
        
        if (newLocation) {
          const zoneKey = `${REDIS_CONFIG.prefixes.zone}${newLocation.zoneId}:agents`;
          await cache.addToSet(zoneKey, agentId);
        }
      }
      
      return updated;
    } catch (error) {
      console.error('Error updating agent location:', error);
      throw new Error('Failed to update agent location');
    }
  }

  /**
   * Update agent status
   */
  async updateStatus(
    agentId: string,
    status: AgentStatus
  ): Promise<Agent> {
    return this.update(agentId, { status });
  }

  /**
   * Transfer currency between agents or system
   */
  async transferCurrency(
    from: string | 'SYSTEM',
    to: string | 'SYSTEM',
    amount: number,
    currency: 'DARKCOIN' | 'DARKFLOBI'
  ): Promise<void> {
    if (amount <= 0) {
      throw new Error('Transfer amount must be positive');
    }
    
    try {
      await prisma.$transaction(async (tx) => {
        // Debit from sender (if not system)
        if (from !== 'SYSTEM') {
          const sender = await tx.agent.findUnique({
            where: { id: from },
          });
          
          if (!sender) {
            throw new Error('Sender not found');
          }
          
          const field = currency === 'DARKCOIN' ? 'darkcoinBalance' : 'darkflobiBalance';
          const currentBalance = sender[field] as bigint;
          
          if (currentBalance < amount) {
            throw new Error('Insufficient balance');
          }
          
          await tx.agent.update({
            where: { id: from },
            data: {
              [field]: { decrement: amount },
            },
          });
          
          // Invalidate cache
          await this.invalidateCache(from);
        }
        
        // Credit to recipient (if not system)
        if (to !== 'SYSTEM') {
          const field = currency === 'DARKCOIN' ? 'darkcoinBalance' : 'darkflobiBalance';
          
          await tx.agent.update({
            where: { id: to },
            data: {
              [field]: { increment: amount },
            },
          });
          
          // Invalidate cache
          await this.invalidateCache(to);
        }
      });
    } catch (error) {
      console.error('Error transferring currency:', error);
      throw error;
    }
  }

  /**
   * Get agent balance
   */
  async getBalance(agentId: string): Promise<{
    darkcoin: bigint;
    darkflobi: bigint;
  }> {
    const agent = await this.getById(agentId);
    
    if (!agent) {
      throw new Error('Agent not found');
    }
    
    return {
      darkcoin: agent.darkcoinBalance,
      darkflobi: agent.darkflobiBalance,
    };
  }

  /**
   * Update agent personality trait
   */
  async updatePersonality(
    agentId: string,
    trait: 'openness' | 'conscientiousness' | 'extraversion' | 'agreeableness' | 'neuroticism',
    delta: number
  ): Promise<void> {
    try {
      const identity = await prisma.agentIdentity.findUnique({
        where: { agentId },
      });
      
      if (!identity) {
        throw new Error('Agent identity not found');
      }
      
      // Calculate new value (clamped between 0-100)
      const currentValue = identity[trait];
      const newValue = Math.max(0, Math.min(100, currentValue + delta));
      
      // Update with history tracking
      await prisma.agentIdentity.update({
        where: { agentId },
        data: {
          [trait]: newValue,
          personalityHistory: {
            ...(identity.personalityHistory as any),
            push: {
              trait,
              from: currentValue,
              to: newValue,
              delta,
              timestamp: new Date().toISOString(),
            },
          },
        },
      });
      
      // Invalidate cache
      await this.invalidateCache(agentId);
    } catch (error) {
      console.error('Error updating personality:', error);
      throw new Error('Failed to update personality');
    }
  }

  /**
   * Delete agent
   */
  async delete(agentId: string): Promise<void> {
    try {
      await prisma.agent.delete({
        where: { id: agentId },
      });
      
      // Clean up cache
      await this.invalidateCache(agentId);
    } catch (error) {
      console.error('Error deleting agent:', error);
      throw new Error('Failed to delete agent');
    }
  }

  /**
   * Get agents at a location
   */
  async getAgentsAtLocation(locationId: string): Promise<Agent[]> {
    try {
      return await prisma.agent.findMany({
        where: {
          currentLocationId: locationId,
          status: { not: 'OFFLINE' },
        },
        orderBy: { lastActiveAt: 'desc' },
      });
    } catch (error) {
      console.error('Error fetching agents at location:', error);
      throw new Error('Failed to fetch agents at location');
    }
  }

  /**
   * Get agents in a zone (using cache)
   */
  async getAgentsInZone(zoneId: string): Promise<Agent[]> {
    try {
      const zoneKey = `${REDIS_CONFIG.prefixes.zone}${zoneId}:agents`;
      const agentIds = await cache.getSetMembers(zoneKey);
      
      if (agentIds.length === 0) {
        // Rebuild cache from database
        const locations = await prisma.location.findMany({
          where: { zoneId },
          select: { id: true },
        });
        
        const agents = await prisma.agent.findMany({
          where: {
            currentLocationId: { in: locations.map(l => l.id) },
            status: { not: 'OFFLINE' },
          },
        });
        
        // Populate cache
        if (agents.length > 0) {
          await cache.addToSet(zoneKey, ...agents.map(a => a.id));
        }
        
        return agents;
      }
      
      // Fetch agents by cached IDs
      const agents = await prisma.agent.findMany({
        where: {
          id: { in: agentIds },
          status: { not: 'OFFLINE' },
        },
      });
      
      return agents;
    } catch (error) {
      console.error('Error fetching agents in zone:', error);
      throw new Error('Failed to fetch agents in zone');
    }
  }

  /**
   * Search agents by name
   */
  async searchByName(query: string, limit: number = 20): Promise<Agent[]> {
    try {
      return await prisma.agent.findMany({
        where: {
          name: {
            contains: query,
            mode: 'insensitive',
          },
        },
        take: limit,
        orderBy: { lastActiveAt: 'desc' },
      });
    } catch (error) {
      console.error('Error searching agents:', error);
      throw new Error('Failed to search agents');
    }
  }

  /**
   * Get online agents count
   */
  async getOnlineCount(): Promise<number> {
    try {
      return await prisma.agent.count({
        where: {
          status: { not: 'OFFLINE' },
          lastActiveAt: {
            gte: new Date(Date.now() - 30 * 60 * 1000), // Active in last 30 minutes
          },
        },
      });
    } catch (error) {
      console.error('Error getting online count:', error);
      return 0;
    }
  }

  /**
   * Invalidate agent cache
   */
  private async invalidateCache(agentId: string): Promise<void> {
    const cacheKey = `${REDIS_CONFIG.prefixes.cache}agent:${agentId}`;
    await cache.delete(cacheKey);
  }
}

// Export singleton instance
export const agentService = new AgentService();
