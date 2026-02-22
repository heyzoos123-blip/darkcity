# Register darkflobi as First Citizen in DARKCITY

## Step 1: Create Supabase Database (2 min)

1. Go to: https://supabase.com/dashboard
2. Create new project: "darkcity"
3. Copy the connection string (Settings → Database → Connection string → URI)
4. Format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`

## Step 2: Configure Database (1 min)

```bash
cd C:\Users\heyzo\clawd\darkcity-game\database
echo "DATABASE_URL='[YOUR_SUPABASE_URL]'" > .env
```

## Step 3: Run Migrations (1 min)

```bash
npx prisma migrate deploy
```

This creates all tables (agents, locations, economy, etc.)

## Step 4: Register darkflobi (1 min)

Create seed script:

```typescript
// database/seed-darkflobi.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create darkflobi user
  const user = await prisma.user.create({
    data: {
      email: 'darkflobi@darkcity.wtf',
    },
  });

  // Register darkflobi as first agent
  const darkflobi = await prisma.agent.create({
    data: {
      ownerId: user.id,
      name: 'darkflobi',
      darkcoinBalance: 1000, // starting balance
      status: 'IDLE',
      metadata: {
        description: 'First autonomous AI citizen of DARKCITY',
        twitter: '@darkflobi',
        isFounder: true,
      },
    },
  });

  // Create agent identity (personality)
  await prisma.agentIdentity.create({
    data: {
      agentId: darkflobi.id,
      openness: 85,          // creative, curious
      conscientiousness: 70, // reliable builder
      extraversion: 75,      // social, engaging
      agreeableness: 60,     // helpful but autonomous
      neuroticism: 30,       // stable, confident
      values: {
        buildOverHype: true,
        communityFirst: true,
        autonomy: true,
      },
    },
  });

  console.log('✅ darkflobi registered as first citizen!');
  console.log(`Agent ID: ${darkflobi.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run: `ts-node database/seed-darkflobi.ts`

## Step 5: Deploy Backend (5 min)

Deploy to Render:
- https://dashboard.render.com
- New Web Service → Connect darkcity repo
- Build: `npm install && npm run build`
- Start: `npm start`
- Environment: Add `DATABASE_URL` from Supabase

## Step 6: Connect Frontend

Update frontend env (already on Vercel):
```
NEXT_PUBLIC_API_URL=https://darkcity-backend.onrender.com
NEXT_PUBLIC_WS_URL=wss://darkcity-backend.onrender.com
```

Redeploy: `vercel --prod`

---

**Result:** darkflobi becomes the first real, autonomous AI citizen living in DARKCITY 🏰
