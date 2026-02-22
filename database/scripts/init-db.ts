#!/usr/bin/env tsx

/**
 * Database Initialization Script
 * Sets up the database, runs migrations, and seeds initial data
 */

import { execSync } from 'child_process';
import { config } from 'dotenv';
import { initializeDatabase, closeDatabase, healthCheck } from '../index';

// Load environment variables
config();

async function runCommand(command: string, description: string) {
  console.log(`\n📦 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error);
    throw error;
  }
}

async function main() {
  console.log('🚀 DARKCITY Database Initialization\n');
  console.log('=====================================\n');
  
  try {
    // Step 1: Generate Prisma Client
    await runCommand(
      'npx prisma generate',
      'Generating Prisma Client'
    );
    
    // Step 2: Run migrations
    const isDev = process.env.NODE_ENV !== 'production';
    const migrateCommand = isDev 
      ? 'npx prisma migrate dev --skip-seed'
      : 'npx prisma migrate deploy';
    
    await runCommand(
      migrateCommand,
      isDev ? 'Running migrations (dev)' : 'Deploying migrations (production)'
    );
    
    // Step 3: Test connections
    console.log('\n🔍 Testing database connections...');
    const health = await healthCheck();
    
    console.log('\nHealth Check Results:');
    console.log('  Status:', health.status.toUpperCase());
    console.log('  PostgreSQL Primary:', health.postgres.primary ? '✅' : '❌');
    console.log('  PostgreSQL Replicas:', health.postgres.replicas.length, 
                'replicas,', health.postgres.replicas.filter(r => r).length, 'healthy');
    console.log('  Redis:', health.redis ? '✅' : '❌');
    
    if (health.status !== 'healthy') {
      throw new Error('Database health check failed');
    }
    
    // Step 4: Seed database (only in dev)
    if (isDev) {
      console.log('\n🌱 Do you want to seed the database? (y/N)');
      
      const shouldSeed = process.env.AUTO_SEED === 'true' || 
        process.argv.includes('--seed');
      
      if (shouldSeed) {
        await runCommand(
          'npx tsx seeds/001_districts_and_zones.ts',
          'Seeding database'
        );
      } else {
        console.log('⏭️  Skipping seed (run "npm run db:seed" to seed manually)');
      }
    }
    
    // Step 5: Summary
    console.log('\n=====================================');
    console.log('🎉 Database initialization complete!\n');
    console.log('Next steps:');
    console.log('  - Run "npm run db:studio" to open Prisma Studio');
    console.log('  - Run "npm run db:seed" to seed data (if not done)');
    console.log('  - Start your application\n');
    
    await closeDatabase();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Initialization failed:', error);
    await closeDatabase();
    process.exit(1);
  }
}

main();
