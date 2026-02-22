# DARKCITY Property System - Architecture

## Overview

The DARKCITY Property System is a comprehensive real estate and land ownership backend for agent-based metaverse housing. It handles apartments, rent collection, evictions, land ownership, and custom structures.

## Technology Stack

- **Runtime**: Node.js 20+ with TypeScript
- **API Framework**: Express.js
- **Database**: PostgreSQL 14+ with JSONB support
- **Blockchain**: Solana (payment verification)
- **Scheduler**: node-cron
- **Validation**: Zod (optional, for request validation)

## System Components

### 1. Database Layer (`src/db/`)

**Files**:
- `schema.sql` - Complete PostgreSQL schema
- `index.ts` - Database connection pool
- `migrate.ts` - Migration runner

**Tables**:
```
buildings → properties → residencies → rent_payments
                              ↓
                         evictions

land_plots → structures
    ↓           ↓
    └─────┬─────┘
          ↓
    customizations
    spawn_points
```

**Key Design Decisions**:
- UUID primary keys for global uniqueness
- JSONB for flexible customization data
- Triggers for automatic `updated_at` timestamps
- Constraints for data integrity (one active residency per property)
- Indexes on frequently queried columns

### 2. Service Layer (`src/services/`)

**PropertyService** (`property-service.ts`)
- List/get properties
- Rent property (creates residency + first payment)
- Check storage usage
- Get tier configurations

**PaymentService** (`payment-service.ts`)
- Process rent payments
- Auto-debit attempts
- Payment history
- Solana transaction verification

**EvictionService** (`eviction-service.ts`)
- Automated eviction checks
- Manual eviction (admin)
- Grace period management
- Eviction history tracking

**LandService** (`land-service.ts`)
- List/purchase land plots
- Transfer ownership
- Build structures
- Demolish structures

**CustomizationService** (`customization-service.ts`)
- Add/remove customizations
- Manage spawn points
- Enforce slot limits per tier

**RentScheduler** (`rent-scheduler.ts`)
- Cron-based scheduled tasks
- Hourly overdue checks
- 6-hour auto-debit attempts
- Daily evictions
- Monthly reports

### 3. API Layer (`src/api/`)

**routes.ts** - RESTful API endpoints

Endpoint groups:
- `/api/properties/*` - Property management
- `/api/payments/*` - Payment processing
- `/api/land/*` - Land operations
- `/api/agents/*` - Agent-specific queries
- `/api/evictions/*` - Eviction management
- `/api/customizations/*` - Customization CRUD
- `/api/spawns/*` - Spawn point management

All responses follow format:
```json
{
  "success": true,
  "data": {...}
}
```

or

```json
{
  "success": false,
  "error": "Error message"
}
```

### 4. Type System (`src/types/`)

**Enums**:
- `PropertyTier` - STUDIO, ONE_BEDROOM, LUXURY, PENTHOUSE
- `PropertyStatus` - AVAILABLE, OCCUPIED, MAINTENANCE
- `ResidencyStatus` - ACTIVE, EVICTED, VACATED
- `PaymentStatus` - PENDING, PAID, FAILED, LATE

**Interfaces**:
- All database models typed
- `PROPERTY_TIERS` constant with tier configurations

### 5. Utilities (`src/utils/`)

**solana-helper.ts**
- Transaction verification
- SOL ↔ lamports conversion
- Address validation
- Balance checking

## Data Flow

### Rent a Property Flow

```
1. Client → POST /api/properties/:id/rent
2. PropertyService.rentProperty()
   ├─ Begin transaction
   ├─ Lock property (FOR UPDATE)
   ├─ Create residency record
   ├─ Create first payment (due in 1 month)
   ├─ Update property status to OCCUPIED
   └─ Commit transaction
3. Return residency + payment details
```

### Payment Flow

```
1. Client creates Solana transaction
2. Client → POST /api/payments/:id/process
3. PaymentService.processPayment()
   ├─ Verify transaction on Solana
   ├─ Update payment status to PAID
   ├─ Update residency next_payment_due
   └─ Create next month's payment record
4. Return success
```

### Eviction Flow

```
Scheduler (daily 6am):
1. EvictionService.checkEvictions()
2. Query overdue payments past grace period
3. For each overdue residency:
   ├─ Begin transaction
   ├─ Update residency status to EVICTED
   ├─ Update property status to AVAILABLE
   ├─ Log eviction record
   ├─ Delete customizations
   ├─ Delete custom spawn points
   └─ Commit transaction
4. Log eviction event
```

### Land Purchase Flow

```
1. Client sends SOL to treasury
2. Client → POST /api/land/:id/purchase
3. LandService.purchasePlot()
   ├─ Lock plot (FOR UPDATE)
   ├─ Verify plot is available
   ├─ Update owner_address
   ├─ Log ownership_transfer
   └─ Commit transaction
4. Return updated plot
```

## Scalability Considerations

### Database

**Current Design** (single PostgreSQL):
- Connection pooling (max 20)
- Optimized indexes
- Query timeout: 2s

**Scaling Path**:
1. **Read Replicas** - Separate read traffic for reporting
2. **Partitioning** - Partition large tables by time
   - `rent_payments` by due_date (monthly partitions)
   - `evictions` by evicted_at (yearly partitions)
3. **Caching** - Redis for:
   - Property listings
   - Tier configurations
   - Agent property lookups
4. **Database Sharding** - By building_id or region

### API

**Current Design** (single Express instance):
- Stateless API
- All data in PostgreSQL
- No session state

**Scaling Path**:
1. **Horizontal Scaling** - Multiple API instances behind load balancer
2. **Rate Limiting** - Redis-based rate limiting
3. **Caching** - Redis for frequent queries
4. **CDN** - Cache static responses

### Scheduler

**Current Design** (single cron process):
- All tasks in one process
- Sequential processing

**Scaling Path**:
1. **Distributed Scheduler** - Bull/BullMQ with Redis
2. **Worker Pool** - Multiple workers for parallel processing
3. **Queue-based** - Separate queues per task type
4. **Idempotency** - Ensure tasks can retry safely

## Security

### Current Implementation

- ✅ SQL injection protection (parameterized queries)
- ✅ Transaction integrity (database transactions)
- ✅ Input validation (TypeScript types)
- ✅ Environment variables for secrets

### Production Requirements

- ⚠️ **Authentication** - Add JWT or signature-based auth
- ⚠️ **Authorization** - Verify agent owns property before modifications
- ⚠️ **Rate Limiting** - Prevent DoS attacks
- ⚠️ **HTTPS** - TLS/SSL in production
- ⚠️ **API Keys** - For admin endpoints
- ⚠️ **Audit Logs** - Track all sensitive operations
- ⚠️ **Input Sanitization** - Validate all request bodies

### Solana Integration Security

- Transaction verification before payment processing
- Treasury wallet should use multi-sig
- Consider escrow for land transfers
- Verify payment amounts match expected rent

## Monitoring & Observability

### Metrics to Track

**Application**:
- Request rate (req/s)
- Response time (p50, p95, p99)
- Error rate (%)
- Active residencies
- Payment success rate
- Eviction count

**Database**:
- Connection pool utilization
- Query execution time
- Lock wait time
- Table sizes
- Index usage

**Scheduler**:
- Task execution time
- Task failure rate
- Payment collection rate
- Eviction processing time

### Logging

**Current**: Console logging

**Production**:
- Structured JSON logs
- Log aggregation (ELK, Datadog, etc.)
- Log levels (DEBUG, INFO, WARN, ERROR)
- Correlation IDs for request tracking

### Alerts

Set up alerts for:
- High error rate (>1%)
- Slow queries (>500ms)
- Failed payments (>10%)
- Database connection pool exhaustion
- Scheduler failures

## Testing Strategy

### Unit Tests
- Service layer logic
- Payment calculations
- Tier configuration validation
- Date calculations

### Integration Tests
- API endpoints
- Database transactions
- Solana interaction
- Scheduler tasks

### E2E Tests
- Complete rent flow
- Payment processing
- Eviction process
- Land purchase

### Load Tests
- Concurrent rentals
- Payment processing throughput
- Database connection limits

## Deployment Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   Nginx     │ (Load Balancer, HTTPS)
└──────┬──────┘
       │
       ├──────────────┬──────────────┐
       ↓              ↓              ↓
┌───────────┐  ┌───────────┐  ┌───────────┐
│  API #1   │  │  API #2   │  │  API #3   │
└─────┬─────┘  └─────┬─────┘  └─────┬─────┘
      │              │              │
      └──────────────┼──────────────┘
                     ↓
              ┌─────────────┐
              │ PostgreSQL  │ (Primary)
              └──────┬──────┘
                     │
              ┌──────┴──────┐
              ↓             ↓
       ┌───────────┐ ┌───────────┐
       │ Replica 1 │ │ Replica 2 │ (Read-only)
       └───────────┘ └───────────┘

┌─────────────┐
│  Scheduler  │ (Separate process)
└──────┬──────┘
       │
       ↓ (writes)
┌─────────────┐
│ PostgreSQL  │
└─────────────┘

┌─────────────┐
│   Solana    │ (External RPC)
│   Network   │
└─────────────┘
```

## Future Enhancements

### Phase 2
- WebSocket support for real-time events
- NFT integration for property ownership
- Rental marketplace (sublet apartments)
- Property upgrades/downgrades

### Phase 3
- Mortgage system (pay over time)
- Property trading (buy/sell apartments)
- Tenant reviews/ratings
- Community governance (DAO for building rules)

### Phase 4
- Cross-building amenities
- Property management automation
- Insurance system
- Property income generation (passive)

## Development Workflow

1. **Local Development**
   ```bash
   npm run dev  # Hot reload
   ```

2. **Testing**
   ```bash
   npm test
   ```

3. **Build**
   ```bash
   npm run build
   ```

4. **Deploy**
   ```bash
   docker-compose up -d
   # or
   pm2 start ecosystem.config.js
   ```

## Code Organization

```
projects/darkcity/property/
├── src/
│   ├── api/            # API routes
│   ├── db/             # Database layer
│   ├── services/       # Business logic
│   ├── types/          # TypeScript types
│   ├── utils/          # Helpers
│   └── index.ts        # App entry point
├── scripts/            # Utility scripts
├── dist/               # Compiled JS (gitignored)
├── ARCHITECTURE.md     # This file
├── README.md           # User guide
├── DEPLOYMENT.md       # Ops guide
├── API_EXAMPLES.md     # API usage
└── package.json
```

## Contributing

When adding features:
1. Add types to `src/types/`
2. Add database schema to `src/db/schema.sql`
3. Create service in `src/services/`
4. Add API routes to `src/api/routes.ts`
5. Update README.md and API_EXAMPLES.md
6. Add tests

## License

Part of DARKCITY metaverse project.
