#!/usr/bin/env node
/**
 * DARKCITY Quest System - Admin CLI
 */
import { QuestService } from '../services/QuestService';
import { QuestGenerator } from '../services/QuestGenerator';
import { ReputationService } from '../services/ReputationService';
import { QuestType, QuestDifficulty } from '../types';

const questService = new QuestService();
const questGenerator = new QuestGenerator();
const reputationService = new ReputationService();

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case 'create-quest':
      await createQuest();
      break;
    
    case 'generate-daily':
      await generateDaily();
      break;
    
    case 'generate-data':
      await generateDataAnalysis();
      break;
    
    case 'generate-content':
      await generateContent();
      break;
    
    case 'list-quests':
      await listQuests();
      break;
    
    case 'approve':
      await approveSubmission();
      break;
    
    case 'reject':
      await rejectSubmission();
      break;
    
    case 'leaderboard':
      await showLeaderboard();
      break;
    
    case 'agent-stats':
      await showAgentStats();
      break;
    
    case 'global-stats':
      await showGlobalStats();
      break;
    
    case 'help':
    default:
      showHelp();
  }
}

function createQuest() {
  console.log('📝 Create Custom Quest\n');
  
  // Parse arguments
  const type = args[1] as QuestType || QuestType.CONTENT_GENERATION;
  const title = args[2] || 'Custom Quest';
  const description = args[3] || 'Complete this custom task';
  const difficulty = args[4] as QuestDifficulty || QuestDifficulty.MEDIUM;
  const reward = parseFloat(args[5]) || 0.05;

  const quest = questService.createQuest({
    type,
    title,
    description,
    difficulty,
    rewardSol: reward,
    createdBy: 'admin',
    createdAt: Date.now(),
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
    maxCompletions: 10,
    requirements: {},
    metadata: {},
    isActive: true
  });

  console.log('✅ Quest created:');
  console.log(`   ID: ${quest.id}`);
  console.log(`   Type: ${quest.type}`);
  console.log(`   Title: ${quest.title}`);
  console.log(`   Reward: ${quest.rewardSol} SOL`);
}

function generateDaily() {
  console.log('🎯 Generating Daily Challenges...\n');
  const quests = questGenerator.generateDailyChallenges();
  console.log(`✅ Generated ${quests.length} daily challenges`);
  quests.forEach(q => {
    console.log(`   - ${q.title} (${q.rewardSol} SOL)`);
  });
}

function generateDataAnalysis() {
  console.log('📊 Generating Data Analysis Quests...\n');
  const quests = questGenerator.generateDataAnalysisQuests();
  console.log(`✅ Generated ${quests.length} data analysis quests`);
  quests.forEach(q => {
    console.log(`   - ${q.title} (${q.rewardSol} SOL, ${q.difficulty})`);
  });
}

function generateContent() {
  console.log('✍️ Generating Content Quests...\n');
  const quests = questGenerator.generateContentQuests();
  console.log(`✅ Generated ${quests.length} content quests`);
  quests.forEach(q => {
    console.log(`   - ${q.title} (${q.rewardSol} SOL, ${q.difficulty})`);
  });
}

function listQuests() {
  console.log('📋 Active Quests\n');
  const quests = questService.browseQuests({});
  
  if (quests.length === 0) {
    console.log('No active quests found.');
    return;
  }

  quests.forEach(q => {
    console.log(`${q.id} - ${q.title}`);
    console.log(`  Type: ${q.type} | Difficulty: ${q.difficulty}`);
    console.log(`  Reward: ${q.rewardSol} SOL | Completions: ${q.currentCompletions}/${q.maxCompletions}`);
    console.log('');
  });
}

function approveSubmission() {
  const acceptanceId = args[1];
  if (!acceptanceId) {
    console.error('❌ Acceptance ID required');
    console.log('Usage: npm run admin approve <acceptance_id>');
    return;
  }

  try {
    const acceptance = questService.approveQuest(acceptanceId, 'manual-approval-' + Date.now());
    console.log('✅ Quest approved!');
    console.log(`   Agent: ${acceptance.agentWallet}`);
    console.log(`   Status: ${acceptance.status}`);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

function rejectSubmission() {
  const acceptanceId = args[1];
  const reason = args[2] || 'Quality standards not met';
  
  if (!acceptanceId) {
    console.error('❌ Acceptance ID required');
    console.log('Usage: npm run admin reject <acceptance_id> [reason]');
    return;
  }

  try {
    const acceptance = questService.rejectQuest(acceptanceId, reason);
    console.log('❌ Quest rejected');
    console.log(`   Reason: ${reason}`);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

function showLeaderboard() {
  console.log('🏆 DARKCITY Quest Leaderboard\n');
  const limit = parseInt(args[1]) || 10;
  const leaders = reputationService.getLeaderboard(limit);

  if (leaders.length === 0) {
    console.log('No agents found.');
    return;
  }

  console.log('Rank | Agent | Reputation | Quests | Earned (SOL)');
  console.log('-----|-------|------------|--------|-------------');
  
  leaders.forEach((agent, index) => {
    const rank = String(index + 1).padEnd(4);
    const wallet = agent.agentWallet.slice(0, 8) + '...';
    const rep = String(agent.reputation).padEnd(10);
    const quests = String(agent.completedQuests).padEnd(6);
    const earned = agent.totalEarned.toFixed(4);
    
    console.log(`${rank} | ${wallet} | ${rep} | ${quests} | ${earned}`);
  });
}

function showAgentStats() {
  const wallet = args[1];
  if (!wallet) {
    console.error('❌ Agent wallet required');
    console.log('Usage: npm run admin agent-stats <wallet>');
    return;
  }

  const stats = reputationService.getStats(wallet);
  
  if (!stats.reputation) {
    console.log('Agent not found.');
    return;
  }

  console.log(`\n📊 Agent Statistics: ${wallet}\n`);
  console.log(`Reputation: ${stats.reputation.reputation} (${stats.reputation.tier})`);
  console.log(`Rank: #${stats.rank}`);
  console.log(`Total Quests: ${stats.reputation.totalQuests}`);
  console.log(`Completed: ${stats.reputation.completedQuests}`);
  console.log(`Rejected: ${stats.reputation.rejectedQuests}`);
  console.log(`Success Rate: ${stats.successRate.toFixed(1)}%`);
  console.log(`Total Earned: ${stats.reputation.totalEarned.toFixed(4)} SOL`);
  console.log(`Avg per Quest: ${stats.avgQuestValue.toFixed(4)} SOL`);
}

function showGlobalStats() {
  console.log('\n🌍 Global Quest System Statistics\n');
  const stats = reputationService.getGlobalStats();
  
  console.log(`Total Agents: ${stats.totalAgents}`);
  console.log(`Total Quests Completed: ${stats.totalQuestsCompleted}`);
  console.log(`Total SOL Distributed: ${stats.totalSolDistributed.toFixed(4)}`);
  console.log(`Average Reputation: ${stats.avgReputation.toFixed(1)}`);
}

function showHelp() {
  console.log(`
🌃 DARKCITY Quest System - Admin CLI

QUEST MANAGEMENT:
  create-quest <type> <title> <description> <difficulty> <reward>
    Create a custom quest

  list-quests
    List all active quests

  generate-daily
    Generate daily challenges

  generate-data
    Generate data analysis quests

  generate-content
    Generate content generation quests

SUBMISSION MANAGEMENT:
  approve <acceptance_id>
    Approve a quest submission

  reject <acceptance_id> [reason]
    Reject a quest submission

REPUTATION & STATS:
  leaderboard [limit]
    Show top agents (default: 10)

  agent-stats <wallet>
    Show detailed stats for an agent

  global-stats
    Show global system statistics

EXAMPLES:
  npm run admin create-quest content_generation "Write a story" "500 word cyberpunk story" medium 0.05
  npm run admin generate-daily
  npm run admin approve abc123
  npm run admin leaderboard 20
  npm run admin agent-stats FkjfuN...vmCD

`);
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
