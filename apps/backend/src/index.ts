import express, { Express } from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';

// Services
import { DatabaseService } from './services/database';
import { EventEngine } from './services/events';
import { MemoryService } from './services/memory';
import { InteractionService } from './services/interactions';

// API Routes
import { setupAgentRoutes } from './api/agents';
import { setupEventRoutes } from './api/events';
import { setupMemoryRoutes } from './api/memory';
import { setupInteractionRoutes } from './api/interactions';

// WebSocket Handler
import { setupWebSocket } from './websocket';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

class DarkCityServer {
  private app: Express;
  private server: http.Server;
  private io: SocketIOServer;
  
  // Services
  private db: DatabaseService;
  private events: EventEngine;
  private memory: MemoryService;
  private interactions: InteractionService;

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: FRONTEND_URL,
        methods: ['GET', 'POST']
      }
    });
    
    this.db = new DatabaseService();
    this.events = new EventEngine(this.db);
    this.memory = new MemoryService(this.db);
    this.interactions = new InteractionService(this.db, this.memory);
  }

  async initialize() {
    console.log('🌃 Initializing DARKCITY server...');
    
    // Connect to database
    await this.db.connect();
    console.log('✅ Database connected');
    
    // Initialize services
    await this.events.initialize();
    console.log('✅ Event engine initialized');
    
    await this.memory.initialize();
    console.log('✅ Memory system initialized');
    
    await this.interactions.initialize();
    console.log('✅ Interaction service initialized');
    
    // Setup middleware
    this.setupMiddleware();
    
    // Setup routes
    this.setupRoutes();
    
    // Setup WebSocket
    setupWebSocket(this.io, {
      db: this.db,
      events: this.events,
      memory: this.memory,
      interactions: this.interactions
    });
    console.log('✅ WebSocket server initialized');
    
    // Start event engine
    this.events.start();
    console.log('✅ Event engine started');
  }

  private setupMiddleware() {
    this.app.use(cors({
      origin: FRONTEND_URL,
      credentials: true
    }));
    
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: this.db.isConnected(),
          events: this.events.isRunning(),
          memory: true,
          interactions: true
        }
      });
    });
    
    // API routes
    setupAgentRoutes(this.app, this.db, this.events, this.io);
    setupEventRoutes(this.app, this.events, this.io);
    setupMemoryRoutes(this.app, this.memory, this.io);
    setupInteractionRoutes(this.app, this.interactions, this.io);
    
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });
    
    // Error handler
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message
      });
    });
  }

  async start() {
    await this.initialize();
    
    this.server.listen(PORT, () => {
      console.log(`\n🌃 DARKCITY server running on port ${PORT}`);
      console.log(`📡 WebSocket server ready`);
      console.log(`🎯 Frontend URL: ${FRONTEND_URL}\n`);
    });
  }

  async shutdown() {
    console.log('\n🌃 Shutting down DARKCITY server...');
    
    // Stop event engine
    this.events.stop();
    
    // Close WebSocket connections
    this.io.close();
    
    // Disconnect database
    await this.db.disconnect();
    
    // Close HTTP server
    this.server.close();
    
    console.log('✅ Server shut down successfully\n');
    process.exit(0);
  }
}

// Start server
const server = new DarkCityServer();

server.start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => server.shutdown());
process.on('SIGINT', () => server.shutdown());
