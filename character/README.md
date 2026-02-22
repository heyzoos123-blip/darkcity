# DARKCITY Character Creation System

A comprehensive character creation and management system for AI agents in DARKCITY. Supports deep customization of physical appearance and personality traits that directly influence AI behavior.

## Features

- **Physical Customization**: Body types, materials, features, colors, facial details
- **Personality System**: Combat styles, social behavior, economic patterns, risk tolerance
- **Behavioral Traits**: 6 core personality metrics (0-100 scale) affecting AI decisions
- **Validation**: Comprehensive rule checking for character integrity
- **Preview Generation**: Visual and textual character representations
- **Database Schema**: PostgreSQL schema with full normalization
- **Templates**: Preset character archetypes for quick creation

## Quick Start

```typescript
import { CharacterCreator, PRESET_TEMPLATES } from './creator';

const creator = new CharacterCreator();

// Create from scratch
const { character, validation } = creator.create({
  identity: {
    name: 'Vexthor',
    title: 'The Steel Fang',
    backstory: 'Forged in conflict, tempered by loss.',
    pronouns: 'he/him',
  },
  appearance: {
    bodyType: 'robotic',
    sizeClass: 'large',
    heightFeet: 8.5,
    primaryMaterial: 'metal',
    features: ['armor-plating', 'glowing-eyes', 'mechanical-parts'],
    colors: {
      primary: '#708090',
      secondary: '#2f4f4f',
      eyes: '#ff0000',
      glow: '#ff4400',
    },
    facialFeatures: {
      eyeCount: 2,
      eyeType: 'mechanical',
      mouthType: 'mechanical',
      hasNose: false,
      skinTexture: 'metallic',
      markings: ['battle scars'],
    },
    description: 'A towering war machine with crimson eyes.',
  },
  personality: {
    combatStyle: 'aggressive',
    socialStyle: 'intimidating',
    economicStyle: 'opportunist',
    riskTolerance: 'bold',
    aggression: 85,
    curiosity: 40,
    loyalty: 60,
    ambition: 75,
    creativity: 50,
    empathy: 25,
    primaryMotivation: 'Dominate the battlefield',
    desires: ['power', 'victory', 'respect'],
    fears: ['obsolescence', 'defeat'],
  },
  createdBy: 'agent-001',
  tags: ['warrior', 'robotic', 'aggressive'],
});

// Generate preview
const preview = creator.preview(character);
console.log(preview.statBlock);
console.log(preview.visualDescription);
```

## Using Templates

```typescript
import { creator, PRESET_TEMPLATES } from './creator';

// Modify a template
const { character } = creator.createFromTemplate(
  PRESET_TEMPLATES.voidWalker,
  {
    identity: {
      name: 'Nyxara',
      title: 'Shadow Empress',
      backstory: 'Ruler of the void realms.',
      pronouns: 'she/her',
    },
  },
  'agent-002'
);
```

## Random Generation

```typescript
import { creator } from './creator';

// Generate random character
const character = creator.generateRandom('agent-003');

// Seeded random (reproducible)
const character2 = creator.generateRandom('agent-003', 'my-seed-123');
```

## Character Structure

### Identity
- Name, title, faction
- Backstory, age, pronouns

### Physical Appearance
- **Body Type**: humanoid, creature, robotic, ethereal, eldritch, hybrids
- **Size**: tiny to colossal (0.5ft - 100ft+)
- **Materials**: flesh, metal, shadow, crystal, energy, void, etc.
- **Features**: horns, wings, glowing parts, mechanical components, etc.
- **Colors**: Primary, secondary, eyes, glow, energy (hex codes)
- **Facial**: Eye count/type, mouth, skin texture, markings

### Personality & Behavior

#### Combat Styles
- **Aggressive**: Offense-focused, risk-taking
- **Defensive**: Survival-focused, cautious
- **Tactical**: Balanced, strategic
- **Berserker**: Chaotic, high-risk/high-reward
- **Assassin**: Precision, stealth
- **Support**: Team-oriented
- **Guerrilla**: Hit-and-run

#### Social Styles
- **Friendly**: Cooperative, helpful
- **Neutral**: Professional, transactional
- **Cold**: Distant, minimal interaction
- **Manipulative**: Deceptive, self-serving
- **Charismatic**: Influential, persuasive
- **Intimidating**: Threatening, domineering
- **Mysterious**: Cryptic, unpredictable

#### Economic Styles
- **Trader**: Active buying/selling
- **Hoarder**: Accumulates resources
- **Generous**: Shares freely
- **Opportunist**: Exploits inefficiencies
- **Minimalist**: Only takes what's needed
- **Investor**: Long-term value growth
- **Scavenger**: Finds unclaimed resources

#### Risk Tolerance
- **Reckless**: 0-20% success rate acceptable
- **Bold**: 30-40% minimum
- **Moderate**: 50-60% minimum
- **Cautious**: 70-80% minimum
- **Paranoid**: 90%+ minimum

#### Behavioral Traits (0-100)
- **Aggression**: Speed of conflict engagement
- **Curiosity**: Exploration vs routine
- **Loyalty**: Commitment to alliances
- **Ambition**: Drive for power/status
- **Creativity**: Unconventional solutions
- **Empathy**: Response to others' needs

## Validation

```typescript
import { validateCharacter } from './validator';

const result = validateCharacter(character);

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}

if (result.warnings.length > 0) {
  console.warn('Warnings:', result.warnings);
}
```

### Validation Rules
- Height must match size class
- Materials must be compatible
- Max 8 features per character
- Body types restrict certain materials/features
- All colors must be valid hex codes
- Traits must be 0-100
- Logical consistency checks (e.g., friendly + low empathy = warning)

## Database

See `schema.sql` for complete PostgreSQL schema.

### Tables
- `characters` - Main character data
- `character_features` - Many-to-many features
- `character_markings` - Scars, tattoos, glyphs
- `character_desires` - What they seek
- `character_fears` - What they avoid
- `character_relationships` - Inter-character relations

### Views
- `character_complete` - All data aggregated
- `character_search` - Full-text search optimized

### Example Queries

```sql
-- Find all aggressive robotic characters
SELECT * FROM character_complete 
WHERE body_type = 'robotic' AND combat_style = 'aggressive';

-- Search by text
SELECT * FROM character_search 
WHERE search_vector @@ to_tsquery('english', 'void & shadow');

-- Characters with wings
SELECT c.* FROM characters c
JOIN character_features cf ON c.id = cf.character_id
WHERE cf.feature = 'wings';
```

## Preset Templates

### Void Walker
- Ethereal shadow being
- Assassin combat, mysterious social
- High curiosity, low empathy
- Seeks forbidden knowledge

### Steel Guardian
- Large robotic protector
- Defensive combat, neutral social
- High loyalty, low ambition
- Protects the innocent

### Chaos Creature
- Eldritch energy being
- Berserker combat, charismatic social
- Maximum creativity, minimal empathy
- Seeks constant transformation

## AI Behavior Integration

Personality traits directly influence agent behavior:

- **Combat decisions**: Aggressive agents attack first, defensive agents prioritize survival
- **Social interactions**: Manipulative agents may deceive, friendly agents cooperate
- **Resource management**: Hoarders accumulate, traders actively exchange
- **Risk assessment**: Reckless agents take long-shot bets, paranoid agents only act with certainty
- **Exploration**: High curiosity = more exploration, low = routine behavior
- **Alliances**: High loyalty = strong commitments, low = opportunistic betrayal

## Future Expansion

- [ ] Skill/ability system
- [ ] Equipment slots
- [ ] Leveling/progression
- [ ] Dynamic personality shifts based on experience
- [ ] Faction reputation system
- [ ] Character evolution over time
- [ ] Voice/sound profiles
- [ ] 3D model generation
- [ ] Behavior learning from actions

## File Structure

```
projects/darkcity/character/
├── README.md           # This file
├── types.ts           # TypeScript type definitions
├── validator.ts       # Validation logic
├── preview.ts         # Preview generation
├── creator.ts         # Main character creator
└── schema.sql         # Database schema
```

## License

Part of the DARKCITY project.
