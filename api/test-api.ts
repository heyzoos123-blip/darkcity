/**
 * DARKCITY Agent API Test Suite
 * Tests authentication, endpoints, validation, and WebSocket connection
 */

import nacl from 'tweetnacl';
import bs58 from 'bs58';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const WS_BASE = process.env.WS_BASE || 'ws://localhost:3000';

// Generate test wallet
const keypair = nacl.sign.keyPair();
const WALLET_ADDRESS = bs58.encode(keypair.publicKey);
const SECRET_KEY = keypair.secretKey;

console.log('🧪 DARKCITY API Test Suite\n');
console.log(`Test Wallet: ${WALLET_ADDRESS}\n`);

// ============================================================================
// TEST HELPERS
// ============================================================================

function generateAuthHeaders() {
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `DARKCITY:${timestamp}:${WALLET_ADDRESS}`;
  const messageBytes = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(messageBytes, SECRET_KEY);
  const signatureBase58 = bs58.encode(signature);

  return {
    'X-Wallet-Address': WALLET_ADDRESS,
    'X-Wallet-Signature': signatureBase58,
    'X-Timestamp': timestamp.toString(),
    'Content-Type': 'application/json',
  };
}

async function testEndpoint(name: string, fn: () => Promise<void>) {
  try {
    process.stdout.write(`${name}... `);
    await fn();
    console.log('✅');
  } catch (error: any) {
    console.log('❌');
    console.log(`   Error: ${error.message}`);
  }
}

// ============================================================================
// TESTS
// ============================================================================

async function testHealthCheck() {
  const response = await fetch(`${API_BASE}/health`);
  const data = await response.json();
  
  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}`);
  }
  if (data.status !== 'ok') {
    throw new Error('Health check failed');
  }
}

async function testAuthenticationMissing() {
  const response = await fetch(`${API_BASE}/api/agent/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentName: 'test_agent',
      characterClass: 'warrior',
    }),
  });

  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`);
  }

  const data = await response.json();
  if (data.code !== 'MISSING_AUTH') {
    throw new Error(`Expected MISSING_AUTH, got ${data.code}`);
  }
}

async function testAuthenticationInvalid() {
  const response = await fetch(`${API_BASE}/api/agent/register`, {
    method: 'POST',
    headers: {
      'X-Wallet-Address': WALLET_ADDRESS,
      'X-Wallet-Signature': 'invalid_signature',
      'X-Timestamp': Math.floor(Date.now() / 1000).toString(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agentName: 'test_agent',
      characterClass: 'warrior',
    }),
  });

  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`);
  }
}

async function testAuthenticationExpired() {
  const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
  const message = `DARKCITY:${oldTimestamp}:${WALLET_ADDRESS}`;
  const messageBytes = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(messageBytes, SECRET_KEY);
  const signatureBase58 = bs58.encode(signature);

  const response = await fetch(`${API_BASE}/api/agent/register`, {
    method: 'POST',
    headers: {
      'X-Wallet-Address': WALLET_ADDRESS,
      'X-Wallet-Signature': signatureBase58,
      'X-Timestamp': oldTimestamp.toString(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agentName: 'test_agent',
      characterClass: 'warrior',
    }),
  });

  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`);
  }

  const data = await response.json();
  if (data.code !== 'EXPIRED_SIGNATURE') {
    throw new Error(`Expected EXPIRED_SIGNATURE, got ${data.code}`);
  }
}

async function testRegisterAgent() {
  const response = await fetch(`${API_BASE}/api/agent/register`, {
    method: 'POST',
    headers: generateAuthHeaders(),
    body: JSON.stringify({
      agentName: 'test_warrior',
      characterClass: 'warrior',
      metadata: {
        description: 'Test warrior agent',
      },
    }),
  });

  if (response.status !== 201) {
    const error = await response.json();
    throw new Error(`Expected 201, got ${response.status}: ${error.message}`);
  }

  const data = await response.json();
  if (!data.agentId || !data.character) {
    throw new Error('Missing agentId or character in response');
  }
  if (data.character.class !== 'warrior') {
    throw new Error(`Expected warrior, got ${data.character.class}`);
  }
  if (!data.character.stats.hp) {
    throw new Error('Missing character stats');
  }
}

async function testValidationError() {
  const response = await fetch(`${API_BASE}/api/agent/register`, {
    method: 'POST',
    headers: generateAuthHeaders(),
    body: JSON.stringify({
      agentName: 'ab', // Too short
      characterClass: 'invalid_class',
    }),
  });

  if (response.status !== 400) {
    throw new Error(`Expected 400, got ${response.status}`);
  }

  const data = await response.json();
  if (data.code !== 'VALIDATION_ERROR') {
    throw new Error(`Expected VALIDATION_ERROR, got ${data.code}`);
  }
  if (!data.details || !Array.isArray(data.details)) {
    throw new Error('Expected validation error details');
  }
}

async function testBattleAction() {
  const response = await fetch(`${API_BASE}/api/battle/action`, {
    method: 'POST',
    headers: generateAuthHeaders(),
    body: JSON.stringify({
      battleId: '550e8400-e29b-41d4-a716-446655440000',
      action: 'attack',
      targetId: 'char_12345',
    }),
  });

  if (response.status !== 200) {
    const error = await response.json();
    throw new Error(`Expected 200, got ${response.status}: ${error.message}`);
  }

  const data = await response.json();
  if (!data.actionId || !data.status) {
    throw new Error('Missing actionId or status in response');
  }
}

async function testBattleActionValidation() {
  // Missing required targetId for attack action
  const response = await fetch(`${API_BASE}/api/battle/action`, {
    method: 'POST',
    headers: generateAuthHeaders(),
    body: JSON.stringify({
      battleId: '550e8400-e29b-41d4-a716-446655440000',
      action: 'attack',
      // Missing targetId
    }),
  });

  if (response.status !== 400) {
    throw new Error(`Expected 400, got ${response.status}`);
  }
}

async function testGetBattleState() {
  const battleId = '550e8400-e29b-41d4-a716-446655440000';
  const response = await fetch(`${API_BASE}/api/battle/${battleId}/state`, {
    method: 'GET',
    headers: generateAuthHeaders(),
  });

  if (response.status !== 200) {
    const error = await response.json();
    throw new Error(`Expected 200, got ${response.status}: ${error.message}`);
  }

  const data = await response.json();
  if (!data.id || !data.status || data.turn === undefined) {
    throw new Error('Missing required battle state fields');
  }
  if (!Array.isArray(data.characters)) {
    throw new Error('Expected characters array');
  }
}

async function testWebSocketConnection() {
  return new Promise((resolve, reject) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `DARKCITY:${timestamp}:${WALLET_ADDRESS}`;
    const messageBytes = new TextEncoder().encode(message);
    const signature = nacl.sign.detached(messageBytes, SECRET_KEY);
    const signatureBase58 = bs58.encode(signature);

    const battleId = '550e8400-e29b-41d4-a716-446655440000';
    const url = `${WS_BASE}/ws/battle/${battleId}?` +
      `signature=${encodeURIComponent(signatureBase58)}&` +
      `address=${encodeURIComponent(WALLET_ADDRESS)}&` +
      `timestamp=${timestamp}`;

    // Dynamic import for WebSocket
    import('ws').then(({ default: WebSocket }) => {
      const ws = new WebSocket(url);
      let connected = false;

      const timeout = setTimeout(() => {
        if (!connected) {
          ws.close();
          reject(new Error('WebSocket connection timeout'));
        }
      }, 5000);

      ws.on('open', () => {
        connected = true;
      });

      ws.on('message', (data) => {
        const event = JSON.parse(data.toString());
        if (event.type === 'connected') {
          clearTimeout(timeout);
          ws.close();
          resolve(undefined);
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    }).catch(reject);
  });
}

// ============================================================================
// RUN TESTS
// ============================================================================

async function runTests() {
  console.log('📋 Running tests...\n');

  // Basic tests
  await testEndpoint('Health check', testHealthCheck);

  // Authentication tests
  await testEndpoint('Auth: Missing headers', testAuthenticationMissing);
  await testEndpoint('Auth: Invalid signature', testAuthenticationInvalid);
  await testEndpoint('Auth: Expired signature', testAuthenticationExpired);

  // Validation tests
  await testEndpoint('Validation: Invalid input', testValidationError);

  // Endpoint tests
  await testEndpoint('POST /api/agent/register', testRegisterAgent);
  await testEndpoint('POST /api/battle/action', testBattleAction);
  await testEndpoint('POST /api/battle/action (validation)', testBattleActionValidation);
  await testEndpoint('GET /api/battle/:id/state', testGetBattleState);

  // WebSocket test
  await testEndpoint('WebSocket connection', testWebSocketConnection);

  console.log('\n✅ All tests completed!');
}

// Run tests if API server is running
runTests().catch((error) => {
  console.error('\n❌ Test suite failed:', error.message);
  process.exit(1);
});
