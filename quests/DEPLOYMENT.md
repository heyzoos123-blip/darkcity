# DARKCITY Quest System - Deployment Guide

## Quick Start

### 1. Install Dependencies

```bash
cd projects/darkcity/quests
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
DB_PATH=./data/quests.db
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
PORT=3000

# Add your payout wallet secret key (JSON array format)
# SOLANA_SECRET_KEY=[1,2,3,...,64]
```

### 3. Initialize Database

```bash
npm run db:migrate
npm run db:seed
```

### 4. Start Server

```bash
# Development (auto-reload)
npm run dev

# Production
npm run build
npm start
```

## Production Deployment

### Option 1: Node.js Server

```bash
# Build the application
npm run build

# Set production environment
export NODE_ENV=production

# Start with process manager (PM2)
npm install -g pm2
pm2 start dist/api/server.js --name darkcity-quests

# View logs
pm2 logs darkcity-quests

# Monitor
pm2 monit
```

### Option 2: Docker

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/api/server.js"]
```

Build and run:
```bash
docker build -t darkcity-quests .
docker run -d -p 3000:3000 --name quests darkcity-quests
```

### Option 3: Systemd Service

Create `/etc/systemd/system/darkcity-quests.service`:
```ini
[Unit]
Description=DARKCITY Quest System
After=network.target

[Service]
Type=simple
User=darkcity
WorkingDirectory=/opt/darkcity-quests
ExecStart=/usr/bin/node dist/api/server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable darkcity-quests
sudo systemctl start darkcity-quests
sudo systemctl status darkcity-quests
```

## Database Management

### Backup

```bash
# Automatic daily backup
0 2 * * * cp /path/to/data/quests.db /path/to/backups/quests-$(date +\%Y\%m\%d).db
```

### Restore

```bash
cp /path/to/backups/quests-YYYYMMDD.db /path/to/data/quests.db
```

### Migrate Existing Database

```bash
# Export from old
sqlite3 old_quests.db .dump > export.sql

# Import to new
npm run db:migrate
sqlite3 data/quests.db < export.sql
```

## Scaling

### Load Balancer Setup (Nginx)

```nginx
upstream darkcity_quests {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    listen 80;
    server_name quests.darkcity.com;

    location / {
        proxy_pass http://darkcity_quests;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Multiple Instances

For SQLite, use read replicas:
- Master: Write operations (quest acceptance, submissions)
- Replicas: Read operations (quest board, leaderboard)

Or migrate to PostgreSQL for true multi-server support.

## Monitoring

### Health Checks

```bash
# Basic health
curl http://localhost:3000/api/health

# System stats
curl http://localhost:3000/api/stats
```

### Logging

```javascript
// Add logging middleware in server.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Metrics (Prometheus)

```javascript
import promClient from 'prom-client';

const register = new promClient.Registry();

const questsAccepted = new promClient.Counter({
  name: 'quests_accepted_total',
  help: 'Total quests accepted',
  registers: [register]
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

## Security Hardening

### 1. API Authentication

Add API key middleware:
```typescript
function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Protect admin routes
app.post('/api/admin/*', authMiddleware, ...);
```

### 2. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 3. CORS Configuration

```typescript
app.use(cors({
  origin: ['https://darkcity.com', 'https://app.darkcity.com'],
  credentials: true
}));
```

### 4. Input Validation

Already implemented via Zod schemas in `src/utils/validation.ts`.

### 5. HTTPS Only

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Redirect HTTP to HTTPS
    if ($scheme != "https") {
        return 301 https://$server_name$request_uri;
    }
}
```

## Maintenance

### Daily Tasks
- Monitor API health endpoint
- Check database size
- Review error logs
- Verify payout wallet balance

### Weekly Tasks
- Database backup verification
- Security updates
- Performance metrics review
- Generate admin reports

### Monthly Tasks
- Database optimization (VACUUM)
- Rotate logs
- Review and update quest templates
- Analyze agent retention metrics

## Troubleshooting

### High CPU Usage
- Check for long-running queries
- Review indexes on frequently queried columns
- Consider caching quest board results

### Database Locked Errors
- Increase WAL checkpoint interval
- Reduce write concurrency
- Consider migration to PostgreSQL

### Payout Failures
- Verify Solana RPC connectivity
- Check payout wallet balance
- Review transaction logs
- Ensure proper error handling

### Memory Leaks
- Monitor with `node --inspect`
- Use Chrome DevTools for heap snapshots
- Review for circular references
- Check for unclosed database connections

## Upgrading

```bash
# Backup first
cp data/quests.db data/backups/quests-pre-upgrade.db

# Pull latest code
git pull origin main

# Install dependencies
npm install

# Run migrations (if any)
npm run db:migrate

# Rebuild
npm run build

# Restart service
pm2 restart darkcity-quests
```

## Rollback Plan

```bash
# Stop service
pm2 stop darkcity-quests

# Restore database
cp data/backups/quests-pre-upgrade.db data/quests.db

# Checkout previous version
git checkout <previous-tag>

# Rebuild
npm install
npm run build

# Restart
pm2 start darkcity-quests
```

---

For production support: [support@darkcity.com](mailto:support@darkcity.com)
