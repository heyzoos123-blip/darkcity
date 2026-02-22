import { PrismaClient, QuestType, QuestDifficulty } from '@prisma/client';

export async function seedQuests(db: PrismaClient) {
  const quests = [
    // Main Story
    {
      title: 'Welcome to DARKCITY',
      description: 'Learn the basics and explore your first district',
      type: QuestType.MAIN_STORY,
      difficulty: QuestDifficulty.TRIVIAL,
      minLevel: 1,
      rewards: {
        xp: 100,
        credits: 500,
        items: ['seed_health_stim'],
      },
      objectives: [
        { id: 'explore', description: 'Explore the downtown district', target: 1 },
        { id: 'talk_npc', description: 'Talk to the Fixer', target: 1 },
        { id: 'equip_weapon', description: 'Equip your first weapon', target: 1 },
      ],
      dialogue: {
        start: 'Welcome to DARKCITY, choom. Time to learn the ropes.',
        complete: 'Not bad for a newbie. You might survive here after all.',
      },
    },

    // Side Quests
    {
      title: 'Street Sweeper',
      description: 'Clear out the gang members terrorizing local businesses',
      type: QuestType.SIDE_QUEST,
      difficulty: QuestDifficulty.EASY,
      minLevel: 3,
      rewards: {
        xp: 250,
        credits: 1000,
        reputation: 10,
      },
      objectives: [
        { id: 'defeat_gang', description: 'Defeat 5 gang members', target: 5 },
        { id: 'report_back', description: 'Report to the shop owner', target: 1 },
      ],
    },
    {
      title: 'Data Heist',
      description: 'Infiltrate a corporate server and steal valuable data',
      type: QuestType.SIDE_QUEST,
      difficulty: QuestDifficulty.MEDIUM,
      minLevel: 10,
      prerequisites: {
        stats: { intelligence: 15 },
      },
      rewards: {
        xp: 1000,
        credits: 5000,
        items: ['seed_electronics', 'seed_electronics', 'seed_electronics'],
      },
      objectives: [
        { id: 'hack_terminal', description: 'Hack the security terminal', target: 1 },
        { id: 'download_data', description: 'Download the corporate files', target: 1 },
        { id: 'escape', description: 'Escape without triggering alarms', target: 1 },
      ],
    },
    {
      title: 'Arena Champion',
      description: 'Prove your worth in the underground fighting arena',
      type: QuestType.SIDE_QUEST,
      difficulty: QuestDifficulty.HARD,
      minLevel: 15,
      rewards: {
        xp: 2500,
        credits: 10000,
        items: ['seed_plasma_cutter'],
        title: 'Arena Fighter',
      },
      objectives: [
        { id: 'win_matches', description: 'Win 10 arena matches', target: 10 },
        { id: 'defeat_champion', description: 'Defeat the current champion', target: 1 },
      ],
    },

    // Daily Quests
    {
      title: 'Daily Bounty',
      description: 'Hunt down a wanted target for the local authorities',
      type: QuestType.DAILY,
      difficulty: QuestDifficulty.MEDIUM,
      minLevel: 5,
      isRepeatable: true,
      cooldown: 1440, // 24 hours
      rewards: {
        xp: 500,
        credits: 2000,
      },
      objectives: [
        { id: 'eliminate_target', description: 'Eliminate the bounty target', target: 1 },
        { id: 'collect_bounty', description: 'Collect your reward', target: 1 },
      ],
    },
    {
      title: 'Scavenger Hunt',
      description: 'Collect rare materials scattered across the city',
      type: QuestType.DAILY,
      difficulty: QuestDifficulty.EASY,
      minLevel: 1,
      isRepeatable: true,
      cooldown: 1440,
      rewards: {
        xp: 200,
        credits: 500,
        items: ['seed_scrap_metal', 'seed_electronics'],
      },
      objectives: [
        { id: 'collect_materials', description: 'Collect 10 scrap materials', target: 10 },
      ],
    },

    // Weekly Quests
    {
      title: 'Corporate Sabotage',
      description: 'Disrupt corporate operations in multiple districts',
      type: QuestType.WEEKLY,
      difficulty: QuestDifficulty.HARD,
      minLevel: 20,
      isRepeatable: true,
      cooldown: 10080, // 7 days
      rewards: {
        xp: 5000,
        credits: 25000,
        items: ['seed_rare_alloy', 'seed_rare_alloy', 'seed_quantum_core'],
        reputation: 50,
      },
      objectives: [
        { id: 'sabotage_facilities', description: 'Sabotage 5 corporate facilities', target: 5 },
        { id: 'avoid_detection', description: 'Complete without being detected', target: 1 },
      ],
    },

    // Event Quests
    {
      title: 'Neon Festival',
      description: 'Participate in the city-wide Neon Festival celebration',
      type: QuestType.EVENT,
      difficulty: QuestDifficulty.EASY,
      minLevel: 1,
      rewards: {
        xp: 1000,
        credits: 5000,
        items: ['seed_neon_katana'],
        cosmetic: 'neon_outfit',
      },
      objectives: [
        { id: 'collect_tokens', description: 'Collect 50 festival tokens', target: 50 },
        { id: 'complete_games', description: 'Complete 3 festival games', target: 3 },
        { id: 'watch_show', description: 'Watch the neon light show', target: 1 },
      ],
    },

    // Bounty
    {
      title: 'Most Wanted',
      description: 'Track down a notorious criminal with a massive bounty',
      type: QuestType.BOUNTY,
      difficulty: QuestDifficulty.EXTREME,
      minLevel: 25,
      rewards: {
        xp: 10000,
        credits: 50000,
        items: ['seed_exo_suit'],
        reputation: 100,
      },
      objectives: [
        { id: 'gather_intel', description: 'Gather intelligence on the target', target: 5 },
        { id: 'track_hideout', description: 'Locate the criminal hideout', target: 1 },
        { id: 'confront_target', description: 'Confront and defeat the criminal', target: 1 },
        { id: 'survive', description: 'Escape the hideout alive', target: 1 },
      ],
    },
  ];

  for (const quest of quests) {
    await db.quest.upsert({
      where: { id: `seed_${quest.title.toLowerCase().replace(/\s+/g, '_')}` },
      create: { id: `seed_${quest.title.toLowerCase().replace(/\s+/g, '_')}`, ...quest },
      update: quest,
    });
  }

  console.log(`  Created ${quests.length} quests`);
}
