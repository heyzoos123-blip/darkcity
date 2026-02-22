/**
 * DARKCITY COMBAT ENGINE - COMBAT SIMULATOR
 * Testing and simulation utilities for combat matches
 */

import {
  CombatState,
  CombatConfig,
  ActionSubmission,
  ActionDeclaration,
  MatchResult,
  PrimaryAction,
  ReactionAction,
} from './types';

import { DEFAULT_COMBAT_CONFIG } from './actions';

import {
  initializeCombatState,
  advanceRound,
  getLivingAgents,
  isMatchOver,
  getWinner,
  getFinalStandings,
} from './combat-state';

import { resolveRound, createSeededRng } from './combat-resolver';

// ============================================================================
// AGENT STRATEGY INTERFACE
// ============================================================================

/**
 * Agent strategy function - given state, return action
 */
export type AgentStrategy = (
  agentId: string,
  state: CombatState,
  config: CombatConfig
) => ActionDeclaration;

// ============================================================================
// COMBAT SIMULATOR
// ============================================================================

export class CombatSimulator {
  private state: CombatState;
  private config: CombatConfig;
  private strategies: Map<string, AgentStrategy>;
  private rng: () => number;
  
  constructor(
    agentIds: string[],
    strategies: Map<string, AgentStrategy>,
    config: CombatConfig = DEFAULT_COMBAT_CONFIG,
    seed?: number
  ) {
    this.state = initializeCombatState(agentIds, config);
    this.config = config;
    this.strategies = strategies;
    this.rng = seed !== undefined ? createSeededRng(seed) : Math.random;
  }
  
  /**
   * Run one round of combat
   */
  runRound(): {
    round: number;
    submissions: ActionSubmission[];
    livingCount: number;
    isOver: boolean;
  } {
    const round = this.state.round + 1;
    
    // Advance to next round
    this.state = advanceRound(this.state, this.config);
    
    // Get declarations from all living agents
    const submissions: ActionSubmission[] = [];
    const livingAgents = getLivingAgents(this.state);
    
    for (const agent of livingAgents) {
      const strategy = this.strategies.get(agent.id);
      if (!strategy) {
        console.warn(`No strategy for agent ${agent.id}, defaulting to WAIT`);
        submissions.push({
          agentId: agent.id,
          declaration: {
            action: 'WAIT',
            reaction: 'NONE',
          },
          submittedAt: Date.now(),
        });
        continue;
      }
      
      const declaration = strategy(agent.id, this.state, this.config);
      
      submissions.push({
        agentId: agent.id,
        declaration,
        submittedAt: Date.now() + Math.random(), // Simulate timing variance
      });
    }
    
    // Resolve all actions
    const { results, updatedState } = resolveRound(
      submissions,
      this.state,
      this.config,
      this.rng
    );
    
    this.state = updatedState;
    
    return {
      round,
      submissions,
      livingCount: getLivingAgents(this.state).length,
      isOver: isMatchOver(this.state, this.config.maxRounds),
    };
  }
  
  /**
   * Run full match until completion
   */
  runMatch(verbose: boolean = false): MatchResult {
    const startTime = Date.now();
    
    while (!isMatchOver(this.state, this.config.maxRounds)) {
      const roundResult = this.runRound();
      
      if (verbose) {
        console.log(
          `Round ${roundResult.round}: ${roundResult.livingCount} agents alive`
        );
      }
      
      if (roundResult.isOver) break;
    }
    
    const duration = Date.now() - startTime;
    const winnerId = getWinner(this.state);
    const standings = getFinalStandings(this.state);
    
    // Calculate stats
    const finalStandings = standings.map((standing, index) => {
      const agent = this.state.agents.get(standing.agentId)!;
      
      // Count kills and damage from logs
      const kills = this.state.combatLog.filter(
        (log) => log.type === 'KILL' && log.agentId === standing.agentId
      ).length;
      
      const damageDealt = this.state.combatLog
        .filter(
          (log) =>
            log.type === 'DAMAGE' &&
            log.agentId === standing.agentId &&
            log.damage
        )
        .reduce((sum, log) => sum + (log.damage ?? 0), 0);
      
      const damageTaken = this.state.combatLog
        .filter(
          (log) =>
            log.type === 'DAMAGE' &&
            log.targetId === standing.agentId &&
            log.damage
        )
        .reduce((sum, log) => sum + (log.damage ?? 0), 0);
      
      // Count action usage
      const actionsUsed: Record<PrimaryAction, number> = {
        STRIKE: 0,
        HEAVY_ASSAULT: 0,
        REPOSITION: 0,
        FORTIFY: 0,
        DRAIN: 0,
        SCAN: 0,
        EXECUTE: 0,
        WAIT: 0,
      };
      
      this.state.combatLog
        .filter(
          (log) => log.type === 'ACTION' && log.agentId === standing.agentId
        )
        .forEach((log) => {
          if (log.action && log.action in actionsUsed) {
            actionsUsed[log.action as PrimaryAction]++;
          }
        });
      
      return {
        agentId: standing.agentId,
        placement: index + 1,
        finalSol: standing.finalSol,
        kills,
        damageDealt,
        damageTaken,
        actionsUsed,
      };
    });
    
    return {
      winnerId,
      duration: this.state.round,
      finalStandings,
      combatLog: this.state.combatLog,
      endReason:
        getLivingAgents(this.state).length === 1
          ? 'LAST_STANDING'
          : getLivingAgents(this.state).length === 0
          ? 'ALL_DEAD'
          : 'ROUND_LIMIT',
    };
  }
  
  /**
   * Get current state (read-only)
   */
  getState(): CombatState {
    return { ...this.state };
  }
  
  /**
   * Get combat log
   */
  getCombatLog() {
    return this.state.combatLog;
  }
}

// ============================================================================
// EXAMPLE STRATEGIES
// ============================================================================

/**
 * Aggressive strategy - always attack nearest enemy
 */
export const aggressiveStrategy: AgentStrategy = (
  agentId,
  state,
  config
) => {
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
  
  // If adjacent, strike. If far, move closer
  if (agent.zone === target.zone || isAdjacent(agent.zone, target.zone)) {
    return {
      action: 'STRIKE',
      target: target.id,
      reaction: 'COUNTER',
    };
  } else {
    return {
      action: 'REPOSITION',
      targetZone: getCloserZone(agent.zone, target.zone),
      reaction: 'EVADE',
    };
  }
};

/**
 * Defensive strategy - fortify and counter
 */
export const defensiveStrategy: AgentStrategy = (
  agentId,
  state,
  config
) => {
  const agent = state.agents.get(agentId)!;
  const enemies = getLivingAgents(state).filter((a) => a.id !== agentId);
  
  if (enemies.length === 0) {
    return { action: 'WAIT', reaction: 'NONE' };
  }
  
  // Fortify if not already fortified
  const hasFortify = agent.statusEffects.some((e) => e.type === 'FORTIFIED');
  if (!hasFortify) {
    return { action: 'FORTIFY', reaction: 'COUNTER' };
  }
  
  // Strike weakest nearby enemy
  const nearbyEnemies = enemies.filter(
    (e) => agent.zone === e.zone || isAdjacent(agent.zone, e.zone)
  );
  
  if (nearbyEnemies.length > 0) {
    const weakest = nearbyEnemies.reduce((w, e) => (e.sol < w.sol ? e : w));
    return {
      action: 'STRIKE',
      target: weakest.id,
      reaction: 'COUNTER',
    };
  }
  
  return { action: 'WAIT', reaction: 'COUNTER' };
};

/**
 * Tactical strategy - scan, position, execute
 */
export const tacticalStrategy: AgentStrategy = (
  agentId,
  state,
  config
) => {
  const agent = state.agents.get(agentId)!;
  const enemies = getLivingAgents(state).filter((a) => a.id !== agentId);
  
  if (enemies.length === 0) {
    return { action: 'WAIT', reaction: 'NONE' };
  }
  
  // Find weakest enemy
  const weakest = enemies.reduce((w, e) => (e.sol < w.sol ? e : w));
  
  // Execute if weak enough and adjacent
  if (
    weakest.sol <= config.damageValues.execute.kill &&
    (agent.zone === weakest.zone || isAdjacent(agent.zone, weakest.zone))
  ) {
    return {
      action: 'EXECUTE',
      target: weakest.id,
      reaction: 'EVADE',
    };
  }
  
  // Scan if haven't scanned this target
  const hasScanned = agent.actionHistory.includes('SCAN');
  if (!hasScanned) {
    return {
      action: 'SCAN',
      target: weakest.id,
      reaction: 'EVADE',
    };
  }
  
  // Strike weakest
  if (agent.zone === weakest.zone || isAdjacent(agent.zone, weakest.zone)) {
    return {
      action: 'STRIKE',
      target: weakest.id,
      reaction: 'EVADE',
    };
  }
  
  // Move toward weakest
  return {
    action: 'REPOSITION',
    targetZone: getCloserZone(agent.zone, weakest.zone),
    reaction: 'EVADE',
  };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

import { Zone, ADJACENT_ZONES } from './types';

function getZoneDistance(from: Zone, to: Zone): number {
  if (from === to) return 0;
  if (isAdjacent(from, to)) return 1;
  return 2;
}

function isAdjacent(from: Zone, to: Zone): boolean {
  return ADJACENT_ZONES[from].includes(to);
}

function getCloserZone(from: Zone, to: Zone): Zone {
  const adjacent = ADJACENT_ZONES[from];
  
  // Find adjacent zone closest to target
  const closest = adjacent.reduce((closest, zone) => {
    const closestDist = getZoneDistance(closest, to);
    const zoneDist = getZoneDistance(zone, to);
    return zoneDist < closestDist ? zone : closest;
  }, adjacent[0]);
  
  return closest;
}
