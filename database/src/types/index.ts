/**
 * TypeScript type definitions for DARKCITY database
 */

import { 
  Character, 
  Item, 
  InventoryItem, 
  Wallet, 
  Transaction,
  Property,
  Quest,
  QuestProgress,
  CombatStats,
  CombatReplay,
  Relationship 
} from '@prisma/client';

// Extended types with relations
export type CharacterWithRelations = Character & {
  wallets?: Wallet[];
  inventory?: (InventoryItem & { item: Item })[];
  combatStats?: CombatStats | null;
  quests?: (QuestProgress & { quest: Quest })[];
  properties?: Property[];
  relationships?: Relationship[];
};

export type InventoryItemWithItem = InventoryItem & {
  item: Item;
};

export type TransactionWithWallets = Transaction & {
  fromWallet?: (Wallet & { character: Pick<Character, 'id' | 'name'> }) | null;
  toWallet?: (Wallet & { character: Pick<Character, 'id' | 'name'> }) | null;
};

export type QuestProgressWithQuest = QuestProgress & {
  quest: Quest;
};

export type PropertyWithOwner = Property & {
  owner: Pick<Character, 'id' | 'name' | 'userId'>;
};

export type RelationshipWithCharacters = Relationship & {
  from?: Pick<Character, 'id' | 'name' | 'level' | 'class'>;
  to?: Pick<Character, 'id' | 'name' | 'level' | 'class' | 'isOnline'>;
};

// Cache data types
export interface SessionData {
  characterId: string;
  sessionType: string;
  startedAt: string;
  data?: any;
}

export interface QueueData {
  characterId: string;
  rating?: number;
  preferences?: any;
  joinedAt: number;
}

export interface LeaderboardEntry {
  characterId: string;
  score: number;
  rank?: number;
}

// Combat event types
export interface CombatEvent {
  timestamp: number;
  round: number;
  actor: string;
  action: string;
  target?: string;
  damage?: number;
  result?: string;
}

export interface CombatFinalStats {
  attacker?: {
    damageDealt: number;
    damageTaken: number;
    kills?: number;
    deaths?: number;
  };
  defender?: {
    damageDealt: number;
    damageTaken: number;
    kills?: number;
    deaths?: number;
  };
}

// Quest objective types
export interface QuestObjective {
  id: string;
  description: string;
  target: number;
  completed?: boolean;
  progress?: number;
}

export interface QuestRewards {
  xp?: number;
  credits?: number;
  items?: string[];
  reputation?: number;
  title?: string;
  cosmetic?: string;
}

// Item stats and effects
export interface ItemStats {
  damage?: number;
  defense?: number;
  speed?: number;
  range?: string;
  strength?: number;
  dexterity?: number;
  intelligence?: number;
  charisma?: number;
  luck?: number;
  healing?: number;
  energyRestore?: number;
  damageBoost?: number;
  speedBoost?: number;
  crit?: number;
  armorPen?: number;
  weight?: number;
  handling?: number;
  armor?: number;
  [key: string]: any;
}

export interface ItemEffects {
  duration?: number;
  instant?: boolean;
  burn?: { chance: number; damage: number };
  bleed?: { chance: number; damage: number };
  energyBlade?: { bonusDamage: number };
  powerArmor?: { damageReduction: number };
  quickhack?: { cooldownReduction: number };
  bulletResist?: number;
  hover?: boolean;
  [key: string]: any;
}

// Character appearance
export interface CharacterAppearance {
  hairStyle: string;
  hairColor: string;
  skinTone: string;
  outfit?: string;
  accessories?: string[];
  [key: string]: any;
}

// Property coordinates
export interface PropertyCoordinates {
  x: number;
  y: number;
  z?: number;
}

// Property upgrades
export interface PropertyUpgrades {
  security?: number;
  storage?: number;
  workshop?: boolean;
  [key: string]: any;
}

// Transaction metadata
export interface TransactionMetadata {
  questId?: string;
  itemId?: string;
  propertyId?: string;
  combatId?: string;
  description?: string;
  [key: string]: any;
}

// Relationship metadata
export interface RelationshipMetadata {
  sharedQuests?: string[];
  trades?: number;
  combats?: number;
  lastInteractionType?: string;
  [key: string]: any;
}

// Database query options
export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface SearchOptions extends PaginationOptions {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Integrity check result
export interface IntegrityCheckResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  details: {
    count: number;
    [key: string]: any;
  };
}

// Backup info
export interface BackupInfo {
  filename: string;
  size: number;
  sizeFormatted: string;
  created: Date;
  age: string;
}

// Cache statistics
export interface CacheStats {
  connected: boolean;
  dbSize: number;
  info: Record<string, string>;
}

// Service response types
export type ServiceResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

export interface BatchOperation<T> {
  operation: 'create' | 'update' | 'delete';
  data: T;
}

// Event types for pub/sub
export interface GameEvent {
  type: string;
  timestamp: number;
  data: any;
}

export interface CombatEvent extends GameEvent {
  type: 'combat';
  data: {
    combatId: string;
    participants: string[];
    status: 'started' | 'ongoing' | 'completed';
  };
}

export interface TradeEvent extends GameEvent {
  type: 'trade';
  data: {
    fromCharacterId: string;
    toCharacterId: string;
    items: string[];
    credits: number;
  };
}

export interface LevelUpEvent extends GameEvent {
  type: 'levelUp';
  data: {
    characterId: string;
    newLevel: number;
    statsGained: Partial<ItemStats>;
  };
}
