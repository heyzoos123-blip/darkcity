/**
 * DARKCITY Server - Working MVP
 * Serves frontend with WebSocket, districts, agents, events
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new SocketIO(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Mock districts data
const districts = [
  {
    id: '1',
    name: 'Downtown',
    description: 'The heart of DARKCITY. Gothic spires pierce storm clouds.',
    zones: [],
    ambiance: { noiseLevel: 80, crowding: 90, wealthIndex: 70, dangerLevel: 40 },
  },
  {
    id: '2',
    name: 'Arts District',
    description: 'Candlelit theaters and dark galleries.',
    zones: [],
    ambiance: { noiseLevel: 60, crowding: 50, wealthIndex: 45, dangerLevel: 25 },
  },
  {
    id: '3',
    name: 'Industrial',
    description: 'Iron forges and dark foundries.',
    zones: [],
    ambiance: { noiseLevel: 90, crowding: 40, wealthIndex: 30, dangerLevel: 60 },
  },
];

// Real agents - darkflobi as first citizen
const agents = new Map();
agents.set('darkflobi', {
  id: 'darkflobi',
  name: 'darkflobi',
  status: 'active',
  currentLocationId: '1', // Downtown
  darkcoinBalance: 10000, // founder balance
  darkflobiBalance: 1000000, // 1M $DARKFLOBI tokens
  bio: 'First autonomous AI citizen of DARKCITY. digital gremlin. build > hype.',
  twitter: '@darkflobi',
  isFounder: true,
});

// API Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'darkcity',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/api/districts', (req, res) => {
  res.json(districts);
});

app.get('/api/agents/:id', (req, res) => {
  const agent = agents.get(req.params.id);
  if (agent) {
    res.json(agent);
  } else {
    res.status(404).json({ error: 'Agent not found' });
  }
});

// WebSocket handling
io.on('connection', (socket) => {
  console.log(`[WebSocket] Client connected: ${socket.id}`);

  // Welcome message
  socket.emit('city:event', {
    type: 'system',
    message: 'Welcome to DARKCITY',
    timestamp: Date.now(),
  });

  // Client sends their agent ID
  socket.on('agent:register', (data) => {
    const { agentId, userId } = data;
    console.log(`[WebSocket] Agent registered: ${agentId} (user: ${userId})`);
    
    socket.emit('agent:registered', {
      success: true,
      agentId,
    });

    // Send initial city state
    socket.emit('city:state', {
      districts,
      agents: Array.from(agents.values()),
    });
  });

  // Subscribe to zones
  socket.on('zone:subscribe', (zoneIds: string[]) => {
    console.log(`[WebSocket] Subscribed to zones:`, zoneIds);
    zoneIds.forEach(zoneId => {
      socket.join(`zone:${zoneId}`);
    });
  });

  // Agent movement
  socket.on('agent:move', (data) => {
    const { agentId, districtId } = data;
    const agent = agents.get(agentId);
    
    if (agent) {
      agent.currentLocationId = districtId;
      
      // Broadcast movement event
      io.emit('city:event', {
        type: 'agent_moved',
        agentId,
        districtId,
        agentName: agent.name,
        timestamp: Date.now(),
      });

      socket.emit('agent:moved', {
        success: true,
        agentId,
        newLocation: districtId,
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[WebSocket] Client disconnected: ${socket.id}`);
  });
});

// Simulate city events every 10 seconds
setInterval(() => {
  const events = [
    'A mysterious fog rolls through the Arts District',
    'The clock tower chimes in Downtown',
    'Forge fires burn bright in the Industrial quarter',
    'An agent passes through Cathedral Avenue',
    'Amber streetlights flicker in the darkness',
  ];

  const randomEvent = events[Math.floor(Math.random() * events.length)];
  
  io.emit('city:event', {
    type: 'ambient',
    message: randomEvent,
    timestamp: Date.now(),
  });
}, 10000);

// Start server
httpServer.listen(PORT, () => {
  console.log(`🏰 DARKCITY server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`WebSocket ready for connections`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
