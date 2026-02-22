# Railway Deployment Guide - DARKCITY Backend

**Platform**: Railway (railway.app)  
**Purpose**: Deploy Node.js backend + PostgreSQL + Redis  
**Target**: Production backend for darkcity.wtf  

---

## Prerequisites

- GitHub account with darkcity repository
- Railway account (sign up at railway.app)
- Qdrant Cloud account (for vector database)
- API keys: Anthropic and/or OpenAI

---

## Step 1: Create Railway Account

1. Go to https://railway.app
2. Click "Sign in with GitHub"
3. Authorize Railway to access your GitHub account
4. Verify email if required

---

## Step 2: Create New Project

1. Click "New Project" in Railway dashboard
2. Select "Deploy from GitHub repo"
3. Choose your darkcity repository
4. Railway will scan the repository

---

## Step 3: Set Up Services

### Service 1: PostgreSQL Database

1. Click "+ New" in your project
2. Select "Database" → "PostgreSQL"
3. Railway will provision a PostgreSQL instance
4. Note: Railway auto-generates DATABASE_URL
5. Click on PostgreSQL service → Variables tab
6. Verify these variables exist:
   - `DATABASE_URL` (auto-generated)
   - `POSTGRES_DB`
   - `POSTGRES_USER`
   - `POSTGRES_PASSWORD`

**Configuration**:
- Version: PostgreSQL 15 or higher
- Storage: Start with 10GB (Railway default)
- **Important**: Enable pgvector extension (if needed for semantic search)

### Service 2: Redis

1. Click "+ New" in your project
2. Select "Database" → "Redis"
3. Railway will provision a Redis instance
4. Note: Railway auto-generates REDIS_URL
5. Variables to note:
   - `REDIS_URL` (auto-generated)
   - `REDIS_HOST`
   - `REDIS_PORT`
   - `REDIS_PASSWORD`

**Configuration**:
- Version: Redis 7+
- Memory: 256MB initial

### Service 3: Qdrant (External - Qdrant Cloud)

**Note**: Railway doesn't have native Qdrant support. Use Qdrant Cloud.

1. Go to https://cloud.qdrant.io
2. Sign up for free account
3. Create new cluster:
   - Name: `darkcity-vectors`
   - Region: Closest to your Railway region
   - Plan: Free (1GB)
4. Create API key
5. Note the cluster URL and API key

**You'll need**:
- `QDRANT_URL`: Your cluster URL (e.g., https://xxx.qdrant.io)
- `QDRANT_API_KEY`: Your API key

### Service 4: Node.js Backend

1. In your Railway project, click "+ New"
2. Select "GitHub Repo" → Choose darkcity repository
3. Railway will detect Node.js automatically
4. Configure build settings:
   - **Root Directory**: `apps/backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Install Command**: `npm install`

---

## Step 4: Configure Environment Variables (Backend Service)

Go to your backend service → Variables tab → Add all variables:

### Required Variables:

```env
# Node Environment
NODE_ENV=production

# Port (Railway auto-assigns, but set default)
PORT=3001

# Database (use Railway reference variables)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (use Railway reference variables)
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}

# Qdrant (from Qdrant Cloud)
QDRANT_URL=<your-qdrant-cloud-url>
QDRANT_API_KEY=<your-qdrant-api-key>

# LLM APIs (your keys)
ANTHROPIC_API_KEY=<your-anthropic-key>
OPENAI_API_KEY=<your-openai-key>

# CORS - Frontend URL (will update after Netlify deploy)
FRONTEND_URL=https://darkcity.wtf

# Solana (optional for MVP)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta
```

**Railway Tips**:
- Use `${{Service.VARIABLE}}` syntax to reference other services
- Railway auto-generates DATABASE_URL, REDIS_URL, etc.
- You can copy these references from the Variables tab

---

## Step 5: Run Database Migrations

After backend deploys successfully:

1. Go to backend service → Settings → Enable "Persistent Volume" (optional for logs)
2. Go to backend service → Deployments tab
3. Click on latest deployment → "View Logs"
4. Once backend is running, run migrations:

**Option A: Via Railway CLI** (recommended):
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migration
railway run npx prisma migrate deploy
```

**Option B: Via Prisma Studio** (alternative):
```bash
# Locally, with production DATABASE_URL
DATABASE_URL=<railway-postgres-url> npx prisma migrate deploy
```

---

## Step 6: Verify Deployment

### Check Backend Health

1. Get your backend URL from Railway:
   - Go to backend service → Settings tab
   - Under "Domains", you'll see a URL like: `darkcity-backend-production-xxxx.up.railway.app`
   - Or click "Generate Domain" if not auto-generated

2. Test health endpoint:
```bash
curl https://darkcity-backend-production-xxxx.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-22T...",
  "services": {
    "database": true,
    "events": true,
    "memory": true,
    "interactions": true
  }
}
```

### Check Service Logs

1. Go to each service → Deployments → View Logs
2. Look for:
   - ✅ "Database connected"
   - ✅ "Event engine initialized"
   - ✅ "Memory system initialized"
   - ✅ "Interaction service initialized"
   - ✅ "WebSocket server initialized"
   - ✅ "DARKCITY server running on port..."

### Common Issues

**"Cannot connect to database"**:
- Check DATABASE_URL is correctly set
- Verify PostgreSQL service is running
- Check PostgreSQL logs for errors

**"Redis connection failed"**:
- Check REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
- Verify Redis service is running

**"Prisma Client not generated"**:
- Add to backend package.json:
  ```json
  "postinstall": "cd ../../packages/database && npx prisma generate"
  ```
- Or include prisma generate in build command

**Build fails**:
- Check build logs
- Verify all dependencies in package.json
- Ensure shared packages are linked correctly

---

## Step 7: Configure Custom Domain (Optional)

If you want `api.darkcity.wtf` instead of Railway subdomain:

1. Go to backend service → Settings → Domains
2. Click "Custom Domain"
3. Enter: `api.darkcity.wtf`
4. Railway will give you a CNAME record
5. Go to your domain registrar (where darkcity.wtf is registered)
6. Add DNS record:
   - Type: CNAME
   - Name: `api`
   - Value: `<railway-provided-cname>`
   - TTL: 3600

7. Wait for DNS propagation (5-30 minutes)
8. Railway will auto-provision SSL certificate

---

## Step 8: Update Environment Variables

After backend URL is confirmed:

1. Note your backend URL (e.g., `https://darkcity-backend-production-xxxx.up.railway.app`)
2. This will be used for frontend deployment (NEXT_PUBLIC_API_URL)

---

## Step 9: Enable Monitoring

### Built-in Railway Monitoring:
1. Go to backend service → Metrics tab
2. Monitor:
   - CPU usage
   - Memory usage
   - Network traffic
   - Response times

### Set Up Alerts (optional):
- Railway can notify on Slack/Discord/email
- Go to Project Settings → Notifications
- Configure alert thresholds

---

## Step 10: Database Backup Strategy

### Automated Backups (Railway Pro):
- Railway Pro plan includes automated daily backups
- Retention: 7 days

### Manual Backup:
```bash
# Via Railway CLI
railway run pg_dump $DATABASE_URL > backup-$(date +%Y-%m-%d).sql

# Or locally
pg_dump <railway-database-url> > backup-$(date +%Y-%m-%d).sql
```

### Restore from Backup:
```bash
railway run psql $DATABASE_URL < backup-YYYY-MM-DD.sql
```

---

## Step 11: Cost Monitoring

### Railway Pricing:
- **Hobby Plan**: $5 usage credit/month
- **Usage-based**: $0.000463/GB-hour + $0.01/GB egress
- **Estimated Monthly Cost**:
  - PostgreSQL: ~$5
  - Redis: ~$3
  - Backend: ~$5-10
  - **Total**: ~$13-18/month

### Monitor Usage:
- Go to Project Settings → Usage
- Set spending limits if needed
- Enable usage alerts

---

## Deployment Checklist

- [ ] Railway account created
- [ ] New project created
- [ ] PostgreSQL service deployed
- [ ] Redis service deployed
- [ ] Qdrant Cloud account created
- [ ] Qdrant cluster created
- [ ] Backend service configured
- [ ] All environment variables set
- [ ] Backend deployed successfully
- [ ] Database migrations run
- [ ] Health check passes
- [ ] Logs show no errors
- [ ] Backend URL noted for frontend deployment
- [ ] (Optional) Custom domain configured

---

## Post-Deployment

### Monitor First 24 Hours:
- Check error rates in logs
- Monitor CPU/memory usage
- Test all API endpoints
- Verify WebSocket connections
- Watch for database query performance

### Security Checklist:
- [ ] Environment variables secured
- [ ] No secrets in logs
- [ ] CORS configured correctly
- [ ] Rate limiting active
- [ ] HTTPS enforced

---

## Useful Railway Commands

```bash
# Install CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# View logs
railway logs

# Run command in production
railway run <command>

# Open dashboard
railway open

# List services
railway status
```

---

## Support & Resources

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Qdrant Docs**: https://qdrant.tech/documentation/
- **Prisma Railway Guide**: https://www.prisma.io/docs/guides/deployment/railway

---

🌃 **"The backend is the city's foundation. Deploy it solid."** ⚡

**Next**: Deploy frontend to Netlify
