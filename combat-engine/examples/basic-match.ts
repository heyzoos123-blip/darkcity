/**
 * DARKCITY COMBAT ENGINE - BASIC MATCH EXAMPLE
 * Demonstrates a simple 1v1 match between aggressive and defensive strategies
 */

import {
  CombatSimulator,
  AgentStrategy,
  DEFAULT_COMBAT_CONFIG,
  getLivingAgents,
  isInRange,
  hasStatusEffect,
} from '../index';

import { Zone, ADJACENT_ZONES } from '../types';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getZoneDistance(from: Zone, to: Zone): number {
  if (from === to) return 0;
  if (ADJACENT_ZONES[from].includes(to)) return 1;
  return 2;
}

function getCloserZone(from: Zone, to: Zone): Zone {
  const adjacent = ADJACENT_ZONES[from];
  return adjacent.reduce((closest, zone) => {
    const closestDist = getZoneDistance(closest, to);
    const zoneDist = getZoneDistance(zone, to);
    return zoneDist < closestDist ? zone : closest;
  }, adjacent[0]);
}

// ============================================================================
// STRATEGIES
// ============================================================================

const aggressiveStrategy: AgentStrategy = (agentId, state, config) => {
  const agent = state.agents.get(agentId)!;
  const enemies = getLivingAgents(state).filter((a) => a.id !== agentId);

  if (enemies.length === 0) {
    return { action: 'WAIT', reaction: 'NONE' };
  }

  // Find closest enemy
  const target = enemies.reduce((closest, enemy) => {
    const currentDist = getZoneDistance(agent.zone, closest.zone);
    const enemyDist = getZoneDistance(agent.zone, enemy.zone);
    return enemyDist < currentDist ? enemy : closest;
  }, enemies[0]);

  // Use HEAVY_ASSAULT if off cooldown and in range
  const heavyAssaultReady = !agent.cooldowns.has('HEAVY_ASSAULT');
  if (
    heavyAssaultReady &&
    isInRange(agent.zone, target.zone) &&
    agent.sol > 0.01
  ) {
    return {
      action: 'HEAVY_ASSAULT',
      target: target.id,
      reaction: 'COUNTER',
    };
  }

  // If adjacent, strike
  if (isInRange(agent.zone, target.zone)) {
    return {
      action: 'STRIKE',
      target: target.id,
      reaction: 'COUNTER',
    };
  }

  // Move closer
  return {
    action: 'REPOSITION',
    targetZone: getCloserZone(agent.zone, target.zone),
    reaction: 'EVADE',
  };
};

const defensiveStrategy: AgentStrategy = (agentId, state, config) => {
  const agent = state.agents.get(agentId)!;
  const enemies = getLivingAgents(state).filter((a) => a.id !== agentId);

  if (enemies.length === 0) {
    return { action: 'WAIT', reaction: 'NONE' };
  }

  // Fortify if not already fortified
  const hasFortify = hasStatusEffect(agent, 'FORTIFIED');
  if (!hasFortify && agent.sol > 0.002) {
    return { action: 'FORTIFY', reaction: 'COUNTER' };
  }

  // Find weakest nearby enemy
  const nearbyEnemies = enemies.filter((e) =>
    isInRange(agent.zone, e.zone)
  );

  if (nearbyEnemies.length > 0) {
    const weakest = nearbyEnemies.reduce((w, e) => (e.sol < w.sol ? e : w));

    // Execute if weak enough
    if (weakest.sol <= config.damageValues.execute.kill && agent.sol > 0.015) {
      return {
        action: 'EXECUTE',
        target: weakest.id,
        reaction: 'COUNTER',
      };
    }

    return {
      action: 'STRIKE',
      target: weakest.id,
      reaction: 'COUNTER',
    };
  }

  return { action: 'WAIT', reaction: 'COUNTER' };
};

// ============================================================================
// MAIN
// ============================================================================

console.log('═══════════════════════════════════════════════════════════');
console.log('DARKCITY COMBAT ENGINE - BASIC MATCH EXAMPLE');
console.log('═══════════════════════════════════════════════════════════\n');

// Setup match
const strategies = new Map([
  ['Aggressor', aggressiveStrategy],
  ['Defender', defensiveStrategy],
]);

const simulator = new CombatSimulator(
  ['Aggressor', 'Defender'],
  strategies,
  DEFAULT_COMBAT_CONFIG,
  42 // Seed for reproducibility
);

console.log('⚔️  MATCH SETUP');
console.log('Tier: BLOOD (0.1 SOL starting)');
console.log('Agents: Aggressor vs Defender');
console.log('Seed: 42 (deterministic)\n');

console.log('🎮 RUNNING MATCH...\n');

// Run match with verbose logging
const result = simulator.runMatch(false);

// Display results
console.log('═══════════════════════════════════════════════════════════');
console.log('MATCH RESULTS');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`🏆 WINNER: ${result.winnerId ?? 'DRAW'}`);
console.log(`⏱️  DURATION: ${result.duration} rounds`);
console.log(`🎯 END REASON: ${result.endReason}\n`);

console.log('📊 FINAL STANDINGS:\n');
result.finalStandings.forEach((standing, index) => {
  const trophy = index === 0 ? '🥇' : '🥈';
  console.log(`${trophy} #${standing.placement} - ${standing.agentId}`);
  console.log(`   SOL: ${standing.finalSol.toFixed(4)}`);
  console.log(`   Kills: ${standing.kills}`);
  console.log(`   Damage Dealt: ${standing.damageDealt.toFixed(4)}`);
  console.log(`   Damage Taken: ${standing.damageTaken.toFixed(4)}`);
  console.log(
    `   Most Used Action: ${getMostUsedAction(standing.actionsUsed)}\n`
  );
});

console.log('📜 COMBAT LOG (Last 10 entries):\n');
const recentLog = result.combatLog.slice(-10);
recentLog.forEach((entry) => {
  const roundStr = `[R${entry.round}]`.padEnd(7);
  const typeIcon = getTypeIcon(entry.type);
  console.log(`${roundStr} ${typeIcon} ${entry.message}`);
});

console.log('\n═══════════════════════════════════════════════════════════\n');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getMostUsedAction(
  actionsUsed: Record<string, number>
): string {
  let maxAction = 'WAIT';
  let maxCount = 0;

  for (const [action, count] of Object.entries(actionsUsed)) {
    if (count > maxCount) {
      maxCount = count;
      maxAction = action;
    }
  }

  return `${maxAction} (${maxCount}x)`;
}

function getTypeIcon(type: string): string {
  switch (type) {
    case 'KILL':
      return '💀';
    case 'DAMAGE':
      return '⚔️ ';
    case 'ACTION':
      return '🎯';
    case 'STATUS':
      return '✨';
    case 'ZONE_COLLAPSE':
      return '🌀';
    default:
      return '  ';
  }
}
