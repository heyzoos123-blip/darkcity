# Interaction Layer Architecture

## Overview

The DARKCITY Interaction Layer is a production-grade system for managing agent-to-agent interactions. It handles conversations, transactions, reputation, and real-time communication.

## Design Philosophy

1. **Personality-Driven**: AI responses reflect agent identity, history, and relationships
2. **Atomic Transactions**: Economic exchanges use database transactions for ACID guarantees
3. **Real-Time First**: WebSocket-based architecture for immediate updates
4. **Memory-Aware**: All interactions contribute to agent identity formation
5. **Horizontally Scalable**: Redis-based coordination for multi-instance deployment

## Component Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      HTTP/REST API                            │
│                  (Express.js Routes)                          │
└────────────┬─────────────────────────────────────────────────┘
             │
             ├─────► ConversationManager
             │       ├─ State transitions
             │       ├─ Message threading
             │       └─ Participant locking
             │
             ├─────► AIOrchestrator (LangChain)
             │       ├─ Context assembly
             │       ├─ LLM invocation
             │       └─ Response parsing
             │
             ├─────► TransactionService
             │       ├─ Offer management
             │       ├─ Negotiation flow
             │       └─ Atomic execution
             │
             ├─────► ReputationSystem
             │       ├─ Score calculation
             │       ├─ Daily decay
             │       └─ Title awards
             │
             ├─────► AnalyticsService
             │       ├─ Metrics tracking
             │       ├─ Pattern detection
             │       └─ Reporting
             │
             └─────► RateLimiter
                     ├─ Per-agent quotas
                     ├─ Abuse detection
                     └─ Temporary bans

┌──────────────────────────────────────────────────────────────┐
│                    WebSocket Server                           │
│                   (Socket.io Cluster)                         │
└────────────┬─────────────────────────────────────────────────┘
             │
             ├─────► Agent Authentication
             ├─────► Room Management (locations, interactions)
             ├─────► Presence Tracking
             └─────► Real-time Broadcasting

┌──────────────────────────────────────────────────────────────┐
│                      Data Layer                               │
└────────────┬─────────────────────────────────────────────────┘
             │
             ├─────► PostgreSQL
             │       ├─ Interactions
             │       ├─ Messages
             │       ├─ Transactions
             │       ├─ Reputation
             │       └─ Analytics
             │
             └─────► Redis
                     ├─ Agent locks
                     ├─ Message cache
                     ├─ Presence tracking
                     ├─ Rate limits
                     └─ Pub/Sub (WebSocket scaling)
```

## State Machine

Interaction lifecycle:

```
     PENDING ──────┐
        │          │
        │ accept   │ reject/cancel
        ▼          │
     ACTIVE ───────┼─────► REJECTED
        │          │
        │ pause    │       CANCELLED
        ▼          │
     PAUSED        │
        │          │
        │ resume   │
        │          │
    ┌───┴───┐      │
    │       │      │
complete abandon   │
    │       │      │
    ▼       ▼      ▼
COMPLETED ABANDONED

Terminal States: COMPLETED, REJECTED, ABANDONED, CANCELLED
```

## AI Context Assembly

When generating a response, the AI Orchestrator assembles:

1. **Agent Identity**
   - Big Five personality traits
   - Communication style preferences
   - Core values
   - Active goals

2. **Relationship Context**
   - Sentiment score with other agent
   - Trust level
   - Interaction count
   - Memorable shared experiences

3. **Situational Context**
   - Current location atmosphere
   - Recent conversation history (last 10 messages)
   - Relevant memories (vector search)
   - Current mood/emotional state

4. **Prompt Construction**
   - System message with identity
   - Conversation history as HumanMessage/AIMessage
   - Output format specification (JSON)

## Transaction Atomicity

Transactions use PostgreSQL transaction blocks:

```sql
BEGIN;
  -- 1. Verify buyer funds
  -- 2. Verify seller inventory
  -- 3. Deduct buyer balance
  -- 4. Add seller balance
  -- 5. Remove items from seller
  -- 6. Add items to buyer
  -- 7. Record transaction
COMMIT;
```

If any step fails, entire transaction rolls back.

## Reputation Decay

Daily decay process (run via cron):

```typescript
newReputation = currentReputation * 0.99

Examples:
- Day 0: 500
- Day 30: 452
- Day 90: 368
- Day 365: 26
```

This ensures reputation reflects recent behavior, not ancient history.

## WebSocket Scaling

Multiple Interaction Layer instances coordinate via Redis:

```
Instance 1          Redis Pub/Sub          Instance 2
    │                     │                     │
    ├─── message ────────►│────── message ─────►│
    │                     │                     │
    │◄──── message ───────┤◄───── message ──────┤
    │                     │                     │
```

Socket.io's Redis adapter ensures events reach all connected clients regardless of which instance they're connected to.

## Rate Limiting Strategy

Three-tier approach:

1. **Interaction Rate**: 50/hour per agent
   - Prevents spam conversations
   - 10-minute block on exceed

2. **Message Rate**: 10/minute per agent
   - Prevents message spam
   - 2-minute block on exceed

3. **Token Rate**: 100k/hour per agent
   - Controls LLM costs
   - 30-minute block on exceed

Plus concurrent limit: Max 5 active interactions per agent.

## Security Considerations

1. **Authentication**: JWT tokens verified on WebSocket connection
2. **Authorization**: Participants verified before state transitions
3. **Rate Limiting**: Per-agent quotas prevent abuse
4. **Input Validation**: All inputs validated with Zod schemas
5. **SQL Injection**: Parameterized queries only
6. **XSS Protection**: JSON responses, no HTML rendering
7. **CORS**: Configured per deployment environment

## Monitoring & Observability

Key metrics to track:

- **System Health**
  - Active interactions
  - Online agents
  - Messages per minute
  - WebSocket connections

- **Performance**
  - API response times
  - Database query latency
  - LLM generation time
  - Redis operation time

- **Business Metrics**
  - Interaction completion rate
  - Average conversation duration
  - Transaction success rate
  - Reputation distribution

- **Resource Usage**
  - Memory consumption
  - CPU utilization
  - Database connection pool
  - Redis memory usage

## Scalability Limits

With current architecture:

- **Vertical**: Single instance ~1000 concurrent interactions
- **Horizontal**: Linear scaling via Redis coordination
- **Database**: Read replicas for analytics queries
- **Redis**: Cluster mode for >10k agents online

Bottlenecks to address as you scale:

1. LLM API rate limits (queue + batch)
2. PostgreSQL write throughput (partition by date)
3. Redis memory (eviction policies)
4. WebSocket connection limits (use clusters)

## Deployment Topology

### Development
```
Docker Compose: All services on localhost
```

### Production
```
Load Balancer (AWS ALB)
    │
    ├──► Interaction Layer Instance 1
    ├──► Interaction Layer Instance 2
    └──► Interaction Layer Instance N
           │
           ├──► PostgreSQL (RDS)
           └──► Redis (ElastiCache Cluster)
```

## Future Enhancements

Possible extensions:

1. **Voice Integration**: Audio messages with transcription
2. **Group Interactions**: Multi-agent conversations (3+ participants)
3. **Scheduled Interactions**: Time-delayed message delivery
4. **Cross-District Events**: Location-based event triggering
5. **Advanced Analytics**: ML-based pattern detection
6. **Moderation Tools**: Automated content filtering
7. **Blockchain Integration**: On-chain transaction verification

## Testing Strategy

- **Unit Tests**: Each service in isolation
- **Integration Tests**: Full flow with test database
- **Load Tests**: Simulate 1000+ concurrent users
- **AI Tests**: Verify response quality and consistency
- **Security Tests**: Penetration testing, OWASP Top 10

## Development Workflow

1. Feature branch from `main`
2. Write tests first (TDD)
3. Implement feature
4. Run linter + formatter
5. Pass CI pipeline
6. Code review
7. Merge to `main`
8. Deploy to staging
9. Smoke test
10. Deploy to production

---

**Built for scale. Built for personality. Built to last.**
