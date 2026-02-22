import { Relationship, RelationType, RelationshipStatus, Prisma } from '@prisma/client';
import { getDatabase } from '../client';

/**
 * Relationship Management Service
 */
export class RelationshipService {
  private db = getDatabase();

  /**
   * Create or update a relationship
   */
  async setRelationship(
    fromId: string,
    toId: string,
    type: RelationType,
    status: RelationshipStatus = RelationshipStatus.NEUTRAL
  ): Promise<Relationship> {
    const existing = await this.db.relationship.findUnique({
      where: { fromId_toId: { fromId, toId } },
    });

    if (existing) {
      return this.db.relationship.update({
        where: { id: existing.id },
        data: {
          type,
          status,
          lastInteraction: new Date(),
        },
      });
    }

    return this.db.relationship.create({
      data: {
        fromId,
        toId,
        type,
        status,
      },
    });
  }

  /**
   * Get relationship
   */
  async getRelationship(fromId: string, toId: string): Promise<Relationship | null> {
    return this.db.relationship.findUnique({
      where: { fromId_toId: { fromId, toId } },
      include: {
        to: {
          select: { id: true, name: true, level: true, class: true },
        },
      },
    });
  }

  /**
   * Get character's relationships
   */
  async getRelationships(characterId: string, type?: RelationType): Promise<Relationship[]> {
    return this.db.relationship.findMany({
      where: {
        fromId: characterId,
        ...(type && { type }),
      },
      include: {
        to: {
          select: { id: true, name: true, level: true, class: true, isOnline: true },
        },
      },
      orderBy: { lastInteraction: 'desc' },
    });
  }

  /**
   * Get friends
   */
  async getFriends(characterId: string): Promise<Relationship[]> {
    return this.getRelationships(characterId, RelationType.FRIEND);
  }

  /**
   * Get allies
   */
  async getAllies(characterId: string): Promise<Relationship[]> {
    return this.getRelationships(characterId, RelationType.ALLY);
  }

  /**
   * Get rivals
   */
  async getRivals(characterId: string): Promise<Relationship[]> {
    return this.getRelationships(characterId, RelationType.RIVAL);
  }

  /**
   * Get enemies
   */
  async getEnemies(characterId: string): Promise<Relationship[]> {
    return this.getRelationships(characterId, RelationType.ENEMY);
  }

  /**
   * Update affinity
   */
  async updateAffinity(fromId: string, toId: string, change: number): Promise<Relationship> {
    const relationship = await this.getRelationship(fromId, toId);
    
    if (!relationship) {
      throw new Error('Relationship not found');
    }

    const newAffinity = Math.max(-100, Math.min(100, relationship.affinity + change));

    // Auto-update status based on affinity
    let newStatus = relationship.status;
    if (newAffinity >= 50) {
      newStatus = RelationshipStatus.FRIENDLY;
    } else if (newAffinity <= -50) {
      newStatus = RelationshipStatus.HOSTILE;
    } else {
      newStatus = RelationshipStatus.NEUTRAL;
    }

    return this.db.relationship.update({
      where: { id: relationship.id },
      data: {
        affinity: newAffinity,
        status: newStatus,
        lastInteraction: new Date(),
        interactions: relationship.interactions + 1,
      },
    });
  }

  /**
   * Update trust
   */
  async updateTrust(fromId: string, toId: string, change: number): Promise<Relationship> {
    const relationship = await this.getRelationship(fromId, toId);
    
    if (!relationship) {
      throw new Error('Relationship not found');
    }

    const newTrust = Math.max(0, Math.min(100, relationship.trust + change));

    return this.db.relationship.update({
      where: { id: relationship.id },
      data: {
        trust: newTrust,
        lastInteraction: new Date(),
      },
    });
  }

  /**
   * Record interaction
   */
  async recordInteraction(fromId: string, toId: string, metadata?: any): Promise<Relationship> {
    const relationship = await this.getRelationship(fromId, toId);
    
    if (!relationship) {
      // Create neutral relationship if it doesn't exist
      return this.setRelationship(fromId, toId, RelationType.FRIEND);
    }

    const currentMetadata = (relationship.metadata as any) || {};
    const updatedMetadata = {
      ...currentMetadata,
      ...metadata,
      lastInteractionType: metadata?.type || 'interaction',
    };

    return this.db.relationship.update({
      where: { id: relationship.id },
      data: {
        lastInteraction: new Date(),
        interactions: relationship.interactions + 1,
        metadata: updatedMetadata,
      },
    });
  }

  /**
   * Block character
   */
  async block(fromId: string, toId: string): Promise<Relationship> {
    const relationship = await this.getRelationship(fromId, toId);
    
    if (!relationship) {
      return this.db.relationship.create({
        data: {
          fromId,
          toId,
          type: RelationType.ENEMY,
          status: RelationshipStatus.BLOCKED,
          affinity: -100,
        },
      });
    }

    return this.db.relationship.update({
      where: { id: relationship.id },
      data: {
        status: RelationshipStatus.BLOCKED,
      },
    });
  }

  /**
   * Unblock character
   */
  async unblock(fromId: string, toId: string): Promise<Relationship> {
    const relationship = await this.getRelationship(fromId, toId);
    
    if (!relationship) {
      throw new Error('Relationship not found');
    }

    return this.db.relationship.update({
      where: { id: relationship.id },
      data: {
        status: RelationshipStatus.NEUTRAL,
      },
    });
  }

  /**
   * Delete relationship
   */
  async delete(fromId: string, toId: string): Promise<void> {
    await this.db.relationship.delete({
      where: { fromId_toId: { fromId, toId } },
    });
  }

  /**
   * Get mutual relationships (both directions)
   */
  async getMutualRelationships(characterId: string): Promise<{
    outgoing: Relationship[];
    incoming: Relationship[];
  }> {
    const outgoing = await this.db.relationship.findMany({
      where: { fromId: characterId },
      include: {
        to: {
          select: { id: true, name: true, level: true, class: true },
        },
      },
    });

    const incoming = await this.db.relationship.findMany({
      where: { toId: characterId },
      include: {
        from: {
          select: { id: true, name: true, level: true, class: true },
        },
      },
    });

    return { outgoing, incoming };
  }

  /**
   * Get social stats
   */
  async getSocialStats(characterId: string): Promise<{
    totalFriends: number;
    totalAllies: number;
    totalRivals: number;
    totalEnemies: number;
    totalInteractions: number;
    averageAffinity: number;
  }> {
    const relationships = await this.db.relationship.findMany({
      where: { fromId: characterId },
    });

    const stats = {
      totalFriends: relationships.filter(r => r.type === RelationType.FRIEND).length,
      totalAllies: relationships.filter(r => r.type === RelationType.ALLY).length,
      totalRivals: relationships.filter(r => r.type === RelationType.RIVAL).length,
      totalEnemies: relationships.filter(r => r.type === RelationType.ENEMY).length,
      totalInteractions: relationships.reduce((sum, r) => sum + r.interactions, 0),
      averageAffinity: relationships.length > 0 
        ? relationships.reduce((sum, r) => sum + r.affinity, 0) / relationships.length
        : 0,
    };

    return stats;
  }
}
