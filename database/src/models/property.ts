import { Property, PropertyType, Prisma } from '@prisma/client';
import { getDatabase } from '../client';

/**
 * Property Management Service
 */
export class PropertyService {
  private db = getDatabase();

  /**
   * Create a property listing
   */
  async create(data: {
    name: string;
    description: string;
    ownerId: string;
    zone: string;
    address: string;
    coordinates: any;
    type: PropertyType;
    size: number;
    rooms?: number;
    purchasePrice: bigint;
    currentValue: bigint;
    rentPrice?: bigint;
    imageUrl?: string;
  }): Promise<Property> {
    return this.db.property.create({
      data,
    });
  }

  /**
   * Get property by ID
   */
  async getById(id: string): Promise<Property | null> {
    return this.db.property.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, userId: true },
        },
      },
    });
  }

  /**
   * Get character's properties
   */
  async getByOwner(ownerId: string): Promise<Property[]> {
    return this.db.property.findMany({
      where: { ownerId },
      orderBy: { purchasedAt: 'desc' },
    });
  }

  /**
   * Transfer ownership
   */
  async transferOwnership(propertyId: string, newOwnerId: string): Promise<Property> {
    return this.db.property.update({
      where: { id: propertyId },
      data: { ownerId: newOwnerId },
    });
  }

  /**
   * Update property value
   */
  async updateValue(propertyId: string, newValue: bigint): Promise<Property> {
    return this.db.property.update({
      where: { id: propertyId },
      data: { currentValue: newValue },
    });
  }

  /**
   * Toggle rental availability
   */
  async setRentable(propertyId: string, rentable: boolean, rentPrice?: bigint): Promise<Property> {
    return this.db.property.update({
      where: { id: propertyId },
      data: {
        isRentable: rentable,
        ...(rentPrice && { rentPrice }),
      },
    });
  }

  /**
   * Upgrade property
   */
  async upgrade(propertyId: string, upgrades: any): Promise<Property> {
    const property = await this.getById(propertyId);
    if (!property) throw new Error('Property not found');

    const currentUpgrades = (property.upgrades as any) || {};
    const newUpgrades = { ...currentUpgrades, ...upgrades };

    return this.db.property.update({
      where: { id: propertyId },
      data: {
        upgrades: newUpgrades,
        isUpgraded: true,
      },
    });
  }

  /**
   * Pay rent
   */
  async payRent(propertyId: string): Promise<Property> {
    return this.db.property.update({
      where: { id: propertyId },
      data: { lastRentPaid: new Date() },
    });
  }

  /**
   * Search properties
   */
  async search(query: {
    zone?: string;
    type?: PropertyType;
    minPrice?: bigint;
    maxPrice?: bigint;
    rentable?: boolean;
  }): Promise<Property[]> {
    const where: Prisma.PropertyWhereInput = {};

    if (query.zone) where.zone = query.zone;
    if (query.type) where.type = query.type;
    if (query.rentable !== undefined) where.isRentable = query.rentable;

    if (query.minPrice || query.maxPrice) {
      where.currentValue = {};
      if (query.minPrice) where.currentValue.gte = query.minPrice;
      if (query.maxPrice) where.currentValue.lte = query.maxPrice;
    }

    return this.db.property.findMany({
      where,
      include: {
        owner: {
          select: { id: true, name: true },
        },
      },
      orderBy: { currentValue: 'asc' },
    });
  }

  /**
   * Get properties by zone
   */
  async getByZone(zone: string): Promise<Property[]> {
    return this.db.property.findMany({
      where: { zone },
      include: {
        owner: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * Calculate total property value for character
   */
  async getTotalValue(ownerId: string): Promise<bigint> {
    const result = await this.db.property.aggregate({
      where: { ownerId },
      _sum: { currentValue: true },
    });

    return result._sum.currentValue || BigInt(0);
  }
}
