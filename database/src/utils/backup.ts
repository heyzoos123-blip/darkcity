import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { config } from '../config';

const execAsync = promisify(exec);

/**
 * Database Backup & Restore System
 */
export class BackupManager {
  private backupDir: string;

  constructor() {
    this.backupDir = config.backupDir;
    
    // Ensure backup directory exists
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create a database backup
   */
  async createBackup(label?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `darkcity_backup_${timestamp}${label ? `_${label}` : ''}.sql`;
    const filepath = join(this.backupDir, filename);

    console.log(`📦 Creating backup: ${filename}`);

    try {
      // Parse DATABASE_URL
      const dbUrl = new URL(config.databaseUrl);
      const dbName = dbUrl.pathname.slice(1);
      const host = dbUrl.hostname;
      const port = dbUrl.port || '5432';
      const user = dbUrl.username;
      const password = dbUrl.password;

      // Use pg_dump
      const command = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${user} -F c -b -v -f "${filepath}" ${dbName}`;
      
      await execAsync(command);

      const stats = statSync(filepath);
      console.log(`✓ Backup created: ${filename} (${this.formatBytes(stats.size)})\n`);

      return filepath;
    } catch (error: any) {
      console.error('✗ Backup failed:', error.message);
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  /**
   * Restore from a backup
   */
  async restoreBackup(filename: string): Promise<void> {
    const filepath = join(this.backupDir, filename);

    if (!existsSync(filepath)) {
      throw new Error(`Backup file not found: ${filename}`);
    }

    console.log(`📥 Restoring from backup: ${filename}`);
    console.log('⚠️  WARNING: This will overwrite the current database!');

    try {
      // Parse DATABASE_URL
      const dbUrl = new URL(config.databaseUrl);
      const dbName = dbUrl.pathname.slice(1);
      const host = dbUrl.hostname;
      const port = dbUrl.port || '5432';
      const user = dbUrl.username;
      const password = dbUrl.password;

      // Use pg_restore
      const command = `PGPASSWORD="${password}" pg_restore -h ${host} -p ${port} -U ${user} -d ${dbName} -c -v "${filepath}"`;
      
      await execAsync(command);

      console.log('✓ Restore completed successfully\n');
    } catch (error: any) {
      console.error('✗ Restore failed:', error.message);
      throw new Error(`Restore failed: ${error.message}`);
    }
  }

  /**
   * List available backups
   */
  listBackups(): Array<{
    filename: string;
    size: number;
    sizeFormatted: string;
    created: Date;
    age: string;
  }> {
    if (!existsSync(this.backupDir)) {
      return [];
    }

    const files = readdirSync(this.backupDir)
      .filter(f => f.startsWith('darkcity_backup_') && f.endsWith('.sql'))
      .map(filename => {
        const filepath = join(this.backupDir, filename);
        const stats = statSync(filepath);
        
        return {
          filename,
          size: stats.size,
          sizeFormatted: this.formatBytes(stats.size),
          created: stats.mtime,
          age: this.formatAge(stats.mtime),
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime());

    return files;
  }

  /**
   * Delete old backups based on retention policy
   */
  async cleanupOldBackups(retentionDays: number = config.backupRetentionDays): Promise<number> {
    console.log(`🧹 Cleaning up backups older than ${retentionDays} days...`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const backups = this.listBackups();
    let deletedCount = 0;

    for (const backup of backups) {
      if (backup.created < cutoffDate) {
        const filepath = join(this.backupDir, backup.filename);
        unlinkSync(filepath);
        console.log(`  Deleted: ${backup.filename}`);
        deletedCount++;
      }
    }

    console.log(`✓ Deleted ${deletedCount} old backup(s)\n`);
    return deletedCount;
  }

  /**
   * Delete a specific backup
   */
  deleteBackup(filename: string): void {
    const filepath = join(this.backupDir, filename);
    
    if (!existsSync(filepath)) {
      throw new Error(`Backup file not found: ${filename}`);
    }

    unlinkSync(filepath);
    console.log(`✓ Deleted backup: ${filename}`);
  }

  /**
   * Get total backup size
   */
  getTotalBackupSize(): { bytes: number; formatted: string } {
    const backups = this.listBackups();
    const totalBytes = backups.reduce((sum, b) => sum + b.size, 0);

    return {
      bytes: totalBytes,
      formatted: this.formatBytes(totalBytes),
    };
  }

  /**
   * Format bytes to human-readable size
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format age to human-readable string
   */
  private formatAge(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return '1 month ago';
    if (diffMonths < 12) return `${diffMonths} months ago`;
    
    const diffYears = Math.floor(diffMonths / 12);
    return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
  }
}
