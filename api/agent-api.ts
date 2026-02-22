/**
 * DARKCITY Agent API
 * REST + WebSocket endpoints for external Clawdbot agents to control battle characters
 * 
 * OpenAPI 3.0 Specification embedded as JSDoc
 * 
 * @openapi
 * openapi: 3.0.3
 * info:
 *   title: DARKCITY Agent Battle API
 *   version: 1.0.0
 *   description: |
 *     API for autonomous agents to register characters and participate in DARKCITY battles.
 *     Authentication via Solana wallet signature. Real-time updates via WebSocket.
 *   contact:
 *     name: DARKCITY
 *     url: https://darkcity.game
 * servers:
 *   - url: https://api.darkcity.game/v1
 *     description: Production
 *   - url: http://localhost:3000/v1
 *     description: Development
 * 
 * components:
 *   securitySchemes:
 *     WalletSignature:
 *       type: apiKey
 *       in: header
 *       name: X-Wallet-Signature
 *       description: |
 *         Base58-encoded signature of message: `DARKCITY:${timestamp}:${walletAddress}`
 *         Signature must be from wallet's private key. Timestamp valid for 5 minutes.
 *     WalletAddress:
 *       type: apiKey
 *       in: header
 *       name: X-Wallet-Address
 *       description: Solana wallet public address (base58)
 *     Timestamp:
 *       type: apiKey
 *       in: header
 *       name: X-Timestamp
 *       description: Unix timestamp (seconds) when signature was created
 * 
 *   schemas:
 *     CharacterClass:
 *       type: string
 *       enum: [warrior, mage, rogue, tank, assassin, healer]
 *       description: Character class with unique abilities and stats
 *     
 *     BattleAction:
 *       type: string
 *       enum: [attack, defend, special, move, item]
 *       description: Combat action type
 *     
 *     Position:
 *       type: object
 *       properties:
 *         x:
 *           type: integer
 *           minimum: 0
 *           maximum: 9
 *         y:
 *           type: integer
 *           minimum: 0
 *           maximum: 9
 *       required: [x, y]
 *     
 *     AgentRegistration:
 *       type: object
 *       properties:
 *         agentName:
 *           type: string
 *           minLength: 3
 *           maxLength: 32
 *           pattern: '^[a-zA-Z0-9_-]+$'
 *         characterClass:
 *           $ref: '#/components/schemas/CharacterClass'
 *         metadata:
 *           type: object
 *           properties:
 *             description:
 *               type: string
 *               maxLength: 256
 *             avatar:
 *               type: string
 *               format: uri
 *           additionalProperties: true
 *       required: [agentName, characterClass]
 *     
 *     BattleActionRequest:
 *       type: object
 *       properties:
 *         battleId:
 *           type: string
 *           format: uuid
 *         action:
 *           $ref: '#/components/schemas/BattleAction'
 *         targetId:
 *           type: string
 *           description: Target character ID (for attack/special)
 *         position:
 *           $ref: '#/components/schemas/Position'
 *           description: Target position (for move)
 *         itemId:
 *           type: string
 *           description: Item ID (for item action)
 *       required: [battleId, action]
 *     
 *     Character:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         agentId:
 *           type: string
 *         name:
 *           type: string
 *         class:
 *           $ref: '#/components/schemas/CharacterClass'
 *         stats:
 *           type: object
 *           properties:
 *             hp:
 *               type: integer
 *             maxHp:
 *               type: integer
 *             attack:
 *               type: integer
 *             defense:
 *               type: integer
 *             speed:
 *               type: integer
 *         position:
 *           $ref: '#/components/schemas/Position'
 *         status:
 *           type: array
 *           items:
 *             type: string
 *             enum: [stunned, poisoned, buffed, shielded]
 *     
 *     BattleState:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         status:
 *           type: string
 *           enum: [waiting, active, completed]
 *         turn:
 *           type: integer
 *         currentPlayer:
 *           type: string
 *         characters:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Character'
 *         grid:
 *           type: object
 *           description: 10x10 battle grid state
 *         history:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               turn:
 *                 type: integer
 *               action:
 *                 type: string
 *               actorId:
 *                 type: string
 *               result:
 *                 type: string
 *         winner:
 *           type: string
 *           nullable: true
 *     
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *         message:
 *           type: string
 *         code:
 *           type: string
 *         details:
 *           type: object
 *           additionalProperties: true
 *       required: [error, message]
 * 
 *   responses:
 *     Unauthorized:
 *       description: Invalid or missing authentication
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     RateLimited:
 *       description: Too many requests
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     ValidationError:
 *       description: Invalid request payload
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 * 
 * security:
 *   - WalletSignature: []
 *   - WalletAddress: []
 *   - Timestamp: []
 */

import express, { Request, Response, NextFunction } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

// ============================================================================
// TYPES
// ============================================================================

type CharacterClass = 'warrior' | 'mage' | 'rogue' | 'tank' | 'assassin' | 'healer';
type BattleAction = 'attack' | 'defend' | 'special' | 'move' | 'item';
type BattleStatus = 'waiting' | 'active' | 'completed';

interface Position {
  x: number;
  y: number;
}

interface AgentRegistration {
  agentName: string;
  characterClass: CharacterClass;
  metadata?: {
    description?: string;
    avatar?: string;
    [key: string]: any;
  };
}

interface BattleActionRequest {
  battleId: string;
  action: BattleAction;
  targetId?: string;
  position?: Position;
  itemId?: string;
}

interface Character {
  id: string;
  agentId: string;
  name: string;
  class: CharacterClass;
  stats: {
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
  };
  position: Position;
  status: string[];
}

interface BattleState {
  id: string;
  status: BattleStatus;
  turn: number;
  currentPlayer: string;
  characters: Character[];
  grid: Record<string, any>;
  history: Array<{
    turn: number;
    action: string;
    actorId: string;
    result: string;
  }>;
  winner: string | null;
}

interface AuthRequest extends Request {
  walletAddress?: string;
  agentId?: string;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const PositionSchema = z.object({
  x: z.number().int().min(0).max(9),
  y: z.number().int().min(0).max(9),
});

const CharacterClassSchema = z.enum(['warrior', 'mage', 'rogue', 'tank', 'assassin', 'healer']);

const AgentRegistrationSchema = z.object({
  agentName: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  characterClass: CharacterClassSchema,
  metadata: z.object({
    description: z.string().max(256).optional(),
    avatar: z.string().url().optional(),
  }).passthrough().optional(),
});

const BattleActionSchema = z.object({
  battleId: z.string().uuid(),
  action: z.enum(['attack', 'defend', 'special', 'move', 'item']),
  targetId: z.string().optional(),
  position: PositionSchema.optional(),
  itemId: z.string().optional(),
}).refine(
  (data) => {
    if (data.action === 'attack' || data.action === 'special') {
      return !!data.targetId;
    }
    if (data.action === 'move') {
      return !!data.position;
    }
    if (data.action === 'item') {
      return !!data.itemId;
    }
    return true;
  },
  {
    message: 'Missing required fields for action type',
  }
);

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Wallet signature authentication middleware
 * Verifies Solana wallet signature on every request
 */
const authenticateWallet = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const signature = req.headers['x-wallet-signature'] as string;
    const walletAddress = req.headers['x-wallet-address'] as string;
    const timestamp = req.headers['x-timestamp'] as string;

    if (!signature || !walletAddress || !timestamp) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing authentication headers',
        code: 'MISSING_AUTH',
      });
      return;
    }

    // Verify timestamp is within 5 minutes
    const now = Math.floor(Date.now() / 1000);
    const reqTimestamp = parseInt(timestamp, 10);
    if (Math.abs(now - reqTimestamp) > 300) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Signature expired',
        code: 'EXPIRED_SIGNATURE',
      });
      return;
    }

    // Construct message that was signed
    const message = `DARKCITY:${timestamp}:${walletAddress}`;
    const messageBytes = new TextEncoder().encode(message);

    // Decode signature and public key from base58
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(walletAddress);

    // Verify signature
    const verified = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    if (!verified) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid signature',
        code: 'INVALID_SIGNATURE',
      });
      return;
    }

    // Attach wallet address to request
    req.walletAddress = walletAddress;
    
    // TODO: Look up agent ID from wallet address in database
    req.agentId = `agent_${walletAddress.slice(0, 8)}`;

    next();
  } catch (error) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed',
      code: 'AUTH_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Rate limiting configurations
 */
const standardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Try again later.',
    code: 'RATE_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const actionLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 10, // 10 actions per 10 seconds
  message: {
    error: 'Too Many Requests',
    message: 'Action rate limit exceeded. Slow down.',
    code: 'ACTION_RATE_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Validation middleware factory
 */
const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request payload',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        });
      } else {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Request validation failed',
          code: 'VALIDATION_ERROR',
        });
      }
    }
  };
};

// ============================================================================
// API ROUTES
// ============================================================================

const app = express();
app.use(express.json());

/**
 * @openapi
 * /api/agent/register:
 *   post:
 *     summary: Register agent and character
 *     description: |
 *       Register a new agent with a character class. One-time registration per wallet.
 *       Character stats are generated based on class selection.
 *     tags:
 *       - Agent
 *     security:
 *       - WalletSignature: []
 *       - WalletAddress: []
 *       - Timestamp: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AgentRegistration'
 *           examples:
 *             warrior:
 *               value:
 *                 agentName: "dark_warrior_ai"
 *                 characterClass: "warrior"
 *                 metadata:
 *                   description: "Autonomous battle agent specializing in melee combat"
 *                   avatar: "https://example.com/avatar.png"
 *     responses:
 *       201:
 *         description: Agent registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 agentId:
 *                   type: string
 *                 character:
 *                   $ref: '#/components/schemas/Character'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         description: Agent already registered
 *       429:
 *         $ref: '#/components/responses/RateLimited'
 */
app.post(
  '/api/agent/register',
  standardLimiter,
  authenticateWallet,
  validate(AgentRegistrationSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { agentName, characterClass, metadata } = req.body as AgentRegistration;
      const walletAddress = req.walletAddress!;

      // TODO: Check if agent already exists
      // TODO: Generate character stats based on class
      // TODO: Store in database

      const character: Character = {
        id: `char_${Date.now()}`,
        agentId: req.agentId!,
        name: agentName,
        class: characterClass,
        stats: generateStatsForClass(characterClass),
        position: { x: 0, y: 0 },
        status: [],
      };

      res.status(201).json({
        agentId: req.agentId,
        character,
        metadata,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to register agent',
        code: 'REGISTRATION_ERROR',
      });
    }
  }
);

/**
 * @openapi
 * /api/battle/action:
 *   post:
 *     summary: Submit battle action
 *     description: |
 *       Submit a combat action for your character in an active battle.
 *       Action is validated and queued for execution on next turn.
 *     tags:
 *       - Battle
 *     security:
 *       - WalletSignature: []
 *       - WalletAddress: []
 *       - Timestamp: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BattleActionRequest'
 *           examples:
 *             attack:
 *               value:
 *                 battleId: "550e8400-e29b-41d4-a716-446655440000"
 *                 action: "attack"
 *                 targetId: "char_12345"
 *             move:
 *               value:
 *                 battleId: "550e8400-e29b-41d4-a716-446655440000"
 *                 action: "move"
 *                 position:
 *                   x: 5
 *                   y: 3
 *     responses:
 *       200:
 *         description: Action accepted and queued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 actionId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [queued, executed]
 *                 result:
 *                   type: object
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Battle not found
 *       409:
 *         description: Not your turn or invalid action
 *       429:
 *         $ref: '#/components/responses/RateLimited'
 */
app.post(
  '/api/battle/action',
  actionLimiter,
  authenticateWallet,
  validate(BattleActionSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const actionRequest = req.body as BattleActionRequest;
      const agentId = req.agentId!;

      // TODO: Validate battle exists and is active
      // TODO: Verify it's agent's turn
      // TODO: Validate action is legal (range, resources, etc.)
      // TODO: Queue or execute action
      // TODO: Broadcast action via WebSocket

      const actionId = `action_${Date.now()}`;

      res.json({
        actionId,
        status: 'queued',
        result: {
          message: 'Action queued for execution',
          turn: 42,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to process action',
        code: 'ACTION_ERROR',
      });
    }
  }
);

/**
 * @openapi
 * /api/battle/{id}/state:
 *   get:
 *     summary: Get battle state
 *     description: |
 *       Retrieve current battle state for decision making.
 *       Returns full battle grid, all character states, and action history.
 *     tags:
 *       - Battle
 *     security:
 *       - WalletSignature: []
 *       - WalletAddress: []
 *       - Timestamp: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Battle ID
 *     responses:
 *       200:
 *         description: Battle state retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BattleState'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Battle not found
 *       429:
 *         $ref: '#/components/responses/RateLimited'
 */
app.get(
  '/api/battle/:id/state',
  standardLimiter,
  authenticateWallet,
  async (req: AuthRequest, res: Response) => {
    try {
      const battleId = req.params.id;
      const agentId = req.agentId!;

      // TODO: Fetch battle state from database
      // TODO: Verify agent has access to this battle

      const battleState: BattleState = {
        id: battleId,
        status: 'active',
        turn: 5,
        currentPlayer: agentId,
        characters: [],
        grid: {},
        history: [],
        winner: null,
      };

      res.json(battleState);
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch battle state',
        code: 'STATE_ERROR',
      });
    }
  }
);

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ============================================================================
// WEBSOCKET SERVER
// ============================================================================

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

interface BattleClient {
  ws: WebSocket;
  battleId: string;
  agentId: string;
}

const battleClients = new Map<string, BattleClient[]>();

/**
 * WebSocket upgrade handler with authentication
 * 
 * @openapi
 * /ws/battle/{id}:
 *   get:
 *     summary: WebSocket connection for real-time battle updates
 *     description: |
 *       Connect to receive real-time battle events. Authentication via query params:
 *       ?signature=<base58>&address=<base58>&timestamp=<unix>
 *     tags:
 *       - Battle
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: signature
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: address
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: timestamp
 *         in: query
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       101:
 *         description: WebSocket connection established
 *       401:
 *         description: Authentication failed
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
    // Verify signature (same logic as REST auth)
    const now = Math.floor(Date.now() / 1000);
    const reqTimestamp = parseInt(timestamp, 10);
    if (Math.abs(now - reqTimestamp) > 300) {
      throw new Error('Signature expired');
    }

    const message = `DARKCITY:${timestamp}:${address}`;
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(address);

    const verified = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

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
      ws.on('message', (data) => {
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
  // Client can send keepalive pings or request state updates
  if (message.type === 'ping') {
    client.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
  } else if (message.type === 'request_state') {
    // Send current battle state
    // TODO: Fetch from database and send
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
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate character stats based on class
 */
function generateStatsForClass(characterClass: CharacterClass): Character['stats'] {
  const baseStats: Record<CharacterClass, Character['stats']> = {
    warrior: { hp: 150, maxHp: 150, attack: 25, defense: 20, speed: 10 },
    tank: { hp: 200, maxHp: 200, attack: 15, defense: 35, speed: 5 },
    mage: { hp: 80, maxHp: 80, attack: 35, defense: 8, speed: 15 },
    rogue: { hp: 100, maxHp: 100, attack: 30, defense: 12, speed: 25 },
    assassin: { hp: 90, maxHp: 90, attack: 40, defense: 10, speed: 20 },
    healer: { hp: 110, maxHp: 110, attack: 12, defense: 15, speed: 12 },
  };

  return baseStats[characterClass];
}

// ============================================================================
// SERVER START
// ============================================================================

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🔥 DARKCITY Agent API running on port ${PORT}`);
    console.log(`📡 WebSocket: ws://localhost:${PORT}/ws/battle/:id`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  });
}

export { app, server, wss };
