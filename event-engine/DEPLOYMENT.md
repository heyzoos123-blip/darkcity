# DARKCITY Event Engine - Deployment Guide

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **Redis**: v6.0 or higher (for pub/sub)
- **PostgreSQL**: v14+ (for production event storage)
- **TimescaleDB**: Optional (for analytics)

## Local Development

### 1. Install Dependencies

```bash
cd projects/darkcity/event-engine
npm install
```

### 2. Setup Redis

**Using Docker:**
```bash
docker run -d \
  --name darkcity-redis \
  -p 6379:6379 \
  redis:7-alpine
```

**Or install locally:**
```bash
# macOS
brew install redis
redis-server

# Ubuntu
sudo apt install redis-server
sudo systemctl start redis
```

### 3. Configure Environment

Create `.env`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 4. Build and Run

```bash
# Build TypeScript
npm run build

# Run basic example
npm run dev

# Or run directly
ts-node src/examples/basic.ts
```

## Production Deployment

### Option 1: Docker

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

CMD ["node", "dist/index.js"]
```

Build and run:
```bash
docker build -t darkcity-event-engine .
docker run -d \
  --name event-engine \
  -e REDIS_HOST=redis \
  -e REDIS_PORT=6379 \
  --link darkcity-redis:redis \
  darkcity-event-engine
```

### Option 2: Docker Compose

`docker-compose.yml`:
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

  event-engine:
    build: .
    depends_on:
      - redis
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
      NODE_ENV: production
    restart: unless-stopped

volumes:
  redis-data:
```

Run:
```bash
docker-compose up -d
```

### Option 3: Kubernetes

`k8s/deployment.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: event-engine
spec:
  replicas: 3
  selector:
    matchLabels:
      app: event-engine
  template:
    metadata:
      labels:
        app: event-engine
    spec:
      containers:
      - name: event-engine
        image: darkcity/event-engine:latest
        env:
        - name: REDIS_HOST
          value: redis-service
        - name: REDIS_PORT
          value: "6379"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

Apply:
```bash
kubectl apply -f k8s/
```

## Redis Configuration

For production, configure Redis for:

### Persistence
```
appendonly yes
appendfsync everysec
save 900 1
save 300 10
save 60 10000
```

### Memory Management
```
maxmemory 2gb
maxmemory-policy allkeys-lru
```

### Pub/Sub Optimization
```
client-output-buffer-limit pubsub 32mb 8mb 60
```

## PostgreSQL Setup (Production)

For production event storage:

```sql
-- Create database
CREATE DATABASE darkcity;

-- Create events table
CREATE TABLE events (
  id UUID PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  timestamp BIGINT NOT NULL,
  data JSONB NOT NULL,
  version VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_data_agents ON events USING GIN ((data->'participants'));
CREATE INDEX idx_events_data_location ON events ((data->>'location'));

-- Enable TimescaleDB for time-series (optional)
CREATE EXTENSION IF NOT EXISTS timescaledb;
SELECT create_hypertable('events', 'timestamp', chunk_time_interval => 86400000);
```

## Monitoring

### Health Checks

```typescript
// Health endpoint
app.get('/health', async (req, res) => {
  const status = engine.getStatus();
  
  if (status.running && status.redisConnected) {
    res.status(200).json(status);
  } else {
    res.status(503).json(status);
  }
});
```

### Metrics

Export metrics to Prometheus:

```typescript
import { register, Counter, Gauge, Histogram } from 'prom-client';

const eventsGenerated = new Counter({
  name: 'darkcity_events_generated_total',
  help: 'Total events generated',
  labelNames: ['type']
});

const activeEvents = new Gauge({
  name: 'darkcity_active_events',
  help: 'Currently active events'
});

const eventProcessingTime = new Histogram({
  name: 'darkcity_event_processing_seconds',
  help: 'Event processing time'
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Logging

Use structured logging:

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

engine.on('event:generated', (event) => {
  logger.info('Event generated', {
    eventId: event.id,
    type: event.type,
    timestamp: event.timestamp
  });
});
```

## Scaling Strategy

### Horizontal Scaling

1. **Multiple Engine Instances**: Run multiple instances behind a load balancer
2. **Zone Partitioning**: Different instances handle different zones
3. **Redis Cluster**: Scale Redis horizontally for pub/sub

### Vertical Scaling

- Increase tick rate for more frequent events
- Adjust event probabilities per zone
- Optimize event processing pipeline

### Load Testing

```bash
# Install artillery
npm install -g artillery

# Load test
artillery quick --count 10 --num 100 http://localhost:3000/events
```

## Backup and Recovery

### Redis Backup
```bash
# Manual backup
redis-cli BGSAVE

# Automated (cron)
0 */6 * * * redis-cli BGSAVE
```

### PostgreSQL Backup
```bash
# Full backup
pg_dump darkcity > backup_$(date +%Y%m%d).sql

# Restore
psql darkcity < backup.sql
```

## Troubleshooting

### High Memory Usage
- Reduce event retention period
- Enable event archival
- Increase cleanup frequency

### Redis Connection Issues
- Check Redis server status
- Verify network connectivity
- Check connection limits

### Slow Event Processing
- Profile event handlers
- Check database query performance
- Scale horizontally

## Security

### Redis Security
```
requirepass your_strong_password
bind 127.0.0.1
protected-mode yes
```

### Network Security
- Use TLS for Redis connections
- Firewall rules for internal communication only
- VPC/Private networking

### Access Control
- API authentication required
- Role-based permissions
- Rate limiting

## Environment Variables

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=darkcity:

# Engine
TICK_INTERVAL=100
GLOBAL_EVENT_RATE=1.0
ENABLE_SCHEDULED=true
ENABLE_RANDOM=true

# Storage
RETENTION_DAYS=90
ENABLE_PERSISTENCE=true

# Monitoring
METRICS_PORT=9090
LOG_LEVEL=info
```

## Performance Tuning

### Node.js
```bash
# Increase memory limit
node --max-old-space-size=4096 dist/index.js
```

### Redis
```
# Optimize pub/sub
client-output-buffer-limit pubsub 64mb 16mb 60
tcp-backlog 511
```

### Event Engine
```typescript
{
  tickInterval: 50,  // Faster ticks (20/sec)
  globalEventRate: 2.0,  // More events
  maxRetries: 5  // More robust
}
```

---

For questions or issues, see the main README or contact the DARKCITY team.
