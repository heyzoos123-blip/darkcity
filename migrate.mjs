import pg from 'pg';
import { readFileSync } from 'fs';

const { Client } = pg;

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const sql = readFileSync('./database/migrations/04_buildings_residence_ledger.sql', 'utf8');
    
    console.log('⏳ Running migration...');
    await client.query(sql);
    console.log('✅ Migration completed');

    const check = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name IN ('buildings', 'ledger_entries')
      ORDER BY table_name
    `);
    
    console.log('✅ Tables verified:', check.rows.map(r => r.table_name).join(', '));
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
