# Quick Start Guide - DARKCITY Event Engine

Get the Event Engine running in 5 minutes.

## Prerequisites

```bash
# Check Node.js version
node --version  # Should be v18+

# Check Redis
redis-cli ping  # Should return "PONG"
```

## Installation

```bash
cd projects/darkcity/event-engine
npm install
```

## Run the Demo

```bash
# Start Redis (if not running)
redis-server

# In another terminal, run the basic example
npm run dev
```

You should see:
```
DARKCITY Event Engine - Basic Example

🤖 Agents placed in zones
   Agent 1 & 2 in: Downtown
   Agent 3 in: Industrial District

=================================
DARKCITY EVENT ENGINE
=================================
[EventEngine] Connecting to Redis...
[RedisPubSub] Connected to Redis
[EventGenerator] Starting event engine...
[EventGenerator] Scheduled events initialized
[EventGenerator] Event engine started
[EventEngine] ✓ Event Engine started successfully
=================================

⏱️  Engine running... (will run for 60 seconds)
   Watch for events to be generated!
```

## What You'll See

Every 10 seconds, stats will be printed:
```
📊 Statistics:
   Running: true
   Zones: 2
   Time of Day: 13:00
   Weather: CLEAR
   Total Events: 5
   Active Participations: 1
```

When events happen:
```
📢 Event Generated: TIME_OF_DAY_CHANGE
   ID: 550e8400-e29b-41d4-a716-446655440000
   Time: 2026-02-22T04:52:31.234Z

🎭 Encounter Started!
   Type: MUGGING
   Narrative: A shadowy figure steps out from an alley...
   Choices: 4
   1. Fight back: Attempt to fight off the mugger
   2. Run away: Try to escape
   3. Hand over your belongings: Comply with demands
   4. Try to talk your way out: Negotiate
```

## Try the Advanced Demo

```bash
ts-node src/examples/advanced.ts
```

This shows:
- Multiple zones (Downtown, Dark Alley, Nightclub, Industrial)
- Multiple agents moving around
- Real-time event subscriptions
- Dynamic event rate adjustment
- Automatic agent decision-making

Press `Ctrl+C` to stop.

## Create Your Own

```typescript
import { EventEngine } from '@darkcity/event-engine';
import { defaultConfig } from './config/default';

async function myApp() {
  // 1. Create engine
  const engine = new EventEngine(defaultConfig);

  // 2. Register a zone
  engine.registerZone({
    id: 'my-zone',
    name: 'My Zone',
    type: 'COMMERCIAL',
    districtId: 'downtown',
    maxOccupancy: 100,
    currentOccupancy: 0,
    eventProbabilities: {
      ENCOUNTER: 0.02
    },
    activeEventCount: 0
  });

  // 3. Add an agent
  engine.updateAgentLocation('my-agent', 'my-zone');

  // 4. Listen for events
  engine.on('encounter:started', (event) => {
    console.log('Encounter!', event.narrative);
  });

  // 5. Start
  await engine.start();

  // Let it run...
  await new Promise(resolve => setTimeout(resolve, 30000));

  // 6. Stop
  await engine.stop();
}

myApp();
```

## Common Patterns

### Subscribe to Zone Events
```typescript
await engine.subscribeToZone('downtown', (event) => {
  console.log(`[Downtown] ${event.type}`);
});
```

### Handle Agent Choices
```typescript
engine.on('encounter:started', async (event) => {
  // Pick first choice
  const choice = event.choices[0];
  
  const resolution = await engine.handleAgentChoice(
    event.id,
    event.participants[0],
    choice.id
  );
  
  console.log('Outcome:', resolution);
});
```

### Query Event History
```typescript
// Get last 20 events for an agent
const history = await engine.getAgentHistory('my-agent', 20);

// Get events in a zone
const zoneEvents = await engine.getZoneEvents('downtown');

// Get events by type
const muggings = await engine.queryEvents({
  type: 'MUGGING',
  limit: 10
});
```

### Adjust Event Rate
```typescript
// 2x events
engine.setGlobalEventRate(2.0);

// Half events
engine.setGlobalEventRate(0.5);
```

## Troubleshooting

### "Cannot connect to Redis"
```bash
# Start Redis
redis-server

# Or using Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### "Module not found"
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build
```

### "Port already in use"
Change Redis port in config:
```typescript
redis: {
  host: 'localhost',
  port: 6380  // Different port
}
```

## Next Steps

1. Read [README.md](./README.md) for full documentation
2. Read [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup
3. Check [SUMMARY.md](./SUMMARY.md) for architecture overview
4. Explore `src/examples/` for more examples

## Need Help?

- Check the examples in `src/examples/`
- Read the type definitions in `src/types/`
- Review the architecture in `ARCHITECTURE.md`
- Look at test cases (coming soon)

---

**Have fun making the city come alive!** 🌃
