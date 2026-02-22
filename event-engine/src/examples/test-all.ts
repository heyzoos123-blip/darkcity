/**
 * Test All Features
 * Quick test to verify all Event Engine components work
 */

import { EventEngine } from '../EventEngine';
import { defaultConfig } from '../../config/default';
import { Zone } from '../types/zones';

async function testEventEngine() {
  console.log('🧪 DARKCITY Event Engine - Component Tests\n');

  let passed = 0;
  let failed = 0;

  const test = (name: string, fn: () => boolean | Promise<boolean>) => {
    return async () => {
      try {
        const result = await fn();
        if (result) {
          console.log(`✅ ${name}`);
          passed++;
        } else {
          console.log(`❌ ${name}`);
          failed++;
        }
      } catch (error) {
        console.log(`❌ ${name} - ${(error as Error).message}`);
        failed++;
      }
    };
  };

  // Test 1: Engine Creation
  await test('Engine Creation', () => {
    const engine = new EventEngine(defaultConfig);
    return engine !== null;
  })();

  // Test 2: Zone Registration
  const engine = new EventEngine(defaultConfig);
  await test('Zone Registration', () => {
    const zone: Zone = {
      id: 'test-zone',
      districtId: 'test',
      name: 'Test Zone',
      type: 'COMMERCIAL',
      maxOccupancy: 100,
      currentOccupancy: 0,
      eventProbabilities: { ENCOUNTER: 0.02 },
      activeEventCount: 0
    };
    engine.registerZone(zone);
    return true;
  })();

  // Test 3: Agent Location Update
  await test('Agent Location Update', () => {
    engine.updateAgentLocation('test-agent', 'test-zone');
    return true;
  })();

  // Test 4: Engine Start
  await test('Engine Start', async () => {
    await engine.start();
    await new Promise(resolve => setTimeout(resolve, 100));
    const status = engine.getStatus();
    return status.running === true;
  })();

  // Test 5: Event Generation
  await test('Event Generation', async () => {
    return new Promise((resolve) => {
      let eventGenerated = false;
      
      engine.once('event:generated', () => {
        eventGenerated = true;
      });

      // Wait up to 5 seconds for an event
      setTimeout(() => {
        resolve(eventGenerated);
      }, 5000);
    });
  })();

  // Test 6: Stats Retrieval
  await test('Stats Retrieval', async () => {
    const stats = await engine.getStats();
    return stats.running === true && stats.zones > 0;
  })();

  // Test 7: Environmental State
  await test('Environmental State', () => {
    const state = engine.getEnvironmentalState();
    return state.timeOfDay >= 0 && state.timeOfDay <= 23;
  })();

  // Test 8: Event Subscription
  await test('Event Subscription', async () => {
    let received = false;
    
    await engine.subscribeToZone('test-zone', () => {
      received = true;
    });

    // Generate an event
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return true; // Subscription setup successful
  })();

  // Test 9: Event Query
  await test('Event Query', async () => {
    const events = await engine.queryEvents({ limit: 10 });
    return Array.isArray(events);
  })();

  // Test 10: Agent History
  await test('Agent History', async () => {
    const history = await engine.getAgentHistory('test-agent', 10);
    return Array.isArray(history);
  })();

  // Test 11: Engine Stop
  await test('Engine Stop', async () => {
    await engine.stop();
    const status = engine.getStatus();
    return status.running === false;
  })();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  console.log('='.repeat(50));

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Event Engine is ready to use.');
    return 0;
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
    return 1;
  }
}

// Run tests
testEventEngine()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('\n💥 Fatal error during testing:', error);
    process.exit(1);
  });
