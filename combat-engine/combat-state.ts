/**
 * DARKCITY COMBAT ENGINE - COMBAT STATE MANAGEMENT
 * State initialization, updates, and status effect management
 */

import {
  CombatState,
  AgentState,
  StatusEffect,
  StatusEffectInstance,
  PrimaryAction,
  Zone,
  CombatConfig,
  CombatLogEntry,
} from './types';

// ============================================================================
// STATE INITIALIZATION
// ============================================================================

/**
 * Initialize combat state for a new match
 */
export function initializeCombatState(
  agentIds: string[],
  config: CombatConfig,
  spawnZones?: Map<string, Zone>
): CombatState {
  const agents = new Map<string, AgentState>();
  
  // Create agent states
  agentIds.forEach((id, index) => {
    const zone =
      spawnZones?.get(id) ?? getDefaultSpawnZone(index, agentIds.length);
    
    agents.set(id, {
      id,
      sol: config.startingSol,
      zone,
      cooldowns: new Map(),
      statusEffects: [],
      actionHistory: [],
      isAlive: true,
    });
  });
  
  // Initialize active zones (all zones start active)
  const activeZones = new Set<Zone>(['NORTH', 'SOUTH', 'EAST', 'WEST', 'CENTER']);
  
  // Determine first collapse
  const firstCollapse = config.zoneCollapseSchedule[0];
  
  return {
    round: 0,
    agents,
    activeZones,
    nextCollapseZone: firstCollapse?.zone ?? null,
    collapseIn: firstCollapse?.round ?? Infinity,
    combatLog: [],
  };
}

/**
 * Get default spawn zone for agent based on index
 */
function getDefaultSpawnZone(index: number, totalAgents: number): Zone {
  const zones: Zone[] = ['NORTH', 'SOUTH', 'EAST', 'WEST', 'CENTER'];
  
  // Distribute agents evenly across zones
  // Prioritize outer zones, use CENTER if more than 4 agents
  if (totalAgents <= 4) {
    return zones[index % 4]; // Skip CENTER
  } else {
    return zones[index % 5];
  }
}

// ============================================================================
// STATE UPDATES
// ============================================================================

/**
 * Update agent SOL (health)
 */
export function updateAgentSol(
  agent: AgentState,
  delta: number
): AgentState {
  const newSol = Math.max(0, agent.sol + delta);
  
  return {
    ...agent,
    sol: newSol,
    isAlive: newSol > 0,
  };
}

/**
 * Move agent to new zone
 */
export function moveAgent(
  agent: AgentState,
  newZone: Zone
): AgentState {
  return {
    ...agent,
    zone: newZone,
  };
}

/**
 * Add action to agent's history
 */
export function recordAction(
  agent: AgentState,
  action: PrimaryAction
): AgentState {
  const newHistory = [action, ...agent.actionHistory].slice(0, 5);
  
  return {
    ...agent,
    actionHistory: newHistory,
  };
}

/**
 * Set action cooldown
 */
export function setActionCooldown(
  agent: AgentState,
  action: PrimaryAction,
  rounds: number
): AgentState {
  const newCooldowns = new Map(agent.cooldowns);
  
  if (rounds > 0) {
    newCooldowns.set(action, rounds);
  } else {
    newCooldowns.delete(action);
  }
  
  return {
    ...agent,
    cooldowns: newCooldowns,
  };
}

/**
 * Decrement all cooldowns by 1 round
 */
export function decrementCooldowns(agent: AgentState): AgentState {
  const newCooldowns = new Map<PrimaryAction, number>();
  
  agent.cooldowns.forEach((rounds, action) => {
    const remaining = rounds - 1;
    if (remaining > 0) {
      newCooldowns.set(action, remaining);
    }
  });
  
  return {
    ...agent,
    cooldowns: newCooldowns,
  };
}

// ============================================================================
// STATUS EFFECTS
// ============================================================================

/**
 * Apply status effect to agent
 */
export function applyStatusEffect(
  agent: AgentState,
  effect: StatusEffect,
  duration: number,
  appliedBy?: string,
  metadata?: Record<string, any>
): AgentState {
  const newEffect: StatusEffectInstance = {
    type: effect,
    duration,
    appliedBy,
    metadata,
  };
  
  return {
    ...agent,
    statusEffects: [...agent.statusEffects, newEffect],
  };
}

/**
 * Remove status effect from agent
 */
export function removeStatusEffect(
  agent: AgentState,
  effectType: StatusEffect
): AgentState {
  return {
    ...agent,
    statusEffects: agent.statusEffects.filter((e) => e.type !== effectType),
  };
}

/**
 * Decrement all status effect durations
 */
export function decrementStatusEffects(agent: AgentState): AgentState {
  const updatedEffects = agent.statusEffects
    .map((effect) => ({
      ...effect,
      duration: effect.duration - 1,
    }))
    .filter((effect) => effect.duration > 0);
  
  return {
    ...agent,
    statusEffects: updatedEffects,
  };
}

/**
 * Check if agent has specific status effect
 */
export function hasStatusEffect(
  agent: AgentState,
  effectType: StatusEffect
): boolean {
  return agent.statusEffects.some((effect) => effect.type === effectType);
}

/**
 * Get status effect instance
 */
export function getStatusEffect(
  agent: AgentState,
  effectType: StatusEffect
): StatusEffectInstance | undefined {
  return agent.statusEffects.find((effect) => effect.type === effectType);
}

// ============================================================================
// ROUND PROGRESSION
// ============================================================================

/**
 * Advance combat state to next round
 */
export function advanceRound(
  state: CombatState,
  config: CombatConfig
): CombatState {
  const newRound = state.round + 1;
  
  // Update all agents
  const updatedAgents = new Map<string, AgentState>();
  state.agents.forEach((agent, id) => {
    if (!agent.isAlive) {
      updatedAgents.set(id, agent);
      return;
    }
    
    let updated = agent;
    
    // Decrement cooldowns
    updated = decrementCooldowns(updated);
    
    // Decrement status effects
    updated = decrementStatusEffects(updated);
    
    updatedAgents.set(id, updated);
  });
  
  // Check for zone collapse
  let activeZones = new Set(state.activeZones);
  let nextCollapseZone = state.nextCollapseZone;
  let collapseIn = state.collapseIn - 1;
  let newLogs = [...state.combatLog];
  
  if (collapseIn <= 0 && nextCollapseZone) {
    // Zone collapses
    activeZones.delete(nextCollapseZone);
    
    newLogs.push({
      round: newRound,
      timestamp: Date.now(),
      type: 'ZONE_COLLAPSE',
      message: `Zone ${nextCollapseZone} has collapsed!`,
      metadata: { zone: nextCollapseZone },
    });
    
    // Find next collapse
    const nextCollapse = config.zoneCollapseSchedule.find(
      (schedule) => schedule.round > newRound
    );
    
    if (nextCollapse) {
      nextCollapseZone = nextCollapse.zone;
      collapseIn = nextCollapse.round - newRound;
    } else {
      nextCollapseZone = null;
      collapseIn = Infinity;
    }
  }
  
  return {
    round: newRound,
    agents: updatedAgents,
    activeZones,
    nextCollapseZone,
    collapseIn,
    combatLog: newLogs,
  };
}

// ============================================================================
// COMBAT LOG
// ============================================================================

/**
 * Add entry to combat log
 */
export function logAction(
  state: CombatState,
  entry: Omit<CombatLogEntry, 'timestamp'>
): CombatState {
  return {
    ...state,
    combatLog: [
      ...state.combatLog,
      {
        ...entry,
        timestamp: Date.now(),
      },
    ],
  };
}

/**
 * Get recent combat log entries
 */
export function getRecentLog(
  state: CombatState,
  count: number = 10
): CombatLogEntry[] {
  return state.combatLog.slice(-count);
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Get all living agents
 */
export function getLivingAgents(state: CombatState): AgentState[] {
  return Array.from(state.agents.values()).filter((agent) => agent.isAlive);
}

/**
 * Get agents in specific zone
 */
export function getAgentsInZone(state: CombatState, zone: Zone): AgentState[] {
  return Array.from(state.agents.values()).filter(
    (agent) => agent.isAlive && agent.zone === zone
  );
}

/**
 * Check if match is over
 */
export function isMatchOver(state: CombatState, maxRounds: number): boolean {
  const livingCount = getLivingAgents(state).length;
  return livingCount <= 1 || state.round >= maxRounds;
}

/**
 * Get winner (if match is over)
 */
export function getWinner(state: CombatState): string | null {
  const living = getLivingAgents(state);
  
  if (living.length === 1) {
    return living[0].id;
  }
  
  if (living.length === 0) {
    return null;
  }
  
  // If timeout, highest SOL wins
  const sorted = living.sort((a, b) => b.sol - a.sol);
  return sorted[0].id;
}

/**
 * Get final standings
 */
export function getFinalStandings(state: CombatState): {
  agentId: string;
  finalSol: number;
  isWinner: boolean;
}[] {
  const agents = Array.from(state.agents.values());
  
  // Sort by SOL descending
  const sorted = agents.sort((a, b) => b.sol - a.sol);
  const winnerId = getWinner(state);
  
  return sorted.map((agent) => ({
    agentId: agent.id,
    finalSol: agent.sol,
    isWinner: agent.id === winnerId,
  }));
}
