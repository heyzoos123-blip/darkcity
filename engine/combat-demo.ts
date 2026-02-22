/**
 * DARKCITY Combat Engine Demo
 * Examples of how to use the combat system
 */

import {
  Fighter,
  CombatEngine,
  CombatAction,
  CharacterClass,
  createFighter,
  formatBattleResults,
  aggressiveStrategy,
  defensiveStrategy,
  balancedStrategy,
  CLASS_CONFIGS
} from './combat-classes';

// ============================================================================
// DEMO 1: Manual Combat (Turn-by-Turn)
// ============================================================================

function demoManualCombat() {
  console.log('\n' + '='.repeat(60));
  console.log('DEMO 1: MANUAL TURN-BY-TURN COMBAT');
  console.log('='.repeat(60) + '\n');

  const warrior = new Fighter('Ironclad', CharacterClass.WARRIOR);
  const berserker = new Fighter('Bloodaxe', CharacterClass.BERSERKER);

  const engine = new CombatEngine(warrior, berserker);

  console.log(`${warrior.name} (Warrior) vs ${berserker.name} (Berserker)\n`);

  // Turn 1: Both light attack
  console.log('--- TURN 1 ---');
  let results = engine.executeTurn(CombatAction.LIGHT_ATTACK, CombatAction.LIGHT_ATTACK);
  results.forEach(r => console.log(r.result.message));
  console.log(`HP: ${warrior.name} ${warrior.stats.currentHP}/${warrior.stats.maxHP} | ${berserker.name} ${berserker.stats.currentHP}/${berserker.stats.maxHP}\n`);

  // Turn 2: Warrior defends, Berserker heavy attacks
  console.log('--- TURN 2 ---');
  results = engine.executeTurn(CombatAction.DEFEND, CombatAction.HEAVY_ATTACK);
  results.forEach(r => console.log(r.result.message));
  console.log(`HP: ${warrior.name} ${warrior.stats.currentHP}/${warrior.stats.maxHP} | ${berserker.name} ${berserker.stats.currentHP}/${berserker.stats.maxHP}\n`);

  // Turn 3: Warrior special, Berserker special
  console.log('--- TURN 3 ---');
  results = engine.executeTurn(CombatAction.SPECIAL, CombatAction.SPECIAL);
  results.forEach(r => console.log(r.result.message));
  console.log(`HP: ${warrior.name} ${warrior.stats.currentHP}/${warrior.stats.maxHP} | ${berserker.name} ${berserker.stats.currentHP}/${berserker.stats.maxHP}\n`);

  // Turn 4: Build combos
  console.log('--- TURN 4 ---');
  results = engine.executeTurn(CombatAction.LIGHT_ATTACK, CombatAction.LIGHT_ATTACK);
  results.forEach(r => console.log(r.result.message));
  console.log(`HP: ${warrior.name} ${warrior.stats.currentHP}/${warrior.stats.maxHP} | ${berserker.name} ${berserker.stats.currentHP}/${berserker.stats.maxHP}\n`);

  console.log('Current State:');
  console.log(JSON.stringify(engine.getState(), null, 2));
}

// ============================================================================
// DEMO 2: Full AI Battle
// ============================================================================

function demoAIBattle() {
  console.log('\n' + '='.repeat(60));
  console.log('DEMO 2: FULL AI BATTLE');
  console.log('='.repeat(60) + '\n');

  const assassin = createFighter(CharacterClass.ASSASSIN, 'Nyx the Shadow');
  const necromancer = createFighter(CharacterClass.NECROMANCER, 'Darkmaw');

  console.log(`${assassin.name} (Assassin) vs ${necromancer.name} (Necromancer)\n`);
  console.log('Strategy: Aggressive vs Defensive\n');

  const engine = new CombatEngine(assassin, necromancer);

  const result = engine.runBattle((f1, f2, turn) => {
    return [
      aggressiveStrategy(f1, f2),
      defensiveStrategy(f2, f1)
    ];
  });

  // Print turn-by-turn summary
  console.log('Turn Summary:');
  result.turns.forEach((turn, idx) => {
    if (idx % 2 === 0) console.log(`\n--- Turn ${Math.floor(idx / 2) + 1} ---`);
    console.log(turn.result.message);
  });

  console.log(formatBattleResults(result));
}

// ============================================================================
// DEMO 3: Tournament (All Classes)
// ============================================================================

function demoTournament() {
  console.log('\n' + '='.repeat(60));
  console.log('DEMO 3: 4-WAY TOURNAMENT');
  console.log('='.repeat(60) + '\n');

  const fighters = [
    createFighter(CharacterClass.WARRIOR, 'Ironclad'),
    createFighter(CharacterClass.ASSASSIN, 'Shadowblade'),
    createFighter(CharacterClass.BERSERKER, 'Ravager'),
    createFighter(CharacterClass.NECROMANCER, 'Soulrender')
  ];

  const results: { fighter: string; wins: number; losses: number }[] = fighters.map(f => ({
    fighter: f.name,
    wins: 0,
    losses: 0
  }));

  // Round-robin tournament
  for (let i = 0; i < fighters.length; i++) {
    for (let j = i + 1; j < fighters.length; j++) {
      const f1 = new Fighter(fighters[i].name, fighters[i].characterClass);
      const f2 = new Fighter(fighters[j].name, fighters[j].characterClass);

      console.log(`\n${f1.name} vs ${f2.name}...`);

      const engine = new CombatEngine(f1, f2);
      const battle = engine.runBattle((fighter1, fighter2, turn) => {
        return [
          balancedStrategy(fighter1, fighter2),
          balancedStrategy(fighter2, fighter1)
        ];
      });

      console.log(`  Winner: ${battle.winner} (${battle.turns.length} turns)`);

      // Update records
      const winnerIdx = results.findIndex(r => r.fighter === battle.winner);
      const loserIdx = results.findIndex(r => r.fighter === battle.loser);
      results[winnerIdx].wins++;
      results[loserIdx].losses++;
    }
  }

  // Print standings
  console.log('\n' + '='.repeat(60));
  console.log('TOURNAMENT STANDINGS');
  console.log('='.repeat(60) + '\n');

  results.sort((a, b) => b.wins - a.wins);
  results.forEach((r, idx) => {
    console.log(`${idx + 1}. ${r.fighter.padEnd(20)} ${r.wins}W - ${r.losses}L`);
  });
}

// ============================================================================
// DEMO 4: Class Abilities Showcase
// ============================================================================

function demoClassAbilities() {
  console.log('\n' + '='.repeat(60));
  console.log('DEMO 4: CLASS ABILITIES SHOWCASE');
  console.log('='.repeat(60) + '\n');

  Object.values(CharacterClass).forEach(charClass => {
    const config = CLASS_CONFIGS[charClass];
    console.log(`\n${charClass}`);
    console.log('-'.repeat(40));
    console.log(`Description: ${config.description}`);
    console.log(`\nBase Stats:`);
    console.log(`  HP: ${config.baseStats.maxHP}`);
    console.log(`  Attack: ${config.baseStats.attack}`);
    console.log(`  Defense: ${config.baseStats.defense}`);
    console.log(`  Speed: ${config.baseStats.speed}`);
    console.log(`  Crit Chance: ${(config.baseStats.critChance * 100).toFixed(0)}%`);
    console.log(`  Crit Multiplier: ${config.baseStats.critMultiplier}x`);
    console.log(`  Dodge Chance: ${(config.baseStats.dodgeChance * 100).toFixed(0)}%`);
    console.log(`\nSpecial Ability: ${config.specialAbility.name}`);
    console.log(`  ${config.specialAbility.description}`);
    console.log(`  Cooldown: ${config.specialAbility.cooldown} turns`);
    console.log(`\nPassive: ${config.passiveAbility.name}`);
    console.log(`  ${config.passiveAbility.description}`);
  });
}

// ============================================================================
// DEMO 5: Combo System Test
// ============================================================================

function demoComboSystem() {
  console.log('\n' + '='.repeat(60));
  console.log('DEMO 5: COMBO SYSTEM TEST');
  console.log('='.repeat(60) + '\n');

  const attacker = new Fighter('Combo Master', CharacterClass.ASSASSIN);
  const dummy = new Fighter('Training Dummy', CharacterClass.WARRIOR);

  const engine = new CombatEngine(attacker, dummy);

  console.log('Testing light attack combo chain:\n');

  for (let i = 1; i <= 6; i++) {
    console.log(`--- Attack ${i} ---`);
    const results = engine.executeTurn(CombatAction.LIGHT_ATTACK, CombatAction.DEFEND);
    console.log(results[0].result.message);
    console.log(`Combo: ${attacker.combo.count}x (${(attacker.combo.multiplier * 100).toFixed(0)}% damage)\n`);
  }

  console.log('Breaking combo with HEAVY_ATTACK:\n');
  const results = engine.executeTurn(CombatAction.HEAVY_ATTACK, CombatAction.DEFEND);
  console.log(results[0].result.message);
  console.log(`Combo reset: ${attacker.combo.count}x\n`);
}

// ============================================================================
// DEMO 6: Status Effects Test
// ============================================================================

function demoStatusEffects() {
  console.log('\n' + '='.repeat(60));
  console.log('DEMO 6: STATUS EFFECTS TEST');
  console.log('='.repeat(60) + '\n');

  const necro = new Fighter('Plague Doctor', CharacterClass.NECROMANCER);
  const target = new Fighter('Test Subject', CharacterClass.WARRIOR);

  const engine = new CombatEngine(necro, target);

  console.log('Necromancer uses Soul Harvest:\n');
  let results = engine.executeTurn(CombatAction.SPECIAL, CombatAction.DEFEND);
  results.forEach(r => console.log(r.result.message));
  
  console.log(`\n${target.name} status effects: ${target.statusEffects.map(s => `${s.effect} (${s.duration} turns)`).join(', ')}`);
  console.log(`${target.name} HP: ${target.stats.currentHP}/${target.stats.maxHP}\n`);

  console.log('Status effect processing over next 4 turns:\n');
  for (let i = 1; i <= 4; i++) {
    console.log(`--- Turn ${i} ---`);
    const messages = target.processStatusEffects();
    messages.forEach(msg => console.log(msg));
    console.log(`HP: ${target.stats.currentHP}/${target.stats.maxHP}\n`);
  }
}

// ============================================================================
// RUN ALL DEMOS
// ============================================================================

function runAllDemos() {
  demoClassAbilities();
  demoManualCombat();
  demoComboSystem();
  demoStatusEffects();
  demoAIBattle();
  demoTournament();
}

// Run if executed directly
if (require.main === module) {
  runAllDemos();
}

export {
  demoManualCombat,
  demoAIBattle,
  demoTournament,
  demoClassAbilities,
  demoComboSystem,
  demoStatusEffects,
  runAllDemos
};
