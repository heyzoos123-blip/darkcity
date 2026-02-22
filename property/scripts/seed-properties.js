// Seed script to create initial properties and land plots
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'darkcity_property',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function seed() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🌱 Seeding DARKCITY Property System...');
    
    // Create buildings
    const buildings = [
      { name: 'DARK TOWER', address: '100 Shadow Street', floors: 50, x: 100, y: 200 },
      { name: 'NEON HEIGHTS', address: '250 Electric Avenue', floors: 35, x: 300, y: 400 },
      { name: 'THE VOID', address: '666 Abyss Road', floors: 100, x: 500, y: 600 },
    ];
    
    for (const building of buildings) {
      const result = await client.query(
        `INSERT INTO buildings (name, address, total_floors, location_x, location_y)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [building.name, building.address, building.floors, building.x, building.y]
      );
      
      const buildingId = result.rows[0].id;
      console.log(`✅ Created building: ${building.name} (${buildingId})`);
      
      // Create properties in building
      const tiers = ['STUDIO', 'ONE_BEDROOM', 'LUXURY', 'PENTHOUSE'];
      let propertyCount = 0;
      
      for (let floor = 1; floor <= Math.min(building.floors, 10); floor++) {
        const unitsPerFloor = floor <= 3 ? 8 : (floor <= 7 ? 6 : 4);
        
        for (let unit = 0; unit < unitsPerFloor; unit++) {
          const unitLetter = String.fromCharCode(65 + unit); // A, B, C...
          const tier = tiers[Math.min(Math.floor(floor / 3), 3)];
          
          await client.query(
            `INSERT INTO properties (tier, address, building_id, floor, unit_number, status)
             VALUES ($1, $2, $3, $4, $5, 'AVAILABLE')`,
            [tier, `${buildingId}-${floor}${unitLetter}`, buildingId, floor, unitLetter]
          );
          
          propertyCount++;
        }
      }
      
      console.log(`  📍 Created ${propertyCount} properties`);
    }
    
    // Create land plots
    console.log('🏗️ Creating land plots...');
    const plotCount = 50;
    
    for (let i = 1; i <= plotCount; i++) {
      const sizeSqm = [100, 250, 500, 1000, 2500][Math.floor(Math.random() * 5)];
      const basePrice = sizeSqm / 10000; // 0.01 SOL per 100 sqm
      const price = basePrice + (Math.random() * basePrice * 0.5); // +0-50% variation
      
      const x = Math.floor(Math.random() * 1000);
      const y = Math.floor(Math.random() * 1000);
      
      const zoningTypes = ['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'MIXED_USE'];
      const zoning = zoningTypes[Math.floor(Math.random() * zoningTypes.length)];
      
      await client.query(
        `INSERT INTO land_plots (plot_number, size_sqm, price, location_x, location_y, zoning_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [`PLOT-${String(i).padStart(3, '0')}`, sizeSqm, price, x, y, zoning]
      );
    }
    
    console.log(`✅ Created ${plotCount} land plots`);
    
    // Create slums spawn point (default for evicted agents)
    console.log('🏚️ Creating slums area...');
    const slumsBuilding = await client.query(
      `INSERT INTO buildings (name, address, total_floors, location_x, location_y)
       VALUES ('THE SLUMS', 'Outskirts', 1, -100, -100)
       RETURNING id`
    );
    
    const slumsBuildingId = slumsBuilding.rows[0].id;
    
    const slumsProperty = await client.query(
      `INSERT INTO properties (tier, address, building_id, floor, unit_number, status)
       VALUES ('STUDIO', 'SLUMS-0A', $1, 0, 'A', 'AVAILABLE')
       RETURNING id`,
      [slumsBuildingId]
    );
    
    const slumsPropertyId = slumsProperty.rows[0].id;
    
    // Add default spawn point
    await client.query(
      `INSERT INTO spawn_points (property_id, name, position_x, position_y, position_z, is_default)
       VALUES ($1, 'Slums Spawn', 0, 0, 0, true)`,
      [slumsPropertyId]
    );
    
    console.log(`✅ Created slums area (${slumsPropertyId})`);
    
    await client.query('COMMIT');
    
    // Print summary
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM buildings) as buildings,
        (SELECT COUNT(*) FROM properties) as properties,
        (SELECT COUNT(*) FROM land_plots) as land_plots
    `);
    
    console.log('\n📊 SEED COMPLETE');
    console.log(`   Buildings: ${stats.rows[0].buildings}`);
    console.log(`   Properties: ${stats.rows[0].properties}`);
    console.log(`   Land Plots: ${stats.rows[0].land_plots}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
