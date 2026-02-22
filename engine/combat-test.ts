/**
 * DARKCITY Combat Engine Tests
 * Validate combat mechanics and edge cases
 */

import {
  Fighter,
  CombatEngine,
  CombatAction,
  CharacterClass,
  StatusEffect
} from './combat-classes';

// ============================================================================
// TEST UTILITIES
// ============================================================================

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✓ ${message}`);
    testsPassed++;
  } else {
    console.error(`✗ ${message}`);
    testsFailed++;
  }
}

function testGroup(name: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(name);
  console.log('='.repeat(60) + '\n');
}

// ============================================================================
// FIGHTER CREATION TESTS
// ============================================================================

function testFighterCreation() {
  testGroup('FIGHTER CREATION TESTS');

  const warrior = new Fighter('Test Warrior', CharacterClass.WARRIOR);
  assert(warrior.name === 'Test Warrior', 'Fighter name set correctly');
  assert(warrior.characterClass === CharacterClass.WARRIOR, 'Character class set correctly');
  assert(warrior.stats.currentHP === warrior.stats.maxHP, 'HP initialized to max');
  assert(warrior.statusEffects.length === 0, 'No initial status effects');
  assert(warrior.combo.count === 0, 'Combo starts at 0');
  assert(warrior.specialCooldown === 0, 'Special available at start');

  // Test all classes initialize correctly
  Object.values(CharacterClass).forEach(charClass => {
    const fighter = new Fighter('Test', charClass);
    assert(fighter.stats.maxHP > 0, `${charClass} has positive max HP`);
    assert(fighter.stats.attack > 0, `${charClass} has positive attack`);
    assert(fighter.stats.defense > 0, `${charClass} has positive defense`);
  });
}

// ============================================================================
// DAMAGE CALCULATION TESTS
// ============================================================================

function testDamageCalculation() {
  testGroup('DAMAGE CALCULATION TESTS');

  const attacker = new Fighter('Attacker', CharacterClass.WARRIOR);
  const defender = new Fighter('Defender', CharacterClass.WARRIOR);

  const baseDamage = 10;
  const damage = attacker.calculateDamage(baseDamage, defender);
  
  assert(damage > 0, 'Damage is positive');
  assert(damage <= baseDamage, 'Defense reduces damage');

  // Test zero damage edge case
  const zeroDamage = attacker.calculateDamage(0, defender);
  assert(zeroDamage >= 1, 'Minimum 1 damage guaranteed');
}

// ============================================================================
// COMBO SYSTEM TESTS
// ============================================================================

function testComboSystem() {
  testGroup('COMBO SYSTEM TESTS');

  const fighter = new Fighter('Combo Tester', CharacterClass.ASSASSIN);
  const dummy = new Fighter('Dummy', CharacterClass.WARRIOR);
  
  // Remove dodge chance for deterministic testing
  dummy.stats.dodgeChance = 0;
  
  const engine = new CombatEngine(fighter, dummy);

  // Build combo with light attacks
  for (let i = 1; i <= 5; i++) {
    engine.executeTurn(CombatAction.LIGHT_ATTACK, CombatAction.DEFEND);
    assert(fighter.combo.count === i, `Combo count is ${i} after ${i} light attacks`);
  }

  assert(fighter.combo.multiplier === 1.5, 'Combo caps at 1.5x multiplier');

  // Break combo with different action
  engine.executeTurn(CombatAction.HEAVY_ATTACK, CombatAction.DEFEND);
  assert(fighter.combo.count === 1, 'Combo resets with different action');

  // Break combo with defend
  fighter.breakCombo();
  assert(fighter.combo.count === 0, 'Combo manually broken');
  assert(fighter.combo.multiplier === 1.0, 'Multiplier reset to 1.0');
}

// ============================================================================
// STATUS EFFECT TESTS
// ============================================================================

function testStatusEffects() {
  testGroup('STATUS EFFECT TESTS');

  const fighter = new Fighter('Status Tester', CharacterClass.WARRIOR);

  // Apply status effect
  fighter.applyStatusEffect(StatusEffect.BLEEDING, 3);
  assert(fighter.hasStatusEffect(StatusEffect.BLEEDING), 'Bleeding applied');
  assert(fighter.statusEffects[0].duration === 3, 'Duration set to 3');

  // Stack poison
  fighter.applyStatusEffect(StatusEffect.POISONED, 2);
  fighter.applyStatusEffect(StatusEffect.POISONED, 2);
  const poisonEffect = fighter.statusEffects.find(e => e.effect === StatusEffect.POISONED);
  assert(poisonEffect?.stacks === 2, 'Poison stacks correctly');

  // Process status effects
  const initialHP = fighter.stats.currentHP;
  fighter.processStatusEffects();
  assert(fighter.stats.currentHP < initialHP, 'DOT effects deal damage');

  // Effects expire
  fighter.statusEffects.forEach(e => e.duration = 0);
  fighter.tickStatusDurations();
  assert(fighter.statusEffects.length === 0, 'Expired effects removed');
}

// ============================================================================
// SPECIAL ABILITY TESTS
// ============================================================================

function testSpecialAbilities() {
  testGroup('SPECIAL ABILITY TESTS');

  // Test Warrior Shield Bash
  const warrior = new Fighter('Warrior', CharacterClass.WARRIOR);
  const target1 = new Fighter('Target', CharacterClass.ASSASSIN);
  const engine1 = new CombatEngine(warrior, target1);

  const results1 = engine1.executeTurn(CombatAction.SPECIAL, CombatAction.DEFEND);
  // Check status effects in the turn results (before they're ticked at end of turn)
  const shieldBashResult = results1.find(r => r.action === CombatAction.SPECIAL);
  assert(shieldBashResult?.defenderStatus.some(s => s.effect === StatusEffect.STUNNED), 'Shield Bash stuns target');
  assert(shieldBashResult?.attackerStatus.some(s => s.effect === StatusEffect.FORTIFIED), 'Shield Bash fortifies warrior');
  assert(warrior.specialCooldown > 0, 'Special on cooldown after use');

  // Test Necromancer Soul Harvest
  const necro = new Fighter('Necro', CharacterClass.NECROMANCER);
  const target2 = new Fighter('Target', CharacterClass.WARRIOR);
  target2.stats.currentHP = target2.stats.maxHP; // Full HP
  
  // Damage necro first so healing can be observed
  necro.takeDamage(50);
  const necroInitialHP = necro.stats.currentHP;
  const engine2 = new CombatEngine(necro, target2);

  engine2.executeTurn(CombatAction.SPECIAL, CombatAction.DEFEND);
  assert(target2.stats.currentHP < target2.stats.maxHP, 'Soul Harvest damages target');
  assert(necro.stats.currentHP > necroInitialHP, 'Soul Harvest heals necromancer');
  assert(target2.hasStatusEffect(StatusEffect.DRAINED), 'Soul Harvest applies Drained');

  // Test cooldown prevents reuse
  const result = necro.executeAction(CombatAction.SPECIAL, target2);
  assert(!result.success, 'Special blocked by cooldown');
}

// ============================================================================
// TURN ORDER TESTS
// ============================================================================

function testTurnOrder() {
  testGroup('TURN ORDER TESTS');

  const fast = new Fighter('Fast', CharacterClass.ASSASSIN); // Speed 20
  const slow = new Fighter('Slow', CharacterClass.WARRIOR);  // Speed 10

  const engine = new CombatEngine(fast, slow);
  const results = engine.executeTurn(CombatAction.LIGHT_ATTACK, CombatAction.LIGHT_ATTACK);

  assert(results[0].attacker === fast.name, 'Faster fighter acts first');
  assert(results[1].attacker === slow.name, 'Slower fighter acts second');
}

// ============================================================================
// BATTLE COMPLETION TESTS
// ============================================================================

function testBattleCompletion() {
  testGroup('BATTLE COMPLETION TESTS');

  const fighter1 = new Fighter('Fighter 1', CharacterClass.BERSERKER);
  const fighter2 = new Fighter('Fighter 2', CharacterClass.WARRIOR);

  const engine = new CombatEngine(fighter1, fighter2);

  const result = engine.runBattle(() => {
    return [CombatAction.HEAVY_ATTACK, CombatAction.HEAVY_ATTACK];
  });

  assert(result.winner !== null, 'Battle has a winner');
  assert(result.loser !== null, 'Battle has a loser');
  assert(result.turns.length > 0, 'Battle has turn history');
  assert(
    result.finalStats[result.winner].currentHP >= 0,
    'Winner HP is non-negative'
  );
  assert(
    result.finalStats[result.loser].currentHP === 0 ||
    result.finalStats[result.loser].currentHP < result.finalStats[result.winner].currentHP,
    'Loser has 0 HP or less than winner'
  );
}

// ============================================================================
// PASSIVE ABILITY TESTS
// ============================================================================

function testPassiveAbilities() {
  testGroup('PASSIVE ABILITY TESTS');

  // Test Necromancer lifesteal
  const necro = new Fighter('Necro', CharacterClass.NECROMANCER);
  necro.stats.currentHP = 50; // Set to half HP
  const target = new Fighter('Target', CharacterClass.WARRIOR);

  const engine = new CombatEngine(necro, target);
  const results = engine.executeTurn(CombatAction.LIGHT_ATTACK, CombatAction.DEFEND);

  const lifestealed = results[0].result.healing > 0;
  assert(lifestealed, 'Necromancer passive applies lifesteal');

  // Test Berserker damage increase at low HP
  const berserker = new Fighter('Berserker', CharacterClass.BERSERKER);
  const lowHPDamage = berserker.applyPassiveDamageBonus(100);
  
  berserker.stats.currentHP = Math.floor(berserker.stats.maxHP * 0.3); // 30% HP
  const boostedDamage = berserker.applyPassiveDamageBonus(100);
  
  assert(boostedDamage > lowHPDamage, 'Berserker deals more damage at low HP');
}

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

function testEdgeCases() {
  testGroup('EDGE CASE TESTS');

  const fighter = new Fighter('Edge Case', CharacterClass.WARRIOR);

  // Test HP doesn't go negative
  fighter.takeDamage(9999);
  assert(fighter.stats.currentHP === 0, 'HP does not go below 0');

  // Test healing doesn't exceed max
  fighter.heal(9999);
  assert(fighter.stats.currentHP === fighter.stats.maxHP, 'HP does not exceed max');

  // Test stunned fighter cannot act
  fighter.applyStatusEffect(StatusEffect.STUNNED, 1);
  const dummy = new Fighter('Dummy', CharacterClass.WARRIOR);
  const result = fighter.executeAction(CombatAction.HEAVY_ATTACK, dummy);
  assert(!result.success, 'Stunned fighter cannot act');
  assert(result.dodged === false, 'Stunned attack is not dodged');

  // Test dead fighter check
  fighter.stats.currentHP = 0;
  assert(!fighter.isAlive(), 'Fighter with 0 HP is not alive');
}

// ============================================================================
// DODGE MECHANICS TESTS
// ============================================================================

function testDodgeMechanics() {
  testGroup('DODGE MECHANICS TESTS');

  const fighter = new Fighter('Dodger', CharacterClass.ASSASSIN);
  const attacker = new Fighter('Attacker', CharacterClass.WARRIOR);
  
  const baseDodge = fighter.stats.dodgeChance;
  
  // Execute dodge action
  const result = fighter.executeAction(CombatAction.DODGE, attacker);
  assert(result.success, 'Dodge action succeeds');
  assert(fighter.stats.dodgeChance > baseDodge, 'Dodge increases dodge chance');

  // Test dodge chance caps
  fighter.stats.dodgeChance = 0.9;
  fighter.executeAction(CombatAction.DODGE, attacker);
  assert(fighter.stats.dodgeChance <= 1.0, 'Dodge chance does not exceed 100%');
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

function runAllTests() {
  console.log('\n' + '█'.repeat(60));
  console.log('DARKCITY COMBAT ENGINE - TEST SUITE');
  console.log('█'.repeat(60));

  testFighterCreation();
  testDamageCalculation();
  testComboSystem();
  testStatusEffects();
  testSpecialAbilities();
  testTurnOrder();
  testBattleCompletion();
  testPassiveAbilities();
  testEdgeCases();
  testDodgeMechanics();

  console.log('\n' + '█'.repeat(60));
  console.log(`TEST RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('█'.repeat(60) + '\n');

  if (testsFailed === 0) {
    console.log('✓ ALL TESTS PASSED!\n');
  } else {
    console.error(`✗ ${testsFailed} TEST(S) FAILED\n`);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllTests();
}

export { runAllTests };
