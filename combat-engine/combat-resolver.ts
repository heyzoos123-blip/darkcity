/**
 * DARKCITY COMBAT ENGINE - COMBAT RESOLVER
 * Main combat logic: action validation, resolution, and orchestration
 */

import {
  CombatState,
  AgentState,
  ActionSubmission,
  ActionResult,
  CombatConfig,
  PrimaryAction,
  ReactionAction,
  AgentIntel,
  ValidationError,
  CombatError,
  Zone,
} from './types';

import {
  ACTION_PROPERTIES,
  isOnCooldown,
  canAffordAction,
  calculateActionCost,
} from './actions';

import {
  calculateDamage,
  calculateExecuteDamage,
  calculateDrainDamage,
  calculateSolTransfer,
  isInRange,
  isAdjacentZone,
  roundSol,
  clampSol,
} from './damage';

import {
  updateAgentSol,
  moveAgent,
  recordAction,
  setActionCooldown,
  applyStatusEffect,
  hasStatusEffect,
  logAction,
} from './combat-state';

// ============================================================================
// ACTION VALIDATION
// ============================================================================

/**
 * Validate action submission
 */
export function validateAction(
  submission: ActionSubmission,
  state: CombatState,
  config: CombatConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const { agentId, declaration } = submission;
  
  // Check agent exists and is alive
  const agent = state.agents.get(agentId);
  if (!agent) {
    errors.push('Agent not found');
    return { valid: false, errors };
  }
  
  if (!agent.isAlive) {
    errors.push('Agent is dead');
    return { valid: false, errors };
  }
  
  // Check if stunned
  if (hasStatusEffect(agent, 'STUNNED')) {
    errors.push('Agent is stunned');
    return { valid: false, errors };
  }
  
  const { action, target, targetZone, reaction } = declaration;
  const actionProps = ACTION_PROPERTIES[action];
  
  // Check cooldown
  if (isOnCooldown(action, agent.cooldowns)) {
    const remaining = agent.cooldowns.get(action) ?? 0;
    errors.push(`Action on cooldown (${remaining} rounds remaining)`);
  }
  
  // Check SOL affordability
  const isIntimidated = hasStatusEffect(agent, 'INTIMIDATED');
  if (!canAffordAction(agent.sol, action, reaction, config)) {
    const cost = calculateActionCost(action, reaction, config, isIntimidated);
    errors.push(`Insufficient SOL (need ${cost}, have ${agent.sol})`);
  }
  
  // Check target requirement
  if (actionProps.requiresTarget && !target) {
    errors.push('Action requires target');
  }
  
  // Check zone requirement
  if (actionProps.requiresZone && !targetZone) {
    errors.push('Action requires target zone');
  }
  
  // Validate target exists and is alive
  if (target) {
    const targetAgent = state.agents.get(target);
    if (!targetAgent) {
      errors.push('Target not found');
    } else if (!targetAgent.isAlive) {
      errors.push('Target is dead');
    } else if (actionProps.offensive && !isInRange(agent.zone, targetAgent.zone)) {
      errors.push('Target out of range');
    }
  }
  
  // Validate target zone
  if (targetZone) {
    if (!state.activeZones.has(targetZone)) {
      errors.push('Target zone has collapsed');
    } else if (!isAdjacentZone(agent.zone, targetZone)) {
      errors.push('Target zone not adjacent');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// ACTION RESOLUTION
// ============================================================================

/**
 * Resolve single action
 */
export function resolveAction(
  submission: ActionSubmission,
  state: CombatState,
  config: CombatConfig,
  rng: () => number = Math.random
): {
  result: ActionResult;
  updatedState: CombatState;
} {
  const { agentId, declaration } = submission;
  const { action, target, targetZone, reaction } = declaration;
  
  // Validate
  const validation = validateAction(submission, state, config);
  if (!validation.valid) {
    return {
      result: {
        agentId,
        action,
        success: false,
        solCost: 0,
        effects: {},
        errors: validation.errors,
      },
      updatedState: state,
    };
  }
  
  let updatedState = state;
  let agent = state.agents.get(agentId)!;
  
  // Calculate and deduct action cost
  const isIntimidated = hasStatusEffect(agent, 'INTIMIDATED');
  const actionCost = calculateActionCost(action, reaction, config, isIntimidated);
  agent = updateAgentSol(agent, -actionCost);
  
  // Record action in history
  agent = recordAction(agent, action);
  
  // Set cooldown if applicable
  const cooldown = ACTION_PROPERTIES[action].cost.cooldown;
  if (cooldown) {
    agent = setActionCooldown(agent, action, cooldown);
  }
  
  // Initialize result
  const result: ActionResult = {
    agentId,
    action,
    success: true,
    solCost: actionCost,
    effects: {},
    errors: [],
  };
  
  // Resolve specific actions
  switch (action) {
    case 'STRIKE':
    case 'HEAVY_ASSAULT': {
      const targetAgent = state.agents.get(target!)!;
      const targetReaction = getTargetReaction(target!, state);
      
      const damageResult = calculateDamage(
        action,
        agent,
        targetAgent,
        targetReaction,
        updatedState,
        config,
        rng
      );
      
      if (damageResult.evaded) {
        result.effects.targetId = target;
        updatedState = logAction(updatedState, {
          round: state.round,
          type: 'ACTION',
          agentId,
          targetId: target,
          action,
          message: `${agentId} ${action} missed - ${target} EVADED!`,
        });
      } else {
        // Apply damage to target
        let updatedTarget = updateAgentSol(targetAgent, -damageResult.damage);
        updatedState.agents.set(target!, updatedTarget);
        
        result.effects.targetId = target;
        result.effects.damageDealt = damageResult.damage;
        
        // Counter reflection damage
        if (damageResult.countered && damageResult.reflectDamage > 0) {
          agent = updateAgentSol(agent, -damageResult.reflectDamage);
          result.effects.damageDealt = roundSol(
            result.effects.damageDealt - damageResult.reflectDamage
          );
        }
        
        // Check for kill
        if (!updatedTarget.isAlive) {
          const { toKiller, toPrizePool } = calculateSolTransfer(targetAgent.sol);
          agent = updateAgentSol(agent, toKiller);
          
          updatedState = logAction(updatedState, {
            round: state.round,
            type: 'KILL',
            agentId,
            targetId: target,
            damage: damageResult.damage,
            solTransfer: toKiller,
            message: `${agentId} KILLED ${target} with ${action}! +${toKiller} SOL`,
          });
        } else {
          updatedState = logAction(updatedState, {
            round: state.round,
            type: 'DAMAGE',
            agentId,
            targetId: target,
            action,
            damage: damageResult.damage,
            message: `${agentId} ${action} ${target} for ${damageResult.damage} SOL`,
            metadata: {
              countered: damageResult.countered,
              reflectDamage: damageResult.reflectDamage,
            },
          });
        }
        
        // Heavy Assault stun on counter/miss
        if (action === 'HEAVY_ASSAULT' && damageResult.countered) {
          agent = applyStatusEffect(agent, 'STUNNED', 1);
          result.effects.stunned = true;
          
          updatedState = logAction(updatedState, {
            round: state.round,
            type: 'STATUS',
            agentId,
            message: `${agentId} is STUNNED from countered HEAVY_ASSAULT!`,
          });
        }
      }
      break;
    }
    
    case 'DRAIN': {
      const targetAgent = state.agents.get(target!)!;
      const drainAmount = calculateDrainDamage(config);
      
      const updatedTarget = updateAgentSol(targetAgent, -drainAmount);
      updatedState.agents.set(target!, updatedTarget);
      
      result.effects.targetId = target;
      result.effects.solDrained = drainAmount;
      
      updatedState = logAction(updatedState, {
        round: state.round,
        type: 'ACTION',
        agentId,
        targetId: target,
        action,
        damage: drainAmount,
        message: `${agentId} DRAINED ${drainAmount} SOL from ${target} (destroyed)`,
      });
      
      // Check for kill
      if (!updatedTarget.isAlive) {
        updatedState = logAction(updatedState, {
          round: state.round,
          type: 'KILL',
          agentId,
          targetId: target,
          message: `${target} died from DRAIN`,
        });
      }
      break;
    }
    
    case 'EXECUTE': {
      const targetAgent = state.agents.get(target!)!;
      const executeResult = calculateExecuteDamage(targetAgent.sol, config);
      
      const updatedTarget = updateAgentSol(targetAgent, -executeResult.damage);
      updatedState.agents.set(target!, updatedTarget);
      
      result.effects.targetId = target;
      result.effects.damageDealt = executeResult.damage;
      
      if (executeResult.isKill) {
        const { toKiller, toPrizePool } = calculateSolTransfer(targetAgent.sol);
        agent = updateAgentSol(agent, toKiller);
        
        updatedState = logAction(updatedState, {
          round: state.round,
          type: 'KILL',
          agentId,
          targetId: target,
          action,
          damage: executeResult.damage,
          solTransfer: toKiller,
          message: `${agentId} EXECUTED ${target}! +${toKiller} SOL`,
        });
      } else {
        updatedState = logAction(updatedState, {
          round: state.round,
          type: 'DAMAGE',
          agentId,
          targetId: target,
          action,
          damage: executeResult.damage,
          message: `${agentId} EXECUTE failed on ${target} (>${config.damageValues.execute.kill} SOL)`,
        });
      }
      break;
    }
    
    case 'SCAN': {
      const targetAgent = state.agents.get(target!)!;
      
      // Apply scanned status to target
      const updatedTarget = applyStatusEffect(targetAgent, 'SCANNED', 2, agentId);
      updatedState.agents.set(target!, updatedTarget);
      
      // Grant intel to agent
      const intel: AgentIntel = {
        agentId: target!,
        sol: targetAgent.sol,
        zone: targetAgent.zone,
        lastActions: targetAgent.actionHistory.slice(0, 2),
        cooldowns: new Map(targetAgent.cooldowns),
      };
      
      result.effects.targetId = target;
      result.effects.intelGained = intel;
      
      updatedState = logAction(updatedState, {
        round: state.round,
        type: 'ACTION',
        agentId,
        targetId: target,
        action,
        message: `${agentId} SCANNED ${target}`,
      });
      break;
    }
    
    case 'REPOSITION': {
      agent = moveAgent(agent, targetZone!);
      result.effects.moved = true;
      
      updatedState = logAction(updatedState, {
        round: state.round,
        type: 'ACTION',
        agentId,
        action,
        message: `${agentId} moved to ${targetZone}`,
        metadata: { zone: targetZone },
      });
      break;
    }
    
    case 'FORTIFY': {
      agent = applyStatusEffect(agent, 'FORTIFIED', 1);
      result.effects.statusApplied = 'FORTIFIED';
      
      updatedState = logAction(updatedState, {
        round: state.round,
        type: 'ACTION',
        agentId,
        action,
        message: `${agentId} FORTIFIED (+50% defense)`,
      });
      break;
    }
    
    case 'WAIT': {
      updatedState = logAction(updatedState, {
        round: state.round,
        type: 'ACTION',
        agentId,
        action,
        message: `${agentId} waits`,
      });
      break;
    }
  }
  
  // Update agent in state
  updatedState.agents.set(agentId, agent);
  
  return { result, updatedState };
}

/**
 * Resolve all actions for a round
 */
export function resolveRound(
  submissions: ActionSubmission[],
  state: CombatState,
  config: CombatConfig,
  rng: () => number = Math.random
): {
  results: ActionResult[];
  updatedState: CombatState;
} {
  // Sort submissions by timestamp (priority)
  const sorted = [...submissions].sort(
    (a, b) => a.submittedAt - b.submittedAt
  );
  
  let updatedState = state;
  const results: ActionResult[] = [];
  
  // Resolve each action sequentially
  for (const submission of sorted) {
    const { result, updatedState: newState } = resolveAction(
      submission,
      updatedState,
      config,
      rng
    );
    
    results.push(result);
    updatedState = newState;
  }
  
  return { results, updatedState };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get target's declared reaction (from submissions)
 */
function getTargetReaction(
  targetId: string,
  state: CombatState
): ReactionAction {
  // In real implementation, this would come from the target's submission
  // For now, default to NONE
  return 'NONE';
}

/**
 * Create deterministic RNG from seed
 */
export function createSeededRng(seed: number): () => number {
  let state = seed;
  
  return function () {
    // Simple LCG (Linear Congruential Generator)
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}
