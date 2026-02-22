/**
 * DARKCITY COMBAT ENGINE - TYPE DEFINITIONS
 * Core type system for deterministic AI agent combat
 */

// ============================================================================
// ZONE SYSTEM
// ============================================================================

export type Zone = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'CENTER';

export const ADJACENT_ZONES: Record<Zone, Zone[]> = {
  NORTH: ['CENTER', 'EAST', 'WEST'],
  SOUTH: ['CENTER', 'EAST', 'WEST'],
  EAST: ['CENTER', 'NORTH', 'SOUTH'],
  WEST: ['CENTER', 'NORTH', 'SOUTH'],
  CENTER: ['NORTH', 'SOUTH', 'EAST', 'WEST'],
};

// ============================================================================
// ACTIONS & REACTIONS
// ============================================================================

export type PrimaryAction =
  | 'STRIKE'
  | 'HEAVY_ASSAULT'
  | 'REPOSITION'
  | 'FORTIFY'
  | 'DRAIN'
  | 'SCAN'
  | 'EXECUTE'
  | 'WAIT';

export type ReactionAction = 'COUNTER' | 'EVADE' | 'INTIMIDATE' | 'NONE';

export interface ActionDeclaration {
  action: PrimaryAction;
  target?: string; // Agent ID (required for offensive actions)
  targetZone?: Zone; // For REPOSITION
  reaction: ReactionAction;
}

export interface ActionCosts {
  sol: number;
  cooldown?: number; // Rounds
}

// ============================================================================
// STATUS EFFECTS
// ============================================================================

export type StatusEffect =
  | 'STUNNED'
  | 'FORTIFIED'
  | 'SCANNED'
  | 'INTIMIDATED';

export interface StatusEffectInstance {
  type: StatusEffect;
  duration: number; // Rounds remaining
  appliedBy?: string; // Agent ID
  metadata?: Record<string, any>;
}

// ============================================================================
// AGENT STATE
// ============================================================================

export interface AgentState {
  id: string;
  sol: number; // Health/stake
  zone: Zone;
  cooldowns: Map<PrimaryAction, number>; // Rounds remaining
  statusEffects: StatusEffectInstance[];
  actionHistory: PrimaryAction[]; // Last 5 actions
  isAlive: boolean;
}

// ============================================================================
// COMBAT STATE
// ============================================================================

export interface CombatState {
  round: number;
  agents: Map<string, AgentState>;
  activeZones: Set<Zone>; // Zones that haven't collapsed
  nextCollapseZone: Zone | null;
  collapseIn: number; // Rounds until next collapse
  combatLog: CombatLogEntry[];
}

export interface CombatLogEntry {
  round: number;
  timestamp: number;
  type: 'ACTION' | 'DAMAGE' | 'KILL' | 'STATUS' | 'ZONE_COLLAPSE';
  agentId?: string;
  targetId?: string;
  action?: PrimaryAction | ReactionAction;
  damage?: number;
  solTransfer?: number;
  message: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// ACTION SUBMISSION & RESOLUTION
// ============================================================================

export interface ActionSubmission {
  agentId: string;
  declaration: ActionDeclaration;
  submittedAt: number; // Timestamp for priority resolution
}

export interface ActionResult {
  agentId: string;
  action: PrimaryAction;
  success: boolean;
  damage?: number;
  solCost: number;
  effects: {
    targetId?: string;
    damageDealt?: number;
    solDrained?: number;
    statusApplied?: StatusEffect;
    intelGained?: AgentIntel;
    moved?: boolean;
    stunned?: boolean;
  };
  errors: string[];
}

export interface AgentIntel {
  agentId: string;
  sol: number;
  zone: Zone;
  lastActions: PrimaryAction[];
  cooldowns: Map<PrimaryAction, number>;
}

// ============================================================================
// COMBAT CONFIGURATION
// ============================================================================

export interface CombatConfig {
  maxRounds: number;
  startingSol: number;
  evadeChance: number; // 0.0 - 1.0 (default 0.4)
  zoneCollapseSchedule: {
    round: number;
    zone: Zone;
  }[];
  
  // Action costs
  actionCosts: Record<PrimaryAction, ActionCosts>;
  reactionCosts: Record<ReactionAction, number>;
  
  // Damage values
  damageValues: {
    strike: { min: number; max: number };
    heavyAssault: { min: number; max: number };
    drain: number;
    execute: { kill: number; fail: number };
  };
  
  // Modifiers
  modifiers: {
    fortifyReduction: number; // 0.5 = 50% reduction
    counterReduction: number; // 0.5 = 50% reduction
    centerDamageBonus: number; // 1.1 = +10% damage
    flankedDamagePenalty: number; // 1.2 = +20% damage taken
  };
}

// ============================================================================
// MATCH RESULTS
// ============================================================================

export interface MatchResult {
  winnerId: string | null;
  duration: number; // Rounds
  finalStandings: {
    agentId: string;
    placement: number;
    finalSol: number;
    kills: number;
    damageDealt: number;
    damageTaken: number;
    actionsUsed: Record<PrimaryAction, number>;
  }[];
  combatLog: CombatLogEntry[];
  endReason: 'LAST_STANDING' | 'ROUND_LIMIT' | 'ALL_DEAD';
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class CombatError extends Error {
  constructor(
    message: string,
    public code: string,
    public agentId?: string
  ) {
    super(message);
    this.name = 'CombatError';
  }
}

export type ValidationError =
  | 'INVALID_ACTION'
  | 'INVALID_TARGET'
  | 'TARGET_DEAD'
  | 'OUT_OF_RANGE'
  | 'ON_COOLDOWN'
  | 'INSUFFICIENT_SOL'
  | 'STUNNED'
  | 'INVALID_ZONE';
