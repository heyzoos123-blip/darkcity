#!/usr/bin/env tsx

/**
 * Restore Script
 * Restores database from a backup
 */

import { BackupManager } from '../src/utils/backup';
import * as readline from 'readline';

async function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const filename = args[0];

  if (!filename) {
    console.log('Usage: npm run db:restore <backup-filename>');
    console.log('\nAvailable backups:');
    
    const backupManager = new BackupManager();
    const backups = backupManager.listBackups();
    
    if (backups.length === 0) {
      console.log('  (no backups found)');
    } else {
      backups.forEach((backup, i) => {
        console.log(`  ${i + 1}. ${backup.filename}`);
        console.log(`     Size: ${backup.sizeFormatted}, Age: ${backup.age}`);
      });
    }
    
    process.exit(1);
  }

  const confirmed = await askConfirmation(
    `⚠️  WARNING: This will overwrite the current database!\nContinue with restore? (yes/no): `
  );

  if (!confirmed) {
    console.log('Restore cancelled');
    process.exit(0);
  }

  const backupManager = new BackupManager();

  try {
    await backupManager.restoreBackup(filename);
    console.log('✓ Database restored successfully');
  } catch (error: any) {
    console.error('✗ Restore failed:', error.message);
    process.exit(1);
  }
}

main();
