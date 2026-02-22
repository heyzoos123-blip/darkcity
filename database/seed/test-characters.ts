import { PrismaClient, CharacterClass } from '@prisma/client';

export async function seedTestCharacters(db: PrismaClient) {
  const characters = [
    {
      userId: 'test_hacker_001',
      name: 'ZeroCool',
      class: CharacterClass.HACKER,
      level: 10,
      experience: BigInt(5000),
      strength: 8,
      dexterity: 12,
      intelligence: 20,
      charisma: 14,
      luck: 10,
      appearance: {
        hairStyle: 'mohawk',
        hairColor: 'electric_blue',
        skinTone: 'pale',
        outfit: 'cyberpunk_jacket',
        accessories: ['visor', 'gloves'],
      },
      currentZone: 'downtown',
    },
    {
      userId: 'test_merc_001',
      name: 'Blade',
      class: CharacterClass.MERCENARY,
      level: 15,
      experience: BigInt(12000),
      strength: 20,
      dexterity: 16,
      intelligence: 10,
      charisma: 12,
      luck: 14,
      appearance: {
        hairStyle: 'buzzcut',
        hairColor: 'black',
        skinTone: 'tan',
        outfit: 'combat_vest',
        accessories: ['dog_tags', 'combat_boots'],
      },
      currentZone: 'industrial',
    },
    {
      userId: 'test_fixer_001',
      name: 'Silvertongue',
      class: CharacterClass.FIXER,
      level: 12,
      experience: BigInt(7500),
      strength: 10,
      dexterity: 14,
      intelligence: 16,
      charisma: 20,
      luck: 18,
      appearance: {
        hairStyle: 'slicked_back',
        hairColor: 'silver',
        skinTone: 'medium',
        outfit: 'suit',
        accessories: ['gold_watch', 'sunglasses'],
      },
      currentZone: 'corporate',
    },
  ];

  for (const charData of characters) {
    const existing = await db.character.findUnique({
      where: { userId: charData.userId },
    });

    if (!existing) {
      await db.character.create({
        data: {
          ...charData,
          wallets: {
            create: [
              { currency: 'SOL', balance: BigInt(0) },
              { currency: 'CREDITS', balance: BigInt(10000) },
            ],
          },
          combatStats: {
            create: {},
          },
        },
      });
    }
  }

  console.log(`  Created ${characters.length} test characters`);
}
