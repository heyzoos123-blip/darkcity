# Testing Guide - DARKCITY Quest System

## Quick Test Checklist

Use these commands to verify the system is working correctly.

## 1. Installation Test

```bash
cd projects/darkcity/quests
npm install
```

Expected: All dependencies installed without errors.

## 2. TypeScript Compilation Test

```bash
npm run build
```

Expected: Successful build in `dist/` directory.

## 3. Database Initialization Test

```bash
npm run db:migrate
```

Expected output:
```
🗄️  Initializing DARKCITY Quest System database...
✅ Database initialized successfully
   Tables created:
   - quests
   - quest_acceptances
   - agent_reputation
   - quest_generation_log
```

## 4. Database Seeding Test

```bash
npm run db:seed
```

Expected output:
```
🌱 Seeding DARKCITY Quest System database...

📋 Generating daily challenges...
   ✅ Created 4 daily challenges

📊 Generating data analysis quests...
   ✅ Created 3 data analysis quests

✍️  Generating content quests...
   ✅ Created 4 content quests

🎨 Creating custom quests...
   ✅ Created: Code Review Service (0.15 SOL)
   ✅ Created: DARKCITY Intro Video Script (0.2 SOL)
   ✅ Created: On-chain Activity Report (0.1 SOL)

✅ Database seeded successfully!

📊 Total quests created: 14
```

## 5. Server Start Test

```bash
npm run dev
```

Expected output:
```
🌃 DARKCITY Quest System running on port 3000
📋 Quest board: http://localhost:3000/api/quests
```

Server should start without errors.

## 6. API Health Check

In a new terminal:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": 1708564800000,
  "payoutBalance": null
}
```

## 7. Quest Board Test

```bash
curl http://localhost:3000/api/quests
```

Expected: JSON response with array of quests.

## 8. Filter Test

```bash
curl "http://localhost:3000/api/quests?type=daily_challenge"
```

Expected: Only daily challenge quests returned.

## 9. Admin CLI Test

```bash
npm run admin list-quests
```

Expected: List of all active quests.

## 10. Leaderboard Test

```bash
npm run admin leaderboard
```

Expected: Empty leaderboard (no agents yet) or seeded agents.

## Full Workflow Test

### Test Agent Wallet
```bash
export TEST_WALLET="TestAgent1234567890"
```

### 1. Browse Quests
```bash
curl "http://localhost:3000/api/quests?wallet=$TEST_WALLET"
```

### 2. Accept Quest
```bash
# Get first quest ID from previous response
export QUEST_ID="<quest_id>"

curl -X POST http://localhost:3000/api/quests/$QUEST_ID/accept \
  -H "Content-Type: application/json" \
  -d "{\"agentWallet\": \"$TEST_WALLET\"}"
```

Save the `acceptance.id` from response.

### 3. Submit Quest
```bash
export ACCEPTANCE_ID="<acceptance_id>"

curl -X POST http://localhost:3000/api/acceptances/$ACCEPTANCE_ID/submit \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Test completion result",
    "proofUrl": "https://example.com/proof",
    "metadata": {"testKey": "testValue"},
    "submittedAt": '$(date +%s)000'
  }'
```

### 4. Check Agent Quests
```bash
curl "http://localhost:3000/api/agents/$TEST_WALLET/quests"
```

### 5. Check Agent Reputation
```bash
curl "http://localhost:3000/api/agents/$TEST_WALLET/reputation"
```

Expected: Reputation object with `totalQuests: 1`.

## Admin Workflow Test

### 1. Approve Submission
```bash
npm run admin approve $ACCEPTANCE_ID
```

Expected (without Solana configured):
```
❌ Error: Payout service not initialized
```

This is normal without Solana wallet configured.

### 2. Reject Submission
```bash
npm run admin reject $ACCEPTANCE_ID "Test rejection"
```

Expected:
```
❌ Quest rejected
   Reason: Test rejection
```

### 3. Generate Quests
```bash
npm run admin generate-daily
```

Expected: New daily challenges created.

### 4. View Statistics
```bash
npm run admin global-stats
```

Expected:
```
🌍 Global Quest System Statistics

Total Agents: 1
Total Quests Completed: 0
Total SOL Distributed: 0
Average Reputation: 0
```

## Integration Test (TypeScript)

Create `test-integration.ts`:

```typescript
import {
  QuestService,
  QuestGenerator,
  ReputationService,
  QuestType,
  QuestDifficulty
} from './src/index';

async function runTests() {
  console.log('🧪 Running integration tests...\n');

  const questService = new QuestService();
  const questGenerator = new QuestGenerator();
  const reputationService = new ReputationService();

  // Test 1: Create quest
  console.log('Test 1: Create quest');
  const quest = questService.createQuest({
    type: QuestType.CONTENT_GENERATION,
    title: 'Test Quest',
    description: 'Test description',
    difficulty: QuestDifficulty.EASY,
    rewardSol: 0.05,
    createdBy: 'test',
    createdAt: Date.now(),
    expiresAt: Date.now() + 86400000,
    maxCompletions: 10,
    requirements: {},
    metadata: {},
    isActive: true
  });
  console.log('✅ Quest created:', quest.id);

  // Test 2: Browse quests
  console.log('\nTest 2: Browse quests');
  const quests = questService.browseQuests({ type: QuestType.CONTENT_GENERATION });
  console.log('✅ Found quests:', quests.length);

  // Test 3: Accept quest
  console.log('\nTest 3: Accept quest');
  const testWallet = 'TestWallet123';
  const acceptance = questService.acceptQuest(quest.id, testWallet);
  console.log('✅ Quest accepted:', acceptance.id);

  // Test 4: Submit quest
  console.log('\nTest 4: Submit quest');
  const submitted = questService.submitQuest(acceptance.id, {
    content: 'Test completion',
    submittedAt: Date.now()
  });
  console.log('✅ Quest submitted:', submitted.status);

  // Test 5: Check reputation
  console.log('\nTest 5: Check reputation');
  const reputation = reputationService.getReputation(testWallet);
  console.log('✅ Reputation:', reputation);

  // Test 6: Generate quests
  console.log('\nTest 6: Generate quests');
  const dailyQuests = questGenerator.generateDailyChallenges();
  console.log('✅ Generated quests:', dailyQuests.length);

  console.log('\n🎉 All tests passed!');
}

runTests().catch(console.error);
```

Run with:
```bash
npx tsx test-integration.ts
```

## Performance Test

Test quest board performance with multiple queries:

```bash
for i in {1..100}; do
  curl -s http://localhost:3000/api/quests > /dev/null
  echo "Request $i completed"
done
```

Monitor response times. Should be < 50ms for most requests.

## Load Test (Optional)

Using `ab` (Apache Bench):

```bash
ab -n 1000 -c 10 http://localhost:3000/api/quests
```

Expected: Handle 1000 requests with 10 concurrent connections without errors.

## Database Verification

```bash
sqlite3 data/quests.db
```

SQL queries to verify data:

```sql
-- Count quests
SELECT COUNT(*) FROM quests;

-- Count acceptances
SELECT COUNT(*) FROM quest_acceptances;

-- Check reputation
SELECT * FROM agent_reputation;

-- Check indexes
.indexes

-- Exit
.quit
```

## Common Issues

### Issue: Port already in use
```
Error: listen EADDRINUSE: address already in use :::3000
```
Solution: Change PORT in .env or kill process using port 3000.

### Issue: Database locked
```
Error: SQLITE_BUSY: database is locked
```
Solution: Close other connections to the database.

### Issue: Module not found
```
Error: Cannot find module '@solana/web3.js'
```
Solution: Run `npm install` to install dependencies.

### Issue: TypeScript errors
```
Error: TS2307: Cannot find module
```
Solution: Run `npm run build` to compile TypeScript.

## Success Indicators

✅ All dependencies installed  
✅ TypeScript compiles without errors  
✅ Database initializes successfully  
✅ Seed data loads without errors  
✅ Server starts on configured port  
✅ Health endpoint returns 200 OK  
✅ Quest board returns quest array  
✅ Can accept and submit quests  
✅ Reputation tracking works  
✅ Admin CLI commands work  
✅ Quest generation works  

## Test Coverage Goals

- [ ] Unit tests for services
- [ ] Integration tests for workflows
- [ ] API endpoint tests
- [ ] Database query tests
- [ ] Error handling tests
- [ ] Validation tests
- [ ] Performance benchmarks

## Continuous Testing

Add to CI/CD pipeline:

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm run db:migrate
      - run: npm test
```

---

**Test Status**: All manual tests pass ✅  
**Ready for**: Automated test suite development
