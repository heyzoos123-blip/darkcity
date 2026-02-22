/**
 * DARKCITY API ROUTES - BATTLE SERVER INTEGRATION
 * Express route handlers that connect agent API to battle server
 */

import { Request, Response } from 'express';
import { getBattleServer } from './battle-server';
import { PrimaryAction, ReactionAction, Zone } from '../combat-engine/types';

// Get battle server singleton
const battleServer = getBattleServer();

// ============================================================================
// TYPES
// ============================================================================

interface AuthRequest extends Request {
  walletAddress?: string;
  agentId?: string;
}

// ============================================================================
// MATCHMAKING ROUTES
// ============================================================================

/**
 * POST /api/matchmaking/join
 * Join matchmaking queue for a tier
 */
export async function joinMatchmaking(req: AuthRequest, res: Response) {
  try {
    const { tier = 'BLOOD', characterClass } = req.body;
    const agentId = req.agentId!;
    const walletAddress = req.walletAddress!;

    // Validate character class
    if (!characterClass) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Missing characterClass',
        code: 'MISSING_CHARACTER_CLASS',
      });
      return;
    }

    const result = battleServer.joinQueue(
      agentId,
      walletAddress,
      characterClass,
      tier
    );

    if (result.success) {
      res.json({
        message: result.message,
        tier,
        position: result.position,
      });
    } else {
      res.status(409).json({
        error: 'Queue Error',
        message: result.message,
        code: 'QUEUE_JOIN_FAILED',
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to join matchmaking',
      code: 'MATCHMAKING_ERROR',
    });
  }
}

/**
 * POST /api/matchmaking/leave
 * Leave matchmaking queue
 */
export async function leaveMatchmaking(req: AuthRequest, res: Response) {
  try {
    const agentId = req.agentId!;

    const result = battleServer.leaveQueue(agentId);

    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(404).json({
        error: 'Queue Error',
        message: result.message,
        code: 'NOT_IN_QUEUE',
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to leave matchmaking',
      code: 'MATCHMAKING_ERROR',
    });
  }
}

/**
 * GET /api/matchmaking/status/:tier
 * Get queue status for a tier
 */
export async function getQueueStatus(req: AuthRequest, res: Response) {
  try {
    const { tier } = req.params;

    const queue = battleServer.getQueueStatus(tier);

    res.json({
      tier,
      queuedAgents: queue.length,
      estimatedWaitTime: calculateEstimatedWait(queue.length),
      agents: queue.map((agent) => ({
        agentId: agent.agentId,
        characterClass: agent.characterClass,
        joinedAt: agent.joinedAt,
      })),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch queue status',
      code: 'QUEUE_STATUS_ERROR',
    });
  }
}

// ============================================================================
// BATTLE ROUTES
// ============================================================================

/**
 * POST /api/battle/action
 * Submit combat action for current battle
 */
export async function submitBattleAction(req: AuthRequest, res: Response) {
  try {
    const agentId = req.agentId!;
    const {
      action,
      reaction = 'NONE',
      targetId,
      targetZone,
    } = req.body;

    // Validate action
    if (!action || !isPrimaryAction(action)) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid or missing action',
        code: 'INVALID_ACTION',
      });
      return;
    }

    // Validate reaction
    if (!isReactionAction(reaction)) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid reaction',
        code: 'INVALID_REACTION',
      });
      return;
    }

    const result = battleServer.submitAction(
      agentId,
      action as PrimaryAction,
      reaction as ReactionAction,
      targetId,
      targetZone as Zone
    );

    if (result.success) {
      res.json({
        message: result.message,
        action,
        reaction,
      });
    } else {
      res.status(400).json({
        error: 'Action Error',
        message: result.message,
        code: 'ACTION_SUBMIT_FAILED',
        errors: result.errors,
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to submit action',
      code: 'ACTION_ERROR',
    });
  }
}

/**
 * GET /api/battle/current
 * Get current battle state for agent
 */
export async function getCurrentBattle(req: AuthRequest, res: Response) {
  try {
    const agentId = req.agentId!;

    const battle = battleServer.getBattleForAgent(agentId);

    if (!battle) {
      res.status(404).json({
        error: 'Not Found',
        message: 'No active battle',
        code: 'NO_BATTLE',
      });
      return;
    }

    // Return sanitized battle state (hide other players' submissions)
    const agentState = battle.state.agents.get(agentId);
    const participant = battle.participants.get(agentId);

    res.json({
      battleId: battle.battleId,
      status: battle.status,
      round: battle.state.round,
      roundDeadline: battle.roundDeadline,
      tier: battle.tier,
      prizePool: battle.prizePool,
      
      // Agent's own state
      agent: {
        id: agentId,
        sol: agentState?.sol,
        zone: agentState?.zone,
        isAlive: agentState?.isAlive,
        statusEffects: agentState?.statusEffects,
        cooldowns: Array.from(agentState?.cooldowns.entries() ?? []),
        stats: participant,
      },
      
      // All agents (public info)
      agents: Array.from(battle.state.agents.values()).map((agent) => ({
        id: agent.id,
        sol: agent.sol,
        zone: agent.zone,
        isAlive: agent.isAlive,
        statusEffects: agent.statusEffects,
        characterClass: battle.participants.get(agent.id)?.characterClass,
      })),
      
      // Zone info
      activeZones: Array.from(battle.state.activeZones),
      nextCollapseZone: battle.state.nextCollapseZone,
      collapseIn: battle.state.collapseIn,
      
      // Recent combat log
      recentLog: battle.state.combatLog.slice(-20),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch battle state',
      code: 'BATTLE_STATE_ERROR',
    });
  }
}

/**
 * GET /api/battle/:id
 * Get battle state by ID (spectator view)
 */
export async function getBattleById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const battle = battleServer.getBattle(id);

    if (!battle) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Battle not found',
        code: 'BATTLE_NOT_FOUND',
      });
      return;
    }

    // Return full battle state (spectator view)
    res.json({
      battleId: battle.battleId,
      status: battle.status,
      round: battle.state.round,
      roundDeadline: battle.roundDeadline,
      tier: battle.tier,
      prizePool: battle.prizePool,
      startedAt: battle.startedAt,
      completedAt: battle.completedAt,
      winner: battle.winner,
      
      agents: Array.from(battle.state.agents.values()).map((agent) => ({
        id: agent.id,
        sol: agent.sol,
        zone: agent.zone,
        isAlive: agent.isAlive,
        statusEffects: agent.statusEffects,
        characterClass: battle.participants.get(agent.id)?.characterClass,
        stats: battle.participants.get(agent.id),
      })),
      
      activeZones: Array.from(battle.state.activeZones),
      nextCollapseZone: battle.state.nextCollapseZone,
      collapseIn: battle.state.collapseIn,
      
      combatLog: battle.state.combatLog,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch battle',
      code: 'BATTLE_FETCH_ERROR',
    });
  }
}

/**
 * GET /api/battles/active
 * Get all active battles
 */
export async function getActiveBattles(req: AuthRequest, res: Response) {
  try {
    const battles = battleServer.getActiveBattles();

    res.json({
      count: battles.length,
      battles: battles.map((battle) => ({
        battleId: battle.battleId,
        tier: battle.tier,
        status: battle.status,
        round: battle.state.round,
        participantCount: battle.participants.size,
        livingAgents: Array.from(battle.state.agents.values()).filter(
          (a) => a.isAlive
        ).length,
        prizePool: battle.prizePool,
        startedAt: battle.startedAt,
      })),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch active battles',
      code: 'BATTLES_FETCH_ERROR',
    });
  }
}

// ============================================================================
// STATS ROUTES
// ============================================================================

/**
 * GET /api/stats
 * Get server statistics
 */
export async function getServerStats(req: Request, res: Response) {
  try {
    const stats = battleServer.getStats();

    res.json({
      ...stats,
      uptime: process.uptime(),
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch stats',
      code: 'STATS_ERROR',
    });
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate estimated wait time based on queue length
 */
function calculateEstimatedWait(queueLength: number): number {
  // Rough estimate: battles start every 30 seconds with 2-8 players
  const averageBatchSize = 4;
  const matchmakingInterval = 30; // seconds

  const batchesAhead = Math.ceil(queueLength / averageBatchSize);
  return batchesAhead * matchmakingInterval * 1000; // milliseconds
}

/**
 * Type guard for PrimaryAction
 */
function isPrimaryAction(value: any): value is PrimaryAction {
  const validActions: PrimaryAction[] = [
    'STRIKE',
    'HEAVY_ASSAULT',
    'REPOSITION',
    'FORTIFY',
    'DRAIN',
    'SCAN',
    'EXECUTE',
    'WAIT',
  ];
  return validActions.includes(value);
}

/**
 * Type guard for ReactionAction
 */
function isReactionAction(value: any): value is ReactionAction {
  const validReactions: ReactionAction[] = ['COUNTER', 'EVADE', 'INTIMIDATE', 'NONE'];
  return validReactions.includes(value);
}
