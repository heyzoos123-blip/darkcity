// Quick script to delete a human account and all their agents
const { Pool } = require('pg');
const fs = require('fs');

// Read DATABASE_URL from .env.production.local
const envContent = fs.readFileSync('.env.production.local', 'utf8');
const dbUrl = envContent.split('\n').find(line => line.startsWith('DATABASE_URL=')).split('=')[1].trim().replace(/^"|"$/g, '');

const pool = new Pool({ 
  connectionString: dbUrl, 
  ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false } 
});

async function cleanup() {
  const email = process.argv[2];
  if (!email) {
    console.log('Usage: node cleanup-account.js EMAIL');
    process.exit(1);
  }

  try {
    const human = await pool.query('SELECT id FROM humans WHERE email = $1', [email]);
    if (!human.rows.length) {
      console.log(`❌ No human found with email: ${email}`);
      process.exit(0);
    }

    const humanId = human.rows[0].id;
    console.log(`Found human ID: ${humanId}`);

    // Delete agents owned by this human
    const agents = await pool.query('DELETE FROM agents WHERE human_id = $1 RETURNING name', [humanId]);
    console.log(`Deleted ${agents.rowCount} agents: ${agents.rows.map(a => a.name).join(', ')}`);

    // Delete the human account
    await pool.query('DELETE FROM humans WHERE id = $1', [humanId]);
    console.log(`✅ Deleted human account: ${email}`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

cleanup();
