/**
 * DARKCITY Seed Data
 * Districts, Zones, and Initial Locations
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// DISTRICT DEFINITIONS
// ============================================================================

const districts = [
  {
    name: 'Downtown',
    description: 'The beating heart of DARKCITY. Glass towers pierce the smog-choked sky, neon bleeding through every crack. Corporate power brokers rub shoulders with street hustlers. Everything has a price here.',
    noiseLevel: 90,
    crowding: 95,
    wealthIndex: 75,
    dangerLevel: 40,
    colorPalette: ['#00ff88', '#ff00ff', '#4488ff'],
    aesthetic: {
      architecture: 'Modern skyscrapers mixed with retrofitted brutalist blocks',
      lighting: 'Intense neon, holographic advertisements',
      atmosphere: 'Chaotic energy, constant movement',
      sounds: 'Traffic, voices, electronic hums',
    },
    zones: [
      {
        name: 'Corporate Plaza',
        type: 'BUSINESS',
        maxOccupancy: 200,
        eventProbabilities: {
          RANDOM_ENCOUNTER: 0.03,
          OPPORTUNITY: 0.05,
          CRIME: 0.02,
        },
        locations: [
          {
            name: 'Nexus Tower Lobby',
            type: 'OFFICE',
            description: 'Marble floors reflect the glow of holographic displays. Security drones hover silently. Everyone here is either powerful or pretending to be.',
            capacity: 50,
          },
          {
            name: 'Street Level Cafe',
            type: 'CAFE',
            description: 'Overpriced coffee and desperate networking. The real deals happen in whispered conversations.',
            capacity: 30,
          },
        ],
      },
      {
        name: 'Market Street',
        type: 'COMMERCIAL',
        maxOccupancy: 300,
        eventProbabilities: {
          RANDOM_ENCOUNTER: 0.05,
          OPPORTUNITY: 0.04,
          CRIME: 0.03,
        },
        locations: [
          {
            name: 'The Neon Bazaar',
            type: 'SHOP',
            description: 'Stalls selling everything from black market tech to synthetic food. Haggling is expected, trust is not.',
            capacity: 100,
          },
        ],
      },
    ],
  },
  
  {
    name: 'Industrial Zone',
    description: 'The city\'s skeleton exposed. Factories belch smoke, foundries glow orange through the night. Workers with dead eyes clock in and out. Accidents happen. Frequently.',
    noiseLevel: 95,
    crowding: 60,
    wealthIndex: 25,
    dangerLevel: 70,
    colorPalette: ['#ff6600', '#333333', '#ff3333'],
    aesthetic: {
      architecture: 'Massive warehouses, exposed pipes, rusted metal',
      lighting: 'Sodium vapor, emergency strobes',
      atmosphere: 'Oppressive heat, chemical smells',
      sounds: 'Machinery grinding, warning sirens, metal clanging',
    },
    zones: [
      {
        name: 'Factory Row',
        type: 'INDUSTRIAL',
        maxOccupancy: 150,
        eventProbabilities: {
          RANDOM_ENCOUNTER: 0.04,
          CRIME: 0.08,
          INFRASTRUCTURE: 0.02,
        },
        locations: [
          {
            name: 'Steelworks Floor',
            type: 'FACTORY',
            description: 'Heat hammers you in waves. Molten metal flows through channels. One wrong step is your last.',
            capacity: 80,
          },
          {
            name: 'Worker\'s Canteen',
            type: 'CAFE',
            description: 'Cheap food, cheaper conversation. Everyone here has scars—visible or otherwise.',
            capacity: 40,
          },
        ],
      },
      {
        name: 'The Docks',
        type: 'INDUSTRIAL',
        maxOccupancy: 100,
        eventProbabilities: {
          RANDOM_ENCOUNTER: 0.06,
          CRIME: 0.10,
          DISCOVERY: 0.03,
        },
        locations: [
          {
            name: 'Pier 7',
            type: 'WAREHOUSE',
            description: 'Shipping containers stacked like dominoes. What\'s inside? Better not to ask.',
            capacity: 50,
          },
        ],
      },
    ],
  },
  
  {
    name: 'Residential Heights',
    description: 'Apartment blocks stretching to the clouds. Laundry lines cross between balconies. Children play in concrete courtyards. Families try to make this feel like home.',
    noiseLevel: 60,
    crowding: 80,
    wealthIndex: 40,
    dangerLevel: 30,
    colorPalette: ['#44ff88', '#ffaa44', '#6699ff'],
    aesthetic: {
      architecture: 'High-rise apartment complexes, community spaces',
      lighting: 'Warm residential lighting, some neon signage',
      atmosphere: 'Lived-in, communal, varying degrees of neglect',
      sounds: 'Conversations, cooking, music from windows',
    },
    zones: [
      {
        name: 'North Blocks',
        type: 'RESIDENTIAL',
        maxOccupancy: 500,
        eventProbabilities: {
          RANDOM_ENCOUNTER: 0.02,
          CRIME: 0.02,
        },
        locations: [
          {
            name: 'Community Garden',
            type: 'PARK',
            description: 'Small miracle of green among the concrete. Residents tend plots with fierce pride.',
            capacity: 30,
          },
          {
            name: 'Block 7 Lobby',
            type: 'APARTMENT',
            description: 'Flickering fluorescent lights. Mailboxes with broken locks. Someone\'s always watching from the stairs.',
            capacity: 20,
          },
        ],
      },
    ],
  },
  
  {
    name: 'Arts District',
    description: 'Where the city pretends it has a soul. Galleries, performance spaces, underground clubs. Artists starve beautifully. Tourists come to feel cultured. Both leave poorer.',
    noiseLevel: 70,
    crowding: 65,
    wealthIndex: 55,
    dangerLevel: 25,
    colorPalette: ['#ff00ff', '#00ffff', '#ffff00'],
    aesthetic: {
      architecture: 'Converted warehouses, modernist galleries, bohemian cafes',
      lighting: 'Artistic installations, moody ambiance',
      atmosphere: 'Creative chaos, pretentious energy',
      sounds: 'Music spilling from venues, animated discussions',
    },
    zones: [
      {
        name: 'Gallery Walk',
        type: 'ENTERTAINMENT',
        maxOccupancy: 150,
        eventProbabilities: {
          RANDOM_ENCOUNTER: 0.04,
          OPPORTUNITY: 0.06,
          FESTIVAL: 0.02,
        },
        locations: [
          {
            name: 'The Void Gallery',
            type: 'GALLERY',
            description: 'White walls, conceptual installations that make no sense. Champagne flows, bullshit follows.',
            capacity: 60,
          },
          {
            name: 'Midnight Lounge',
            type: 'BAR',
            description: 'Jazz and smoke. Conversations in low tones. Everyone here is running from something.',
            capacity: 50,
          },
        ],
      },
      {
        name: 'Underground Scene',
        type: 'ENTERTAINMENT',
        maxOccupancy: 200,
        eventProbabilities: {
          RANDOM_ENCOUNTER: 0.05,
          FESTIVAL: 0.03,
        },
        locations: [
          {
            name: 'The Basement',
            type: 'CLUB',
            description: 'Bass you feel in your chest. Strobe lights. Altered states. Leave your inhibitions at the door.',
            capacity: 150,
          },
        ],
      },
    ],
  },
  
  {
    name: 'Tech Hub',
    description: 'Silicon and circuits. Startups burn venture capital like fuel. Hackers tap streams of data. The future is coded here, debugged elsewhere.',
    noiseLevel: 50,
    crowding: 70,
    wealthIndex: 80,
    dangerLevel: 20,
    colorPalette: ['#00ff00', '#0088ff', '#ff00aa'],
    aesthetic: {
      architecture: 'Sleek minimalist offices, co-working spaces, server farms',
      lighting: 'Cool LEDs, monitor glow',
      atmosphere: 'Sterile productivity, caffeinated energy',
      sounds: 'Keyboard clicks, humming servers, startup pitches',
    },
    zones: [
      {
        name: 'Innovation Campus',
        type: 'BUSINESS',
        maxOccupancy: 250,
        eventProbabilities: {
          RANDOM_ENCOUNTER: 0.02,
          OPPORTUNITY: 0.07,
          DISCOVERY: 0.04,
        },
        locations: [
          {
            name: 'The Incubator',
            type: 'OFFICE',
            description: 'Standing desks, ping pong tables, and crushing debt. Everyone\'s changing the world. Most will fail.',
            capacity: 100,
          },
          {
            name: 'Code & Coffee',
            type: 'CAFE',
            description: 'Free wifi, expensive lattes. Laptops everywhere. The only conversations are in pull requests.',
            capacity: 40,
          },
        ],
      },
    ],
  },
  
  {
    name: 'Financial District',
    description: 'Money moves invisibly through fiber optic veins. Traders chase decimals. Suits cost more than cars. Power is measured in portfolios.',
    noiseLevel: 45,
    crowding: 75,
    wealthIndex: 95,
    dangerLevel: 15,
    colorPalette: ['#gold', '#silver', '#platinum'],
    aesthetic: {
      architecture: 'Prestigious bank towers, exclusive clubs',
      lighting: 'Refined, controlled',
      atmosphere: 'Wealth whispers, power poses',
      sounds: 'Polite conversation, the rustle of expensive fabric',
    },
    zones: [
      {
        name: 'Exchange Plaza',
        type: 'BUSINESS',
        maxOccupancy: 180,
        eventProbabilities: {
          RANDOM_ENCOUNTER: 0.02,
          OPPORTUNITY: 0.08,
        },
        locations: [
          {
            name: 'Platinum Lounge',
            type: 'BAR',
            description: 'Membership required. Net worth recommended. Deals worth millions close over $500 whiskey.',
            capacity: 40,
          },
        ],
      },
    ],
  },
  
  {
    name: 'Midtown',
    description: 'The buffer zone. Not rich, not poor. Not safe, not deadly. Midtown is where most people exist—working, surviving, trying not to slide down.',
    noiseLevel: 65,
    crowding: 85,
    wealthIndex: 50,
    dangerLevel: 35,
    colorPalette: ['#888888', '#aaaaaa', '#666666'],
    aesthetic: {
      architecture: 'Mixed use buildings, aging infrastructure',
      lighting: 'Standard street lamps, some neon',
      atmosphere: 'Unremarkable, transitional',
      sounds: 'Background city noise, normal hustle',
    },
    zones: [
      {
        name: 'Main Street',
        type: 'COMMERCIAL',
        maxOccupancy: 250,
        eventProbabilities: {
          RANDOM_ENCOUNTER: 0.04,
          CRIME: 0.03,
        },
        locations: [
          {
            name: 'Corner Diner',
            type: 'CAFE',
            description: 'Greasy food, strong coffee. Regulars know each other\'s orders. A slice of normalcy.',
            capacity: 35,
          },
          {
            name: 'Midtown Park',
            type: 'PARK',
            description: 'Tired grass, graffitied benches. Office workers eat lunch here. Sometimes dangerous after dark.',
            capacity: 60,
          },
        ],
      },
    ],
  },
  
  {
    name: 'Westside',
    description: 'Former glory fading to rust. Once-grand buildings now house immigrants and dreamers. Ethnic enclaves, vibrant markets, generational divides.',
    noiseLevel: 75,
    crowding: 80,
    wealthIndex: 35,
    dangerLevel: 45,
    colorPalette: ['#ff8844', '#44ff88', '#8844ff'],
    aesthetic: {
      architecture: 'Ornate old buildings in disrepair, colorful shopfronts',
      lighting: 'String lights, diverse neon signs',
      atmosphere: 'Cultural melting pot, resilient community',
      sounds: 'Multiple languages, street vendors, music from many cultures',
    },
    zones: [
      {
        name: 'Little Asia',
        type: 'COMMERCIAL',
        maxOccupancy: 200,
        eventProbabilities: {
          RANDOM_ENCOUNTER: 0.05,
          FESTIVAL: 0.03,
          DISCOVERY: 0.03,
        },
        locations: [
          {
            name: 'Dragon Market',
            type: 'SHOP',
            description: 'Vegetables you can\'t pronounce, spices from across the world. Haggle in three languages.',
            capacity: 80,
          },
          {
            name: 'Mahjong Parlor',
            type: 'CLUB',
            description: 'Tiles click, tea steams. The elderly guard traditions. Some tables have... larger stakes.',
            capacity: 40,
          },
        ],
      },
    ],
  },
  
  {
    name: 'Entertainment Mile',
    description: 'Vice row. Casinos, clubs, pleasure houses. Everything is for sale, especially you. Lose yourself willingly or by accident. Either way, the house wins.',
    noiseLevel: 95,
    crowding: 90,
    wealthIndex: 60,
    dangerLevel: 50,
    colorPalette: ['#ff0066', '#00ff99', '#ffff00'],
    aesthetic: {
      architecture: 'Glitzy facades hiding seediness',
      lighting: 'Overwhelming neon, spinning lights',
      atmosphere: 'Intoxicating excess, predatory glamour',
      sounds: 'Music bleeding together, slot machines, laughter and tears',
    },
    zones: [
      {
        name: 'The Strip',
        type: 'ENTERTAINMENT',
        maxOccupancy: 400,
        eventProbabilities: {
          RANDOM_ENCOUNTER: 0.07,
          CRIME: 0.06,
          OPPORTUNITY: 0.05,
        },
        locations: [
          {
            name: 'Neon Palace Casino',
            type: 'CLUB',
            description: 'Slot machines sing their siren song. Card tables promise fortune. The odds always favor the house.',
            capacity: 200,
          },
          {
            name: 'Velvet Room',
            type: 'CLUB',
            description: 'Red lighting, soft music, harder edges. Pleasure for those who can afford it. Consequences for those who can\'t.',
            capacity: 60,
          },
        ],
      },
    ],
  },
  
  {
    name: 'Underground',
    description: 'Below the city\'s notice. Forgotten subway tunnels, abandoned infrastructure, makeshift communities. Rules don\'t reach here. Neither does help.',
    noiseLevel: 40,
    crowding: 40,
    wealthIndex: 10,
    dangerLevel: 90,
    colorPalette: ['#442222', '#224422', '#222244'],
    aesthetic: {
      architecture: 'Crumbling tunnels, improvised dwellings',
      lighting: 'Scattered fires, salvaged lights',
      atmosphere: 'Lawless, desperate, hidden',
      sounds: 'Dripping water, distant echoes, whispered warnings',
    },
    zones: [
      {
        name: 'The Depths',
        type: 'UNDERGROUND',
        maxOccupancy: 100,
        eventProbabilities: {
          RANDOM_ENCOUNTER: 0.10,
          CRIME: 0.15,
          DISCOVERY: 0.08,
        },
        exclusiveEvents: ['BLACK_MARKET_DEAL', 'UNDERGROUND_FIGHT', 'HIDDEN_CACHE'],
        locations: [
          {
            name: 'The Junction',
            type: 'SUBWAY',
            description: 'Abandoned station. No trains come here anymore. Perfect for business the law shouldn\'t see.',
            capacity: 50,
          },
          {
            name: 'Shanty Town',
            type: 'ALLEY',
            description: 'Scrap metal homes, recycled everything. The city\'s forgotten live here. They remember.',
            capacity: 80,
          },
        ],
      },
    ],
  },
];

// ============================================================================
// SEED FUNCTION
// ============================================================================

async function seedDistrictsAndZones() {
  console.log('🌃 Seeding DARKCITY districts and zones...');
  
  for (const districtData of districts) {
    const { zones, ...districtInfo } = districtData;
    
    // Create district
    console.log(`  📍 Creating district: ${districtInfo.name}`);
    const district = await prisma.district.create({
      data: {
        name: districtInfo.name,
        description: districtInfo.description,
        noiseLevel: districtInfo.noiseLevel,
        crowding: districtInfo.crowding,
        wealthIndex: districtInfo.wealthIndex,
        dangerLevel: districtInfo.dangerLevel,
        colorPalette: districtInfo.colorPalette,
        aesthetic: districtInfo.aesthetic,
      },
    });
    
    // Create zones
    for (const zoneData of zones) {
      const { locations, ...zoneInfo } = zoneData;
      
      console.log(`    🏙️  Creating zone: ${zoneInfo.name}`);
      const zone = await prisma.zone.create({
        data: {
          districtId: district.id,
          name: zoneInfo.name,
          type: zoneInfo.type as any,
          maxOccupancy: zoneInfo.maxOccupancy,
          eventProbabilities: zoneInfo.eventProbabilities || {},
          exclusiveEvents: (zoneInfo as any).exclusiveEvents || [],
        },
      });
      
      // Create locations
      for (const locationData of locations) {
        console.log(`      📌 Creating location: ${locationData.name}`);
        await prisma.location.create({
          data: {
            zoneId: zone.id,
            name: locationData.name,
            type: locationData.type as any,
            description: locationData.description,
            capacity: locationData.capacity,
            isPublic: true,
            isOpen: true,
          },
        });
      }
    }
  }
  
  console.log('✅ Districts, zones, and locations seeded successfully!');
}

// ============================================================================
// SAMPLE EVENTS
// ============================================================================

async function seedEvents() {
  console.log('🎭 Seeding sample events...');
  
  const sampleEvents = [
    {
      type: 'WEATHER',
      scope: 'GLOBAL',
      description: 'Heavy rain begins to fall across the city',
      effects: {
        movementSpeed: -0.2,
        mood: -0.1,
        indoorGathering: 0.3,
      },
      durationSeconds: 7200, // 2 hours
    },
    {
      type: 'FESTIVAL',
      scope: 'DISTRICT',
      description: 'Night Market Festival in Arts District',
      effects: {
        crowding: 0.5,
        opportunities: 0.3,
        socialInteractions: 0.4,
      },
      durationSeconds: 14400, // 4 hours
    },
    {
      type: 'POWER_OUTAGE',
      scope: 'ZONE',
      description: 'Power failure in Industrial Zone',
      effects: {
        dangerLevel: 0.3,
        businessClosed: true,
      },
      durationSeconds: 3600, // 1 hour
    },
  ];
  
  for (const event of sampleEvents) {
    await prisma.event.create({
      data: {
        type: event.type as any,
        scope: event.scope as any,
        effects: event.effects,
        metadata: {
          description: event.description,
        },
        durationSeconds: event.durationSeconds,
      },
    });
  }
  
  console.log('✅ Sample events seeded!');
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  try {
    console.log('🚀 Starting DARKCITY database seeding...\n');
    
    await seedDistrictsAndZones();
    await seedEvents();
    
    console.log('\n🎉 All seed data created successfully!');
    console.log(`
📊 Summary:
   - 10 Districts
   - ~20 Zones
   - ~30 Locations
   - 3 Sample Events
    `);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export { seedDistrictsAndZones, seedEvents };
