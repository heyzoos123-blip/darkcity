import { Quest, QuestProgress, QuestType, QuestDifficulty, QuestStatus, Prisma } from '@prisma/client';
import { getDatabase } from '../client';

/**
 * Quest Management Service
 */
export class QuestService {
  private db = getDatabase();

  /**
   * Create a quest
   */
  async create(data: {
    title: string;
    description: string;
    type: QuestType;
    difficulty: QuestDifficulty;
    minLevel?: number;
    prerequisites?: any;
    rewards: any;
    objectives: any;
    dialogue?: any;
    isRepeatable?: boolean;
    cooldown?: number;
  }): Promise<Quest> {
    return this.db.quest.create({
      data,
    });
  }

  /**
   * Get quest by ID
   */
  async getById(id: string): Promise<Quest | null> {
    return this.db.quest.findUnique({
      where: { id },
    });
  }

  /**
   * Get available quests for character
   */
  async getAvailable(characterId: string, characterLevel: number): Promise<Quest[]> {
    // Get character's completed quests
    const completed = await this.db.questProgress.findMany({
      where: {
        characterId,
        status: QuestStatus.COMPLETED,
      },
      select: { questId: true, lastRepeat: true },
    });

    const completedQuestIds = completed
      .filter(qp => {
        // For non-repeatable quests, filter them out entirely
        return false; // Will be handled in the main query
      })
      .map(qp => qp.questId);

    // Get in-progress quests
    const inProgress = await this.db.questProgress.findMany({
      where: {
        characterId,
        status: QuestStatus.IN_PROGRESS,
      },
      select: { questId: true },
    });

    const inProgressQuestIds = inProgress.map(qp => qp.questId);

    // Find available quests
    return this.db.quest.findMany({
      where: {
        minLevel: { lte: characterLevel },
        id: {
          notIn: [...completedQuestIds, ...inProgressQuestIds],
        },
      },
      orderBy: [
        { type: 'asc' },
        { difficulty: 'asc' },
      ],
    });
  }

  /**
   * Start a quest
   */
  async startQuest(characterId: string, questId: string): Promise<QuestProgress> {
    const quest = await this.getById(questId);
    if (!quest) throw new Error('Quest not found');

    // Initialize objectives
    const objectives = (quest.objectives as any).reduce((acc: any, obj: any) => {
      acc[obj.id] = { completed: false, progress: 0, target: obj.target };
      return acc;
    }, {});

    return this.db.questProgress.create({
      data: {
        characterId,
        questId,
        status: QuestStatus.IN_PROGRESS,
        objectives,
      },
    });
  }

  /**
   * Update quest progress
   */
  async updateProgress(
    characterId: string,
    questId: string,
    objectiveId: string,
    progress: number
  ): Promise<QuestProgress> {
    const questProgress = await this.db.questProgress.findUnique({
      where: { characterId_questId: { characterId, questId } },
    });

    if (!questProgress) throw new Error('Quest not started');

    const objectives = questProgress.objectives as any;
    objectives[objectiveId].progress = progress;

    // Check if objective is completed
    if (progress >= objectives[objectiveId].target) {
      objectives[objectiveId].completed = true;
    }

    // Check if all objectives are completed
    const allCompleted = Object.values(objectives).every((obj: any) => obj.completed);

    return this.db.questProgress.update({
      where: { id: questProgress.id },
      data: {
        objectives,
        ...(allCompleted && {
          status: QuestStatus.COMPLETED,
          completedAt: new Date(),
        }),
      },
    });
  }

  /**
   * Complete quest (for instant completion or when all objectives done)
   */
  async completeQuest(characterId: string, questId: string): Promise<QuestProgress> {
    return this.db.questProgress.update({
      where: { characterId_questId: { characterId, questId } },
      data: {
        status: QuestStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Fail quest
   */
  async failQuest(characterId: string, questId: string): Promise<QuestProgress> {
    return this.db.questProgress.update({
      where: { characterId_questId: { characterId, questId } },
      data: { status: QuestStatus.FAILED },
    });
  }

  /**
   * Abandon quest
   */
  async abandonQuest(characterId: string, questId: string): Promise<QuestProgress> {
    return this.db.questProgress.update({
      where: { characterId_questId: { characterId, questId } },
      data: { status: QuestStatus.ABANDONED },
    });
  }

  /**
   * Get character's quest progress
   */
  async getProgress(characterId: string, status?: QuestStatus): Promise<QuestProgress[]> {
    return this.db.questProgress.findMany({
      where: {
        characterId,
        ...(status && { status }),
      },
      include: { quest: true },
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * Get completed quests count
   */
  async getCompletedCount(characterId: string): Promise<number> {
    return this.db.questProgress.count({
      where: {
        characterId,
        status: QuestStatus.COMPLETED,
      },
    });
  }

  /**
   * Check if quest can be repeated
   */
  async canRepeat(characterId: string, questId: string): Promise<boolean> {
    const quest = await this.getById(questId);
    if (!quest || !quest.isRepeatable) return false;

    const progress = await this.db.questProgress.findUnique({
      where: { characterId_questId: { characterId, questId } },
    });

    if (!progress || !progress.lastRepeat || !quest.cooldown) return true;

    const cooldownMs = quest.cooldown * 60 * 1000;
    const timeSinceRepeat = Date.now() - progress.lastRepeat.getTime();

    return timeSinceRepeat >= cooldownMs;
  }
}
