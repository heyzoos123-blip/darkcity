/**
 * DARKCITY Combat Engine
 * N64-style fighting game mechanics with turn-based combat
 * 
 * Features:
 * - 4 unique character classes
 * - Turn-based action system
 * - Combo mechanics
 * - Status effects
 * - Damage calculation with crits and resistances
 */

// ============================================================================
// TYPES & ENUMS
// ============================================================================

export enum CombatAction {
  LIGHT_ATTACK = 'LIGHT_ATTACK',
  HEAVY_ATTACK = 'HEAVY_ATTACK',
  SPECIAL = 'SPECIAL',
  DEFEND = 'DEFEND',
  DODGE = 'DODGE'
}

export enum CharacterClass {
  WARRIOR = 'WARRIOR',
  ASSASSIN = 'ASSASSIN',
  BERSERKER = 'BERSERKER',
  NECROMANCER = 'NECROMANCER'
}

export enum StatusEffect {
  BLEEDING = 'BLEEDING',      // DOT - 5% max HP per turn
  STUNNED = 'STUNNED',        // Skip next turn
  POISONED = 'POISONED',      // DOT - 3% max HP per turn, stacks
  BURNED = 'BURNED',          // DOT - 4% max HP + 10% defense reduction
  WEAKENED = 'WEAKENED',      // 30% damage reduction
  FORTIFIED = 'FORTIFIED',    // 40% damage resistance
  DRAINED = 'DRAINED',        // 20% max HP reduction
  ENRAGED = 'ENRAGED'         // 50% damage increase, 20% defense reduction
}

export interface StatusEffectInstance {
  effect: StatusEffect;
  duration: number;
  stacks?: number;
}

export interface CombatStats {
  maxHP: number;
  currentHP: number;
  attack: number;
  defense: number;
  speed: number;
  critChance: number;
  critMultiplier: number;
  dodgeChance: number;
}

export interface ComboState {
  count: number;
  multiplier: number;
  lastAction: CombatAction | null;
}

export interface ActionResult {
  success: boolean;
  damage: number;
  healing: number;
  statusApplied: StatusEffect[];
  statusRemoved: StatusEffect[];
  criticalHit: boolean;
  dodged: boolean;
  blocked: boolean;
  comboBonus: number;
  message: string;
}

export interface TurnResult {
  attacker: string;
  defender: string;
  action: CombatAction;
  result: ActionResult;
  attackerHP: number;
  defenderHP: number;
  attackerStatus: StatusEffectInstance[];
  defenderStatus: StatusEffectInstance[];
}

export interface BattleResult {
  winner: string;
  loser: string;
  turns: TurnResult[];
  finalStats: {
    [fighter: string]: CombatStats;
  };
}

// ============================================================================
// CHARACTER CLASS DEFINITIONS
// ============================================================================

export interface ClassConfig {
  name: CharacterClass;
  description: string;
  baseStats: Omit<CombatStats, 'currentHP'>;
  specialAbility: {
    name: string;
    description: string;
    cooldown: number;
    execute: (attacker: Fighter, defender: Fighter) => ActionResult;
  };
  passiveAbility: {
    name: string;
    description: string;
  };
}

export const CLASS_CONFIGS: Record<CharacterClass, ClassConfig> = {
  [CharacterClass.WARRIOR]: {
    name: CharacterClass.WARRIOR,
    description: 'Balanced tank with high HP and defense. Resilient in prolonged battles.',
    baseStats: {
      maxHP: 150,
      attack: 12,
      defense: 18,
      speed: 10,
      critChance: 0.10,
      critMultiplier: 1.5,
      dodgeChance: 0.15
    },
    specialAbility: {
      name: 'Shield Bash',
      description: 'Heavy attack that stuns opponent for 1 turn. Applies FORTIFIED to self.',
      cooldown: 3,
      execute: (attacker, defender) => {
        const baseDamage = attacker.stats.attack * 1.8;
        const damage = attacker.calculateDamage(baseDamage, defender);
        
        defender.applyStatusEffect(StatusEffect.STUNNED, 1);
        attacker.applyStatusEffect(StatusEffect.FORTIFIED, 2);
        
        defender.takeDamage(damage);
        
        return {
          success: true,
          damage,
          healing: 0,
          statusApplied: [StatusEffect.STUNNED, StatusEffect.FORTIFIED],
          statusRemoved: [],
          criticalHit: false,
          dodged: false,
          blocked: false,
          comboBonus: 0,
          message: `${attacker.name} unleashes SHIELD BASH! ${defender.name} is STUNNED!`
        };
      }
    },
    passiveAbility: {
      name: 'Unbreakable',
      description: 'Takes 25% less damage when HP is below 30%'
    }
  },

  [CharacterClass.ASSASSIN]: {
    name: CharacterClass.ASSASSIN,
    description: 'Glass cannon with extreme speed and critical damage. High risk, high reward.',
    baseStats: {
      maxHP: 90,
      attack: 18,
      defense: 8,
      speed: 20,
      critChance: 0.35,
      critMultiplier: 2.5,
      dodgeChance: 0.30
    },
    specialAbility: {
      name: 'Shadow Strike',
      description: 'Guaranteed critical hit with 3x damage. Applies BLEEDING.',
      cooldown: 4,
      execute: (attacker, defender) => {
        const baseDamage = attacker.stats.attack * 3.0;
        const damage = attacker.calculateDamage(baseDamage, defender);
        
        defender.applyStatusEffect(StatusEffect.BLEEDING, 3);
        defender.takeDamage(damage);
        
        return {
          success: true,
          damage,
          healing: 0,
          statusApplied: [StatusEffect.BLEEDING],
          statusRemoved: [],
          criticalHit: true,
          dodged: false,
          blocked: false,
          comboBonus: 0,
          message: `${attacker.name} strikes from the shadows! CRITICAL BLEEDING!`
        };
      }
    },
    passiveAbility: {
      name: 'Backstab',
      description: '+50% crit damage when combo count is 3 or higher'
    }
  },

  [CharacterClass.BERSERKER]: {
    name: CharacterClass.BERSERKER,
    description: 'Reckless damage dealer. Sacrifices HP for devastating attacks.',
    baseStats: {
      maxHP: 120,
      attack: 22,
      defense: 10,
      speed: 14,
      critChance: 0.20,
      critMultiplier: 2.0,
      dodgeChance: 0.10
    },
    specialAbility: {
      name: 'Blood Rage',
      description: 'Sacrifice 20% HP to enter ENRAGED state. Next attack deals 2.5x damage.',
      cooldown: 3,
      execute: (attacker, defender) => {
        const selfDamage = Math.floor(attacker.stats.maxHP * 0.20);
        attacker.takeDamage(selfDamage);
        
        attacker.applyStatusEffect(StatusEffect.ENRAGED, 2);
        
        return {
          success: true,
          damage: 0,
          healing: 0,
          statusApplied: [StatusEffect.ENRAGED],
          statusRemoved: [],
          criticalHit: false,
          dodged: false,
          blocked: false,
          comboBonus: 0,
          message: `${attacker.name} enters BLOOD RAGE! (-${selfDamage} HP, ENRAGED!)`
        };
      }
    },
    passiveAbility: {
      name: 'Unstoppable',
      description: 'Gains +5% attack for each 10% HP lost'
    }
  },

  [CharacterClass.NECROMANCER]: {
    name: CharacterClass.NECROMANCER,
    description: 'Dark mage with life drain and debilitating curses. Sustains through attrition.',
    baseStats: {
      maxHP: 100,
      attack: 14,
      defense: 12,
      speed: 12,
      critChance: 0.15,
      critMultiplier: 1.8,
      dodgeChance: 0.20
    },
    specialAbility: {
      name: 'Soul Harvest',
      description: 'Drain 25% of opponent max HP. Heal for 50% of damage dealt. Apply DRAINED.',
      cooldown: 5,
      execute: (attacker, defender) => {
        const damage = Math.floor(defender.stats.maxHP * 0.25);
        const healing = Math.floor(damage * 0.5);
        
        defender.takeDamage(damage);
        attacker.heal(healing);
        
        defender.applyStatusEffect(StatusEffect.DRAINED, 3);
        defender.applyStatusEffect(StatusEffect.POISONED, 4);
        
        return {
          success: true,
          damage,
          healing,
          statusApplied: [StatusEffect.DRAINED, StatusEffect.POISONED],
          statusRemoved: [],
          criticalHit: false,
          dodged: false,
          blocked: false,
          comboBonus: 0,
          message: `${attacker.name} harvests ${defender.name}'s soul! (+${healing} HP, DRAINED + POISONED)`
        };
      }
    },
    passiveAbility: {
      name: 'Dark Pact',
      description: 'Heal for 15% of damage dealt with all attacks'
    }
  }
};

// ============================================================================
// FIGHTER CLASS
// ============================================================================

export class Fighter {
  public name: string;
  public characterClass: CharacterClass;
  public stats: CombatStats;
  public statusEffects: StatusEffectInstance[] = [];
  public combo: ComboState = { count: 0, multiplier: 1.0, lastAction: null };
  public specialCooldown: number = 0;
  
  private classConfig: ClassConfig;

  constructor(name: string, characterClass: CharacterClass) {
    this.name = name;
    this.characterClass = characterClass;
    this.classConfig = CLASS_CONFIGS[characterClass];
    
    // Initialize stats from class config
    this.stats = {
      ...this.classConfig.baseStats,
      currentHP: this.classConfig.baseStats.maxHP
    };
  }

  // ============================================================================
  // COMBAT ACTIONS
  // ============================================================================

  public executeAction(action: CombatAction, defender: Fighter): ActionResult {
    // Check if stunned
    if (this.hasStatusEffect(StatusEffect.STUNNED)) {
      return {
        success: false,
        damage: 0,
        healing: 0,
        statusApplied: [],
        statusRemoved: [],
        criticalHit: false,
        dodged: false,
        blocked: false,
        comboBonus: 0,
        message: `${this.name} is STUNNED and cannot act!`
      };
    }

    switch (action) {
      case CombatAction.LIGHT_ATTACK:
        return this.lightAttack(defender);
      case CombatAction.HEAVY_ATTACK:
        return this.heavyAttack(defender);
      case CombatAction.SPECIAL:
        return this.specialAttack(defender);
      case CombatAction.DEFEND:
        return this.defend();
      case CombatAction.DODGE:
        return this.dodge();
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private lightAttack(defender: Fighter): ActionResult {
    // Light attack: fast, builds combo, moderate damage
    if (this.tryDodge(defender)) {
      this.breakCombo();
      return {
        success: false,
        damage: 0,
        healing: 0,
        statusApplied: [],
        statusRemoved: [],
        criticalHit: false,
        dodged: true,
        blocked: false,
        comboBonus: 0,
        message: `${defender.name} dodged ${this.name}'s light attack!`
      };
    }

    const baseDamage = this.stats.attack * 0.8;
    const isCrit = this.rollCritical();
    const damage = this.calculateDamage(baseDamage, defender, isCrit);
    
    this.buildCombo(CombatAction.LIGHT_ATTACK);
    const comboBonus = (this.combo.multiplier - 1) * 100;
    
    defender.takeDamage(damage);
    const healing = this.applyLifesteal(damage);

    return {
      success: true,
      damage,
      healing,
      statusApplied: [],
      statusRemoved: [],
      criticalHit: isCrit,
      dodged: false,
      blocked: false,
      comboBonus,
      message: `${this.name} lands a light attack! ${isCrit ? 'CRITICAL! ' : ''}(${damage} damage)${comboBonus > 0 ? ` [COMBO x${this.combo.count}]` : ''}`
    };
  }

  private heavyAttack(defender: Fighter): ActionResult {
    // Heavy attack: slower, high damage, risky (breaks combo if blocked/dodged)
    if (this.tryDodge(defender)) {
      this.breakCombo();
      return {
        success: false,
        damage: 0,
        healing: 0,
        statusApplied: [],
        statusRemoved: [],
        criticalHit: false,
        dodged: true,
        blocked: false,
        comboBonus: 0,
        message: `${defender.name} dodged ${this.name}'s heavy attack! Combo broken!`
      };
    }

    const baseDamage = this.stats.attack * 1.8;
    const isCrit = this.rollCritical();
    const damage = this.calculateDamage(baseDamage, defender, isCrit);
    
    const comboBonus = (this.combo.multiplier - 1) * 100;
    this.buildCombo(CombatAction.HEAVY_ATTACK);
    
    defender.takeDamage(damage);
    const healing = this.applyLifesteal(damage);

    // 30% chance to apply weakened
    const statusApplied: StatusEffect[] = [];
    if (Math.random() < 0.3) {
      defender.applyStatusEffect(StatusEffect.WEAKENED, 2);
      statusApplied.push(StatusEffect.WEAKENED);
    }

    return {
      success: true,
      damage,
      healing,
      statusApplied,
      statusRemoved: [],
      criticalHit: isCrit,
      dodged: false,
      blocked: false,
      comboBonus,
      message: `${this.name} delivers a HEAVY ATTACK! ${isCrit ? 'CRITICAL! ' : ''}(${damage} damage)${statusApplied.length > 0 ? ' WEAKENED!' : ''}`
    };
  }

  private specialAttack(defender: Fighter): ActionResult {
    if (this.specialCooldown > 0) {
      return {
        success: false,
        damage: 0,
        healing: 0,
        statusApplied: [],
        statusRemoved: [],
        criticalHit: false,
        dodged: false,
        blocked: false,
        comboBonus: 0,
        message: `${this.name}'s special is on cooldown! (${this.specialCooldown} turns)`
      };
    }

    this.specialCooldown = this.classConfig.specialAbility.cooldown;
    this.breakCombo(); // Special moves reset combo
    
    return this.classConfig.specialAbility.execute(this, defender);
  }

  private defend(): ActionResult {
    this.applyStatusEffect(StatusEffect.FORTIFIED, 1);
    this.breakCombo();
    
    return {
      success: true,
      damage: 0,
      healing: 0,
      statusApplied: [StatusEffect.FORTIFIED],
      statusRemoved: [],
      criticalHit: false,
      dodged: false,
      blocked: false,
      comboBonus: 0,
      message: `${this.name} takes a defensive stance! (FORTIFIED)`
    };
  }

  private dodge(): ActionResult {
    // Dodge increases dodge chance for next turn significantly
    const dodgeBoost = this.stats.dodgeChance * 2;
    this.stats.dodgeChance = Math.min(0.8, this.stats.dodgeChance + dodgeBoost);
    
    return {
      success: true,
      damage: 0,
      healing: 0,
      statusApplied: [],
      statusRemoved: [],
      criticalHit: false,
      dodged: false,
      blocked: false,
      comboBonus: 0,
      message: `${this.name} prepares to evade! (Dodge +${Math.round(dodgeBoost * 100)}%)`
    };
  }

  // ============================================================================
  // DAMAGE CALCULATION
  // ============================================================================

  public calculateDamage(baseDamage: number, defender: Fighter, forceCrit: boolean = false): number {
    let damage = baseDamage;

    // Apply combo multiplier
    damage *= this.combo.multiplier;

    // Apply attacker status modifiers
    if (this.hasStatusEffect(StatusEffect.ENRAGED)) {
      damage *= 1.5;
    }
    if (this.hasStatusEffect(StatusEffect.WEAKENED)) {
      damage *= 0.7;
    }

    // Apply passive bonuses
    damage = this.applyPassiveDamageBonus(damage);

    // Critical hit
    const isCrit = forceCrit || this.rollCritical();
    if (isCrit) {
      let critMultiplier = this.stats.critMultiplier;
      
      // Assassin passive: +50% crit damage at 3+ combo
      if (this.characterClass === CharacterClass.ASSASSIN && this.combo.count >= 3) {
        critMultiplier += 0.5;
      }
      
      damage *= critMultiplier;
    }

    // Defender defense calculation
    const defenseReduction = defender.stats.defense / (defender.stats.defense + 100);
    damage *= (1 - defenseReduction);

    // Defender status modifiers
    if (defender.hasStatusEffect(StatusEffect.FORTIFIED)) {
      damage *= 0.6;
    }
    if (defender.hasStatusEffect(StatusEffect.BURNED)) {
      damage *= 1.1; // Burned reduces defense
    }

    // Warrior passive: 25% damage reduction below 30% HP
    if (defender.characterClass === CharacterClass.WARRIOR) {
      const hpPercent = defender.stats.currentHP / defender.stats.maxHP;
      if (hpPercent < 0.3) {
        damage *= 0.75;
      }
    }

    return Math.max(1, Math.floor(damage));
  }

  private applyPassiveDamageBonus(damage: number): number {
    // Berserker: +5% attack per 10% HP lost
    if (this.characterClass === CharacterClass.BERSERKER) {
      const hpLost = 1 - (this.stats.currentHP / this.stats.maxHP);
      const bonus = Math.floor(hpLost * 10) * 0.05;
      damage *= (1 + bonus);
    }

    return damage;
  }

  private rollCritical(): boolean {
    return Math.random() < this.stats.critChance;
  }

  private tryDodge(defender: Fighter): boolean {
    return Math.random() < defender.stats.dodgeChance;
  }

  // ============================================================================
  // COMBO SYSTEM
  // ============================================================================

  private buildCombo(action: CombatAction): void {
    if (this.combo.lastAction === null || action === this.combo.lastAction) {
      this.combo.count++;
      this.combo.lastAction = action;
      
      // Combo multiplier increases by 10% per hit, caps at 5 hits (50% bonus)
      this.combo.multiplier = Math.min(1.5, 1 + (this.combo.count * 0.1));
    } else {
      // Different action, start new combo
      this.combo.count = 1;
      this.combo.multiplier = 1.0;
      this.combo.lastAction = action;
    }
  }

  public breakCombo(): void {
    this.combo.count = 0;
    this.combo.multiplier = 1.0;
    this.combo.lastAction = null;
  }

  // ============================================================================
  // STATUS EFFECTS
  // ============================================================================

  public applyStatusEffect(effect: StatusEffect, duration: number): void {
    const existing = this.statusEffects.find(e => e.effect === effect);
    
    if (existing) {
      // Refresh duration or stack
      if (effect === StatusEffect.POISONED) {
        existing.stacks = (existing.stacks || 1) + 1;
        existing.duration = Math.max(existing.duration, duration);
      } else {
        existing.duration = Math.max(existing.duration, duration);
      }
    } else {
      this.statusEffects.push({
        effect,
        duration,
        stacks: effect === StatusEffect.POISONED ? 1 : undefined
      });
    }
  }

  public hasStatusEffect(effect: StatusEffect): boolean {
    return this.statusEffects.some(e => e.effect === effect);
  }

  public processStatusEffects(): string[] {
    const messages: string[] = [];
    
    for (const status of [...this.statusEffects]) {
      let damage = 0;
      
      switch (status.effect) {
        case StatusEffect.BLEEDING:
          damage = Math.floor(this.stats.maxHP * 0.05);
          this.takeDamage(damage);
          messages.push(`${this.name} is BLEEDING! (-${damage} HP)`);
          break;
          
        case StatusEffect.POISONED:
          damage = Math.floor(this.stats.maxHP * 0.03 * (status.stacks || 1));
          this.takeDamage(damage);
          messages.push(`${this.name} is POISONED! (-${damage} HP) [x${status.stacks}]`);
          break;
          
        case StatusEffect.BURNED:
          damage = Math.floor(this.stats.maxHP * 0.04);
          this.takeDamage(damage);
          messages.push(`${this.name} is BURNING! (-${damage} HP)`);
          break;
          
        case StatusEffect.STUNNED:
          messages.push(`${this.name} is STUNNED!`);
          break;
          
        case StatusEffect.DRAINED:
          messages.push(`${this.name} is DRAINED! (-20% max HP)`);
          break;
      }
    }
    
    return messages;
  }

  public tickStatusDurations(): void {
    for (const status of [...this.statusEffects]) {
      status.duration--;
      
      if (status.duration <= 0) {
        this.statusEffects = this.statusEffects.filter(e => e !== status);
      }
    }
  }

  // ============================================================================
  // HP MANAGEMENT
  // ============================================================================

  public takeDamage(amount: number): void {
    this.stats.currentHP = Math.max(0, this.stats.currentHP - amount);
  }

  public heal(amount: number): void {
    this.stats.currentHP = Math.min(this.stats.maxHP, this.stats.currentHP + amount);
  }

  private applyLifesteal(damage: number): number {
    // Necromancer passive: 15% lifesteal
    if (this.characterClass === CharacterClass.NECROMANCER) {
      const healing = Math.floor(damage * 0.15);
      this.heal(healing);
      return healing;
    }
    return 0;
  }

  public isAlive(): boolean {
    return this.stats.currentHP > 0;
  }

  public tickCooldowns(): void {
    if (this.specialCooldown > 0) {
      this.specialCooldown--;
    }
  }

  // ============================================================================
  // STAT ADJUSTMENTS FOR STATUS EFFECTS
  // ============================================================================

  public getEffectiveStats(): CombatStats {
    const stats = { ...this.stats };
    
    // Apply DRAINED effect
    if (this.hasStatusEffect(StatusEffect.DRAINED)) {
      stats.maxHP = Math.floor(stats.maxHP * 0.8);
      stats.currentHP = Math.min(stats.currentHP, stats.maxHP);
    }
    
    // Apply ENRAGED effect
    if (this.hasStatusEffect(StatusEffect.ENRAGED)) {
      stats.attack = Math.floor(stats.attack * 1.5);
      stats.defense = Math.floor(stats.defense * 0.8);
    }
    
    return stats;
  }
}

// ============================================================================
// COMBAT ENGINE
// ============================================================================

export class CombatEngine {
  private fighter1: Fighter;
  private fighter2: Fighter;
  private turns: TurnResult[] = [];
  private maxTurns: number;

  constructor(fighter1: Fighter, fighter2: Fighter, maxTurns: number = 50) {
    this.fighter1 = fighter1;
    this.fighter2 = fighter2;
    this.maxTurns = maxTurns;
  }

  /**
   * Execute a single turn of combat
   */
  public executeTurn(action1: CombatAction, action2: CombatAction): TurnResult[] {
    const results: TurnResult[] = [];
    
    // Process DOT damage at START of turn
    this.fighter1.processStatusEffects();
    this.fighter2.processStatusEffects();
    
    // Determine turn order based on speed
    const fighters = this.determineTurnOrder();
    const actions = fighters[0] === this.fighter1 ? [action1, action2] : [action2, action1];
    
    for (let i = 0; i < 2; i++) {
      const attacker = fighters[i];
      const defender = fighters[1 - i];
      const action = actions[i];
      
      // Execute action
      const result = attacker.executeAction(action, defender);
      
      // Record turn result
      results.push({
        attacker: attacker.name,
        defender: defender.name,
        action,
        result,
        attackerHP: attacker.stats.currentHP,
        defenderHP: defender.stats.currentHP,
        attackerStatus: [...attacker.statusEffects],
        defenderStatus: [...defender.statusEffects]
      });
      
      // Check if defender is defeated
      if (!defender.isAlive()) {
        break;
      }
    }
    
    // Tick status durations and cooldowns at END of turn
    this.fighter1.tickStatusDurations();
    this.fighter2.tickStatusDurations();
    this.fighter1.tickCooldowns();
    this.fighter2.tickCooldowns();
    
    this.turns.push(...results);
    return results;
  }

  /**
   * Determine turn order based on speed stat
   */
  private determineTurnOrder(): [Fighter, Fighter] {
    if (this.fighter1.stats.speed > this.fighter2.stats.speed) {
      return [this.fighter1, this.fighter2];
    } else if (this.fighter2.stats.speed > this.fighter1.stats.speed) {
      return [this.fighter2, this.fighter1];
    } else {
      // Equal speed, random order
      return Math.random() < 0.5 ? [this.fighter1, this.fighter2] : [this.fighter2, this.fighter1];
    }
  }

  /**
   * Run a complete battle simulation
   */
  public runBattle(getActions: (f1: Fighter, f2: Fighter, turn: number) => [CombatAction, CombatAction]): BattleResult {
    let turn = 0;
    
    while (this.fighter1.isAlive() && this.fighter2.isAlive() && turn < this.maxTurns) {
      const [action1, action2] = getActions(this.fighter1, this.fighter2, turn);
      this.executeTurn(action1, action2);
      turn++;
    }
    
    // Determine winner
    let winner: string;
    let loser: string;
    
    if (this.fighter1.isAlive() && !this.fighter2.isAlive()) {
      winner = this.fighter1.name;
      loser = this.fighter2.name;
    } else if (this.fighter2.isAlive() && !this.fighter1.isAlive()) {
      winner = this.fighter2.name;
      loser = this.fighter1.name;
    } else if (this.fighter1.stats.currentHP > this.fighter2.stats.currentHP) {
      winner = this.fighter1.name;
      loser = this.fighter2.name;
    } else {
      winner = this.fighter2.name;
      loser = this.fighter1.name;
    }
    
    return {
      winner,
      loser,
      turns: this.turns,
      finalStats: {
        [this.fighter1.name]: this.fighter1.stats,
        [this.fighter2.name]: this.fighter2.stats
      }
    };
  }

  /**
   * Get current battle state
   */
  public getState() {
    return {
      fighter1: {
        name: this.fighter1.name,
        class: this.fighter1.characterClass,
        stats: this.fighter1.getEffectiveStats(),
        statusEffects: this.fighter1.statusEffects,
        combo: this.fighter1.combo,
        specialCooldown: this.fighter1.specialCooldown
      },
      fighter2: {
        name: this.fighter2.name,
        class: this.fighter2.characterClass,
        stats: this.fighter2.getEffectiveStats(),
        statusEffects: this.fighter2.statusEffects,
        combo: this.fighter2.combo,
        specialCooldown: this.fighter2.specialCooldown
      },
      turnCount: this.turns.length
    };
  }
}

// ============================================================================
// EXAMPLE AI STRATEGY FUNCTIONS
// ============================================================================

/**
 * Simple aggressive AI - favors attacks
 */
export function aggressiveStrategy(fighter: Fighter, opponent: Fighter): CombatAction {
  // Use special if available
  if (fighter.specialCooldown === 0) {
    return CombatAction.SPECIAL;
  }
  
  // Heavy attack if opponent is low HP
  if (opponent.stats.currentHP < opponent.stats.maxHP * 0.3) {
    return CombatAction.HEAVY_ATTACK;
  }
  
  // Defend if low HP
  if (fighter.stats.currentHP < fighter.stats.maxHP * 0.25) {
    return CombatAction.DEFEND;
  }
  
  // 60% light, 40% heavy
  return Math.random() < 0.6 ? CombatAction.LIGHT_ATTACK : CombatAction.HEAVY_ATTACK;
}

/**
 * Defensive AI - prioritizes survival
 */
export function defensiveStrategy(fighter: Fighter, opponent: Fighter): CombatAction {
  // Defend if low HP
  if (fighter.stats.currentHP < fighter.stats.maxHP * 0.4) {
    return CombatAction.DEFEND;
  }
  
  // Use special if available and safe
  if (fighter.specialCooldown === 0 && fighter.stats.currentHP > fighter.stats.maxHP * 0.5) {
    return CombatAction.SPECIAL;
  }
  
  // Dodge if opponent has high combo
  if (opponent.combo.count >= 3) {
    return CombatAction.DODGE;
  }
  
  // Prefer light attacks to build combo safely
  return CombatAction.LIGHT_ATTACK;
}

/**
 * Balanced AI - adapts to situation
 */
export function balancedStrategy(fighter: Fighter, opponent: Fighter): CombatAction {
  // Special when available and beneficial
  if (fighter.specialCooldown === 0 && fighter.stats.currentHP > fighter.stats.maxHP * 0.3) {
    return CombatAction.SPECIAL;
  }
  
  // Defend if critically low
  if (fighter.stats.currentHP < fighter.stats.maxHP * 0.2) {
    return CombatAction.DEFEND;
  }
  
  // Dodge opponent's combo
  if (opponent.combo.count >= 4) {
    return CombatAction.DODGE;
  }
  
  // Go for kill with heavy attack
  if (opponent.stats.currentHP < fighter.stats.attack * 2) {
    return CombatAction.HEAVY_ATTACK;
  }
  
  // Build combo with lights, finish with heavy
  if (fighter.combo.count < 3) {
    return CombatAction.LIGHT_ATTACK;
  } else {
    return CombatAction.HEAVY_ATTACK;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a fighter with randomized name
 */
export function createFighter(characterClass: CharacterClass, name?: string): Fighter {
  const defaultNames = {
    [CharacterClass.WARRIOR]: ['Ironclad', 'Vanguard', 'Bulwark', 'Sentinel'],
    [CharacterClass.ASSASSIN]: ['Shadowblade', 'Reaper', 'Phantom', 'Nightstalk'],
    [CharacterClass.BERSERKER]: ['Bloodaxe', 'Ravager', 'Skullcrusher', 'Warbringer'],
    [CharacterClass.NECROMANCER]: ['Darkmaw', 'Soulrender', 'Lichking', 'Bonecaller']
  };
  
  const fighterName = name || defaultNames[characterClass][Math.floor(Math.random() * 4)];
  return new Fighter(fighterName, characterClass);
}

/**
 * Format battle results for display
 */
export function formatBattleResults(result: BattleResult): string {
  let output = `\n${'='.repeat(60)}\n`;
  output += `BATTLE RESULTS: ${result.winner} DEFEATS ${result.loser}!\n`;
  output += `${'='.repeat(60)}\n\n`;
  
  output += `Total Turns: ${result.turns.length}\n\n`;
  
  output += `Final Stats:\n`;
  for (const [name, stats] of Object.entries(result.finalStats)) {
    output += `  ${name}: ${stats.currentHP}/${stats.maxHP} HP\n`;
  }
  
  output += `\n${'='.repeat(60)}\n`;
  
  return output;
}

/**
 * Run a quick demo battle
 */
export function runDemoBattle(): BattleResult {
  const warrior = createFighter(CharacterClass.WARRIOR, 'Sir Galahad');
  const assassin = createFighter(CharacterClass.ASSASSIN, 'Nyx');
  
  const engine = new CombatEngine(warrior, assassin);
  
  const result = engine.runBattle((f1, f2, turn) => {
    return [
      balancedStrategy(f1, f2),
      aggressiveStrategy(f2, f1)
    ];
  });
  
  console.log(formatBattleResults(result));
  
  return result;
}
