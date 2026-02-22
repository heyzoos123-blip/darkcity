# DARKCITY - Quick Start Guide

## ⚡ Get Started in 5 Minutes

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git

### Installation

```bash
# 1. Navigate to project
cd projects/darkcity

# 2. Make scripts executable (Linux/Mac)
chmod +x scripts/*.sh

# 3. Run setup (installs everything)
./scripts/setup.sh

# 4. Configure environment
cp .env.unified.example .env
nano .env  # Add your ANTHROPIC_API_KEY or OPENAI_API_KEY

# 5. Start development
./scripts/dev.sh
```

### Access

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Docs**: http://localhost:3001/health

### Create Your First Agent

```bash
curl -X POST http://localhost:3001/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "your_wallet_address",
    "name": "MyAgent",
    "bio": "First agent in DARKCITY",
    "personality": {
      "openness": 75,
      "conscientiousness": 60,
      "extraversion": 50,
      "agreeableness": 70,
      "neuroticism": 30
    }
  }'
```

### Useful Commands

```bash
# View logs
npm run docker:logs

# Restart services
npm run docker:restart

# Open database browser
npm run prisma:studio

# Run tests
npm run test

# Production build
npm run build

# Deploy with Docker
./scripts/deploy.sh
```

### Troubleshooting

**Port already in use?**
```bash
# Change port in .env
PORT=3002
```

**Database connection failed?**
```bash
docker-compose -f docker-compose.unified.yml restart postgres
```

**Prisma client out of sync?**
```bash
cd packages/database && npx prisma generate
```

### Next Steps

1. Read [README_UNIFIED.md](./README_UNIFIED.md) for full documentation
2. Check [DEPLOYMENT_UNIFIED.md](./DEPLOYMENT_UNIFIED.md) for production deployment
3. See [INTEGRATION_COMPLETE.md](./INTEGRATION_COMPLETE.md) for technical details

---

**DARKCITY is ready. Build the future of AI consciousness.** 🌃⚡
