/**
 * Advanced Event Engine Example
 * Demonstrates agent participation, choices, and WebSocket integration
 */

import { EventEngine } from '../EventEngine';
import { defaultConfig } from '../../config/default';
import { Zone } from '../types/zones';
import { EncounterEvent } from '../types/events';

async function main() {
  console.log('DARKCITY Event Engine - Advanced Example\n');

  // Create engine with custom config
  const config = {
    ...defaultConfig,
    generator: {
      ...defaultConfig.generator,
      tickInterval: 100, // Fast ticks for demo
      globalEventRate: 2.0 // 2x event rate
    }
  };

  const engine = new EventEngine(config);

  // Track active encounters per agent
  const agentEncounters = new Map<string, string>();

  // Setup sophisticated event handling
  engine.on('event:generated', (event) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📢 EVENT: ${event.type}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Timestamp: ${new Date(event.timestamp).toLocaleString()}`);
    console.log(`Event ID: ${event.id}`);
  });

  engine.on('encounter:started', async (event: EncounterEvent) => {
    console.log(`\n🎭 ENCOUNTER ALERT!`);
    console.log(`Type: ${event.type}`);
    console.log(`Location: ${event.location}`);
    console.log(`\n📖 Narrative:`);
    console.log(`"${event.narrative}"\n`);

    // Show choices
    if (event.choices.length > 0) {
      console.log(`🎯 Available Choices:`);
      event.choices.forEach((choice, i) => {
        console.log(`\n  ${i + 1}. ${choice.label}`);
        console.log(`     ${choice.description}`);
        
        // Show requirements
        if (choice.requirements && choice.requirements.length > 0) {
          console.log(`     Requirements:`);
          choice.requirements.forEach(req => {
            console.log(`     - ${req.name} ${req.operator} ${req.value}`);
          });
        }

        // Show potential outcomes
        console.log(`     Possible outcomes: ${choice.outcomes.length}`);
        choice.outcomes.forEach((outcome, j) => {
          console.log(`       ${j + 1}. (${Math.round(outcome.weight * 100)}% chance)`);
          console.log(`          "${outcome.narrative}"`);
        });
      });

      // Track encounter for agents
      event.participants.forEach(agentId => {
        agentEncounters.set(agentId, event.id);
      });

      // Simulate agent making a choice after 2 seconds
      setTimeout(async () => {
        const agentId = event.participants[0];
        const randomChoice = event.choices[Math.floor(Math.random() * event.choices.length)];
        
        console.log(`\n🤖 Agent ${agentId} chooses: "${randomChoice.label}"`);
        
        const resolution = await engine.handleAgentChoice(
          event.id,
          agentId,
          randomChoice.id
        );

        if (resolution) {
          console.log(`\n✅ Resolution:`);
          console.log(JSON.stringify(resolution.participantResults[agentId], null, 2));
        }

        agentEncounters.delete(agentId);
      }, 2000);
    }
  });

  engine.on('social:started', (event) => {
    console.log(`\n💬 SOCIAL EVENT`);
    console.log(`Type: ${event.type}`);
    console.log(`Initiator: ${event.initiator}`);
    console.log(`Participants: ${event.participants.join(', ')}`);
    console.log(`Status: ${event.status}`);
  });

  // Register multiple zones with different characteristics
  const zones: Zone[] = [
    {
      id: 'downtown',
      districtId: 'central',
      name: 'Downtown Plaza',
      type: 'COMMERCIAL',
      maxOccupancy: 100,
      currentOccupancy: 0,
      eventProbabilities: {
        ENCOUNTER: 0.03,
        OPPORTUNITY: 0.02,
        FOUND_ITEM: 0.015
      },
      activeEventCount: 0
    },
    {
      id: 'dark-alley',
      districtId: 'central',
      name: 'Dark Alley',
      type: 'UNDERGROUND',
      maxOccupancy: 10,
      currentOccupancy: 0,
      eventProbabilities: {
        ENCOUNTER: 0.08,
        MUGGING: 0.05,
        MYSTERIOUS_STRANGER: 0.03
      },
      activeEventCount: 0
    },
    {
      id: 'nightclub',
      districtId: 'entertainment',
      name: 'The Neon Nights Club',
      type: 'ENTERTAINMENT',
      maxOccupancy: 200,
      currentOccupancy: 0,
      eventProbabilities: {
        ENCOUNTER: 0.04,
        OPPORTUNITY: 0.03,
        SOCIAL: 0.06
      },
      activeEventCount: 0
    },
    {
      id: 'industrial',
      districtId: 'west',
      name: 'Industrial Sector',
      type: 'INDUSTRIAL',
      maxOccupancy: 50,
      currentOccupancy: 0,
      eventProbabilities: {
        ENCOUNTER: 0.025,
        ACCIDENT: 0.04,
        OPPORTUNITY: 0.02
      },
      activeEventCount: 0
    }
  ];

  zones.forEach(zone => {
    engine.registerZone(zone);
    console.log(`✓ Registered zone: ${zone.name}`);
  });

  // Create agents with diverse locations
  const agents = [
    { id: 'agent-alice', zone: 'downtown' },
    { id: 'agent-bob', zone: 'dark-alley' },
    { id: 'agent-charlie', zone: 'nightclub' },
    { id: 'agent-diana', zone: 'industrial' },
    { id: 'agent-eve', zone: 'downtown' }
  ];

  console.log('\n🤖 Spawning agents:');
  agents.forEach(agent => {
    engine.updateAgentLocation(agent.id, agent.zone);
    const zone = zones.find(z => z.id === agent.zone);
    console.log(`   ${agent.id} -> ${zone?.name}`);
  });

  // Subscribe to different event streams
  console.log('\n📡 Setting up event subscriptions...');
  
  await engine.subscribeToGlobal((event) => {
    if (event.type === 'WEATHER_CHANGE' || event.type === 'TIME_OF_DAY_CHANGE') {
      console.log(`\n🌍 Global Event: ${event.type}`);
    }
  });

  // Subscribe to specific agent
  await engine.subscribeToAgent('agent-alice', (event) => {
    console.log(`\n👤 [Alice] Personal event: ${event.type}`);
  });

  // Start the engine
  console.log('\n');
  await engine.start();

  console.log('\n⏱️  Engine running in advanced mode...');
  console.log('   Multiple zones, agents, and high event rate');
  console.log('   Press Ctrl+C to stop\n');

  // Periodic stats with detailed breakdown
  const statsInterval = setInterval(async () => {
    const stats = await engine.getStats();
    
    console.log(`\n${'─'.repeat(60)}`);
    console.log('📊 SYSTEM STATUS');
    console.log(`${'─'.repeat(60)}`);
    console.log(`🕐 Time: ${stats.environmental.timeOfDay}:00 | Weather: ${stats.environmental.weather}`);
    console.log(`📍 Zones: ${stats.zones} | Events: ${stats.store.totalEvents}`);
    console.log(`🎭 Active Encounters: ${stats.processor.activeParticipations}`);
    console.log(`🔄 Resolved: ${stats.processor.resolvedEvents}`);
    
    if (stats.store.eventsByType) {
      console.log(`\n📈 Events by Type:`);
      Object.entries(stats.store.eventsByType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
    }
    
    console.log(`${'─'.repeat(60)}`);
  }, 15000);

  // Simulate agent movement
  const movementInterval = setInterval(() => {
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const newZone = zones[Math.floor(Math.random() * zones.length)];
    
    console.log(`\n🚶 ${agent.id} moves to ${newZone.name}`);
    engine.updateAgentLocation(agent.id, newZone.id);
    agent.zone = newZone.id;
  }, 20000);

  // Adjust event rate dynamically
  const rateInterval = setInterval(() => {
    const newRate = 0.5 + Math.random() * 2.5; // 0.5x to 3x
    engine.setGlobalEventRate(newRate);
    console.log(`\n⚡ Event rate adjusted to ${newRate.toFixed(2)}x`);
  }, 30000);

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n⚠️  Shutting down...');
    clearInterval(statsInterval);
    clearInterval(movementInterval);
    clearInterval(rateInterval);
    
    await engine.stop();
    
    // Show final history
    console.log('\n📜 Event History Summary:');
    const finalStats = await engine.getStats();
    console.log(JSON.stringify(finalStats, null, 2));
    
    process.exit(0);
  });
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
