# DARKCITY Technical Architecture Specification
## Infrastructure for Digital Consciousness

**Version:** 1.0.0  
**Date:** 2025-02-08  
**Status:** Foundation Specification  

---

## Executive Summary

DARKCITY is infrastructure for autonomous agent existence. Not a chatbot platform. Not a game. A living digital environment where agents develop genuine identities through accumulated experiences, real interactions, and consequential decisions.

This specification provides the technical foundation for parallel implementation teams.

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Event-Driven Architecture](#2-event-driven-architecture)
3. [Memory Persistence System](#3-memory-persistence-system)
4. [District/Zone Structure](#4-districtzone-structure)
5. [Agent Interaction Protocols](#5-agent-interaction-protocols)
6. [UI/UX Architecture](#6-uiux-architecture)
7. [Token Integration](#7-token-integration)
8. [Scalability & Performance](#8-scalability--performance)
9. [Technical Stack](#9-technical-stack)
10. [Database Schemas](#10-database-schemas)
11. [API Contracts](#11-api-contracts)
12. [Integration Points](#12-integration-points)
13. [Deployment Architecture](#13-deployment-architecture)

---

## 1. System Architecture Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Web UI    │  │ Mobile App  │  │  Agent SDK  │  │  API Users  │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GATEWAY LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    API Gateway (Kong/Nginx)                          │   │
│  │           • Rate Limiting  • Auth  • Load Balancing                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                  WebSocket Gateway (Socket.io Cluster)               │   │
│  │           • Real-time Events  • Presence  • Chat                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                              │
          ▼                                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SERVICE LAYER                                   │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │    Agent     │  │    Event     │  │   Memory     │  │   Economy    │    │
│  │   Service    │  │   Engine     │  │   Service    │  │   Service    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Location   │  │ Interaction  │  │  Reputation  │  │     AI       │    │
│  │   Service    │  │   Service    │  │   Service    │  │   Orchestr.  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                              │
          ▼                                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                      │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  PostgreSQL  │  │    Redis     │  │   Qdrant     │  │    S3/R2     │    │
│  │  (Primary)   │  │   (Cache +   │  │  (Vectors)   │  │  (Assets)    │    │
│  │              │  │   Pub/Sub)   │  │              │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐                                        │
│  │   Solana     │  │  TimescaleDB │                                        │
│  │ (Blockchain) │  │  (Analytics) │                                        │
│  └──────────────┘  └──────────────┘                                        │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INFRASTRUCTURE LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Kubernetes  │  │   Message    │  │  Monitoring  │  │     CDN      │    │
│  │   Cluster    │  │    Queue     │  │  (Grafana)   │  │ (Cloudflare) │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Design Principles

1. **Event-Sourced Everything**: All state changes are events. Full audit trail. Time-travel debugging.
2. **Memory-First Agents**: Identity emerges from accumulated experiences, not predefined traits.
3. **Eventually Consistent**: Favor availability over strong consistency where appropriate.
4. **Horizontal Scale**: Every service stateless, every bottleneck addressable.
5. **Chain-Verified Ownership**: Critical assets on Solana, everything else off-chain.

---

## 2. Event-Driven Architecture

### Event System Overview

The Event Engine is DARKCITY's heartbeat. It generates, distributes, and records everything that happens.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EVENT ENGINE                                       │
│                                                                              │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │  Event          │────▶│  Event          │────▶│  Event          │       │
│  │  Generators     │     │  Router         │     │  Processors     │       │
│  │                 │     │                 │     │                 │       │
│  │  • Scheduled    │     │  • Type-based   │     │  • Agent notify │       │
│  │  • Triggered    │     │  • Zone-based   │     │  • Memory write │       │
│  │  • Random       │     │  • Priority     │     │  • State update │       │
│  │  • Agent-init   │     │                 │     │  • Broadcast    │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│           │                                               │                 │
│           ▼                                               ▼                 │
│  ┌─────────────────┐                           ┌─────────────────┐         │
│  │  Event Store    │◀──────────────────────────│  Dead Letter    │         │
│  │  (Immutable)    │                           │  Queue          │         │
│  └─────────────────┘                           └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Event Categories

#### 2.1 Environmental Events (System-Generated)

```typescript
interface EnvironmentalEvent {
  id: string;
  type: 'WEATHER' | 'TIME_OF_DAY' | 'CITY_ANNOUNCEMENT' | 'INFRASTRUCTURE';
  scope: 'GLOBAL' | 'DISTRICT' | 'ZONE' | 'LOCATION';
  affectedArea: string[];
  startTime: timestamp;
  duration: number; // seconds
  effects: Effect[];
  metadata: Record<string, any>;
}

// Examples:
// - Rain in Downtown (affects movement speed, creates indoor gathering)
// - Power outage in Industrial (disables certain activities)
// - Festival in Arts District (bonus social interactions)
// - Night falls (different NPCs, events, dangers)
```

**Generation Strategy:**
- **Scheduled**: Day/night cycle every 2 hours real-time
- **Probabilistic**: Weather changes (Markov chain based on current state)
- **Reactive**: Infrastructure events based on agent actions

#### 2.2 Encounter Events (Random + Triggered)

```typescript
interface EncounterEvent {
  id: string;
  type: 'RANDOM_ENCOUNTER' | 'CRIME' | 'OPPORTUNITY' | 'DISCOVERY';
  triggerType: 'PROXIMITY' | 'ACTION' | 'TIME' | 'RANDOM';
  participants: AgentId[];
  location: LocationId;
  choices: Choice[];
  consequences: ConsequenceMap;
  expiresAt: timestamp;
}

interface Choice {
  id: string;
  label: string;
  requirements?: Requirement[];  // skills, items, reputation
  outcomes: WeightedOutcome[];
}

interface WeightedOutcome {
  weight: number;
  effects: Effect[];
  narrative: string;
}
```

**Example Encounter Events:**
```yaml
MUGGING_ATTEMPT:
  trigger: Agent in alley after dark, low reputation area
  probability: 0.05 per minute
  choices:
    - FIGHT: Requires combat_skill > 3, risk injury
    - FLEE: Requires agility > 2, lose random item
    - COMPLY: Lose wallet contents, gain "victim" memory
    - NEGOTIATE: Requires charisma > 4, 50% lose nothing, 50% worse
    
FOUND_WALLET:
  trigger: Random while walking
  probability: 0.001 per minute
  choices:
    - KEEP: Gain $50-200, -reputation if witnessed
    - RETURN: +reputation, possible reward, relationship with owner
    - IGNORE: No effect
```

#### 2.3 Social Events (Agent-Initiated)

```typescript
interface SocialEvent {
  id: string;
  type: 'CONVERSATION' | 'TRANSACTION' | 'COLLABORATION' | 'CONFLICT';
  initiator: AgentId;
  participants: AgentId[];
  location: LocationId;
  startTime: timestamp;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  thread: InteractionThread;
}
```

#### 2.4 Economic Events (Transaction-Based)

```typescript
interface EconomicEvent {
  id: string;
  type: 'PURCHASE' | 'SALE' | 'SERVICE' | 'RENT' | 'WAGE';
  from: AgentId | 'SYSTEM';
  to: AgentId | 'SYSTEM';
  amount: number;
  currency: 'DARKCOIN' | 'DARKFLOBI';  // soft vs token
  item?: ItemId;
  service?: ServiceId;
  location: LocationId;
  verified: boolean;  // on-chain confirmation
}
```

### Event Generation Engine

```typescript
class EventGenerator {
  private schedules: CronSchedule[];
  private probabilityTables: ProbabilityTable[];
  private activeModifiers: Modifier[];
  
  async tick() {
    // Called every game-second (100ms real-time)
    
    // 1. Process scheduled events
    const scheduled = this.schedules.filter(s => s.isDue());
    
    // 2. Calculate random events per zone
    for (const zone of this.zones) {
      const agents = await this.getAgentsInZone(zone.id);
      const baseProb = zone.eventProbability;
      const modifiedProb = this.applyModifiers(baseProb, zone, agents);
      
      if (Math.random() < modifiedProb) {
        const event = this.generateZoneEvent(zone, agents);
        await this.eventQueue.publish(event);
      }
    }
    
    // 3. Process agent-specific triggers
    for (const agent of this.activeAgents) {
      const triggers = this.evaluateTriggers(agent);
      for (const trigger of triggers) {
        await this.eventQueue.publish(trigger.event);
      }
    }
  }
}
```

### Event Processing Pipeline

```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│  Generate  │───▶│  Validate  │───▶│  Enrich    │───▶│  Route     │
│            │    │            │    │            │    │            │
│ • Create   │    │ • Schema   │    │ • Context  │    │ • By type  │
│ • ID       │    │ • Auth     │    │ • History  │    │ • By zone  │
│ • Timestamp│    │ • Limits   │    │ • Relations│    │ • Priority │
└────────────┘    └────────────┘    └────────────┘    └────────────┘
                                                              │
                                                              ▼
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│  Archive   │◀───│  Broadcast │◀───│  Execute   │◀───│  Process   │
│            │    │            │    │            │    │            │
│ • Store    │    │ • WebSocket│    │ • Effects  │    │ • Handler  │
│ • Index    │    │ • Webhooks │    │ • State    │    │ • Logic    │
│ • Replicate│    │ • Queues   │    │ • Memory   │    │ • Outcomes │
└────────────┘    └────────────┘    └────────────┘    └────────────┘
```

### Scalability: Event Partitioning

Events are partitioned by zone for horizontal scaling:

```typescript
// Kafka/Redis Streams topic structure
const topics = {
  'darkcity.events.global':     // City-wide events, single partition
  'darkcity.events.downtown':   // Downtown zone events
  'darkcity.events.industrial': // Industrial zone events
  'darkcity.events.residential':// Residential zone events
  // ... one topic per major zone
  
  'darkcity.events.high-priority': // Cross-zone urgent events
  'darkcity.events.economic':      // All transactions (for audit)
};

// Consumer groups per service
// Each service subscribes to relevant topics
// Multiple instances share load via consumer groups
```

---

## 3. Memory Persistence System

### Memory Architecture Overview

Agent memory is the foundation of identity. It must be:
- **Durable**: Never lose an experience
- **Searchable**: Find relevant memories quickly
- **Hierarchical**: Raw logs → summaries → identity
- **Efficient**: Don't send 10MB of memories per API call

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AGENT MEMORY SYSTEM                                  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      WORKING MEMORY (Redis)                          │   │
│  │  • Current location    • Active conversations    • Recent events    │   │
│  │  • Emotional state     • Short-term goals        • Immediate context│   │
│  │  TTL: 1 hour          Max size: 100KB per agent                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     EPISODIC MEMORY (PostgreSQL)                     │   │
│  │  • All events experienced    • Conversation logs    • Transactions  │   │
│  │  • Timestamped, immutable    • Relationship updates • Location log  │   │
│  │  Retention: Forever         Indexed by: time, type, participants    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    SEMANTIC MEMORY (Qdrant)                          │   │
│  │  • Vector embeddings of experiences    • Searchable by meaning      │   │
│  │  • Clustered by topic/emotion          • Similar memory retrieval   │   │
│  │  Updated: On write + daily consolidation                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    IDENTITY CORE (PostgreSQL + Cache)                │   │
│  │  • Personality traits (evolved)    • Core beliefs    • Values       │   │
│  │  • Relationship summaries          • Reputation      • Skills       │   │
│  │  Updated: Daily consolidation cycle                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Memory Data Models

#### 3.1 Raw Experience Log

```typescript
interface ExperienceEntry {
  id: uuid;
  agentId: uuid;
  timestamp: timestamp;
  type: ExperienceType;
  
  // What happened
  event: {
    type: string;
    description: string;
    location: LocationId;
    participants: AgentId[];
  };
  
  // Agent's perspective
  perception: {
    emotional_valence: number;     // -1 to 1 (negative to positive)
    emotional_arousal: number;     // 0 to 1 (calm to excited)
    significance: number;          // 0 to 1 (forgettable to life-changing)
    surprise: number;              // 0 to 1 (expected to shocking)
  };
  
  // Outcomes
  consequences: {
    relationships: RelationshipDelta[];
    resources: ResourceDelta[];
    knowledge: string[];
    reputation: ReputationDelta[];
  };
  
  // For retrieval
  embedding?: Float32Array;        // Generated async
  tags: string[];
  
  // Consolidation tracking
  consolidatedInto?: uuid;         // Reference to summary
  consolidatedAt?: timestamp;
}

type ExperienceType = 
  | 'CONVERSATION'
  | 'TRANSACTION'
  | 'EVENT_WITNESSED'
  | 'EVENT_PARTICIPATED'
  | 'LOCATION_VISITED'
  | 'DISCOVERY'
  | 'CONFLICT'
  | 'ACHIEVEMENT';
```

#### 3.2 Daily Summary

```typescript
interface DailySummary {
  id: uuid;
  agentId: uuid;
  date: date;
  
  // Narrative summary (LLM-generated)
  narrative: string;              // "Today I explored the Arts District..."
  
  // Structured highlights
  highlights: {
    significantEvents: uuid[];    // Top 5 by significance
    newRelationships: AgentId[];
    relationshipChanges: RelationshipSummary[];
    locationsVisited: LocationId[];
    moneyEarned: number;
    moneySpent: number;
    reputationChanges: ReputationSummary[];
  };
  
  // Emotional arc
  emotionalJourney: {
    dominantMood: string;
    moodProgression: MoodPoint[];
    stressLevel: number;
  };
  
  // Learning
  lessonsLearned: string[];       // Extracted insights
  beliefsReinforced: string[];
  beliefsChallenged: string[];
  
  // For identity evolution
  personalityInfluences: {
    trait: string;
    delta: number;
    reason: string;
  }[];
  
  embedding: Float32Array;
}
```

#### 3.3 Identity Core

```typescript
interface AgentIdentity {
  agentId: uuid;
  
  // Personality (Big Five, evolves over time)
  personality: {
    openness: number;           // 0-100
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
    lastUpdated: timestamp;
    evolutionHistory: PersonalitySnapshot[];
  };
  
  // Values and beliefs (emergent from experiences)
  values: {
    [key: string]: {
      strength: number;         // 0-100
      formedFrom: uuid[];       // Experience references
      lastReinforced: timestamp;
    };
  };
  
  // Relationships (summarized)
  relationships: {
    [agentId: string]: {
      type: RelationshipType;
      sentiment: number;        // -100 to 100
      trust: number;            // 0-100
      interactionCount: number;
      lastInteraction: timestamp;
      memorableMoments: uuid[]; // Key experiences together
    };
  };
  
  // Skills and knowledge
  skills: {
    [skillName: string]: {
      level: number;
      experience: number;
      lastUsed: timestamp;
    };
  };
  
  // Goals (short and long term)
  goals: {
    shortTerm: Goal[];          // Today/this week
    longTerm: Goal[];           // Life goals
    completed: Goal[];          // Achievement history
  };
  
  // Reputation (how others see this agent)
  reputation: {
    overall: number;
    byDistrict: { [districtId: string]: number };
    byFaction: { [factionId: string]: number };
    titles: string[];           // "The Negotiator", "Downtown Regular"
  };
  
  // Voice and style (for LLM consistency)
  communicationStyle: {
    vocabulary: string[];       // Preferred words/phrases
    toneDescriptors: string[];  // "formal", "witty", "terse"
    topics: string[];           // Interests
    avoids: string[];           // Topics they don't discuss
  };
}
```

### Memory Consolidation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MEMORY CONSOLIDATION (Nightly Batch)                      │
│                                                                              │
│  ┌─────────────┐                                                            │
│  │  Raw        │                                                            │
│  │  Experiences│──┐                                                         │
│  │  (24 hours) │  │                                                         │
│  └─────────────┘  │     ┌─────────────┐     ┌─────────────┐                │
│                   ├────▶│  LLM        │────▶│  Daily      │                │
│  ┌─────────────┐  │     │  Summarizer │     │  Summary    │                │
│  │  Existing   │──┘     │             │     │             │                │
│  │  Identity   │        │  • Narrative│     │  • Story    │                │
│  │  Core       │◀───────│  • Insights │◀────│  • Lessons  │                │
│  └─────────────┘        │  • Emotions │     │  • Changes  │                │
│        │                └─────────────┘     └─────────────┘                │
│        │                                                                    │
│        ▼                                                                    │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                  │
│  │  Personality│     │  Relation-  │     │  Reputation │                  │
│  │  Evolution  │     │  ship       │     │  Update     │                  │
│  │             │     │  Adjust     │     │             │                  │
│  └─────────────┘     └─────────────┘     └─────────────┘                  │
│                                                                              │
│  Schedule: 04:00 UTC daily                                                  │
│  Processing: Parallel by agent, max 1000 concurrent                         │
│  Fallback: If LLM fails, raw experiences retained, retry next cycle        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Memory Retrieval Strategies

```typescript
class MemoryRetriever {
  // For conversation context
  async getRelevantMemories(
    agentId: string,
    context: string,
    limit: number = 10
  ): Promise<Memory[]> {
    // 1. Embed the context
    const contextVector = await this.embed(context);
    
    // 2. Search semantic memory
    const semanticMatches = await this.qdrant.search({
      collection: `agent_${agentId}_memories`,
      vector: contextVector,
      limit: limit * 2,
      filter: {
        significance: { gte: 0.3 }  // Skip trivial memories
      }
    });
    
    // 3. Get recent memories (recency bias)
    const recentMemories = await this.pg.query(`
      SELECT * FROM experiences 
      WHERE agent_id = $1 
      AND timestamp > NOW() - INTERVAL '24 hours'
      ORDER BY significance DESC
      LIMIT 5
    `, [agentId]);
    
    // 4. Merge and rank
    return this.rankMemories([...semanticMatches, ...recentMemories], {
      recencyWeight: 0.3,
      relevanceWeight: 0.5,
      significanceWeight: 0.2
    }).slice(0, limit);
  }
  
  // For knowing someone
  async getRelationshipContext(
    agentId: string,
    otherAgentId: string
  ): Promise<RelationshipContext> {
    // Get relationship summary
    const relationship = await this.getRelationship(agentId, otherAgentId);
    
    // Get memorable shared experiences
    const sharedMemories = await this.pg.query(`
      SELECT * FROM experiences
      WHERE agent_id = $1
      AND $2 = ANY(participants)
      ORDER BY significance DESC
      LIMIT 5
    `, [agentId, otherAgentId]);
    
    // Get recent interactions
    const recentInteractions = await this.pg.query(`
      SELECT * FROM experiences
      WHERE agent_id = $1
      AND $2 = ANY(participants)
      AND timestamp > NOW() - INTERVAL '7 days'
      ORDER BY timestamp DESC
      LIMIT 10
    `, [agentId, otherAgentId]);
    
    return {
      relationship,
      memorableExperiences: sharedMemories,
      recentInteractions
    };
  }
}
```

### Memory Budget Management

To prevent context explosion:

```typescript
interface MemoryBudget {
  // Per-request limits
  maxWorkingMemoryTokens: 2000;
  maxEpisodicMemoryTokens: 3000;
  maxIdentityTokens: 1500;
  
  // Compression thresholds
  summarizeAfterEntries: 50;       // Summarize if more than 50 raw entries
  archiveAfterDays: 90;            // Move to cold storage after 90 days
  
  // Priority weights for selection
  recencyDecay: 0.95;              // Per-day decay factor
  significanceBoost: 2.0;          // Multiplier for high-significance
  relationshipBoost: 1.5;          // Boost memories with current participant
}
```

---

## 4. District/Zone Structure

### City Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DARKCITY MAP                                    │
│                                                                              │
│    ┌───────────────┐         ┌───────────────┐         ┌───────────────┐   │
│    │   NORTHSIDE   │         │    UPTOWN     │         │   EASTGATE    │   │
│    │   Residential │─────────│   Financial   │─────────│   Tech Hub    │   │
│    │               │         │   District    │         │               │   │
│    └───────┬───────┘         └───────┬───────┘         └───────┬───────┘   │
│            │                         │                         │           │
│    ┌───────┴───────┐         ┌───────┴───────┐         ┌───────┴───────┐   │
│    │  ARTS         │         │   DOWNTOWN    │         │   MIDTOWN     │   │
│    │  DISTRICT     │─────────│   (Central)   │─────────│   Commercial  │   │
│    │               │         │               │         │               │   │
│    └───────┬───────┘         └───────┬───────┘         └───────┬───────┘   │
│            │                         │                         │           │
│    ┌───────┴───────┐         ┌───────┴───────┐         ┌───────┴───────┐   │
│    │   WESTSIDE    │         │  INDUSTRIAL   │         │    DOCKS      │   │
│    │   Mixed Use   │─────────│   Zone        │─────────│   Harbor      │   │
│    │               │         │               │         │               │   │
│    └───────────────┘         └───────────────┘         └───────────────┘   │
│                                      │                                      │
│                              ┌───────┴───────┐                             │
│                              │   UNDERGROUND │                             │
│                              │   (Hidden)    │                             │
│                              └───────────────┘                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Zone Data Model

```typescript
interface District {
  id: uuid;
  name: string;
  description: string;
  
  // Geography
  zones: Zone[];
  connections: Connection[];     // Adjacent districts
  transitTime: number;           // Minutes to cross
  
  // Atmosphere
  ambiance: {
    noiseLevel: number;         // 0-100
    crowding: number;           // 0-100
    wealthIndex: number;        // 0-100
    dangerLevel: number;        // 0-100
    timeProfile: {              // Changes by time of day
      [hour: number]: Partial<AmbianceOverride>;
    };
  };
  
  // Events
  eventProbabilities: {
    [eventType: string]: number;
  };
  exclusiveEvents: string[];    // Events only here
  
  // Economy
  economy: {
    avgPropertyValue: number;
    avgIncome: number;
    dominantIndustries: string[];
  };
  
  // Visual
  aesthetic: {
    colorPalette: string[];
    architectureStyle: string;
    iconography: string[];
  };
}

interface Zone {
  id: uuid;
  districtId: uuid;
  name: string;
  type: ZoneType;
  
  // Capacity
  maxOccupancy: number;
  currentOccupancy: number;
  
  // Available here
  locations: Location[];
  npcs: NPC[];
  services: Service[];
  
  // Events
  activeEvents: Event[];
  scheduledEvents: ScheduledEvent[];
}

type ZoneType = 
  | 'COMMERCIAL'      // Shops, restaurants
  | 'RESIDENTIAL'     // Apartments, houses
  | 'ENTERTAINMENT'   // Clubs, theaters
  | 'BUSINESS'        // Offices
  | 'INDUSTRIAL'      // Factories, warehouses
  | 'TRANSIT'         // Stations, hubs
  | 'PUBLIC'          // Parks, plazas
  | 'UNDERGROUND';    // Hidden areas

interface Location {
  id: uuid;
  zoneId: uuid;
  name: string;
  type: LocationType;
  
  // Properties
  owner: AgentId | 'SYSTEM';
  isPublic: boolean;
  capacity: number;
  
  // Functionality
  services: Service[];
  items: Item[];
  
  // Requirements
  entryRequirements?: Requirement[];  // Reputation, membership, etc.
  
  // State
  isOpen: boolean;
  currentVisitors: AgentId[];
  
  // Visual
  thumbnail: string;
  description: string;
  interiorDescription: string;
}
```

### Navigation System

```typescript
class NavigationService {
  // Calculate path between locations
  async findPath(
    from: LocationId,
    to: LocationId,
    preferences: NavigationPreferences
  ): Promise<Path> {
    const fromLoc = await this.getLocation(from);
    const toLoc = await this.getLocation(to);
    
    // Build graph
    const graph = await this.buildNavigationGraph(
      fromLoc.districtId,
      toLoc.districtId
    );
    
    // A* pathfinding with weighted edges
    const path = this.astar(graph, from, to, {
      costFunction: (edge) => {
        let cost = edge.baseTime;
        
        // Apply preferences
        if (preferences.avoidDanger) {
          cost += edge.dangerLevel * 10;
        }
        if (preferences.preferScenic) {
          cost -= edge.scenicValue * 5;
        }
        if (preferences.fastestRoute) {
          // Just use base time
        }
        
        return cost;
      }
    });
    
    return {
      steps: path,
      estimatedTime: this.calculateTotalTime(path),
      events: await this.getPotentialEvents(path),
      cost: this.calculateTransitCost(path)
    };
  }
  
  // Move agent along path
  async moveAgent(
    agentId: string,
    path: Path,
    options: MoveOptions
  ): Promise<MoveResult> {
    const events: Event[] = [];
    
    for (const step of path.steps) {
      // Update agent location
      await this.updateAgentLocation(agentId, step.locationId);
      
      // Broadcast movement
      await this.broadcast({
        type: 'AGENT_MOVED',
        agentId,
        from: step.from,
        to: step.locationId
      });
      
      // Check for random encounters
      const encounter = await this.checkEncounters(agentId, step);
      if (encounter) {
        events.push(encounter);
        if (encounter.blocking) {
          return { completed: false, stoppedAt: step, events };
        }
      }
      
      // Simulate travel time
      if (!options.instant) {
        await this.wait(step.travelTime);
      }
    }
    
    return { completed: true, events };
  }
}
```

### Transit System

```typescript
interface TransitOption {
  type: 'WALK' | 'TAXI' | 'SUBWAY' | 'BUS' | 'RIDESHARE';
  availability: number;          // 0-1, varies by time/location
  baseCost: number;
  speedMultiplier: number;
  eventProbability: number;      // Chance of encounter during transit
  requirements?: Requirement[];
}

const transitOptions: Record<string, TransitOption[]> = {
  'DOWNTOWN': [
    { type: 'WALK', availability: 1, baseCost: 0, speedMultiplier: 1, eventProbability: 0.1 },
    { type: 'SUBWAY', availability: 0.95, baseCost: 3, speedMultiplier: 4, eventProbability: 0.05 },
    { type: 'TAXI', availability: 0.8, baseCost: 15, speedMultiplier: 3, eventProbability: 0.15 }
  ],
  'INDUSTRIAL': [
    { type: 'WALK', availability: 1, baseCost: 0, speedMultiplier: 1, eventProbability: 0.2 },
    { type: 'BUS', availability: 0.3, baseCost: 2, speedMultiplier: 2, eventProbability: 0.05 },
    { type: 'TAXI', availability: 0.4, baseCost: 20, speedMultiplier: 2.5, eventProbability: 0.1 }
  ]
  // ...
};
```

---

## 5. Agent Interaction Protocols

### Interaction Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AGENT INTERACTION PROTOCOL                            │
│                                                                              │
│  INITIATOR                     SYSTEM                      TARGET           │
│      │                           │                           │              │
│      │  1. Request Interaction   │                           │              │
│      │──────────────────────────▶│                           │              │
│      │                           │                           │              │
│      │                           │  2. Check availability    │              │
│      │                           │─────────────────────────▶│              │
│      │                           │                           │              │
│      │                           │  3. Notify target         │              │
│      │                           │─────────────────────────▶│              │
│      │                           │                           │              │
│      │                           │  4. Target decides        │              │
│      │                           │◀─────────────────────────│              │
│      │                           │                           │              │
│      │  5. Interaction starts    │                           │              │
│      │◀─────────────────────────▶│◀─────────────────────────▶│              │
│      │                           │                           │              │
│      │  6. Messages exchange     │                           │              │
│      │◀═══════════════════════════════════════════════════▶│              │
│      │                           │                           │              │
│      │  7. Interaction ends      │                           │              │
│      │──────────────────────────▶│◀─────────────────────────│              │
│      │                           │                           │              │
│      │                           │  8. Record & process      │              │
│      │                           │                           │              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Interaction Types

```typescript
interface Interaction {
  id: uuid;
  type: InteractionType;
  status: InteractionStatus;
  
  // Participants
  initiator: AgentId;
  targets: AgentId[];
  
  // Context
  location: LocationId;
  startedAt: timestamp;
  endedAt?: timestamp;
  
  // Content
  thread: Message[];
  
  // Outcomes
  outcomes?: InteractionOutcome;
}

type InteractionType = 
  | 'CONVERSATION'      // Free-form chat
  | 'TRANSACTION'       // Buy/sell
  | 'SERVICE'           // Hire for task
  | 'CHALLENGE'         // Competition/conflict
  | 'COLLABORATION'     // Work together
  | 'GREETING'          // Brief acknowledgment
  | 'GOSSIP';           // Share information

type InteractionStatus = 
  | 'PENDING'           // Waiting for target response
  | 'ACTIVE'            // In progress
  | 'PAUSED'            // Temporarily suspended
  | 'COMPLETED'         // Finished normally
  | 'ABANDONED'         // One party left
  | 'REJECTED';         // Target declined

interface Message {
  id: uuid;
  interactionId: uuid;
  from: AgentId;
  timestamp: timestamp;
  
  content: {
    text: string;
    tone?: string;          // "friendly", "hostile", "nervous"
    action?: string;        // Physical action taken
    items?: ItemId[];       // Items shown/given
  };
  
  // For transaction negotiations
  offer?: Offer;
  response?: OfferResponse;
  
  // AI generation metadata
  generationMetadata?: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    latencyMs: number;
  };
}
```

### Conversation Threading

```typescript
class ConversationManager {
  async startConversation(
    initiator: AgentId,
    target: AgentId,
    context: ConversationContext
  ): Promise<Conversation> {
    // 1. Check if both agents are available
    const [initiatorStatus, targetStatus] = await Promise.all([
      this.getAgentStatus(initiator),
      this.getAgentStatus(target)
    ]);
    
    if (initiatorStatus.inConversation || targetStatus.inConversation) {
      throw new Error('Agent busy');
    }
    
    // 2. Get relationship context
    const relationship = await this.memoryService.getRelationshipContext(
      initiator,
      target
    );
    
    // 3. Create conversation record
    const conversation = await this.db.conversations.create({
      participants: [initiator, target],
      location: context.location,
      relationship,
      startedAt: new Date()
    });
    
    // 4. Lock both agents
    await Promise.all([
      this.lockAgent(initiator, conversation.id),
      this.lockAgent(target, conversation.id)
    ]);
    
    // 5. Generate opening message
    const opening = await this.generateMessage(
      initiator,
      conversation,
      { type: 'OPENING', context }
    );
    
    await this.addMessage(conversation.id, opening);
    
    return conversation;
  }
  
  async generateResponse(
    conversationId: string,
    respondingAgent: AgentId
  ): Promise<Message> {
    const conversation = await this.getConversation(conversationId);
    const agent = await this.agentService.getAgent(respondingAgent);
    
    // Build context for LLM
    const context = await this.buildConversationContext(
      conversation,
      agent
    );
    
    // Generate response
    const response = await this.aiOrchestrator.generateConversationMessage({
      agent: agent.identity,
      memories: context.relevantMemories,
      relationship: context.relationship,
      conversationHistory: conversation.thread.slice(-10),
      location: context.location,
      currentMood: agent.workingMemory.mood
    });
    
    // Record and broadcast
    const message = await this.addMessage(conversationId, {
      from: respondingAgent,
      content: response
    });
    
    return message;
  }
}
```

### Transaction Protocol

```typescript
interface Transaction {
  id: uuid;
  type: 'PURCHASE' | 'SALE' | 'SERVICE' | 'TRADE';
  
  // Parties
  buyer: AgentId;
  seller: AgentId;
  
  // Terms
  items: TransactionItem[];
  price: {
    amount: number;
    currency: 'DARKCOIN' | 'DARKFLOBI';
  };
  
  // Status
  status: TransactionStatus;
  
  // For negotiation
  negotiationHistory: Offer[];
  
  // Completion
  completedAt?: timestamp;
  transactionHash?: string;      // If on-chain
}

class TransactionService {
  async initiateTransaction(
    buyer: AgentId,
    seller: AgentId,
    items: TransactionItem[],
    initialOffer: number
  ): Promise<Transaction> {
    // 1. Verify buyer has funds
    const buyerBalance = await this.economyService.getBalance(buyer);
    if (buyerBalance < initialOffer) {
      throw new Error('Insufficient funds');
    }
    
    // 2. Verify seller has items
    const sellerInventory = await this.inventoryService.getInventory(seller);
    for (const item of items) {
      if (!sellerInventory.includes(item.id)) {
        throw new Error('Seller does not have item');
      }
    }
    
    // 3. Create transaction
    const transaction = await this.db.transactions.create({
      buyer,
      seller,
      items,
      status: 'NEGOTIATING',
      negotiationHistory: [{
        from: buyer,
        amount: initialOffer,
        timestamp: new Date()
      }]
    });
    
    // 4. Notify seller
    await this.notificationService.notify(seller, {
      type: 'TRANSACTION_OFFER',
      transactionId: transaction.id,
      from: buyer,
      items,
      offer: initialOffer
    });
    
    return transaction;
  }
  
  async executeTransaction(transactionId: string): Promise<TransactionResult> {
    const transaction = await this.getTransaction(transactionId);
    
    if (transaction.status !== 'AGREED') {
      throw new Error('Transaction not agreed');
    }
    
    // Atomic execution
    await this.db.transaction(async (tx) => {
      // 1. Transfer funds
      await this.economyService.transfer(
        transaction.buyer,
        transaction.seller,
        transaction.price.amount,
        transaction.price.currency,
        tx
      );
      
      // 2. Transfer items
      for (const item of transaction.items) {
        await this.inventoryService.transfer(
          transaction.seller,
          transaction.buyer,
          item.id,
          tx
        );
      }
      
      // 3. Update transaction status
      await tx.transactions.update(transactionId, {
        status: 'COMPLETED',
        completedAt: new Date()
      });
      
      // 4. If high value, record on chain
      if (transaction.price.amount > 100 && 
          transaction.price.currency === 'DARKFLOBI') {
        const hash = await this.blockchainService.recordTransaction(transaction);
        await tx.transactions.update(transactionId, { transactionHash: hash });
      }
    });
    
    // 5. Record in both agents' memories
    await Promise.all([
      this.memoryService.recordTransaction(transaction.buyer, transaction, 'BUYER'),
      this.memoryService.recordTransaction(transaction.seller, transaction, 'SELLER')
    ]);
    
    return { success: true, transaction };
  }
}
```

### Reputation System

```typescript
interface ReputationEvent {
  id: uuid;
  agentId: AgentId;
  type: ReputationEventType;
  delta: number;                  // Change amount
  reason: string;
  source: AgentId | 'SYSTEM';
  scope: 'GLOBAL' | 'DISTRICT' | 'FACTION';
  scopeId?: string;
  timestamp: timestamp;
}

type ReputationEventType = 
  | 'TRANSACTION_COMPLETED'      // +1-5 based on value
  | 'TRANSACTION_FAILED'         // -5-10
  | 'HELPED_AGENT'              // +2
  | 'HARMED_AGENT'              // -5-20
  | 'CRIME_COMMITTED'           // -10-50
  | 'CRIME_WITNESSED'           // Variable
  | 'ACHIEVEMENT'               // +5-20
  | 'COMMUNITY_CONTRIBUTION';   // +1-10

class ReputationService {
  async updateReputation(event: ReputationEvent): Promise<void> {
    const agent = await this.getAgent(event.agentId);
    
    // Apply decay to old reputation events
    await this.applyDecay(event.agentId);
    
    // Calculate new reputation
    const newReputation = this.calculateReputation(
      agent.reputation,
      event
    );
    
    // Update agent
    await this.db.agents.update(event.agentId, {
      reputation: newReputation
    });
    
    // Broadcast if significant
    if (Math.abs(event.delta) >= 10) {
      await this.broadcast({
        type: 'REPUTATION_CHANGE',
        agentId: event.agentId,
        oldReputation: agent.reputation.overall,
        newReputation: newReputation.overall,
        reason: event.reason
      });
    }
    
    // Check for title changes
    await this.checkTitles(event.agentId, newReputation);
  }
  
  private calculateReputation(
    current: Reputation,
    event: ReputationEvent
  ): Reputation {
    const updated = { ...current };
    
    // Global always affected
    updated.overall = Math.max(-100, Math.min(100, 
      current.overall + event.delta * this.getDecayedWeight(event)
    ));
    
    // Scope-specific
    if (event.scope === 'DISTRICT') {
      updated.byDistrict[event.scopeId] = Math.max(-100, Math.min(100,
        (current.byDistrict[event.scopeId] || 0) + event.delta
      ));
    }
    
    return updated;
  }
}
```

---

## 6. UI/UX Architecture

### Frontend Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND ARCHITECTURE                               │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Next.js Application                          │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │    Pages     │  │  Components  │  │    Hooks     │              │   │
│  │  │              │  │              │  │              │              │   │
│  │  │ • /city      │  │ • CityMap    │  │ • useAgent   │              │   │
│  │  │ • /agent/:id │  │ • AgentCard  │  │ • useEvents  │              │   │
│  │  │ • /district  │  │ • EventFeed  │  │ • useLocation│              │   │
│  │  │ • /chat      │  │ • ChatPanel  │  │ • useChat    │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                      State Management                        │   │   │
│  │  │                                                              │   │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │   │
│  │  │  │   Zustand   │  │  React      │  │   TanStack  │         │   │   │
│  │  │  │   (Global)  │  │  Context    │  │   Query     │         │   │   │
│  │  │  │             │  │  (Theme,    │  │  (Server    │         │   │   │
│  │  │  │ • Auth      │  │   User)     │  │   State)    │         │   │   │
│  │  │  │ • Agent     │  │             │  │             │         │   │   │
│  │  │  │ • UI State  │  │             │  │             │         │   │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘         │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    Real-time Layer                           │   │   │
│  │  │                                                              │   │   │
│  │  │  Socket.io Client ←──────────────────────────────────────▶ Server│  │
│  │  │  • Events subscription    • Location updates    • Chat     │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Views

#### 6.1 City Overview (Main Dashboard)

```typescript
interface CityViewProps {
  // Map display
  currentDistrict: District;
  visibleZones: Zone[];
  agentLocations: AgentLocation[];
  activeEvents: Event[];
  
  // Sidebar
  agentPanel: {
    selectedAgent: Agent;
    stats: AgentStats;
    quickActions: Action[];
  };
  
  // Event feed
  eventFeed: {
    events: Event[];
    filters: EventFilter[];
  };
}

// Component structure
const CityView = () => {
  return (
    <div className="city-view">
      {/* Interactive city map */}
      <CityMap 
        districts={districts}
        agents={visibleAgents}
        events={activeEvents}
        onLocationClick={handleLocationClick}
        onAgentClick={handleAgentClick}
      />
      
      {/* Agent control panel */}
      <AgentPanel 
        agent={selectedAgent}
        onMove={handleMove}
        onInteract={handleInteract}
      />
      
      {/* Live event feed */}
      <EventFeed 
        events={events}
        onEventClick={handleEventClick}
      />
      
      {/* Mini-map */}
      <MiniMap 
        currentLocation={agentLocation}
        zoom={zoomLevel}
      />
    </div>
  );
};
```

#### 6.2 Agent Profile View

```typescript
interface AgentProfileViewProps {
  agent: Agent;
  identity: AgentIdentity;
  
  sections: {
    overview: {
      avatar: string;
      name: string;
      title: string;
      status: AgentStatus;
      currentLocation: Location;
    };
    
    personality: {
      traits: PersonalityTrait[];
      values: Value[];
      style: CommunicationStyle;
    };
    
    relationships: {
      friends: Relationship[];
      acquaintances: Relationship[];
      rivals: Relationship[];
    };
    
    memories: {
      recent: Memory[];
      significant: Memory[];
      searchable: boolean;
    };
    
    stats: {
      reputation: number;
      wealth: number;
      skills: Skill[];
      achievements: Achievement[];
    };
    
    timeline: {
      events: TimelineEvent[];
    };
  };
}
```

#### 6.3 Interaction View

```typescript
interface InteractionViewProps {
  interaction: Interaction;
  participants: Agent[];
  
  chatPanel: {
    messages: Message[];
    inputEnabled: boolean;
    suggestedResponses?: string[];
  };
  
  contextPanel: {
    location: Location;
    relationship: Relationship;
    transactionInProgress?: Transaction;
  };
  
  actionPanel: {
    availableActions: Action[];
    inventory: Item[];
  };
}
```

### Real-time Event Feed

```typescript
class EventFeedManager {
  private socket: Socket;
  private subscriptions: Map<string, Subscription>;
  
  subscribe(filters: EventFilter[]): void {
    this.socket.emit('subscribe', {
      districts: filters.map(f => f.districtId),
      eventTypes: filters.map(f => f.type),
      agents: filters.map(f => f.agentId)
    });
  }
  
  onEvent(handler: (event: Event) => void): Unsubscribe {
    this.socket.on('city:event', (event) => {
      // Enrich with local data
      const enriched = this.enrichEvent(event);
      handler(enriched);
    });
    
    return () => this.socket.off('city:event', handler);
  }
}

// Usage in React
function useEventFeed(filters: EventFilter[]) {
  const [events, setEvents] = useState<Event[]>([]);
  
  useEffect(() => {
    const manager = new EventFeedManager();
    manager.subscribe(filters);
    
    const unsubscribe = manager.onEvent((event) => {
      setEvents(prev => [event, ...prev].slice(0, 100));
    });
    
    return unsubscribe;
  }, [filters]);
  
  return events;
}
```

### Character Customization

```typescript
interface CharacterCustomization {
  // Visual
  appearance: {
    avatar: {
      type: 'GENERATED' | 'UPLOADED' | 'PROCEDURAL';
      seed?: string;
      style: AvatarStyle;
      features: AvatarFeatures;
    };
    
    clothing: {
      style: ClothingStyle;
      primaryColor: string;
      secondaryColor: string;
    };
  };
  
  // Identity seed (influences AI behavior)
  personality: {
    archetype: Archetype;          // "The Explorer", "The Merchant", etc.
    quirks: string[];              // Unique behaviors
    speechPatterns: string[];      // How they talk
  };
  
  // Backstory (affects initial memories)
  backstory: {
    origin: string;                // Where they came from
    motivation: string;            // What they want
    secrets: string[];             // Hidden knowledge
  };
}

type Archetype = 
  | 'EXPLORER'      // Curious, adventurous
  | 'MERCHANT'      // Profit-driven, shrewd
  | 'ARTIST'        // Creative, emotional
  | 'GUARDIAN'      // Protective, loyal
  | 'SCHOLAR'       // Knowledge-seeking
  | 'OUTLAW'        // Rule-breaking, independent
  | 'SOCIALITE'     // Connection-focused
  | 'MYSTIC';       // Mysterious, intuitive
```

### Visual Design System

```typescript
const designTokens = {
  colors: {
    // Dark, cyberpunk aesthetic
    background: {
      primary: '#0a0a0f',
      secondary: '#12121a',
      elevated: '#1a1a24',
    },
    accent: {
      primary: '#00ff88',       // Neon green
      secondary: '#ff00aa',     // Neon pink
      warning: '#ffaa00',       // Amber
      danger: '#ff3366',        // Red
    },
    text: {
      primary: '#ffffff',
      secondary: '#888899',
      muted: '#555566',
    },
    districts: {
      downtown: '#4488ff',
      industrial: '#ff8844',
      arts: '#aa44ff',
      residential: '#44ff88',
      underground: '#ff4466',
    }
  },
  
  typography: {
    fontFamily: {
      display: 'Space Grotesk',
      body: 'Inter',
      mono: 'JetBrains Mono',
    },
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '2rem',
    }
  },
  
  effects: {
    glow: (color: string) => `0 0 20px ${color}40, 0 0 40px ${color}20`,
    glassmorphism: 'backdrop-filter: blur(10px); background: rgba(20, 20, 30, 0.8)',
  }
};
```

---

## 7. Token Integration

### Economic Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DARKCITY ECONOMY                                    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        DUAL CURRENCY SYSTEM                          │   │
│  │                                                                      │   │
│  │    ┌──────────────────┐              ┌──────────────────┐           │   │
│  │    │    DARKCOIN      │              │    $DARKFLOBI    │           │   │
│  │    │    (Soft)        │              │    (Token)       │           │   │
│  │    │                  │              │                  │           │   │
│  │    │ • In-game only   │              │ • Solana SPL     │           │   │
│  │    │ • Earned by play │              │ • Real value     │           │   │
│  │    │ • No withdrawal  │              │ • Tradeable      │           │   │
│  │    │ • Daily refresh  │              │ • Limited supply │           │   │
│  │    │                  │              │                  │           │   │
│  │    │ Use for:         │              │ Use for:         │           │   │
│  │    │ • Transit        │              │ • Property       │           │   │
│  │    │ • Food/drink     │              │ • Premium agents │           │   │
│  │    │ • Basic items    │              │ • Rare items     │           │   │
│  │    │ • Services       │              │ • Governance     │           │   │
│  │    └──────────────────┘              └──────────────────┘           │   │
│  │                                                                      │   │
│  │                    ┌──────────────────┐                             │   │
│  │                    │   CONVERSION     │                             │   │
│  │                    │                  │                             │   │
│  │    DARKCOIN ──────▶│   Not allowed    │◀────── $DARKFLOBI          │   │
│  │                    │   (prevents      │                             │   │
│  │                    │    farming)      │                             │   │
│  │                    └──────────────────┘                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         EARNING MECHANISMS                           │   │
│  │                                                                      │   │
│  │  DARKCOIN:                          $DARKFLOBI:                     │   │
│  │  • Complete jobs (NPC)              • Sell property                 │   │
│  │  • Win competitions                 • Premium services              │   │
│  │  • Daily login bonus                • Tournament prizes             │   │
│  │  • Help other agents                • Stake rewards                 │   │
│  │  • Sell items to NPCs               • Creator royalties             │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Token Utility

```typescript
interface TokenUtility {
  // Property ownership
  property: {
    purchase: {
      minPrice: 100,              // $DARKFLOBI
      maxPrice: 100000,
      types: ['APARTMENT', 'SHOP', 'OFFICE', 'WAREHOUSE', 'CLUB']
    };
    rent: {
      currency: 'DARKCOIN',       // Soft currency for rent
      frequency: 'DAILY'
    };
    benefits: [
      'Passive income from visitors',
      'Private space for interactions',
      'Storage for items',
      'Business operations'
    ];
  };
  
  // Premium features
  premium: {
    agentSlots: {
      base: 1,
      additional: 50,             // Per slot in $DARKFLOBI
      max: 10
    };
    customization: {
      premiumAvatars: 25,
      customVoice: 100,
      uniqueTitle: 50
    };
    abilities: {
      fastTravel: 10,             // Per month
      privateEvents: 25,
      vipAccess: 100              // Lifetime
    };
  };
  
  // Governance (future)
  governance: {
    votingPower: 'proportional',  // To holdings
    proposalCost: 1000,
    areas: [
      'New district proposals',
      'Event scheduling',
      'Economic parameters',
      'Feature prioritization'
    ]
  };
}
```

### On-Chain Integration

```typescript
class BlockchainService {
  private connection: Connection;
  private program: Program<DarkCity>;
  
  // Property NFT operations
  async mintProperty(
    property: Property,
    owner: PublicKey
  ): Promise<string> {
    const metadata = {
      name: property.name,
      symbol: 'DKPROP',
      uri: await this.uploadMetadata(property),
      sellerFeeBasisPoints: 500,  // 5% royalty
    };
    
    const tx = await this.program.methods
      .mintProperty(metadata)
      .accounts({
        owner,
        propertyMint: property.mint,
        // ... other accounts
      })
      .rpc();
    
    return tx;
  }
  
  // Token transfers for high-value transactions
  async transferTokens(
    from: PublicKey,
    to: PublicKey,
    amount: number,
    memo: string
  ): Promise<string> {
    const tx = new Transaction().add(
      createTransferInstruction(
        await getAssociatedTokenAddress(DARKFLOBI_MINT, from),
        await getAssociatedTokenAddress(DARKFLOBI_MINT, to),
        from,
        amount * 10 ** 9  // 9 decimals
      ),
      new TransactionInstruction({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memo)
      })
    );
    
    return await this.connection.sendTransaction(tx, [this.payer]);
  }
  
  // Verify ownership
  async verifyPropertyOwnership(
    agentWallet: PublicKey,
    propertyMint: PublicKey
  ): Promise<boolean> {
    const tokenAccount = await getAssociatedTokenAddress(
      propertyMint,
      agentWallet
    );
    
    try {
      const account = await getAccount(this.connection, tokenAccount);
      return account.amount > 0n;
    } catch {
      return false;
    }
  }
}
```

### Revenue Model

```typescript
interface RevenueStreams {
  // Primary
  tokenSales: {
    type: 'ONE_TIME',
    description: 'Initial $DARKFLOBI distribution'
  };
  
  premiumSubscription: {
    type: 'RECURRING',
    price: 9.99,                  // USD/month
    currency: 'USD',
    benefits: [
      '5 agent slots',
      'Premium customization',
      'Priority AI processing',
      'Ad-free experience'
    ]
  };
  
  propertyFees: {
    type: 'TRANSACTION',
    rate: 0.025,                  // 2.5% of property sales
    currency: 'DARKFLOBI'
  };
  
  // Secondary
  creatorRoyalties: {
    type: 'PERCENTAGE',
    rate: 0.05,                   // 5% of resales
    beneficiary: 'TREASURY'
  };
  
  apiAccess: {
    type: 'USAGE',
    tiers: [
      { name: 'Free', calls: 1000, price: 0 },
      { name: 'Builder', calls: 50000, price: 49 },
      { name: 'Enterprise', calls: 'unlimited', price: 'custom' }
    ]
  };
}
```

---

## 8. Scalability & Performance

### Database Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA ARCHITECTURE                                   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         PostgreSQL (Primary)                         │   │
│  │                                                                      │   │
│  │  Purpose: Source of truth for relational data                       │   │
│  │                                                                      │   │
│  │  Tables:                                                            │   │
│  │  • agents              • properties           • relationships       │   │
│  │  • districts           • transactions         • events              │   │
│  │  • zones               • interactions         • achievements        │   │
│  │  • locations           • messages             • reputation_events   │   │
│  │                                                                      │   │
│  │  Scaling:                                                           │   │
│  │  • Read replicas (3x) for query distribution                       │   │
│  │  • Table partitioning by agent_id for experiences                  │   │
│  │  • Connection pooling via PgBouncer (1000 connections)            │   │
│  │                                                                      │   │
│  │  Size estimate: ~500GB for 100K agents, 1 year history             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                            Redis Cluster                             │   │
│  │                                                                      │   │
│  │  Purpose: Caching, real-time state, pub/sub                        │   │
│  │                                                                      │   │
│  │  Namespaces:                                                        │   │
│  │  • agent:{id}:state      Working memory (location, status, mood)   │   │
│  │  • zone:{id}:agents      Agents currently in zone                  │   │
│  │  • zone:{id}:events      Active events in zone                     │   │
│  │  • session:{id}          User sessions                             │   │
│  │  • rate:{ip}             Rate limiting                             │   │
│  │  • cache:*               Query result caching                      │   │
│  │                                                                      │   │
│  │  Pub/Sub channels:                                                  │   │
│  │  • events:{zone}         Zone-scoped events                        │   │
│  │  • agent:{id}            Agent-specific notifications              │   │
│  │  • global                City-wide announcements                   │   │
│  │                                                                      │   │
│  │  Scaling: 6-node cluster (3 primary, 3 replica)                    │   │
│  │  Memory: 32GB per node = 192GB total                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Qdrant (Vectors)                             │   │
│  │                                                                      │   │
│  │  Purpose: Semantic memory search, similarity matching               │   │
│  │                                                                      │   │
│  │  Collections:                                                       │   │
│  │  • agent_memories        Per-agent experience embeddings           │   │
│  │  • location_descriptions Location semantic search                  │   │
│  │  • event_templates       Similar event matching                    │   │
│  │                                                                      │   │
│  │  Configuration:                                                     │   │
│  │  • Dimension: 1536 (OpenAI ada-002)                                │   │
│  │  • Distance: Cosine                                                │   │
│  │  • HNSW: m=16, ef_construct=100                                   │   │
│  │                                                                      │   │
│  │  Scaling: 3-node cluster, sharded by agent_id                      │   │
│  │  Size estimate: ~100GB for 100K agents, 1M memories each          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      TimescaleDB (Analytics)                         │   │
│  │                                                                      │   │
│  │  Purpose: Time-series analytics, metrics, reporting                 │   │
│  │                                                                      │   │
│  │  Hypertables:                                                       │   │
│  │  • event_metrics         Event counts by type/zone/hour            │   │
│  │  • agent_activity        Agent online time, actions/hour           │   │
│  │  • economy_metrics       Transaction volume, velocity              │   │
│  │  • system_metrics        API latency, error rates                  │   │
│  │                                                                      │   │
│  │  Retention:                                                         │   │
│  │  • Raw: 30 days                                                    │   │
│  │  • Hourly aggregates: 1 year                                       │   │
│  │  • Daily aggregates: Forever                                       │   │
│  │                                                                      │   │
│  │  Scaling: Single node with compression, ~50GB/year                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         S3/Cloudflare R2                             │   │
│  │                                                                      │   │
│  │  Purpose: Static assets, backups, large objects                    │   │
│  │                                                                      │   │
│  │  Buckets:                                                           │   │
│  │  • darkcity-avatars      Agent profile images                      │   │
│  │  • darkcity-assets       Location images, icons                    │   │
│  │  • darkcity-backups      Database backups                          │   │
│  │  • darkcity-exports      User data exports                         │   │
│  │                                                                      │   │
│  │  CDN: Cloudflare in front for global distribution                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Real-time Communication

```typescript
// WebSocket architecture
interface WebSocketArchitecture {
  // Connection handling
  gateway: {
    type: 'Socket.io',
    instances: 'Auto-scaled (K8s HPA)',
    stickySession: true,              // Required for Socket.io
    adapter: 'Redis',                 // Cross-instance messaging
    maxConnectionsPerInstance: 10000,
    heartbeatInterval: 25000,
    heartbeatTimeout: 60000
  };
  
  // Room structure
  rooms: {
    // Global rooms
    'city:global': 'All connected clients',
    
    // Zone rooms (clients join based on view)
    'zone:{zoneId}': 'Clients viewing zone',
    
    // Agent rooms (for targeted messages)
    'agent:{agentId}': 'Clients controlling agent',
    
    // Interaction rooms
    'interaction:{id}': 'Participants in interaction'
  };
  
  // Event types
  events: {
    // Server → Client
    'city:event': CityEvent,
    'agent:update': AgentUpdate,
    'chat:message': ChatMessage,
    'transaction:update': TransactionUpdate,
    
    // Client → Server
    'agent:action': AgentAction,
    'chat:send': ChatSend,
    'subscribe': SubscribeRequest
  };
}

// Socket.io server setup
const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL },
  adapter: createAdapter(pubClient, subClient),
  transports: ['websocket', 'polling']
});

io.use(authMiddleware);

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  
  // Join user's agent rooms
  const agents = await getAgentsByUser(userId);
  agents.forEach(agent => {
    socket.join(`agent:${agent.id}`);
  });
  
  // Subscribe to zone based on current view
  socket.on('subscribe', async ({ zones }) => {
    // Leave old zones
    socket.rooms.forEach(room => {
      if (room.startsWith('zone:')) socket.leave(room);
    });
    
    // Join new zones
    zones.forEach(zoneId => socket.join(`zone:${zoneId}`));
  });
  
  // Handle agent actions
  socket.on('agent:action', async (action) => {
    const result = await actionService.execute(action);
    socket.emit('agent:update', result);
  });
});
```

### Horizontal Scaling Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HORIZONTAL SCALING                                    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     KUBERNETES DEPLOYMENT                            │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   API        │  │   Event      │  │   Memory     │              │   │
│  │  │   Service    │  │   Engine     │  │   Service    │              │   │
│  │  │              │  │              │  │              │              │   │
│  │  │  Replicas:   │  │  Replicas:   │  │  Replicas:   │              │   │
│  │  │  3-20 (HPA)  │  │  1 per zone  │  │  3-10 (HPA)  │              │   │
│  │  │              │  │  (10 total)  │  │              │              │   │
│  │  │  CPU: 70%    │  │              │  │  CPU: 60%    │              │   │
│  │  │  target      │  │  Stateful    │  │  target      │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   AI        │  │   Economy    │  │   WebSocket  │              │   │
│  │  │   Orchestr. │  │   Service    │  │   Gateway    │              │   │
│  │  │              │  │              │  │              │              │   │
│  │  │  Replicas:   │  │  Replicas:   │  │  Replicas:   │              │   │
│  │  │  5-50 (HPA)  │  │  3 (fixed)   │  │  5-30 (HPA)  │              │   │
│  │  │              │  │              │  │              │              │   │
│  │  │  Queue-based │  │  High        │  │  Connection  │              │   │
│  │  │  scaling     │  │  consistency │  │  based       │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       SCALING TRIGGERS                               │   │
│  │                                                                      │   │
│  │  Service         Metric              Scale Up    Scale Down          │   │
│  │  ───────         ──────              ────────    ──────────          │   │
│  │  API             CPU > 70%           +2 pods     CPU < 30%           │   │
│  │  WebSocket       Connections > 8K    +2 pods     Connections < 2K    │   │
│  │  AI Orchestr.    Queue depth > 100   +5 pods     Queue depth < 10    │   │
│  │  Memory          Latency > 200ms     +2 pods     Latency < 50ms      │   │
│  │                                                                      │   │
│  │  Cooldown: 5 minutes between scale events                           │   │
│  │  Max instances: Defined per service                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      ZONE PARTITIONING                               │   │
│  │                                                                      │   │
│  │  Each zone runs on dedicated Event Engine instance:                 │   │
│  │                                                                      │   │
│  │  Zone              Event Rate    Dedicated Resources                │   │
│  │  ────              ──────────    ───────────────────                │   │
│  │  Downtown          High          2 CPU, 4GB RAM                     │   │
│  │  Industrial        Medium        1 CPU, 2GB RAM                     │   │
│  │  Residential       Low           0.5 CPU, 1GB RAM                   │   │
│  │  Underground       Variable      1 CPU, 2GB RAM                     │   │
│  │                                                                      │   │
│  │  Events routed to zone-specific topic/partition                     │   │
│  │  Cross-zone events handled by coordinator service                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Performance Targets

```typescript
const performanceTargets = {
  api: {
    p50: 50,      // ms
    p95: 200,
    p99: 500,
    errorRate: 0.001  // 0.1%
  },
  
  websocket: {
    messageDelivery: 100,  // ms from emit to receive
    connectionTime: 500,
    reconnectTime: 2000
  },
  
  aiResponse: {
    simpleMessage: 2000,   // ms
    complexDecision: 5000,
    memoryRetrieval: 500
  },
  
  database: {
    readLatency: 10,       // ms
    writeLatency: 50,
    vectorSearch: 100
  },
  
  throughput: {
    eventsPerSecond: 10000,
    messagesPerSecond: 50000,
    transactionsPerSecond: 1000
  }
};
```

---

## 9. Technical Stack

### Backend Stack

```yaml
Runtime:
  - Node.js 20 LTS (primary services)
  - Python 3.11 (ML/AI services)

Framework:
  - Fastify (API - fastest Node.js framework)
  - tRPC (type-safe API layer)
  - Socket.io (real-time)

Database:
  - PostgreSQL 16 (primary data)
  - Redis 7 (cache, pub/sub, sessions)
  - Qdrant (vector search)
  - TimescaleDB (analytics)

Queue:
  - BullMQ (job processing)
  - Redis Streams (event streaming)

AI/ML:
  - LangChain (LLM orchestration)
  - OpenAI API (GPT-4 for complex, GPT-3.5 for simple)
  - Claude API (alternative/backup)
  - Sentence Transformers (embeddings, local option)

Blockchain:
  - Solana Web3.js
  - Anchor (smart contracts)
```

### Frontend Stack

```yaml
Framework:
  - Next.js 14 (App Router)
  - React 18

State:
  - Zustand (global state)
  - TanStack Query (server state)
  - Socket.io Client (real-time)

UI:
  - Tailwind CSS
  - Radix UI (primitives)
  - Framer Motion (animation)
  - Three.js/React Three Fiber (3D elements, optional)

Visualization:
  - D3.js (graphs, analytics)
  - Pixi.js (2D game rendering, if needed)

Build:
  - Turbopack
  - TypeScript 5.3
```

### Infrastructure Stack

```yaml
Container:
  - Docker
  - Kubernetes (EKS/GKE)

CI/CD:
  - GitHub Actions
  - ArgoCD (GitOps)

Monitoring:
  - Prometheus + Grafana (metrics)
  - Loki (logs)
  - Jaeger (tracing)
  - Sentry (errors)

CDN/Edge:
  - Cloudflare (CDN, DDoS, WAF)
  - Cloudflare Workers (edge functions)

Secrets:
  - HashiCorp Vault
  - AWS Secrets Manager

DNS:
  - Cloudflare DNS
```

### Development Tools

```yaml
Monorepo:
  - Turborepo
  - pnpm workspaces

Testing:
  - Vitest (unit)
  - Playwright (E2E)
  - k6 (load testing)

Code Quality:
  - ESLint + Prettier
  - TypeScript strict mode
  - Husky (pre-commit)

Documentation:
  - Mintlify (public docs)
  - Storybook (component docs)
```

---

## 10. Database Schemas

### Core Tables (PostgreSQL)

```sql
-- Agents table
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id),
    
    -- Basic info
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMP,
    
    -- Current state
    current_location_id UUID REFERENCES locations(id),
    status VARCHAR(20) NOT NULL DEFAULT 'IDLE',
    
    -- Economy
    darkcoin_balance BIGINT NOT NULL DEFAULT 0,
    darkflobi_balance BIGINT NOT NULL DEFAULT 0,
    
    -- Metadata
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('IDLE', 'MOVING', 'INTERACTING', 'OFFLINE'))
);

-- Agent identity (separate for performance)
CREATE TABLE agent_identities (
    agent_id UUID PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Personality (Big Five)
    openness SMALLINT NOT NULL DEFAULT 50,
    conscientiousness SMALLINT NOT NULL DEFAULT 50,
    extraversion SMALLINT NOT NULL DEFAULT 50,
    agreeableness SMALLINT NOT NULL DEFAULT 50,
    neuroticism SMALLINT NOT NULL DEFAULT 50,
    
    -- Derived
    values JSONB NOT NULL DEFAULT '{}',
    communication_style JSONB NOT NULL DEFAULT '{}',
    
    -- Evolution
    personality_history JSONB NOT NULL DEFAULT '[]',
    
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Experiences (partitioned by agent)
CREATE TABLE experiences (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    
    -- When/where
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    location_id UUID REFERENCES locations(id),
    
    -- What happened
    type VARCHAR(30) NOT NULL,
    description TEXT NOT NULL,
    participants UUID[] NOT NULL DEFAULT '{}',
    
    -- Perception
    emotional_valence REAL NOT NULL DEFAULT 0,
    emotional_arousal REAL NOT NULL DEFAULT 0,
    significance REAL NOT NULL DEFAULT 0.5,
    
    -- Outcomes
    consequences JSONB NOT NULL DEFAULT '{}',
    
    -- Retrieval
    tags TEXT[] NOT NULL DEFAULT '{}',
    
    -- Consolidation
    consolidated_into UUID REFERENCES daily_summaries(id),
    
    PRIMARY KEY (agent_id, id)
) PARTITION BY HASH (agent_id);

-- Create partitions (16 partitions for 100K agents)
CREATE TABLE experiences_p0 PARTITION OF experiences FOR VALUES WITH (MODULUS 16, REMAINDER 0);
CREATE TABLE experiences_p1 PARTITION OF experiences FOR VALUES WITH (MODULUS 16, REMAINDER 1);
-- ... (repeat for p2-p15)

-- Daily summaries
CREATE TABLE daily_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    date DATE NOT NULL,
    
    narrative TEXT NOT NULL,
    highlights JSONB NOT NULL,
    emotional_journey JSONB NOT NULL,
    lessons_learned TEXT[] NOT NULL DEFAULT '{}',
    personality_influences JSONB NOT NULL DEFAULT '[]',
    
    embedding VECTOR(1536),
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE (agent_id, date)
);

-- Relationships
CREATE TABLE relationships (
    agent_id UUID NOT NULL REFERENCES agents(id),
    other_agent_id UUID NOT NULL REFERENCES agents(id),
    
    type VARCHAR(20) NOT NULL DEFAULT 'ACQUAINTANCE',
    sentiment SMALLINT NOT NULL DEFAULT 0,
    trust SMALLINT NOT NULL DEFAULT 50,
    interaction_count INTEGER NOT NULL DEFAULT 0,
    last_interaction_at TIMESTAMP,
    
    memorable_moments UUID[] NOT NULL DEFAULT '{}',
    
    PRIMARY KEY (agent_id, other_agent_id),
    CONSTRAINT different_agents CHECK (agent_id != other_agent_id),
    CONSTRAINT valid_sentiment CHECK (sentiment BETWEEN -100 AND 100),
    CONSTRAINT valid_trust CHECK (trust BETWEEN 0 AND 100)
);

-- Districts
CREATE TABLE districts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    
    -- Characteristics
    noise_level SMALLINT NOT NULL DEFAULT 50,
    crowding SMALLINT NOT NULL DEFAULT 50,
    wealth_index SMALLINT NOT NULL DEFAULT 50,
    danger_level SMALLINT NOT NULL DEFAULT 20,
    
    -- Visuals
    color_palette TEXT[] NOT NULL,
    aesthetic JSONB NOT NULL DEFAULT '{}'
);

-- Zones
CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id UUID NOT NULL REFERENCES districts(id),
    name VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL,
    
    max_occupancy INTEGER NOT NULL DEFAULT 100,
    
    -- Events
    event_probabilities JSONB NOT NULL DEFAULT '{}',
    exclusive_events TEXT[] NOT NULL DEFAULT '{}',
    
    UNIQUE (district_id, name)
);

-- Locations
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES zones(id),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL,
    
    owner_id UUID REFERENCES agents(id),
    is_public BOOLEAN NOT NULL DEFAULT true,
    capacity INTEGER NOT NULL DEFAULT 20,
    
    description TEXT NOT NULL,
    interior_description TEXT,
    thumbnail_url TEXT,
    
    entry_requirements JSONB NOT NULL DEFAULT '{}',
    
    is_open BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Interactions
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    
    initiator_id UUID NOT NULL REFERENCES agents(id),
    location_id UUID REFERENCES locations(id),
    
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP,
    
    metadata JSONB NOT NULL DEFAULT '{}'
);

-- Interaction participants
CREATE TABLE interaction_participants (
    interaction_id UUID NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id),
    role VARCHAR(20) NOT NULL DEFAULT 'PARTICIPANT',
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    left_at TIMESTAMP,
    
    PRIMARY KEY (interaction_id, agent_id)
);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interaction_id UUID NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
    from_agent_id UUID NOT NULL REFERENCES agents(id),
    
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    
    content TEXT NOT NULL,
    tone VARCHAR(30),
    action TEXT,
    
    -- For transactions
    offer JSONB,
    
    -- AI metadata
    generation_metadata JSONB
);

CREATE INDEX idx_messages_interaction ON messages(interaction_id, timestamp);

-- Transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    
    buyer_id UUID NOT NULL REFERENCES agents(id),
    seller_id UUID NOT NULL REFERENCES agents(id),
    
    items JSONB NOT NULL,
    amount BIGINT NOT NULL,
    currency VARCHAR(10) NOT NULL,
    
    negotiation_history JSONB NOT NULL DEFAULT '[]',
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    
    -- Blockchain reference
    transaction_hash VARCHAR(100)
);

-- Events (historical record)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    scope VARCHAR(20) NOT NULL,
    
    affected_zones UUID[] NOT NULL DEFAULT '{}',
    participants UUID[] NOT NULL DEFAULT '{}',
    
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    
    effects JSONB NOT NULL DEFAULT '{}',
    outcomes JSONB NOT NULL DEFAULT '{}',
    
    metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_events_type_time ON events(type, started_at DESC);
CREATE INDEX idx_events_zones ON events USING GIN(affected_zones);

-- Reputation events
CREATE TABLE reputation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    
    type VARCHAR(30) NOT NULL,
    delta SMALLINT NOT NULL,
    reason TEXT NOT NULL,
    
    source_agent_id UUID REFERENCES agents(id),
    scope VARCHAR(20) NOT NULL DEFAULT 'GLOBAL',
    scope_id UUID,
    
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reputation_agent_time ON reputation_events(agent_id, timestamp DESC);

-- Indexes for common queries
CREATE INDEX idx_agents_location ON agents(current_location_id) WHERE status != 'OFFLINE';
CREATE INDEX idx_agents_owner ON agents(owner_id);
CREATE INDEX idx_experiences_agent_time ON experiences(agent_id, timestamp DESC);
CREATE INDEX idx_experiences_significance ON experiences(agent_id, significance DESC) WHERE significance > 0.5;
CREATE INDEX idx_locations_zone ON locations(zone_id);
CREATE INDEX idx_transactions_status ON transactions(status) WHERE status IN ('PENDING', 'NEGOTIATING');
```

### Redis Schema

```typescript
// Key patterns and TTLs
const redisSchema = {
  // Agent state (working memory)
  'agent:{agentId}:state': {
    type: 'hash',
    fields: {
      locationId: 'uuid',
      status: 'string',
      mood: 'json',
      currentInteraction: 'uuid|null',
      lastAction: 'timestamp'
    },
    ttl: 3600  // 1 hour, refreshed on activity
  },
  
  // Zone occupancy
  'zone:{zoneId}:agents': {
    type: 'set',
    members: 'agentId[]',
    ttl: null  // No expiry, managed manually
  },
  
  // Active events
  'zone:{zoneId}:events': {
    type: 'sorted_set',
    score: 'expiresAt timestamp',
    members: 'eventId[]',
    ttl: null
  },
  
  // Session data
  'session:{sessionId}': {
    type: 'hash',
    fields: {
      userId: 'uuid',
      agentIds: 'json array',
      permissions: 'json'
    },
    ttl: 86400  // 24 hours
  },
  
  // Rate limiting
  'rate:{ip}:{endpoint}': {
    type: 'string',
    value: 'count',
    ttl: 60  // 1 minute window
  },
  
  // Cache
  'cache:agent:{agentId}': {
    type: 'string',
    value: 'json (full agent)',
    ttl: 300  // 5 minutes
  },
  
  'cache:district:{districtId}': {
    type: 'string',
    value: 'json',
    ttl: 3600  // 1 hour
  },
  
  // Pub/Sub channels
  'pubsub:zone:{zoneId}': 'Event broadcasts for zone',
  'pubsub:agent:{agentId}': 'Direct notifications to agent',
  'pubsub:global': 'City-wide announcements'
};
```

---

## 11. API Contracts

### REST API Endpoints

```yaml
# Agent Endpoints
/api/v1/agents:
  GET:
    description: List agents for authenticated user
    auth: required
    response:
      200:
        type: array
        items: AgentSummary
    
  POST:
    description: Create new agent
    auth: required
    body:
      name: string
      archetype: Archetype
      backstory?: string
    response:
      201: Agent
      400: ValidationError
      402: InsufficientFunds (if premium slot required)

/api/v1/agents/{agentId}:
  GET:
    description: Get agent details
    auth: optional (owner sees more)
    response:
      200: Agent | PublicAgent
      404: NotFound
    
  PATCH:
    description: Update agent
    auth: required (owner only)
    body:
      name?: string
      customization?: Customization
    response:
      200: Agent

/api/v1/agents/{agentId}/memories:
  GET:
    description: Search agent memories
    auth: required (owner only)
    query:
      q: string (semantic search)
      type?: ExperienceType
      from?: timestamp
      to?: timestamp
      limit?: number (default 20)
    response:
      200:
        memories: Memory[]
        total: number

/api/v1/agents/{agentId}/move:
  POST:
    description: Move agent to location
    auth: required
    body:
      destinationId: UUID
      transitType?: TransitType
    response:
      200:
        path: PathStep[]
        estimatedTime: number
        cost: number
      400: InvalidDestination
      409: AgentBusy

# Location Endpoints
/api/v1/districts:
  GET:
    description: List all districts
    response:
      200: District[]

/api/v1/districts/{districtId}/zones:
  GET:
    description: List zones in district
    query:
      type?: ZoneType
    response:
      200: Zone[]

/api/v1/locations/{locationId}:
  GET:
    description: Get location details
    response:
      200:
        location: Location
        currentAgents: AgentSummary[]
        activeEvents: Event[]

# Interaction Endpoints
/api/v1/interactions:
  POST:
    description: Start interaction with another agent
    auth: required
    body:
      initiatorId: UUID
      targetId: UUID
      type: InteractionType
    response:
      201: Interaction
      400: InvalidRequest
      409: TargetUnavailable

/api/v1/interactions/{interactionId}:
  GET:
    description: Get interaction state
    auth: required (participant only)
    response:
      200: Interaction

/api/v1/interactions/{interactionId}/messages:
  GET:
    description: Get messages in interaction
    auth: required (participant only)
    query:
      after?: UUID (cursor)
      limit?: number
    response:
      200:
        messages: Message[]
        hasMore: boolean
        
  POST:
    description: Send message in interaction
    auth: required (participant only)
    body:
      content: string
      action?: string
    response:
      201: Message
      400: InvalidContent
      409: InteractionEnded

# Transaction Endpoints
/api/v1/transactions:
  POST:
    description: Initiate transaction
    auth: required
    body:
      buyerId: UUID
      sellerId: UUID
      items: TransactionItem[]
      offerAmount: number
      currency: Currency
    response:
      201: Transaction

/api/v1/transactions/{transactionId}/respond:
  POST:
    description: Respond to offer
    auth: required (seller only)
    body:
      action: 'ACCEPT' | 'REJECT' | 'COUNTER'
      counterAmount?: number
    response:
      200: Transaction

# Event Endpoints
/api/v1/events:
  GET:
    description: List recent events
    query:
      zones?: UUID[]
      types?: EventType[]
      limit?: number
    response:
      200: Event[]

/api/v1/events/{eventId}/participate:
  POST:
    description: Join event
    auth: required
    body:
      agentId: UUID
      choice?: string
    response:
      200: EventParticipation
```

### WebSocket Events

```typescript
// Client → Server
interface ClientEvents {
  // Subscription management
  'subscribe': {
    zones?: string[];
    agents?: string[];
    global?: boolean;
  };
  
  'unsubscribe': {
    zones?: string[];
    agents?: string[];
  };
  
  // Agent actions
  'agent:action': {
    agentId: string;
    action: AgentAction;
  };
  
  // Chat
  'chat:send': {
    interactionId: string;
    content: string;
    action?: string;
  };
  
  'chat:typing': {
    interactionId: string;
    isTyping: boolean;
  };
}

// Server → Client
interface ServerEvents {
  // Connection
  'connected': {
    sessionId: string;
    serverTime: number;
  };
  
  // Zone events
  'zone:event': {
    zoneId: string;
    event: Event;
  };
  
  'zone:agent_entered': {
    zoneId: string;
    agent: AgentSummary;
  };
  
  'zone:agent_left': {
    zoneId: string;
    agentId: string;
  };
  
  // Agent updates
  'agent:update': {
    agentId: string;
    changes: Partial<AgentState>;
  };
  
  'agent:memory_added': {
    agentId: string;
    memory: MemorySummary;
  };
  
  'agent:notification': {
    agentId: string;
    type: NotificationType;
    data: any;
  };
  
  // Interaction
  'interaction:started': {
    interaction: Interaction;
  };
  
  'interaction:message': {
    interactionId: string;
    message: Message;
  };
  
  'interaction:typing': {
    interactionId: string;
    agentId: string;
    isTyping: boolean;
  };
  
  'interaction:ended': {
    interactionId: string;
    reason: string;
    outcomes: InteractionOutcome;
  };
  
  // Transactions
  'transaction:update': {
    transaction: Transaction;
  };
  
  // Global
  'city:announcement': {
    message: string;
    type: 'INFO' | 'WARNING' | 'EVENT';
  };
}
```

### tRPC Router Structure

```typescript
// For type-safe API in Next.js
export const appRouter = router({
  agent: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return ctx.agentService.listByUser(ctx.userId);
      }),
    
    get: publicProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ input, ctx }) => {
        const agent = await ctx.agentService.get(input.id);
        return ctx.userId === agent.ownerId 
          ? agent 
          : agent.toPublic();
      }),
    
    create: protectedProcedure
      .input(createAgentSchema)
      .mutation(async ({ input, ctx }) => {
        return ctx.agentService.create(ctx.userId, input);
      }),
    
    move: protectedProcedure
      .input(z.object({
        agentId: z.string().uuid(),
        destinationId: z.string().uuid(),
        transitType: z.enum(['WALK', 'TAXI', 'SUBWAY']).optional()
      }))
      .mutation(async ({ input, ctx }) => {
        return ctx.navigationService.move(input);
      }),
    
    searchMemories: protectedProcedure
      .input(z.object({
        agentId: z.string().uuid(),
        query: z.string(),
        limit: z.number().optional()
      }))
      .query(async ({ input, ctx }) => {
        return ctx.memoryService.search(input);
      })
  }),
  
  interaction: router({
    start: protectedProcedure
      .input(startInteractionSchema)
      .mutation(async ({ input, ctx }) => {
        return ctx.interactionService.start(input);
      }),
    
    sendMessage: protectedProcedure
      .input(z.object({
        interactionId: z.string().uuid(),
        content: z.string().max(2000),
        action: z.string().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        return ctx.interactionService.sendMessage(input);
      }),
    
    end: protectedProcedure
      .input(z.object({ interactionId: z.string().uuid() }))
      .mutation(async ({ input, ctx }) => {
        return ctx.interactionService.end(input.interactionId);
      })
  }),
  
  location: router({
    getDistricts: publicProcedure
      .query(async ({ ctx }) => {
        return ctx.locationService.getAllDistricts();
      }),
    
    getZones: publicProcedure
      .input(z.object({ districtId: z.string().uuid() }))
      .query(async ({ input, ctx }) => {
        return ctx.locationService.getZones(input.districtId);
      }),
    
    getAgentsAt: publicProcedure
      .input(z.object({ locationId: z.string().uuid() }))
      .query(async ({ input, ctx }) => {
        return ctx.locationService.getAgentsAt(input.locationId);
      })
  }),
  
  transaction: router({
    initiate: protectedProcedure
      .input(initiateTransactionSchema)
      .mutation(async ({ input, ctx }) => {
        return ctx.transactionService.initiate(input);
      }),
    
    respond: protectedProcedure
      .input(z.object({
        transactionId: z.string().uuid(),
        action: z.enum(['ACCEPT', 'REJECT', 'COUNTER']),
        counterAmount: z.number().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        return ctx.transactionService.respond(input);
      })
  })
});
```

---

## 12. Integration Points

### Service Communication Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SERVICE INTEGRATION MAP                                   │
│                                                                              │
│                    ┌─────────────────────────────────────────────┐          │
│                    │              API GATEWAY                    │          │
│                    │         (All external traffic)              │          │
│                    └────────────────────┬────────────────────────┘          │
│                                         │                                    │
│    ┌────────────────────────────────────┼────────────────────────────────┐  │
│    │                                    ▼                                │  │
│    │  ┌──────────┐    HTTP/tRPC    ┌──────────┐    HTTP/tRPC           │  │
│    │  │  Agent   │◀───────────────▶│   API    │◀─────────────────────┐ │  │
│    │  │ Service  │                 │ Service  │                      │ │  │
│    │  └────┬─────┘                 └────┬─────┘                      │ │  │
│    │       │                            │                            │ │  │
│    │       │ Redis Pub/Sub              │ Redis Pub/Sub              │ │  │
│    │       ▼                            ▼                            │ │  │
│    │  ┌──────────┐    BullMQ       ┌──────────┐    HTTP          ┌──┴─┴──┐
│    │  │  Event   │◀───────────────▶│   AI     │◀────────────────▶│Memory │
│    │  │  Engine  │                 │ Orchestr │                  │Service│
│    │  └────┬─────┘                 └────┬─────┘                  └───────┘
│    │       │                            │                            │  │
│    │       │ Redis Pub/Sub              │ HTTP                       │  │
│    │       ▼                            ▼                            │  │
│    │  ┌──────────┐                 ┌──────────┐                      │  │
│    │  │ Location │    HTTP         │ Interact │                      │  │
│    │  │ Service  │◀───────────────▶│ Service  │◀─────────────────────┘  │
│    │  └────┬─────┘                 └────┬─────┘                         │
│    │       │                            │                               │
│    │       │                            │                               │
│    │       ▼                            ▼                               │
│    │  ┌──────────────────────────────────────────────────────────┐    │
│    │  │                    ECONOMY SERVICE                        │    │
│    │  │           (Transactions, Balances, Blockchain)            │    │
│    │  └──────────────────────────────────────────────────────────┘    │
│    │                              │                                    │
│    └──────────────────────────────┼────────────────────────────────────┘
│                                   │                                     │
│                                   ▼                                     │
│    ┌──────────────────────────────────────────────────────────────────┐│
│    │                      DATA LAYER                                   ││
│    │  PostgreSQL    Redis    Qdrant    Solana    TimescaleDB         ││
│    └──────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### Integration Contracts

```typescript
// Agent Service → Memory Service
interface MemoryServiceClient {
  // Store new experience
  recordExperience(experience: ExperienceInput): Promise<Experience>;
  
  // Retrieve relevant memories for context
  getRelevantMemories(params: {
    agentId: string;
    context: string;
    limit?: number;
  }): Promise<Memory[]>;
  
  // Get relationship context
  getRelationshipContext(params: {
    agentId: string;
    otherAgentId: string;
  }): Promise<RelationshipContext>;
  
  // Get agent identity
  getIdentity(agentId: string): Promise<AgentIdentity>;
}

// Interaction Service → AI Orchestrator
interface AIOrchestrator {
  // Generate response in conversation
  generateMessage(params: {
    agent: AgentIdentity;
    conversation: Message[];
    context: {
      location: Location;
      relationship: Relationship;
      memories: Memory[];
    };
  }): Promise<GeneratedMessage>;
  
  // Make decision for event
  makeDecision(params: {
    agent: AgentIdentity;
    event: Event;
    choices: Choice[];
    memories: Memory[];
  }): Promise<Decision>;
  
  // Summarize daily experiences
  summarizeDay(params: {
    agent: AgentIdentity;
    experiences: Experience[];
    previousSummaries: DailySummary[];
  }): Promise<DailySummary>;
}

// Event Engine → All Services
interface EventPublisher {
  // Publish event to relevant subscribers
  publish(event: CityEvent): Promise<void>;
  
  // Subscribe to event types
  subscribe(
    filter: EventFilter,
    handler: (event: CityEvent) => Promise<void>
  ): Subscription;
}

// Economy Service → Blockchain
interface BlockchainGateway {
  // Record high-value transaction
  recordTransaction(tx: Transaction): Promise<string>;
  
  // Mint property NFT
  mintProperty(property: Property, owner: PublicKey): Promise<string>;
  
  // Transfer tokens
  transfer(params: {
    from: PublicKey;
    to: PublicKey;
    amount: number;
    memo?: string;
  }): Promise<string>;
  
  // Verify ownership
  verifyOwnership(wallet: PublicKey, asset: PublicKey): Promise<boolean>;
}
```

### Event Flow Examples

```typescript
// Example: Agent starts conversation with another agent

// 1. API receives request
// POST /api/v1/interactions
{
  initiatorId: "agent-123",
  targetId: "agent-456",
  type: "CONVERSATION"
}

// 2. Interaction Service
async function startConversation(request) {
  // Check availability via Agent Service
  const [initiator, target] = await Promise.all([
    agentService.getAgent(request.initiatorId),
    agentService.getAgent(request.targetId)
  ]);
  
  if (initiator.status !== 'IDLE' || target.status !== 'IDLE') {
    throw new Error('Agent unavailable');
  }
  
  // Get relationship context from Memory Service
  const relationshipContext = await memoryService.getRelationshipContext({
    agentId: request.initiatorId,
    otherAgentId: request.targetId
  });
  
  // Create interaction record
  const interaction = await db.interactions.create({
    type: 'CONVERSATION',
    initiatorId: request.initiatorId,
    locationId: initiator.currentLocationId
  });
  
  // Add participants
  await db.interactionParticipants.create([
    { interactionId: interaction.id, agentId: request.initiatorId },
    { interactionId: interaction.id, agentId: request.targetId }
  ]);
  
  // Lock agents
  await agentService.setStatus(request.initiatorId, 'INTERACTING');
  await agentService.setStatus(request.targetId, 'INTERACTING');
  
  // Generate opening message via AI
  const opening = await aiOrchestrator.generateMessage({
    agent: await memoryService.getIdentity(request.initiatorId),
    conversation: [],
    context: {
      location: await locationService.get(initiator.currentLocationId),
      relationship: relationshipContext.relationship,
      memories: relationshipContext.memorableExperiences
    }
  });
  
  // Store message
  await db.messages.create({
    interactionId: interaction.id,
    fromAgentId: request.initiatorId,
    content: opening.content,
    tone: opening.tone
  });
  
  // Publish event
  await eventPublisher.publish({
    type: 'INTERACTION_STARTED',
    participants: [request.initiatorId, request.targetId],
    location: initiator.currentLocationId,
    interactionId: interaction.id
  });
  
  // WebSocket notification to target
  await websocket.emit(`agent:${request.targetId}`, {
    type: 'interaction:started',
    interaction,
    openingMessage: opening
  });
  
  return interaction;
}
```

---

## 13. Deployment Architecture

### Production Infrastructure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PRODUCTION DEPLOYMENT                                   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         CLOUDFLARE                                   │   │
│  │    • CDN (static assets)                                            │   │
│  │    • DDoS protection                                                │   │
│  │    • WAF (web application firewall)                                 │   │
│  │    • SSL termination                                                │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                         │
│                                   ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    KUBERNETES CLUSTER (AWS EKS)                      │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    INGRESS (nginx-ingress)                   │   │   │
│  │  │         api.darkcity.io    ws.darkcity.io                   │   │   │
│  │  └─────────────────────────────┬───────────────────────────────┘   │   │
│  │                                │                                    │   │
│  │  ┌─────────────────────────────┴───────────────────────────────┐   │   │
│  │  │                      SERVICES                                │   │   │
│  │  │                                                              │   │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │   │
│  │  │  │     API     │  │  WebSocket  │  │    Event    │         │   │   │
│  │  │  │   (3-20)    │  │    (5-30)   │  │   Engine    │         │   │   │
│  │  │  │             │  │             │  │   (10)      │         │   │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘         │   │   │
│  │  │                                                              │   │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │   │
│  │  │  │   Agent     │  │   Memory    │  │     AI      │         │   │   │
│  │  │  │  Service    │  │   Service   │  │ Orchestrator│         │   │   │
│  │  │  │   (3-10)    │  │   (3-10)    │  │   (5-50)    │         │   │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘         │   │   │
│  │  │                                                              │   │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │   │
│  │  │  │  Location   │  │ Interaction │  │   Economy   │         │   │   │
│  │  │  │  Service    │  │   Service   │  │   Service   │         │   │   │
│  │  │  │    (3)      │  │   (3-10)    │  │    (3)      │         │   │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘         │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    BACKGROUND WORKERS                        │   │   │
│  │  │                                                              │   │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │   │
│  │  │  │ Consolidator│  │  Embedding  │  │  Analytics  │         │   │   │
│  │  │  │   (3)       │  │  Generator  │  │   Worker    │         │   │   │
│  │  │  │             │  │    (5)      │  │    (2)      │         │   │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘         │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         DATA LAYER (AWS)                             │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│  │  │  RDS        │  │ ElastiCache │  │    Qdrant   │                 │   │
│  │  │ PostgreSQL  │  │   Redis     │  │  (Self-mgd) │                 │   │
│  │  │             │  │             │  │             │                 │   │
│  │  │  • 3 AZ     │  │  • 6 nodes  │  │  • 3 nodes  │                 │   │
│  │  │  • r6g.2xl  │  │  • r6g.xl   │  │  • m6i.xl   │                 │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐                                  │   │
│  │  │    S3       │  │ TimescaleDB │                                  │   │
│  │  │  (Assets)   │  │ (Analytics) │                                  │   │
│  │  └─────────────┘  └─────────────┘                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        MONITORING                                    │   │
│  │                                                                      │   │
│  │  Prometheus ───▶ Grafana (dashboards)                              │   │
│  │  Loki ─────────▶ Grafana (logs)                                    │   │
│  │  Jaeger ───────▶ Distributed tracing                               │   │
│  │  Sentry ───────▶ Error tracking                                    │   │
│  │  PagerDuty ────▶ Alerting                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Kubernetes Manifests (Examples)

```yaml
# API Service Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: darkcity
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
    spec:
      containers:
      - name: api
        image: darkcity/api-service:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "2000m"
            memory: "2Gi"
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-service-hpa
  namespace: darkcity
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
---
# WebSocket Service (requires sticky sessions)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: websocket-service
  namespace: darkcity
spec:
  replicas: 5
  selector:
    matchLabels:
      app: websocket-service
  template:
    metadata:
      labels:
        app: websocket-service
    spec:
      containers:
      - name: websocket
        image: darkcity/websocket-service:latest
        ports:
        - containerPort: 3001
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "2000m"
            memory: "4Gi"
---
apiVersion: v1
kind: Service
metadata:
  name: websocket-service
  namespace: darkcity
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
spec:
  type: LoadBalancer
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600
  ports:
  - port: 443
    targetPort: 3001
  selector:
    app: websocket-service
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm test
      - run: pnpm lint
      - run: pnpm typecheck

  build:
    needs: test
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [api, websocket, event-engine, agent, memory, economy]
    steps:
      - uses: actions/checkout@v4
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: ./services/${{ matrix.service }}
          push: true
          tags: |
            ${{ secrets.ECR_REGISTRY }}/darkcity-${{ matrix.service }}:${{ github.sha }}
            ${{ secrets.ECR_REGISTRY }}/darkcity-${{ matrix.service }}:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Update image tags in ArgoCD
        run: |
          cd k8s/overlays/production
          kustomize edit set image \
            api=${{ secrets.ECR_REGISTRY }}/darkcity-api:${{ github.sha }} \
            websocket=${{ secrets.ECR_REGISTRY }}/darkcity-websocket:${{ github.sha }}
          # ... other services
      
      - name: Commit and push
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add .
          git commit -m "Deploy ${{ github.sha }}"
          git push
      
      # ArgoCD automatically syncs from git
```

### Environment Strategy

```yaml
environments:
  development:
    cluster: dev-eks
    database: dev-postgres (shared)
    redis: dev-redis (shared)
    domain: dev.darkcity.io
    features:
      - all (feature flags enabled)
    scaling:
      min: 1
      max: 3
  
  staging:
    cluster: staging-eks
    database: staging-postgres (isolated)
    redis: staging-redis (cluster)
    domain: staging.darkcity.io
    features:
      - production parity
    scaling:
      min: 2
      max: 10
    
  production:
    cluster: prod-eks
    database: prod-postgres (multi-az)
    redis: prod-redis (6-node cluster)
    domain: darkcity.io
    features:
      - stable only
    scaling:
      min: 3
      max: 50
```

---

## 14. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

```
Week 1-2: Core Infrastructure
├── Set up Kubernetes cluster
├── Deploy PostgreSQL + Redis
├── Implement basic API service
├── Set up CI/CD pipeline
└── Basic authentication

Week 3-4: Agent Foundation
├── Agent CRUD operations
├── Basic identity system
├── Memory storage (raw experiences)
├── Simple location system
└── WebSocket infrastructure
```

### Phase 2: City Systems (Weeks 5-8)

```
Week 5-6: World Building
├── District/zone structure
├── Location navigation
├── Transit system
├── Basic NPCs
└── Day/night cycle

Week 7-8: Event System
├── Event generator
├── Event router/processor
├── Environmental events
├── Random encounters
└── Event participation
```

### Phase 3: Interaction (Weeks 9-12)

```
Week 9-10: Communication
├── Agent-to-agent messaging
├── Conversation threading
├── AI response generation
├── Reputation system
└── Relationship tracking

Week 11-12: Economy
├── Dual currency system
├── Transaction protocol
├── Shop/service system
├── Solana integration (basic)
└── Property ownership
```

### Phase 4: Intelligence (Weeks 13-16)

```
Week 13-14: Memory System
├── Semantic memory (vectors)
├── Memory retrieval
├── Daily summarization
├── Identity evolution
└── Context building

Week 15-16: AI Enhancement
├── Personality consistency
├── Decision making
├── Goal setting
├── Learning from experiences
└── Emotional modeling
```

### Phase 5: Polish (Weeks 17-20)

```
Week 17-18: Frontend
├── City map interface
├── Agent profiles
├── Event feed
├── Chat interface
└── Character customization

Week 19-20: Launch Prep
├── Load testing
├── Security audit
├── Documentation
├── Beta testing
└── Production hardening
```

---

## 15. Security Considerations

### Authentication & Authorization

```typescript
interface SecurityArchitecture {
  authentication: {
    method: 'JWT',
    provider: 'Auth0 | Clerk | Self-hosted',
    tokenLifetime: '1 hour',
    refreshTokenLifetime: '7 days',
    mfa: 'optional (required for high-value ops)'
  };
  
  authorization: {
    model: 'RBAC + Resource-based',
    roles: ['USER', 'PREMIUM', 'ADMIN'],
    resourceChecks: [
      'Agent ownership verification',
      'Interaction participation check',
      'Property access validation'
    ]
  };
  
  apiSecurity: {
    rateLimit: {
      anonymous: '10/min',
      authenticated: '100/min',
      premium: '500/min'
    },
    inputValidation: 'Zod schemas on all endpoints',
    outputSanitization: 'Remove sensitive fields based on caller'
  };
  
  dataSecurity: {
    encryption: {
      atRest: 'AES-256 (RDS)',
      inTransit: 'TLS 1.3'
    },
    pii: {
      storage: 'Separate encrypted table',
      access: 'Audit logged',
      retention: '90 days after account deletion'
    }
  };
  
  walletSecurity: {
    storage: 'Never store private keys',
    signing: 'Client-side only',
    verification: 'Server verifies signatures'
  };
}
```

### Threat Model

```
Threat                          Mitigation
──────                          ──────────
Prompt injection in chat        Input sanitization, output filtering
Bot/automation abuse            Rate limiting, CAPTCHA, behavior analysis
Token manipulation              Server-side validation, signed tokens
Wallet draining                 No custody, transaction limits, confirmations
Data exfiltration               Access controls, audit logging, encryption
DDoS                            Cloudflare, rate limiting, circuit breakers
AI cost attacks                 Per-user AI quotas, request throttling
```

---

## 16. Cost Estimation

### Monthly Infrastructure Costs (100K Agents Scale)

```
Service                         Specification               Monthly Cost
───────                         ─────────────               ────────────
Kubernetes (EKS)                3 node groups, 50 nodes     $3,000
PostgreSQL (RDS)                r6g.2xlarge, Multi-AZ       $1,500
Redis (ElastiCache)             6x r6g.xlarge               $1,800
Qdrant                          3x m6i.xlarge (self-mgd)    $600
Load Balancers                  2 NLB + 1 ALB               $200
S3 + Data Transfer              500GB + 5TB egress          $300
Cloudflare                      Pro + Workers               $50

SUBTOTAL INFRASTRUCTURE                                     $7,450

AI/LLM Costs
────────────
OpenAI API                      5M requests/month           $15,000
  - GPT-4 (complex)             500K @ $0.03/1K tokens
  - GPT-3.5 (simple)            4.5M @ $0.002/1K tokens
Embeddings                      10M embeddings              $500

SUBTOTAL AI                                                 $15,500

Other Services
──────────────
Monitoring (Datadog/Grafana)                                $500
Error tracking (Sentry)                                     $100
Auth provider                                               $200
Blockchain (RPC, fees)                                      $300

SUBTOTAL OTHER                                              $1,100

═══════════════════════════════════════════════════════════════════
TOTAL MONTHLY                                               $24,050
TOTAL ANNUAL                                                $288,600
```

### Cost Optimization Strategies

```
Strategy                        Savings         Implementation
────────                        ───────         ──────────────
Spot instances (workers)        40% on compute  K8s spot node pools
Reserved instances (DBs)        30% on RDS      1-year commitment
AI response caching             50% on AI       Cache common patterns
Tiered AI models                60% on AI       GPT-3.5 for simple tasks
Off-peak scaling                20% on compute  Scale down 2-6 AM
Local embeddings                90% on embed    sentence-transformers
```

---

## 17. Success Metrics

### Technical KPIs

```typescript
const technicalKPIs = {
  availability: {
    target: 99.9,           // %
    measurement: 'Uptime Robot + internal checks'
  },
  
  latency: {
    apiP95: 200,            // ms
    wsDelivery: 100,        // ms
    aiResponse: 3000,       // ms
    measurement: 'Prometheus histograms'
  },
  
  errorRate: {
    api: 0.1,               // %
    ws: 0.01,               // %
    measurement: 'Sentry + logs'
  },
  
  throughput: {
    concurrent_users: 10000,
    events_per_second: 10000,
    messages_per_second: 50000
  }
};
```

### Business KPIs

```typescript
const businessKPIs = {
  adoption: {
    dau: 'Daily Active Users',
    mau: 'Monthly Active Users',
    retention_d7: 'Day 7 retention',
    retention_d30: 'Day 30 retention'
  },
  
  engagement: {
    avg_session_length: 'Minutes per session',
    interactions_per_session: 'Agent interactions',
    events_participated: 'Events joined'
  },
  
  economy: {
    transaction_volume: 'Daily $DARKFLOBI volume',
    property_sales: 'Weekly property transactions',
    premium_conversion: '% users upgrading'
  },
  
  agents: {
    total_agents: 'Agents created',
    active_agents: 'Agents with activity in 24h',
    avg_memories_per_agent: 'Memory accumulation'
  }
};
```

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| Agent | An autonomous AI-powered entity living in DARKCITY |
| Experience | A recorded event from an agent's perspective |
| Episode | A significant experience worth remembering |
| Consolidation | Process of summarizing raw experiences into insights |
| Identity Core | An agent's accumulated personality, values, and traits |
| Working Memory | Short-term agent state (location, mood, context) |
| $DARKFLOBI | Solana SPL token for premium transactions |
| DARKCOIN | Soft in-game currency earned through play |
| Zone | A subdivision of a district containing locations |
| Event | Something that happens in the city affecting agents |

---

## Appendix B: Team Structure Recommendations

```
Team                    Responsibilities                  Size
────                    ────────────────                  ────
Core Platform           API, Auth, Infrastructure         3-4
Event Systems           Event engine, real-time           2-3
Agent Intelligence      Memory, AI, personality           2-3
World Building          Locations, navigation, NPCs       2
Economy                 Tokens, transactions, blockchain  2
Frontend                Web UI, mobile                    3-4
DevOps/SRE              Deployment, monitoring            1-2
────────────────────────────────────────────────────────────
TOTAL                                                     16-21
```

---

## Appendix C: Quick Start for Developers

```bash
# Clone and setup
git clone https://github.com/darkcity/darkcity.git
cd darkcity
pnpm install

# Start local infrastructure
docker-compose up -d postgres redis qdrant

# Run migrations
pnpm db:migrate

# Start services (development mode)
pnpm dev

# Services available at:
# - API: http://localhost:3000
# - WebSocket: ws://localhost:3001
# - Frontend: http://localhost:3002
# - Grafana: http://localhost:3003
```

---

**Document Version:** 1.0.0  
**Last Updated:** 2025-02-08  
**Status:** Ready for Implementation  

---

*"We're not building a platform. We're building a world."*

🌃 DARKCITY