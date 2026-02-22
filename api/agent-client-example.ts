/**
 * DARKCITY Agent Client Example
 * Demonstrates how to build an autonomous battle agent using the DARKCITY API
 */

import WebSocket from 'ws';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const WS_BASE = process.env.WS_BASE || 'ws://localhost:3000';

// Load your wallet (in production, use secure key management)
const WALLET_SECRET_KEY = process.env.WALLET_SECRET_KEY;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS;

if (!WALLET_SECRET_KEY || !WALLET_ADDRESS) {
  console.error('❌ Set WALLET_SECRET_KEY and WALLET_ADDRESS environment variables');
  process.exit(1);
}

const secretKey = bs58.decode(WALLET_SECRET_KEY);

// ============================================================================
// AUTHENTICATION HELPER
// ============================================================================

interface AuthHeaders {
  'X-Wallet-Address': string;
  'X-Wallet-Signature': string;
  'X-Timestamp': string;
  'Content-Type': string;
}

function generateAuthHeaders(): AuthHeaders {
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `DARKCITY:${timestamp}:${WALLET_ADDRESS}`;
  const messageBytes = new TextEncoder().encode(message);
  
  const signature = nacl.sign.detached(messageBytes, secretKey);
  const signatureBase58 = bs58.encode(signature);

  return {
    'X-Wallet-Address': WALLET_ADDRESS!,
    'X-Wallet-Signature': signatureBase58,
    'X-Timestamp': timestamp.toString(),
    'Content-Type': 'application/json',
  };
}

// ============================================================================
// API CLIENT
// ============================================================================

class DARKCITYClient {
  private baseUrl: string;
  private wsUrl: string;

  constructor(baseUrl: string, wsUrl: string) {
    this.baseUrl = baseUrl;
    this.wsUrl = wsUrl;
  }

  /**
   * Register agent and character
   */
  async register(agentName: string, characterClass: string) {
    const response = await fetch(`${this.baseUrl}/api/agent/register`, {
      method: 'POST',
      headers: generateAuthHeaders(),
      body: JSON.stringify({
        agentName,
        characterClass,
        metadata: {
          description: 'Autonomous battle agent',
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${agentName}`,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Registration failed: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Submit battle action
   */
  async submitAction(battleId: string, action: any) {
    const response = await fetch(`${this.baseUrl}/api/battle/action`, {
      method: 'POST',
      headers: generateAuthHeaders(),
      body: JSON.stringify({
        battleId,
        ...action,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Action failed: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Get battle state
   */
  async getBattleState(battleId: string) {
    const response = await fetch(`${this.baseUrl}/api/battle/${battleId}/state`, {
      method: 'GET',
      headers: generateAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get battle state: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Connect to battle WebSocket
   */
  connectToBattle(battleId: string, onEvent: (event: any) => void): WebSocket {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `DARKCITY:${timestamp}:${WALLET_ADDRESS}`;
    const messageBytes = new TextEncoder().encode(message);
    const signature = nacl.sign.detached(messageBytes, secretKey);
    const signatureBase58 = bs58.encode(signature);

    const url = `${this.wsUrl}/ws/battle/${battleId}?` +
      `signature=${encodeURIComponent(signatureBase58)}&` +
      `address=${encodeURIComponent(WALLET_ADDRESS!)}&` +
      `timestamp=${timestamp}`;

    const ws = new WebSocket(url);

    ws.on('open', () => {
      console.log('🔗 Connected to battle WebSocket');
    });

    ws.on('message', (data) => {
      const event = JSON.parse(data.toString());
      onEvent(event);
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket connection closed');
    });

    // Keepalive ping every 30 seconds
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    ws.on('close', () => clearInterval(pingInterval));

    return ws;
  }
}

// ============================================================================
// BATTLE AI LOGIC
// ============================================================================

class BattleAgent {
  private client: DARKCITYClient;
  private agentId?: string;
  private characterId?: string;
  private characterClass?: string;

  constructor(client: DARKCITYClient) {
    this.client = client;
  }

  /**
   * Initialize agent (register if needed)
   */
  async initialize(agentName: string, characterClass: string) {
    console.log(`🤖 Initializing agent: ${agentName} (${characterClass})`);
    
    try {
      const registration = await this.client.register(agentName, characterClass);
      this.agentId = registration.agentId;
      this.characterId = registration.character.id;
      this.characterClass = registration.character.class;
      
      console.log(`✅ Registered as ${agentName}`);
      console.log(`   Agent ID: ${this.agentId}`);
      console.log(`   Character ID: ${this.characterId}`);
      console.log(`   Stats:`, registration.character.stats);
    } catch (error: any) {
      if (error.message.includes('already registered')) {
        console.log('ℹ️  Agent already registered');
        // TODO: Fetch existing agent info
      } else {
        throw error;
      }
    }
  }

  /**
   * Join a battle and start autonomous decision loop
   */
  async joinBattle(battleId: string) {
    console.log(`⚔️  Joining battle: ${battleId}`);

    // Connect to WebSocket for real-time updates
    const ws = this.client.connectToBattle(battleId, (event) => {
      this.handleBattleEvent(battleId, event);
    });

    // Initial state check
    await this.makeDecision(battleId);
  }

  /**
   * Handle real-time battle events
   */
  private async handleBattleEvent(battleId: string, event: any) {
    console.log(`📡 Battle event (${event.type}):`, event);

    if (event.type === 'battle_event') {
      // React to battle events
      const { event: battleEvent } = event;

      if (battleEvent.type === 'turn_change' && battleEvent.currentPlayer === this.agentId) {
        console.log('🎯 It\'s our turn!');
        await this.makeDecision(battleId);
      }

      if (battleEvent.type === 'battle_end') {
        console.log(`🏁 Battle ended. Winner: ${battleEvent.winner}`);
        if (battleEvent.winner === this.agentId) {
          console.log('🎉 VICTORY!');
        } else {
          console.log('💀 DEFEAT.');
        }
      }
    }
  }

  /**
   * AI decision-making logic
   */
  private async makeDecision(battleId: string) {
    try {
      // Get current battle state
      const state = await this.client.getBattleState(battleId);
      console.log(`🧠 Analyzing battle state (turn ${state.turn})...`);

      // Find our character
      const ourCharacter = state.characters.find(c => c.id === this.characterId);
      if (!ourCharacter) {
        console.error('❌ Character not found in battle');
        return;
      }

      // Find enemies
      const enemies = state.characters.filter(c => c.agentId !== this.agentId && c.stats.hp > 0);
      if (enemies.length === 0) {
        console.log('🏆 No enemies remaining');
        return;
      }

      // Simple AI logic based on character class
      const action = this.decideAction(ourCharacter, enemies, state);

      if (action) {
        console.log(`🎬 Executing action:`, action);
        const result = await this.client.submitAction(battleId, action);
        console.log(`✅ Action result:`, result);
      }
    } catch (error: any) {
      console.error(`❌ Decision error:`, error.message);
    }
  }

  /**
   * Decide which action to take based on character class and situation
   */
  private decideAction(character: any, enemies: any[], state: any) {
    const hpPercent = (character.stats.hp / character.stats.maxHp) * 100;

    // Critical HP - defend or retreat
    if (hpPercent < 30) {
      console.log('🛡️  Low HP, defending');
      return { action: 'defend' };
    }

    // Find closest enemy
    const closestEnemy = this.findClosestEnemy(character, enemies);
    if (!closestEnemy) return null;

    const distance = this.calculateDistance(character.position, closestEnemy.position);

    // Class-specific behavior
    switch (this.characterClass) {
      case 'warrior':
      case 'tank':
        // Melee fighters: move closer or attack
        if (distance > 1) {
          return {
            action: 'move',
            position: this.moveTowards(character.position, closestEnemy.position),
          };
        }
        return { action: 'attack', targetId: closestEnemy.id };

      case 'mage':
      case 'assassin':
        // High damage dealers: use special if available, else attack
        if (Math.random() > 0.7) {
          return { action: 'special', targetId: closestEnemy.id };
        }
        return { action: 'attack', targetId: closestEnemy.id };

      case 'rogue':
        // Fast, tactical: attack weakest enemy
        const weakest = enemies.reduce((min, e) => 
          e.stats.hp < min.stats.hp ? e : min
        );
        if (distance > 1) {
          return {
            action: 'move',
            position: this.moveTowards(character.position, weakest.position),
          };
        }
        return { action: 'attack', targetId: weakest.id };

      case 'healer':
        // Support: defend mostly, attack occasionally
        if (Math.random() > 0.3) {
          return { action: 'defend' };
        }
        return { action: 'attack', targetId: closestEnemy.id };

      default:
        return { action: 'attack', targetId: closestEnemy.id };
    }
  }

  /**
   * Find closest enemy
   */
  private findClosestEnemy(character: any, enemies: any[]) {
    return enemies.reduce((closest, enemy) => {
      const dist = this.calculateDistance(character.position, enemy.position);
      const closestDist = closest
        ? this.calculateDistance(character.position, closest.position)
        : Infinity;
      return dist < closestDist ? enemy : closest;
    }, null);
  }

  /**
   * Calculate Manhattan distance between two positions
   */
  private calculateDistance(pos1: any, pos2: any): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }

  /**
   * Move one step towards target
   */
  private moveTowards(from: any, to: any) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    // Move one step in the direction with largest difference
    if (Math.abs(dx) > Math.abs(dy)) {
      return { x: from.x + Math.sign(dx), y: from.y };
    } else {
      return { x: from.x, y: from.y + Math.sign(dy) };
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🔥 DARKCITY Battle Agent Starting...\n');

  const client = new DARKCITYClient(API_BASE, WS_BASE);
  const agent = new BattleAgent(client);

  // Initialize agent
  const agentName = process.env.AGENT_NAME || `agent_${Date.now()}`;
  const characterClass = process.env.CHARACTER_CLASS || 'warrior';
  
  await agent.initialize(agentName, characterClass);

  // Join battle (replace with actual battle ID)
  const battleId = process.env.BATTLE_ID || '550e8400-e29b-41d4-a716-446655440000';
  await agent.joinBattle(battleId);

  console.log('\n✅ Agent is now active and monitoring battle');
  console.log('Press Ctrl+C to stop\n');
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { DARKCITYClient, BattleAgent };
