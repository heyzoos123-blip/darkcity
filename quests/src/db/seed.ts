#!/usr/bin/env node
/**
 * Database seeding script - Add sample data
 */
import { QuestService } from '../services/QuestService';
import { QuestGenerator } from '../services/QuestGenerator';
import { QuestType, QuestDifficulty } from '../types';

console.log('🌱 Seeding DARKCITY Quest System database...\n');

const questService = new QuestService();
const questGenerator = new QuestGenerator();

try {
  // Generate initial quests
  console.log('📋 Generating daily challenges...');
  const dailyQuests = questGenerator.generateDailyChallenges();
  console.log(`   ✅ Created ${dailyQuests.length} daily challenges`);

  console.log('\n📊 Generating data analysis quests...');
  const dataQuests = questGenerator.generateDataAnalysisQuests();
  console.log(`   ✅ Created ${dataQuests.length} data analysis quests`);

  console.log('\n✍️  Generating content quests...');
  const contentQuests = questGenerator.generateContentQuests();
  console.log(`   ✅ Created ${contentQuests.length} content quests`);

  // Add some custom quests
  console.log('\n🎨 Creating custom quests...');
  
  const customQuests = [
    {
      type: QuestType.AGENT_SERVICES,
      title: 'Code Review Service',
      description: 'Review and provide feedback on smart contract code for another agent',
      difficulty: QuestDifficulty.HARD,
      rewardSol: 0.15,
      createdBy: 'system',
      createdAt: Date.now(),
      expiresAt: null,
      maxCompletions: -1,
      requirements: {
        minReputation: 300,
        requiredSkills: ['solidity', 'security']
      },
      metadata: { category: 'development' },
      isActive: true
    },
    {
      type: QuestType.CONTENT_GENERATION,
      title: 'DARKCITY Intro Video Script',
      description: 'Write a compelling 3-minute video script introducing DARKCITY to new agents',
      difficulty: QuestDifficulty.EXPERT,
      rewardSol: 0.2,
      createdBy: 'system',
      createdAt: Date.now(),
      expiresAt: Date.now() + (14 * 24 * 60 * 60 * 1000),
      maxCompletions: 3,
      requirements: {
        minReputation: 200,
        requiredSkills: ['video', 'marketing']
      },
      metadata: { format: 'script', duration: 180 },
      isActive: true
    },
    {
      type: QuestType.DATA_ANALYSIS,
      title: 'On-chain Activity Report',
      description: 'Generate weekly report of DARKCITY ecosystem on-chain activity',
      difficulty: QuestDifficulty.EXPERT,
      rewardSol: 0.1,
      createdBy: 'system',
      createdAt: Date.now(),
      expiresAt: null,
      maxCompletions: -1,
      requirements: {
        minReputation: 400,
        requiredSkills: ['blockchain', 'analytics', 'visualization']
      },
      metadata: { recurring: true, frequency: 'weekly' },
      isActive: true
    }
  ];

  customQuests.forEach(questData => {
    const quest = questService.createQuest(questData);
    console.log(`   ✅ Created: ${quest.title} (${quest.rewardSol} SOL)`);
  });

  console.log('\n✅ Database seeded successfully!');
  console.log(`\n📊 Total quests created: ${dailyQuests.length + dataQuests.length + contentQuests.length + customQuests.length}`);
  
} catch (error: any) {
  console.error('❌ Seeding failed:', error.message);
  process.exit(1);
}
