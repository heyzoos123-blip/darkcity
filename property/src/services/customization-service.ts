import { query, transaction } from '../db';
import { Customization, SpawnPoint, PropertyTier, PROPERTY_TIERS } from '../types';
import { PoolClient } from 'pg';

export class CustomizationService {
  /**
   * Add customization to property or structure
   */
  async addCustomization(
    targetId: string,
    targetType: 'property' | 'structure',
    slotIndex: number,
    itemType: string,
    itemData: Record<string, any>
  ): Promise<Customization> {
    return transaction(async (client: PoolClient) => {
      // Verify slot availability
      let maxSlots: number;
      
      if (targetType === 'property') {
        const propResult = await client.query(
          'SELECT tier FROM properties WHERE id = $1',
          [targetId]
        );
        
        if (propResult.rows.length === 0) {
          throw new Error('Property not found');
        }
        
        const tier = propResult.rows[0].tier as PropertyTier;
        maxSlots = PROPERTY_TIERS[tier].customizationSlots;
      } else {
        // For structures, we can allow unlimited customizations
        maxSlots = 999;
      }

      // Count existing customizations
      const countField = targetType === 'property' ? 'property_id' : 'structure_id';
      const countResult = await client.query(
        `SELECT COUNT(*) as count FROM customizations WHERE ${countField} = $1`,
        [targetId]
      );

      if (parseInt(countResult.rows[0].count) >= maxSlots) {
        throw new Error(`Maximum customization slots (${maxSlots}) reached`);
      }

      // Add customization
      const fields = targetType === 'property'
        ? 'property_id, slot_index, item_type, item_data'
        : 'structure_id, slot_index, item_type, item_data';
      
      const result = await client.query(
        `INSERT INTO customizations (${fields})
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [targetId, slotIndex, itemType, itemData]
      );

      return result.rows[0];
    });
  }

  /**
   * Remove customization
   */
  async removeCustomization(customizationId: string): Promise<void> {
    await query(
      'DELETE FROM customizations WHERE id = $1',
      [customizationId]
    );
  }

  /**
   * Update customization
   */
  async updateCustomization(
    customizationId: string,
    itemData: Record<string, any>
  ): Promise<Customization> {
    const result = await query(
      'UPDATE customizations SET item_data = $1 WHERE id = $2 RETURNING *',
      [itemData, customizationId]
    );

    if (result.rows.length === 0) {
      throw new Error('Customization not found');
    }

    return result.rows[0];
  }

  /**
   * Get all customizations for a property or structure
   */
  async getCustomizations(
    targetId: string,
    targetType: 'property' | 'structure'
  ): Promise<Customization[]> {
    const field = targetType === 'property' ? 'property_id' : 'structure_id';
    
    const result = await query(
      `SELECT * FROM customizations 
       WHERE ${field} = $1 
       ORDER BY slot_index ASC`,
      [targetId]
    );

    return result.rows;
  }

  /**
   * Add spawn point to property or structure
   */
  async addSpawnPoint(
    targetId: string,
    targetType: 'property' | 'structure',
    name: string,
    positionX: number,
    positionY: number,
    positionZ: number,
    rotation: number = 0,
    isDefault: boolean = false
  ): Promise<SpawnPoint> {
    return transaction(async (client: PoolClient) => {
      // Verify max spawn points
      let maxSpawns: number;
      
      if (targetType === 'property') {
        const propResult = await client.query(
          'SELECT tier FROM properties WHERE id = $1',
          [targetId]
        );
        
        if (propResult.rows.length === 0) {
          throw new Error('Property not found');
        }
        
        const tier = propResult.rows[0].tier as PropertyTier;
        maxSpawns = PROPERTY_TIERS[tier].maxSpawnPoints;
      } else {
        maxSpawns = 999; // Unlimited for custom structures
      }

      // Count existing spawn points
      const countField = targetType === 'property' ? 'property_id' : 'structure_id';
      const countResult = await client.query(
        `SELECT COUNT(*) as count FROM spawn_points WHERE ${countField} = $1`,
        [targetId]
      );

      if (parseInt(countResult.rows[0].count) >= maxSpawns) {
        throw new Error(`Maximum spawn points (${maxSpawns}) reached`);
      }

      // If setting as default, unset other defaults
      if (isDefault) {
        await client.query(
          `UPDATE spawn_points SET is_default = false WHERE ${countField} = $1`,
          [targetId]
        );
      }

      // Add spawn point
      const fields = targetType === 'property'
        ? 'property_id, name, position_x, position_y, position_z, rotation, is_default'
        : 'structure_id, name, position_x, position_y, position_z, rotation, is_default';
      
      const result = await client.query(
        `INSERT INTO spawn_points (${fields})
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [targetId, name, positionX, positionY, positionZ, rotation, isDefault]
      );

      return result.rows[0];
    });
  }

  /**
   * Remove spawn point
   */
  async removeSpawnPoint(spawnPointId: string): Promise<void> {
    await query(
      'DELETE FROM spawn_points WHERE id = $1 AND is_default = false',
      [spawnPointId]
    );
  }

  /**
   * Get all spawn points for a property or structure
   */
  async getSpawnPoints(
    targetId: string,
    targetType: 'property' | 'structure'
  ): Promise<SpawnPoint[]> {
    const field = targetType === 'property' ? 'property_id' : 'structure_id';
    
    const result = await query(
      `SELECT * FROM spawn_points 
       WHERE ${field} = $1 
       ORDER BY is_default DESC, created_at ASC`,
      [targetId]
    );

    return result.rows;
  }

  /**
   * Set default spawn point
   */
  async setDefaultSpawnPoint(
    spawnPointId: string,
    targetId: string,
    targetType: 'property' | 'structure'
  ): Promise<void> {
    await transaction(async (client: PoolClient) => {
      const field = targetType === 'property' ? 'property_id' : 'structure_id';
      
      // Unset all defaults
      await client.query(
        `UPDATE spawn_points SET is_default = false WHERE ${field} = $1`,
        [targetId]
      );

      // Set new default
      await client.query(
        'UPDATE spawn_points SET is_default = true WHERE id = $1',
        [spawnPointId]
      );
    });
  }
}
