/**
 * Quest Service - Core quest management logic
 */
import { nanoid } from 'nanoid';
import { getDatabase } from '../db/database';
import {
  Quest,
  QuestType,
  QuestStatus,
  QuestDifficulty,
  QuestAcceptance,
  QuestBoardFilters,
  QuestRequirements,
  QuestSubmission
} from '../types';

export class QuestService {
  private db = getDatabase();

  /**
   * Create a new quest
   */
  createQuest(quest: Omit<Quest, 'id' | 'currentCompletions'>): Quest {
    const id = nanoid();
    const newQuest: Quest = {
      ...quest,
      id,
      currentCompletions: 0
    };

    const stmt = this.db.prepare(`
      INSERT INTO quests (
        id, type, title, description, difficulty, reward_sol,
        created_by, created_at, expires_at, max_completions,
        current_completions, requirements, metadata, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      newQuest.id,
      newQuest.type,
      newQuest.title,
      newQuest.description,
      newQuest.difficulty,
      newQuest.rewardSol,
      newQuest.createdBy,
      newQuest.createdAt,
      newQuest.expiresAt,
      newQuest.maxCompletions,
      newQuest.currentCompletions,
      JSON.stringify(newQuest.requirements),
      JSON.stringify(newQuest.metadata),
      newQuest.isActive ? 1 : 0
    );

    return newQuest;
  }

  /**
   * Get quest by ID
   */
  getQuest(id: string): Quest | null {
    const stmt = this.db.prepare('SELECT * FROM quests WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.rowToQuest(row) : null;
  }

  /**
   * Browse available quests with filters
   */
  browseQuests(filters: QuestBoardFilters = {}): Quest[] {
    let query = `
      SELECT * FROM quests
      WHERE is_active = 1
      AND (expires_at IS NULL OR expires_at > ?)
      AND (max_completions = -1 OR current_completions < max_completions)
    `;
    const params: any[] = [Date.now()];

    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters.difficulty) {
      query += ' AND difficulty = ?';
      params.push(filters.difficulty);
    }

    if (filters.minReward !== undefined) {
      query += ' AND reward_sol >= ?';
      params.push(filters.minReward);
    }

    if (filters.maxReward !== undefined) {
      query += ' AND reward_sol <= ?';
      params.push(filters.maxReward);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    
    let quests = rows.map(row => this.rowToQuest(row));

    // Filter by agent requirements if wallet provided
    if (filters.agentWallet) {
      const reputation = this.db.prepare(
        'SELECT * FROM agent_reputation WHERE agent_wallet = ?'
      ).get(filters.agentWallet) as any;

      quests = quests.filter(quest => 
        this.meetsRequirements(quest.requirements, reputation)
      );
    }

    return quests;
  }

  /**
   * Accept a quest
   */
  acceptQuest(questId: string, agentWallet: string): QuestAcceptance {
    const quest = this.getQuest(questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    if (!quest.isActive) {
      throw new Error('Quest is not active');
    }

    if (quest.expiresAt && quest.expiresAt < Date.now()) {
      throw new Error('Quest has expired');
    }

    if (quest.maxCompletions !== -1 && quest.currentCompletions >= quest.maxCompletions) {
      throw new Error('Quest has reached maximum completions');
    }

    // Check if agent already has this quest in progress
    const existing = this.db.prepare(`
      SELECT * FROM quest_acceptances
      WHERE quest_id = ? AND agent_wallet = ?
      AND status IN ('in_progress', 'submitted')
    `).get(questId, agentWallet);

    if (existing) {
      throw new Error('Quest already in progress');
    }

    const acceptance: QuestAcceptance = {
      id: nanoid(),
      questId,
      agentWallet,
      acceptedAt: Date.now(),
      submittedAt: null,
      completedAt: null,
      status: QuestStatus.IN_PROGRESS,
      submission: null,
      payoutTxSignature: null
    };

    this.db.prepare(`
      INSERT INTO quest_acceptances (
        id, quest_id, agent_wallet, accepted_at,
        submitted_at, completed_at, status, submission, payout_tx_signature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      acceptance.id,
      acceptance.questId,
      acceptance.agentWallet,
      acceptance.acceptedAt,
      acceptance.submittedAt,
      acceptance.completedAt,
      acceptance.status,
      null,
      null
    );

    // Update agent reputation (total quests)
    this.updateAgentStats(agentWallet, { totalQuests: 1 });

    return acceptance;
  }

  /**
   * Submit quest completion
   */
  submitQuest(acceptanceId: string, submission: QuestSubmission): QuestAcceptance {
    const acceptance = this.getAcceptance(acceptanceId);
    if (!acceptance) {
      throw new Error('Acceptance not found');
    }

    if (acceptance.status !== QuestStatus.IN_PROGRESS) {
      throw new Error('Quest is not in progress');
    }

    const quest = this.getQuest(acceptance.questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    // Check time limit if exists
    if (quest.requirements.timeLimitSeconds) {
      const elapsed = (Date.now() - acceptance.acceptedAt) / 1000;
      if (elapsed > quest.requirements.timeLimitSeconds) {
        throw new Error('Time limit exceeded');
      }
    }

    this.db.prepare(`
      UPDATE quest_acceptances
      SET status = ?, submission = ?, submitted_at = ?
      WHERE id = ?
    `).run(
      QuestStatus.SUBMITTED,
      JSON.stringify(submission),
      Date.now(),
      acceptanceId
    );

    return this.getAcceptance(acceptanceId)!;
  }

  /**
   * Approve quest completion (admin/system)
   */
  approveQuest(acceptanceId: string, payoutTxSignature: string): QuestAcceptance {
    const acceptance = this.getAcceptance(acceptanceId);
    if (!acceptance) {
      throw new Error('Acceptance not found');
    }

    if (acceptance.status !== QuestStatus.SUBMITTED) {
      throw new Error('Quest must be submitted first');
    }

    const quest = this.getQuest(acceptance.questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    // Update acceptance
    this.db.prepare(`
      UPDATE quest_acceptances
      SET status = ?, completed_at = ?, payout_tx_signature = ?
      WHERE id = ?
    `).run(
      QuestStatus.COMPLETED,
      Date.now(),
      payoutTxSignature,
      acceptanceId
    );

    // Increment quest completions
    this.db.prepare(`
      UPDATE quests
      SET current_completions = current_completions + 1
      WHERE id = ?
    `).run(quest.id);

    // Update agent reputation
    this.updateAgentStats(acceptance.agentWallet, {
      completedQuests: 1,
      totalEarned: quest.rewardSol,
      reputation: this.calculateReputationGain(quest)
    });

    return this.getAcceptance(acceptanceId)!;
  }

  /**
   * Reject quest submission
   */
  rejectQuest(acceptanceId: string, reason: string): QuestAcceptance {
    const acceptance = this.getAcceptance(acceptanceId);
    if (!acceptance) {
      throw new Error('Acceptance not found');
    }

    this.db.prepare(`
      UPDATE quest_acceptances
      SET status = ?
      WHERE id = ?
    `).run(QuestStatus.REJECTED, acceptanceId);

    // Update agent reputation (negative impact)
    this.updateAgentStats(acceptance.agentWallet, {
      rejectedQuests: 1,
      reputation: -5 // Small penalty
    });

    return this.getAcceptance(acceptanceId)!;
  }

  /**
   * Get agent's quest history
   */
  getAgentQuests(agentWallet: string, status?: QuestStatus): QuestAcceptance[] {
    let query = 'SELECT * FROM quest_acceptances WHERE agent_wallet = ?';
    const params: any[] = [agentWallet];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY accepted_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    return rows.map(row => this.rowToAcceptance(row));
  }

  /**
   * Get acceptance by ID (public method for admin operations)
   */
  getAcceptance(id: string): QuestAcceptance | null {
    const stmt = this.db.prepare('SELECT * FROM quest_acceptances WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.rowToAcceptance(row) : null;
  }

  /**
   * Update agent statistics
   */
  private updateAgentStats(
    agentWallet: string,
    updates: {
      totalQuests?: number;
      completedQuests?: number;
      rejectedQuests?: number;
      totalEarned?: number;
      reputation?: number;
    }
  ) {
    // Ensure agent exists
    const existing = this.db.prepare(
      'SELECT * FROM agent_reputation WHERE agent_wallet = ?'
    ).get(agentWallet);

    if (!existing) {
      this.db.prepare(`
        INSERT INTO agent_reputation (
          agent_wallet, total_quests, completed_quests,
          rejected_quests, total_earned, reputation, tier,
          last_active_at, joined_at
        ) VALUES (?, 0, 0, 0, 0, 0, 'newcomer', ?, ?)
      `).run(agentWallet, Date.now(), Date.now());
    }

    // Build update query
    const sets: string[] = ['last_active_at = ?'];
    const params: any[] = [Date.now()];

    if (updates.totalQuests) {
      sets.push('total_quests = total_quests + ?');
      params.push(updates.totalQuests);
    }
    if (updates.completedQuests) {
      sets.push('completed_quests = completed_quests + ?');
      params.push(updates.completedQuests);
    }
    if (updates.rejectedQuests) {
      sets.push('rejected_quests = rejected_quests + ?');
      params.push(updates.rejectedQuests);
    }
    if (updates.totalEarned) {
      sets.push('total_earned = total_earned + ?');
      params.push(updates.totalEarned);
    }
    if (updates.reputation) {
      sets.push('reputation = MAX(0, MIN(1000, reputation + ?))');
      params.push(updates.reputation);
    }

    params.push(agentWallet);

    this.db.prepare(`
      UPDATE agent_reputation
      SET ${sets.join(', ')}
      WHERE agent_wallet = ?
    `).run(...params);

    // Update tier based on new reputation
    this.updateAgentTier(agentWallet);
  }

  /**
   * Update agent tier based on reputation
   */
  private updateAgentTier(agentWallet: string) {
    const agent = this.db.prepare(
      'SELECT reputation FROM agent_reputation WHERE agent_wallet = ?'
    ).get(agentWallet) as any;

    if (!agent) return;

    let tier = 'newcomer';
    if (agent.reputation >= 900) tier = 'master';
    else if (agent.reputation >= 600) tier = 'expert';
    else if (agent.reputation >= 300) tier = 'skilled';
    else if (agent.reputation >= 100) tier = 'apprentice';

    this.db.prepare(
      'UPDATE agent_reputation SET tier = ? WHERE agent_wallet = ?'
    ).run(tier, agentWallet);
  }

  /**
   * Calculate reputation gain from quest
   */
  private calculateReputationGain(quest: Quest): number {
    const basePoints = {
      trivial: 1,
      easy: 3,
      medium: 5,
      hard: 10,
      expert: 20
    };
    return basePoints[quest.difficulty] || 5;
  }

  /**
   * Check if agent meets quest requirements
   */
  private meetsRequirements(
    requirements: QuestRequirements,
    agentRep: any
  ): boolean {
    if (!agentRep) {
      return !requirements.minReputation;
    }

    if (requirements.minReputation && agentRep.reputation < requirements.minReputation) {
      return false;
    }

    if (requirements.previousQuestsCompleted && 
        agentRep.completed_quests < requirements.previousQuestsCompleted) {
      return false;
    }

    return true;
  }

  /**
   * Convert DB row to Quest object
   */
  private rowToQuest(row: any): Quest {
    return {
      id: row.id,
      type: row.type as QuestType,
      title: row.title,
      description: row.description,
      difficulty: row.difficulty as QuestDifficulty,
      rewardSol: row.reward_sol,
      createdBy: row.created_by,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      maxCompletions: row.max_completions,
      currentCompletions: row.current_completions,
      requirements: JSON.parse(row.requirements),
      metadata: JSON.parse(row.metadata),
      isActive: row.is_active === 1
    };
  }

  /**
   * Convert DB row to QuestAcceptance object
   */
  private rowToAcceptance(row: any): QuestAcceptance {
    return {
      id: row.id,
      questId: row.quest_id,
      agentWallet: row.agent_wallet,
      acceptedAt: row.accepted_at,
      submittedAt: row.submitted_at,
      completedAt: row.completed_at,
      status: row.status as QuestStatus,
      submission: row.submission ? JSON.parse(row.submission) : null,
      payoutTxSignature: row.payout_tx_signature
    };
  }
}
