#!/usr/bin/env node
/**
 * Consolidation CLI
 * Run nightly memory consolidation manually
 */

import { MemorySystem } from '../index';

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const agentId = args.find(arg => arg.startsWith('--agent='))?.split('=')[1];
  const dateStr = args.find(arg => arg.startsWith('--date='))?.split('=')[1];
  
  const date = dateStr ? new Date(dateStr) : new Date();
  date.setHours(0, 0, 0, 0);

  console.log('🧠 DARKCITY Memory Consolidation');
  console.log('================================');
  console.log(`Date: ${date.toDateString()}\n`);

  const memorySystem = new MemorySystem();

  try {
    // Check health
    const health = await memorySystem.healthCheck();
    console.log('Database Health:');
    console.log(`  PostgreSQL: ${health.postgres ? '✓' : '✗'}`);
    console.log(`  Redis: ${health.redis ? '✓' : '✗'}`);
    console.log(`  Qdrant: ${health.qdrant ? '✓' : '✗'}\n`);

    if (!health.postgres || !health.redis || !health.qdrant) {
      console.error('❌ Database health check failed. Aborting.');
      process.exit(1);
    }

    // Run consolidation
    const startTime = Date.now();

    if (agentId) {
      console.log(`Consolidating agent ${agentId.slice(0, 8)}...`);
      const result = await memorySystem.consolidateAgent(agentId, date);
      
      console.log('\n✅ Consolidation complete!');
      console.log(`  Experiences processed: ${result.experiencesConsolidated}`);
      console.log(`  Vectors generated: ${result.vectorsGenerated}`);
      console.log(`  Narrative: ${result.summary.narrative?.slice(0, 100)}...`);
    } else {
      console.log('Consolidating all agents...');
      const results = await memorySystem.consolidateAllAgents(date);
      
      console.log('\n✅ Consolidation complete!');
      console.log(`  Total agents: ${results.total}`);
      console.log(`  Successful: ${results.successful}`);
      console.log(`  Failed: ${results.failed}`);
      
      if (results.errors.length > 0) {
        console.log('\nErrors:');
        results.errors.slice(0, 10).forEach(err => {
          console.log(`  ${err.agentId.slice(0, 8)}: ${err.error}`);
        });
        
        if (results.errors.length > 10) {
          console.log(`  ... and ${results.errors.length - 10} more`);
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n⏱️  Duration: ${duration}s`);

  } catch (error) {
    console.error('\n❌ Consolidation failed:', error);
    process.exit(1);
  } finally {
    await memorySystem.close();
  }
}

main().catch(console.error);
