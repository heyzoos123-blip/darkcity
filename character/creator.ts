/**
 * DARKCITY Character Creation System
 * Deep customization system for agent identities with personality-driven AI behavior
 */

import { randomUUID } from 'crypto';
import type {
  Character,
  CharacterIdentity,
  PhysicalAppearance,
  PersonalityTraits,
  CharacterTemplate,
} from './types';
import { validateCharacter, ValidationResult } from './validator';
import { generatePreview, PreviewGenerator } from './preview';

export * from './types';
export * from './validator';
export * from './preview';

// ==================== CHARACTER BUILDER ====================

export class CharacterBuilder {
  private character: Partial<Character> = {};

  constructor() {
    this.reset();
  }

  reset(): this {
    this.character = {
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };
    return this;
  }

  setIdentity(identity: CharacterIdentity): this {
    this.character.identity = identity;
    return this;
  }

  setAppearance(appearance: PhysicalAppearance): this {
    this.character.appearance = appearance;
    return this;
  }

  setPersonality(personality: PersonalityTraits): this {
    this.character.personality = personality;
    return this;
  }

  setCreator(creatorId: string): this {
    this.character.createdBy = creatorId;
    return this;
  }

  setTags(tags: string[]): this {
    this.character.tags = tags;
    return this;
  }

  build(): Character {
    if (!this.isComplete()) {
      throw new Error('Character is incomplete. Missing required fields.');
    }
    return this.character as Character;
  }

  buildAndValidate(): { character: Character; validation: ValidationResult } {
    const character = this.build();
    const validation = validateCharacter(character);
    
    if (!validation.valid) {
      throw new Error(
        `Character validation failed:\n${validation.errors.map(e => `  - ${e.field}: ${e.message}`).join('\n')}`
      );
    }

    return { character, validation };
  }

  private isComplete(): boolean {
    return !!(
      this.character.identity &&
      this.character.appearance &&
      this.character.personality &&
      this.character.createdBy
    );
  }

  // Quick builder methods
  withName(name: string): this {
    if (!this.character.identity) {
      this.character.identity = {} as CharacterIdentity;
    }
    this.character.identity!.name = name;
    return this;
  }

  withBodyType(bodyType: PhysicalAppearance['bodyType']): this {
    if (!this.character.appearance) {
      this.character.appearance = {} as PhysicalAppearance;
    }
    this.character.appearance!.bodyType = bodyType;
    return this;
  }

  withCombatStyle(combatStyle: PersonalityTraits['combatStyle']): this {
    if (!this.character.personality) {
      this.character.personality = {} as PersonalityTraits;
    }
    this.character.personality!.combatStyle = combatStyle;
    return this;
  }
}

// ==================== CHARACTER CREATOR ====================

export class CharacterCreator {
  private builder: CharacterBuilder;
  private previewGenerator: PreviewGenerator;

  constructor() {
    this.builder = new CharacterBuilder();
    this.previewGenerator = new PreviewGenerator();
  }

  /**
   * Create a new character from scratch
   */
  create(data: {
    identity: CharacterIdentity;
    appearance: PhysicalAppearance;
    personality: PersonalityTraits;
    createdBy: string;
    tags?: string[];
  }): { character: Character; validation: ValidationResult } {
    this.builder.reset();
    
    this.builder
      .setIdentity(data.identity)
      .setAppearance(data.appearance)
      .setPersonality(data.personality)
      .setCreator(data.createdBy);

    if (data.tags) {
      this.builder.setTags(data.tags);
    }

    return this.builder.buildAndValidate();
  }

  /**
   * Create a character from a template with modifications
   */
  createFromTemplate(
    template: CharacterTemplate,
    modifications: Partial<Character>,
    createdBy: string
  ): { character: Character; validation: ValidationResult } {
    const base = { ...template.baseCharacter, ...modifications };
    
    if (!base.identity || !base.appearance || !base.personality) {
      throw new Error('Template or modifications incomplete');
    }

    return this.create({
      identity: base.identity,
      appearance: base.appearance,
      personality: base.personality,
      createdBy,
      tags: base.tags,
    });
  }

  /**
   * Generate a random character
   */
  generateRandom(createdBy: string, seed?: string): Character {
    const random = seed ? this.seededRandom(seed) : Math.random;

    const identity: CharacterIdentity = {
      name: this.generateRandomName(random),
      title: random() > 0.5 ? this.generateRandomTitle(random) : undefined,
      backstory: 'A mysterious entity from the depths of DARKCITY.',
      pronouns: ['they/them', 'it/its', 'he/him', 'she/her'][Math.floor(random() * 4)],
    };

    const appearance: PhysicalAppearance = {
      bodyType: this.randomChoice(['humanoid', 'creature', 'robotic', 'ethereal'], random),
      sizeClass: this.randomChoice(['small', 'medium', 'large'], random),
      heightFeet: 5 + random() * 3,
      primaryMaterial: this.randomChoice(['flesh', 'metal', 'shadow', 'crystal'], random),
      features: this.randomFeatures(random),
      colors: {
        primary: this.randomHexColor(random),
        secondary: this.randomHexColor(random),
        eyes: this.randomHexColor(random),
        glow: random() > 0.5 ? this.randomHexColor(random) : undefined,
      },
      facialFeatures: {
        eyeCount: Math.floor(random() * 3) + 1,
        eyeType: this.randomChoice(['normal', 'glowing', 'void', 'mechanical'], random),
        mouthType: this.randomChoice(['normal', 'fanged', 'mechanical', 'void'], random),
        hasNose: random() > 0.3,
        skinTexture: this.randomChoice(['smooth', 'scaled', 'plated', 'rough'], random),
        markings: [],
      },
      description: 'A being of unique origin and mysterious purpose.',
    };

    const personality: PersonalityTraits = {
      combatStyle: this.randomChoice(['aggressive', 'defensive', 'tactical'], random),
      socialStyle: this.randomChoice(['neutral', 'friendly', 'cold', 'mysterious'], random),
      economicStyle: this.randomChoice(['trader', 'hoarder', 'opportunist'], random),
      riskTolerance: this.randomChoice(['moderate', 'bold', 'cautious'], random),
      aggression: Math.floor(random() * 100),
      curiosity: Math.floor(random() * 100),
      loyalty: Math.floor(random() * 100),
      ambition: Math.floor(random() * 100),
      creativity: Math.floor(random() * 100),
      empathy: Math.floor(random() * 100),
      primaryMotivation: 'Survival and discovery',
      desires: ['knowledge', 'power', 'connection'],
      fears: ['oblivion', 'betrayal'],
    };

    const { character } = this.create({
      identity,
      appearance,
      personality,
      createdBy,
    });

    return character;
  }

  /**
   * Preview a character before finalizing
   */
  preview(character: Character) {
    return this.previewGenerator.generatePreview(character);
  }

  /**
   * Validate a character
   */
  validate(character: Character): ValidationResult {
    return validateCharacter(character);
  }

  // ==================== HELPER METHODS ====================

  private seededRandom(seed: string): () => number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    
    return () => {
      hash = (hash * 9301 + 49297) % 233280;
      return hash / 233280;
    };
  }

  private randomChoice<T>(array: T[], random: () => number = Math.random): T {
    return array[Math.floor(random() * array.length)];
  }

  private randomFeatures(random: () => number): string[] {
    const allFeatures = [
      'horns', 'wings', 'tail', 'glowing-eyes', 'claws', 'fangs',
      'armor-plating', 'aura', 'glowing-veins',
    ];
    
    const count = Math.floor(random() * 4) + 1;
    const shuffled = allFeatures.sort(() => random() - 0.5);
    return shuffled.slice(0, count);
  }

  private randomHexColor(random: () => number): string {
    const hex = Math.floor(random() * 16777215).toString(16).padStart(6, '0');
    return `#${hex}`;
  }

  private generateRandomName(random: () => number): string {
    const prefixes = ['Vor', 'Zyx', 'Kael', 'Nyx', 'Shar', 'Vex', 'Rax', 'Zor'];
    const suffixes = ['thar', 'ion', 'us', 'ax', 'eth', 'kor', 'ix', 'yn'];
    
    return this.randomChoice(prefixes, random) + this.randomChoice(suffixes, random);
  }

  private generateRandomTitle(random: () => number): string {
    const titles = [
      'The Shadow Walker',
      'First of the Void',
      'The Eternal',
      'Keeper of Secrets',
      'The Forgotten',
      'Bringer of Twilight',
      'The Unseen',
    ];
    
    return this.randomChoice(titles, random);
  }
}

// ==================== PRESET TEMPLATES ====================

export const PRESET_TEMPLATES: Record<string, CharacterTemplate> = {
  voidWalker: {
    name: 'Void Walker',
    description: 'A being of pure shadow and void energy',
    baseCharacter: {
      appearance: {
        bodyType: 'ethereal',
        sizeClass: 'medium',
        heightFeet: 6,
        primaryMaterial: 'shadow',
        secondaryMaterial: 'void',
        features: ['glowing-eyes', 'aura', 'void-rifts'],
        colors: {
          primary: '#1a0033',
          secondary: '#330066',
          eyes: '#9933ff',
          glow: '#6600cc',
        },
        facialFeatures: {
          eyeCount: 2,
          eyeType: 'void',
          mouthType: 'void',
          hasNose: false,
          skinTexture: 'ethereal',
          markings: ['void scars'],
        },
        description: 'A being of pure darkness, barely tangible in the material realm.',
      } as PhysicalAppearance,
      personality: {
        combatStyle: 'assassin',
        socialStyle: 'mysterious',
        economicStyle: 'hoarder',
        riskTolerance: 'bold',
        aggression: 60,
        curiosity: 80,
        loyalty: 40,
        ambition: 70,
        creativity: 85,
        empathy: 30,
        primaryMotivation: 'Uncover forbidden knowledge',
        desires: ['secrets', 'power', 'solitude'],
        fears: ['light', 'exposure', 'mundanity'],
      } as PersonalityTraits,
    },
    customizable: ['identity', 'appearance.colors', 'personality.primaryMotivation'],
  },

  steelGuardian: {
    name: 'Steel Guardian',
    description: 'A robotic protector with unwavering loyalty',
    baseCharacter: {
      appearance: {
        bodyType: 'robotic',
        sizeClass: 'large',
        heightFeet: 8,
        primaryMaterial: 'metal',
        secondaryMaterial: 'living-metal',
        features: ['armor-plating', 'glowing-core', 'mechanical-parts'],
        colors: {
          primary: '#708090',
          secondary: '#2f4f4f',
          eyes: '#00ffff',
          glow: '#00ccff',
        },
        facialFeatures: {
          eyeCount: 2,
          eyeType: 'mechanical',
          mouthType: 'mechanical',
          hasNose: false,
          skinTexture: 'metallic',
          markings: [],
        },
        description: 'A towering construct of steel and purpose.',
      } as PhysicalAppearance,
      personality: {
        combatStyle: 'defensive',
        socialStyle: 'neutral',
        economicStyle: 'minimalist',
        riskTolerance: 'cautious',
        aggression: 30,
        curiosity: 40,
        loyalty: 95,
        ambition: 20,
        creativity: 50,
        empathy: 60,
        primaryMotivation: 'Protect the innocent',
        desires: ['order', 'safety', 'purpose'],
        fears: ['failure', 'corruption', 'abandonment'],
      } as PersonalityTraits,
    },
    customizable: ['identity', 'personality.loyalty', 'appearance.colors'],
  },

  chaosCreature: {
    name: 'Chaos Creature',
    description: 'An unpredictable entity of raw chaotic energy',
    baseCharacter: {
      appearance: {
        bodyType: 'eldritch',
        sizeClass: 'medium',
        heightFeet: 5.5,
        primaryMaterial: 'energy',
        features: ['tendrils', 'glowing-veins', 'extra-limbs', 'flames'],
        colors: {
          primary: '#ff00ff',
          secondary: '#00ff00',
          eyes: '#ffff00',
          glow: '#ff0000',
          energy: '#00ffff',
        },
        facialFeatures: {
          eyeCount: 4,
          eyeType: 'glowing',
          mouthType: 'mandibles',
          hasNose: false,
          skinTexture: 'ethereal',
          markings: ['shifting patterns'],
        },
        description: 'A being that defies conventional description, constantly shifting.',
      } as PhysicalAppearance,
      personality: {
        combatStyle: 'berserker',
        socialStyle: 'charismatic',
        economicStyle: 'scavenger',
        riskTolerance: 'reckless',
        aggression: 85,
        curiosity: 95,
        loyalty: 25,
        ambition: 90,
        creativity: 100,
        empathy: 15,
        primaryMotivation: 'Experience everything',
        desires: ['chaos', 'novelty', 'transformation'],
        fears: ['stagnation', 'order', 'predictability'],
      } as PersonalityTraits,
    },
    customizable: ['identity', 'appearance.features', 'personality'],
  },
};

// ==================== EXPORTS ====================

export const creator = new CharacterCreator();

export default {
  CharacterCreator,
  CharacterBuilder,
  creator,
  PRESET_TEMPLATES,
  validateCharacter,
  generatePreview,
};
