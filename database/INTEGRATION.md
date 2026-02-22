# DARKCITY Database Integration Guide

This guide shows how to integrate the database layer into your DARKCITY game systems.

## Installation

```bash
cd projects/darkcity/database
npm install
npm run setup
```

## Basic Usage

### Initialize Database Connection

```typescript
import { getDatabase, getCacheManager } from '@darkcity/database';

// Get database client
const db = getDatabase();

// Get Redis cache manager
const cache = getCacheManager();
```

### Character Creation Flow

```typescript
import { CharacterService } from '@darkcity/database';

const characterService = new CharacterService();

// Create character from user input
async function createCharacter(userId: string, characterData: any) {
  try {
    const character = await characterService.create({
      userId,
      name: characterData.name,
      class: characterData.class,
      appearance: {
        hairStyle: characterData.hairStyle,
        hairColor: characterData.hairColor,
        skinTone: characterData.skinTone,
        outfit: characterData.outfit,
        accessories: characterData.accessories,
      },
    });

    console.log('Character created:', character.id);
    return character;
  } catch (error) {
    console.error('Failed to create character:', error);
    throw error;
  }
}

// Load character for gameplay
async function loadCharacter(userId: string) {
  const character = await characterService.getByUserId(userId);
  
  if (!character) {
    throw new Error('Character not found');
  }

  // Set online status
  await characterService.setOnline(character.id, true);
  
  return character;
}
```

### Inventory Management

```typescript
import { InventoryService, ItemService } from '@darkcity/database';

const inventoryService = new InventoryService();
const itemService = new ItemService();

// Give item to player
async function giveItem(characterId: string, itemName: string, quantity: number = 1) {
  // Find item by name
  const items = await itemService.search({ name: itemName });
  
  if (items.length === 0) {
    throw new Error(`Item not found: ${itemName}`);
  }

  const item = items[0];
  await inventoryService.addItem(characterId, item.id, quantity);
  
  console.log(`Gave ${quantity}x ${item.name} to character ${characterId}`);
}

// Equip weapon
async function equipWeapon(characterId: string, weaponItemId: string) {
  const inventory = await inventoryService.getInventory(characterId);
  const inventoryItem = inventory.find(i => i.itemId === weaponItemId);
  
  if (!inventoryItem) {
    throw new Error('Item not in inventory');
  }

  await inventoryService.equipItem(characterId, inventoryItem.id, 'weapon');
  console.log('Weapon equipped');
}

// Get character's loadout
async function getLoadout(characterId: string) {
  const equipped = await inventoryService.getEquippedItems(characterId);
  
  return {
    weapon: equipped.find(i => i.slot === 'weapon'),
    armor: equipped.find(i => i.slot === 'armor'),
    accessory1: equipped.find(i => i.slot === 'accessory1'),
    accessory2: equipped.find(i => i.slot === 'accessory2'),
  };
}
```

### Wallet & Transactions

```typescript
import { WalletService, TransactionService } from '@darkcity/database';

const walletService = new WalletService();
const transactionService = new TransactionService();

// Reward player with credits
async function rewardCredits(characterId: string, amount: number, reason: string) {
  await walletService.addFunds(
    characterId,
    'CREDITS',
    BigInt(amount),
    'QUEST_REWARD',
    reason
  );
  
  console.log(`Rewarded ${amount} credits to ${characterId}`);
}

// Purchase item from shop
async function purchaseItem(characterId: string, itemId: string) {
  const item = await itemService.getById(itemId);
  
  if (!item) {
    throw new Error('Item not found');
  }

  // Check if player has enough credits
  const balance = await walletService.getBalance(characterId, 'CREDITS');
  
  if (balance < BigInt(item.baseValue)) {
    throw new Error('Insufficient credits');
  }

  // Deduct credits
  await walletService.deductFunds(
    characterId,
    'CREDITS',
    BigInt(item.baseValue),
    'PURCHASE',
    `Purchased ${item.name}`
  );

  // Add item to inventory
  await inventoryService.addItem(characterId, itemId, 1);
  
  console.log(`${item.name} purchased for ${item.baseValue} credits`);
}

// Player-to-player trade
async function tradeCredits(fromCharacterId: string, toCharacterId: string, amount: number) {
  await walletService.transfer(
    fromCharacterId,
    toCharacterId,
    'CREDITS',
    BigInt(amount),
    'TRANSFER',
    'Player trade'
  );
  
  console.log(`Transferred ${amount} credits`);
}
```

### Quest System

```typescript
import { QuestService } from '@darkcity/database';

const questService = new QuestService();

// Get available quests for character
async function getAvailableQuests(characterId: string) {
  const character = await characterService.getById(characterId);
  
  if (!character) {
    throw new Error('Character not found');
  }

  return await questService.getAvailable(characterId, character.level);
}

// Accept quest
async function acceptQuest(characterId: string, questId: string) {
  const progress = await questService.startQuest(characterId, questId);
  console.log('Quest started:', progress.id);
  return progress;
}

// Update quest objective
async function updateQuestObjective(
  characterId: string, 
  questId: string, 
  objectiveId: string, 
  progress: number
) {
  const updated = await questService.updateProgress(
    characterId,
    questId,
    objectiveId,
    progress
  );
  
  console.log(`Quest progress updated: ${objectiveId} = ${progress}`);
  
  // Check if quest is complete
  if (updated.status === 'COMPLETED') {
    await rewardQuestCompletion(characterId, questId);
  }
  
  return updated;
}

// Handle quest completion
async function rewardQuestCompletion(characterId: string, questId: string) {
  const quest = await questService.getById(questId);
  
  if (!quest) return;

  const rewards = quest.rewards as any;
  
  // Award XP
  if (rewards.xp) {
    await characterService.addExperience(characterId, rewards.xp);
  }
  
  // Award credits
  if (rewards.credits) {
    await rewardCredits(characterId, rewards.credits, `Quest: ${quest.title}`);
  }
  
  // Award items
  if (rewards.items && Array.isArray(rewards.items)) {
    for (const itemId of rewards.items) {
      await inventoryService.addItem(characterId, itemId, 1);
    }
  }
  
  console.log(`Quest completed: ${quest.title}`);
}
```

### Combat System

```typescript
import { CombatService } from '@darkcity/database';

const combatService = new CombatService();

// Start combat encounter
async function startCombat(attackerId: string, defenderId?: string) {
  const combatId = `combat_${Date.now()}`;
  
  // Cache combat state
  await cache.setCombatState(combatId, {
    attackerId,
    defenderId,
    startTime: Date.now(),
    round: 1,
    events: [],
  });
  
  return combatId;
}

// Record combat result
async function endCombat(
  combatId: string,
  attackerId: string,
  defenderId: string | undefined,
  outcome: 'VICTORY' | 'DEFEAT' | 'DRAW',
  events: any[],
  finalStats: any
) {
  const state = await cache.getCombatState(combatId);
  
  const duration = Math.floor((Date.now() - state.startTime) / 1000);
  
  const replay = await combatService.recordCombat({
    attackerId,
    defenderId,
    outcome,
    duration,
    rounds: state.round,
    events,
    finalStats,
    rewards: calculateCombatRewards(outcome, finalStats),
    location: 'downtown',
    combatType: defenderId ? 'PVP_DUEL' : 'PVE_MOB',
  });
  
  await cache.endCombat(combatId);
  
  console.log('Combat recorded:', replay.id);
  return replay;
}

function calculateCombatRewards(outcome: string, stats: any) {
  if (outcome !== 'VICTORY') return null;
  
  return {
    xp: 100 + stats.attacker.damageDealt,
    credits: 50,
  };
}
```

### Caching Strategy

```typescript
// Cache frequently accessed data
async function getCharacterWithCache(characterId: string) {
  // Try cache first
  let character = await cache.getCharacter(characterId);
  
  if (!character) {
    // Cache miss - fetch from database
    character = await characterService.getById(characterId);
    
    if (character) {
      // Cache for 30 minutes
      await cache.cacheCharacter(characterId, character, 1800);
    }
  }
  
  return character;
}

// Invalidate cache after updates
async function updateCharacterStats(characterId: string, stats: any) {
  await characterService.updateStats(characterId, stats);
  
  // Invalidate cache
  await cache.invalidateCharacter(characterId);
}
```

### Session Management

```typescript
// Start game session
async function startSession(characterId: string, sessionType: string) {
  await characterService.setOnline(characterId, true);
  
  await cache.setActiveSession(characterId, {
    sessionType,
    startedAt: new Date().toISOString(),
    data: { location: 'downtown' },
  });
  
  console.log('Session started');
}

// End game session
async function endSession(characterId: string) {
  await characterService.setOnline(characterId, false);
  await cache.endSession(characterId);
  
  console.log('Session ended');
}

// Get all online players
async function getOnlinePlayers() {
  return await characterService.getOnlineCharacters();
}
```

### Error Handling

```typescript
import { Prisma } from '@prisma/client';

async function safeOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle specific Prisma errors
      if (error.code === 'P2002') {
        console.error('Unique constraint violation:', error.meta);
      } else if (error.code === 'P2025') {
        console.error('Record not found:', error.meta);
      }
    }
    
    console.error(errorMessage, error);
    return null;
  }
}

// Usage
const character = await safeOperation(
  () => characterService.create({ ... }),
  'Failed to create character'
);
```

## Best Practices

1. **Always use transactions** for multi-step operations
2. **Cache frequently accessed data** (characters, inventory)
3. **Invalidate cache** after updates
4. **Use BigInt** for currency amounts
5. **Validate input** before database operations
6. **Handle errors gracefully**
7. **Log important operations**
8. **Use type-safe operations** with TypeScript
9. **Close connections** when done
10. **Run integrity checks** regularly

## Testing

```typescript
import { getDatabase, CharacterService } from '@darkcity/database';

describe('Character System', () => {
  let db: PrismaClient;
  let characterService: CharacterService;

  beforeAll(async () => {
    db = getDatabase();
    characterService = new CharacterService();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  test('should create character', async () => {
    const character = await characterService.create({
      userId: 'test_user',
      name: 'TestChar',
      class: 'HACKER',
      appearance: { hairStyle: 'mohawk', hairColor: 'blue', skinTone: 'pale' },
    });

    expect(character).toBeDefined();
    expect(character.name).toBe('TestChar');
  });
});
```

## Production Checklist

- [ ] Set strong database passwords
- [ ] Enable SSL for database connections
- [ ] Configure connection pooling
- [ ] Set up automated backups
- [ ] Monitor database performance
- [ ] Run integrity checks regularly
- [ ] Configure Redis persistence
- [ ] Set cache eviction policies
- [ ] Enable query logging (development)
- [ ] Use read replicas for scaling
- [ ] Set up monitoring and alerts
- [ ] Document schema changes
