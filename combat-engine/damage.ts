/**
 * DARKCITY COMBAT ENGINE - DAMAGE CALCULATION
 * Deterministic damage resolution with positioning and defense modifiers
 */

import {
  AgentState,
  CombatState,
  CombatConfig,
  PrimaryAction,
  ReactionAction,
  Zone,
  ADJACENT_ZONES,
} from './types';

// ============================================================================
// DAMAGE CALCULATION
// ============================================================================

/**
 * Calculate base damage for an action
 * Uses deterministic formula: average of min/max based on attacker SOL ratio
 */
export function calculateBaseDamage(
  action: PrimaryAction,
  attackerSol: number,
  config: CombatConfig
): number {
  switch (action) {
    case 'STRIKE': {
      const { min, max } = config.damageValues.strike;
      // Slightly randomized but deterministic based on attacker's SOL
      const ratio = (attackerSol % 1); // Use decimal part for variance
      return min + (max - min) * ratio;
    }
    
    case 'HEAVY_ASSAULT': {
      const { min, max } = config.damageValues.heavyAssault;
      const ratio = (attackerSol % 1);
      return min + (max - min) * ratio;
    }
    
    case 'DRAIN':
      return config.damageValues.drain;
    
    case 'EXECUTE':
      // Determined in execution logic
      return 0;
    
    default:
      return 0;
  }
}

/**
 * Calculate positioning modifier for damage
 */
export function getPositioningModifier(
  attackerZone: Zone,
  defenderZone: Zone,
  combatState: CombatState,
  config: CombatConfig
): number {
  let modifier = 1.0;
  
  // Attacker in CENTER gets bonus damage
  if (attackerZone === 'CENTER') {
    modifier *= config.modifiers.centerDamageBonus;
  }
  
  // Defender is flanked (2+ enemies in same zone)
  const enemiesInZone = Array.from(combatState.agents.values()).filter(
    (agent) => agent.isAlive && agent.zone === defenderZone
  ).length;
  
  if (enemiesInZone >= 2) {
    modifier *= config.modifiers.flankedDamagePenalty;
  }
  
  return modifier;
}

/**
 * Calculate defense modifier based on reactions and status effects
 */
export function getDefenseModifier(
  defender: AgentState,
  reaction: ReactionAction,
  evadeSuccess: boolean,
  config: CombatConfig
): number {
  // Evade completely avoids damage
  if (evadeSuccess) {
    return 0;
  }
  
  let modifier = 1.0;
  
  // Counter reduces damage by 50%
  if (reaction === 'COUNTER') {
    modifier *= config.modifiers.counterReduction;
  }
  
  // Fortify status reduces damage by 50%
  const isFortified = defender.statusEffects.some(
    (effect) => effect.type === 'FORTIFIED'
  );
  if (isFortified) {
    modifier *= config.modifiers.fortifyReduction;
  }
  
  return modifier;
}

/**
 * Calculate final damage after all modifiers
 */
export function calculateFinalDamage(
  baseDamage: number,
  positioningModifier: number,
  defenseModifier: number
): number {
  return baseDamage * positioningModifier * defenseModifier;
}

/**
 * Complete damage calculation pipeline
 */
export function calculateDamage(
  action: PrimaryAction,
  attacker: AgentState,
  defender: AgentState,
  defenderReaction: ReactionAction,
  combatState: CombatState,
  config: CombatConfig,
  rng: () => number = Math.random
): {
  damage: number;
  evaded: boolean;
  countered: boolean;
  reflectDamage: number;
} {
  // Check if attack can be evaded
  const evadeSuccess =
    defenderReaction === 'EVADE' && rng() < config.evadeChance;
  
  // Calculate base damage
  const baseDamage = calculateBaseDamage(action, attacker.sol, config);
  
  // Calculate modifiers
  const positioningModifier = getPositioningModifier(
    attacker.zone,
    defender.zone,
    combatState,
    config
  );
  
  const defenseModifier = getDefenseModifier(
    defender,
    defenderReaction,
    evadeSuccess,
    config
  );
  
  // Calculate final damage
  const finalDamage = calculateFinalDamage(
    baseDamage,
    positioningModifier,
    defenseModifier
  );
  
  // Counter reflects damage back to attacker
  const reflectDamage = defenderReaction === 'COUNTER' ? 0.01 : 0;
  
  return {
    damage: finalDamage,
    evaded: evadeSuccess,
    countered: defenderReaction === 'COUNTER',
    reflectDamage,
  };
}

// ============================================================================
// SPECIAL DAMAGE CASES
// ============================================================================

/**
 * Execute action damage - instant kill or failure damage
 */
export function calculateExecuteDamage(
  targetSol: number,
  config: CombatConfig
): {
  isKill: boolean;
  damage: number;
} {
  const killThreshold = config.damageValues.execute.kill;
  const failDamage = config.damageValues.execute.fail;
  
  if (targetSol <= killThreshold) {
    return { isKill: true, damage: targetSol }; // Kill exactly
  } else {
    return { isKill: false, damage: failDamage };
  }
}

/**
 * Drain action - pure SOL removal (not transferred)
 */
export function calculateDrainDamage(config: CombatConfig): number {
  return config.damageValues.drain;
}

/**
 * Zone collapse damage - damage for being in collapsed zone
 */
export function calculateZoneCollapseDamage(): number {
  return 0.01; // Fixed damage per round in collapsed zone
}

// ============================================================================
// RANGE CHECKING
// ============================================================================

/**
 * Check if target is in range for attack
 */
export function isInRange(
  attackerZone: Zone,
  targetZone: Zone
): boolean {
  // Must be in same zone or adjacent zone
  return (
    attackerZone === targetZone ||
    ADJACENT_ZONES[attackerZone].includes(targetZone)
  );
}

/**
 * Check if zone is adjacent for movement
 */
export function isAdjacentZone(
  currentZone: Zone,
  targetZone: Zone
): boolean {
  return ADJACENT_ZONES[currentZone].includes(targetZone);
}

// ============================================================================
// COMBAT MATH UTILITIES
// ============================================================================

/**
 * Calculate SOL transfer on kill
 * 80% to killer, 20% to prize pool
 */
export function calculateSolTransfer(killedAgentSol: number): {
  toKiller: number;
  toPrizePool: number;
} {
  const toKiller = killedAgentSol * 0.8;
  const toPrizePool = killedAgentSol * 0.2;
  
  return { toKiller, toPrizePool };
}

/**
 * Round SOL value to avoid floating point errors
 */
export function roundSol(value: number): number {
  return Math.round(value * 10000) / 10000; // 4 decimal places
}

/**
 * Clamp SOL value between 0 and max
 */
export function clampSol(value: number, max?: number): number {
  const clamped = Math.max(0, value);
  return max !== undefined ? Math.min(clamped, max) : clamped;
}
