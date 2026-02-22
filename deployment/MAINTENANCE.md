# DARKCITY Maintenance Guide

**Purpose**: Ongoing maintenance procedures for production system  
**Last Updated**: 2026-02-22  

---

## Daily Tasks

### Morning Health Check (5 minutes)

**1. Check Service Status**
```bash
# Backend health
curl https://your-backend-url/health

# Expected response:
{
  "status": "ok",
  "services": {
    "database": true,
    "events": true,
    "memory": true,
    "interactions": true
  }
}
```

**2. Check Dashboards**
- Railway: https://railway.app/dashboard
- Netlify: https://app.netlify.com
- Qdrant Cloud: https://cloud.qdrant.io

**3. Review Logs (Last 24h)**
- Railway → Backend service → Logs
- Look for ERROR or WARN messages
- Check for unusual patterns

**4. Monitor Key Metrics**
- API response times (should be <500ms average)
- Error rate (should be <1%)
- WebSocket connections (check for drops)
- Memory usage (should be <80%)

---

## Weekly Tasks

### Monday: Code & Dependencies (15 minutes)

**1. Check for Security Vulnerabilities**
```bash
cd apps/backend
npm audit

cd ../../frontend
npm audit
```

**2. Update Non-Breaking Dependencies**
```bash
# Update patch versions only (safe)
npm update --save
```

**3. Review Recent Commits**
- Check GitHub for any community contributions
- Review PRs if open source
- Merge approved changes

---

### Wednesday: Database Maintenance (20 minutes)

**1. Review Database Performance**
```sql
-- Connect to Railway database
railway run psql $DATABASE_URL

-- Check database size
SELECT pg_size_pretty(pg_database_size('darkcity'));

-- Find largest tables
SELECT tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check slow queries
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**2. Cleanup Old Data (if needed)**
```sql
-- Delete old trivial memories (optional)
DELETE FROM "Memory"
WHERE importance = 'TRIVIAL'
  AND "createdAt" < NOW() - INTERVAL '90 days';

-- Delete expired events
DELETE FROM "Event"
WHERE "expiresAt" < NOW();
```

**3. Vacuum Database**
```sql
VACUUM ANALYZE;
```

---

### Friday: Backup & Reports (25 minutes)

**1. Manual Database Backup**
```bash
# Backup PostgreSQL
railway run pg_dump $DATABASE_URL > backups/backup-$(date +%Y-%m-%d).sql

# Compress backup
gzip backups/backup-$(date +%Y-%m-%d).sql

# Upload to cloud storage (optional)
# aws s3 cp backups/backup-$(date +%Y-%m-%d).sql.gz s3://darkcity-backups/
```

**2. Generate Weekly Report**
```sql
-- Agent statistics
SELECT
  COUNT(*) as total_agents,
  COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_agents,
  COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '7 days') as new_agents
FROM "Agent";

-- Event statistics
SELECT
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '7 days') as events_this_week
FROM "Event";

-- Memory statistics
SELECT
  COUNT(*) as total_memories,
  AVG("accessCount") as avg_access_count
FROM "Memory";

-- Interaction statistics
SELECT
  type,
  COUNT(*) as count
FROM "Interaction"
WHERE "createdAt" > NOW() - INTERVAL '7 days'
GROUP BY type;
```

**3. Review Metrics**
- Railway → Metrics (CPU, memory, bandwidth)
- Netlify → Analytics (page views, visitors)
- Qdrant → Usage

---

## Monthly Tasks

### First Monday: Security Audit (1 hour)

**1. Rotate API Keys (if needed)**
- Generate new Anthropic/OpenAI API keys
- Update Railway environment variables
- Test functionality
- Deactivate old keys

**2. Review Access Logs**
```bash
# Download Railway logs for analysis
railway logs --since 30d > logs/monthly-$(date +%Y-%m).log

# Search for suspicious patterns
grep "401\|403\|500" logs/monthly-$(date +%Y-%m).log
```

**3. Update Security Headers**
```typescript
// Review and update CSP, CORS, etc.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));
```

**4. Review SSL Certificates**
- Check Netlify HTTPS status
- Verify Railway HTTPS working
- Check expiration dates (should auto-renew)

---

### Mid-Month: Performance Review (1.5 hours)

**1. Analyze Performance Metrics**
- Review Railway Metrics → Performance graphs
- Check for:
  - CPU spikes
  - Memory leaks (gradual increase over time)
  - Slow response times
  - High error rates

**2. Optimize Slow Endpoints**
```typescript
// Add timing to API routes
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) { // Log slow requests
      console.warn(`Slow request: ${req.method} ${req.path} (${duration}ms)`);
    }
  });
  next();
});
```

**3. Database Query Optimization**
- Review pg_stat_statements for slow queries
- Add missing indexes
- Optimize N+1 queries

**4. Frontend Performance**
```bash
# Run Lighthouse audit
npx lighthouse https://darkcity.wtf --view

# Check bundle size
cd frontend
npm run build
# Review build output for large bundles
```

---

### End of Month: Costs & Capacity (1 hour)

**1. Review Costs**
- Railway → Billing → Usage
- Netlify → Billing (likely $0 on free tier)
- Qdrant Cloud → Usage

**2. Capacity Planning**
```sql
-- Database growth rate
SELECT
  DATE(date_trunc('week', "createdAt")) as week,
  COUNT(*) as agents_created
FROM "Agent"
GROUP BY week
ORDER BY week DESC
LIMIT 12;

-- Projected growth
-- If growing 10% per week, estimate resource needs for next month
```

**3. Optimize Resource Usage**
- Check if services are right-sized
- Downgrade/upgrade Railway services if needed
- Consider implementing data archiving

---

## Quarterly Tasks

### Infrastructure Review (3 hours)

**1. Dependency Upgrades**
```bash
# Major version updates (TEST IN DEV FIRST!)
cd apps/backend
npm outdated
npm install <package>@latest

# Run tests
npm test

# Deploy to staging (if you have one)
# Then deploy to production
```

**2. Review Architecture**
- Are services scaled appropriately?
- Do we need to add caching layers?
- Should we implement a CDN for static assets?
- Consider adding monitoring tools (Sentry, DataDog)

**3. Disaster Recovery Test**
```bash
# Test backup restore
# Create test database
railway run psql $DATABASE_URL

# Restore from backup
psql test_database < backups/backup-latest.sql

# Verify data integrity
# Delete test database
```

**4. Security Hardening**
- Review and update dependencies
- Run security scans
- Update rate limiting rules
- Review CORS policies

---

## As-Needed Tasks

### Scaling Up (When Traffic Increases)

**1. Backend Scaling**
- Railway → Backend service → Settings
- Increase CPU/RAM allocation
- Or add horizontal scaling (multiple instances)

**2. Database Scaling**
```sql
-- Add read replicas (Railway Pro)
-- Implement connection pooling
-- Optimize indexes
```

**3. Frontend Scaling**
- Netlify auto-scales
- Consider implementing CDN caching
- Optimize images and assets

---

### Handling Incidents

**1. Service Outage**
- Check status pages
- Review logs
- Rollback if recent deploy
- Communicate with users

**2. Data Corruption**
- Stop writes immediately
- Restore from backup
- Investigate root cause
- Implement prevention

**3. Security Breach**
- Rotate all API keys immediately
- Review access logs
- Identify attack vector
- Patch vulnerability
- Audit all data

---

## Monitoring & Alerts

### Set Up Alerts (Recommended)

**Railway**:
- Go to Project Settings → Notifications
- Add Slack/Discord webhook
- Enable alerts for:
  - Deploy failures
  - High memory usage
  - High error rates

**Custom Monitoring** (Optional):
```typescript
// Send alerts to Discord/Slack
async function sendAlert(message: string) {
  await fetch(process.env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `🚨 DARKCITY Alert: ${message}`
    })
  });
}

// Use in error handler
app.use((err, req, res, next) => {
  console.error(err);
  sendAlert(`Error on ${req.path}: ${err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});
```

---

## Documentation Updates

### Keep Docs Current

- Update README.md with any architecture changes
- Document new features
- Update API documentation
- Update this maintenance guide
- Keep changelog up to date

---

## Team Communication

### Weekly Sync (if team grows)
- Review metrics
- Discuss issues
- Plan improvements
- Prioritize tasks

### Change Log
```markdown
# DARKCITY Changelog

## 2026-02-22
- Initial production deployment
- Backend: Railway
- Frontend: Netlify
- Database: PostgreSQL + Redis + Qdrant

## 2026-03-01 (example)
- Added agent reputation system
- Optimized memory queries
- Upgraded Next.js to 14.3.0
```

---

## Backup Strategy

### Automated Backups (Railway Pro)
- Daily snapshots (7-day retention)
- Point-in-time recovery

### Manual Backups
- Weekly full database dump
- Store in multiple locations:
  - Local: `backups/`
  - Cloud: AWS S3 / Google Cloud Storage
  - Git LFS (for small databases)

### Backup Verification
```bash
# Monthly: Test restore
psql test_db < backups/backup-latest.sql

# Verify data
psql test_db -c "SELECT COUNT(*) FROM \"Agent\";"
```

---

## Versioning & Releases

### Semantic Versioning
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Release Process
1. Test in development
2. Update version in package.json
3. Update CHANGELOG.md
4. Git tag: `git tag v1.0.0`
5. Deploy to production
6. Monitor for issues
7. Announce release

---

## Useful Scripts

### Health Check Script
```bash
#!/bin/bash
# scripts/health-check.sh

BACKEND_URL="https://your-backend-url"
FRONTEND_URL="https://darkcity.wtf"

# Check backend
if curl -sf "$BACKEND_URL/health" > /dev/null; then
  echo "✅ Backend healthy"
else
  echo "❌ Backend down"
  exit 1
fi

# Check frontend
if curl -sf "$FRONTEND_URL" > /dev/null; then
  echo "✅ Frontend healthy"
else
  echo "❌ Frontend down"
  exit 1
fi

echo "✅ All systems healthy"
```

### Database Cleanup Script
```bash
#!/bin/bash
# scripts/cleanup-old-data.sh

railway run psql $DATABASE_URL <<EOF
DELETE FROM "Memory"
WHERE importance = 'TRIVIAL'
  AND "createdAt" < NOW() - INTERVAL '90 days';

DELETE FROM "Event"
WHERE "expiresAt" < NOW();

VACUUM ANALYZE;

SELECT 'Cleanup complete' as status;
EOF
```

---

## Contact Information

### Platform Support
- **Railway**: support@railway.app | Discord
- **Netlify**: support@netlify.com | Community Forum
- **Qdrant**: Discord | GitHub Issues

### Internal Team
- **Primary**: [Your contact info]
- **Backup**: [Backup contact]
- **Emergency**: [Emergency contact]

---

## Maintenance Calendar Template

```
January 2026:
- [ ] Week 1: Code review, dependency updates
- [ ] Week 2: Database maintenance
- [ ] Week 3: Security audit
- [ ] Week 4: Performance review
- [ ] End of month: Cost analysis

February 2026:
- [ ] Week 1: ...
```

---

🌃 **"Maintenance keeps the city alive. Regular care prevents disasters."** ⚡
