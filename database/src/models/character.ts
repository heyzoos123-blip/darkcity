import { Character, CharacterClass, Prisma } from '@prisma/client';
import { getDatabase } from '../client';
import { getCacheManager } from '../cache/redis';

/**
 * Character Management Service
 */
export class CharacterService {
  private db = getDatabase();
  private cache = getCacheManager();

  /**
   * Create a new character
   */
  async create(data: {
    userId: string;
    name: string;
    class: CharacterClass;
    appearance: any;
  }): Promise<Character> {
    const character = await this.db.character.create({
      data: {
        userId: data.userId,
        name: data.name,
        class: data.class,
        appearance: data.appearance,
        // Initialize with default wallet
        wallets: {
          create: [
            { currency: 'SOL', balance: BigInt(0) },
            { currency: 'CREDITS', balance: BigInt(1000) }, // Starting credits
          ],
        },
        // Initialize combat stats
        combatStats: {
          create: {},
        },
      },
      include: {
        wallets: true,
        combatStats: true,
      },
    });

    // Cache the character
    await this.cache.cacheCharacter(character.id, character);

    return character;
  }

  /**
   * Get character by ID (with caching)
   */
  async getById(id: string, includeRelations: boolean = false): Promise<Character | null> {
    // Try cache first
    if (!includeRelations) {
      const cached = await this.cache.getCharacter(id);
      if (cached) return cached;
    }

    const character = await this.db.character.findUnique({
      where: { id },
      include: includeRelations ? {
        wallets: true,
        inventory: {
          include: { item: true },
        },
        combatStats: true,
        quests: {
          include: { quest: true },
        },
        properties: true,
        skills: true,
      } : undefined,
    });

    if (character && !includeRelations) {
      await this.cache.cacheCharacter(id, character);
    }

    return character;
  }

  /**
   * Get character by user ID
   */
  async getByUserId(userId: string): Promise<Character | null> {
    return this.db.character.findUnique({
      where: { userId },
    });
  }

  /**
   * Update character
   */
  async update(id: string, data: Prisma.CharacterUpdateInput): Promise<Character> {
    const character = await this.db.character.update({
      where: { id },
      data,
    });

    // Invalidate cache
    await this.cache.invalidateCharacter(id);

    return character;
  }

  /**
   * Add experience and handle leveling
   */
  async addExperience(id: string, amount: number): Promise<Character> {
    const character = await this.getById(id);
    if (!character) throw new Error('Character not found');

    const newXP = Number(character.experience) + amount;
    const xpForNextLevel = this.calculateXPForLevel(character.level + 1);

    let updates: Prisma.CharacterUpdateInput = {
      experience: BigInt(newXP),
    };

    // Level up if threshold reached
    if (newXP >= xpForNextLevel) {
      const newLevel = character.level + 1;
      updates = {
        ...updates,
        level: newLevel,
        // Stat increases on level up
        maxHealth: character.maxHealth + 10,
        maxEnergy: character.maxEnergy + 5,
        health: character.maxHealth + 10, // Full heal on level up
        energy: character.maxEnergy + 5,
      };
    }

    return this.update(id, updates);
  }

  /**
   * Calculate XP required for a level
   */
  private calculateXPForLevel(level: number): number {
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  /**
   * Update character stats
   */
  async updateStats(id: string, stats: {
    strength?: number;
    dexterity?: number;
    intelligence?: number;
    charisma?: number;
    luck?: number;
  }): Promise<Character> {
    return this.update(id, stats);
  }

  /**
   * Update character location
   */
  async updateLocation(id: string, location: {
    currentZone: string;
    positionX: number;
    positionY: number;
    positionZ?: number;
  }): Promise<Character> {
    return this.update(id, location);
  }

  /**
   * Set online status
   */
  async setOnline(id: string, online: boolean): Promise<Character> {
    const updates: Prisma.CharacterUpdateInput = {
      isOnline: online,
      lastSeen: new Date(),
    };

    const character = await this.update(id, updates);

    // Manage session cache
    if (online) {
      await this.cache.setActiveSession(id, {
        characterId: id,
        startedAt: new Date().toISOString(),
      });
    } else {
      await this.cache.endSession(id);
    }

    return character;
  }

  /**
   * Get all online characters
   */
  async getOnlineCharacters(): Promise<Character[]> {
    return this.db.character.findMany({
      where: { isOnline: true },
      orderBy: { lastSeen: 'desc' },
    });
  }

  /**
   * Search characters
   */
  async search(query: {
    name?: string;
    class?: CharacterClass;
    minLevel?: number;
    maxLevel?: number;
    zone?: string;
  }): Promise<Character[]> {
    const where: Prisma.CharacterWhereInput = {};

    if (query.name) {
      where.name = { contains: query.name, mode: 'insensitive' };
    }
    if (query.class) {
      where.class = query.class;
    }
    if (query.minLevel || query.maxLevel) {
      where.level = {};
      if (query.minLevel) where.level.gte = query.minLevel;
      if (query.maxLevel) where.level.lte = query.maxLevel;
    }
    if (query.zone) {
      where.currentZone = query.zone;
    }

    return this.db.character.findMany({
      where,
      orderBy: { level: 'desc' },
    });
  }

  /**
   * Delete character
   */
  async delete(id: string): Promise<void> {
    await this.db.character.delete({
      where: { id },
    });

    await this.cache.invalidateCharacter(id);
    await this.cache.endSession(id);
  }
}
