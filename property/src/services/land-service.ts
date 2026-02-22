import { query, transaction } from '../db';
import { LandPlot, Structure } from '../types';
import { PoolClient } from 'pg';

export class LandService {
  /**
   * List available land plots
   */
  async listAvailablePlots(): Promise<LandPlot[]> {
    const result = await query(
      `SELECT * FROM land_plots
       WHERE owner_address IS NULL
       ORDER BY price ASC, size_sqm DESC`
    );

    return result.rows;
  }

  /**
   * Get land plot by ID
   */
  async getPlot(plotId: string): Promise<LandPlot | null> {
    const result = await query(
      'SELECT * FROM land_plots WHERE id = $1',
      [plotId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get plots owned by an agent
   */
  async getAgentPlots(ownerAddress: string): Promise<LandPlot[]> {
    const result = await query(
      'SELECT * FROM land_plots WHERE owner_address = $1',
      [ownerAddress]
    );

    return result.rows;
  }

  /**
   * Purchase a land plot
   */
  async purchasePlot(
    plotId: string,
    buyerAddress: string,
    transactionSignature: string
  ): Promise<LandPlot> {
    return transaction(async (client: PoolClient) => {
      // Lock the plot
      const plotResult = await client.query(
        'SELECT * FROM land_plots WHERE id = $1 AND owner_address IS NULL FOR UPDATE',
        [plotId]
      );

      if (plotResult.rows.length === 0) {
        throw new Error('Land plot not available');
      }

      const plot = plotResult.rows[0];

      // Update ownership
      const updateResult = await client.query(
        `UPDATE land_plots
         SET owner_address = $1, purchased_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [buyerAddress, plotId]
      );

      // Log the transfer
      await client.query(
        `INSERT INTO ownership_transfers (land_plot_id, from_address, to_address, price, transaction_signature)
         VALUES ($1, NULL, $2, $3, $4)`,
        [plotId, buyerAddress, plot.price, transactionSignature]
      );

      console.log(`🏗️ LAND PURCHASED: Plot ${plot.plot_number} by ${buyerAddress} for ${plot.price} SOL`);

      return updateResult.rows[0];
    });
  }

  /**
   * Transfer land ownership
   */
  async transferPlot(
    plotId: string,
    fromAddress: string,
    toAddress: string,
    price: number,
    transactionSignature: string
  ): Promise<void> {
    await transaction(async (client: PoolClient) => {
      // Verify current ownership
      const plotResult = await client.query(
        'SELECT * FROM land_plots WHERE id = $1 AND owner_address = $2 FOR UPDATE',
        [plotId, fromAddress]
      );

      if (plotResult.rows.length === 0) {
        throw new Error('Land plot not found or not owned by seller');
      }

      // Transfer ownership
      await client.query(
        'UPDATE land_plots SET owner_address = $1 WHERE id = $2',
        [toAddress, plotId]
      );

      // Log the transfer
      await client.query(
        `INSERT INTO ownership_transfers (land_plot_id, from_address, to_address, price, transaction_signature)
         VALUES ($1, $2, $3, $4, $5)`,
        [plotId, fromAddress, toAddress, price, transactionSignature]
      );

      console.log(`🔄 LAND TRANSFERRED: Plot ${plotId} from ${fromAddress} to ${toAddress} for ${price} SOL`);
    });
  }

  /**
   * Build a structure on owned land
   */
  async buildStructure(
    plotId: string,
    ownerAddress: string,
    structureData: {
      name: string;
      type: string;
      blueprint: Record<string, any>;
      buildCost: number;
    },
    transactionSignature: string
  ): Promise<Structure> {
    return transaction(async (client: PoolClient) => {
      // Verify ownership
      const plotResult = await client.query(
        'SELECT * FROM land_plots WHERE id = $1 AND owner_address = $2 FOR UPDATE',
        [plotId, ownerAddress]
      );

      if (plotResult.rows.length === 0) {
        throw new Error('Land plot not found or not owned by builder');
      }

      // Check if structure already exists
      const existingResult = await client.query(
        'SELECT id FROM structures WHERE land_plot_id = $1',
        [plotId]
      );

      if (existingResult.rows.length > 0) {
        throw new Error('A structure already exists on this plot');
      }

      // Create structure
      const structureResult = await client.query(
        `INSERT INTO structures (land_plot_id, name, structure_type, blueprint_data, build_cost)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [plotId, structureData.name, structureData.type, structureData.blueprint, structureData.buildCost]
      );

      console.log(`🏗️ STRUCTURE BUILT: ${structureData.name} on plot ${plotId} for ${structureData.buildCost} SOL`);

      return structureResult.rows[0];
    });
  }

  /**
   * Get structure on a plot
   */
  async getPlotStructure(plotId: string): Promise<Structure | null> {
    const result = await query(
      'SELECT * FROM structures WHERE land_plot_id = $1',
      [plotId]
    );

    return result.rows[0] || null;
  }

  /**
   * Demolish a structure (returns plot to empty state)
   */
  async demolishStructure(
    plotId: string,
    ownerAddress: string
  ): Promise<void> {
    await transaction(async (client: PoolClient) => {
      // Verify ownership
      const plotResult = await client.query(
        'SELECT * FROM land_plots WHERE id = $1 AND owner_address = $2',
        [plotId, ownerAddress]
      );

      if (plotResult.rows.length === 0) {
        throw new Error('Land plot not found or not owned');
      }

      // Delete structure (cascades to customizations and spawn points)
      await client.query(
        'DELETE FROM structures WHERE land_plot_id = $1',
        [plotId]
      );

      console.log(`🔨 STRUCTURE DEMOLISHED on plot ${plotId}`);
    });
  }

  /**
   * Get ownership transfer history for a plot
   */
  async getTransferHistory(plotId: string): Promise<any[]> {
    const result = await query(
      `SELECT * FROM ownership_transfers
       WHERE land_plot_id = $1
       ORDER BY transferred_at DESC`,
      [plotId]
    );

    return result.rows;
  }

  /**
   * Create a new land plot (admin function)
   */
  async createPlot(
    plotNumber: string,
    sizeSqm: number,
    price: number,
    locationX: number,
    locationY: number,
    zoningType: string = 'MIXED_USE'
  ): Promise<LandPlot> {
    const result = await query(
      `INSERT INTO land_plots (plot_number, size_sqm, price, location_x, location_y, zoning_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [plotNumber, sizeSqm, price, locationX, locationY, zoningType]
    );

    return result.rows[0];
  }
}
