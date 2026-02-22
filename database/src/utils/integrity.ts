import { getDatabase } from '../client';

/**
 * Data Integrity Check System
 */
export class IntegrityChecker {
  private db = getDatabase();

  /**
   * Run all integrity checks
   */
  async runAllChecks(): Promise<{
    passed: boolean;
    checks: Array<{
      name: string;
      status: 'passed' | 'failed' | 'warning';
      details: any;
    }>;
  }> {
    console.log('🔍 Running data integrity checks...\n');

    const checks = [
      await this.checkOrphanedInventoryItems(),
      await this.checkOrphanedWallets(),
      await this.checkNegativeBalances(),
      await this.checkInvalidRelationships(),
      await this.checkMissingCombatStats(),
      await this.checkDuplicateCharacters(),
      await this.checkInvalidQuestProgress(),
      await this.checkConsistentTransactions(),
    ];

    const passed = checks.every(c => c.status === 'passed');

    // Log to database
    await this.logCheck('full_integrity_scan', passed ? 'passed' : 'failed', {
      checks,
      timestamp: new Date().toISOString(),
    });

    return { passed, checks };
  }

  /**
   * Check for orphaned inventory items
   */
  private async checkOrphanedInventoryItems(): Promise<any> {
    console.log('Checking for orphaned inventory items...');
    
    const orphaned = await this.db.inventoryItem.findMany({
      where: {
        character: null,
      },
    });

    const status = orphaned.length === 0 ? 'passed' : 'warning';
    console.log(`${status === 'passed' ? '✓' : '⚠'} Found ${orphaned.length} orphaned inventory items\n`);

    return {
      name: 'Orphaned Inventory Items',
      status,
      details: {
        count: orphaned.length,
        items: orphaned.map(i => i.id),
      },
    };
  }

  /**
   * Check for orphaned wallets
   */
  private async checkOrphanedWallets(): Promise<any> {
    console.log('Checking for orphaned wallets...');
    
    const orphaned = await this.db.wallet.findMany({
      where: {
        character: null,
      },
    });

    const status = orphaned.length === 0 ? 'passed' : 'warning';
    console.log(`${status === 'passed' ? '✓' : '⚠'} Found ${orphaned.length} orphaned wallets\n`);

    return {
      name: 'Orphaned Wallets',
      status,
      details: {
        count: orphaned.length,
        wallets: orphaned.map(w => w.id),
      },
    };
  }

  /**
   * Check for negative balances
   */
  private async checkNegativeBalances(): Promise<any> {
    console.log('Checking for negative balances...');
    
    const negative = await this.db.wallet.findMany({
      where: {
        balance: { lt: BigInt(0) },
      },
      include: {
        character: {
          select: { id: true, name: true },
        },
      },
    });

    const status = negative.length === 0 ? 'passed' : 'failed';
    console.log(`${status === 'passed' ? '✓' : '✗'} Found ${negative.length} negative balances\n`);

    return {
      name: 'Negative Balances',
      status,
      details: {
        count: negative.length,
        wallets: negative.map(w => ({
          walletId: w.id,
          characterName: w.character.name,
          currency: w.currency,
          balance: w.balance.toString(),
        })),
      },
    };
  }

  /**
   * Check for invalid relationships (self-referencing)
   */
  private async checkInvalidRelationships(): Promise<any> {
    console.log('Checking for invalid relationships...');
    
    const invalid = await this.db.relationship.findMany({
      where: {
        fromId: {
          equals: this.db.relationship.fields.toId,
        },
      },
    });

    const status = invalid.length === 0 ? 'passed' : 'warning';
    console.log(`${status === 'passed' ? '✓' : '⚠'} Found ${invalid.length} self-referencing relationships\n`);

    return {
      name: 'Invalid Relationships',
      status,
      details: {
        count: invalid.length,
        relationships: invalid.map(r => r.id),
      },
    };
  }

  /**
   * Check for characters without combat stats
   */
  private async checkMissingCombatStats(): Promise<any> {
    console.log('Checking for missing combat stats...');
    
    const missing = await this.db.character.findMany({
      where: {
        combatStats: null,
      },
      select: { id: true, name: true },
    });

    const status = missing.length === 0 ? 'passed' : 'warning';
    console.log(`${status === 'passed' ? '✓' : '⚠'} Found ${missing.length} characters without combat stats\n`);

    // Auto-fix: Create missing combat stats
    if (missing.length > 0) {
      console.log('Auto-fixing: Creating missing combat stats...');
      for (const character of missing) {
        await this.db.combatStats.create({
          data: { characterId: character.id },
        });
      }
      console.log('✓ Fixed missing combat stats\n');
    }

    return {
      name: 'Missing Combat Stats',
      status,
      details: {
        count: missing.length,
        fixed: missing.length,
        characters: missing.map(c => c.name),
      },
    };
  }

  /**
   * Check for duplicate characters by userId
   */
  private async checkDuplicateCharacters(): Promise<any> {
    console.log('Checking for duplicate characters...');
    
    const duplicates = await this.db.character.groupBy({
      by: ['userId'],
      having: {
        userId: {
          _count: { gt: 1 },
        },
      },
    });

    const status = duplicates.length === 0 ? 'passed' : 'failed';
    console.log(`${status === 'passed' ? '✓' : '✗'} Found ${duplicates.length} duplicate user IDs\n`);

    return {
      name: 'Duplicate Characters',
      status,
      details: {
        count: duplicates.length,
        userIds: duplicates.map(d => d.userId),
      },
    };
  }

  /**
   * Check for invalid quest progress
   */
  private async checkInvalidQuestProgress(): Promise<any> {
    console.log('Checking for invalid quest progress...');
    
    const invalid = await this.db.questProgress.findMany({
      where: {
        OR: [
          { quest: null },
          { character: null },
        ],
      },
    });

    const status = invalid.length === 0 ? 'passed' : 'warning';
    console.log(`${status === 'passed' ? '✓' : '⚠'} Found ${invalid.length} invalid quest progress records\n`);

    return {
      name: 'Invalid Quest Progress',
      status,
      details: {
        count: invalid.length,
        records: invalid.map(q => q.id),
      },
    };
  }

  /**
   * Check transaction consistency
   */
  private async checkConsistentTransactions(): Promise<any> {
    console.log('Checking transaction consistency...');
    
    // Find transactions where both from and to are null
    const invalid = await this.db.transaction.findMany({
      where: {
        AND: [
          { fromWalletId: null },
          { toWalletId: null },
        ],
      },
    });

    const status = invalid.length === 0 ? 'passed' : 'warning';
    console.log(`${status === 'passed' ? '✓' : '⚠'} Found ${invalid.length} inconsistent transactions\n`);

    return {
      name: 'Transaction Consistency',
      status,
      details: {
        count: invalid.length,
        transactions: invalid.map(t => t.id),
      },
    };
  }

  /**
   * Log integrity check results
   */
  private async logCheck(checkType: string, status: string, details: any): Promise<void> {
    await this.db.dataIntegrityLog.create({
      data: {
        checkType,
        status,
        details,
      },
    });
  }

  /**
   * Get integrity check history
   */
  async getCheckHistory(limit: number = 20): Promise<any[]> {
    return this.db.dataIntegrityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Clean up old logs
   */
  async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.db.dataIntegrityLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return result.count;
  }
}
