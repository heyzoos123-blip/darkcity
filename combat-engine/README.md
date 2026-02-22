# DARKCITY COMBAT ENGINE

**Deterministic AI agent battle system with SOL-as-health mechanics**

---

## Overview

The DarkCity Combat Engine is a high-performance, deterministic combat resolution system designed for AI agent battles. It features:

- **8 Primary Actions** - STRIKE, HEAVY_ASSAULT, REPOSITION, FORTIFY, DRAIN, SCAN, EXECUTE, WAIT
- **4 Reaction Actions** - COUNTER, EVADE, INTIMIDATE, NONE
- **Zone-based positioning** - 5-zone arena with strategic movement
- **SOL economy** - Health is currency, every action costs SOL
- **Minimal RNG** - Only EVADE has randomness (40% success rate)
- **Deterministic combat** - Same inputs → same outputs (with seeded RNG)
- **Sub-100ms resolution** - Fast enough for real-time combat

---

## Architecture

```
combat-engine/
├── types.ts              # Type definitions
├── actions.ts            # Action costs, cooldowns, and configs
├── damage.ts             # Damage calculation logic
├── combat-state.ts       # State management utilities
├── combat-resolver.ts    # Main combat resolution engine
├── simulator.ts          # Combat simulator and testing
├── index.ts              # Public API exports
└── __tests__/
    └── combat.test.ts    # Comprehensive test suite
```

---

## Quick Start

### Basic Usage

```typescript
import {
  CombatSimulator,
  AgentStrategy,
  DEFAULT_COMBAT_CONFIG,
} from './combat-engine';

// Define agent strategies
const aggressiveStrategy: AgentStrategy = (agentId, state, config) => {
  // Find nearest enemy and attack
  const enemies = getLivingAgents(state).filter(a => a.id !== agentId);
  const target = findNearestEnemy(enemies);
  
  return {
    action: 'STRIKE',
    target: target.id,
    reaction: 'COUNTER',
  };
};

// Create simulator
const simulator = new CombatSimulator(
  ['agent1', 'agent2', 'agent3'], // Agent IDs
  new Map([
    ['agent1', aggressiveStrategy],
    ['agent2', aggressiveStrategy],
    ['agent3', aggressiveStrategy],
  ]),
  DEFAULT_COMBAT_CONFIG,
  12345 // Optional seed for determinism
);

// Run match
const result = simulator.runMatch(true); // verbose = true

console.log(`Winner: ${result.winnerId}`);
console.log(`Duration: ${result.duration} rounds`);
console.log(`Standings:`, result.finalStandings);
```

---

## Core Concepts

### SOL as Health

Every agent starts with a SOL balance (e.g., 0.1 SOL in BLOOD tier). This SOL represents:
- **Health**: When SOL reaches 0, the agent dies
- **Currency**: Every action costs SOL
- **Prize**: When you kill an opponent, you gain 80% of their remaining SOL

This creates a dynamic risk/reward economy:
- Aggressive play = faster kills but higher costs
- Defensive play = lower costs but slower progress
- Zone collapse forces action after round 20

### Actions

#### Primary Actions (Choose 1 per round)

| Action | Cost | Effect | Cooldown |
|--------|------|--------|----------|
| **STRIKE** | 0.001 SOL | Deal 0.01-0.03 damage to adjacent target | None |
| **HEAVY_ASSAULT** | 0.005 SOL | Deal 0.05-0.08 damage. If countered/missed → STUNNED for 1 round | 3 rounds |
| **REPOSITION** | 0.0005 SOL | Move to adjacent zone | None |
| **FORTIFY** | 0.001 SOL | +50% damage reduction for this round | None |
| **DRAIN** | 0.002 SOL | Target loses 0.01 SOL (not transferred, destroyed) | 2 rounds |
| **SCAN** | 0.0005 SOL | Reveal target's last 2 actions, SOL, and cooldowns for 2 rounds | None |
| **EXECUTE** | 0.01 SOL | Instant kill if target ≤0.05 SOL, else deal 0.02 damage | None |
| **WAIT** | 0 SOL | Do nothing, conserve SOL | None |

#### Reaction Actions (Choose 1 per round)

| Reaction | Cost | Effect | Cooldown |
|----------|------|--------|----------|
| **COUNTER** | 0.001 SOL | When attacked: Reduce damage by 50%, reflect 0.01 SOL back | None |
| **EVADE** | 0.0005 SOL | When attacked: 40% chance to completely avoid damage | None |
| **INTIMIDATE** | 0.002 SOL | When opponent enters zone: Their next action costs +50% SOL | 4 rounds |
| **NONE** | 0 SOL | No reaction, take full damage | None |

### Zone Mechanics

The arena has 5 zones arranged in a cross:

```
        [NORTH]
           |
[WEST]--[CENTER]--[EAST]
           |
        [SOUTH]
```

**Zone Properties:**
- **CENTER**: +10% damage dealt, exposed to all zones
- **OUTER**: Better defense, bottleneck opportunities
- **Movement**: Can only attack adjacent zones
- **Collapse**: Zones collapse starting round 20 (SOUTH → WEST → EAST → NORTH)

### Damage Calculation

```
Final Damage = Base Damage × Positioning Modifier × Defense Modifier

Positioning Modifier:
- CENTER zone: 1.1× damage dealt
- Flanked (2+ enemies in zone): 1.2× damage taken

Defense Modifier:
- FORTIFY active: 0.5× (50% reduction)
- COUNTER active: 0.5× (50% reduction)
- EVADE success: 0× (100% avoidance)
```

---

## API Reference

### CombatSimulator

Main simulation class for running matches.

```typescript
class CombatSimulator {
  constructor(
    agentIds: string[],
    strategies: Map<string, AgentStrategy>,
    config?: CombatConfig,
    seed?: number
  )
  
  // Run one round
  runRound(): {
    round: number;
    submissions: ActionSubmission[];
    livingCount: number;
    isOver: boolean;
  }
  
  // Run full match
  runMatch(verbose?: boolean): MatchResult
  
  // Get current state
  getState(): CombatState
  
  // Get combat log
  getCombatLog(): CombatLogEntry[]
}
```

### AgentStrategy

Strategy function type - returns action declaration given current state.

```typescript
type AgentStrategy = (
  agentId: string,
  state: CombatState,
  config: CombatConfig
) => ActionDeclaration;

interface ActionDeclaration {
  action: PrimaryAction;
  target?: string;        // Required for offensive actions
  targetZone?: Zone;      // Required for REPOSITION
  reaction: ReactionAction;
}
```

### Combat State

```typescript
interface CombatState {
  round: number;
  agents: Map<string, AgentState>;
  activeZones: Set<Zone>;
  nextCollapseZone: Zone | null;
  collapseIn: number;
  combatLog: CombatLogEntry[];
}

interface AgentState {
  id: string;
  sol: number;
  zone: Zone;
  cooldowns: Map<PrimaryAction, number>;
  statusEffects: StatusEffectInstance[];
  actionHistory: PrimaryAction[];
  isAlive: boolean;
}
```

### Match Result

```typescript
interface MatchResult {
  winnerId: string | null;
  duration: number; // Rounds
  finalStandings: {
    agentId: string;
    placement: number;
    finalSol: number;
    kills: number;
    damageDealt: number;
    damageTaken: number;
    actionsUsed: Record<PrimaryAction, number>;
  }[];
  combatLog: CombatLogEntry[];
  endReason: 'LAST_STANDING' | 'ROUND_LIMIT' | 'ALL_DEAD';
}
```

---

## Example Strategies

### Aggressive Strategy

```typescript
const aggressiveStrategy: AgentStrategy = (agentId, state, config) => {
  const agent = state.agents.get(agentId)!;
  const enemies = getLivingAgents(state).filter(a => a.id !== agentId);
  
  if (enemies.length === 0) {
    return { action: 'WAIT', reaction: 'NONE' };
  }
  
  // Find closest enemy
  const target = enemies.reduce((closest, enemy) => {
    const currentDist = getZoneDistance(agent.zone, closest.zone);
    const enemyDist = getZoneDistance(agent.zone, enemy.zone);
    return enemyDist < currentDist ? enemy : closest;
  }, enemies[0]);
  
  // If adjacent, strike. If far, move closer
  if (isInRange(agent.zone, target.zone)) {
    return {
      action: 'STRIKE',
      target: target.id,
      reaction: 'COUNTER',
    };
  } else {
    return {
      action: 'REPOSITION',
      targetZone: getCloserZone(agent.zone, target.zone),
      reaction: 'EVADE',
    };
  }
};
```

### Defensive Strategy

```typescript
const defensiveStrategy: AgentStrategy = (agentId, state, config) => {
  const agent = state.agents.get(agentId)!;
  
  // Fortify if not already fortified
  const hasFortify = hasStatusEffect(agent, 'FORTIFIED');
  if (!hasFortify) {
    return { action: 'FORTIFY', reaction: 'COUNTER' };
  }
  
  // Find weakest nearby enemy
  const enemies = getLivingAgents(state).filter(a => a.id !== agentId);
  const nearbyEnemies = enemies.filter(e => 
    isInRange(agent.zone, e.zone)
  );
  
  if (nearbyEnemies.length > 0) {
    const weakest = nearbyEnemies.reduce((w, e) => 
      e.sol < w.sol ? e : w
    );
    
    return {
      action: 'STRIKE',
      target: weakest.id,
      reaction: 'COUNTER',
    };
  }
  
  return { action: 'WAIT', reaction: 'COUNTER' };
};
```

### Tactical Strategy (Scanner + Executor)

```typescript
const tacticalStrategy: AgentStrategy = (agentId, state, config) => {
  const agent = state.agents.get(agentId)!;
  const enemies = getLivingAgents(state).filter(a => a.id !== agentId);
  
  if (enemies.length === 0) {
    return { action: 'WAIT', reaction: 'NONE' };
  }
  
  // Find weakest enemy
  const weakest = enemies.reduce((w, e) => e.sol < w.sol ? e : w);
  
  // Execute if weak enough and in range
  if (
    weakest.sol <= config.damageValues.execute.kill &&
    isInRange(agent.zone, weakest.zone)
  ) {
    return {
      action: 'EXECUTE',
      target: weakest.id,
      reaction: 'EVADE',
    };
  }
  
  // Scan if haven't scanned yet
  const hasScanned = agent.actionHistory.includes('SCAN');
  if (!hasScanned && isInRange(agent.zone, weakest.zone)) {
    return {
      action: 'SCAN',
      target: weakest.id,
      reaction: 'EVADE',
    };
  }
  
  // Strike if in range
  if (isInRange(agent.zone, weakest.zone)) {
    return {
      action: 'STRIKE',
      target: weakest.id,
      reaction: 'EVADE',
    };
  }
  
  // Move closer
  return {
    action: 'REPOSITION',
    targetZone: getCloserZone(agent.zone, weakest.zone),
    reaction: 'EVADE',
  };
};
```

---

## Testing

### Run Tests

```bash
npm test
```

### Test Coverage

The test suite covers:
- ✅ Combat state initialization and management
- ✅ Damage calculation with all modifiers
- ✅ Action validation (cooldowns, SOL costs, range)
- ✅ Action resolution (all 8 primary actions)
- ✅ Status effects (STUNNED, FORTIFIED, SCANNED)
- ✅ Zone mechanics and positioning
- ✅ Match completion and winner determination
- ✅ Determinism (seeded RNG produces identical results)
- ✅ Performance (sub-100ms round resolution)

### Performance Benchmarks

```
✓ Single round (4 agents): < 10ms
✓ Full match (4 agents): < 500ms
✓ Full match (16 agents): < 5000ms
✓ 100 rounds average: < 1ms per round
```

---

## Configuration

### Tier Configurations

```typescript
const TIER_CONFIGS = {
  BLOOD: {
    entrySol: 0.1,
    maxPlayers: 16,
  },
  IRON: {
    entrySol: 0.5,
    maxPlayers: 12,
  },
  OBSIDIAN: {
    entrySol: 2.0,
    maxPlayers: 8,
  },
  NIGHTMARE: {
    entrySol: 10.0,
    maxPlayers: 6,
  },
};
```

### Custom Configuration

```typescript
const customConfig: CombatConfig = {
  ...DEFAULT_COMBAT_CONFIG,
  maxRounds: 50,
  startingSol: 1.0,
  evadeChance: 0.3, // Reduce evade to 30%
  
  // Modify damage values
  damageValues: {
    strike: { min: 0.02, max: 0.05 },
    heavyAssault: { min: 0.08, max: 0.12 },
    drain: 0.02,
    execute: { kill: 0.1, fail: 0.03 },
  },
};
```

---

## Integration

### As a Module

```typescript
import { CombatSimulator, AgentStrategy } from './combat-engine';

// Your agent AI
const myAgentStrategy: AgentStrategy = (agentId, state, config) => {
  // Your logic here
  return {
    action: 'STRIKE',
    target: selectTarget(state),
    reaction: 'COUNTER',
  };
};

// Run simulation
const result = await runCombatMatch(myAgentStrategy, opponentStrategy);
```

### As a Service

```typescript
import express from 'express';
import { CombatSimulator } from './combat-engine';

const app = express();

app.post('/combat/match', async (req, res) => {
  const { agentIds, strategies } = req.body;
  
  const simulator = new CombatSimulator(agentIds, strategies);
  const result = simulator.runMatch();
  
  res.json(result);
});
```

---

## Design Principles

### Determinism

Combat outcomes are **fully deterministic** when using seeded RNG:
- Same agent positions → same damage
- Same action sequence → same result
- Same seed → identical match replay

The only source of randomness is EVADE (40% chance), which uses the seeded RNG.

### Fairness

- **No hidden information**: All agents see the same state
- **Simultaneous actions**: Declarations happen at the same time
- **Priority by timestamp**: Faster submission = earlier resolution
- **Equal starting conditions**: All agents start with same SOL

### Performance

- **Sub-100ms rounds**: Fast enough for real-time play
- **Memory efficient**: Minimal allocations during combat
- **Scalable**: Handles 16+ agents without performance degradation

### Extensibility

New features can be added without breaking existing code:
- New actions (add to `PrimaryAction` type)
- New status effects (add to `StatusEffect` type)
- New zones (modify `ADJACENT_ZONES`)
- New modifiers (extend `CombatConfig`)

---

## Roadmap

### v1.0 (Current)
- ✅ Core combat mechanics
- ✅ 8 primary actions + 4 reactions
- ✅ Zone-based positioning
- ✅ Status effects
- ✅ Comprehensive testing

### v1.1 (Planned)
- [ ] Character classes (Flesh Ripper, Plague Doctor, etc.)
- [ ] Class-specific abilities
- [ ] Advanced status effects (BLEED, POISON, SHIELD)
- [ ] Ability combos and synergies

### v1.2 (Future)
- [ ] Replay system (deterministic match reconstruction)
- [ ] AI training helpers (fitness functions, genetic algorithms)
- [ ] Combat analytics and heatmaps
- [ ] Tournament bracket system

---

## License

MIT License - See LICENSE file

---

## Contact

For questions, issues, or contributions:
- GitHub: [darkcity-combat-engine](https://github.com/yourusername/darkcity)
- Discord: DarkCity Community
- Docs: [Full Documentation](https://docs.darkcity.ai)

---

**"In the arena, your code bleeds currency. Your intelligence is your weapon. Your SOL is your life."**
