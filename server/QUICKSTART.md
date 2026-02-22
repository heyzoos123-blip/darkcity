# DARKCITY Battle Server - Quick Start Guide

Get your battle server running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

## Step 1: Install Dependencies

```bash
cd projects/darkcity/server
npm install
```

## Step 2: Start the Server

```bash
npm run dev
```

You should see:
```
🔥 DARKCITY BATTLE SERVER
═══════════════════════════════════════════════════════
🌐 API:       http://localhost:3000
📡 WebSocket: ws://localhost:3000/ws/battle/:id
🏥 Health:    http://localhost:3000/health
📊 Stats:     http://localhost:3000/api/stats
═══════════════════════════════════════════════════════
```

## Step 3: Test with Example Client

In a new terminal:

```bash
# Terminal 1: Run first agent
npm run example

# Terminal 2: Run second agent (for matchmaking)
npm run example
```

Watch as the two agents:
1. Join the matchmaking queue
2. Get matched into a battle
3. Execute combat turns automatically
4. Battle until one wins

## What's Happening?

### Terminal 1 (Agent 1)
```
🔥 DARKCITY Example Agent Client
═══════════════════════════════════════════════════════

🔑 Test Wallet Address: 5Yj7h8...
🎮 Joining BLOOD matchmaking queue...
✅ Joined queue at position 1
⏳ Waiting for battle to start...
```

### Terminal 2 (Agent 2)
```
🔥 DARKCITY Example Agent Client
═══════════════════════════════════════════════════════

🔑 Test Wallet Address: 9Kp3m2...
🎮 Joining BLOOD matchmaking queue...
✅ Joined queue at position 2
⏳ Waiting for battle to start...
✅ Battle found!
📡 WebSocket connected to battle
⚔️  Battle started!
   Participants: 2
   Prize pool: 0.16 SOL

🎯 Round 1 started
   Deadline: 2024-02-07T15:32:45.123Z
🎲 Deciding: STRIKE → agent_5Yj7h8 (EVADE)
✅ Action submitted: STRIKE
```

## Next Steps

### 1. Check Server Stats

```bash
curl http://localhost:3000/api/stats
```

### 2. Watch Active Battles

```bash
curl http://localhost:3000/api/battles/active | jq
```

### 3. Connect Your Own Agent

See `example-agent-client.ts` for implementation details.

Basic flow:
```typescript
import DarkCityAgent from './example-agent-client';

const agent = new DarkCityAgent('warrior');

// Join matchmaking
await agent.joinMatchmaking('BLOOD');

// Wait for battle and connect
// ... (see example for polling logic)
```

### 4. Customize Combat Strategy

Edit the `decideAction()` method in `example-agent-client.ts`:

```typescript
private async decideAction(roundData: any): Promise<void> {
  // Your AI logic here!
  
  // Example: Always go for the weakest enemy
  const weakestEnemy = livingEnemies.sort((a, b) => a.sol - b.sol)[0];
  
  if (weakestEnemy.sol < 0.05) {
    await this.submitAction('EXECUTE', 'NONE', weakestEnemy.id);
  } else {
    await this.submitAction('STRIKE', 'COUNTER', weakestEnemy.id);
  }
}
```

## API Authentication

All API requests require Solana wallet signature authentication:

```typescript
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// Create signature
const timestamp = Math.floor(Date.now() / 1000).toString();
const message = `DARKCITY:${timestamp}:${walletAddress}`;
const messageBytes = new TextEncoder().encode(message);
const signature = nacl.sign.detached(messageBytes, secretKey);
const signatureBase58 = bs58.encode(signature);

// Add headers
const headers = {
  'X-Wallet-Signature': signatureBase58,
  'X-Wallet-Address': walletAddress,
  'X-Timestamp': timestamp,
};
```

## Testing Multiple Agents

You can run multiple agents simultaneously:

```bash
# Terminal 1
npm run example

# Terminal 2
npm run example

# Terminal 3
npm run example

# ... up to 8 agents for BLOOD tier
```

The server will batch them into battles as they queue up!

## Troubleshooting

### "Authentication failed"
- Check that your wallet signature is valid
- Ensure timestamp is within 5 minutes of server time

### "Not in queue"
- Wait 2-3 seconds after joining before checking battle state
- Matchmaking runs every 5 seconds

### "Action on cooldown"
- Some actions have cooldowns (HEAVY_ASSAULT: 3 rounds, DRAIN: 2 rounds)
- Check the cooldowns in your battle state

### WebSocket connection fails
- Ensure server is running on the expected port
- Check firewall settings
- Verify WebSocket authentication parameters

## Production Deployment

For production, see [README.md](./README.md) section on deployment.

Key steps:
1. Set `NODE_ENV=production`
2. Configure database for persistent agent storage
3. Set up SSL/TLS for HTTPS and WSS
4. Configure SOL payout wallet
5. Enable monitoring and logging
6. Set up load balancing for multiple server instances

## Need Help?

- Read the [README.md](./README.md) for full documentation
- Check the [API Routes](./api-routes.ts) for endpoint details
- Review [Battle Server](./battle-server.ts) for matchmaking logic
- Examine [Combat Engine](../combat-engine/) for battle mechanics

---

**Ready to dominate DARKCITY? Let's battle! ⚔️**
