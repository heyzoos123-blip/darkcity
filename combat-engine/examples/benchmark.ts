/**
 * DARKCITY COMBAT ENGINE - PERFORMANCE BENCHMARK
 * Tests combat resolution speed across different scenarios
 */

import {
  CombatSimulator,
  AgentStrategy,
  DEFAULT_COMBAT_CONFIG,
  getLivingAgents,
} from '../index';

// ============================================================================
// SIMPLE STRATEGY FOR BENCHMARKING
// ============================================================================

const randomStrategy: AgentStrategy = (agentId, state, config) => {
  const agent = state.agents.get(agentId)!;
  const enemies = getLivingAgents(state).filter((a) => a.id !== agentId);

  if (enemies.length === 0) {
    return { action: 'WAIT', reaction: 'NONE' };
  }

  const target = enemies[Math.floor(Math.random() * enemies.length)];
  const actions = ['STRIKE', 'FORTIFY', 'REPOSITION', 'WAIT'] as const;
  const action = actions[Math.floor(Math.random() * actions.length)];

  if (action === 'STRIKE') {
    return {
      action: 'STRIKE',
      target: target.id,
      reaction: 'COUNTER',
    };
  }

  if (action === 'REPOSITION') {
    const zones = ['NORTH', 'SOUTH', 'EAST', 'WEST', 'CENTER'] as const;
    const targetZone = zones[Math.floor(Math.random() * zones.length)];
    return {
      action: 'REPOSITION',
      targetZone,
      reaction: 'EVADE',
    };
  }

  return { action, reaction: 'NONE' };
};

// ============================================================================
// BENCHMARK RUNNER
// ============================================================================

function benchmark(
  name: string,
  agentCount: number,
  trials: number
): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`BENCHMARK: ${name}`);
  console.log(`Agents: ${agentCount} | Trials: ${trials}`);
  console.log('='.repeat(60));

  const agentIds = Array.from({ length: agentCount }, (_, i) => `agent${i + 1}`);
  const strategies = new Map(agentIds.map((id) => [id, randomStrategy]));

  const matchDurations: number[] = [];
  const roundCounts: number[] = [];
  let totalRounds = 0;

  const startTime = Date.now();

  for (let i = 0; i < trials; i++) {
    const trialStart = Date.now();

    const simulator = new CombatSimulator(
      agentIds,
      strategies,
      DEFAULT_COMBAT_CONFIG,
      i // Different seed each trial
    );

    const result = simulator.runMatch();
    const trialDuration = Date.now() - trialStart;

    matchDurations.push(trialDuration);
    roundCounts.push(result.duration);
    totalRounds += result.duration;

    if ((i + 1) % Math.max(1, Math.floor(trials / 10)) === 0) {
      process.stdout.write(`\r  Progress: ${i + 1}/${trials} matches...`);
    }
  }

  const totalTime = Date.now() - startTime;

  console.log('\n');

  // Calculate statistics
  const avgMatchDuration = average(matchDurations);
  const minMatchDuration = Math.min(...matchDurations);
  const maxMatchDuration = Math.max(...matchDurations);

  const avgRoundCount = average(roundCounts);
  const avgRoundDuration = totalTime / totalRounds;

  console.log('RESULTS:');
  console.log('--------');
  console.log(`Total Time: ${totalTime}ms`);
  console.log(`Total Rounds: ${totalRounds}`);
  console.log(`\nMatch Duration:`);
  console.log(`  Average: ${avgMatchDuration.toFixed(2)}ms`);
  console.log(`  Min: ${minMatchDuration}ms`);
  console.log(`  Max: ${maxMatchDuration}ms`);
  console.log(`\nRound Count:`);
  console.log(`  Average: ${avgRoundCount.toFixed(2)} rounds/match`);
  console.log(`\nRound Duration:`);
  console.log(`  Average: ${avgRoundDuration.toFixed(2)}ms/round`);
  console.log(`\nThroughput:`);
  console.log(`  ${(trials / (totalTime / 1000)).toFixed(2)} matches/second`);
  console.log(`  ${(totalRounds / (totalTime / 1000)).toFixed(2)} rounds/second`);

  // Performance assessment
  const passThreshold = avgRoundDuration < 100;
  console.log(`\n${passThreshold ? '✅' : '❌'} Performance: ${avgRoundDuration < 10 ? 'EXCELLENT' : avgRoundDuration < 50 ? 'GOOD' : avgRoundDuration < 100 ? 'ACCEPTABLE' : 'NEEDS OPTIMIZATION'}`);
}

function average(arr: number[]): number {
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

// ============================================================================
// RUN BENCHMARKS
// ============================================================================

console.log('\n');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  DARKCITY COMBAT ENGINE - PERFORMANCE BENCHMARK            ║');
console.log('╚════════════════════════════════════════════════════════════╝');

// Benchmark 1: 1v1 (High Trials)
benchmark('1v1 Combat', 2, 100);

// Benchmark 2: 4v4 (Medium Trials)
benchmark('4-Player Battle', 4, 50);

// Benchmark 3: 8-player (Low Trials)
benchmark('8-Player Battle', 8, 20);

// Benchmark 4: 16-player BLOOD tier (Few Trials)
benchmark('16-Player Battle Royale (BLOOD Tier)', 16, 10);

console.log('\n');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  BENCHMARK COMPLETE                                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');
