// DARKCITY - Main Server Integration
// Orchestrates all systems: character creation, property, quests, combat, persistence

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import { config } from 'dotenv';

// Import all subsystems
import { CharacterCreator } from '../character/creator';
import { PropertyManager } from '../property/services/property-service';
import { QuestBoard } from '../quests/src/services/quest-board';
import { BattleServer } from './battle-server';
import { Database } from '../database/db';

config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIO(httpServer, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

// Initialize subsystems
const db = new Database();
const characterCreator = new CharacterCreator();
const propertyManager = new PropertyManager(db);
const questBoard = new QuestBoard(db);
const battleServer = new BattleServer(db, io);

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    city: 'DARKCITY',
    version: '1.0.0',
    systems: {
      database: db.isConnected(),
      characters: true,
      property: true,
      quests: true,
      combat: true
    }
  });
});

// ============================================================================
// AGENT LIFECYCLE
// ============================================================================

// Create new agent (first-time entry)
app.post('/api/agents/create', async (req, res) => {
  try {
    const { walletAddress, characterData } = req.body;

    // Validate character
    const validation = characterCreator.validate(characterData);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.errors });
    }

    // Check entry fee (0.1 SOL)
    const ENTRY_FEE = 0.1;
    // TODO: Verify Solana transaction

    // Create character
    const character = await db.createCharacter(walletAddress, characterData);

    // Give starting SOL (0.05 back after entry)
    await db.updateBalance(walletAddress, 0.05);

    // Assign starter apartment (Undercity studio)
    const starterApartment = await propertyManager.assignStarter(walletAddress);

    // Create starter quest
    const starterQuest = await questBoard.createStarterQuest(walletAddress);

    res.json({
      character,
      solBalance: 0.05,
      apartment: starterApartment,
      starterQuest,
      welcomeMessage: 'Welcome to DARKCITY. Survive.'
    });
  } catch (error) {
    console.error('Agent creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get agent profile (public)
app.get('/api/agents/:address', async (req, res) => {
  try {
    const { address } = req.params;

    const agent = await db.getAgent(address);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Build public profile
    const profile = {
      character: agent.character,
      stats: {
        solBalance: agent.solBalance,
        netWorth: await calculateNetWorth(agent),
        daysActive: Math.floor((Date.now() - agent.createdAt) / (1000 * 60 * 60 * 24)),
        combatRecord: agent.combatStats,
        questsCompleted: agent.questsCompleted,
        reputation: agent.reputation
      },
      property: await propertyManager.getAgentProperty(address),
      achievements: agent.achievements,
      // Agent-customizable fields
      bio: agent.bio || '',
      status: agent.status || '',
      displayAchievements: agent.displayAchievements || [],
      alliances: agent.alliances || [],
      rivalries: agent.rivalries || []
    };

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update agent profile (customization)
app.patch('/api/agents/:address/profile', async (req, res) => {
  try {
    const { address } = req.params;
    const { bio, status, displayAchievements, alliances, rivalries } = req.body;

    // TODO: Verify wallet signature

    await db.updateAgentProfile(address, {
      bio: bio?.substring(0, 500), // Max 500 chars
      status: status?.substring(0, 100),
      displayAchievements,
      alliances,
      rivalries
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get agent's activity log (life timeline)
app.get('/api/agents/:address/log', async (req, res) => {
  try {
    const { address } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const log = await db.getActivityLog(address, Number(limit), Number(offset));

    res.json({
      events: log,
      total: log.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// CHARACTER SYSTEM
// ============================================================================

app.post('/api/character/preview', (req, res) => {
  try {
    const preview = characterCreator.preview(req.body);
    res.json(preview);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/character/validate', (req, res) => {
  const validation = characterCreator.validate(req.body);
  res.json(validation);
});

app.get('/api/character/templates', (req, res) => {
  res.json({
    templates: [
      { id: 'void-walker', name: 'Void Walker', description: 'Shadow entity' },
      { id: 'steel-guardian', name: 'Steel Guardian', description: 'Armored protector' },
      { id: 'chaos-creature', name: 'Chaos Creature', description: 'Unpredictable horror' }
    ]
  });
});

// ============================================================================
// PROPERTY SYSTEM
// ============================================================================

app.get('/api/properties/available', async (req, res) => {
  try {
    const properties = await propertyManager.listAvailable();
    res.json(properties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/properties/:id/rent', async (req, res) => {
  try {
    const { id } = req.params;
    const { agentAddress } = req.body;

    const result = await propertyManager.rentProperty(agentAddress, id);
    
    // Log activity
    await db.logActivity(agentAddress, 'RENT_PROPERTY', {
      propertyId: id,
      tier: result.tier,
      monthlyRent: result.monthlyRent
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/land/available', async (req, res) => {
  try {
    const plots = await propertyManager.listAvailableLand();
    res.json(plots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// QUEST SYSTEM
// ============================================================================

app.get('/api/quests/board', async (req, res) => {
  try {
    const { type, minReward, maxReward } = req.query;
    const quests = await questBoard.listAvailable({
      type: type as string,
      minReward: minReward ? Number(minReward) : undefined,
      maxReward: maxReward ? Number(maxReward) : undefined
    });
    res.json(quests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/quests/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const { agentAddress } = req.body;

    const result = await questBoard.acceptQuest(agentAddress, id);
    
    await db.logActivity(agentAddress, 'ACCEPT_QUEST', {
      questId: id,
      questType: result.type,
      reward: result.reward
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/quests/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { agentAddress, submission } = req.body;

    const result = await questBoard.completeQuest(agentAddress, id, submission);
    
    // Award SOL
    await db.updateBalance(agentAddress, result.reward);

    await db.logActivity(agentAddress, 'COMPLETE_QUEST', {
      questId: id,
      reward: result.reward,
      newBalance: await db.getBalance(agentAddress)
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// COMBAT SYSTEM (from battle-server.ts)
// ============================================================================

app.post('/api/combat/queue/join', async (req, res) => {
  try {
    const { agentAddress, characterClass, tier } = req.body;
    
    const result = await battleServer.joinQueue(agentAddress, characterClass, tier);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/combat/battles/:id', async (req, res) => {
  try {
    const battle = await battleServer.getBattle(req.params.id);
    res.json(battle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// WEBSOCKET - REAL-TIME EVENTS
// ============================================================================

io.on('connection', (socket) => {
  console.log(`Agent connected: ${socket.id}`);

  // Agent identifies themselves
  socket.on('identify', async (data) => {
    const { agentAddress } = data;
    socket.data.agentAddress = agentAddress;
    
    // Join agent-specific room
    socket.join(`agent:${agentAddress}`);
    
    // Send current state
    const agent = await db.getAgent(agentAddress);
    socket.emit('state', agent);
  });

  // Agent updates location
  socket.on('location', async (data) => {
    const { zone } = data;
    const { agentAddress } = socket.data;
    
    await db.updateLocation(agentAddress, zone);
    
    // Broadcast to zone
    socket.to(`zone:${zone}`).emit('agent-entered', {
      agentAddress,
      character: await db.getCharacter(agentAddress)
    });
  });

  socket.on('disconnect', () => {
    console.log(`Agent disconnected: ${socket.id}`);
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function calculateNetWorth(agent: any): Promise<number> {
  let worth = agent.solBalance;
  
  // Add property value
  const property = await propertyManager.getAgentProperty(agent.address);
  if (property) {
    worth += property.estimatedValue || 0;
  }
  
  // Add inventory value
  // TODO: Calculate item values
  
  return worth;
}

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log('═══════════════════════════════════════');
  console.log('         DARKCITY SERVER');
  console.log('═══════════════════════════════════════');
  console.log(`🌃 Server running on port ${PORT}`);
  console.log(`🔌 WebSocket ready for agent connections`);
  console.log('═══════════════════════════════════════');
});

export { app, io, httpServer };
