import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const config = {
  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://darkcity:password@localhost:5432/darkcity',
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisPassword: process.env.REDIS_PASSWORD,
  redisDb: parseInt(process.env.REDIS_DB || '0'),
  
  // Cache TTL (seconds)
  cacheTTL: {
    session: parseInt(process.env.CACHE_TTL_SESSION || '3600'),
    character: parseInt(process.env.CACHE_TTL_CHARACTER || '1800'),
    inventory: parseInt(process.env.CACHE_TTL_INVENTORY || '600'),
    leaderboard: parseInt(process.env.CACHE_TTL_LEADERBOARD || '300'),
  },
  
  // Backup
  backupDir: process.env.BACKUP_DIR || './backups',
  backupRetentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
};
