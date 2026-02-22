/**
 * DARKCITY Character Creation System - Test Suite
 * Quick validation that the system works end-to-end
 */

import { creator, PRESET_TEMPLATES } from './creator';

console.log('🌑 DARKCITY Character Creation System Test\n');
console.log('='.repeat(70) + '\n');

// Test 1: Create a custom character
console.log('TEST 1: Creating Custom Character...');
try {
  const { character, validation } = creator.create({
    identity: {
      name: 'Shadowfang',
      title: 'The Midnight Hunter',
      backstory: 'Emerged from darkness itself.',
      pronouns: 'they/them',
    },
    appearance: {
      bodyType: 'creature',
      sizeClass: 'medium',
      heightFeet: 5.8,
      primaryMaterial: 'shadow',
      features: ['fangs', 'claws', 'glowing-eyes', 'tail'],
      colors: {
        primary: '#1a1a1a',
        secondary: '#4a4a4a',
        eyes: '#ff0000',
        glow: '#ff4500',
      },
      facialFeatures: {
        eyeCount: 2,
        eyeType: 'glowing',
        mouthType: 'fanged',
        hasNose: true,
        skinTexture: 'smooth',
        markings: ['lunar sigils'],
      },
      description: 'A sleek predator born of living shadow.',
    },
    personality: {
      combatStyle: 'assassin',
      socialStyle: 'mysterious',
      economicStyle: 'opportunist',
      riskTolerance: 'bold',
      aggression: 70,
      curiosity: 65,
      loyalty: 45,
      ambition: 75,
      creativity: 80,
      empathy: 35,
      primaryMotivation: 'Hunt the most challenging prey',
      desires: ['mastery', 'thrill', 'reputation'],
      fears: ['weakness', 'capture', 'daylight'],
    },
    createdBy: 'test-agent',
    tags: ['hunter', 'shadow', 'predator'],
  });

  console.log(`✅ Created: ${character.identity.name}`);
  console.log(`   Valid: ${validation.valid}`);
  console.log(`   Warnings: ${validation.warnings.length}`);
  console.log(`   ID: ${character.id}\n`);

  // Generate preview
  const preview = creator.preview(character);
  console.log(preview.statBlock);
  console.log('\n' + preview.behaviorSummary + '\n');

} catch (error) {
  console.error('❌ Failed:', error);
}

// Test 2: Use a preset template
console.log('\n' + '='.repeat(70) + '\n');
console.log('TEST 2: Creating from Void Walker Template...');
try {
  const { character } = creator.createFromTemplate(
    PRESET_TEMPLATES.voidWalker,
    {
      identity: {
        name: 'Test Void Entity',
        backstory: 'A test subject from beyond.',
        pronouns: 'it/its',
      },
    },
    'test-agent'
  );

  console.log(`✅ Created: ${character.identity.name}`);
  console.log(`   Type: ${character.appearance.bodyType}`);
  console.log(`   Combat: ${character.personality.combatStyle}`);
  console.log(`   Social: ${character.personality.socialStyle}\n`);

} catch (error) {
  console.error('❌ Failed:', error);
}

// Test 3: Random generation
console.log('='.repeat(70) + '\n');
console.log('TEST 3: Generating Random Characters...');
try {
  for (let i = 0; i < 3; i++) {
    const character = creator.generateRandom('test-agent', `seed-${i}`);
    console.log(`✅ Generated: ${character.identity.name}`);
    console.log(`   ${character.appearance.bodyType} / ${character.appearance.sizeClass} / ${character.appearance.primaryMaterial}`);
    console.log(`   ${character.personality.combatStyle} / ${character.personality.socialStyle}`);
  }
  console.log('');
} catch (error) {
  console.error('❌ Failed:', error);
}

// Test 4: Validation with invalid character
console.log('='.repeat(70) + '\n');
console.log('TEST 4: Testing Validation (should fail)...');
try {
  const invalidCharacter = {
    id: 'test-id',
    identity: { name: 'Invalid', backstory: '', pronouns: 'they/them' },
    appearance: {
      bodyType: 'humanoid' as const,
      sizeClass: 'medium' as const,
      heightFeet: 999, // Invalid height
      primaryMaterial: 'flesh' as const,
      features: [],
      colors: {
        primary: 'not-a-hex', // Invalid color
        secondary: '#ff0000',
        eyes: '#00ff00',
      },
      facialFeatures: {
        eyeCount: 20, // Too many eyes
        eyeType: 'normal' as const,
        mouthType: 'normal' as const,
        hasNose: true,
        skinTexture: 'smooth' as const,
        markings: [],
      },
      description: '',
    },
    personality: {
      combatStyle: 'tactical' as const,
      socialStyle: 'neutral' as const,
      economicStyle: 'trader' as const,
      riskTolerance: 'moderate' as const,
      aggression: 150, // Out of range
      curiosity: 50,
      loyalty: 50,
      ambition: 50,
      creativity: 50,
      empathy: 50,
      primaryMotivation: 'Test',
      desires: [],
      fears: [],
    },
    createdBy: 'test',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  const validation = creator.validate(invalidCharacter as any);
  console.log(`   Valid: ${validation.valid}`);
  console.log(`   Errors found: ${validation.errors.length}`);
  validation.errors.forEach(err => {
    console.log(`   ❌ ${err.field}: ${err.message}`);
  });
  console.log('');
} catch (error) {
  console.error('❌ Test failed:', error);
}

// Test 5: All preset templates
console.log('='.repeat(70) + '\n');
console.log('TEST 5: Loading All Preset Templates...');
try {
  const templates = Object.keys(PRESET_TEMPLATES);
  console.log(`Found ${templates.length} templates:`);
  templates.forEach(key => {
    const template = PRESET_TEMPLATES[key];
    console.log(`   ✅ ${template.name}: ${template.description}`);
  });
  console.log('');
} catch (error) {
  console.error('❌ Failed:', error);
}

console.log('='.repeat(70));
console.log('\n🌑 Test Suite Complete!\n');
console.log('Next Steps:');
console.log('  1. Set up PostgreSQL database');
console.log('  2. Run schema.sql to create tables');
console.log('  3. Integrate with DARKCITY agent system');
console.log('  4. Implement AI behavior hooks based on personality traits');
console.log('');
