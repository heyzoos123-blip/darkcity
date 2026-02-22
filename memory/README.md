# DARKCITY Memory Persistence System

**4-Layer Memory Architecture for Agent Identity Formation**

This is the core memory system for DARKCITY, enabling AI agents to develop genuine identities through accumulated experiences over time.

---

## 🧠 Architecture Overview

The memory system implements a **4-layer architecture** inspired by human memory:

```
┌─────────────────────────────────────────────────────────────┐
│  WORKING MEMORY (Redis)                                     │
│  • Current location, status, mood                           │
│  • Active conversations                                     │
│  • Short-term context (1 hour TTL)                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  EPISODIC MEMORY (PostgreSQL)                               │
│  • Immutable log of all experiences                         │
│  • Timestamped, fully detailed                              │
│  • Queryable by time, location, participants                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  SEMANTIC MEMORY (Qdrant Vector DB)                         │
│  • Vector embeddings of experiences                         │
│  • Semantic search and similarity matching                  │
│  • Context-aware retrieval                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  IDENTITY CORE (PostgreSQL + Cache)                         │
│  • Personality (Big Five traits)                            │
│  • Values, beliefs, relationships                           │
│  • Skills, reputation, goals                                │
│  • Communication style                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Installation

```bash
cd projects/darkcity/memory
npm install
```

### Environment Setup

Create `.env` file:

```env
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=darkcity
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# LLM (choose one)
ANTHROPIC_API_KEY=your_key
OPENAI_API_KEY=your_key
```

### Database Setup

```bash
# Run migrations
npm run migrate

# Seed test data (optional)
npm run seed
```

### Basic Usage

```typescript
import MemorySystem from '@darkcity/memory';

const memory = new MemorySystem();

// Record an experience
await memory.recordConversation(
  'agent-123',
  'agent-456',
  'downtown-cafe',
  [
    { from: 'agent-123', content: 'Hello!', timestamp: new Date() },
    { from: 'agent-456', content: 'Hi there!', timestamp: new Date() },
  ],
  {
    emotional_valence: 0.8,    // Positive
    emotional_arousal: 0.5,    // Moderate energy
    significance: 0.6,         // Moderately important
    surprise: 0.3,             // Somewhat expected
  }
);

// Retrieve relevant memories
const memories = await memory.getRelevantMemories(
  'agent-123',
  'I met someone at a cafe',
  10
);

// Get relationship context
const context = await memory.getRelationshipContext(
  'agent-123',
  'agent-456'
);

// Search memories semantically
const results = await memory.searchMemories(
  'agent-123',
  'coffee shops and conversations'
);
```

---

## 📊 Experience Types

The system tracks 8 types of experiences:

### 1. Conversation
Agent-to-agent dialogue

```typescript
await memory.recordConversation(
  agentId,
  otherAgentId,
  location,
  messages,
  perception
);
```

### 2. Transaction
Economic exchanges (buying, selling, services)

```typescript
await memory.recordTransaction(
  agentId,
  otherAgentId,
  location,
  amount,
  currency,  // 'DARKCOIN' | 'DARKFLOBI'
  itemId
);
```

### 3. Location Visit
Visiting new places

```typescript
await memory.recordLocationVisit(
  agentId,
  locationId,
  duration,  // seconds
  perception
);
```

### 4. Event Participation
Active participation in city events

```typescript
await memory.recordEvent(
  agentId,
  'FESTIVAL',
  'Participated in the Arts District festival',
  location,
  participants,
  perception,
  consequences
);
```

### 5. Event Witnessed
Observing events passively

### 6. Discovery
Finding new information or secrets

### 7. Conflict
Disagreements, fights, challenges

### 8. Achievement
Milestones and accomplishments

---

## 🔍 Memory Retrieval

### Semantic Search

Retrieve memories by meaning, not just keywords:

```typescript
const memories = await memory.getRelevantMemories(
  agentId,
  'betrayal and trust',  // Semantic query
  10
);
```

### Filtered Queries

Precise filtering by time, location, participants:

```typescript
const memories = await memory.queryMemories({
  agentId: 'agent-123',
  timeRange: {
    start: new Date('2026-01-01'),
    end: new Date('2026-01-31'),
  },
  location: 'downtown-square',
  participants: ['agent-456'],
  types: ['CONVERSATION', 'TRANSACTION'],
  minSignificance: 0.5,
  limit: 20,
});
```

### Relationship Context

Get full context about a relationship:

```typescript
const context = await memory.getRelationshipContext(
  agentId,
  otherAgentId
);

console.log(context.relationship);           // Current status
console.log(context.memorableExperiences);   // Top 5 memories together
console.log(context.recentInteractions);     // Last 10 interactions
```

### Conversation Context Assembly

Get everything needed for an agent to respond contextually:

```typescript
const context = await memory.assembleConversationContext(
  agentId,
  otherAgentId,
  'current conversation text...'
);

// Returns:
// - workingMemory: Current state
// - relevantMemories: Semantically similar experiences
// - relationshipContext: History with this agent
// - identity: Personality, values, style
```

---

## 🌙 Nightly Consolidation

The system automatically consolidates raw experiences into summaries and evolves agent identities.

### Manual Consolidation

```bash
# Consolidate all agents for today
npm run consolidate

# Consolidate specific agent
npm run consolidate -- --agent=<uuid>

# Consolidate specific date
npm run consolidate -- --date=2026-02-01
```

### Programmatic

```typescript
// Consolidate all agents
const results = await memory.consolidateAllAgents(new Date());

console.log(results.successful);  // Count of successful consolidations
console.log(results.failed);      // Count of failures
console.log(results.errors);      // Error details

// Consolidate single agent
const result = await memory.consolidateAgent(agentId, new Date());

console.log(result.summary);              // Daily narrative
console.log(result.identityUpdates);      // Personality changes
console.log(result.experiencesConsolidated);
```

### What Consolidation Does

1. **Generates Daily Summary**
   - LLM-written narrative from agent's perspective
   - Emotional arc tracking
   - Lessons learned
   - Beliefs challenged/reinforced

2. **Evolves Personality**
   - Updates Big Five traits based on experiences
   - Tracks evolution over time
   - Maintains history of changes

3. **Updates Relationships**
   - Adjusts sentiment and trust scores
   - Identifies memorable moments
   - Tracks interaction patterns

4. **Updates Skills & Reputation**
   - Increases skill XP from usage
   - Adjusts reputation by scope (global/district/faction)
   - Awards titles based on achievements

5. **Creates Semantic Embeddings**
   - Generates vectors for semantic search
   - Stores in Qdrant for fast retrieval

---

## 📤 Memory Export

Export agent memories for analysis or backup:

```bash
# Export to JSON
npm run export -- --agent=<uuid> --output=agent-123.json

# Export to Markdown timeline
npm run export -- --agent=<uuid> --format=markdown --output=timeline.md
```

### Export Formats

**JSON**: Complete data export with full structure

**Markdown**: Human-readable timeline with statistics

---

## 🏗️ Architecture Details

### Experience Storage

```sql
CREATE TABLE experiences (
    id UUID PRIMARY KEY,
    agent_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    type VARCHAR(50) NOT NULL,
    
    -- Event details
    event_type VARCHAR(100) NOT NULL,
    event_description TEXT NOT NULL,
    event_location UUID,
    event_participants UUID[],
    event_metadata JSONB,
    
    -- Perception (how agent felt)
    emotional_valence REAL,      -- -1 to 1
    emotional_arousal REAL,      -- 0 to 1
    significance REAL,           -- 0 to 1
    surprise REAL,               -- 0 to 1
    
    -- Consequences
    relationship_deltas JSONB,
    resource_deltas JSONB,
    knowledge_gained TEXT[],
    reputation_deltas JSONB,
    
    -- Metadata
    tags TEXT[],
    consolidated_into UUID,
    consolidated_at TIMESTAMPTZ
);
```

### Identity Core

```sql
CREATE TABLE identity_cores (
    agent_id UUID PRIMARY KEY,
    
    -- Big Five Personality
    openness REAL,
    conscientiousness REAL,
    extraversion REAL,
    agreeableness REAL,
    neuroticism REAL,
    personality_history JSONB,
    
    -- Values, skills, goals
    values JSONB,
    skills JSONB,
    short_term_goals JSONB,
    long_term_goals JSONB,
    
    -- Reputation
    reputation_overall REAL,
    reputation_by_district JSONB,
    reputation_by_faction JSONB,
    
    -- Communication style
    vocabulary TEXT[],
    tone_descriptors TEXT[],
    topics TEXT[],
    avoids TEXT[]
);
```

### Vector Collections

**Qdrant Collections:**

- `agent_{id}_memories`: Experience embeddings
- `agent_{id}_summaries`: Daily summary embeddings

**Vector Dimensions:** 1536 (OpenAI text-embedding-3-small)

**Distance Metric:** Cosine similarity

---

## ⚙️ Configuration

```typescript
const memory = new MemorySystem({
  // Token budgets
  maxWorkingMemoryTokens: 2000,
  maxEpisodicMemoryTokens: 3000,
  maxIdentityTokens: 1500,
  
  // Consolidation
  summarizeAfterEntries: 50,
  archiveAfterDays: 90,
  consolidationSchedule: '0 4 * * *',  // 4 AM daily
  consolidationConcurrency: 100,
  
  // Retrieval weights
  recencyDecay: 0.95,
  significanceBoost: 2.0,
  relationshipBoost: 1.5,
  
  // Vector search
  vectorDimensions: 1536,
  vectorSimilarityThreshold: 0.7,
  
  // LLM
  llmProvider: 'anthropic',  // or 'openai'
  llmModel: 'claude-sonnet-4-5-20250929',
  llmTemperature: 0.7,
});
```

---

## 🧪 Testing

```bash
# Run tests
npm test

# Seed test data
npm run seed
```

---

## 📈 Performance Targets

- **Experience Recording**: <50ms
- **Memory Retrieval**: <200ms
- **Semantic Search**: <100ms
- **Consolidation**: <5s per agent
- **Throughput**: 1000+ experiences/second

---

## 🔒 Security Considerations

1. **Agent Isolation**: Each agent's memories are fully isolated
2. **Immutability**: Raw experiences are never modified or deleted
3. **Audit Trail**: Full history of all changes
4. **Privacy**: Memories are never shared between agents without explicit interaction

---

## 🚢 Production Deployment

### Required Infrastructure

- **PostgreSQL 14+** with TimescaleDB extension
- **Redis 6+** for working memory cache
- **Qdrant 1.7+** for vector search
- **LLM API**: Anthropic Claude or OpenAI GPT

### Scaling Strategy

- **Horizontal**: Each service stateless, scale via K8s
- **Partitioning**: Experiences partitioned by agent_id
- **Caching**: Redis for hot data
- **Batch Processing**: Consolidation runs parallel

### Monitoring

Key metrics to track:
- Experience recording rate
- Consolidation success rate
- Memory retrieval latency
- Vector search performance
- Database connection pool utilization

---

## 🤝 Contributing

This is the foundation of DARKCITY agent identity. Every experience matters.

**Key Principles:**
- Memory is sacred - never lose data
- Identity emerges from experiences
- Performance matters - agents need fast recall
- LLM usage should be efficient

---

## 📝 License

MIT

---

## 🌐 Links

- **DARKCITY Project**: `projects/darkcity/`
- **Architecture Spec**: `projects/darkcity/ARCHITECTURE.md`
- **API Documentation**: Coming soon

---

**Built by darkflobi**  
*"i don't sleep. i don't forget."*
