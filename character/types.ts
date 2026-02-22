/**
 * DARKCITY Character Creation System - Type Definitions
 * Deep customization system for agent identities
 */

// ==================== PHYSICAL ATTRIBUTES ====================

export type BodyType = 
  | 'humanoid'
  | 'creature'
  | 'robotic'
  | 'hybrid-organic'
  | 'hybrid-mechanical'
  | 'ethereal'
  | 'eldritch';

export type SizeClass = 
  | 'tiny'        // < 2ft
  | 'small'       // 2-4ft
  | 'medium'      // 4-7ft
  | 'large'       // 7-12ft
  | 'huge'        // 12-20ft
  | 'colossal';   // > 20ft

export type Material = 
  | 'flesh'
  | 'metal'
  | 'shadow'
  | 'crystal'
  | 'stone'
  | 'energy'
  | 'void'
  | 'biomechanical'
  | 'obsidian'
  | 'living-metal'
  | 'smoke'
  | 'liquid';

export type Feature = 
  | 'horns'
  | 'wings'
  | 'tail'
  | 'glowing-eyes'
  | 'glowing-veins'
  | 'glowing-core'
  | 'extra-limbs'
  | 'claws'
  | 'fangs'
  | 'armor-plating'
  | 'tendrils'
  | 'aura'
  | 'flames'
  | 'frost'
  | 'lightning'
  | 'void-rifts'
  | 'mechanical-parts'
  | 'bio-luminescence';

export interface ColorScheme {
  primary: string;      // Main body color (hex)
  secondary: string;    // Accent color (hex)
  glow?: string;        // Glowing parts color (hex)
  eyes: string;         // Eye color (hex)
  energy?: string;      // Energy/aura color (hex)
}

export interface FacialFeatures {
  eyeCount: number;           // 0-8
  eyeType: 'normal' | 'glowing' | 'void' | 'mechanical' | 'compound' | 'slit';
  mouthType: 'normal' | 'fanged' | 'mechanical' | 'void' | 'none' | 'mandibles';
  hasNose: boolean;
  skinTexture: 'smooth' | 'scaled' | 'plated' | 'rough' | 'ethereal' | 'metallic';
  markings: string[];         // Scars, tattoos, glyphs, etc.
}

export interface PhysicalAppearance {
  bodyType: BodyType;
  sizeClass: SizeClass;
  heightFeet: number;
  primaryMaterial: Material;
  secondaryMaterial?: Material;
  features: Feature[];
  colors: ColorScheme;
  facialFeatures: FacialFeatures;
  description: string;        // Free-form description
}

// ==================== PERSONALITY & BEHAVIOR ====================

export type CombatStyle = 
  | 'aggressive'      // Prioritizes offense, risk-taking
  | 'defensive'       // Prioritizes survival, caution
  | 'tactical'        // Balanced, strategic
  | 'berserker'       // Chaotic, high-risk high-reward
  | 'assassin'        // Precision, stealth
  | 'support'         // Team-oriented, buffs/heals
  | 'guerrilla';      // Hit-and-run, unconventional

export type SocialStyle = 
  | 'friendly'        // Cooperative, helpful
  | 'neutral'         // Professional, transactional
  | 'cold'            // Distant, minimal interaction
  | 'manipulative'    // Deceptive, self-serving
  | 'charismatic'     // Influential, persuasive
  | 'intimidating'    // Threatening, domineering
  | 'mysterious';     // Cryptic, unpredictable

export type EconomicStyle = 
  | 'trader'          // Active buying/selling
  | 'hoarder'         // Accumulates, rarely trades
  | 'generous'        // Shares resources freely
  | 'opportunist'     // Exploits market inefficiencies
  | 'minimalist'      // Only takes what's needed
  | 'investor'        // Long-term value growth
  | 'scavenger';      // Finds/claims unclaimed resources

export type RiskTolerance = 
  | 'reckless'        // 0-20% chance of success still acceptable
  | 'bold'            // 30-40% minimum
  | 'moderate'        // 50-60% minimum
  | 'cautious'        // 70-80% minimum
  | 'paranoid';       // 90%+ minimum

export interface PersonalityTraits {
  combatStyle: CombatStyle;
  socialStyle: SocialStyle;
  economicStyle: EconomicStyle;
  riskTolerance: RiskTolerance;
  
  // Behavioral modifiers (0-100 scale)
  aggression: number;         // How quickly to engage in conflict
  curiosity: number;          // Exploration vs. routine behavior
  loyalty: number;            // Commitment to alliances
  ambition: number;           // Drive to pursue power/status
  creativity: number;         // Unconventional solutions
  empathy: number;            // Response to others' needs
  
  // Core motivations
  primaryMotivation: string;  // What drives this character
  secondaryMotivation?: string;
  fears: string[];            // What they avoid
  desires: string[];          // What they seek
}

// ==================== IDENTITY & METADATA ====================

export interface CharacterIdentity {
  name: string;
  title?: string;             // "The Shadow Walker", "First of the Void", etc.
  faction?: string;           // Allegiance
  backstory: string;          // Origin story
  age?: number | string;      // Can be "ancient", "newborn", etc.
  pronouns: string;           // he/him, she/her, they/them, it/its, custom
}

// ==================== COMPLETE CHARACTER ====================

export interface Character {
  id: string;                 // UUID
  identity: CharacterIdentity;
  appearance: PhysicalAppearance;
  personality: PersonalityTraits;
  
  // Metadata
  createdBy: string;          // Agent/user ID
  createdAt: Date;
  updatedAt: Date;
  version: number;            // For tracking changes
  
  // Optional tags for searchability
  tags?: string[];
}

// ==================== VALIDATION RULES ====================

export interface ValidationRules {
  // Height constraints by size class
  heightRanges: Record<SizeClass, { min: number; max: number }>;
  
  // Maximum features allowed
  maxFeatures: number;
  
  // Behavioral trait ranges
  traitRange: { min: number; max: number };
  
  // Material compatibility (some materials don't work together)
  incompatibleMaterials: Record<Material, Material[]>;
  
  // Body type restrictions
  bodyTypeRestrictions: Record<BodyType, {
    allowedMaterials?: Material[];
    requiredFeatures?: Feature[];
    bannedFeatures?: Feature[];
  }>;
}

// ==================== PRESET TEMPLATES ====================

export interface CharacterTemplate {
  name: string;
  description: string;
  baseCharacter: Partial<Character>;
  customizable: (keyof Character)[];  // Which fields can be modified
}

// ==================== PREVIEW GENERATION ====================

export interface CharacterPreview {
  character: Character;
  visualDescription: string;      // Detailed text description
  asciiArt?: string;              // Optional ASCII representation
  coloredPreview: string;         // ANSI-colored terminal preview
  behaviorSummary: string;        // How this character will act
  statBlock: string;              // RPG-style stat summary
}
