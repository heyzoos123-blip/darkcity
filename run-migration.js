const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const sql = fs.readFileSync(
      path.join(__dirname, 'database/migrations/04_buildings_residence_ledger.sql'),
      'utf8'
    );

    console.log('Executing migration...');
    await client.query(sql);
    console.log('✅ Migration completed successfully');

    // Verify tables exist
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name IN ('buildings', 'ledger_entries')
    `);
    console.log('Tables created:', result.rows.map(r => r.table_name));

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
