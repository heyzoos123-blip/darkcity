# DARKCITY Production Deployment Plan

**Target**: darkcity.wtf  
**Date**: 2026-02-22  
**Status**: Planning Phase  

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        darkcity.wtf                              │
│                    (Netlify - Frontend)                          │
│                     Next.js Application                          │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  │ HTTPS/WSS
                  │
┌─────────────────▼───────────────────────────────────────────────┐
│                  api.darkcity.wtf (or subdomain)                 │
│                    (Railway/Render/Fly.io)                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Node.js Backend Server                       │  │
│  │  - Express REST API                                       │  │
│  │  - Socket.IO WebSocket Server                             │  │
│  │  - Services: Database, Events, Memory, Interactions       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │    Redis     │  │   Qdrant     │          │
│  │  (Primary DB)│  │   (Cache)    │  │ (Vector DB)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└───────────────────────────────────────────────────────────────────┘
```

---

## Hosting Platform Comparison

### Option 1: Railway ⭐ RECOMMENDED
**Pros**:
- PostgreSQL, Redis, Qdrant all available
- Easy deployment from GitHub
- Good free tier ($5 credit/month)
- WebSocket support confirmed
- Environment variables per service
- Built-in monitoring

**Cons**:
- Smaller community than Render
- Pricing can scale up

**Estimated Cost**: $15-25/month for production

### Option 2: Render
**Pros**:
- PostgreSQL included
- Redis available
- Strong free tier
- Good documentation
- WebSocket support

**Cons**:
- Qdrant would need separate hosting
- Free tier sleeps after inactivity

**Estimated Cost**: $20-30/month

### Option 3: Fly.io
**Pros**:
- Global edge deployment
- Excellent performance
- PostgreSQL available

**Cons**:
- More complex setup
- Redis/Qdrant separate
- Steeper learning curve

**Estimated Cost**: $15-25/month

---

## Deployment Phases

### Phase 1: Backend Deployment (Railway) ✅ SELECTED

**Services to Deploy**:
1. **PostgreSQL Database**
   - Version: 15+
   - Extensions: pgvector
   - Storage: 10GB initial
   - Connection pooling: 20 connections

2. **Redis Instance**
   - Version: 7+
   - Memory: 256MB initial
   - Persistence: RDB snapshots
   - Max connections: 100

3. **Qdrant Vector Database**
   - Option A: Qdrant Cloud (managed)
   - Option B: Self-hosted on Railway
   - Collection: `agent_memories`
   - Vector size: 1536 (OpenAI embeddings)

4. **Node.js Backend**
   - Runtime: Node 18+
   - Build command: `npm run build`
   - Start command: `npm start`
   - Port: Dynamic (Railway assigns)

**Environment Variables** (Backend):
```env
# Node
NODE_ENV=production
PORT=$PORT (Railway auto-assigns)

# Database
DATABASE_URL=$POSTGRES_URL (Railway auto-assigns)

# Redis
REDIS_HOST=$REDIS_HOST (Railway auto-assigns)
REDIS_PORT=$REDIS_PORT
REDIS_PASSWORD=$REDIS_PASSWORD

# Qdrant
QDRANT_URL=<qdrant-cloud-url or railway-url>
QDRANT_API_KEY=<api-key>

# LLM
ANTHROPIC_API_KEY=<from main .env>
OPENAI_API_KEY=<from main .env>

# CORS
FRONTEND_URL=https://darkcity.wtf

# Solana (optional for MVP)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta
```

**Deployment Steps**:
1. Create Railway account
2. Create new project "darkcity-backend"
3. Add PostgreSQL service
4. Add Redis service
5. Add Qdrant service (or connect to Qdrant Cloud)
6. Add Node.js service from GitHub
7. Configure environment variables
8. Deploy and verify
9. Note the assigned URL (e.g., `darkcity-backend.up.railway.app`)

### Phase 2: Frontend Deployment (Netlify)

**Netlify Configuration**:
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = ".next"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

**Environment Variables** (Frontend):
```env
NEXT_PUBLIC_API_URL=https://darkcity-backend.up.railway.app
NEXT_PUBLIC_WS_URL=wss://darkcity-backend.up.railway.app
```

**Deployment Steps**:
1. Connect GitHub repo to Netlify
2. Set build command: `cd frontend && npm install && npm run build`
3. Set publish directory: `frontend/.next`
4. Add environment variables
5. Deploy
6. Configure custom domain darkcity.wtf
7. Enable HTTPS (automatic with Netlify)

### Phase 3: Domain Configuration

**DNS Settings** (at domain registrar):
```
darkcity.wtf
  → Netlify (A record or CNAME to Netlify)

api.darkcity.wtf (optional subdomain)
  → Railway backend (CNAME to Railway URL)
```

**Netlify Domain Setup**:
1. Add custom domain: darkcity.wtf
2. Verify DNS ownership
3. Enable HTTPS (automatic)
4. Force HTTPS redirect

**Backend URL**:
- Option A: Use Railway subdomain directly in frontend env
- Option B: Set up custom subdomain api.darkcity.wtf

---

## Integration Testing Checklist

### Backend Health Checks
- [ ] GET /health returns 200
- [ ] Database connection active
- [ ] Redis connection active
- [ ] Qdrant connection active (if using vector search)

### API Endpoint Tests
- [ ] POST /api/agents creates agent
- [ ] GET /api/agents lists agents
- [ ] GET /api/agents/:id returns agent
- [ ] POST /api/events creates event
- [ ] GET /api/events lists events
- [ ] POST /api/memory creates memory
- [ ] POST /api/interactions creates interaction

### WebSocket Tests
- [ ] Connection establishes over wss://
- [ ] Authentication works
- [ ] Subscribe to zones works
- [ ] Events broadcast correctly
- [ ] Agent movements broadcast
- [ ] Message events work

### Frontend Tests
- [ ] Site loads at darkcity.wtf
- [ ] Assets load correctly
- [ ] API calls work
- [ ] WebSocket connects
- [ ] Real-time updates work
- [ ] Agent creation flow works
- [ ] Map renders correctly

### Security Tests
- [ ] HTTPS enforced
- [ ] CORS only allows darkcity.wtf
- [ ] API keys not exposed
- [ ] Rate limiting works
- [ ] Input validation works

---

## Production Hardening

### Error Handling
```typescript
// Global error handler (backend)
app.use((err, req, res, next) => {
  console.error('[ERROR]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});
```

### Logging
- [ ] Setup: Winston or Pino for structured logging
- [ ] Log levels: error, warn, info, debug
- [ ] Log to Railway logs (built-in)
- [ ] Consider: Sentry for error tracking

### Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

### CORS Configuration
```typescript
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://darkcity.wtf'
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE']
}));
```

### Health Checks
```typescript
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    qdrant: await checkQdrant(),
    timestamp: new Date().toISOString()
  };
  
  const healthy = Object.values(checks).slice(0, 3).every(v => v === true);
  
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    ...checks
  });
});
```

---

## Rollback Procedure

### Database Rollback
```bash
# Rollback last migration
npx prisma migrate reset --skip-seed

# Restore from backup
psql $DATABASE_URL < backup-2026-02-22.sql
```

### Application Rollback
**Railway**:
1. Go to deployments tab
2. Click "Redeploy" on previous working deployment
3. Verify health check

**Netlify**:
1. Go to deploys tab
2. Find previous working deploy
3. Click "Publish deploy"

### DNS Rollback
- If custom domain issues, remove custom domain temporarily
- Use Railway/Netlify default URLs
- Update frontend env to point to old backend

---

## Post-Deployment Monitoring

### Metrics to Track
- [ ] API response times
- [ ] Error rates
- [ ] Database query performance
- [ ] WebSocket connection count
- [ ] Memory usage
- [ ] CPU usage

### Alerts to Configure
- [ ] 5xx error rate > 1%
- [ ] API response time > 2s
- [ ] Database connection pool exhausted
- [ ] Memory usage > 80%
- [ ] WebSocket disconnections spike

### Log Monitoring
- [ ] Check Railway logs daily
- [ ] Monitor error patterns
- [ ] Track slow queries
- [ ] Watch for security issues

---

## Cost Estimation

### Railway (Backend + Databases)
- Hobby Plan: $5/month
- PostgreSQL: ~$5/month
- Redis: ~$3/month
- Backend app: ~$5-10/month
- **Total**: ~$15-20/month

### Qdrant
- Cloud Free Tier: 1GB free
- Paid: $25/month for 2GB
- **Total**: $0 initially, $25 if needed

### Netlify (Frontend)
- Free tier sufficient for MVP
- Bandwidth: 100GB/month free
- **Total**: $0 initially

### Domain
- darkcity.wtf: ~$12/year (already owned?)

**Total Monthly Cost**: $15-45 depending on usage

---

## Success Criteria

✅ Backend deployed and accessible  
✅ Frontend deployed at darkcity.wtf  
✅ Database migrations applied  
✅ All API endpoints functional  
✅ WebSocket real-time updates working  
✅ HTTPS enabled  
✅ CORS configured  
✅ Rate limiting active  
✅ Error logging functional  
✅ Health checks passing  
✅ Agent creation flow working end-to-end  
✅ Documentation complete  

---

## Timeline

**Day 1** (Today):
- [x] Pre-deployment checklist
- [ ] Test local builds
- [ ] Create Railway account
- [ ] Deploy backend to Railway
- [ ] Verify backend health

**Day 2**:
- [ ] Deploy frontend to Netlify
- [ ] Configure environment variables
- [ ] Test integration
- [ ] Set up custom domain

**Day 3**:
- [ ] Full integration testing
- [ ] Performance optimization
- [ ] Documentation finalization
- [ ] Go live announcement

---

**Next Step**: Complete backend dependency installation and test local build.

🌃 **"We build with precision. Every connection matters."** ⚡
