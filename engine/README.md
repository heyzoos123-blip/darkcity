# DARKCITY Combat Engine

N64-style turn-based fighting game mechanics with combo system, status effects, and strategic depth.

## Features

### 🎮 Combat System
- **Turn-based** with speed-based initiative
- **5 action types**: Light Attack, Heavy Attack, Special, Defend, Dodge
- **Combo system**: Build up to 5-hit combos for 50% bonus damage
- **Critical hits** with class-specific multipliers
- **Dodge/Block** mechanics for defensive play

### ⚔️ Character Classes

#### Warrior
- **Role**: Tank / Bruiser
- **HP**: 150 | **Attack**: 12 | **Defense**: 18 | **Speed**: 10
- **Special**: Shield Bash - Stuns opponent, applies Fortified
- **Passive**: Unbreakable - 25% damage reduction below 30% HP

#### Assassin
- **Role**: Glass Cannon / Burst Damage
- **HP**: 90 | **Attack**: 18 | **Defense**: 8 | **Speed**: 20
- **Special**: Shadow Strike - Guaranteed 3x crit + Bleeding
- **Passive**: Backstab - +50% crit damage at 3+ combo

#### Berserker
- **Role**: High-Risk Damage Dealer
- **HP**: 120 | **Attack**: 22 | **Defense**: 10 | **Speed**: 14
- **Special**: Blood Rage - Sacrifice 20% HP for Enraged state
- **Passive**: Unstoppable - +5% attack per 10% HP lost

#### Necromancer
- **Role**: DOT / Sustain Mage
- **HP**: 100 | **Attack**: 14 | **Defense**: 12 | **Speed**: 12
- **Special**: Soul Harvest - 25% max HP drain, applies Drained + Poisoned
- **Passive**: Dark Pact - 15% lifesteal on all attacks

### 🩸 Status Effects

| Effect | Description |
|--------|-------------|
| **BLEEDING** | 5% max HP damage per turn |
| **POISONED** | 3% max HP per turn (stacks) |
| **BURNED** | 4% max HP + 10% defense reduction |
| **STUNNED** | Skip next turn |
| **WEAKENED** | 30% damage reduction |
| **FORTIFIED** | 40% damage resistance |
| **DRAINED** | 20% max HP reduction |
| **ENRAGED** | 50% damage increase, 20% defense reduction |

## Usage

### Basic Battle

```typescript
import { Fighter, CombatEngine, CombatAction, CharacterClass } from './combat-classes';

// Create fighters
const warrior = new Fighter('Sir Galahad', CharacterClass.WARRIOR);
const assassin = new Fighter('Nyx', CharacterClass.ASSASSIN);

// Initialize combat
const engine = new CombatEngine(warrior, assassin);

// Execute turn-by-turn
const results = engine.executeTurn(
  CombatAction.LIGHT_ATTACK,  // Warrior action
  CombatAction.DODGE           // Assassin action
);

console.log(results[0].result.message);
```

### AI Battle

```typescript
import { aggressiveStrategy, balancedStrategy } from './combat-classes';

const result = engine.runBattle((fighter1, fighter2, turn) => {
  return [
    aggressiveStrategy(fighter1, fighter2),
    balancedStrategy(fighter2, fighter1)
  ];
});

console.log(`Winner: ${result.winner}`);
```

### Custom Strategy

```typescript
function customStrategy(fighter: Fighter, opponent: Fighter): CombatAction {
  // Use special when available
  if (fighter.specialCooldown === 0) {
    return CombatAction.SPECIAL;
  }
  
  // Defend if low HP
  if (fighter.stats.currentHP < fighter.stats.maxHP * 0.3) {
    return CombatAction.DEFEND;
  }
  
  // Build combo with light attacks
  if (fighter.combo.count < 3) {
    return CombatAction.LIGHT_ATTACK;
  }
  
  // Finish with heavy
  return CombatAction.HEAVY_ATTACK;
}
```

## Combat Actions

### Light Attack
- **Damage**: 0.8x attack
- **Speed**: Fast
- **Combo**: Builds combo
- **Risk**: Low

### Heavy Attack
- **Damage**: 1.8x attack
- **Speed**: Slow
- **Combo**: Builds combo, breaks if dodged
- **Risk**: Medium
- **Bonus**: 30% chance to apply Weakened

### Special
- **Effect**: Class-specific ability
- **Cooldown**: 3-5 turns
- **Combo**: Resets combo
- **Risk**: Varies by class

### Defend
- **Effect**: Apply Fortified (40% damage resistance)
- **Duration**: 1 turn
- **Combo**: Breaks combo

### Dodge
- **Effect**: Increase dodge chance by 2x for next turn
- **Risk**: Still vulnerable this turn
- **Combo**: Maintains combo

## Damage Calculation

```
Base Damage = Attack × Action Multiplier
× Combo Multiplier (1.0 - 1.5)
× Status Modifiers (Enraged/Weakened)
× Passive Bonuses
× Crit Multiplier (if crit)
× Defense Reduction (Defense / (Defense + 100))
× Defender Status (Fortified/Burned)
```

## Running Demos

```bash
# Install dependencies
npm install

# Run all demos
npx tsx combat-demo.ts

# Or run specific demo
node -e "require('./combat-demo.ts').demoAIBattle()"
```

## Integration with Agent Combat

```typescript
// Agent submits action for their fighter
interface AgentAction {
  agentId: string;
  action: CombatAction;
  timestamp: number;
}

// Process actions in battle
function processAgentBattle(action1: AgentAction, action2: AgentAction) {
  const fighter1 = getFighterByAgent(action1.agentId);
  const fighter2 = getFighterByAgent(action2.agentId);
  
  const engine = new CombatEngine(fighter1, fighter2);
  const results = engine.executeTurn(action1.action, action2.action);
  
  return {
    results,
    state: engine.getState()
  };
}
```

## Balance Notes

- **Assassin** dominates early game with high burst and speed
- **Warrior** excels in prolonged fights with sustainability
- **Berserker** high-risk/high-reward, can snowball or collapse
- **Necromancer** strongest in wars of attrition with DOTs and lifesteal

## Future Enhancements

- [ ] Equipment system (weapons, armor)
- [ ] Team battles (2v2, 3v3)
- [ ] Environmental effects
- [ ] Combo finishers
- [ ] Rage/Mana systems
- [ ] Ultimate abilities
- [ ] Character leveling/progression
- [ ] Tournament brackets
- [ ] Replay system
- [ ] Battle animations/visualization

## License

Built for DARKCITY agent combat system.
