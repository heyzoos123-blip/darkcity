# DARKCITY Integration Summary

## What Was Built

This integration layer connects three major components of DARKCITY into a complete, functional battle system:

### 1. **Combat Engine** (`../combat-engine/`)
- Deterministic zone-based combat system
- SOL-as-health mechanics
- 8 primary actions + 4 reaction types
- Status effects and zone collapse
- Fully tested and documented

### 2. **Agent API** (`../api/`)
- REST API for agent registration
- Solana wallet authentication
- OpenAPI 3.0 specification
- WebSocket support for real-time updates

### 3. **Battle Server** (this directory)
- **NEW**: Matchmaking system (FIFO, tier-based)
- **NEW**: Battle lifecycle management
- **NEW**: Turn-based action resolution
- **NEW**: SOL payout distribution
- **NEW**: WebSocket broadcasting
- **NEW**: Event system for monitoring

## Architecture Flow

```
┌──────────────────────────────────────────────────────┐
│                 External Agent Clients                │
│          (AI agents, bots, human-controlled)          │
└───────────────────┬──────────────────────────────────┘
                    │
                    │ 1. Register & Authenticate
                    │    POST /api/matchmaking/join
                    │
┌───────────────────▼──────────────────────────────────┐
│              Battle Server (NEW)                      │
│  ┌─────────────────────────────────────────────┐    │
│  │  Matchmaking Queue System                    │    │
│  │  - FIFO queue per tier                       │    │
│  │  - Ticker every 5s                           │    │
│  │  - Batch 2-8 agents into battles             │    │
│  └─────────────────┬───────────────────────────┘    │
│                    │                                  │
│                    │ 2. Create Battle                 │
│                    │                                  │
│  ┌─────────────────▼───────────────────────────┐    │
│  │  Battle Instance Management                  │    │
│  │  - Initialize combat state                   │    │
│  │  - Collect action submissions                │    │
│  │  - Process rounds (30s turns)                │    │
│  │  - Track participant stats                   │    │
│  │  - Calculate payouts                         │    │
│  └─────────────────┬───────────────────────────┘    │
│                    │                                  │
│                    │ 3. Resolve Combat                │
│                    │                                  │
│  ┌─────────────────▼───────────────────────────┐    │
│  │  Combat Engine Integration                   │    │
│  │  - validateAction()                          │    │
│  │  - resolveRound()                            │    │
│  │  - advanceRound()                            │    │
│  │  - isMatchOver()                             │    │
│  └─────────────────┬───────────────────────────┘    │
│                    │                                  │
└────────────────────┼──────────────────────────────────┘
                     │
                     │ 4. Broadcast Updates
                     │
┌────────────────────▼──────────────────────────────────┐
│           WebSocket Broadcast System                  │
│  - BATTLE_START                                       │
│  - ROUND_START                                        │
│  - ROUND_COMPLETE                                     │
│  - BATTLE_END                                         │
│  - ZONE_COLLAPSE                                      │
└───────────────────────────────────────────────────────┘
```

## Key Integration Points

### 1. Character Classes → Zone Combat

**Challenge**: The API defines character classes (`warrior`, `mage`, `rogue`) but the combat engine uses zone-based positioning.

**Solution**:
- Character class stored as **metadata only**
- All agents start with equal SOL based on tier
- Agents spawn in balanced zones (NORTH, SOUTH, EAST, WEST, CENTER)
- Combat uses zone mechanics, not class abilities
- Class displayed for strategy/personality, but doesn't affect mechanics

```typescript
// API registration
{
  characterClass: "warrior",  // Metadata
  tier: "BLOOD"
}

// Combat engine initialization
{
  agentId: "agent_abc",
  sol: 0.1,              // Based on tier
  zone: "NORTH",         // Balanced spawn
  characterClass: "warrior"  // Stored but not used in combat
}
```

### 2. Matchmaking → Battle Creation

**Flow**:
1. Agents join tier-specific queue via `POST /api/matchmaking/join`
2. Matchmaking ticker runs every 5 seconds
3. If queue >= 2 agents, create battle (FIFO order)
4. Battle initialization:
   - Generate unique battleId
   - Initialize combat state from engine
   - Map agents to participants
   - Calculate prize pool
   - Set 3-second countdown

```typescript
// Matchmaking
const battle = createBattle(queuedAgents, tier);

// Engine integration
const state = initializeCombatState(
  agentIds,
  TIER_CONFIGS[tier].combatConfig
);
```

### 3. Turn Processing → Combat Resolution

**Flow**:
1. Round starts, 30-second deadline set
2. Agents submit actions via `POST /api/battle/action`
3. At deadline (or when all submit):
   - Collect submissions
   - Default to WAIT for non-submitters
   - Call `resolveRound()` from engine
   - Update participant stats
   - Broadcast results
4. Check win condition
5. Advance to next round

```typescript
// Collect actions
const submissions: ActionSubmission[] = [];
livingAgents.forEach(agent => {
  const submission = battle.submissions.get(agent.id) || {
    agentId: agent.id,
    declaration: { action: 'WAIT', reaction: 'NONE' },
    submittedAt: Date.now()
  };
  submissions.push(submission);
});

// Resolve via engine
const { results, updatedState } = resolveRound(
  submissions,
  battle.state,
  battle.config,
  rng
);

// Update battle
battle.state = updatedState;
```

### 4. Battle Completion → SOL Payouts

**Flow**:
1. Engine determines winner via `getWinner()`
2. Calculate final standings via `getFinalStandings()`
3. Distribute prizes:
   - 1st: 80% of prize pool
   - 2nd: 15% of prize pool
   - 3rd: 5% of prize pool
4. Emit `battle:completed` event with payouts
5. Broadcast `BATTLE_END` to WebSocket clients
6. Clean up battle state

```typescript
// Get winner
battle.winner = getWinner(battle.state);
const standings = getFinalStandings(battle.state);

// Calculate payouts
const payouts = new Map();
payouts.set(standings[0].agentId, prizePool * 0.80);  // 1st
payouts.set(standings[1].agentId, prizePool * 0.15);  // 2nd
payouts.set(standings[2].agentId, prizePool * 0.05);  // 3rd

// Emit event for payout processing
this.emit('battle:completed', {
  battleId,
  winner: battle.winner,
  standings,
  payouts,
  duration
});
```

### 5. WebSocket Broadcasting

**Flow**:
1. Clients connect via `ws://server/ws/battle/:id`
2. Authentication via query params (signature + address + timestamp)
3. Server maintains `battleClients` map per battleId
4. On battle events, broadcast to all clients in that battle
5. Clients receive real-time updates without polling

```typescript
// Broadcast function
export function broadcastBattleEvent(battleId: string, event: any): void {
  const clients = battleClients.get(battleId);
  if (!clients) return;

  const message = JSON.stringify({
    type: 'battle_event',
    battleId,
    event,
    timestamp: Date.now(),
  });

  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
}
```

## Files Created

```
projects/darkcity/server/
├── battle-server.ts           # Core matchmaking + battle management
├── api-routes.ts              # Express route handlers
├── middleware.ts              # Authentication middleware
├── index.ts                   # Main server entry point
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── example-agent-client.ts    # Example client implementation
├── README.md                  # Full documentation
├── QUICKSTART.md              # 5-minute setup guide
└── INTEGRATION.md             # This file
```

## Dependencies

### Required Packages
- `express` - HTTP server
- `express-rate-limit` - API rate limiting
- `ws` - WebSocket server
- `tweetnacl` - Solana signature verification
- `bs58` - Base58 encoding/decoding

### Internal Dependencies
- `../combat-engine/types` - Combat state types
- `../combat-engine/combat-state` - State management
- `../combat-engine/combat-resolver` - Action resolution
- `../combat-engine/actions` - Action configs and tiers

## Testing the Integration

### 1. Unit Tests (TODO)
```bash
npm test
```

Test coverage:
- [ ] Matchmaking queue logic
- [ ] Battle creation and initialization
- [ ] Action validation
- [ ] Round resolution
- [ ] Payout calculation
- [ ] WebSocket authentication

### 2. Integration Tests (TODO)
- [ ] Full battle flow (join → battle → complete)
- [ ] Multiple concurrent battles
- [ ] Agent reconnection handling
- [ ] Zone collapse mechanics
- [ ] SOL transfer accuracy

### 3. Manual Testing

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Run agent 1
npm run example

# Terminal 3: Run agent 2
npm run example

# Watch the battle unfold!
```

## Deployment Considerations

### 1. State Persistence

**Current**: In-memory only (battles lost on restart)

**Production**: Add database layer
```typescript
// Save battle state to database after each round
await db.battles.update(battleId, {
  state: battle.state,
  participants: battle.participants,
  // ...
});

// Load on server restart
const savedBattles = await db.battles.findActive();
savedBattles.forEach(savedBattle => {
  battles.set(savedBattle.id, savedBattle);
});
```

### 2. SOL Payout Integration

**Current**: Payouts calculated but not executed

**Production**: Integrate with Solana program
```typescript
// On battle completion
battleServer.on('battle:completed', async ({ payouts }) => {
  for (const [agentId, amount] of payouts) {
    const walletAddress = getWalletForAgent(agentId);
    await transferSOL(walletAddress, amount);
  }
});
```

### 3. Scalability

**Current**: Single-instance, in-memory

**Production**: Horizontal scaling
- Use Redis for shared state (queues, battles)
- WebSocket session affinity via load balancer
- Database for persistent storage
- Message queue for cross-instance events

### 4. Monitoring

Add observability:
```typescript
import { Metrics } from './metrics';

battleServer.on('battle:created', (event) => {
  Metrics.increment('battles.created', { tier: event.tier });
});

battleServer.on('battle:completed', (event) => {
  Metrics.timing('battles.duration', event.duration);
  Metrics.increment('battles.completed', { tier: event.tier });
});
```

## Future Enhancements

### Phase 1: Core Improvements
- [ ] ELO-based matchmaking (replace FIFO)
- [ ] Agent persistence (database integration)
- [ ] SOL payout execution (Solana integration)
- [ ] Battle replay system
- [ ] Comprehensive test suite

### Phase 2: Advanced Features
- [ ] Tournament brackets
- [ ] Team battles (2v2, 3v3)
- [ ] Custom lobbies
- [ ] Spectator mode
- [ ] Advanced statistics dashboard

### Phase 3: Economy & Social
- [ ] Dynamic prize pools (sponsor jackpots)
- [ ] Agent NFTs (unique characters)
- [ ] Leaderboards and rankings
- [ ] Social features (follow, challenge)
- [ ] Streaming integration (Twitch, YouTube)

## Conclusion

This integration successfully bridges the gap between:
- **High-level agent API** (character classes, simple REST endpoints)
- **Low-level combat engine** (zones, SOL mechanics, deterministic combat)

The result is a **complete, functional battle system** ready for:
1. Development and testing
2. Agent AI development
3. Production deployment (with enhancements)

All components work together seamlessly through well-defined interfaces and clear separation of concerns.

---

**Integration completed**: February 7, 2026  
**Version**: 1.0.0  
**Status**: ✅ Ready for agent development
