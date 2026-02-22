#!/usr/bin/env tsx

/**
 * Backup Script
 * Creates a database backup
 */

import { BackupManager } from '../src/utils/backup';

async function main() {
  const args = process.argv.slice(2);
  const label = args[0];

  const backupManager = new BackupManager();

  try {
    const filepath = await backupManager.createBackup(label);
    
    console.log('Backup Details:');
    console.log('  Path:', filepath);
    
    const backups = backupManager.listBackups();
    console.log(`\nTotal backups: ${backups.length}`);
    
    const totalSize = backupManager.getTotalBackupSize();
    console.log(`Total size: ${totalSize.formatted}`);
  } catch (error: any) {
    console.error('Backup failed:', error.message);
    process.exit(1);
  }
}

main();
