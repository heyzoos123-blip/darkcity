# DARKCITY Deployment Guide

Complete guide for deploying the unified DARKCITY application.

## 📋 Prerequisites

- **Node.js** 18+ and npm 9+
- **Docker** 20+ and Docker Compose
- **PostgreSQL** 15+ (or use Docker)
- **Redis** 7+ (or use Docker)
- **API Keys**: Anthropic or OpenAI (for LLM features)

## 🚀 Quick Start (Development)

### 1. One-Command Setup

```bash
git clone <repository>
cd projects/darkcity
chmod +x scripts/*.sh
./scripts/setup.sh
```

This will:
- Install all dependencies
- Generate Prisma client
- Start Docker services (PostgreSQL, Redis, Qdrant)
- Run database migrations

### 2. Configure Environment

Edit `.env` file with your API keys:

```env
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

### 3. Start Development Environment

```bash
./scripts/dev.sh
```

Access:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **WebSocket**: ws://localhost:3001

## 🐳 Docker Deployment (Production)

### Using Docker Compose

```bash
# Build and deploy
./scripts/deploy.sh

# Or manually:
docker-compose -f docker-compose.unified.yml up -d

# View logs
docker-compose -f docker-compose.unified.yml logs -f

# Stop
docker-compose -f docker-compose.unified.yml down
```

### Environment Variables (Production)

Copy `.env.unified.example` to `.env` and configure:

```env
NODE_ENV=production
POSTGRES_PASSWORD=strong_password_here
REDIS_PASSWORD=strong_password_here
ANTHROPIC_API_KEY=your_key
FRONTEND_URL=https://darkcity.wtf
NEXT_PUBLIC_API_URL=https://api.darkcity.wtf
NEXT_PUBLIC_WS_URL=wss://api.darkcity.wtf
```

## 📦 Manual Deployment

### Backend

```bash
cd apps/backend

# Install dependencies
npm install

# Build
npm run build

# Run migrations
npm run migrate

# Start
npm start
```

### Frontend

```bash
cd apps/frontend

# Install dependencies
npm install

# Build
npm run build

# Start
npm start
```

## 🗄️ Database Management

### Run Migrations

```bash
npm run migrate
```

### Create Migration

```bash
npm run migrate:dev
```

### Open Prisma Studio

```bash
npm run prisma:studio
```

### Seed Database

```bash
cd apps/backend
npm run seed
```

## 🔧 Useful Commands

```bash
# View all logs
npm run docker:logs

# Restart all services
npm run docker:restart

# Clean all build artifacts
npm run clean

# Run tests
npm run test

# Build for production
npm run build
```

## 🌐 Reverse Proxy (Nginx)

For production, use Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name darkcity.wtf;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name api.darkcity.wtf;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 🔒 Security Checklist

- [ ] Change default database passwords
- [ ] Use environment variables for secrets
- [ ] Enable HTTPS/SSL (Let's Encrypt)
- [ ] Set up firewall rules
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up monitoring (Grafana, Prometheus)
- [ ] Configure backups

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-22T00:00:00.000Z",
  "services": {
    "database": true,
    "events": true,
    "memory": true,
    "interactions": true
  }
}
```

### Docker Health Checks

```bash
docker-compose -f docker-compose.unified.yml ps
```

## 🐛 Troubleshooting

### Database Connection Fails

```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.unified.yml logs postgres

# Restart database
docker-compose -f docker-compose.unified.yml restart postgres
```

### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001
kill -9 <PID>

# Or change port in .env
PORT=3002
```

### Prisma Client Out of Sync

```bash
cd packages/database
npx prisma generate
```

### Clear All Data

```bash
docker-compose -f docker-compose.unified.yml down -v
npm run setup
```

## 📈 Scaling

### Horizontal Scaling

Use Kubernetes for production scale:

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: darkcity-backend
spec:
  replicas: 3
  # ... (see k8s directory for full manifests)
```

### Load Balancing

- Use Nginx or HAProxy
- Enable Redis Pub/Sub for multi-instance WebSocket
- Use read replicas for PostgreSQL

## 🎯 Performance Tuning

### PostgreSQL

```sql
-- Increase connection pool
ALTER SYSTEM SET max_connections = 200;

-- Optimize for writes
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET work_mem = '16MB';
```

### Redis

```bash
# Enable persistence
CONFIG SET appendonly yes
CONFIG SET save "900 1 300 10 60 10000"
```

## 📝 Backup & Restore

### Database Backup

```bash
docker-compose -f docker-compose.unified.yml exec postgres pg_dump -U darkcity darkcity > backup.sql
```

### Restore

```bash
docker-compose -f docker-compose.unified.yml exec -T postgres psql -U darkcity darkcity < backup.sql
```

---

**For more information, see:**
- [README.md](./README_UNIFIED.md) - Project overview
- [INTEGRATION.md](./INTEGRATION_UNIFIED.md) - Architecture details
- [API.md](./API_UNIFIED.md) - API documentation
