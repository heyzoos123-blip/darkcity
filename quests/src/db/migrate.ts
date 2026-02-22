#!/usr/bin/env node
/**
 * Database migration script
 */
import { getDatabase } from './database';

console.log('🗄️  Initializing DARKCITY Quest System database...');

try {
  const db = getDatabase();
  console.log('✅ Database initialized successfully');
  console.log('   Tables created:');
  console.log('   - quests');
  console.log('   - quest_acceptances');
  console.log('   - agent_reputation');
  console.log('   - quest_generation_log');
  
  // Verify tables
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    ORDER BY name
  `).all();
  
  console.log('\n✅ Verified tables:', tables.map((t: any) => t.name).join(', '));
} catch (error: any) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
