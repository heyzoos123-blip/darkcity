/**
 * DARKCITY BATTLE SERVER
 * Integration layer connecting combat engine + agent API + matchmaking
 * 
 * Features:
 * - FIFO matchmaking queue
 * - Battle initialization with character classes → zone-based combat
 * - Turn-based action processing
 * - Real-time WebSocket broadcasts
 * - SOL payout distribution
 */

import { EventEmitter } from 'events';
import {
  CombatState,
  AgentState,
  ActionSubmission,
  ActionResult,
  CombatConfig,
  PrimaryAction,
  ReactionAction,
  Zone,
  MatchResult,
  CombatLogEntry,
} from '../combat-engine/types';

import {
  initializeCombatState,
  advanceRound,
  getLivingAgents,
  isMatchOver,
  getWinner,
  getFinalStandings,
} from '../combat-engine/combat-state';

import {
  validateAction,
  resolveRound,
  createSeededRng,
} from '../combat-engine/combat-resolver';

import {
  DEFAULT_COMBAT_CONFIG,
  TIER_CONFIGS,
  TierConfig,
} from '../combat-engine/actions';

// Import WebSocket broadcast function from API
import { broadcastBattleEvent } from '../api/agent-api';

// ============================================================================
// TYPES
// ============================================================================

interface QueuedAgent {
  agentId: string;
  walletAddress: string;
  characterClass: string; // From API registration
  joinedAt: number;
  tier: string;
}

interface BattleInstance {
  battleId: string;
  tier: string;
  config: CombatConfig;
  state: CombatState;
  participants: Map<string, ParticipantInfo>;
  submissions: Map<string, ActionSubmission>;
  status: 'initializing' | 'active' | 'completed';
  roundDeadline: number | null;
  startedAt: number;
  completedAt: number | null;
  winner: string | null;
  prizePool: number;
}

interface ParticipantInfo {
  agentId: string;
  walletAddress: string;
  characterClass: string;
  isAlive: boolean;
  kills: number;
  damageDealt: number;
  damageTaken: number;
  actionsUsed: Record<PrimaryAction, number>;
}

interface BattleStats {
  totalBattles: number;
  activeBattles: number;
  queuedAgents: number;
  completedBattles: number;
}

// ============================================================================
// BATTLE SERVER
// ============================================================================

export class BattleServer extends EventEmitter {
  // Matchmaking queues (one per tier)
  private queues: Map<string, QueuedAgent[]> = new Map();
  
  // Active battles
  private battles: Map<string, BattleInstance> = new Map();
  
  // Agent → Battle mapping
  private agentBattles: Map<string, string> = new Map();
  
  // Configuration
  private turnDuration: number = 30_000; // 30 seconds per turn
  private minPlayersPerBattle: number = 2;
  private maxPlayersPerBattle: number = 8;
  
  // Stats
  private stats = {
    totalBattles: 0,
    completedBattles: 0,
  };

  constructor() {
    super();
    
    // Initialize queues for each tier
    for (const tier of Object.keys(TIER_CONFIGS)) {
      this.queues.set(tier, []);
    }
    
    // Start matchmaking ticker
    this.startMatchmakingTicker();
  }

  // ==========================================================================
  // MATCHMAKING
  // ==========================================================================

  /**
   * Add agent to matchmaking queue
   */
  public joinQueue(
    agentId: string,
    walletAddress: string,
    characterClass: string,
    tier: string = 'BLOOD'
  ): { success: boolean; message: string; position?: number } {
    // Validate tier exists
    if (!TIER_CONFIGS[tier]) {
      return { success: false, message: `Invalid tier: ${tier}` };
    }

    // Check if agent is already in a battle
    if (this.agentBattles.has(agentId)) {
      const battleId = this.agentBattles.get(agentId)!;
      return { success: false, message: `Already in battle ${battleId}` };
    }

    // Check if agent is already queued
    const queue = this.queues.get(tier)!;
    const alreadyQueued = queue.some((q) => q.agentId === agentId);
    if (alreadyQueued) {
      return { success: false, message: 'Already in queue' };
    }

    // Add to queue
    const queuedAgent: QueuedAgent = {
      agentId,
      walletAddress,
      characterClass,
      joinedAt: Date.now(),
      tier,
    };

    queue.push(queuedAgent);
    
    this.emit('agent:queued', { agentId, tier, position: queue.length });

    return {
      success: true,
      message: 'Joined matchmaking queue',
      position: queue.length,
    };
  }

  /**
   * Remove agent from matchmaking queue
   */
  public leaveQueue(agentId: string): { success: boolean; message: string } {
    for (const [tier, queue] of this.queues.entries()) {
      const index = queue.findIndex((q) => q.agentId === agentId);
      if (index !== -1) {
        queue.splice(index, 1);
        this.emit('agent:left_queue', { agentId, tier });
        return { success: true, message: 'Left queue' };
      }
    }

    return { success: false, message: 'Not in queue' };
  }

  /**
   * Matchmaking ticker - runs every 5 seconds to create battles
   */
  private startMatchmakingTicker(): void {
    setInterval(() => {
      this.processMatchmaking();
    }, 5000);
  }

  /**
   * Process matchmaking - create battles from queued agents
   */
  private processMatchmaking(): void {
    for (const [tier, queue] of this.queues.entries()) {
      // Need at least minPlayers to start
      if (queue.length < this.minPlayersPerBattle) {
        continue;
      }

      // Take up to maxPlayers from queue (FIFO)
      const tierConfig = TIER_CONFIGS[tier];
      const batchSize = Math.min(
        queue.length,
        tierConfig.maxPlayers,
        this.maxPlayersPerBattle
      );

      const participants = queue.splice(0, batchSize);

      // Create battle
      this.createBattle(participants, tier);
    }
  }

  // ==========================================================================
  // BATTLE MANAGEMENT
  // ==========================================================================

  /**
   * Create a new battle instance
   */
  private createBattle(participants: QueuedAgent[], tier: string): string {
    const battleId = `battle_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const tierConfig = TIER_CONFIGS[tier];
    const config = tierConfig.combatConfig;

    // Map participants to agent IDs
    const agentIds = participants.map((p) => p.agentId);

    // Initialize combat state
    const state = initializeCombatState(agentIds, config);

    // Create participant info map
    const participantMap = new Map<string, ParticipantInfo>();
    participants.forEach((p) => {
      participantMap.set(p.agentId, {
        agentId: p.agentId,
        walletAddress: p.walletAddress,
        characterClass: p.characterClass,
        isAlive: true,
        kills: 0,
        damageDealt: 0,
        damageTaken: 0,
        actionsUsed: {} as Record<PrimaryAction, number>,
      });
    });

    // Calculate prize pool (80% of total entry SOL)
    const prizePool = config.startingSol * participants.length * 0.8;

    const battle: BattleInstance = {
      battleId,
      tier,
      config,
      state,
      participants: participantMap,
      submissions: new Map(),
      status: 'initializing',
      roundDeadline: null,
      startedAt: Date.now(),
      completedAt: null,
      winner: null,
      prizePool,
    };

    // Store battle
    this.battles.set(battleId, battle);
    this.stats.totalBattles++;

    // Map agents to battle
    agentIds.forEach((agentId) => {
      this.agentBattles.set(agentId, battleId);
    });

    // Emit event
    this.emit('battle:created', {
      battleId,
      tier,
      participants: agentIds,
      prizePool,
    });

    // Broadcast to WebSocket clients
    this.broadcastBattleUpdate(battleId, 'BATTLE_START', {
      message: `Battle ${battleId} started with ${agentIds.length} participants`,
      participants: agentIds,
      tier,
      prizePool,
    });

    // Start battle
    setTimeout(() => this.startBattle(battleId), 3000); // 3 second countdown

    return battleId;
  }

  /**
   * Start a battle (after initialization period)
   */
  private startBattle(battleId: string): void {
    const battle = this.battles.get(battleId);
    if (!battle) return;

    battle.status = 'active';
    battle.roundDeadline = Date.now() + this.turnDuration;

    this.emit('battle:started', { battleId });

    this.broadcastBattleUpdate(battleId, 'ROUND_START', {
      round: battle.state.round,
      deadline: battle.roundDeadline,
      agents: this.getBattleStateForBroadcast(battle),
    });

    // Set timer for round processing
    setTimeout(() => this.processRound(battleId), this.turnDuration);
  }

  /**
   * Submit action for an agent in a battle
   */
  public submitAction(
    agentId: string,
    action: PrimaryAction,
    reaction: ReactionAction,
    targetId?: string,
    targetZone?: Zone
  ): { success: boolean; message: string; errors?: string[] } {
    // Find battle
    const battleId = this.agentBattles.get(agentId);
    if (!battleId) {
      return { success: false, message: 'Not in active battle' };
    }

    const battle = this.battles.get(battleId);
    if (!battle || battle.status !== 'active') {
      return { success: false, message: 'Battle not active' };
    }

    // Check if agent already submitted
    if (battle.submissions.has(agentId)) {
      return { success: false, message: 'Action already submitted for this round' };
    }

    // Validate action
    const submission: ActionSubmission = {
      agentId,
      declaration: {
        action,
        target: targetId,
        targetZone,
        reaction,
      },
      submittedAt: Date.now(),
    };

    const validation = validateAction(submission, battle.state, battle.config);
    if (!validation.valid) {
      return {
        success: false,
        message: 'Invalid action',
        errors: validation.errors,
      };
    }

    // Store submission
    battle.submissions.set(agentId, submission);

    this.emit('action:submitted', { battleId, agentId, action });

    // If all living agents submitted, process round early
    const livingAgents = getLivingAgents(battle.state);
    if (battle.submissions.size === livingAgents.length) {
      clearTimeout(this.getRoundTimeout(battleId));
      setTimeout(() => this.processRound(battleId), 1000); // 1 second grace period
    }

    return { success: true, message: 'Action submitted' };
  }

  /**
   * Process a battle round (resolve all actions)
   */
  private processRound(battleId: string): void {
    const battle = this.battles.get(battleId);
    if (!battle || battle.status !== 'active') return;

    // Collect submissions (use WAIT for agents who didn't submit)
    const submissions: ActionSubmission[] = [];
    const livingAgents = getLivingAgents(battle.state);

    for (const agent of livingAgents) {
      const submission = battle.submissions.get(agent.id);
      if (submission) {
        submissions.push(submission);
      } else {
        // Default to WAIT action
        submissions.push({
          agentId: agent.id,
          declaration: {
            action: 'WAIT',
            reaction: 'NONE',
          },
          submittedAt: Date.now(),
        });
      }
    }

    // Resolve round
    const rng = createSeededRng(Date.now() + battle.state.round);
    const { results, updatedState } = resolveRound(
      submissions,
      battle.state,
      battle.config,
      rng
    );

    // Update battle state
    battle.state = updatedState;

    // Process results and update participant stats
    this.updateBattleStats(battle, results);

    // Broadcast round results
    this.broadcastBattleUpdate(battleId, 'ROUND_COMPLETE', {
      round: battle.state.round,
      results: results.map((r) => ({
        agentId: r.agentId,
        action: r.action,
        success: r.success,
        damage: r.damage,
        effects: r.effects,
      })),
      combatLog: battle.state.combatLog.slice(-10), // Last 10 entries
      agents: this.getBattleStateForBroadcast(battle),
    });

    // Clear submissions for next round
    battle.submissions.clear();

    // Check if battle is over
    if (isMatchOver(battle.state, battle.config.maxRounds)) {
      this.completeBattle(battleId);
      return;
    }

    // Advance to next round
    battle.state = advanceRound(battle.state, battle.config);
    battle.roundDeadline = Date.now() + this.turnDuration;

    this.broadcastBattleUpdate(battleId, 'ROUND_START', {
      round: battle.state.round,
      deadline: battle.roundDeadline,
      agents: this.getBattleStateForBroadcast(battle),
    });

    // Set timer for next round
    setTimeout(() => this.processRound(battleId), this.turnDuration);
  }

  /**
   * Complete a battle and distribute prizes
   */
  private completeBattle(battleId: string): void {
    const battle = this.battles.get(battleId);
    if (!battle) return;

    battle.status = 'completed';
    battle.completedAt = Date.now();
    battle.winner = getWinner(battle.state);

    this.stats.completedBattles++;

    // Calculate final standings
    const standings = getFinalStandings(battle.state);

    // Distribute SOL prizes
    const payouts = this.calculatePayouts(battle, standings);

    // Emit completion event
    this.emit('battle:completed', {
      battleId,
      winner: battle.winner,
      standings,
      payouts,
      duration: battle.completedAt - battle.startedAt,
    });

    // Broadcast final results
    this.broadcastBattleUpdate(battleId, 'BATTLE_END', {
      winner: battle.winner,
      standings: standings.map((s) => ({
        agentId: s.agentId,
        finalSol: s.finalSol,
        isWinner: s.isWinner,
        stats: battle.participants.get(s.agentId),
      })),
      payouts,
      combatLog: battle.state.combatLog,
    });

    // Clean up
    battle.participants.forEach((_, agentId) => {
      this.agentBattles.delete(agentId);
    });

    // Keep battle in memory for history (could be moved to DB)
    // For now, delete after 1 hour
    setTimeout(() => {
      this.battles.delete(battleId);
    }, 3600_000);
  }

  // ==========================================================================
  // STATS & HELPERS
  // ==========================================================================

  /**
   * Update participant stats from action results
   */
  private updateBattleStats(battle: BattleInstance, results: ActionResult[]): void {
    for (const result of results) {
      const participant = battle.participants.get(result.agentId);
      if (!participant) continue;

      // Count actions
      if (!participant.actionsUsed[result.action]) {
        participant.actionsUsed[result.action] = 0;
      }
      participant.actionsUsed[result.action]++;

      // Track damage
      if (result.effects.damageDealt) {
        participant.damageDealt += result.effects.damageDealt;
      }

      // Track kills
      if (result.effects.targetId) {
        const targetAgent = battle.state.agents.get(result.effects.targetId);
        if (targetAgent && !targetAgent.isAlive) {
          participant.kills++;
        }
      }

      // Update alive status
      const agentState = battle.state.agents.get(result.agentId);
      if (agentState) {
        participant.isAlive = agentState.isAlive;
      }
    }
  }

  /**
   * Calculate SOL payouts for battle winners
   */
  private calculatePayouts(
    battle: BattleInstance,
    standings: ReturnType<typeof getFinalStandings>
  ): Map<string, number> {
    const payouts = new Map<string, number>();

    // Winner takes 80% of prize pool
    // 2nd place takes 15%
    // 3rd place takes 5%
    const prizeDistribution = [0.8, 0.15, 0.05];

    standings.forEach((standing, index) => {
      if (index < prizeDistribution.length) {
        const payout = battle.prizePool * prizeDistribution[index];
        payouts.set(standing.agentId, payout);
      }
    });

    return payouts;
  }

  /**
   * Get battle state formatted for broadcast
   */
  private getBattleStateForBroadcast(battle: BattleInstance) {
    const agents: any[] = [];

    battle.state.agents.forEach((agent) => {
      const participant = battle.participants.get(agent.id);
      agents.push({
        id: agent.id,
        sol: agent.sol,
        zone: agent.zone,
        isAlive: agent.isAlive,
        statusEffects: agent.statusEffects,
        characterClass: participant?.characterClass,
        stats: participant,
      });
    });

    return agents;
  }

  /**
   * Broadcast battle event via WebSocket
   */
  private broadcastBattleUpdate(
    battleId: string,
    eventType: string,
    data: any
  ): void {
    try {
      broadcastBattleEvent(battleId, {
        type: eventType,
        data,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error(`Failed to broadcast battle update: ${error}`);
    }
  }

  /**
   * Get round timeout (for clearing)
   */
  private getRoundTimeout(battleId: string): NodeJS.Timeout {
    // Store timeouts in battle metadata if needed
    // For now, this is a placeholder
    return setTimeout(() => {}, 0);
  }

  // ==========================================================================
  // PUBLIC QUERY METHODS
  // ==========================================================================

  /**
   * Get battle state by ID
   */
  public getBattle(battleId: string): BattleInstance | null {
    return this.battles.get(battleId) ?? null;
  }

  /**
   * Get battle for agent
   */
  public getBattleForAgent(agentId: string): BattleInstance | null {
    const battleId = this.agentBattles.get(agentId);
    return battleId ? this.getBattle(battleId) : null;
  }

  /**
   * Get all active battles
   */
  public getActiveBattles(): BattleInstance[] {
    return Array.from(this.battles.values()).filter(
      (b) => b.status === 'active'
    );
  }

  /**
   * Get queue status for tier
   */
  public getQueueStatus(tier: string): QueuedAgent[] {
    return this.queues.get(tier) ?? [];
  }

  /**
   * Get server statistics
   */
  public getStats(): BattleStats {
    return {
      totalBattles: this.stats.totalBattles,
      activeBattles: this.getActiveBattles().length,
      queuedAgents: Array.from(this.queues.values()).reduce(
        (sum, queue) => sum + queue.length,
        0
      ),
      completedBattles: this.stats.completedBattles,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let battleServerInstance: BattleServer | null = null;

export function getBattleServer(): BattleServer {
  if (!battleServerInstance) {
    battleServerInstance = new BattleServer();
    console.log('🔥 DARKCITY Battle Server initialized');
  }
  return battleServerInstance;
}

export default BattleServer;
