#!/usr/bin/env tsx

/**
 * Database Seed Script
 * Populates the database with initial game data
 */

import { getDatabase } from '../src/client';
import { seedItems } from './items';
import { seedQuests } from './quests';
import { seedTestCharacters } from './test-characters';

async function main() {
  console.log('🌱 Seeding DARKCITY database...\n');

  const db = getDatabase();

  try {
    // Seed items
    console.log('📦 Seeding items...');
    await seedItems(db);
    console.log('✓ Items seeded\n');

    // Seed quests
    console.log('📜 Seeding quests...');
    await seedQuests(db);
    console.log('✓ Quests seeded\n');

    // Seed test characters (optional, for development)
    if (process.env.NODE_ENV === 'development') {
      console.log('👤 Seeding test characters...');
      await seedTestCharacters(db);
      console.log('✓ Test characters seeded\n');
    }

    console.log('✅ Database seeding complete!\n');

    // Display summary
    const counts = {
      items: await db.item.count(),
      quests: await db.quest.count(),
      characters: await db.character.count(),
    };

    console.log('Summary:');
    console.log(`  Items: ${counts.items}`);
    console.log(`  Quests: ${counts.quests}`);
    console.log(`  Characters: ${counts.characters}`);
    console.log('');

  } catch (error: any) {
    console.error('✗ Seeding failed:', error.message);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
