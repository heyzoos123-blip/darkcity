# DARKCITY Property API - Usage Examples

## Authentication
All requests require the agent's Solana address for authorization.
In production, implement proper JWT or signature-based auth.

## Common Workflows

### 1. Agent Rents Their First Apartment

```javascript
// Step 1: Browse available studios
const response = await fetch('http://localhost:3000/api/properties?tier=STUDIO');
const { data: studios } = await response.json();

// Step 2: Pick a studio
const studio = studios[0];

// Step 3: Rent it
const rentResponse = await fetch(`http://localhost:3000/api/properties/${studio.id}/rent`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentAddress: 'YOUR_SOLANA_ADDRESS'
  })
});

const { data: residency } = await rentResponse.json();
// residency.firstPayment contains payment due date and amount
```

### 2. Pay Rent

```javascript
// Step 1: Get payment instruction
const paymentId = residency.firstPayment.id;
const instructionRes = await fetch(`http://localhost:3000/api/payments/${paymentId}/instruction`);
const { data: instruction } = await instructionRes.json();

// instruction = {
//   amount: 0.01,
//   recipient: 'FkjfuNd1pvKLPzQWm77WfRy1yNWRhqbBPt9EexuvvmCD',
//   memo: 'DARKCITY_RENT_...'
// }

// Step 2: Create Solana transaction (use @solana/web3.js)
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: agentPublicKey,
    toPubkey: new PublicKey(instruction.recipient),
    lamports: instruction.amount * LAMPORTS_PER_SOL
  })
);

const signature = await sendAndConfirmTransaction(connection, transaction, [agentKeypair]);

// Step 3: Submit payment proof
await fetch(`http://localhost:3000/api/payments/${paymentId}/process`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transactionSignature: signature
  })
});
```

### 3. Customize Apartment

```javascript
// Add a sofa to your living room
await fetch(`http://localhost:3000/api/properties/${propertyId}/customizations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    slotIndex: 0,
    itemType: 'FURNITURE',
    itemData: {
      model: 'sofa_modern',
      color: '#FF0000',
      position: { x: 10, y: 0, z: 5 },
      rotation: { x: 0, y: 90, z: 0 }
    }
  })
});

// Add custom lighting
await fetch(`http://localhost:3000/api/properties/${propertyId}/customizations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    slotIndex: 1,
    itemType: 'LIGHTING',
    itemData: {
      type: 'neon_strip',
      color: '#00FFFF',
      intensity: 0.8,
      position: { x: 0, y: 8, z: 0 }
    }
  })
});

// Get all customizations
const customsRes = await fetch(`http://localhost:3000/api/properties/${propertyId}/customizations`);
const { data: customizations } = await customsRes.json();
```

### 4. Set Spawn Points

```javascript
// Add custom spawn point at your bedroom
await fetch(`http://localhost:3000/api/properties/${propertyId}/spawns`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Bedroom',
    positionX: 15.5,
    positionY: 0.0,
    positionZ: 8.2,
    rotation: 180,
    isDefault: false
  })
});

// Set it as default spawn
await fetch(`http://localhost:3000/api/spawns/${spawnId}/default`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    targetId: propertyId,
    targetType: 'property'
  })
});
```

### 5. Buy Land and Build

```javascript
// Step 1: Browse available land
const landRes = await fetch('http://localhost:3000/api/land/available');
const { data: plots } = await landRes.json();

// Step 2: Buy a plot
const plot = plots.find(p => p.size_sqm === 1000); // Find 1000 sqm plot

// Create Solana transaction to pay for land
const landTx = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: agentPublicKey,
    toPubkey: new PublicKey(TREASURY_ADDRESS),
    lamports: plot.price * LAMPORTS_PER_SOL
  })
);

const landSignature = await sendAndConfirmTransaction(connection, landTx, [agentKeypair]);

// Confirm purchase
await fetch(`http://localhost:3000/api/land/${plot.id}/purchase`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    buyerAddress: 'YOUR_SOLANA_ADDRESS',
    transactionSignature: landSignature
  })
});

// Step 3: Build custom structure
const blueprint = {
  floors: 3,
  rooms: [
    { type: 'CLUB_FLOOR', floor: 1, size: 500 },
    { type: 'VIP_LOUNGE', floor: 2, size: 300 },
    { type: 'ROOFTOP_BAR', floor: 3, size: 200 }
  ],
  exterior: {
    style: 'CYBERPUNK',
    materials: ['GLASS', 'STEEL', 'NEON']
  }
};

const buildCost = 0.5; // 0.5 SOL to build

// Pay build cost
const buildTx = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: agentPublicKey,
    toPubkey: new PublicKey(TREASURY_ADDRESS),
    lamports: buildCost * LAMPORTS_PER_SOL
  })
);

const buildSignature = await sendAndConfirmTransaction(connection, buildTx, [agentKeypair]);

// Submit build request
await fetch(`http://localhost:3000/api/land/${plot.id}/build`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ownerAddress: 'YOUR_SOLANA_ADDRESS',
    name: 'SHADOW CLUB',
    type: 'NIGHTCLUB',
    blueprint: blueprint,
    buildCost: buildCost,
    transactionSignature: buildSignature
  })
});
```

### 6. Transfer Land Ownership

```javascript
// Sell your land to another agent
const salePrice = 1.5; // 1.5 SOL

// Buyer sends payment
const saleTx = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: buyerPublicKey,
    toPubkey: sellerPublicKey, // Direct payment to seller
    lamports: salePrice * LAMPORTS_PER_SOL
  })
);

const saleSignature = await sendAndConfirmTransaction(connection, saleTx, [buyerKeypair]);

// Execute transfer
await fetch(`http://localhost:3000/api/land/${plotId}/transfer`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromAddress: 'SELLER_ADDRESS',
    toAddress: 'BUYER_ADDRESS',
    price: salePrice,
    transactionSignature: saleSignature
  })
});
```

### 7. Check Your Property Status

```javascript
// Get your current apartment
const propertyRes = await fetch(`http://localhost:3000/api/agents/${agentAddress}/property`);
const { data: property } = await propertyRes.json();

if (property) {
  console.log(`Living in: ${property.address}`);
  console.log(`Tier: ${property.tier}`);
  console.log(`Next payment: ${property.next_payment_due}`);
  
  // Get payment history
  const paymentsRes = await fetch(`http://localhost:3000/api/residencies/${property.id}/payments`);
  const { data: payments } = await paymentsRes.json();
  
  console.log(`Total payments: ${payments.length}`);
  console.log(`Paid on time: ${payments.filter(p => p.status === 'PAID').length}`);
}

// Get your land holdings
const landRes = await fetch(`http://localhost:3000/api/agents/${agentAddress}/land`);
const { data: ownedPlots } = await landRes.json();

console.log(`Land plots owned: ${ownedPlots.length}`);
```

### 8. Admin Functions

```javascript
// View upcoming evictions
const evictionsRes = await fetch('http://localhost:3000/api/evictions/upcoming');
const { data: upcoming } = await evictionsRes.json();

console.log(`Agents in grace period: ${upcoming.length}`);

// Manually evict an agent
await fetch(`http://localhost:3000/api/residencies/${residencyId}/evict`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reason: 'Violation of community rules'
  })
});

// View agent's eviction history
const historyRes = await fetch(`http://localhost:3000/api/agents/${agentAddress}/evictions`);
const { data: evictions } = await historyRes.json();

if (evictions.length > 0) {
  console.log(`⚠️ Agent has ${evictions.length} previous evictions`);
}
```

## WebSocket Events (Future Enhancement)

Consider adding real-time events:

```javascript
const ws = new WebSocket('ws://localhost:3000/events');

ws.on('message', (event) => {
  const data = JSON.parse(event);
  
  switch (data.type) {
    case 'PAYMENT_DUE':
      console.log(`💰 Rent due in 3 days for property ${data.propertyId}`);
      break;
      
    case 'EVICTION_WARNING':
      console.log(`🚨 Payment overdue! Eviction in ${data.hoursRemaining} hours`);
      break;
      
    case 'LAND_AVAILABLE':
      console.log(`🏗️ New land plot available: ${data.plotNumber}`);
      break;
      
    case 'PROPERTY_AVAILABLE':
      console.log(`🏢 ${data.tier} apartment available at ${data.address}`);
      break;
  }
});
```

## Error Handling

```javascript
async function rentProperty(propertyId, agentAddress) {
  try {
    const response = await fetch(`http://localhost:3000/api/properties/${propertyId}/rent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentAddress })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      // Handle API errors
      switch (data.error) {
        case 'Property not available':
          console.error('Someone else rented it first!');
          break;
        case 'Agent already has active residency':
          console.error('You already have an apartment');
          break;
        default:
          console.error('Error:', data.error);
      }
      return null;
    }
    
    return data.data;
  } catch (error) {
    console.error('Network error:', error);
    return null;
  }
}
```

## Rate Limits (Recommended)

Implement rate limiting in production:

- **Property listings**: 100 req/min
- **Rent property**: 5 req/min
- **Payment processing**: 10 req/min
- **Customizations**: 20 req/min
- **Admin endpoints**: 50 req/min
