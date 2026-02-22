/**
 * DARKCITY Database Configuration
 * PostgreSQL connection pooling with PgBouncer-style settings
 */

import { Pool, PoolConfig } from 'pg';
import { PrismaClient } from '@prisma/client';

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

export const DB_CONFIG = {
  // Primary database
  primary: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'darkcity',
    user: process.env.DB_USER || 'darkcity',
    password: process.env.DB_PASSWORD || '',
    
    // SSL configuration (required for production)
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: true,
      ca: process.env.DB_SSL_CA,
    } : false,
  },
  
  // Read replicas (for scaling read operations)
  replicas: process.env.DB_READ_REPLICAS?.split(',').map(url => ({
    connectionString: url,
  })) || [],
  
  // Connection pool settings
  pool: {
    // Maximum number of clients in the pool
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    
    // Minimum number of clients in the pool
    min: parseInt(process.env.DB_POOL_MIN || '5'),
    
    // Maximum time (ms) a client can be idle before being removed
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    
    // Maximum time (ms) to wait for a connection before timing out
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
    
    // Maximum time (ms) a query can run before being cancelled
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
  },
  
  // Query logging
  logging: {
    enabled: process.env.DB_LOGGING_ENABLED === 'true',
    slow_query_threshold_ms: parseInt(process.env.DB_SLOW_QUERY_THRESHOLD || '1000'),
  },
};

// ============================================================================
// CONNECTION POOL
// ============================================================================

/**
 * Primary database connection pool
 */
export class DatabasePool {
  private static primaryPool: Pool | null = null;
  private static replicaPools: Pool[] = [];
  private static currentReplicaIndex = 0;

  /**
   * Get the primary database pool (for writes)
   */
  static getPrimaryPool(): Pool {
    if (!this.primaryPool) {
      const config: PoolConfig = {
        ...DB_CONFIG.primary,
        ...DB_CONFIG.pool,
      };
      
      this.primaryPool = new Pool(config);
      
      // Error handling
      this.primaryPool.on('error', (err) => {
        console.error('Unexpected error on idle database client', err);
      });
      
      // Connection event logging
      this.primaryPool.on('connect', (client) => {
        if (DB_CONFIG.logging.enabled) {
          console.log('New database client connected to primary');
        }
      });
      
      // Set statement timeout on each new client
      this.primaryPool.on('acquire', async (client) => {
        await client.query(`SET statement_timeout = ${DB_CONFIG.pool.statement_timeout}`);
      });
    }
    
    return this.primaryPool;
  }

  /**
   * Get a read replica pool (round-robin for load balancing)
   */
  static getReplicaPool(): Pool {
    // If no replicas configured, use primary
    if (DB_CONFIG.replicas.length === 0) {
      return this.getPrimaryPool();
    }
    
    // Initialize replica pools if needed
    if (this.replicaPools.length === 0) {
      this.replicaPools = DB_CONFIG.replicas.map(replicaConfig => {
        const pool = new Pool({
          ...replicaConfig,
          ...DB_CONFIG.pool,
        });
        
        pool.on('error', (err) => {
          console.error('Unexpected error on replica client', err);
        });
        
        return pool;
      });
    }
    
    // Round-robin selection
    const pool = this.replicaPools[this.currentReplicaIndex];
    this.currentReplicaIndex = (this.currentReplicaIndex + 1) % this.replicaPools.length;
    
    return pool;
  }

  /**
   * Execute a query on the primary database
   */
  static async queryPrimary<T = any>(
    text: string,
    params?: any[]
  ): Promise<T[]> {
    const pool = this.getPrimaryPool();
    const start = Date.now();
    
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      
      if (DB_CONFIG.logging.enabled && duration > DB_CONFIG.logging.slow_query_threshold_ms) {
        console.warn(`Slow query detected (${duration}ms):`, text.substring(0, 100));
      }
      
      return result.rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Execute a read query on a replica (or primary if no replicas)
   */
  static async queryReplica<T = any>(
    text: string,
    params?: any[]
  ): Promise<T[]> {
    const pool = this.getReplicaPool();
    const start = Date.now();
    
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      
      if (DB_CONFIG.logging.enabled && duration > DB_CONFIG.logging.slow_query_threshold_ms) {
        console.warn(`Slow query on replica (${duration}ms):`, text.substring(0, 100));
      }
      
      return result.rows;
    } catch (error) {
      console.error('Replica query error:', error);
      throw error;
    }
  }

  /**
   * Get a client from the pool for transaction handling
   */
  static async getClient() {
    return this.getPrimaryPool().connect();
  }

  /**
   * Close all pools (for graceful shutdown)
   */
  static async close(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    if (this.primaryPool) {
      promises.push(this.primaryPool.end());
    }
    
    for (const pool of this.replicaPools) {
      promises.push(pool.end());
    }
    
    await Promise.all(promises);
    
    this.primaryPool = null;
    this.replicaPools = [];
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<{
    primary: boolean;
    replicas: boolean[];
  }> {
    const results = {
      primary: false,
      replicas: [] as boolean[],
    };
    
    // Check primary
    try {
      await this.queryPrimary('SELECT 1');
      results.primary = true;
    } catch (error) {
      console.error('Primary database health check failed:', error);
    }
    
    // Check replicas
    for (const pool of this.replicaPools) {
      try {
        await pool.query('SELECT 1');
        results.replicas.push(true);
      } catch (error) {
        results.replicas.push(false);
      }
    }
    
    return results;
  }
}

// ============================================================================
// PRISMA CLIENT
// ============================================================================

/**
 * Singleton Prisma client with connection pooling
 */
class PrismaClientSingleton {
  private static instance: PrismaClient | null = null;

  static getInstance(): PrismaClient {
    if (!this.instance) {
      this.instance = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
        log: DB_CONFIG.logging.enabled
          ? [
              { level: 'query', emit: 'event' },
              { level: 'error', emit: 'stdout' },
              { level: 'warn', emit: 'stdout' },
            ]
          : ['error'],
      });
      
      // Log slow queries
      if (DB_CONFIG.logging.enabled) {
        this.instance.$on('query' as never, async (e: any) => {
          if (e.duration > DB_CONFIG.logging.slow_query_threshold_ms) {
            console.warn(`Slow Prisma query (${e.duration}ms):`, e.query);
          }
        });
      }
    }
    
    return this.instance;
  }

  static async close(): Promise<void> {
    if (this.instance) {
      await this.instance.$disconnect();
      this.instance = null;
    }
  }
}

export const prisma = PrismaClientSingleton.getInstance();

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database connections...');
  await Promise.all([
    DatabasePool.close(),
    PrismaClientSingleton.close(),
  ]);
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing database connections...');
  await Promise.all([
    DatabasePool.close(),
    PrismaClientSingleton.close(),
  ]);
  process.exit(0);
});
