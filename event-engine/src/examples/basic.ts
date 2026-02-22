/**
 * Basic Event Engine Example
 * Demonstrates how to start and use the Event Engine
 */

import { EventEngine } from '../EventEngine';
import { defaultConfig } from '../../config/default';
import { Zone } from '../types/zones';

async function main() {
  console.log('DARKCITY Event Engine - Basic Example\n');

  // 1. Create Event Engine instance
  const engine = new EventEngine(defaultConfig);

  // 2. Setup event listeners
  engine.on('event:generated', (event) => {
    console.log(`\n📢 Event Generated: ${event.type}`);
    console.log(`   ID: ${event.id}`);
    console.log(`   Time: ${new Date(event.timestamp).toISOString()}`);
  });

  engine.on('encounter:started', (event) => {
    console.log(`\n🎭 Encounter Started!`);
    console.log(`   Type: ${event.type}`);
    console.log(`   Narrative: ${event.narrative}`);
    console.log(`   Choices: ${event.choices.length}`);
    if (event.choices.length > 0) {
      event.choices.forEach((choice, i) => {
        console.log(`   ${i + 1}. ${choice.label}: ${choice.description}`);
      });
    }
  });

  engine.on('event:resolved', (resolution) => {
    console.log(`\n✅ Event Resolved: ${resolution.eventId}`);
    console.log(`   Outcomes: ${resolution.outcomes.length}`);
  });

  // 3. Register zones
  const downtown: Zone = {
    id: 'downtown',
    districtId: 'central',
    name: 'Downtown',
    type: 'COMMERCIAL',
    maxOccupancy: 100,
    currentOccupancy: 0,
    eventProbabilities: {
      ENCOUNTER: 0.02, // 2% chance per tick
      CRIME: 0.01
    },
    activeEventCount: 0
  };

  const industrial: Zone = {
    id: 'industrial',
    districtId: 'west',
    name: 'Industrial District',
    type: 'INDUSTRIAL',
    maxOccupancy: 50,
    currentOccupancy: 0,
    eventProbabilities: {
      ENCOUNTER: 0.03, // Higher encounter rate
      ACCIDENT: 0.02
    },
    activeEventCount: 0
  };

  engine.registerZone(downtown);
  engine.registerZone(industrial);

  // 4. Add some agents
  const agents = ['agent-001', 'agent-002', 'agent-003'];
  
  engine.updateAgentLocation(agents[0], 'downtown');
  engine.updateAgentLocation(agents[1], 'downtown');
  engine.updateAgentLocation(agents[2], 'industrial');

  console.log('\n🤖 Agents placed in zones');
  console.log(`   Agent 1 & 2 in: Downtown`);
  console.log(`   Agent 3 in: Industrial District`);

  // 5. Subscribe to zone events
  await engine.subscribeToZone('downtown', (event) => {
    console.log(`\n[Downtown] Event: ${event.type}`);
  });

  await engine.subscribeToGlobal((event) => {
    console.log(`\n[Global] Event: ${event.type}`);
  });

  // 6. Start the engine
  console.log('\n');
  await engine.start();

  // 7. Let it run for a while
  console.log('\n⏱️  Engine running... (will run for 60 seconds)');
  console.log('   Watch for events to be generated!\n');

  // Log stats every 10 seconds
  const statsInterval = setInterval(async () => {
    const stats = await engine.getStats();
    console.log('\n📊 Statistics:');
    console.log(`   Running: ${stats.running}`);
    console.log(`   Zones: ${stats.zones}`);
    console.log(`   Time of Day: ${stats.environmental.timeOfDay}:00`);
    console.log(`   Weather: ${stats.environmental.weather}`);
    console.log(`   Total Events: ${stats.store.totalEvents}`);
    console.log(`   Active Participations: ${stats.processor.activeParticipations}`);
  }, 10000);

  // Run for 60 seconds then stop
  setTimeout(async () => {
    clearInterval(statsInterval);
    
    console.log('\n\n🛑 Stopping Event Engine...');
    await engine.stop();
    
    // Final stats
    const finalStats = await engine.getStats();
    console.log('\n📊 Final Statistics:');
    console.log(JSON.stringify(finalStats, null, 2));
    
    process.exit(0);
  }, 60000);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n⚠️  Received SIGINT, shutting down...');
    clearInterval(statsInterval);
    await engine.stop();
    process.exit(0);
  });
}

// Run the example
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
