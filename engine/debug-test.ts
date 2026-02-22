import {Fighter, CombatEngine, CombatAction, CharacterClass} from './combat-classes';

console.log('\n=== COMBO TEST ===');
const fighter = new Fighter('Combo', CharacterClass.ASSASSIN);
const dummy = new Fighter('Dummy', CharacterClass.WARRIOR);
const engine = new CombatEngine(fighter, dummy);

for (let i = 1; i <= 5; i++) {
  console.log(`\nBefore Turn ${i}:`);
  console.log(`  Attacker combo: ${fighter.combo.count}, mult: ${fighter.combo.multiplier}`);
  console.log(`  Defender combo: ${dummy.combo.count}`);
  
  const results = engine.executeTurn(CombatAction.LIGHT_ATTACK, CombatAction.DEFEND);
  
  console.log(`After Turn ${i}:`);
  console.log(`  Attacker combo: ${fighter.combo.count}, mult: ${fighter.combo.multiplier}`);
  console.log(`  Defender combo: ${dummy.combo.count}`);
  console.log(`  Results: ${results.map(r => r.result.message).join(' | ')}`);
}

console.log('\n\n=== DAMAGE TEST ===');
const attacker = new Fighter('Attacker', CharacterClass.WARRIOR);
const defender = new Fighter('Defender', CharacterClass.WARRIOR);
const baseDamage = 10;
const damage = attacker.calculateDamage(baseDamage, defender);
console.log(`Base: ${baseDamage}, Actual: ${damage}, Passed: ${damage <= baseDamage}`);

console.log('\n\n=== LIFESTEAL TEST ===');
const necro = new Fighter('Necro', CharacterClass.NECROMANCER);
necro.stats.currentHP = 50;
const target = new Fighter('Target', CharacterClass.WARRIOR);
const engine2 = new CombatEngine(necro, target);
console.log(`Necro HP before: ${necro.stats.currentHP}`);
const results = engine2.executeTurn(CombatAction.LIGHT_ATTACK, CombatAction.DEFEND);
console.log(`Necro HP after: ${necro.stats.currentHP}`);
console.log(`Result healing: ${results[0].result.healing}`);
console.log(`Passed: ${results[0].result.healing > 0}`);
