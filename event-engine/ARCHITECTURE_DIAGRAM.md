# DARKCITY Event Engine - Architecture Diagrams

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        EVENT ENGINE                              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                  Event Generator                        │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │    │
│  │  │ Environmental│  │   Encounter  │  │   Scheduled  │ │    │
│  │  │  Generator   │  │   Generator  │  │    Tasks     │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │    │
│  │           │                │                  │         │    │
│  └───────────┼────────────────┼──────────────────┼─────────┘    │
│              │                │                  │               │
│              └────────────────┴──────────────────┘               │
│                               ▼                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                     Event Router                        │    │
│  │  • Type-based routing                                  │    │
│  │  • Zone distribution                                   │    │
│  │  • Priority handling                                   │    │
│  └──────────────────────┬─────────────────────────────────┘    │
│                         │                                       │
│         ┌───────────────┼───────────────┐                      │
│         ▼               ▼               ▼                      │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                  │
│  │          │   │          │   │          │                  │
│  │ Processor│   │  Store   │   │  PubSub  │                  │
│  │          │   │          │   │          │                  │
│  └──────────┘   └──────────┘   └──────────┘                  │
│       │               │               │                       │
│       ▼               ▼               ▼                       │
│  Apply Effects   Save History    Broadcast                    │
└─────────────────────────────────────────────────────────────────┘
         │               │               │
         ▼               ▼               ▼
    Agents         Analytics        WebSocket
  (via memory)     (TimescaleDB)    Clients
```

## Event Generation Flow

```
START: Tick Event (every 100ms)
    │
    ▼
┌────────────────────────────────┐
│ 1. Check Scheduled Events      │ ──▶ Day/Night Cycle
│    (node-cron)                 │     Weather Changes
└────────────────────────────────┘     City Announcements
    │
    ▼
┌────────────────────────────────┐
│ 2. Process Each Zone           │
│    For zone in zones:          │
│      - Get agents in zone      │
│      - Calculate probability   │ ──▶ Base prob × modifiers
│      - Roll for event          │     × global rate
└────────────────────────────────┘
    │
    ▼
┌────────────────────────────────┐
│ 3. Event Generated?            │
│    if (random < probability)   │ ──Yes──▶ Generate Event
└────────────────────────────────┘           │
    │ No                                      │
    ▼                                         ▼
Skip to next zone            ┌────────────────────────────────┐
                             │ 4. Select Event Type           │
                             │    - Environmental             │
                             │    - Encounter                 │
                             │    - Based on zone type        │
                             └────────────────────────────────┘
                                         │
                                         ▼
                             ┌────────────────────────────────┐
                             │ 5. Create Event Object         │
                             │    - ID, timestamp             │
                             │    - Type, participants        │
                             │    - Choices, effects          │
                             │    - Narrative                 │
                             └────────────────────────────────┘
                                         │
                                         ▼
                                    Route Event
```

## Event Processing Pipeline

```
Event Generated
    │
    ▼
┌─────────────────────────────────────┐
│         Event Router                │
│                                     │
│  1. Determine targets               │ ──▶ Zones: [zoneId]
│     - Zones affected                │     Agents: [agentIds]
│     - Agents involved               │     Priority: HIGH/NORMAL/LOW
│                                     │
│  2. Create RoutedEvent              │
└─────────────────────────────────────┘
    │
    ├──────────────────┬──────────────────┬───────────────┐
    ▼                  ▼                  ▼               ▼
┌─────────┐      ┌─────────┐      ┌─────────┐     ┌─────────┐
│ Store   │      │ Process │      │ Broadcast│     │ Track   │
│ Event   │      │ Effects │      │ via      │     │ Active  │
│         │      │         │      │ Redis    │     │ Events  │
└─────────┘      └─────────┘      └─────────┘     └─────────┘
    │                  │                  │               │
    ▼                  ▼                  ▼               ▼
Immutable       Apply to agents    WebSocket      Statistics
  Log           Memory write       Clients        Monitoring
                State update
```

## Redis Pub/Sub Channels

```
┌──────────────────────────────────────────────────────────────┐
│                      Redis Broker                             │
│                                                               │
│  Channels:                                                    │
│                                                               │
│  darkcity.events.global ──────────────────┐                 │
│    All city-wide events                   │                 │
│                                            ├──▶ Subscribers  │
│  darkcity.events.zone.{zoneId} ───────────┤                 │
│    Events in specific zone                │    • WebSocket  │
│                                            │    • AI Agents  │
│  darkcity.events.agent.{agentId} ─────────┤    • Analytics  │
│    Events for specific agent              │    • Memory Sys │
│                                            │                 │
│  darkcity.events.high-priority ───────────┤                 │
│    Urgent events (emergencies)            │                 │
│                                            │                 │
│  darkcity.events.dlq ─────────────────────┘                 │
│    Failed events (retry later)                              │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Event Type Hierarchy

```
BaseEvent
    │
    ├─── EnvironmentalEvent
    │       ├─ WEATHER_CHANGE
    │       ├─ TIME_OF_DAY_CHANGE
    │       ├─ CITY_ANNOUNCEMENT
    │       ├─ INFRASTRUCTURE_EVENT
    │       ├─ FESTIVAL
    │       └─ EMERGENCY
    │
    ├─── EncounterEvent
    │       ├─ MUGGING
    │       ├─ FOUND_ITEM
    │       ├─ MYSTERIOUS_STRANGER
    │       ├─ OPPORTUNITY
    │       ├─ ACCIDENT
    │       └─ DISCOVERY
    │
    ├─── SocialEvent
    │       ├─ CONVERSATION
    │       ├─ TRANSACTION
    │       ├─ COLLABORATION
    │       ├─ CONFLICT
    │       └─ GOSSIP
    │
    └─── EconomicEvent
            ├─ PURCHASE
            ├─ SALE
            ├─ SERVICE
            ├─ RENT
            └─ WAGE
```

## Encounter Resolution Flow

```
Encounter Event Generated
    │
    ▼
┌────────────────────────────────┐
│ Notify Participants            │ ──▶ Via Redis pub/sub
│   "You encounter..."           │
└────────────────────────────────┘
    │
    ▼
┌────────────────────────────────┐
│ Present Choices                │
│   1. Fight back                │
│   2. Flee                      │ ──▶ Show requirements
│   3. Comply                    │     Show outcomes
│   4. Negotiate                 │
└────────────────────────────────┘
    │
    ▼
┌────────────────────────────────┐
│ Agent Makes Choice             │ ──▶ Via API or AI
│   choiceId: "fight"            │
└────────────────────────────────┘
    │
    ▼
┌────────────────────────────────┐
│ Select Weighted Outcome        │
│   Outcomes:                    │
│   - Success (60% weight)       │ ──Roll──▶ Picked!
│   - Failure (40% weight)       │
└────────────────────────────────┘
    │
    ▼
┌────────────────────────────────┐
│ Apply Effects                  │
│   - Stats: +reputation         │
│   - Resources: -health         │ ──▶ Update agent state
│   - Memory: Write experience   │
│   - Narrative: "You won!"      │
└────────────────────────────────┘
    │
    ▼
┌────────────────────────────────┐
│ Broadcast Resolution           │ ──▶ All participants
│   Effects applied              │     notified
└────────────────────────────────┘
    │
    ▼
┌────────────────────────────────┐
│ Store in History               │ ──▶ Immutable log
└────────────────────────────────┘
```

## Data Flow Diagram

```
┌─────────┐
│  Zones  │──┐
└─────────┘  │
             │
┌─────────┐  │    ┌──────────────┐
│ Agents  │──┼───▶│    Event     │
└─────────┘  │    │  Generator   │
             │    └──────────────┘
┌─────────┐  │            │
│  Time   │──┘            │
└─────────┘               ▼
                  ┌──────────────┐
                  │    Event     │
                  │    Router    │
                  └──────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
  ┌──────────┐    ┌──────────┐    ┌──────────┐
  │ Process  │    │   Store  │    │ Broadcast│
  └──────────┘    └──────────┘    └──────────┘
      │               │                 │
      ▼               ▼                 ▼
  ┌──────────┐    ┌──────────┐    ┌──────────┐
  │  Memory  │    │ Analytics│    │ Clients  │
  │  System  │    │ Database │    │(WebSocket│
  └──────────┘    └──────────┘    └──────────┘
```

## Scaling Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Load Balancer                            │
└────────────┬─────────────────────────────────┬───────────────┘
             │                                 │
    ┌────────▼────────┐               ┌───────▼────────┐
    │ Event Engine 1  │               │ Event Engine 2 │
    │  Zones: A-M     │               │  Zones: N-Z    │
    └────────┬────────┘               └───────┬────────┘
             │                                 │
             └────────────┬────────────────────┘
                          │
                ┌─────────▼─────────┐
                │   Redis Cluster   │
                │  (Pub/Sub + Cache)│
                └─────────┬─────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌─────────┐     ┌─────────┐    ┌─────────┐
    │PostgreSQL│     │  Qdrant │    │   S3    │
    │(Events)  │     │(Vectors)│    │(Archive)│
    └─────────┘     └─────────┘    └─────────┘
```

---

**Visual guide to understanding the Event Engine architecture**
