import { Item, InventoryItem, ItemType, ItemRarity, Prisma } from '@prisma/client';
import { getDatabase } from '../client';
import { getCacheManager } from '../cache/redis';

/**
 * Inventory Management Service
 */
export class InventoryService {
  private db = getDatabase();
  private cache = getCacheManager();

  /**
   * Get character's inventory (with caching)
   */
  async getInventory(characterId: string): Promise<InventoryItem[]> {
    // Try cache first
    const cached = await this.cache.getInventory(characterId);
    if (cached) return cached;

    const inventory = await this.db.inventoryItem.findMany({
      where: { characterId },
      include: { item: true },
      orderBy: [
        { equipped: 'desc' },
        { item: { rarity: 'desc' } },
      ],
    });

    // Cache the inventory
    await this.cache.cacheInventory(characterId, inventory);

    return inventory;
  }

  /**
   * Add item to inventory
   */
  async addItem(
    characterId: string,
    itemId: string,
    quantity: number = 1,
    instanceData?: any
  ): Promise<InventoryItem> {
    const item = await this.db.item.findUnique({ where: { id: itemId } });
    if (!item) throw new Error('Item not found');

    // Check if item is stackable and already exists
    if (item.stackable) {
      const existing = await this.db.inventoryItem.findFirst({
        where: { characterId, itemId, equipped: false },
      });

      if (existing) {
        const updated = await this.db.inventoryItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + quantity },
          include: { item: true },
        });

        await this.cache.invalidateInventory(characterId);
        return updated;
      }
    }

    // Create new inventory item
    const inventoryItem = await this.db.inventoryItem.create({
      data: {
        characterId,
        itemId,
        quantity,
        instanceData,
      },
      include: { item: true },
    });

    await this.cache.invalidateInventory(characterId);
    return inventoryItem;
  }

  /**
   * Remove item from inventory
   */
  async removeItem(characterId: string, itemId: string, quantity: number = 1): Promise<void> {
    const inventoryItem = await this.db.inventoryItem.findFirst({
      where: { characterId, itemId },
      include: { item: true },
    });

    if (!inventoryItem) throw new Error('Item not in inventory');

    if (inventoryItem.quantity > quantity) {
      // Reduce quantity
      await this.db.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: { quantity: inventoryItem.quantity - quantity },
      });
    } else {
      // Remove entirely
      await this.db.inventoryItem.delete({
        where: { id: inventoryItem.id },
      });
    }

    await this.cache.invalidateInventory(characterId);
  }

  /**
   * Equip an item
   */
  async equipItem(characterId: string, inventoryItemId: string, slot: string): Promise<InventoryItem> {
    // Unequip any item in the same slot
    await this.db.inventoryItem.updateMany({
      where: { characterId, slot },
      data: { equipped: false, slot: null },
    });

    // Equip the new item
    const equipped = await this.db.inventoryItem.update({
      where: { id: inventoryItemId },
      data: { equipped: true, slot },
      include: { item: true },
    });

    await this.cache.invalidateInventory(characterId);
    await this.cache.invalidateCharacter(characterId);

    return equipped;
  }

  /**
   * Unequip an item
   */
  async unequipItem(inventoryItemId: string): Promise<InventoryItem> {
    const unequipped = await this.db.inventoryItem.update({
      where: { id: inventoryItemId },
      data: { equipped: false, slot: null },
      include: { item: true },
    });

    const characterId = unequipped.characterId;
    await this.cache.invalidateInventory(characterId);
    await this.cache.invalidateCharacter(characterId);

    return unequipped;
  }

  /**
   * Get equipped items
   */
  async getEquippedItems(characterId: string): Promise<InventoryItem[]> {
    return this.db.inventoryItem.findMany({
      where: { characterId, equipped: true },
      include: { item: true },
    });
  }

  /**
   * Transfer item between characters
   */
  async transferItem(
    fromCharacterId: string,
    toCharacterId: string,
    itemId: string,
    quantity: number = 1
  ): Promise<void> {
    await this.db.$transaction(async (tx) => {
      // Check if item is tradeable
      const item = await tx.item.findUnique({ where: { id: itemId } });
      if (!item?.tradeable) throw new Error('Item is not tradeable');

      // Remove from sender
      const senderItem = await tx.inventoryItem.findFirst({
        where: { characterId: fromCharacterId, itemId },
      });

      if (!senderItem || senderItem.quantity < quantity) {
        throw new Error('Insufficient quantity');
      }

      if (senderItem.quantity > quantity) {
        await tx.inventoryItem.update({
          where: { id: senderItem.id },
          data: { quantity: senderItem.quantity - quantity },
        });
      } else {
        await tx.inventoryItem.delete({
          where: { id: senderItem.id },
        });
      }

      // Add to receiver
      const receiverItem = await tx.inventoryItem.findFirst({
        where: { characterId: toCharacterId, itemId },
      });

      if (receiverItem && item.stackable) {
        await tx.inventoryItem.update({
          where: { id: receiverItem.id },
          data: { quantity: receiverItem.quantity + quantity },
        });
      } else {
        await tx.inventoryItem.create({
          data: {
            characterId: toCharacterId,
            itemId,
            quantity,
          },
        });
      }
    });

    // Invalidate both inventories
    await this.cache.invalidateInventory(fromCharacterId);
    await this.cache.invalidateInventory(toCharacterId);
  }
}

/**
 * Item Management Service
 */
export class ItemService {
  private db = getDatabase();

  /**
   * Create a new item
   */
  async create(data: {
    name: string;
    description: string;
    type: ItemType;
    rarity: ItemRarity;
    stats?: any;
    effects?: any;
    baseValue?: number;
    imageUrl?: string;
    craftable?: boolean;
    tradeable?: boolean;
    stackable?: boolean;
    maxStack?: number;
  }): Promise<Item> {
    return this.db.item.create({
      data: {
        ...data,
        stats: data.stats || {},
        effects: data.effects || {},
      },
    });
  }

  /**
   * Get item by ID
   */
  async getById(id: string): Promise<Item | null> {
    return this.db.item.findUnique({ where: { id } });
  }

  /**
   * Search items
   */
  async search(query: {
    name?: string;
    type?: ItemType;
    rarity?: ItemRarity;
    craftable?: boolean;
    tradeable?: boolean;
  }): Promise<Item[]> {
    const where: Prisma.ItemWhereInput = {};

    if (query.name) {
      where.name = { contains: query.name, mode: 'insensitive' };
    }
    if (query.type) where.type = query.type;
    if (query.rarity) where.rarity = query.rarity;
    if (query.craftable !== undefined) where.craftable = query.craftable;
    if (query.tradeable !== undefined) where.tradeable = query.tradeable;

    return this.db.item.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get items by type
   */
  async getByType(type: ItemType): Promise<Item[]> {
    return this.db.item.findMany({
      where: { type },
      orderBy: { rarity: 'desc' },
    });
  }

  /**
   * Update item
   */
  async update(id: string, data: Prisma.ItemUpdateInput): Promise<Item> {
    return this.db.item.update({
      where: { id },
      data,
    });
  }
}
