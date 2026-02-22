/**
 * DARKCITY COMBAT ENGINE - ACTION DEFINITIONS
 * Action costs, cooldowns, and validation rules
 */

import {
  PrimaryAction,
  ReactionAction,
  ActionCosts,
  CombatConfig,
} from './types';

// ============================================================================
// DEFAULT COMBAT CONFIGURATION
// ============================================================================

export const DEFAULT_COMBAT_CONFIG: CombatConfig = {
  maxRounds: 100,
  startingSol: 0.1, // BLOOD tier default
  evadeChance: 0.4,
  
  zoneCollapseSchedule: [
    { round: 20, zone: 'SOUTH' },
    { round: 40, zone: 'WEST' },
    { round: 60, zone: 'EAST' },
    { round: 80, zone: 'NORTH' },
  ],
  
  actionCosts: {
    STRIKE: { sol: 0.001 },
    HEAVY_ASSAULT: { sol: 0.005, cooldown: 3 },
    REPOSITION: { sol: 0.0005 },
    FORTIFY: { sol: 0.001 },
    DRAIN: { sol: 0.002, cooldown: 2 },
    SCAN: { sol: 0.0005 },
    EXECUTE: { sol: 0.01 },
    WAIT: { sol: 0 },
  },
  
  reactionCosts: {
    COUNTER: 0.001,
    EVADE: 0.0005,
    INTIMIDATE: 0.002,
    NONE: 0,
  },
  
  damageValues: {
    strike: { min: 0.01, max: 0.03 },
    heavyAssault: { min: 0.05, max: 0.08 },
    drain: 0.01,
    execute: { kill: 0.05, fail: 0.02 },
  },
  
  modifiers: {
    fortifyReduction: 0.5, // 50% damage reduction
    counterReduction: 0.5, // 50% damage reduction
    centerDamageBonus: 1.1, // +10% damage from CENTER
    flankedDamagePenalty: 1.2, // +20% damage when flanked
  },
};

// ============================================================================
// ACTION PROPERTIES
// ============================================================================

export interface ActionProperties {
  name: PrimaryAction;
  cost: ActionCosts;
  requiresTarget: boolean;
  requiresZone: boolean;
  offensive: boolean;
  description: string;
}

export const ACTION_PROPERTIES: Record<PrimaryAction, ActionProperties> = {
  STRIKE: {
    name: 'STRIKE',
    cost: { sol: 0.001 },
    requiresTarget: true,
    requiresZone: false,
    offensive: true,
    description: 'Basic attack. Deals 0.01-0.03 SOL damage to adjacent target.',
  },
  
  HEAVY_ASSAULT: {
    name: 'HEAVY_ASSAULT',
    cost: { sol: 0.005, cooldown: 3 },
    requiresTarget: true,
    requiresZone: false,
    offensive: true,
    description:
      'Powerful attack. Deals 0.05-0.08 SOL damage. If countered or missed, agent is STUNNED for 1 round.',
  },
  
  REPOSITION: {
    name: 'REPOSITION',
    cost: { sol: 0.0005 },
    requiresTarget: false,
    requiresZone: true,
    offensive: false,
    description: 'Move to adjacent zone. Escape pressure or gain positioning.',
  },
  
  FORTIFY: {
    name: 'FORTIFY',
    cost: { sol: 0.001 },
    requiresTarget: false,
    requiresZone: false,
    offensive: false,
    description: '+50% damage reduction for this round.',
  },
  
  DRAIN: {
    name: 'DRAIN',
    cost: { sol: 0.002, cooldown: 2 },
    requiresTarget: true,
    requiresZone: false,
    offensive: true,
    description: 'Target loses 0.01 SOL (not transferred, destroyed). Weakens without killing.',
  },
  
  SCAN: {
    name: 'SCAN',
    cost: { sol: 0.0005 },
    requiresTarget: true,
    requiresZone: false,
    offensive: false,
    description: 'Reveal target\'s last 2 actions, current SOL, and cooldowns for 2 rounds.',
  },
  
  EXECUTE: {
    name: 'EXECUTE',
    cost: { sol: 0.01 },
    requiresTarget: true,
    requiresZone: false,
    offensive: true,
    description: 'Instant kill if target ≤0.05 SOL. Otherwise deals 0.02 damage.',
  },
  
  WAIT: {
    name: 'WAIT',
    cost: { sol: 0 },
    requiresTarget: false,
    requiresZone: false,
    offensive: false,
    description: 'Do nothing. Conserve SOL.',
  },
};

// ============================================================================
// REACTION PROPERTIES
// ============================================================================

export interface ReactionProperties {
  name: ReactionAction;
  cost: number;
  cooldown?: number;
  description: string;
}

export const REACTION_PROPERTIES: Record<ReactionAction, ReactionProperties> = {
  COUNTER: {
    name: 'COUNTER',
    cost: 0.001,
    description:
      'When attacked: Negate 50% damage, reflect 0.01 SOL back to attacker.',
  },
  
  EVADE: {
    name: 'EVADE',
    cost: 0.0005,
    description: 'When attacked or drained: 40% chance to completely avoid action.',
  },
  
  INTIMIDATE: {
    name: 'INTIMIDATE',
    cost: 0.002,
    cooldown: 4,
    description: 'When opponent enters your zone: Their next action costs +50% SOL.',
  },
  
  NONE: {
    name: 'NONE',
    cost: 0,
    description: 'No reaction. Conserve SOL.',
  },
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if an action is on cooldown
 */
export function isOnCooldown(
  action: PrimaryAction,
  cooldowns: Map<PrimaryAction, number>
): boolean {
  const remaining = cooldowns.get(action) ?? 0;
  return remaining > 0;
}

/**
 * Get remaining cooldown rounds for an action
 */
export function getCooldownRemaining(
  action: PrimaryAction,
  cooldowns: Map<PrimaryAction, number>
): number {
  return cooldowns.get(action) ?? 0;
}

/**
 * Check if agent can afford an action
 */
export function canAffordAction(
  sol: number,
  action: PrimaryAction,
  reaction: ReactionAction,
  config: CombatConfig
): boolean {
  const actionCost = config.actionCosts[action].sol;
  const reactionCost = config.reactionCosts[reaction];
  return sol >= actionCost + reactionCost;
}

/**
 * Calculate total action cost
 */
export function calculateActionCost(
  action: PrimaryAction,
  reaction: ReactionAction,
  config: CombatConfig,
  intimidated: boolean = false
): number {
  const actionCost = config.actionCosts[action].sol;
  const reactionCost = config.reactionCosts[reaction];
  
  const totalActionCost = intimidated ? actionCost * 1.5 : actionCost;
  return totalActionCost + reactionCost;
}

// ============================================================================
// TIER CONFIGURATIONS
// ============================================================================

export interface TierConfig {
  name: string;
  entrySol: number;
  maxPlayers: number;
  combatConfig: CombatConfig;
}

export const TIER_CONFIGS: Record<string, TierConfig> = {
  BLOOD: {
    name: 'BLOOD',
    entrySol: 0.1,
    maxPlayers: 16,
    combatConfig: {
      ...DEFAULT_COMBAT_CONFIG,
      startingSol: 0.1,
    },
  },
  
  IRON: {
    name: 'IRON',
    entrySol: 0.5,
    maxPlayers: 12,
    combatConfig: {
      ...DEFAULT_COMBAT_CONFIG,
      startingSol: 0.5,
    },
  },
  
  OBSIDIAN: {
    name: 'OBSIDIAN',
    entrySol: 2.0,
    maxPlayers: 8,
    combatConfig: {
      ...DEFAULT_COMBAT_CONFIG,
      startingSol: 2.0,
    },
  },
  
  NIGHTMARE: {
    name: 'NIGHTMARE',
    entrySol: 10.0,
    maxPlayers: 6,
    combatConfig: {
      ...DEFAULT_COMBAT_CONFIG,
      startingSol: 10.0,
    },
  },
};
