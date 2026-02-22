# DARKCITY Event Engine

The heart of DARKCITY - a sophisticated event generation and distribution system that makes the city feel alive through dynamic, organic events.

## Overview

The Event Engine generates and manages four categories of events:
- **Environmental Events**: Weather, time of day, city-wide announcements
- **Encounter Events**: Random encounters, crimes, discoveries, opportunities
- **Social Events**: Agent-initiated conversations, transactions, collaborations
- **Economic Events**: Purchases, sales, services, resource transfers

Events are:
- **Generated** based on time, probability, and agent actions
- **Routed** to appropriate zones and agents via Redis pub/sub
- **Processed** to apply effects and update state
- **Stored** immutably for history and analytics
- **Broadcast** in real-time via WebSocket

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Event Generator                       │
│  • Scheduled (cron)                                     │
│  • Random (probabilistic)                               │
│  • Triggered (agent actions)                            │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│                     Event Router                         │
│  • Zone-based routing                                   │
│  • Priority handling                                    │
│  • Redis pub/sub distribution                           │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌──────────────┐      ┌──────────────┐
│   Processor  │      │ Event Store  │
│  • Effects   │      │  • History   │
│  • Memory    │      │  • Queries   │
│  • State     │      │  • Analytics │
└──────────────┘      └──────────────┘
```

## Installation

```bash
cd projects/darkcity/event-engine
npm install
```

## Configuration

Edit `config/default.ts` or use environment variables:

```typescript
{
  generator: {
    tickInterval: 100,        // milliseconds between ticks
    enableScheduled: true,    // scheduled events (day/night)
    enableRandom: true,       // random encounters
    enableTriggered: true,    // agent-triggered events
    globalEventRate: 1.0      // event probability multiplier
  },
  
  redis: {
    host: 'localhost',
    port: 6379,
    password: undefined,
    db: 0
  }
}
```

## Quick Start

### Basic Usage

```typescript
import { EventEngine } from '@darkcity/event-engine';
import { defaultConfig } from './config/default';

// Create engine
const engine = new EventEngine(defaultConfig);

// Register zones
engine.registerZone({
  id: 'downtown',
  name: 'Downtown',
  type: 'COMMERCIAL',
  eventProbabilities: {
    ENCOUNTER: 0.02  // 2% per tick
  }
});

// Add agents
engine.updateAgentLocation('agent-001', 'downtown');

// Listen for events
engine.on('event:generated', (event) => {
  console.log(`Event: ${event.type}`);
});

// Start
await engine.start();
```

### Encounter Handling

```typescript
// Listen for encounters
engine.on('encounter:started', async (event) => {
  console.log(`Encounter: ${event.narrative}`);
  console.log('Choices:');
  event.choices.forEach(choice => {
    console.log(`  - ${choice.label}`);
  });
});

// Handle agent choice
const resolution = await engine.handleAgentChoice(
  eventId,
  agentId,
  choiceId
);

console.log(resolution.participantResults[agentId]);
```

### Event Subscriptions

```typescript
// Subscribe to zone events
await engine.subscribeToZone('downtown', (event) => {
  console.log(`[Downtown] ${event.type}`);
});

// Subscribe to agent events
await engine.subscribeToAgent('agent-001', (event) => {
  console.log(`[Agent] ${event.type}`);
});

// Subscribe to global events
await engine.subscribeToGlobal((event) => {
  console.log(`[Global] ${event.type}`);
});
```

### Query Event History

```typescript
// Get agent history
const history = await engine.getAgentHistory('agent-001', 50);

// Get zone events
const zoneEvents = await engine.getZoneEvents(
  'downtown',
  startTime,
  endTime,
  50
);

// Query with filters
const filtered = await engine.queryEvents({
  type: 'MUGGING',
  zoneId: 'downtown',
  startTime: Date.now() - 3600000,
  limit: 20
});
```

## Event Types

### Environmental Events

System-generated events that affect zones or the entire city.

```typescript
{
  type: 'WEATHER_CHANGE',
  scope: 'GLOBAL',
  affectedArea: ['*'],
  effects: [
    {
      type: 'STAT_MODIFIER',
      magnitude: -0.2,
      description: 'Movement speed reduced'
    }
  ]
}
```

**Types:**
- `WEATHER_CHANGE` - Rain, storm, fog, clear
- `TIME_OF_DAY_CHANGE` - Morning, afternoon, evening, night
- `CITY_ANNOUNCEMENT` - Mayor announcements, alerts
- `INFRASTRUCTURE_EVENT` - Power outages, construction
- `FESTIVAL` - District-wide celebrations
- `EMERGENCY` - Fires, accidents

### Encounter Events

Random or triggered events that require agent decisions.

```typescript
{
  type: 'MUGGING',
  narrative: 'A shadowy figure demands your wallet',
  choices: [
    {
      id: 'fight',
      label: 'Fight back',
      requirements: [
        { type: 'STAT', name: 'combat_skill', value: 3, operator: 'GT' }
      ],
      outcomes: [
        {
          weight: 0.6,
          effects: [...],
          narrative: 'You scare off the mugger'
        }
      ]
    }
  ]
}
```

**Types:**
- `MUGGING` - Street robbery
- `FOUND_ITEM` - Discover item
- `MYSTERIOUS_STRANGER` - Unknown encounter
- `OPPORTUNITY` - Business/job opportunity
- `ACCIDENT` - Witness accident
- `DISCOVERY` - Find hidden location

### Social Events

Agent-initiated interactions.

```typescript
{
  type: 'CONVERSATION',
  initiator: 'agent-001',
  participants: ['agent-002'],
  location: 'downtown',
  status: 'ACTIVE',
  thread: [
    {
      from: 'agent-001',
      content: { text: 'Hello!' }
    }
  ]
}
```

### Economic Events

Transaction-based events.

```typescript
{
  type: 'PURCHASE',
  from: 'agent-001',
  to: 'SYSTEM',
  amount: 100,
  currency: 'DARKCOIN',
  item: 'item-123',
  location: 'shop-downtown'
}
```

## Zone Configuration

```typescript
{
  id: 'downtown',
  districtId: 'central',
  name: 'Downtown Plaza',
  type: 'COMMERCIAL',
  maxOccupancy: 100,
  eventProbabilities: {
    ENCOUNTER: 0.02,      // 2% per tick
    OPPORTUNITY: 0.015,   // 1.5% per tick
    FOUND_ITEM: 0.01      // 1% per tick
  }
}
```

**Zone Types:**
- `COMMERCIAL` - Shops, restaurants
- `RESIDENTIAL` - Apartments, housing
- `ENTERTAINMENT` - Clubs, theaters
- `BUSINESS` - Offices
- `INDUSTRIAL` - Factories, warehouses
- `TRANSIT` - Stations, hubs
- `PUBLIC` - Parks, plazas
- `UNDERGROUND` - Hidden areas

## Event Scheduling

The engine uses `node-cron` for scheduled events:

```typescript
// Day/night cycle - every 10 minutes = 1 hour game time
'*/10 * * * *'  // Every 10 minutes

// Weather changes - every 30 minutes
'*/30 * * * *'  // Every 30 minutes

// City announcements - every 3 hours (30% chance)
'0 */3 * * *'   // Every 3 hours
```

## Event Probability

Events are generated probabilistically each tick (default 100ms):

```typescript
// Base probability per zone
eventProbabilities: {
  ENCOUNTER: 0.02  // 2% per tick = ~20% per second
}

// Affected by:
globalEventRate: 2.0  // Doubles all probabilities

// Modified by:
- Zone type (industrial higher danger)
- Time of day (night = more crime)
- Weather (rain = fewer outdoor events)
- Current occupancy (more agents = more events)
```

## Redis Channels

Events are distributed via Redis pub/sub:

```
darkcity.events.global            # Global events
darkcity.events.zone.{zoneId}     # Zone-specific
darkcity.events.agent.{agentId}   # Agent-specific
darkcity.events.high-priority     # Urgent events
darkcity.events.dlq               # Failed events
```

## Examples

Run the included examples:

```bash
# Basic example (60 seconds)
npm run dev

# Advanced example (multiple zones, agents)
ts-node src/examples/advanced.ts
```

## API Reference

### EventEngine

#### Methods

- `start()` - Start the event engine
- `stop()` - Stop the event engine
- `registerZone(zone)` - Register a zone
- `updateAgentLocation(agentId, zoneId)` - Update agent location
- `subscribeToZone(zoneId, handler)` - Subscribe to zone events
- `subscribeToAgent(agentId, handler)` - Subscribe to agent events
- `subscribeToGlobal(handler)` - Subscribe to global events
- `handleAgentChoice(eventId, agentId, choiceId)` - Handle encounter choice
- `queryEvents(query)` - Query event history
- `getAgentHistory(agentId, limit)` - Get agent event history
- `getZoneEvents(zoneId, start, end, limit)` - Get zone events
- `setGlobalEventRate(rate)` - Adjust event generation rate
- `getStats()` - Get engine statistics
- `getStatus()` - Get engine status

#### Events

- `started` - Engine started
- `stopped` - Engine stopped
- `event:generated` - Event generated
- `event:routed` - Event routed
- `event:processed` - Event processed
- `event:resolved` - Event resolved
- `encounter:started` - Encounter event started
- `social:started` - Social event started
- `error` - Error occurred

## Integration Points

### WebSocket Broadcasting

```typescript
// Connect to Redis channel via Socket.io
io.on('connection', (socket) => {
  engine.subscribeToAgent(socket.userId, (event) => {
    socket.emit('event', event);
  });
});
```

### Memory System

```typescript
engine.on('event:resolved', async (resolution) => {
  // Write to agent memory
  await memoryService.writeExperience(
    resolution.eventId,
    resolution.participantResults
  );
});
```

### AI Orchestrator

```typescript
engine.on('encounter:started', async (event) => {
  // Generate agent response
  const response = await aiOrchestrator.generateChoice(
    agentId,
    event,
    agentMemory
  );
  
  await engine.handleAgentChoice(
    event.id,
    agentId,
    response.choiceId
  );
});
```

## Performance

- **Tick Rate**: 10 ticks/second (100ms interval)
- **Event Generation**: ~1-10 events/second (varies by zones & rate)
- **Redis Latency**: <5ms
- **Event Processing**: <10ms
- **Memory Usage**: ~50MB base + ~1KB per event

## Scaling

The Event Engine is designed to scale horizontally:

- **Multiple instances**: Share load via Redis pub/sub
- **Zone partitioning**: Different instances handle different zones
- **Consumer groups**: Multiple processors per topic
- **Event archival**: Move old events to cold storage

## Development

```bash
# Build
npm run build

# Development with auto-reload
npm run dev

# Lint
npm run lint

# Test
npm test
```

## License

MIT

---

**Built for DARKCITY** - Making the city feel alive through organic, meaningful events.
