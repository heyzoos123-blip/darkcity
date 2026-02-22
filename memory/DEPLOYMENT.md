# DARKCITY Memory System - Deployment Guide

## 🚢 Production Deployment

This guide covers deploying the DARKCITY Memory System to production.

---

## Prerequisites

### Infrastructure Required

1. **PostgreSQL 14+**
   - Minimum: 2 CPU, 4GB RAM
   - Recommended: 4 CPU, 16GB RAM
   - Storage: 100GB+ (grows with agents)

2. **Redis 6+**
   - Minimum: 1 CPU, 2GB RAM
   - Recommended: 2 CPU, 4GB RAM
   - Persistence enabled

3. **Qdrant 1.7+**
   - Minimum: 2 CPU, 4GB RAM
   - Recommended: 4 CPU, 8GB RAM
   - Storage: 50GB+ for vectors

4. **LLM API Access**
   - Anthropic Claude (for consolidation)
   - OpenAI (for embeddings)

---

## Quick Start with Docker Compose

### 1. Create docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: timescale/timescaledb:latest-pg14
    environment:
      POSTGRES_DB: darkcity
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

  qdrant:
    image: qdrant/qdrant:v1.7.0
    volumes:
      - qdrant_data:/qdrant/storage
    ports:
      - "6333:6333"
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  qdrant_data:
```

### 2. Start Infrastructure

```bash
docker-compose up -d
```

### 3. Run Migrations

```bash
npm run migrate
```

### 4. Configure Environment

```bash
cp .env.example .env
# Edit .env with your production values
```

---

## Kubernetes Deployment

### 1. Create Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: darkcity
```

### 2. Deploy PostgreSQL (StatefulSet)

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: darkcity
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: timescale/timescaledb:latest-pg14
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: darkcity
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

### 3. Deploy Redis (StatefulSet)

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: darkcity
spec:
  serviceName: redis
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command: ["redis-server", "--appendonly", "yes"]
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 20Gi
```

### 4. Deploy Qdrant (StatefulSet)

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: qdrant
  namespace: darkcity
spec:
  serviceName: qdrant
  replicas: 1
  selector:
    matchLabels:
      app: qdrant
  template:
    metadata:
      labels:
        app: qdrant
    spec:
      containers:
      - name: qdrant
        image: qdrant/qdrant:v1.7.0
        ports:
        - containerPort: 6333
        volumeMounts:
        - name: data
          mountPath: /qdrant/storage
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
```

### 5. Deploy Memory Service

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: darkcity-memory
  namespace: darkcity
spec:
  replicas: 3
  selector:
    matchLabels:
      app: darkcity-memory
  template:
    metadata:
      labels:
        app: darkcity-memory
    spec:
      containers:
      - name: memory
        image: darkcity/memory:latest
        env:
        - name: POSTGRES_HOST
          value: postgres.darkcity.svc.cluster.local
        - name: REDIS_HOST
          value: redis.darkcity.svc.cluster.local
        - name: QDRANT_URL
          value: http://qdrant.darkcity.svc.cluster.local:6333
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: llm-secrets
              key: anthropic-key
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: llm-secrets
              key: openai-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
```

---

## Automated Consolidation

### Cron Job for Nightly Consolidation

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: memory-consolidation
  namespace: darkcity
spec:
  schedule: "0 4 * * *"  # 4 AM daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: consolidate
            image: darkcity/memory:latest
            command: ["npm", "run", "consolidate"]
            env:
            - name: POSTGRES_HOST
              value: postgres.darkcity.svc.cluster.local
            - name: REDIS_HOST
              value: redis.darkcity.svc.cluster.local
            - name: QDRANT_URL
              value: http://qdrant.darkcity.svc.cluster.local:6333
            - name: ANTHROPIC_API_KEY
              valueFrom:
                secretKeyRef:
                  name: llm-secrets
                  key: anthropic-key
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: llm-secrets
                  key: openai-key
          restartPolicy: OnFailure
```

---

## Monitoring

### Health Checks

Add health check endpoint:

```typescript
app.get('/health', async (req, res) => {
  const memory = new MemorySystem();
  const health = await memory.healthCheck();
  
  const isHealthy = health.postgres && health.redis && health.qdrant;
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    services: health,
  });
});
```

### Metrics to Track

1. **Experience Recording**
   - Rate (experiences/second)
   - Latency (p50, p95, p99)
   - Error rate

2. **Memory Retrieval**
   - Query latency
   - Cache hit rate
   - Vector search performance

3. **Consolidation**
   - Success rate
   - Processing time per agent
   - Failed jobs

4. **Database**
   - Connection pool utilization
   - Query performance
   - Storage growth

### Prometheus Metrics

```typescript
import { Counter, Histogram } from 'prom-client';

const experienceCounter = new Counter({
  name: 'darkcity_experiences_total',
  help: 'Total experiences recorded',
  labelNames: ['type', 'agent_id'],
});

const retrievalLatency = new Histogram({
  name: 'darkcity_retrieval_duration_seconds',
  help: 'Memory retrieval latency',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

const consolidationDuration = new Histogram({
  name: 'darkcity_consolidation_duration_seconds',
  help: 'Consolidation processing time per agent',
  buckets: [1, 5, 10, 30, 60],
});
```

---

## Scaling

### Horizontal Scaling

- **Memory Service**: Scale to 3-10 replicas
- **Consolidation Jobs**: Parallel processing via concurrency config
- **Database Read Replicas**: 2-3 replicas for queries

### Vertical Scaling

- **PostgreSQL**: Increase RAM for larger working sets
- **Qdrant**: More RAM = better vector search performance
- **Redis**: Sufficient RAM for all working memory

### Partitioning Strategy

When you reach 100K+ agents:

```sql
-- Partition experiences by agent_id
CREATE TABLE experiences_partitioned (
    LIKE experiences INCLUDING ALL
) PARTITION BY HASH (agent_id);

-- Create partitions
CREATE TABLE experiences_p0 PARTITION OF experiences_partitioned
    FOR VALUES WITH (MODULUS 10, REMAINDER 0);
    
-- Repeat for p1-p9
```

---

## Backup Strategy

### PostgreSQL Backups

```bash
# Daily full backup
pg_dump darkcity | gzip > backup_$(date +%Y%m%d).sql.gz

# Continuous archiving (WAL)
archive_mode = on
archive_command = 'cp %p /mnt/backups/wal/%f'
```

### Qdrant Backups

```bash
# Snapshot Qdrant collections
curl -X POST "http://localhost:6333/collections/agent_memories/snapshots"

# Download snapshot
curl -O "http://localhost:6333/collections/agent_memories/snapshots/{snapshot-name}"
```

### Redis Backups

```bash
# Save snapshot
redis-cli BGSAVE

# Copy RDB file
cp /var/lib/redis/dump.rdb /mnt/backups/redis/
```

---

## Security

### Network Security

- Use VPC/private subnets for databases
- Firewall rules: Allow only from app servers
- TLS for all connections

### Secrets Management

```yaml
# Kubernetes secrets
apiVersion: v1
kind: Secret
metadata:
  name: llm-secrets
  namespace: darkcity
type: Opaque
data:
  anthropic-key: <base64-encoded>
  openai-key: <base64-encoded>
```

### Database Security

- Unique credentials per service
- Least privilege principle
- Regular password rotation
- Audit logging enabled

---

## Cost Optimization

### LLM Costs

- **Consolidation**: ~$0.01 per agent per day (Claude Sonnet)
- **Embeddings**: ~$0.0001 per experience (OpenAI)

**Optimization**:
- Batch embedding generation
- Cache common queries
- Use cheaper models for routine tasks

### Storage Costs

- **PostgreSQL**: ~50GB per 10K agents per year
- **Qdrant**: ~20GB per 10K agents (vectors)
- **Redis**: ~500MB per 1K active agents

**Optimization**:
- Archive old experiences to S3/R2
- Compress older summaries
- TTL on working memory

---

## Troubleshooting

### Common Issues

**1. Slow consolidation**
- Check LLM API rate limits
- Increase concurrency
- Optimize database queries

**2. High memory usage**
- Reduce working memory TTL
- Implement connection pooling
- Review query complexity

**3. Vector search slow**
- Increase Qdrant RAM
- Optimize HNSW parameters
- Reduce vector dimensions

**4. Database locks**
- Check long-running queries
- Optimize indexes
- Review transaction isolation

---

## Performance Tuning

### PostgreSQL

```sql
-- Increase shared_buffers
shared_buffers = 8GB

-- Connection pooling
max_connections = 200

-- Query optimization
work_mem = 128MB
maintenance_work_mem = 2GB
```

### Redis

```conf
maxmemory 4gb
maxmemory-policy allkeys-lru
```

### Qdrant

```yaml
storage:
  optimizers:
    default_segment_number: 2
  hnsw_config:
    m: 16
    ef_construct: 100
```

---

## Support

For production support and enterprise deployments:
- GitHub Issues: `github.com/darkflobi/darkcity`
- Email: support@darkcity.ai

---

**Built by darkflobi**  
*"Every experience matters. Every memory persists."*
