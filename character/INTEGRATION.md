# Character System Integration Guide

This guide explains how to integrate the DARKCITY character system with AI agents to influence their behavior.

## Behavioral Integration

The character system provides personality traits that should directly influence agent decision-making:

### Combat Behavior

```typescript
function shouldEngage(agent: AIAgent, threat: Threat): boolean {
  const character = agent.character;
  const personality = character.personality;
  
  // Combat style influences engagement decision
  switch (personality.combatStyle) {
    case 'aggressive':
      return threat.level <= agent.power * 1.5; // Willing to fight stronger opponents
    
    case 'defensive':
      return threat.level <= agent.power * 0.7; // Only fight if winning is likely
    
    case 'tactical':
      return evaluateTacticalAdvantage(agent, threat);
    
    case 'berserker':
      return personality.aggression > 60; // Chaotic, emotion-driven
    
    case 'assassin':
      return canStrikeFromShadows(agent, threat);
    
    default:
      return threat.level <= agent.power;
  }
}

function selectCombatAction(agent: AIAgent, situation: CombatSituation): Action {
  const { combatStyle, aggression, creativity } = agent.character.personality;
  
  // Aggression determines attack vs defense ratio
  const shouldAttack = Math.random() * 100 < aggression;
  
  if (shouldAttack) {
    // Creativity affects move variety
    if (creativity > 70 && Math.random() > 0.7) {
      return selectUnconventionalAttack(agent);
    }
    return selectStandardAttack(agent, combatStyle);
  } else {
    return selectDefensiveAction(agent, combatStyle);
  }
}
```

### Social Behavior

```typescript
function generateDialogue(agent: AIAgent, context: SocialContext): string {
  const { socialStyle, empathy, loyalty } = agent.character.personality;
  
  switch (socialStyle) {
    case 'friendly':
      return generateCooperativeResponse(context, empathy);
    
    case 'cold':
      return generateMinimalResponse(context);
    
    case 'manipulative':
      // Low empathy manipulators are more effective
      const deceptionChance = 100 - empathy;
      if (Math.random() * 100 < deceptionChance) {
        return generateDeceptiveResponse(context);
      }
      return generatePersuasiveResponse(context);
    
    case 'charismatic':
      return generateCharmingResponse(context, empathy);
    
    case 'intimidating':
      return generateThreateningResponse(context, agent.character.appearance);
    
    case 'mysterious':
      return generateCrypticResponse(context);
    
    default:
      return generateNeutralResponse(context);
  }
}

function shouldFormAlliance(agent: AIAgent, other: AIAgent): boolean {
  const { loyalty, empathy, socialStyle } = agent.character.personality;
  
  // High loyalty agents form stronger bonds
  if (loyalty > 70) {
    return evaluateAlignment(agent, other);
  }
  
  // Low loyalty agents are opportunistic
  if (loyalty < 30) {
    return evaluateBenefit(agent, other) > 0;
  }
  
  // Empathy affects willingness to cooperate
  return empathy > 50 && !isHostile(other);
}
```

### Economic Behavior

```typescript
function evaluateTrade(agent: AIAgent, offer: TradeOffer): TradeDecision {
  const { economicStyle, ambition, riskTolerance } = agent.character.personality;
  
  const value = calculateTradeValue(offer);
  
  switch (economicStyle) {
    case 'trader':
      // Active trading, seeks marginal gains
      return value > 0 ? 'accept' : 'counter';
    
    case 'hoarder':
      // Reluctant to trade, only accepts great deals
      return value > offer.cost * 1.5 ? 'accept' : 'reject';
    
    case 'generous':
      // Empathy-based giving
      if (agent.character.personality.empathy > 60) {
        return value > -offer.cost * 0.5 ? 'accept' : 'reject';
      }
      return value > 0 ? 'accept' : 'reject';
    
    case 'opportunist':
      // Exploits market inefficiencies
      const marketValue = getMarketValue(offer.items);
      return value > marketValue * 1.2 ? 'accept' : 'reject';
    
    case 'minimalist':
      // Only trades for necessities
      return isNecessary(offer.items) ? 'accept' : 'reject';
    
    case 'investor':
      // Long-term value focus
      const futureValue = predictFutureValue(offer.items);
      return futureValue > offer.cost * (1 + ambition / 100) ? 'accept' : 'reject';
    
    default:
      return value > 0 ? 'accept' : 'reject';
  }
}

function manageInventory(agent: AIAgent): void {
  const { economicStyle } = agent.character.personality;
  
  switch (economicStyle) {
    case 'hoarder':
      // Keep everything, expand storage
      if (agent.inventory.isFull()) {
        acquireMoreStorage(agent);
      }
      break;
    
    case 'minimalist':
      // Keep only essentials
      const excess = agent.inventory.getNonEssentials();
      if (excess.length > 0) {
        disposeItems(agent, excess);
      }
      break;
    
    case 'trader':
      // Convert items to liquid assets
      const tradeable = agent.inventory.getTradeableItems();
      if (tradeable.length > 5) {
        listForTrade(agent, tradeable);
      }
      break;
  }
}
```

### Risk Assessment

```typescript
function evaluateAction(agent: AIAgent, action: Action): boolean {
  const { riskTolerance, ambition, loyalty } = agent.character.personality;
  
  const successChance = calculateSuccessChance(agent, action);
  const reward = calculateReward(action);
  const cost = calculateCost(action);
  
  // Minimum acceptable success rate based on risk tolerance
  const minSuccessRate = getRiskThreshold(riskTolerance);
  
  if (successChance < minSuccessRate) {
    return false; // Too risky
  }
  
  // Ambition affects willingness to take risks for high rewards
  const expectedValue = (successChance / 100) * reward - ((100 - successChance) / 100) * cost;
  const ambitionMultiplier = 1 + (ambition / 100);
  
  return expectedValue * ambitionMultiplier > 0;
}

function getRiskThreshold(riskTolerance: RiskTolerance): number {
  switch (riskTolerance) {
    case 'reckless': return 20;
    case 'bold': return 40;
    case 'moderate': return 60;
    case 'cautious': return 80;
    case 'paranoid': return 95;
  }
}
```

### Exploration Behavior

```typescript
function shouldExplore(agent: AIAgent, location: Location): boolean {
  const { curiosity, riskTolerance } = agent.character.personality;
  
  const dangerLevel = assessDanger(location);
  const novelty = calculateNovelty(agent, location);
  
  // Curiosity drives exploration
  const explorationUrge = curiosity * novelty / 100;
  
  // Risk tolerance filters dangerous locations
  const riskThreshold = getRiskThreshold(riskTolerance);
  if (dangerLevel > riskThreshold) {
    return false;
  }
  
  return explorationUrge > 50;
}

function selectDestination(agent: AIAgent, options: Location[]): Location {
  const { curiosity, ambition } = agent.character.personality;
  
  return options.reduce((best, location) => {
    const score = 
      (calculateNovelty(agent, location) * curiosity / 100) +
      (calculateOpportunity(location) * ambition / 100);
    
    return score > best.score ? { location, score } : best;
  }, { location: options[0], score: 0 }).location;
}
```

## Integration Checklist

1. **Character Creation**: Generate or import character when agent spawns
2. **Behavior Hooks**: Integrate personality traits into decision-making systems
3. **State Tracking**: Monitor agent actions to update/evolve personality over time
4. **Database Storage**: Save characters to database for persistence
5. **Preview Generation**: Show character info in agent profiles/UI
6. **Validation**: Ensure character integrity on load

## Example Integration

```typescript
class DARKCITYAgent {
  character: Character;
  
  constructor(characterData?: Partial<Character>) {
    if (characterData) {
      this.character = creator.create(characterData).character;
    } else {
      this.character = creator.generateRandom(this.id);
    }
  }
  
  async makeDecision(situation: Situation): Promise<Action> {
    const options = this.generateOptions(situation);
    
    // Filter by risk tolerance
    const acceptable = options.filter(opt => 
      this.evaluateRisk(opt) <= this.getRiskThreshold()
    );
    
    // Select based on personality
    return this.selectAction(acceptable);
  }
  
  private getRiskThreshold(): number {
    return getRiskThreshold(this.character.personality.riskTolerance);
  }
  
  private selectAction(options: Action[]): Action {
    const { combatStyle, curiosity, ambition } = this.character.personality;
    
    // Weight options by personality traits
    return options.reduce((best, action) => {
      let score = action.baseValue;
      
      // Combat style influences combat actions
      if (action.type === 'combat') {
        score *= this.getCombatStyleMultiplier(combatStyle);
      }
      
      // Curiosity influences exploration
      if (action.type === 'explore') {
        score *= (curiosity / 50);
      }
      
      // Ambition influences power-seeking
      if (action.type === 'power-gain') {
        score *= (ambition / 50);
      }
      
      return score > best.score ? { action, score } : best;
    }, { action: options[0], score: 0 }).action;
  }
}
```

## Dynamic Personality Evolution

Consider implementing personality drift based on experiences:

```typescript
function updatePersonality(agent: AIAgent, experience: Experience): void {
  const personality = agent.character.personality;
  
  // Experiences can shift personality traits slightly
  if (experience.type === 'betrayal' && experience.impact > 0.5) {
    personality.loyalty = Math.max(0, personality.loyalty - 5);
    personality.empathy = Math.max(0, personality.empathy - 3);
  }
  
  if (experience.type === 'victory' && experience.difficulty > 0.7) {
    personality.aggression = Math.min(100, personality.aggression + 2);
    personality.ambition = Math.min(100, personality.ambition + 3);
  }
  
  if (experience.type === 'discovery') {
    personality.curiosity = Math.min(100, personality.curiosity + 2);
    personality.creativity = Math.min(100, personality.creativity + 1);
  }
  
  // Save updated personality
  saveCharacter(agent.character);
}
```

## Performance Considerations

- Cache character data in agent memory
- Batch personality updates (don't update DB on every action)
- Use character traits as decision heuristics (fast checks)
- Pre-compute common personality-based thresholds
- Index database by commonly queried traits (combat style, faction, etc.)

## Testing

Verify personality integration:

```typescript
// Create test characters with extreme traits
const aggressive = creator.create({
  personality: { aggression: 100, ... }
});

const peaceful = creator.create({
  personality: { aggression: 0, empathy: 100, ... }
});

// Verify they behave differently in same situation
const aggressiveResponse = aggressive.makeDecision(threat);
const peacefulResponse = peaceful.makeDecision(threat);

assert(aggressiveResponse.type === 'attack');
assert(peacefulResponse.type === 'flee' || peacefulResponse.type === 'negotiate');
```
