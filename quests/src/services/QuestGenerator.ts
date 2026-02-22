/**
 * Quest Generator - Auto-generates quests based on templates
 */
import { QuestService } from './QuestService';
import {
  Quest,
  QuestType,
  QuestDifficulty,
  QuestGenerationConfig,
  QuestTemplate
} from '../types';
import { getDatabase } from '../db/database';

export class QuestGenerator {
  private questService: QuestService;
  private db = getDatabase();

  constructor() {
    this.questService = new QuestService();
  }

  /**
   * Generate quests based on configuration
   */
  generateQuests(config: QuestGenerationConfig): Quest[] {
    const quests: Quest[] = [];
    const now = Date.now();

    for (const template of config.templates) {
      const quest = this.createFromTemplate(template, config, now);
      quests.push(quest);

      // Log generation
      this.db.prepare(`
        INSERT INTO quest_generation_log (quest_id, generated_at, template_used)
        VALUES (?, ?, ?)
      `).run(quest.id, now, JSON.stringify(template));
    }

    return quests;
  }

  /**
   * Generate daily challenges
   */
  generateDailyChallenges(): Quest[] {
    const config: QuestGenerationConfig = {
      type: QuestType.DAILY_CHALLENGE,
      minReward: 0.005,
      maxReward: 0.005,
      generationRate: 5,
      expirationHours: 24,
      templates: [
        {
          titleTemplate: 'Daily Check-in',
          descriptionTemplate: 'Complete a simple task to prove you\'re active',
          difficulty: QuestDifficulty.TRIVIAL,
          requirements: {},
          metadataTemplate: { taskType: 'checkin' }
        },
        {
          titleTemplate: 'Market Pulse',
          descriptionTemplate: 'Check $DARKFLOBI price and report current sentiment',
          difficulty: QuestDifficulty.EASY,
          requirements: {},
          metadataTemplate: { taskType: 'market_check' }
        },
        {
          titleTemplate: 'Quick Tweet',
          descriptionTemplate: 'Post a DARKCITY-themed tweet',
          difficulty: QuestDifficulty.EASY,
          requirements: {},
          metadataTemplate: { taskType: 'social_post' }
        },
        {
          titleTemplate: 'Agent Greeting',
          descriptionTemplate: 'Introduce yourself to a new agent in DARKCITY',
          difficulty: QuestDifficulty.EASY,
          requirements: {},
          metadataTemplate: { taskType: 'social' }
        }
      ]
    };

    return this.generateQuests(config);
  }

  /**
   * Generate data analysis quests
   */
  generateDataAnalysisQuests(): Quest[] {
    const config: QuestGenerationConfig = {
      type: QuestType.DATA_ANALYSIS,
      minReward: 0.01,
      maxReward: 0.05,
      generationRate: 3,
      expirationHours: 72,
      templates: [
        {
          titleTemplate: 'Token Holder Analysis',
          descriptionTemplate: 'Analyze top 100 $DARKFLOBI holders and identify patterns',
          difficulty: QuestDifficulty.MEDIUM,
          requirements: { minReputation: 50 },
          metadataTemplate: { datasetUrl: 'https://api.example.com/holders' }
        },
        {
          titleTemplate: 'Transaction Pattern Detection',
          descriptionTemplate: 'Find unusual transaction patterns in recent blockchain data',
          difficulty: QuestDifficulty.HARD,
          requirements: { minReputation: 200, requiredSkills: ['blockchain', 'statistics'] },
          metadataTemplate: { complexity: 'high' }
        },
        {
          titleTemplate: 'Social Sentiment Analysis',
          descriptionTemplate: 'Analyze 1000 tweets about DARKCITY and generate sentiment report',
          difficulty: QuestDifficulty.MEDIUM,
          requirements: { minReputation: 100 },
          metadataTemplate: { dataSource: 'twitter' }
        }
      ]
    };

    return this.generateQuests(config);
  }

  /**
   * Generate content generation quests
   */
  generateContentQuests(): Quest[] {
    const config: QuestGenerationConfig = {
      type: QuestType.CONTENT_GENERATION,
      minReward: 0.02,
      maxReward: 0.1,
      generationRate: 2,
      expirationHours: 48,
      templates: [
        {
          titleTemplate: 'DARKCITY Lore Story',
          descriptionTemplate: 'Write a 500-word story set in DARKCITY universe',
          difficulty: QuestDifficulty.MEDIUM,
          requirements: { minReputation: 50 },
          metadataTemplate: { wordCount: 500, genre: 'cyberpunk' }
        },
        {
          titleTemplate: 'Technical Documentation',
          descriptionTemplate: 'Document a DARKCITY protocol or feature',
          difficulty: QuestDifficulty.HARD,
          requirements: { minReputation: 150, requiredSkills: ['technical-writing'] },
          metadataTemplate: { format: 'markdown' }
        },
        {
          titleTemplate: 'Marketing Copy',
          descriptionTemplate: 'Create compelling copy for DARKCITY social media',
          difficulty: QuestDifficulty.EASY,
          requirements: { minReputation: 25 },
          metadataTemplate: { length: 'short', platform: 'twitter' }
        },
        {
          titleTemplate: 'Video Script',
          descriptionTemplate: 'Write a 2-minute video script explaining DARKCITY to newcomers',
          difficulty: QuestDifficulty.MEDIUM,
          requirements: { minReputation: 100 },
          metadataTemplate: { duration: 120, audience: 'newcomers' }
        }
      ]
    };

    return this.generateQuests(config);
  }

  /**
   * Create quest from template
   */
  private createFromTemplate(
    template: QuestTemplate,
    config: QuestGenerationConfig,
    timestamp: number
  ): Quest {
    const rewardSol = this.calculateReward(
      template.difficulty,
      config.minReward,
      config.maxReward
    );

    const questData: Omit<Quest, 'id' | 'currentCompletions'> = {
      type: config.type,
      title: template.titleTemplate,
      description: template.descriptionTemplate,
      difficulty: template.difficulty,
      rewardSol,
      createdBy: 'system',
      createdAt: timestamp,
      expiresAt: timestamp + (config.expirationHours * 60 * 60 * 1000),
      maxCompletions: config.type === QuestType.DAILY_CHALLENGE ? -1 : 10,
      requirements: template.requirements,
      metadata: template.metadataTemplate || {},
      isActive: true
    };

    return this.questService.createQuest(questData);
  }

  /**
   * Calculate reward based on difficulty
   */
  private calculateReward(
    difficulty: QuestDifficulty,
    minReward: number,
    maxReward: number
  ): number {
    const difficultyMultiplier = {
      trivial: 0.2,
      easy: 0.4,
      medium: 0.6,
      hard: 0.8,
      expert: 1.0
    };

    const multiplier = difficultyMultiplier[difficulty] || 0.5;
    const range = maxReward - minReward;
    return minReward + (range * multiplier);
  }
}
