/**
 * DARKCITY BATTLE SERVER - MAIN ENTRY POINT
 * Integrated server with API + Combat Engine + WebSocket
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import rateLimit from 'express-rate-limit';

// Import authentication middleware from API
import { authenticateWallet } from './middleware';

// Import route handlers
import {
  joinMatchmaking,
  leaveMatchmaking,
  getQueueStatus,
  submitBattleAction,
  getCurrentBattle,
  getBattleById,
  getActiveBattles,
  getServerStats,
} from './api-routes';

// Import battle server (initializes singleton)
import { getBattleServer } from './battle-server';

// ============================================================================
// SERVER SETUP
// ============================================================================

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

app.use(express.json());

const PORT = process.env.PORT || 3000;
const battleServer = getBattleServer();

// ============================================================================
// RATE LIMITING
// ============================================================================

const standardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded',
    code: 'RATE_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const actionLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 10,
  message: {
    error: 'Too Many Requests',
    message: 'Action rate limit exceeded',
    code: 'ACTION_RATE_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================================
// API ROUTES
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime(),
  });
});

// Stats (public)
app.get('/api/stats', getServerStats);

// Matchmaking routes (authenticated)
app.post(
  '/api/matchmaking/join',
  standardLimiter,
  authenticateWallet,
  joinMatchmaking
);

app.post(
  '/api/matchmaking/leave',
  standardLimiter,
  authenticateWallet,
  leaveMatchmaking
);

app.get(
  '/api/matchmaking/status/:tier',
  standardLimiter,
  authenticateWallet,
  getQueueStatus
);

// Battle routes (authenticated)
app.post(
  '/api/battle/action',
  actionLimiter,
  authenticateWallet,
  submitBattleAction
);

app.get(
  '/api/battle/current',
  standardLimiter,
  authenticateWallet,
  getCurrentBattle
);

app.get(
  '/api/battle/:id',
  standardLimiter,
  authenticateWallet,
  getBattleById
);

app.get(
  '/api/battles/active',
  standardLimiter,
  getActiveBattles
);

// ============================================================================
// WEBSOCKET SERVER
// ============================================================================

interface BattleClient {
  ws: any;
  battleId: string;
  agentId: string;
}

const battleClients = new Map<string, BattleClient[]>();

/**
 * WebSocket upgrade handler with authentication
 */
server.on('upgrade', async (request, socket, head) => {
  const url = new URL(request.url!, `http://${request.headers.host}`);
  const battleId = url.pathname.split('/').pop();
  
  if (!battleId || !url.pathname.startsWith('/ws/battle/')) {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }

  // Extract auth from query params
  const signature = url.searchParams.get('signature');
  const address = url.searchParams.get('address');
  const timestamp = url.searchParams.get('timestamp');

  if (!signature || !address || !timestamp) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  try {
    // Verify signature (implement in middleware)
    const verified = await verifyWebSocketAuth(signature, address, timestamp);

    if (!verified) {
      throw new Error('Invalid signature');
    }

    // Upgrade connection
    wss.handleUpgrade(request, socket, head, (ws) => {
      const agentId = `agent_${address.slice(0, 8)}`;
      const client: BattleClient = { ws, battleId, agentId };

      // Add to battle room
      if (!battleClients.has(battleId)) {
        battleClients.set(battleId, []);
      }
      battleClients.get(battleId)!.push(client);

      // Send initial connection message
      ws.send(JSON.stringify({
        type: 'connected',
        battleId,
        agentId,
        timestamp: Date.now(),
      }));

      // Handle messages from client
      ws.on('message', (data: any) => {
        try {
          const message = JSON.parse(data.toString());
          handleWebSocketMessage(client, message);
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
          }));
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        const clients = battleClients.get(battleId);
        if (clients) {
          const index = clients.indexOf(client);
          if (index > -1) {
            clients.splice(index, 1);
          }
        }
      });

      wss.emit('connection', ws, request);
    });
  } catch (error) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
  }
});

/**
 * Handle WebSocket messages from clients
 */
function handleWebSocketMessage(client: BattleClient, message: any): void {
  if (message.type === 'ping') {
    client.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
  } else if (message.type === 'request_state') {
    // Send current battle state
    const battle = battleServer.getBattle(client.battleId);
    if (battle) {
      client.ws.send(JSON.stringify({
        type: 'battle_state',
        data: {
          round: battle.state.round,
          status: battle.status,
          agents: Array.from(battle.state.agents.values()).map((agent) => ({
            id: agent.id,
            sol: agent.sol,
            zone: agent.zone,
            isAlive: agent.isAlive,
          })),
        },
        timestamp: Date.now(),
      }));
    }
  }
}

/**
 * Broadcast battle event to all connected clients in a battle
 */
export function broadcastBattleEvent(battleId: string, event: any): void {
  const clients = battleClients.get(battleId);
  if (!clients) return;

  const message = JSON.stringify({
    type: 'battle_event',
    battleId,
    event,
    timestamp: Date.now(),
  });

  clients.forEach((client) => {
    if (client.ws.readyState === 1) { // WebSocket.OPEN
      client.ws.send(message);
    }
  });
}

/**
 * Verify WebSocket authentication
 */
async function verifyWebSocketAuth(
  signature: string,
  address: string,
  timestamp: string
): Promise<boolean> {
  // Import and use the same verification logic from middleware
  try {
    const nacl = require('tweetnacl');
    const bs58 = require('bs58');

    const now = Math.floor(Date.now() / 1000);
    const reqTimestamp = parseInt(timestamp, 10);
    if (Math.abs(now - reqTimestamp) > 300) {
      return false;
    }

    const message = `DARKCITY:${timestamp}:${address}`;
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(address);

    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );
  } catch (error) {
    return false;
  }
}

// ============================================================================
// BATTLE SERVER EVENT HANDLERS
// ============================================================================

battleServer.on('battle:created', (event) => {
  console.log(`🎮 Battle ${event.battleId} created (${event.tier})`);
  console.log(`   Participants: ${event.participants.length}`);
  console.log(`   Prize pool: ${event.prizePool} SOL`);
});

battleServer.on('battle:started', (event) => {
  console.log(`⚔️  Battle ${event.battleId} started`);
});

battleServer.on('battle:completed', (event) => {
  console.log(`🏆 Battle ${event.battleId} completed`);
  console.log(`   Winner: ${event.winner}`);
  console.log(`   Duration: ${Math.round(event.duration / 1000)}s`);
  
  // Log payouts
  event.payouts.forEach((amount: number, agentId: string) => {
    console.log(`   💰 ${agentId}: +${amount} SOL`);
  });
});

battleServer.on('agent:queued', (event) => {
  console.log(`➕ Agent ${event.agentId} joined ${event.tier} queue (position ${event.position})`);
});

// ============================================================================
// START SERVER
// ============================================================================

server.listen(PORT, () => {
  console.log('');
  console.log('🔥 DARKCITY BATTLE SERVER');
  console.log('═'.repeat(50));
  console.log(`🌐 API:       http://localhost:${PORT}`);
  console.log(`📡 WebSocket: ws://localhost:${PORT}/ws/battle/:id`);
  console.log(`🏥 Health:    http://localhost:${PORT}/health`);
  console.log(`📊 Stats:     http://localhost:${PORT}/api/stats`);
  console.log('═'.repeat(50));
  console.log('');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, server, wss, battleServer };
