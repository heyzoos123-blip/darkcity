# DARKCITY Property System - Deployment Guide

## Prerequisites

1. **PostgreSQL 14+**
   - Install: https://www.postgresql.org/download/
   - Create database: `createdb darkcity_property`

2. **Node.js 18+**
   - Recommended: v20 LTS

3. **Solana CLI** (optional, for testing)
   - Install: https://docs.solana.com/cli/install-solana-cli-tools

## Setup Steps

### 1. Install Dependencies
```bash
cd projects/darkcity/property
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=darkcity_property
DB_USER=postgres
DB_PASSWORD=your_secure_password

SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
TREASURY_ADDRESS=FkjfuNd1pvKLPzQWm77WfRy1yNWRhqbBPt9EexuvvmCD

PORT=3000
NODE_ENV=production
```

### 3. Run Database Migration
```bash
npm run migrate
```

This creates all tables, indexes, and triggers.

### 4. Seed Initial Data (Optional)

Create some buildings and properties:
```sql
-- Create a building
INSERT INTO buildings (name, address, total_floors, location_x, location_y)
VALUES ('DARK TOWER', '100 Shadow Street', 50, 100.0, 200.0);

-- Create properties (example)
INSERT INTO properties (tier, address, building_id, floor, unit_number)
SELECT 
  'STUDIO', 
  id || '-1A', 
  id, 
  1, 
  'A'
FROM buildings WHERE name = 'DARK TOWER';
```

Or run the seed script:
```bash
node scripts/seed-properties.js
```

### 5. Build TypeScript
```bash
npm run build
```

### 6. Start Services

**API Server:**
```bash
npm start
```

**Rent Scheduler (separate process):**
```bash
npm run scheduler
```

### 7. Verify Deployment

Health check:
```bash
curl http://localhost:3000/health
```

Test endpoint:
```bash
curl http://localhost:3000/api/properties
```

## Production Deployment

### Using PM2 (Recommended)

```bash
npm install -g pm2

# Start API
pm2 start dist/index.js --name darkcity-api

# Start scheduler
pm2 start dist/services/rent-scheduler.js --name darkcity-scheduler

# Save configuration
pm2 save

# Auto-restart on system boot
pm2 startup
```

### Using Docker

```bash
# Build image
docker build -t darkcity-property .

# Run API
docker run -d \
  --name darkcity-api \
  -p 3000:3000 \
  --env-file .env \
  darkcity-property

# Run scheduler
docker run -d \
  --name darkcity-scheduler \
  --env-file .env \
  darkcity-property \
  npm run scheduler
```

### Using systemd

Create `/etc/systemd/system/darkcity-api.service`:
```ini
[Unit]
Description=DARKCITY Property API
After=network.target postgresql.service

[Service]
Type=simple
User=darkcity
WorkingDirectory=/opt/darkcity/property
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/darkcity-scheduler.service`:
```ini
[Unit]
Description=DARKCITY Rent Scheduler
After=network.target postgresql.service

[Service]
Type=simple
User=darkcity
WorkingDirectory=/opt/darkcity/property
ExecStart=/usr/bin/node dist/services/rent-scheduler.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable darkcity-api darkcity-scheduler
sudo systemctl start darkcity-api darkcity-scheduler
```

## Monitoring

### Logs
```bash
# PM2
pm2 logs darkcity-api
pm2 logs darkcity-scheduler

# Docker
docker logs -f darkcity-api
docker logs -f darkcity-scheduler

# systemd
journalctl -u darkcity-api -f
journalctl -u darkcity-scheduler -f
```

### Database Performance
```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'darkcity_property';

-- Slow queries
SELECT pid, now() - query_start as duration, query 
FROM pg_stat_activity 
WHERE state = 'active' 
AND now() - query_start > interval '1 second';

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Backup

### Database Backup
```bash
# Full backup
pg_dump darkcity_property > backup-$(date +%Y%m%d).sql

# Compressed backup
pg_dump darkcity_property | gzip > backup-$(date +%Y%m%d).sql.gz

# Automated daily backup (cron)
0 2 * * * pg_dump darkcity_property | gzip > /backups/darkcity-$(date +\%Y\%m\%d).sql.gz
```

### Restore
```bash
# From plain SQL
psql darkcity_property < backup-20260201.sql

# From compressed
gunzip -c backup-20260201.sql.gz | psql darkcity_property
```

## Security

1. **Database Access**
   - Use strong passwords
   - Restrict network access (pg_hba.conf)
   - Enable SSL connections

2. **API Security**
   - Add authentication middleware
   - Rate limiting
   - Input validation
   - HTTPS only in production

3. **Solana Keys**
   - Never commit private keys
   - Use hardware wallets for treasury
   - Implement multi-sig for large amounts

## Scaling

### Database
- Connection pooling (already configured)
- Read replicas for reporting
- Partitioning for large tables (rent_payments, evictions)

### API
- Load balancer (nginx)
- Multiple API instances
- Redis for caching
- CDN for static assets

### Monitoring
- Prometheus + Grafana
- Sentry for error tracking
- Uptime monitoring (Pingdom, UptimeRobot)

## Maintenance

### Weekly Tasks
- Review eviction logs
- Check payment success rates
- Monitor storage usage

### Monthly Tasks
- Database vacuum and analyze
- Review slow query logs
- Update dependencies

### Quarterly Tasks
- Security audit
- Performance optimization
- Backup testing

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
psql -h localhost -U postgres -d darkcity_property -c "SELECT 1"

# Check PostgreSQL status
sudo systemctl status postgresql
```

### Payment Processing Issues
- Verify Solana RPC endpoint
- Check treasury address
- Review transaction signatures

### Scheduler Not Running
- Check cron jobs are registered
- Verify timezone settings
- Review scheduler logs

## Support

For issues:
1. Check logs first
2. Review this guide
3. Contact darkflobi team
