#!/usr/bin/env tsx

/**
 * Clear Redis Cache Script
 */

import { getCacheManager } from '../src/cache/redis';

async function main() {
  console.log('🧹 Clearing Redis cache...\n');

  const cache = getCacheManager();

  try {
    // Get stats before clearing
    const statsBefore = await cache.getStats();
    console.log('Cache stats before:');
    console.log(`  Keys: ${statsBefore.dbSize}`);
    console.log(`  Connected: ${statsBefore.connected}\n`);

    // Clear all cache
    await cache.clearAll();

    // Get stats after clearing
    const statsAfter = await cache.getStats();
    console.log('Cache stats after:');
    console.log(`  Keys: ${statsAfter.dbSize}`);
    console.log(`  Cleared: ${statsBefore.dbSize - statsAfter.dbSize} keys\n`);

    console.log('✓ Cache cleared successfully');

    await cache.disconnect();
  } catch (error: any) {
    console.error('✗ Failed to clear cache:', error.message);
    process.exit(1);
  }
}

main();
