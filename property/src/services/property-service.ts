import { query, transaction } from '../db';
import { Property, PropertyTier, PropertyStatus, PROPERTY_TIERS } from '../types';
import { PoolClient } from 'pg';

export class PropertyService {
  /**
   * List available properties by tier
   */
  async listAvailableProperties(tier?: PropertyTier): Promise<Property[]> {
    let sql = `
      SELECT p.*, b.name as building_name
      FROM properties p
      JOIN buildings b ON p.building_id = b.id
      WHERE p.status = 'AVAILABLE'
    `;
    const params: any[] = [];

    if (tier) {
      sql += ` AND p.tier = $1`;
      params.push(tier);
    }

    sql += ` ORDER BY p.tier, p.address`;

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Get property by ID
   */
  async getProperty(propertyId: string): Promise<Property | null> {
    const result = await query(
      'SELECT * FROM properties WHERE id = $1',
      [propertyId]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a new property
   */
  async createProperty(
    tier: PropertyTier,
    buildingId: string,
    floor: number,
    unitNumber: string
  ): Promise<Property> {
    const address = `${buildingId}-${floor}${unitNumber}`;
    
    const result = await query(
      `INSERT INTO properties (tier, address, building_id, floor, unit_number, status)
       VALUES ($1, $2, $3, $4, $5, 'AVAILABLE')
       RETURNING *`,
      [tier, address, buildingId, floor, unitNumber]
    );

    return result.rows[0];
  }

  /**
   * Rent a property - creates residency and first payment
   */
  async rentProperty(
    propertyId: string,
    agentAddress: string
  ): Promise<{ residency: any; firstPayment: any }> {
    return transaction(async (client: PoolClient) => {
      // Get property details
      const propResult = await client.query(
        'SELECT * FROM properties WHERE id = $1 AND status = $2 FOR UPDATE',
        [propertyId, PropertyStatus.AVAILABLE]
      );

      if (propResult.rows.length === 0) {
        throw new Error('Property not available');
      }

      const property = propResult.rows[0];
      const tierConfig = PROPERTY_TIERS[property.tier as PropertyTier];

      // Create residency
      const now = new Date();
      const nextPaymentDue = new Date(now);
      nextPaymentDue.setMonth(nextPaymentDue.getMonth() + 1);

      const residencyResult = await client.query(
        `INSERT INTO residencies (property_id, agent_address, status, next_payment_due)
         VALUES ($1, $2, 'ACTIVE', $3)
         RETURNING *`,
        [propertyId, agentAddress, nextPaymentDue]
      );

      const residency = residencyResult.rows[0];

      // Create first rent payment (due in 1 month)
      const paymentResult = await client.query(
        `INSERT INTO rent_payments (residency_id, amount, due_date, status)
         VALUES ($1, $2, $3, 'PENDING')
         RETURNING *`,
        [residency.id, tierConfig.rentPerMonth, nextPaymentDue]
      );

      // Update property status
      await client.query(
        'UPDATE properties SET status = $1 WHERE id = $2',
        [PropertyStatus.OCCUPIED, propertyId]
      );

      return {
        residency,
        firstPayment: paymentResult.rows[0]
      };
    });
  }

  /**
   * Get property tier configuration
   */
  getTierConfig(tier: PropertyTier) {
    return PROPERTY_TIERS[tier];
  }

  /**
   * Check storage usage for a property
   */
  async getStorageUsage(propertyId: string): Promise<{
    used: number;
    capacity: number;
    available: number;
  }> {
    const property = await this.getProperty(propertyId);
    if (!property) throw new Error('Property not found');

    const tierConfig = PROPERTY_TIERS[property.tier as PropertyTier];
    
    // Count customization items (rough storage estimation)
    const result = await query(
      'SELECT COUNT(*) as item_count FROM customizations WHERE property_id = $1',
      [propertyId]
    );

    const itemCount = parseInt(result.rows[0].item_count);
    const used = itemCount * 0.1; // Assume 0.1 GB per item

    return {
      used,
      capacity: tierConfig.storageCapacity,
      available: tierConfig.storageCapacity - used
    };
  }

  /**
   * Get agent's current property
   */
  async getAgentProperty(agentAddress: string): Promise<any | null> {
    const result = await query(
      `SELECT p.*, r.*, b.name as building_name
       FROM residencies r
       JOIN properties p ON r.property_id = p.id
       JOIN buildings b ON p.building_id = b.id
       WHERE r.agent_address = $1 AND r.status = 'ACTIVE'
       LIMIT 1`,
      [agentAddress]
    );

    return result.rows[0] || null;
  }
}
