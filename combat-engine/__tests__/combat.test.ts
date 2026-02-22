/**
 * DARKCITY COMBAT ENGINE - UNIT TESTS
 * Comprehensive tests for combat mechanics
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

import {
  CombatState,
  AgentState,
  ActionSubmission,
  PrimaryAction,
  ReactionAction,
} from '../types';

import { DEFAULT_COMBAT_CONFIG } from '../actions';

import {
  initializeCombatState,
  updateAgentSol,
  applyStatusEffect,
  hasStatusEffect,
  getLivingAgents,
  isMatchOver,
  getWinner,
} from '../combat-state';

import {
  calculateDamage,
  calculateExecuteDamage,
  isInRange,
  calculateSolTransfer,
} from '../damage';

import { validateAction, resolveAction, createSeededRng } from '../combat-resolver';

import { CombatSimulator, aggressiveStrategy, defensiveStrategy } from '../simulator';

// ============================================================================
// COMBAT STATE TESTS
// ============================================================================

describe('Combat State Management', () => {
  let state: CombatState;
  
  beforeEach(() => {
    state = initializeCombatState(['agent1', 'agent2', 'agent3'], DEFAULT_COMBAT_CONFIG);
  });
  
  it('should initialize combat state correctly', () => {
    expect(state.round).toBe(0);
    expect(state.agents.size).toBe(3);
    expect(state.activeZones.size).toBe(5);
    expect(getLivingAgents(state).length).toBe(3);
  });
  
  it('should update agent SOL correctly', () => {
    const agent = state.agents.get('agent1')!;
    const updated = updateAgentSol(agent, -0.05);
    
    expect(updated.sol).toBe(0.05);
    expect(updated.isAlive).toBe(true);
  });
  
  it('should mark agent as dead when SOL reaches 0', () => {
    const agent = state.agents.get('agent1')!;
    const updated = updateAgentSol(agent, -0.1);
    
    expect(updated.sol).toBe(0);
    expect(updated.isAlive).toBe(false);
  });
  
  it('should apply and detect status effects', () => {
    const agent = state.agents.get('agent1')!;
    const updated = applyStatusEffect(agent, 'STUNNED', 1);
    
    expect(hasStatusEffect(updated, 'STUNNED')).toBe(true);
    expect(updated.statusEffects.length).toBe(1);
  });
  
  it('should detect match over when one agent remains', () => {
    state.agents.set('agent2', { ...state.agents.get('agent2')!, isAlive: false, sol: 0 });
    state.agents.set('agent3', { ...state.agents.get('agent3')!, isAlive: false, sol: 0 });
    
    expect(isMatchOver(state, 100)).toBe(true);
    expect(getWinner(state)).toBe('agent1');
  });
});

// ============================================================================
// DAMAGE CALCULATION TESTS
// ============================================================================

describe('Damage Calculation', () => {
  let attacker: AgentState;
  let defender: AgentState;
  let state: CombatState;
  
  beforeEach(() => {
    state = initializeCombatState(['attacker', 'defender'], DEFAULT_COMBAT_CONFIG);
    attacker = state.agents.get('attacker')!;
    defender = state.agents.get('defender')!;
    
    // Place in same zone for range
    attacker.zone = 'CENTER';
    defender.zone = 'NORTH';
  });
  
  it('should calculate STRIKE damage within expected range', () => {
    const rng = createSeededRng(12345);
    const result = calculateDamage('STRIKE', attacker, defender, 'NONE', state, DEFAULT_COMBAT_CONFIG, rng);
    
    expect(result.damage).toBeGreaterThanOrEqual(0.01);
    expect(result.damage).toBeLessThanOrEqual(0.03);
    expect(result.evaded).toBe(false);
  });
  
  it('should apply CENTER zone damage bonus', () => {
    const rngValue = 0.5; // Mid-range
    const rng = () => rngValue;
    
    const result = calculateDamage('STRIKE', attacker, defender, 'NONE', state, DEFAULT_COMBAT_CONFIG, rng);
    
    // Center bonus should apply
    expect(result.damage).toBeGreaterThan(0.02); // Base mid-range damage
  });
  
  it('should reduce damage by 50% on COUNTER', () => {
    const rng = () => 0.5;
    
    const normalResult = calculateDamage('STRIKE', attacker, defender, 'NONE', state, DEFAULT_COMBAT_CONFIG, rng);
    const counterResult = calculateDamage('STRIKE', attacker, defender, 'COUNTER', state, DEFAULT_COMBAT_CONFIG, rng);
    
    expect(counterResult.damage).toBe(normalResult.damage * 0.5);
    expect(counterResult.countered).toBe(true);
    expect(counterResult.reflectDamage).toBe(0.01);
  });
  
  it('should evade with 40% chance on EVADE', () => {
    let evadeCount = 0;
    const trials = 1000;
    
    for (let i = 0; i < trials; i++) {
      const result = calculateDamage('STRIKE', attacker, defender, 'EVADE', state, DEFAULT_COMBAT_CONFIG);
      if (result.evaded) evadeCount++;
    }
    
    const evadeRate = evadeCount / trials;
    expect(evadeRate).toBeGreaterThan(0.35);
    expect(evadeRate).toBeLessThan(0.45);
  });
  
  it('should calculate EXECUTE correctly', () => {
    const killResult = calculateExecuteDamage(0.03, DEFAULT_COMBAT_CONFIG);
    expect(killResult.isKill).toBe(true);
    expect(killResult.damage).toBe(0.03);
    
    const failResult = calculateExecuteDamage(0.08, DEFAULT_COMBAT_CONFIG);
    expect(failResult.isKill).toBe(false);
    expect(failResult.damage).toBe(0.02);
  });
  
  it('should check range correctly', () => {
    expect(isInRange('CENTER', 'NORTH')).toBe(true);
    expect(isInRange('NORTH', 'CENTER')).toBe(true);
    expect(isInRange('NORTH', 'SOUTH')).toBe(false);
    expect(isInRange('EAST', 'WEST')).toBe(false);
  });
  
  it('should calculate SOL transfer correctly on kill', () => {
    const result = calculateSolTransfer(0.1);
    
    expect(result.toKiller).toBe(0.08);
    expect(result.toPrizePool).toBe(0.02);
  });
});

// ============================================================================
// ACTION VALIDATION TESTS
// ============================================================================

describe('Action Validation', () => {
  let state: CombatState;
  
  beforeEach(() => {
    state = initializeCombatState(['agent1', 'agent2'], DEFAULT_COMBAT_CONFIG);
    
    // Place in same zone
    state.agents.get('agent1')!.zone = 'CENTER';
    state.agents.get('agent2')!.zone = 'NORTH';
  });
  
  it('should validate STRIKE action correctly', () => {
    const submission: ActionSubmission = {
      agentId: 'agent1',
      declaration: {
        action: 'STRIKE',
        target: 'agent2',
        reaction: 'NONE',
      },
      submittedAt: Date.now(),
    };
    
    const result = validateAction(submission, state, DEFAULT_COMBAT_CONFIG);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  it('should reject action without required target', () => {
    const submission: ActionSubmission = {
      agentId: 'agent1',
      declaration: {
        action: 'STRIKE',
        reaction: 'NONE',
      },
      submittedAt: Date.now(),
    };
    
    const result = validateAction(submission, state, DEFAULT_COMBAT_CONFIG);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Action requires target');
  });
  
  it('should reject action against dead target', () => {
    state.agents.set('agent2', { ...state.agents.get('agent2')!, isAlive: false, sol: 0 });
    
    const submission: ActionSubmission = {
      agentId: 'agent1',
      declaration: {
        action: 'STRIKE',
        target: 'agent2',
        reaction: 'NONE',
      },
      submittedAt: Date.now(),
    };
    
    const result = validateAction(submission, state, DEFAULT_COMBAT_CONFIG);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Target is dead');
  });
  
  it('should reject action when agent is stunned', () => {
    const agent = state.agents.get('agent1')!;
    state.agents.set('agent1', applyStatusEffect(agent, 'STUNNED', 1));
    
    const submission: ActionSubmission = {
      agentId: 'agent1',
      declaration: {
        action: 'STRIKE',
        target: 'agent2',
        reaction: 'NONE',
      },
      submittedAt: Date.now(),
    };
    
    const result = validateAction(submission, state, DEFAULT_COMBAT_CONFIG);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Agent is stunned');
  });
  
  it('should reject action when on cooldown', () => {
    const agent = state.agents.get('agent1')!;
    agent.cooldowns.set('HEAVY_ASSAULT', 2);
    
    const submission: ActionSubmission = {
      agentId: 'agent1',
      declaration: {
        action: 'HEAVY_ASSAULT',
        target: 'agent2',
        reaction: 'NONE',
      },
      submittedAt: Date.now(),
    };
    
    const result = validateAction(submission, state, DEFAULT_COMBAT_CONFIG);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('cooldown'))).toBe(true);
  });
  
  it('should reject action when insufficient SOL', () => {
    const agent = state.agents.get('agent1')!;
    state.agents.set('agent1', updateAgentSol(agent, -0.099)); // Leave only 0.001 SOL
    
    const submission: ActionSubmission = {
      agentId: 'agent1',
      declaration: {
        action: 'EXECUTE', // Costs 0.01 SOL
        target: 'agent2',
        reaction: 'NONE',
      },
      submittedAt: Date.now(),
    };
    
    const result = validateAction(submission, state, DEFAULT_COMBAT_CONFIG);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Insufficient SOL'))).toBe(true);
  });
});

// ============================================================================
// ACTION RESOLUTION TESTS
// ============================================================================

describe('Action Resolution', () => {
  let state: CombatState;
  
  beforeEach(() => {
    state = initializeCombatState(['agent1', 'agent2'], DEFAULT_COMBAT_CONFIG);
    state.agents.get('agent1')!.zone = 'CENTER';
    state.agents.get('agent2')!.zone = 'NORTH';
  });
  
  it('should resolve STRIKE action and deal damage', () => {
    const submission: ActionSubmission = {
      agentId: 'agent1',
      declaration: {
        action: 'STRIKE',
        target: 'agent2',
        reaction: 'NONE',
      },
      submittedAt: Date.now(),
    };
    
    const rng = () => 0.5;
    const { result, updatedState } = resolveAction(submission, state, DEFAULT_COMBAT_CONFIG, rng);
    
    expect(result.success).toBe(true);
    expect(result.effects.damageDealt).toBeGreaterThan(0);
    
    const target = updatedState.agents.get('agent2')!;
    expect(target.sol).toBeLessThan(0.1);
  });
  
  it('should resolve FORTIFY and apply status', () => {
    const submission: ActionSubmission = {
      agentId: 'agent1',
      declaration: {
        action: 'FORTIFY',
        reaction: 'NONE',
      },
      submittedAt: Date.now(),
    };
    
    const { result, updatedState } = resolveAction(submission, state, DEFAULT_COMBAT_CONFIG);
    
    expect(result.success).toBe(true);
    expect(result.effects.statusApplied).toBe('FORTIFIED');
    
    const agent = updatedState.agents.get('agent1')!;
    expect(hasStatusEffect(agent, 'FORTIFIED')).toBe(true);
  });
  
  it('should resolve REPOSITION and move agent', () => {
    const submission: ActionSubmission = {
      agentId: 'agent1',
      declaration: {
        action: 'REPOSITION',
        targetZone: 'EAST',
        reaction: 'NONE',
      },
      submittedAt: Date.now(),
    };
    
    const { result, updatedState } = resolveAction(submission, state, DEFAULT_COMBAT_CONFIG);
    
    expect(result.success).toBe(true);
    expect(result.effects.moved).toBe(true);
    
    const agent = updatedState.agents.get('agent1')!;
    expect(agent.zone).toBe('EAST');
  });
  
  it('should deduct action cost from agent SOL', () => {
    const initialSol = state.agents.get('agent1')!.sol;
    
    const submission: ActionSubmission = {
      agentId: 'agent1',
      declaration: {
        action: 'STRIKE',
        target: 'agent2',
        reaction: 'NONE',
      },
      submittedAt: Date.now(),
    };
    
    const { result, updatedState } = resolveAction(submission, state, DEFAULT_COMBAT_CONFIG);
    
    const agent = updatedState.agents.get('agent1')!;
    expect(agent.sol).toBe(initialSol - 0.001); // STRIKE costs 0.001
  });
});

// ============================================================================
// SIMULATOR TESTS
// ============================================================================

describe('Combat Simulator', () => {
  it('should run a complete match to completion', () => {
    const strategies = new Map([
      ['agent1', aggressiveStrategy],
      ['agent2', defensiveStrategy],
    ]);
    
    const simulator = new CombatSimulator(
      ['agent1', 'agent2'],
      strategies,
      DEFAULT_COMBAT_CONFIG,
      12345 // Seeded for determinism
    );
    
    const result = simulator.runMatch();
    
    expect(result.winnerId).toBeDefined();
    expect(result.duration).toBeGreaterThan(0);
    expect(result.finalStandings).toHaveLength(2);
    expect(result.endReason).toBe('LAST_STANDING');
  });
  
  it('should track kills and damage correctly', () => {
    const strategies = new Map([
      ['agent1', aggressiveStrategy],
      ['agent2', aggressiveStrategy],
      ['agent3', aggressiveStrategy],
    ]);
    
    const simulator = new CombatSimulator(
      ['agent1', 'agent2', 'agent3'],
      strategies,
      DEFAULT_COMBAT_CONFIG,
      54321
    );
    
    const result = simulator.runMatch();
    
    const winner = result.finalStandings.find(s => s.placement === 1)!;
    expect(winner.kills).toBeGreaterThan(0);
    expect(winner.damageDealt).toBeGreaterThan(0);
  });
  
  it('should respect max rounds limit', () => {
    const waitStrategy = () => ({ action: 'WAIT' as PrimaryAction, reaction: 'NONE' as ReactionAction });
    
    const strategies = new Map([
      ['agent1', waitStrategy],
      ['agent2', waitStrategy],
    ]);
    
    const shortConfig = {
      ...DEFAULT_COMBAT_CONFIG,
      maxRounds: 10,
    };
    
    const simulator = new CombatSimulator(
      ['agent1', 'agent2'],
      strategies,
      shortConfig,
      99999
    );
    
    const result = simulator.runMatch();
    
    expect(result.duration).toBeLessThanOrEqual(10);
    expect(result.endReason).toBe('ROUND_LIMIT');
  });
});

// ============================================================================
// DETERMINISM TESTS
// ============================================================================

describe('Combat Determinism', () => {
  it('should produce identical results with same seed', () => {
    const seed = 42;
    
    const strategies = new Map([
      ['agent1', aggressiveStrategy],
      ['agent2', defensiveStrategy],
    ]);
    
    const sim1 = new CombatSimulator(['agent1', 'agent2'], strategies, DEFAULT_COMBAT_CONFIG, seed);
    const result1 = sim1.runMatch();
    
    const sim2 = new CombatSimulator(['agent1', 'agent2'], strategies, DEFAULT_COMBAT_CONFIG, seed);
    const result2 = sim2.runMatch();
    
    expect(result1.winnerId).toBe(result2.winnerId);
    expect(result1.duration).toBe(result2.duration);
    expect(result1.finalStandings[0].finalSol).toBe(result2.finalStandings[0].finalSol);
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Combat Performance', () => {
  it('should resolve rounds in under 100ms', () => {
    const strategies = new Map([
      ['agent1', aggressiveStrategy],
      ['agent2', aggressiveStrategy],
      ['agent3', aggressiveStrategy],
      ['agent4', aggressiveStrategy],
    ]);
    
    const simulator = new CombatSimulator(
      ['agent1', 'agent2', 'agent3', 'agent4'],
      strategies,
      DEFAULT_COMBAT_CONFIG,
      777
    );
    
    const start = Date.now();
    simulator.runRound();
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100);
  });
  
  it('should complete 16-player match in reasonable time', () => {
    const agentIds = Array.from({ length: 16 }, (_, i) => `agent${i + 1}`);
    const strategies = new Map(
      agentIds.map((id, i) => [
        id,
        i % 2 === 0 ? aggressiveStrategy : defensiveStrategy,
      ])
    );
    
    const simulator = new CombatSimulator(
      agentIds,
      strategies,
      DEFAULT_COMBAT_CONFIG,
      888
    );
    
    const start = Date.now();
    const result = simulator.runMatch();
    const duration = Date.now() - start;
    
    console.log(`16-player match completed in ${duration}ms (${result.duration} rounds)`);
    
    expect(duration).toBeLessThan(5000); // 5 seconds max
  });
});
