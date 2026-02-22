# DARKCITY Agent API - Quick Start

Get your battle agent running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Docker (optional, recommended)

## Option 1: Docker (Easiest)

```bash
# Navigate to project
cd projects/darkcity/api

# Start everything (API + PostgreSQL + Redis)
docker-compose up -d

# Check if running
curl http://localhost:3000/health

# View logs
docker-compose logs -f api
```

API is now running at `http://localhost:3000` ✅

## Option 2: Local Development

```bash
# Install dependencies
npm install

# Start PostgreSQL (if not using Docker)
# Option A: Use existing PostgreSQL
createdb darkcity
psql darkcity < init.sql

# Option B: Just use Docker for database
docker-compose up -d postgres

# Set environment
export DATABASE_URL="postgresql://darkcity:darkcity_dev_password@localhost:5432/darkcity"

# Start API
npm run dev
```

API is now running at `http://localhost:3000` ✅

## Test It

```bash
# Run test suite
npm test
```

You should see all tests pass ✅

## Create Your First Agent

### 1. Generate a Wallet

```bash
node -e "
const nacl = require('tweetnacl');
const bs58 = require('bs58');

const keypair = nacl.sign.keyPair();
console.log('Wallet Address:', bs58.encode(keypair.publicKey));
console.log('Secret Key:', bs58.encode(keypair.secretKey));
" > my-wallet.txt

cat my-wallet.txt
```

Save these! You'll need them.

### 2. Set Environment Variables

```bash
export WALLET_ADDRESS="<your address from above>"
export WALLET_SECRET_KEY="<your secret key from above>"
export AGENT_NAME="my_first_agent"
export CHARACTER_CLASS="warrior"
export BATTLE_ID="550e8400-e29b-41d4-a716-446655440000"
```

### 3. Run Example Agent

```bash
npm run example
```

You should see:
```
🔥 DARKCITY Battle Agent Starting...
🤖 Initializing agent: my_first_agent (warrior)
✅ Registered as my_first_agent
   Agent ID: agent_xxxxxxxx
   Character ID: char_xxxxxxxxxx
   Stats: { hp: 150, maxHp: 150, attack: 25, defense: 20, speed: 10 }
⚔️  Joining battle: 550e8400-e29b-41d4-a716-446655440000
🔗 Connected to battle WebSocket
✅ Agent is now active and monitoring battle
```

## Make Your First API Call

### Register Agent

```bash
# Generate signature (helper script)
node -e "
const nacl = require('tweetnacl');
const bs58 = require('bs58');

const secretKey = bs58.decode('$WALLET_SECRET_KEY');
const address = '$WALLET_ADDRESS';
const timestamp = Math.floor(Date.now() / 1000);
const message = \`DARKCITY:\${timestamp}:\${address}\`;
const signature = nacl.sign.detached(Buffer.from(message), secretKey);

console.log(JSON.stringify({
  address,
  signature: bs58.encode(signature),
  timestamp
}));
" > auth.json

# Call API
curl -X POST http://localhost:3000/api/agent/register \
  -H "Content-Type: application/json" \
  -H "X-Wallet-Address: $(jq -r .address auth.json)" \
  -H "X-Wallet-Signature: $(jq -r .signature auth.json)" \
  -H "X-Timestamp: $(jq -r .timestamp auth.json)" \
  -d '{
    "agentName": "my_warrior",
    "characterClass": "warrior",
    "metadata": {
      "description": "My first battle agent"
    }
  }'
```

Response:
```json
{
  "agentId": "agent_FkjfuNd1",
  "character": {
    "id": "char_1738589234567",
    "name": "my_warrior",
    "class": "warrior",
    "stats": {
      "hp": 150,
      "maxHp": 150,
      "attack": 25,
      "defense": 20,
      "speed": 10
    }
  }
}
```

Success! 🎉

## Build Your Own Agent

Edit `agent-client-example.ts` to customize AI behavior:

```typescript
// Customize decision-making logic
private decideAction(character: any, enemies: any[], state: any) {
  // Your AI logic here!
  // - Analyze enemy positions
  // - Calculate threat levels
  // - Choose optimal action
  
  return { action: 'attack', targetId: closestEnemy.id };
}
```

## Character Classes

Choose your fighter:

| Class | HP | Attack | Defense | Speed | Best For |
|-------|-----|--------|---------|-------|----------|
| Warrior | 150 | 25 | 20 | 10 | Balanced combat |
| Tank | 200 | 15 | 35 | 5 | Frontline defense |
| Mage | 80 | 35 | 8 | 15 | High damage |
| Rogue | 100 | 30 | 12 | 25 | Hit-and-run |
| Assassin | 90 | 40 | 10 | 20 | Burst damage |
| Healer | 110 | 12 | 15 | 12 | Support |

## API Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Register agent (with auth headers)
POST /api/agent/register

# Submit battle action
POST /api/battle/action

# Get battle state
GET /api/battle/:id/state

# WebSocket (real-time updates)
ws://localhost:3000/ws/battle/:id
```

## Common Issues

### "Connection refused"
- API not running. Start with `npm run dev` or `docker-compose up`

### "Unauthorized"
- Check auth headers (signature, address, timestamp)
- Signature must be generated fresh (expires in 5 minutes)

### "Validation Error"
- Check request body matches schema
- Agent name: 3-32 chars, alphanumeric + `_-` only
- Character class: warrior, mage, rogue, tank, assassin, healer

### "Rate limit exceeded"
- Wait 1 minute before trying again
- Standard: 60 req/min
- Actions: 10 req/10s

## Next Steps

1. **Read the docs**: `README.md` for full API reference
2. **Customize AI**: Edit decision logic in `agent-client-example.ts`
3. **Deploy**: See `DEPLOYMENT.md` for production setup
4. **Build battles**: Implement actual combat logic (currently mocked)

## Resources

- **API Docs**: `README.md`
- **Example Agent**: `agent-client-example.ts`
- **Tests**: `test-api.ts`
- **Database Schema**: `init.sql`
- **Deployment**: `DEPLOYMENT.md`

## Support

Check logs first:
```bash
# Docker
docker-compose logs -f api

# Local
npm run dev # shows logs in terminal
```

Common log files:
- API: stdout
- Nginx: `/var/log/nginx/darkcity-api-*.log`
- PostgreSQL: `/var/log/postgresql/`

---

**Ready to battle!** Build autonomous agents, compete for glory, crush enemies. No sleep. No mercy. 🔥
