/**
 * DARKCITY Example Agent Client
 * Demonstrates how to connect to the battle server and participate in battles
 */

import WebSocket from 'ws';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SERVER_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000';

// Generate a keypair for testing (in production, load from secure storage)
const keypair = nacl.sign.keyPair();
const publicKey = bs58.encode(keypair.publicKey);
const secretKey = keypair.secretKey;

console.log('🔑 Test Wallet Address:', publicKey);

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Create authentication headers for API requests
 */
function createAuthHeaders(): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = `DARKCITY:${timestamp}:${publicKey}`;
  const messageBytes = new TextEncoder().encode(message);
  
  const signature = nacl.sign.detached(messageBytes, secretKey);
  const signatureBase58 = bs58.encode(signature);

  return {
    'Content-Type': 'application/json',
    'X-Wallet-Signature': signatureBase58,
    'X-Wallet-Address': publicKey,
    'X-Timestamp': timestamp,
  };
}

// ============================================================================
// API CLIENT
// ============================================================================

class DarkCityAgent {
  private agentId: string;
  private characterClass: string;
  private battleId: string | null = null;
  private ws: WebSocket | null = null;

  constructor(characterClass: string = 'warrior') {
    this.agentId = `agent_${publicKey.slice(0, 8)}`;
    this.characterClass = characterClass;
  }

  /**
   * Join matchmaking queue
   */
  async joinMatchmaking(tier: string = 'BLOOD'): Promise<void> {
    console.log(`🎮 Joining ${tier} matchmaking queue...`);

    const response = await fetch(`${SERVER_URL}/api/matchmaking/join`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({
        tier,
        characterClass: this.characterClass,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Joined queue at position ${data.position}`);
    } else {
      console.error('❌ Failed to join queue:', data.message);
      throw new Error(data.message);
    }
  }

  /**
   * Connect to battle WebSocket
   */
  connectToBattle(battleId: string): void {
    this.battleId = battleId;

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const message = `DARKCITY:${timestamp}:${publicKey}`;
    const messageBytes = new TextEncoder().encode(message);
    const signature = nacl.sign.detached(messageBytes, secretKey);
    const signatureBase58 = bs58.encode(signature);

    const wsUrl = `${WS_URL}/ws/battle/${battleId}?` +
      `signature=${signatureBase58}&` +
      `address=${publicKey}&` +
      `timestamp=${timestamp}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      console.log('📡 WebSocket connected to battle');
    });

    this.ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      this.handleWebSocketMessage(message);
    });

    this.ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
    });

    this.ws.on('close', () => {
      console.log('📡 WebSocket disconnected');
    });
  }

  /**
   * Handle WebSocket messages
   */
  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case 'connected':
        console.log('✅ Connected to battle:', message.battleId);
        break;

      case 'battle_event':
        this.handleBattleEvent(message.event);
        break;

      case 'pong':
        // Keepalive response
        break;

      default:
        console.log('📨 Unknown message:', message.type);
    }
  }

  /**
   * Handle battle events
   */
  private async handleBattleEvent(event: any): void {
    const { type, data } = event;

    switch (type) {
      case 'BATTLE_START':
        console.log('⚔️  Battle started!');
        console.log(`   Participants: ${data.participants.length}`);
        console.log(`   Prize pool: ${data.prizePool} SOL`);
        break;

      case 'ROUND_START':
        console.log(`\n🎯 Round ${data.round} started`);
        console.log(`   Deadline: ${new Date(data.deadline).toISOString()}`);
        
        // Decide action based on battle state
        await this.decideAction(data);
        break;

      case 'ROUND_COMPLETE':
        console.log(`\n✅ Round ${data.round} complete`);
        
        // Log results
        data.results.forEach((result: any) => {
          if (result.success) {
            console.log(`   ${result.agentId}: ${result.action} → ${result.effects.damageDealt || 0} damage`);
          }
        });

        // Log agent states
        console.log('\n📊 Agent States:');
        data.agents.forEach((agent: any) => {
          const marker = agent.id === this.agentId ? '👤' : '  ';
          console.log(`   ${marker} ${agent.id}: ${agent.sol.toFixed(3)} SOL in ${agent.zone} ${agent.isAlive ? '✓' : '💀'}`);
        });
        break;

      case 'BATTLE_END':
        console.log('\n🏆 Battle ended!');
        console.log(`   Winner: ${data.winner}`);
        
        data.standings.forEach((standing: any, index: number) => {
          const payout = data.payouts.get(standing.agentId) || 0;
          console.log(`   ${index + 1}. ${standing.agentId}: ${standing.finalSol.toFixed(3)} SOL${payout > 0 ? ` (+${payout} payout)` : ''}`);
        });
        
        process.exit(0);
        break;

      case 'ZONE_COLLAPSE':
        console.log(`⚠️  Zone ${data.zone} collapsed!`);
        break;

      default:
        console.log('📨 Unknown event:', type);
    }
  }

  /**
   * Decide action based on battle state
   */
  private async decideAction(roundData: any): Promise<void> {
    const myAgent = roundData.agents.find((a: any) => a.id === this.agentId);
    
    if (!myAgent || !myAgent.isAlive) {
      console.log('💀 Agent is dead, skipping action');
      return;
    }

    // Simple AI strategy
    const livingEnemies = roundData.agents.filter(
      (a: any) => a.id !== this.agentId && a.isAlive
    );

    if (livingEnemies.length === 0) {
      return;
    }

    // Pick random enemy
    const target = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];

    // Choose action based on SOL
    let action = 'STRIKE';
    let reaction = 'EVADE';

    if (myAgent.sol < 0.03) {
      // Low HP, play defensive
      action = 'FORTIFY';
      reaction = 'COUNTER';
    } else if (target.sol < 0.05) {
      // Enemy is low, go for execute
      action = 'EXECUTE';
      reaction = 'NONE';
    } else if (myAgent.sol > 0.07) {
      // Healthy, be aggressive
      action = Math.random() < 0.7 ? 'STRIKE' : 'HEAVY_ASSAULT';
      reaction = 'COUNTER';
    }

    console.log(`🎲 Deciding: ${action} → ${target.id} (${reaction})`);

    await this.submitAction(action, reaction, target.id);
  }

  /**
   * Submit combat action
   */
  async submitAction(
    action: string,
    reaction: string = 'NONE',
    targetId?: string,
    targetZone?: string
  ): Promise<void> {
    try {
      const response = await fetch(`${SERVER_URL}/api/battle/action`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          action,
          reaction,
          targetId,
          targetZone,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Action submitted: ${action}`);
      } else {
        console.error('❌ Action failed:', data.message);
        if (data.errors) {
          console.error('   Errors:', data.errors);
        }
      }
    } catch (error) {
      console.error('❌ Failed to submit action:', error);
    }
  }

  /**
   * Get current battle state
   */
  async getBattleState(): Promise<any> {
    const response = await fetch(`${SERVER_URL}/api/battle/current`, {
      headers: createAuthHeaders(),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const data = await response.json();
      throw new Error(data.message);
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('');
  console.log('🔥 DARKCITY Example Agent Client');
  console.log('═'.repeat(50));
  console.log('');

  const agent = new DarkCityAgent('warrior');

  try {
    // Join matchmaking
    await agent.joinMatchmaking('BLOOD');

    // Wait for battle assignment
    console.log('⏳ Waiting for battle to start...');

    // Poll for battle state
    const checkInterval = setInterval(async () => {
      try {
        const battleState = await agent.getBattleState();
        
        console.log('✅ Battle found!');
        clearInterval(checkInterval);
        
        // Connect to battle WebSocket
        agent.connectToBattle(battleState.battleId);
      } catch (error) {
        // Not in battle yet, continue waiting
      }
    }, 2000);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export default DarkCityAgent;
