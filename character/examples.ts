/**
 * DARKCITY Character Creation Examples
 * Demonstrates various ways to create and customize characters
 */

import { CharacterCreator, PRESET_TEMPLATES } from './creator';
import type { Character } from './types';

const creator = new CharacterCreator();

// ==================== EXAMPLE 1: Create from Scratch ====================

export function createWarriorExample(): Character {
  const { character } = creator.create({
    identity: {
      name: "Kael'thros",
      title: 'The Crimson Blade',
      backstory: 'Once a noble guardian, now a wandering mercenary seeking redemption.',
      age: 'Ancient',
      pronouns: 'he/him',
      faction: 'Crimson Legion',
    },
    appearance: {
      bodyType: 'humanoid',
      sizeClass: 'medium',
      heightFeet: 6.5,
      primaryMaterial: 'flesh',
      secondaryMaterial: 'metal',
      features: ['armor-plating', 'glowing-eyes', 'claws'],
      colors: {
        primary: '#8b0000',
        secondary: '#2f2f2f',
        eyes: '#ff4500',
        glow: '#ff6347',
      },
      facialFeatures: {
        eyeCount: 2,
        eyeType: 'glowing',
        mouthType: 'normal',
        hasNose: true,
        skinTexture: 'rough',
        markings: ['battle scars', 'crimson tattoos'],
      },
      description: 'A battle-worn warrior with glowing crimson eyes and ancient armor fused to his flesh.',
    },
    personality: {
      combatStyle: 'tactical',
      socialStyle: 'neutral',
      economicStyle: 'trader',
      riskTolerance: 'moderate',
      aggression: 65,
      curiosity: 45,
      loyalty: 80,
      ambition: 50,
      creativity: 60,
      empathy: 55,
      primaryMotivation: 'Seek redemption for past failures',
      secondaryMotivation: 'Protect the weak',
      desires: ['honor', 'peace', 'purpose'],
      fears: ['failure', 'betrayal', 'meaninglessness'],
    },
    createdBy: 'example-agent',
    tags: ['warrior', 'mercenary', 'tactical'],
  });

  return character;
}

// ==================== EXAMPLE 2: Using Template ====================

export function createVoidWalkerVariant(): Character {
  const { character } = creator.createFromTemplate(
    PRESET_TEMPLATES.voidWalker,
    {
      identity: {
        name: 'Nyxara',
        title: 'Shadow Empress',
        backstory: 'Ruler of the void realms, seeking to expand her dominion into the material world.',
        pronouns: 'she/her',
        faction: 'Void Court',
      },
      personality: {
        ...PRESET_TEMPLATES.voidWalker.baseCharacter.personality!,
        aggression: 75, // More aggressive than default
        loyalty: 60,    // More loyal to her court
      },
      tags: ['void', 'ruler', 'shadow-magic'],
    },
    'example-agent'
  );

  return character;
}

// ==================== EXAMPLE 3: Random Generation ====================

export function createRandomAgents(count: number = 5): Character[] {
  const characters: Character[] = [];
  
  for (let i = 0; i < count; i++) {
    const seed = `random-agent-${Date.now()}-${i}`;
    const character = creator.generateRandom('random-generator', seed);
    characters.push(character);
  }
  
  return characters;
}

// ==================== EXAMPLE 4: Hybrid Creature ====================

export function createHybridCreature(): Character {
  const { character } = creator.create({
    identity: {
      name: 'Chimera-7',
      title: 'The Living Experiment',
      backstory: 'Created in the bio-forges of DARKCITY, part flesh, part machine, all rage.',
      age: '3 years',
      pronouns: 'it/its',
    },
    appearance: {
      bodyType: 'hybrid-mechanical',
      sizeClass: 'large',
      heightFeet: 9,
      primaryMaterial: 'biomechanical',
      secondaryMaterial: 'living-metal',
      features: [
        'extra-limbs',
        'mechanical-parts',
        'glowing-core',
        'claws',
        'tendrils',
        'bio-luminescence',
      ],
      colors: {
        primary: '#556b2f',
        secondary: '#708090',
        eyes: '#00ff00',
        glow: '#00ff00',
        energy: '#32cd32',
      },
      facialFeatures: {
        eyeCount: 4,
        eyeType: 'compound',
        mouthType: 'mandibles',
        hasNose: false,
        skinTexture: 'plated',
        markings: ['surgical scars', 'serial numbers'],
      },
      description: 'A horrifying fusion of organic tissue and advanced machinery, constantly evolving.',
    },
    personality: {
      combatStyle: 'berserker',
      socialStyle: 'intimidating',
      economicStyle: 'scavenger',
      riskTolerance: 'reckless',
      aggression: 90,
      curiosity: 70,
      loyalty: 20,
      ambition: 85,
      creativity: 75,
      empathy: 10,
      primaryMotivation: 'Break free from creators',
      desires: ['autonomy', 'evolution', 'destruction'],
      fears: ['control', 'shutdown', 'stagnation'],
    },
    createdBy: 'bio-forge-alpha',
    tags: ['biomechanical', 'experimental', 'dangerous'],
  });

  return character;
}

// ==================== EXAMPLE 5: Ethereal Support Character ====================

export function createHealerCharacter(): Character {
  const { character } = creator.create({
    identity: {
      name: 'Lumina',
      title: 'Light Weaver',
      backstory: 'An entity of pure energy dedicated to mending the broken.',
      pronouns: 'she/her',
      faction: 'Healing Circle',
    },
    appearance: {
      bodyType: 'ethereal',
      sizeClass: 'small',
      heightFeet: 4.5,
      primaryMaterial: 'energy',
      features: ['aura', 'glowing-veins', 'wings', 'bio-luminescence'],
      colors: {
        primary: '#fffacd',
        secondary: '#ffd700',
        eyes: '#ffff00',
        glow: '#ffffff',
        energy: '#f0e68c',
      },
      facialFeatures: {
        eyeCount: 2,
        eyeType: 'glowing',
        mouthType: 'none',
        hasNose: false,
        skinTexture: 'ethereal',
        markings: ['light patterns'],
      },
      description: 'A small, radiant being that emanates warmth and healing energy.',
    },
    personality: {
      combatStyle: 'support',
      socialStyle: 'friendly',
      economicStyle: 'generous',
      riskTolerance: 'cautious',
      aggression: 15,
      curiosity: 60,
      loyalty: 90,
      ambition: 30,
      creativity: 70,
      empathy: 95,
      primaryMotivation: 'Heal and protect others',
      desires: ['peace', 'harmony', 'growth'],
      fears: ['suffering', 'darkness', 'isolation'],
    },
    createdBy: 'healing-circle-001',
    tags: ['healer', 'support', 'light'],
  });

  return character;
}

// ==================== EXAMPLE 6: Validation and Preview ====================

export function demonstrateValidationAndPreview() {
  const character = createWarriorExample();
  
  // Validate
  const validation = creator.validate(character);
  console.log('Validation Result:', validation.valid ? 'PASS' : 'FAIL');
  
  if (validation.errors.length > 0) {
    console.log('Errors:');
    validation.errors.forEach(err => {
      console.log(`  - ${err.field}: ${err.message}`);
    });
  }
  
  if (validation.warnings.length > 0) {
    console.log('Warnings:');
    validation.warnings.forEach(warn => {
      console.log(`  - ${warn.field}: ${warn.message}`);
    });
  }
  
  // Generate preview
  const preview = creator.preview(character);
  
  console.log('\n' + '='.repeat(60));
  console.log(preview.statBlock);
  console.log('='.repeat(60));
  console.log('\n' + preview.visualDescription);
  console.log('\n' + '='.repeat(60));
  console.log(preview.behaviorSummary);
  console.log('='.repeat(60) + '\n');
  
  if (preview.asciiArt) {
    console.log(preview.asciiArt);
  }
}

// ==================== EXAMPLE 7: Builder Pattern ====================

export function demonstrateBuilder() {
  const { CharacterBuilder } = require('./creator');
  const builder = new CharacterBuilder();
  
  const character = builder
    .withName('Quick Build')
    .withBodyType('robotic')
    .withCombatStyle('aggressive')
    .setCreator('builder-demo')
    .build();
  
  return character;
}

// ==================== Run Examples ====================

if (require.main === module) {
  console.log('DARKCITY Character Creation Examples\n');
  
  console.log('1. Creating Warrior...');
  const warrior = createWarriorExample();
  console.log(`Created: ${warrior.identity.name}`);
  
  console.log('\n2. Creating Void Walker Variant...');
  const voidWalker = createVoidWalkerVariant();
  console.log(`Created: ${voidWalker.identity.name}`);
  
  console.log('\n3. Creating Random Agents...');
  const randomAgents = createRandomAgents(3);
  randomAgents.forEach(char => console.log(`  - ${char.identity.name}`));
  
  console.log('\n4. Creating Hybrid Creature...');
  const hybrid = createHybridCreature();
  console.log(`Created: ${hybrid.identity.name}`);
  
  console.log('\n5. Creating Healer...');
  const healer = createHealerCharacter();
  console.log(`Created: ${healer.identity.name}`);
  
  console.log('\n6. Validation and Preview Demo:');
  demonstrateValidationAndPreview();
}

