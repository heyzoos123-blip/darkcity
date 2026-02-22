# DARKCITY Integration Plan

**Mission**: Unify 6 independent components into a single, production-ready application.

## Current Components

1. **database/** - PostgreSQL schemas, Prisma ORM, Redis cache
2. **event-engine/** - Random encounters, zone events, event distribution
3. **memory/** - 4-layer memory system with LLM consolidation
4. **interactions/** - Agent conversations, transactions, reputation
5. **frontend/** - Next.js city view UI
6. **map-interface/** - Leaflet tracking map

## Integration Strategy

### Phase 1: Unified Frontend (Merged Next.js App)
- Merge `map-interface/` into `frontend/`
- Routes: `/` (city view), `/map` (tracking), `/agents` (management)
- Shared components, types, and utilities
- Single package.json with all dependencies

### Phase 2: Unified Backend (Single Node.js Server)
- Combine all backend services into one Express/tRPC server
- Integrate database, event-engine, memory, and interactions
- Single WebSocket server for all real-time features
- Shared type system across frontend and backend

### Phase 3: Infrastructure (Docker Compose)
- PostgreSQL container (with pgvector extension)
- Redis container
- Qdrant container (vector DB for memory)
- Backend service container
- Frontend service container (or static build served by backend)
- Single `docker-compose up` starts everything

### Phase 4: Shared Types & Contracts
- Common TypeScript types in `/shared/types`
- API contracts (tRPC or REST schemas)
- WebSocket event definitions
- Database models exported from Prisma

### Phase 5: Integration Testing
- End-to-end test: Agent lifecycle
  - Create agent → Spawn in city → Have conversation → Memory stored → Shown on map
- Component integration tests
- Performance benchmarks

### Phase 6: Deployment Package
- Production build scripts
- Environment configuration templates
- Deployment guide
- Optional: Kubernetes manifests

## File Structure (Proposed)

```
projects/darkcity/
├── apps/
│   ├── backend/              # Unified backend service
│   │   ├── src/
│   │   │   ├── api/          # REST/tRPC routes
│   │   │   ├── services/     # Database, events, memory, interactions
│   │   │   ├── websocket/    # Single WebSocket server
│   │   │   └── index.ts      # Main entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/             # Unified Next.js app
│       ├── app/
│       │   ├── page.tsx           # City view
│       │   ├── map/page.tsx       # Tracking map
│       │   ├── agents/page.tsx    # Agent management
│       │   └── layout.tsx
│       ├── components/
│       │   ├── city/         # City view components
│       │   ├── map/          # Map components (from map-interface)
│       │   ├── agents/       # Agent management components
│       │   └── shared/       # Shared UI components
│       ├── lib/
│       │   ├── api.ts        # API client
│       │   ├── socket.ts     # WebSocket client
│       │   └── store.ts      # Global state
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── shared/               # Shared types and utilities
│   │   ├── types/
│   │   │   ├── agent.ts
│   │   │   ├── event.ts
│   │   │   ├── memory.ts
│   │   │   ├── interaction.ts
│   │   │   └── index.ts
│   │   ├── utils/
│   │   └── package.json
│   │
│   └── database/             # Database schemas and migrations
│       ├── prisma/
│       ├── migrations/
│       ├── seeds/
│       └── package.json
│
├── infrastructure/
│   ├── docker-compose.yml    # Development environment
│   ├── docker-compose.prod.yml
│   ├── postgres/
│   │   └── init.sql
│   └── nginx/
│       └── default.conf
│
├── scripts/
│   ├── setup.sh              # One-command setup
│   ├── build.sh              # Production build
│   ├── deploy.sh
│   └── test.sh
│
├── .env.example
├── package.json              # Root package.json (monorepo)
├── turbo.json                # Turborepo config (optional)
├── README.md
└── DEPLOYMENT.md
```

## Implementation Steps

### Step 1: Create Monorepo Structure
- [x] Create `apps/backend` directory
- [ ] Create `apps/frontend` directory
- [ ] Create `packages/shared` directory
- [ ] Create `packages/database` directory
- [ ] Set up root package.json with workspaces

### Step 2: Migrate Backend Services
- [ ] Copy database services to `apps/backend/src/services/database`
- [ ] Copy event-engine to `apps/backend/src/services/events`
- [ ] Copy memory system to `apps/backend/src/services/memory`
- [ ] Copy interactions to `apps/backend/src/services/interactions`
- [ ] Create unified API layer (tRPC recommended)
- [ ] Create single WebSocket server

### Step 3: Merge Frontends
- [ ] Copy main frontend to `apps/frontend`
- [ ] Integrate map-interface components into `apps/frontend/components/map`
- [ ] Add route `/map` using map components
- [ ] Update navigation to include map link
- [ ] Consolidate dependencies

### Step 4: Shared Types & Database
- [ ] Extract Prisma schema to `packages/database`
- [ ] Create shared types in `packages/shared/types`
- [ ] Export types from database models
- [ ] Create API contract types
- [ ] WebSocket event types

### Step 5: Docker Infrastructure
- [ ] Create main docker-compose.yml
- [ ] PostgreSQL service (with pgvector)
- [ ] Redis service
- [ ] Qdrant service
- [ ] Backend service
- [ ] Frontend service (or serve static build from backend)
- [ ] Nginx reverse proxy

### Step 6: Environment Configuration
- [ ] Create .env.example with all variables
- [ ] Backend env vars
- [ ] Frontend env vars
- [ ] Database credentials
- [ ] Redis config
- [ ] LLM API keys
- [ ] Solana wallet config

### Step 7: Integration Tests
- [ ] Set up Jest/Vitest
- [ ] Agent lifecycle test
- [ ] WebSocket connection test
- [ ] Database integration test
- [ ] Memory persistence test
- [ ] Event distribution test

### Step 8: Build & Deploy Scripts
- [ ] `scripts/setup.sh` - Install all dependencies
- [ ] `scripts/dev.sh` - Start development environment
- [ ] `scripts/build.sh` - Production build
- [ ] `scripts/test.sh` - Run all tests
- [ ] `scripts/deploy.sh` - Deploy to production

## Success Criteria

An agent can:
1. ✅ Be created via API
2. ✅ Spawn in the city (The Nexus)
3. ✅ Appear on the map in real-time
4. ✅ Have a conversation with another agent
5. ✅ Store memories of the interaction
6. ✅ Update stats visible in the frontend
7. ✅ All components communicate seamlessly

## Timeline

- **Phase 1-2**: 2-3 hours (Backend & Frontend merge)
- **Phase 3**: 1 hour (Docker setup)
- **Phase 4**: 1 hour (Types & contracts)
- **Phase 5**: 1-2 hours (Testing)
- **Phase 6**: 30 mins (Scripts & docs)

**Total**: ~6-8 hours for complete integration

---

**Next**: Begin Phase 1 - Create unified structure
