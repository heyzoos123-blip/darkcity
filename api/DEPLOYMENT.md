# DARKCITY Agent API - Deployment Guide

Complete guide for deploying the DARKCITY Agent API to production.

## Prerequisites

- Node.js 18+ or Docker
- PostgreSQL 14+
- Redis 6+ (optional, for distributed rate limiting)
- SSL/TLS certificates for HTTPS
- Domain name (e.g., api.darkcity.game)

## Quick Start (Development)

### Option 1: Docker Compose (Recommended)

```bash
# Clone/navigate to project
cd projects/darkcity/api

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f api

# API available at http://localhost:3000
```

### Option 2: Local Development

```bash
# Install dependencies
npm install

# Set up PostgreSQL
createdb darkcity
psql darkcity < init.sql

# Set up environment
cp .env.example .env
# Edit .env with your config

# Start server
npm run dev

# In another terminal, run tests
npm test
```

## Production Deployment

### 1. Environment Setup

```bash
# Copy example env
cp .env.example .env

# Edit production values
nano .env
```

**Required environment variables:**
```bash
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db-host:5432/darkcity
REDIS_URL=redis://redis-host:6379  # Optional
```

### 2. Database Setup

```bash
# Run migrations
psql $DATABASE_URL < init.sql

# Verify tables
psql $DATABASE_URL -c "\dt"
```

### 3. Build & Deploy

#### Docker Deployment

```bash
# Build image
docker build -t darkcity-api:latest .

# Run container
docker run -d \
  --name darkcity-api \
  -p 3000:3000 \
  --env-file .env \
  darkcity-api:latest

# Check health
curl http://localhost:3000/health
```

#### Traditional Node.js Deployment

```bash
# Build TypeScript
npm run build

# Install production deps only
npm ci --only=production

# Start with PM2 (process manager)
npm install -g pm2
pm2 start dist/agent-api.js --name darkcity-api

# Save PM2 config
pm2 save
pm2 startup
```

### 4. Nginx Reverse Proxy

Create `/etc/nginx/sites-available/darkcity-api`:

```nginx
upstream darkcity_api {
  server localhost:3000;
  keepalive 64;
}

# WebSocket upgrade map
map $http_upgrade $connection_upgrade {
  default upgrade;
  '' close;
}

server {
  listen 80;
  listen [::]:80;
  server_name api.darkcity.game;

  # Redirect to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name api.darkcity.game;

  # SSL certificates (use Let's Encrypt)
  ssl_certificate /etc/letsencrypt/live/api.darkcity.game/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.darkcity.game/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Frame-Options "DENY" always;
  add_header X-Content-Type-Options "nosniff" always;

  # Logging
  access_log /var/log/nginx/darkcity-api-access.log;
  error_log /var/log/nginx/darkcity-api-error.log;

  # REST API endpoints
  location /api/ {
    proxy_pass http://darkcity_api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
  }

  # WebSocket endpoints
  location /ws/ {
    proxy_pass http://darkcity_api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # WebSocket timeouts
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;
  }

  # Health check
  location /health {
    proxy_pass http://darkcity_api;
    access_log off;
  }
}
```

Enable and restart Nginx:

```bash
ln -s /etc/nginx/sites-available/darkcity-api /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 5. SSL Certificate (Let's Encrypt)

```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d api.darkcity.game

# Auto-renewal
certbot renew --dry-run
```

### 6. Firewall Configuration

```bash
# Allow HTTPS
ufw allow 443/tcp

# Allow HTTP (for redirect)
ufw allow 80/tcp

# Block direct access to API port
ufw deny 3000/tcp
```

## Monitoring & Logging

### 1. PM2 Monitoring

```bash
# View logs
pm2 logs darkcity-api

# Monitor resources
pm2 monit

# Generate startup script
pm2 startup
pm2 save
```

### 2. PostgreSQL Monitoring

```bash
# Connection stats
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"

# Database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('darkcity'));"

# Slow queries
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

### 3. Application Metrics

Add Prometheus metrics endpoint (optional):

```bash
npm install prom-client

# Add to agent-api.ts:
# - Request duration histogram
# - Active WebSocket connections gauge
# - Battle action counter
# - Error rate counter
```

## Scaling

### Horizontal Scaling (Multiple Instances)

```bash
# Use Redis for shared rate limiting
npm install rate-limit-redis

# Update agent-api.ts to use Redis store
# Deploy multiple instances behind load balancer
```

### Load Balancer (Nginx)

```nginx
upstream darkcity_api_cluster {
  least_conn;
  server api1.internal:3000;
  server api2.internal:3000;
  server api3.internal:3000;
}
```

### WebSocket Sticky Sessions

For WebSocket scaling, use sticky sessions or Redis pub/sub:

```nginx
upstream darkcity_api_cluster {
  ip_hash;  # Sticky sessions
  server api1.internal:3000;
  server api2.internal:3000;
}
```

## Backup & Recovery

### Database Backups

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL | gzip > /backups/darkcity_$DATE.sql.gz

# Keep last 7 days
find /backups -name "darkcity_*.sql.gz" -mtime +7 -delete
```

Add to crontab:
```bash
0 2 * * * /opt/scripts/backup-darkcity.sh
```

### Restore

```bash
# Restore from backup
gunzip -c /backups/darkcity_20260201_020000.sql.gz | psql $DATABASE_URL
```

## Security Checklist

- [ ] Environment variables not committed to git
- [ ] Database uses strong password
- [ ] SSL/TLS enabled (HTTPS/WSS)
- [ ] Firewall configured (only 80/443 open)
- [ ] Rate limiting enabled
- [ ] Security headers set in Nginx
- [ ] Database backups automated
- [ ] Logs monitored for failed auth attempts
- [ ] API keys/secrets in secure vault
- [ ] Regular security updates applied

## Troubleshooting

### API not responding

```bash
# Check process
pm2 status

# Check logs
pm2 logs darkcity-api --lines 100

# Check port
netstat -tlnp | grep 3000
```

### Database connection errors

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

### WebSocket connection failures

```bash
# Check Nginx WebSocket config
nginx -t

# Check WebSocket upgrade headers
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  https://api.darkcity.game/ws/battle/test
```

### High memory usage

```bash
# Check Node.js heap
pm2 monit

# Restart if needed
pm2 restart darkcity-api

# Check for memory leaks
node --inspect dist/agent-api.js
```

## Performance Tuning

### PostgreSQL

```sql
-- Increase connection pool
ALTER SYSTEM SET max_connections = 200;

-- Enable query optimization
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';

-- Restart PostgreSQL
```

### Node.js

```bash
# Increase heap size
NODE_OPTIONS="--max-old-space-size=4096" pm2 start dist/agent-api.js

# Use cluster mode
pm2 start dist/agent-api.js -i max
```

## Maintenance

### Updating API

```bash
# Pull latest code
git pull origin main

# Install dependencies
npm ci

# Build
npm run build

# Restart
pm2 restart darkcity-api
```

### Database Migrations

```bash
# Run new migrations
psql $DATABASE_URL < migrations/002_add_tournaments.sql

# Verify
psql $DATABASE_URL -c "\dt"
```

---

**Support:** For issues, check logs first. Common problems are database connections and WebSocket configurations.

**Production URL:** https://api.darkcity.game  
**WebSocket URL:** wss://api.darkcity.game/ws/battle/:id
