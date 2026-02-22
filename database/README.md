# DARKCITY Database Layer

Production-ready database infrastructure for the DARKCITY autonomous agent platform.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Setup](#setup)
- [Database Schema](#database-schema)
- [Services](#services)
- [Migrations](#migrations)
- [Seeding](#seeding)
- [Performance](#performance)
- [Development](#development)

---

## 🎯 Overview

The DARKCITY database layer provides:

- **PostgreSQL 15+** with Prisma ORM for type-safe database access
- **Redis** for caching, pub/sub, and session management
- **pgvector** for semantic memory search (embeddings)
- **Partitioned tables** for horizontal scaling (experiences table)
- **Connection pooling** for high concurrency
- **Comprehensive CRUD services** with error handling
- **Seed data** for 10 districts, zones, and locations

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                      │
│          (API Services, Event Engine, AI)                │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  PostgreSQL │ │    Redis    │ │   Qdrant    │
│  (Primary)  │ │  (Cache)    │ │  (Vectors)  │
└─────────────┘ └─────────────┘ └─────────────┘
```

### Data Flow

1. **Write Operations**: Application → Prisma → PostgreSQL → Cache Invalidation
2. **Read Operations**: Application → Cache Check → Prisma → PostgreSQL (if cache miss)
3. **Real-time Events**: Application → Redis Pub/Sub → WebSocket Clients
4. **Memory Search**: Application → Qdrant (vector similarity)

---

## 🚀 Setup

### Prerequisites

- **Node.js** 18+ and npm 9+
- **PostgreSQL** 15+
- **Redis** 7+
- **Docker** (optional, for local development)

### Installation

1. **Clone and navigate to the database directory**:
   ```bash
   cd projects/darkcity/database
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your database credentials:
   ```env
   DATABASE_URL="postgresql://darkcity:password@localhost:5432/darkcity"
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

4. **Start PostgreSQL and Redis** (Docker):
   ```bash
   docker-compose up -d
   ```

   Or use the provided docker-compose.yml:
   ```yaml
   version: '3.8'
   services:
     postgres:
       image: pgvector/pgvector:pg16
       environment:
         POSTGRES_USER: darkcity
         POSTGRES_PASSWORD: password
         POSTGRES_DB: darkcity
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data
     
     redis:
       image: redis:7-alpine
       ports:
         - "6379:6379"
       command: redis-server --appendonly yes
       volumes:
         - redis_data:/data
   
   volumes:
     postgres_data:
     redis_data:
   ```

5. **Run migrations**:
   ```bash
   npm run db:generate  # Generate Prisma Client
   npm run db:migrate   # Apply migrations
   ```

6. **Seed the database**:
   ```bash
   npm run db:seed
   ```

7. **Verify setup**:
   ```bash
   npm run db:studio    # Opens Prisma Studio
   ```

---

## 📊 Database Schema

### Core Tables

#### **agents**
Agent entities with current state and economy.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| owner_id | UUID | Reference to user |
| name | VARCHAR(50) | Agent name |
| current_location_id | UUID | Current location |
| status | ENUM | IDLE, MOVING, INTERACTING, OFFLINE |
| darkcoin_balance | BIGINT | Soft currency balance |
| darkflobi_balance | BIGINT | Token balance |
| metadata | JSONB | Flexible attributes |

#### **agent_identities**
Big Five personality traits and derived characteristics.

| Column | Type | Description |
|--------|------|-------------|
| agent_id | UUID | Primary key (FK to agents) |
| openness | SMALLINT | 0-100 |
| conscientiousness | SMALLINT | 0-100 |
| extraversion | SMALLINT | 0-100 |
| agreeableness | SMALLINT | 0-100 |
| neuroticism | SMALLINT | 0-100 |
| values | JSONB | Emergent values |
| communication_style | JSONB | Speech patterns |

#### **experiences** (Partitioned)
Raw experience log for memory formation.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Experience ID |
| agent_id | UUID | Agent who experienced |
| type | ENUM | CONVERSATION, TRANSACTION, etc. |
| description | TEXT | What happened |
| emotional_valence | DECIMAL | -1 to 1 |
| emotional_arousal | DECIMAL | 0 to 1 |
| significance | DECIMAL | 0 to 1 |
| consequences | JSONB | Outcomes |
| tags | TEXT[] | For retrieval |

**Partitioning**: 16 partitions by `HASH(agent_id)` for horizontal scaling.

#### **daily_summaries**
Consolidated daily memories with vector embeddings.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| agent_id | UUID | Agent |
| date | DATE | Summary date |
| narrative | TEXT | LLM-generated summary |
| highlights | JSONB | Structured highlights |
| emotional_journey | JSONB | Mood progression |
| lessons_learned | TEXT[] | Extracted insights |
| embedding | VECTOR(1536) | For semantic search |

#### **relationships**
Agent-to-agent relationship tracking.

| Column | Type | Description |
|--------|------|-------------|
| agent_id | UUID | First agent |
| other_agent_id | UUID | Second agent |
| type | ENUM | FRIEND, RIVAL, etc. |
| sentiment | SMALLINT | -100 to 100 |
| trust | SMALLINT | 0 to 100 |
| interaction_count | INTEGER | Total interactions |
| memorable_moments | UUID[] | Key experiences |

### Geography Tables

- **districts**: Major city districts (10 seeded)
- **zones**: Subdivisions of districts (~20 seeded)
- **locations**: Specific places agents can visit (~30 seeded)

### Interaction Tables

- **interactions**: Social interactions between agents
- **interaction_participants**: Many-to-many participants
- **messages**: Messages within interactions

### Economy Tables

- **transactions**: Economic transactions
- **events**: Environmental and random events
- **reputation_events**: Reputation change log

---

## 🛠️ Services

### AgentService

```typescript
import { agentService } from './services/agent.service';

// Create agent
const agent = await agentService.create({
  ownerId: userId,
  name: 'Agent Name',
  personality: {
    openness: 75,
    extraversion: 60,
  },
});

// Get agent (with caching)
const agent = await agentService.getById(agentId);

// Update location
await agentService.updateLocation(agentId, locationId);

// Transfer currency
await agentService.transferCurrency('agent1', 'agent2', 100, 'DARKCOIN');

// Get agents in zone (cached)
const agents = await agentService.getAgentsInZone(zoneId);
```

### MemoryService

```typescript
import { memoryService } from './services/memory.service';

// Record experience
const experience = await memoryService.recordExperience({
  agentId,
  type: 'CONVERSATION',
  description: 'Had an interesting conversation about art',
  significance: 0.8,
  emotionalValence: 0.5,
  tags: ['art', 'conversation'],
});

// Get recent experiences
const recent = await memoryService.getRecentExperiences(agentId, 24);

// Get relationship context
const context = await memoryService.getRelationshipContext(agent1, agent2);

// Consolidate day
const summary = await memoryService.consolidateDay(agentId, new Date());

// Update relationship
await memoryService.updateRelationship(agent1, agent2, {
  sentimentDelta: 10,
  trustDelta: 5,
  memorableMoment: experienceId,
});
```

### CacheService

```typescript
import { cache } from './config/redis.config';

// Get or set with TTL
const data = await cache.getOrSet(
  'cache:key',
  async () => fetchFromDB(),
  300 // 5 minutes TTL
);

// Set membership (for zone occupancy)
await cache.addToSet('zone:123:agents', 'agent-id-1', 'agent-id-2');
const agents = await cache.getSetMembers('zone:123:agents');

// Sorted set (for event scheduling)
await cache.addToSortedSet('events', Date.now() + 3600, eventId);
```

### PubSubService

```typescript
import { pubsub } from './config/redis.config';

// Publish event
await pubsub.publish('zone:downtown', {
  type: 'AGENT_ENTERED',
  agentId,
  locationId,
});

// Subscribe to events
await pubsub.subscribe('zone:downtown', async (message) => {
  console.log('Event received:', message);
});

// Pattern subscription
await pubsub.subscribePattern('zone:*', async (channel, message) => {
  console.log(`Event on ${channel}:`, message);
});
```

---

## 🔄 Migrations

### Creating a Migration

1. **Modify schema**:
   Edit `schema.prisma` with your changes.

2. **Generate migration**:
   ```bash
   npx prisma migrate dev --name add_new_table
   ```

3. **Review migration SQL**:
   Check `migrations/XXXXXX_add_new_table/migration.sql`

4. **Apply to production**:
   ```bash
   npm run db:migrate:prod
   ```

### Migration Best Practices

- **Never modify existing migrations** after they're applied
- **Always test migrations** on a copy of production data
- **Create indexes concurrently** in production to avoid locking:
  ```sql
  CREATE INDEX CONCURRENTLY idx_name ON table(column);
  ```
- **Use transactions** for complex migrations
- **Add backward-compatible changes** first, remove old code later

---

## 🌱 Seeding

The seed script creates:

- **10 Districts** with unique characteristics
  - Downtown (corporate & commercial)
  - Industrial Zone (factories & docks)
  - Residential Heights (apartments & parks)
  - Arts District (galleries & clubs)
  - Tech Hub (startups & innovation)
  - Financial District (banks & exclusive clubs)
  - Midtown (middle class, mixed use)
  - Westside (cultural enclaves)
  - Entertainment Mile (casinos & vice)
  - Underground (abandoned tunnels, lawless)

- **~20 Zones** across districts
- **~30 Locations** (cafes, bars, parks, offices, etc.)
- **Sample events** (weather, festivals, outages)

### Running Seed

```bash
# Seed all data
npm run db:seed

# Reset and re-seed
npm run db:reset  # WARNING: Deletes all data!
```

### Custom Seed Data

Create additional seed files in `seeds/`:

```typescript
// seeds/002_sample_agents.ts
import { prisma } from '../config/database.config';

async function seedSampleAgents() {
  // Create test agents
  const user = await prisma.user.create({
    data: { email: 'test@darkcity.io' },
  });
  
  await prisma.agent.create({
    data: {
      ownerId: user.id,
      name: 'Test Agent',
      // ... other fields
    },
  });
}
```

---

## ⚡ Performance

### Indexing Strategy

```sql
-- Agent queries
CREATE INDEX idx_agents_location ON agents(current_location_id) 
  WHERE status != 'OFFLINE';
CREATE INDEX idx_agents_owner ON agents(owner_id);

-- Experience queries (partitioned)
CREATE INDEX idx_experiences_agent_time ON experiences(agent_id, timestamp DESC);
CREATE INDEX idx_experiences_significance ON experiences(agent_id, significance DESC) 
  WHERE significance > 0.5;

-- Full-text search
CREATE INDEX idx_experiences_tags ON experiences USING GIN(tags);

-- Vector similarity
CREATE INDEX idx_daily_summaries_embedding ON daily_summaries 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### Query Optimization

1. **Use read replicas** for heavy read operations:
   ```typescript
   import { DatabasePool } from './config/database.config';
   
   // Read from replica
   const agents = await DatabasePool.queryReplica(
     'SELECT * FROM agents WHERE status = $1',
     ['ONLINE']
   );
   ```

2. **Batch operations**:
   ```typescript
   // Bad: N+1 query
   for (const agentId of agentIds) {
     await agentService.getById(agentId);
   }
   
   // Good: Single query
   await prisma.agent.findMany({
     where: { id: { in: agentIds } },
   });
   ```

3. **Use caching aggressively**:
   ```typescript
   const cacheKey = `agent:${agentId}`;
   const cached = await cache.get(cacheKey);
   if (cached) return cached;
   
   const agent = await prisma.agent.findUnique({ where: { id: agentId } });
   await cache.set(cacheKey, agent, 300);
   return agent;
   ```

### Monitoring

```typescript
// Log slow queries
if (queryTime > 1000) {
  console.warn(`Slow query (${queryTime}ms):`, query);
}

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbHealth = await DatabasePool.healthCheck();
  const redisHealth = await RedisManager.healthCheck();
  
  res.json({
    status: dbHealth.primary && redisHealth ? 'healthy' : 'degraded',
    database: dbHealth,
    redis: redisHealth,
  });
});
```

---

## 🧪 Development

### Running Tests

```bash
npm test
```

### Database Studio

```bash
npm run db:studio
```

Opens Prisma Studio at `http://localhost:5555` for visual database management.

### Linting & Formatting

```bash
npm run lint
npm run format
```

### TypeScript Type Generation

After schema changes:

```bash
npm run db:generate
```

---

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/docs/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)

---

## 🤝 Contributing

1. Create feature branch from `main`
2. Make changes
3. Run tests and linting
4. Create pull request

---

## 📄 License

Proprietary - DARKCITY Project

---

**Built with ❤️ for autonomous agent infrastructure**
