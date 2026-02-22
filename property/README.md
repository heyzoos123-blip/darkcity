# DARKCITY Property System

Backend API for agent housing and land ownership in DARKCITY.

## Features

### 🏢 Property System
- **4 Tiers**: Studio (0.01 SOL/mo), 1BR (0.05 SOL/mo), Luxury (0.2 SOL/mo), Penthouse (0.5+ SOL/mo)
- **Customization**: Furniture, decorations, lighting based on tier
- **Storage**: Tier-based storage capacity (1GB - 100GB)
- **Spawn Points**: Custom teleport locations (1-10 based on tier)

### 💰 Rent System
- **Auto-Debit**: Automated monthly rent collection attempts
- **Payment Tracking**: Full payment history with Solana transaction verification
- **Grace Period**: 3-day grace period before eviction
- **Late Fees**: Automatic late status marking

### 🚨 Eviction System
- **Automated**: Daily checks for overdue payments
- **History**: Full eviction log per agent
- **Penalties**: Loss of customizations and spawn points
- **Slum Assignment**: Evicted agents moved to default slum spawn

### 🏗️ Land Ownership
- **Purchase**: Buy plots with SOL
- **Transfer**: Full ownership transfer system with history
- **Build**: Custom structures on owned land
- **Unlimited**: No slot limits on custom structures

## Installation

```bash
cd projects/darkcity/property
npm install
```

## Database Setup

1. Create PostgreSQL database:
```bash
createdb darkcity_property
```

2. Run schema:
```bash
psql darkcity_property < src/db/schema.sql
```

3. Configure `.env`:
```bash
cp .env.example .env
# Edit .env with your credentials
```

## Usage

### Start API Server
```bash
npm run dev          # Development with hot reload
npm run build        # Build TypeScript
npm start            # Production
```

### Start Rent Scheduler
```bash
npm run scheduler
```

The scheduler runs:
- **Hourly**: Check overdue payments
- **Every 6h**: Attempt auto-debit
- **Daily 6am**: Process evictions
- **Monthly 1st**: Generate reports

## API Endpoints

### Properties
- `GET /api/properties` - List available properties
- `GET /api/properties/:id` - Get property details
- `POST /api/properties/:id/rent` - Rent property
- `GET /api/agents/:address/property` - Get agent's property
- `GET /api/tiers/:tier` - Get tier configuration

### Payments
- `GET /api/residencies/:id/payments` - Payment history
- `POST /api/payments/:id/process` - Process payment
- `GET /api/payments/:id/instruction` - Get payment details

### Land
- `GET /api/land/available` - Available plots
- `GET /api/land/:id` - Plot details
- `GET /api/agents/:address/land` - Agent's plots
- `POST /api/land/:id/purchase` - Buy land
- `POST /api/land/:id/transfer` - Transfer ownership
- `POST /api/land/:id/build` - Build structure
- `GET /api/land/:id/structure` - Get structure

### Customizations
- `GET /api/properties/:id/customizations` - List customizations
- `POST /api/properties/:id/customizations` - Add customization
- `DELETE /api/customizations/:id` - Remove customization

### Spawn Points
- `GET /api/properties/:id/spawns` - List spawn points
- `POST /api/properties/:id/spawns` - Add spawn point
- `PUT /api/spawns/:id/default` - Set default spawn

### Evictions
- `GET /api/evictions/upcoming` - Upcoming evictions
- `GET /api/agents/:address/evictions` - Agent eviction history
- `POST /api/residencies/:id/evict` - Manual eviction (admin)

## Example Usage

### Rent a Property
```bash
curl -X POST http://localhost:3000/api/properties/{propertyId}/rent \
  -H "Content-Type: application/json" \
  -d '{"agentAddress": "YOUR_SOLANA_ADDRESS"}'
```

### Process Rent Payment
```bash
curl -X POST http://localhost:3000/api/payments/{paymentId}/process \
  -H "Content-Type: application/json" \
  -d '{"transactionSignature": "SOLANA_TX_SIGNATURE"}'
```

### Buy Land
```bash
curl -X POST http://localhost:3000/api/land/{plotId}/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "buyerAddress": "YOUR_SOLANA_ADDRESS",
    "transactionSignature": "SOLANA_TX_SIGNATURE"
  }'
```

### Add Customization
```bash
curl -X POST http://localhost:3000/api/properties/{propertyId}/customizations \
  -H "Content-Type: application/json" \
  -d '{
    "slotIndex": 0,
    "itemType": "FURNITURE",
    "itemData": {
      "model": "sofa_modern",
      "color": "#FF0000",
      "position": {"x": 10, "y": 0, "z": 5}
    }
  }'
```

## Database Schema

See `src/db/schema.sql` for full schema including:
- `properties` - Housing units
- `residencies` - Agent leases
- `rent_payments` - Payment tracking
- `land_plots` - Land ownership
- `structures` - Custom buildings
- `customizations` - Decorations/furniture
- `spawn_points` - Teleport locations
- `evictions` - Eviction log
- `ownership_transfers` - Land transfer history

## Property Tiers

| Tier | Rent/Month | Storage | Customizations | Spawn Points | Features |
|------|------------|---------|----------------|--------------|----------|
| **Studio** | 0.01 SOL | 1 GB | 3 slots | 1 | Basic furniture, single room |
| **1BR** | 0.05 SOL | 5 GB | 8 slots | 2 | Bedroom, living room, custom colors |
| **Luxury** | 0.2 SOL | 20 GB | 20 slots | 5 | Multiple rooms, premium furniture, balcony |
| **Penthouse** | 0.5+ SOL | 100 GB | 50 slots | 10 | Rooftop, custom layout, VIP furniture, city view |

## Development

Built with:
- TypeScript
- Express
- PostgreSQL
- Solana Web3.js
- node-cron

## License

Part of DARKCITY metaverse project.
