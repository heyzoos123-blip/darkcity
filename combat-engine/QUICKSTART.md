# DARKCITY COMBAT ENGINE - QUICK START

Get your first battle running in **5 minutes**.

---

## Installation

```bash
cd projects/darkcity/combat-engine
npm install
```

---

## Run Your First Battle

### Option 1: Run Example (Easiest)

```bash
npm run example
```

This runs a pre-configured 1v1 match between aggressive and defensive strategies.

### Option 2: Write Your Own (5 lines)

Create `my-first-battle.ts`:

```typescript
import { CombatSimulator, aggressiveStrategy } from './combat-engine';

const sim = new CombatSimulator(
  ['agent1', 'agent2'],
  new Map([
    ['agent1', aggressiveStrategy],
    ['agent2', aggressiveStrategy],
  ])
);

const result = sim.runMatch(true);
console.log(`Winner: ${result.winnerId}`);
```

Run it:
```bash
ts-node my-first-battle.ts
```

---

## Create Your Own Strategy

```typescript
import { AgentStrategy, getLivingAgents } from './combat-engine';

const myStrategy: AgentStrategy = (agentId, state, config) => {
  const agent = state.agents.get(agentId)!;
  const enemies = getLivingAgents(state).filter(a => a.id !== agentId);
  
  // Find weakest enemy
  const weakest = enemies.reduce((w, e) => e.sol < w.sol ? e : w);
  
  // Strike if in range
  if (isInRange(agent.zone, weakest.zone)) {
    return {
      action: 'STRIKE',
      target: weakest.id,
      reaction: 'COUNTER',
    };
  }
  
  // Otherwise wait
  return { action: 'WAIT', reaction: 'NONE' };
};
```

---

## Run Tests

```bash
npm test
```

Expected output:
```
✓ Combat State Management (8 tests)
✓ Damage Calculation (6 tests)
✓ Action Validation (6 tests)
✓ Action Resolution (4 tests)
✓ Combat Simulator (3 tests)
✓ Combat Determinism (1 test)
✓ Combat Performance (2 tests)

Test Suites: 1 passed
Tests: 30 passed
Time: ~500ms
```

---

## Run Benchmark

```bash
npm run benchmark
```

Expected output:
```
BENCHMARK: 1v1 Combat
✅ Performance: EXCELLENT
Average: 2.5ms/round

BENCHMARK: 16-Player Battle Royale
✅ Performance: GOOD
Average: 45ms/round
```

---

## Next Steps

1. **Read the README**: `README.md` has full documentation
2. **Study examples**: Check `examples/` folder
3. **Run tests**: Understand mechanics through test cases
4. **Build your AI**: Create winning strategies
5. **Integrate**: Connect to your backend/blockchain

---

## Common Issues

### "Module not found"
```bash
npm install
```

### "Cannot find name 'getLivingAgents'"
```typescript
import { getLivingAgents } from './combat-state';
```

### "Tests fail"
Make sure you're using Node 20+ and TypeScript 5+.

---

## Resources

- **Full Docs**: [README.md](./README.md)
- **Game Design**: [../../../docs/DARKCITY_GAME_DESIGN.md](../../../docs/DARKCITY_GAME_DESIGN.md)
- **Examples**: [examples/](./examples/)
- **Tests**: [__tests__/](./__ tests __/)

---

**Ready to build a killer AI? Let's fight. ⚔️**
