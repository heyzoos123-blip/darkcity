import { query, transaction } from '../db';
import { ResidencyStatus, PropertyStatus } from '../types';
import { PoolClient } from 'pg';

export class EvictionService {
  private readonly GRACE_PERIOD_DAYS = 3; // Days after due date before eviction

  /**
   * Check for properties eligible for eviction
   */
  async checkEvictions(): Promise<void> {
    const gracePeriod = `${this.GRACE_PERIOD_DAYS} days`;
    
    // Find residencies with overdue payments past grace period
    const result = await query(
      `SELECT DISTINCT r.id, r.agent_address, r.property_id,
              COUNT(rp.id) as missed_payments
       FROM residencies r
       JOIN rent_payments rp ON rp.residency_id = r.id
       WHERE r.status = 'ACTIVE'
       AND rp.status IN ('PENDING', 'LATE', 'FAILED')
       AND rp.due_date < CURRENT_TIMESTAMP - INTERVAL '${gracePeriod}'
       GROUP BY r.id, r.agent_address, r.property_id
       HAVING COUNT(rp.id) > 0`
    );

    console.log(`Found ${result.rows.length} residencies eligible for eviction`);

    for (const residency of result.rows) {
      await this.evictAgent(
        residency.id,
        residency.agent_address,
        residency.property_id,
        parseInt(residency.missed_payments)
      );
    }
  }

  /**
   * Evict an agent from their property
   */
  async evictAgent(
    residencyId: string,
    agentAddress: string,
    propertyId: string,
    missedPayments: number
  ): Promise<void> {
    await transaction(async (client: PoolClient) => {
      // Update residency status
      await client.query(
        `UPDATE residencies
         SET status = $1, move_out_date = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [ResidencyStatus.EVICTED, residencyId]
      );

      // Update property status back to available
      await client.query(
        'UPDATE properties SET status = $1 WHERE id = $2',
        [PropertyStatus.AVAILABLE, propertyId]
      );

      // Log eviction
      await client.query(
        `INSERT INTO evictions (residency_id, agent_address, property_id, reason, missed_payments)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          residencyId,
          agentAddress,
          propertyId,
          `Evicted due to ${missedPayments} missed rent payment(s)`,
          missedPayments
        ]
      );

      // Remove all customizations (agent loses their decorations)
      await client.query(
        'DELETE FROM customizations WHERE property_id = $1',
        [propertyId]
      );

      // Remove custom spawn points (keep default only)
      await client.query(
        'DELETE FROM spawn_points WHERE property_id = $1 AND is_default = false',
        [propertyId]
      );

      console.log(`🚨 EVICTED: Agent ${agentAddress} from property ${propertyId} (${missedPayments} missed payments)`);
      
      // In a real implementation, you would:
      // 1. Notify the agent
      // 2. Move agent to "slums" spawn point
      // 3. Clear their storage/inventory
      // 4. Trigger in-game event
    });
  }

  /**
   * Get eviction history for an agent
   */
  async getAgentEvictions(agentAddress: string): Promise<any[]> {
    const result = await query(
      `SELECT e.*, p.address as property_address, p.tier
       FROM evictions e
       JOIN properties p ON e.property_id = p.id
       WHERE e.agent_address = $1
       ORDER BY e.evicted_at DESC`,
      [agentAddress]
    );

    return result.rows;
  }

  /**
   * Get upcoming evictions (in grace period)
   */
  async getUpcomingEvictions(): Promise<any[]> {
    const gracePeriod = `${this.GRACE_PERIOD_DAYS} days`;
    
    const result = await query(
      `SELECT r.*, p.address, p.tier, 
              rp.due_date, rp.amount,
              CURRENT_TIMESTAMP - rp.due_date as overdue_duration
       FROM residencies r
       JOIN properties p ON r.property_id = p.id
       JOIN rent_payments rp ON rp.residency_id = r.id
       WHERE r.status = 'ACTIVE'
       AND rp.status IN ('PENDING', 'LATE')
       AND rp.due_date < CURRENT_TIMESTAMP
       AND rp.due_date > CURRENT_TIMESTAMP - INTERVAL '${gracePeriod}'
       ORDER BY rp.due_date ASC`
    );

    return result.rows;
  }

  /**
   * Manually evict an agent (admin function)
   */
  async manualEviction(
    residencyId: string,
    reason: string
  ): Promise<void> {
    const result = await query(
      'SELECT agent_address, property_id FROM residencies WHERE id = $1',
      [residencyId]
    );

    if (result.rows.length === 0) {
      throw new Error('Residency not found');
    }

    const { agent_address, property_id } = result.rows[0];
    
    await this.evictAgent(residencyId, agent_address, property_id, 0);
    
    // Update eviction reason
    await query(
      'UPDATE evictions SET reason = $1 WHERE residency_id = $2 ORDER BY evicted_at DESC LIMIT 1',
      [reason, residencyId]
    );
  }
}
