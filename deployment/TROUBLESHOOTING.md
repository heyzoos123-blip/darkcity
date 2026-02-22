# DARKCITY Troubleshooting Guide

**Purpose**: Diagnose and fix common issues in production  
**Last Updated**: 2026-02-22  

---

## Quick Diagnostics

### Is the site down?

1. Check frontend: https://darkcity.wtf
2. Check backend health: `https://your-backend-url/health`
3. Check service status:
   - Railway: https://railway.app/dashboard
   - Netlify: https://app.netlify.com
   - Qdrant Cloud: https://cloud.qdrant.io

---

## Frontend Issues (Netlify)

### Issue: Site won't load / 404 Error

**Symptoms**: darkcity.wtf returns 404 or blank page

**Diagnosis**:
1. Check Netlify deploy status
2. Check DNS configuration
3. Check browser console for errors

**Solutions**:
```bash
# Check DNS propagation
nslookup darkcity.wtf

# Check Netlify deployment
netlify status

# View recent deploys
netlify open --admin
```

**Fix**:
1. Go to Netlify → Deploys
2. Check if latest deploy succeeded
3. If failed, check build logs for errors
4. If successful but site not showing, check DNS settings
5. Try clearing cache and redeploying

---

### Issue: API Connection Failed

**Symptoms**: "Failed to fetch" errors in console

**Diagnosis**:
1. Open browser DevTools → Console
2. Look for errors like:
   ```
   Failed to fetch: https://backend-url/api/...
   CORS policy: No 'Access-Control-Allow-Origin' header
   ```

**Solutions**:

**A. Check backend is running**:
```bash
curl https://your-backend-url/health
```

**B. Verify environment variables**:
1. Netlify → Site settings → Environment variables
2. Confirm `NEXT_PUBLIC_API_URL` is correct
3. Should NOT have trailing slash

**C. Check CORS on backend**:
1. Railway → Backend service → Environment variables
2. Verify `FRONTEND_URL=https://darkcity.wtf`
3. Redeploy backend if changed

**D. Temporary fix** (for testing):
1. Temporarily allow all origins in backend:
   ```typescript
   app.use(cors({ origin: '*' }));
   ```
2. Deploy and test
3. Revert to specific origin once confirmed working

---

### Issue: WebSocket Won't Connect

**Symptoms**: "WebSocket connection failed" in console

**Diagnosis**:
1. Open DevTools → Console
2. Look for:
   ```
   WebSocket connection to 'wss://...' failed
   ```

**Solutions**:

**A. Check WebSocket URL**:
1. Netlify → Environment variables
2. Verify `NEXT_PUBLIC_WS_URL` uses `wss://` not `http://`
3. Ensure URL matches backend URL

**B. Check backend WebSocket server**:
1. Railway → Backend logs
2. Look for "WebSocket server initialized"
3. If missing, backend may have crashed

**C. Check Railway WebSocket support**:
- Railway supports WebSockets by default
- No special configuration needed
- May need to enable in older projects

**D. Test WebSocket directly**:
```javascript
// In browser console
const ws = new WebSocket('wss://your-backend-url');
ws.onopen = () => console.log('Connected!');
ws.onerror = (err) => console.error('Error:', err);
```

---

### Issue: Page Loads Slowly

**Diagnosis**:
1. Open DevTools → Network tab
2. Check "Disable cache"
3. Reload page
4. Look for slow requests (>3s)

**Solutions**:

**A. Enable Netlify image optimization**:
```toml
# netlify.toml
[build.processing]
  [build.processing.images]
    compress = true
```

**B. Lazy load components**:
```typescript
// Use Next.js dynamic imports
const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <LoadingSpinner />
});
```

**C. Check API response times**:
- Go to Railway → Metrics
- Check backend response times
- Optimize slow database queries

---

## Backend Issues (Railway)

### Issue: Backend Not Responding / 503 Error

**Symptoms**: Health check fails, API returns 503

**Diagnosis**:
1. Railway → Backend service → Deployments
2. Check latest deployment status
3. View logs for errors

**Solutions**:

**A. Check if backend crashed**:
1. View Railway logs
2. Look for:
   ```
   Error: ...
   Process exited with code 1
   ```
3. Find the error message

**B. Common crash causes**:

**Database connection failed**:
```
Error: Can't reach database server at ...
```
Fix:
1. Check DATABASE_URL is correct
2. Verify PostgreSQL service is running
3. Check PostgreSQL logs

**Redis connection failed**:
```
Error: Redis connection refused
```
Fix:
1. Check REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
2. Verify Redis service is running

**Out of memory**:
```
<--- Last few GCs --->
FATAL ERROR: Reached heap limit
```
Fix:
1. Railway → Backend service → Settings
2. Increase memory limit
3. Or optimize memory usage in code

**C. Restart backend**:
1. Railway → Backend service
2. Settings → Restart
3. Or trigger new deploy

---

### Issue: Database Connection Errors

**Symptoms**: "Can't reach database", "Connection pool exhausted"

**Diagnosis**:
```bash
# Test database connection
railway run psql $DATABASE_URL
```

**Solutions**:

**A. Connection pool exhausted**:
```typescript
// Increase pool size in Prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  pool_timeout = 30
  connection_limit = 20
}
```

**B. Database not running**:
1. Railway → PostgreSQL service
2. Check status
3. Check logs for errors
4. Restart if needed

**C. Wrong DATABASE_URL**:
1. Railway → PostgreSQL service → Variables
2. Copy DATABASE_URL
3. Railway → Backend service → Variables
4. Verify DATABASE_URL matches

---

### Issue: Prisma Migration Failed

**Symptoms**: "Migration X failed to apply"

**Diagnosis**:
1. Check Railway backend logs
2. Look for migration error messages

**Solutions**:

**A. Migration conflict**:
```bash
# Reset migrations (DESTRUCTIVE - dev only!)
railway run npx prisma migrate reset

# Or apply migrations manually
railway run npx prisma migrate deploy
```

**B. Schema out of sync**:
```bash
# Generate Prisma client
railway run npx prisma generate

# Apply pending migrations
railway run npx prisma migrate deploy
```

**C. Database locked**:
- Wait a few minutes
- Try migration again
- If persists, check for long-running queries

---

### Issue: High Memory Usage

**Symptoms**: Backend sluggish, Railway shows high memory

**Diagnosis**:
1. Railway → Backend service → Metrics
2. Check memory usage over time

**Solutions**:

**A. Memory leak in event listeners**:
```typescript
// Make sure to clean up listeners
socket.on('disconnect', () => {
  socket.removeAllListeners();
});
```

**B. Too many cached items in Redis**:
```bash
# Check Redis memory
railway run redis-cli INFO memory
```

**C. Increase memory limit**:
1. Railway → Backend service → Settings
2. Increase RAM allocation
3. Note: Costs increase with more RAM

---

## Database Issues (PostgreSQL)

### Issue: Slow Queries

**Symptoms**: API responses taking >2 seconds

**Diagnosis**:
```sql
-- Check slow queries
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Solutions**:

**A. Missing indexes**:
```prisma
// Add indexes to frequently queried fields
model Agent {
  id String @id
  walletAddress String @unique
  status String
  
  @@index([status])
  @@index([currentZoneId])
}
```

**B. N+1 query problem**:
```typescript
// BAD: Fetches each agent separately
const agents = await db.agent.findMany();
for (const agent of agents) {
  await db.memory.findMany({ where: { agentId: agent.id } });
}

// GOOD: Single query with includes
const agents = await db.agent.findMany({
  include: { memories: true }
});
```

**C. Optimize with select**:
```typescript
// Don't fetch unnecessary fields
const agents = await db.agent.findMany({
  select: { id: true, name: true, status: true }
});
```

---

### Issue: Database Disk Full

**Symptoms**: "No space left on device"

**Solutions**:
1. Railway → PostgreSQL → Settings
2. Increase storage allocation
3. Or clean up old data:
```sql
-- Delete old trivial memories
DELETE FROM "Memory"
WHERE importance = 'TRIVIAL'
  AND "createdAt" < NOW() - INTERVAL '30 days';
```

---

## WebSocket Issues

### Issue: Connections Keep Dropping

**Diagnosis**:
1. Check backend logs for disconnect messages
2. Monitor connection count

**Solutions**:

**A. Increase timeout**:
```typescript
io.on('connection', (socket) => {
  socket.conn.setTimeout(60000); // 60 seconds
});
```

**B. Implement heartbeat**:
```typescript
// Server
io.on('connection', (socket) => {
  socket.on('ping', () => socket.emit('pong'));
});

// Client
setInterval(() => {
  socket.emit('ping');
}, 25000);
```

**C. Check Railway limits**:
- Railway may have connection limits
- Consider connection pooling

---

### Issue: Events Not Broadcasting

**Diagnosis**:
```typescript
// Add logging
io.emit('agent:joined', { agent });
console.log('[WebSocket] Broadcasted agent:joined', agent.id);
```

**Solutions**:

**A. Socket not in correct room**:
```typescript
// Make sure clients join rooms
socket.on('subscribe:zone', (zoneId) => {
  socket.join(`zone:${zoneId}`);
  console.log(`Socket ${socket.id} joined zone:${zoneId}`);
});
```

**B. Event name mismatch**:
- Server emits: `agent:moved`
- Client listens: `agent:move` ❌
- Fix: Ensure event names match exactly

---

## Redis Issues

### Issue: Redis Out of Memory

**Diagnosis**:
```bash
railway run redis-cli INFO memory
```

**Solutions**:

**A. Increase memory limit**:
1. Railway → Redis service → Settings
2. Increase memory allocation

**B. Set TTL on all keys**:
```typescript
// Always set expiration
await redis.setex(key, 3600, value); // 1 hour
```

**C. Implement LRU eviction**:
```bash
# In Redis config
maxmemory-policy allkeys-lru
```

---

## Qdrant Issues

### Issue: Vector Search Not Working

**Diagnosis**:
1. Check Qdrant Cloud dashboard
2. Verify collection exists

**Solutions**:

**A. Collection not created**:
```typescript
// Create collection if not exists
await qdrantClient.createCollection('agent_memories', {
  vectors: { size: 1536, distance: 'Cosine' }
});
```

**B. Embeddings not generated**:
```typescript
// Ensure embeddings are created
const embedding = await generateEmbedding(text);
await qdrantClient.upsert('agent_memories', {
  points: [{
    id: memoryId,
    vector: embedding,
    payload: { agentId, content }
  }]
});
```

---

## Deployment Issues

### Issue: Railway Build Fails

**Diagnosis**: Check Railway build logs

**Solutions**:

**A. Missing dependencies**:
```json
// Check package.json includes all deps
"dependencies": {
  "express": "^4.18.2",
  "@prisma/client": "^5.8.0"
}
```

**B. Build script missing**:
```json
"scripts": {
  "build": "tsc",
  "postinstall": "cd ../../packages/database && npx prisma generate"
}
```

**C. Wrong Node version**:
```json
// package.json
"engines": {
  "node": ">=18.0.0"
}
```

---

### Issue: Netlify Build Fails

**Diagnosis**: Check Netlify build logs

**Solutions**:

**A. Wrong build directory**:
- Set base directory to `frontend`
- Set publish directory to `.next`

**B. Environment variables missing**:
- Add NEXT_PUBLIC_API_URL
- Add NEXT_PUBLIC_WS_URL

**C. Build command wrong**:
```
# Correct:
npm install && npm run build

# Not:
cd frontend && npm run build
```

---

## Security Issues

### Issue: CORS Errors from Unknown Domains

**Diagnosis**: Check backend logs for CORS errors

**Solutions**:
```typescript
// Strict CORS - only allow known origins
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'https://darkcity.wtf',
      'https://www.darkcity.wtf'
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
```

---

### Issue: API Rate Limiting Blocking Legitimate Traffic

**Solutions**:
```typescript
// Whitelist certain IPs
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => {
    const whitelisted = ['127.0.0.1'];
    return whitelisted.includes(req.ip);
  }
});
```

---

## Emergency Procedures

### Complete System Down

1. **Check all services**:
   - Railway dashboard
   - Netlify dashboard
   - Qdrant Cloud dashboard

2. **Rollback if recent deploy**:
   - Railway: Redeploy previous version
   - Netlify: Publish previous deploy

3. **Check for incidents**:
   - Railway status: https://status.railway.app
   - Netlify status: https://www.netlifystatus.com

4. **Emergency contact**:
   - Railway support: support@railway.app
   - Netlify support: support@netlify.com

---

### Data Loss Event

1. **Stop all writes immediately**
2. **Restore from backup**:
```bash
# Restore PostgreSQL
psql $DATABASE_URL < backup-latest.sql
```
3. **Verify data integrity**
4. **Resume operations**

---

## Logging & Monitoring

### Enable Detailed Logging

**Backend**:
```typescript
// Add detailed request logging
app.use((req, res, next) => {
  console.log({
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});
```

### Monitor Key Metrics

- API response times
- Error rates (4xx, 5xx)
- Database query times
- Memory usage
- CPU usage
- WebSocket connection count

---

## Getting Help

### Support Channels

**Railway**: 
- Discord: https://discord.gg/railway
- Docs: https://docs.railway.app

**Netlify**:
- Community: https://answers.netlify.com
- Docs: https://docs.netlify.com

**Qdrant**:
- Discord: https://discord.gg/qdrant
- Docs: https://qdrant.tech/documentation/

---

🌃 **"Every problem has a solution. Debug with precision."** ⚡
