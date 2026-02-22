/**
 * DARKCITY Interaction Layer
 * Main entry point and orchestration
 */

import express, { Express } from 'express';
import { createServer, Server as HTTPServer } from 'http';
import cors from 'cors';
import { Pool } from 'pg';
import Redis from 'ioredis';
import winston, { Logger } from 'winston';
import { ConversationManager } from './conversation/ConversationManager';
import { InteractionStateMachine } from './state/InteractionStateMachine';
import { AIOrchestrator, AIConfig } from './ai/AIOrchestrator';
import { TransactionService } from './transactions/TransactionService';
import { ReputationSystem } from './reputation/ReputationSystem';
import { WebSocketServer, WebSocketConfig } from './websocket/WebSocketServer';
import { AnalyticsService } from './analytics/AnalyticsService';
import { RateLimiter, RateLimitConfig } from './security/RateLimiter';

export interface InteractionLayerConfig {
  port: number;
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  ai: AIConfig;
  rateLimit: RateLimitConfig;
  websocket: WebSocketConfig;
  logLevel: string;
}

export class InteractionLayer {
  private app: Express;
  private httpServer: HTTPServer;
  private db: Pool;
  private redis: Redis;
  private logger: Logger;

  // Core services
  private stateMachine: InteractionStateMachine;
  private conversationManager: ConversationManager;
  private aiOrchestrator: AIOrchestrator;
  private transactionService: TransactionService;
  private reputationSystem: ReputationSystem;
  private websocketServer: WebSocketServer;
  private analyticsService: AnalyticsService;
  private rateLimiter: RateLimiter;

  constructor(private config: InteractionLayerConfig) {
    this.logger = this.createLogger();
    this.app = express();
    this.httpServer = createServer(this.app);
    this.db = this.createDatabasePool();
    this.redis = this.createRedisClient();

    // Initialize services
    this.stateMachine = new InteractionStateMachine(this.logger);
    this.aiOrchestrator = new AIOrchestrator(config.ai, this.logger);
    this.conversationManager = new ConversationManager(
      this.redis,
      this.db,
      this.stateMachine,
      this.logger
    );
    this.transactionService = new TransactionService(
      this.redis,
      this.db,
      this.logger
    );
    this.reputationSystem = new ReputationSystem(
      this.db,
      this.redis,
      this.logger
    );
    this.websocketServer = new WebSocketServer(
      this.httpServer,
      this.redis,
      config.websocket,
      this.logger
    );
    this.analyticsService = new AnalyticsService(
      this.db,
      this.redis,
      this.logger
    );
    this.rateLimiter = new RateLimiter(
      this.redis,
      config.rateLimit,
      this.logger
    );

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Create Winston logger
   */
  private createLogger(): Logger {
    return winston.createLogger({
      level: this.config.logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
        new winston.transports.File({
          filename: 'logs/interaction-layer.log',
        }),
      ],
    });
  }

  /**
   * Create PostgreSQL connection pool
   */
  private createDatabasePool(): Pool {
    return new Pool(this.config.database);
  }

  /**
   * Create Redis client
   */
  private createRedisClient(): Redis {
    return new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
    });
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      this.logger.info('HTTP Request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });
      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date() });
    });

    // Interaction routes
    this.app.post('/interactions/start', async (req, res) => {
      try {
        const { initiator, target, location, openingMessage } = req.body;

        // Rate limit check
        await this.rateLimiter.checkInteractionLimit(initiator);

        const interaction = await this.conversationManager.startConversation(
          initiator,
          target,
          { location, openingMessage }
        );

        res.json(interaction);
      } catch (error) {
        this.logger.error('Error starting interaction', { error });
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    this.app.post('/interactions/:id/accept', async (req, res) => {
      try {
        const { id } = req.params;
        const { agentId } = req.body;

        const interaction = await this.conversationManager.acceptConversation(
          id,
          agentId
        );

        res.json(interaction);
      } catch (error) {
        this.logger.error('Error accepting interaction', { error });
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    this.app.post('/interactions/:id/message', async (req, res) => {
      try {
        const { id } = req.params;
        const { from, content } = req.body;

        // Rate limit check
        await this.rateLimiter.checkMessageLimit(from);

        const interaction = await this.conversationManager.getInteraction(id);
        const message = await this.conversationManager.addMessage(
          interaction,
          { from, content }
        );

        // Broadcast via WebSocket
        await this.websocketServer.broadcastMessage(id, message);

        res.json(message);
      } catch (error) {
        this.logger.error('Error adding message', { error });
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    this.app.post('/interactions/:id/end', async (req, res) => {
      try {
        const { id } = req.params;
        const { agentId, reason } = req.body;

        const interaction = await this.conversationManager.endConversation(
          id,
          agentId,
          reason
        );

        res.json(interaction);
      } catch (error) {
        this.logger.error('Error ending interaction', { error });
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Reputation routes
    this.app.get('/reputation/:agentId', async (req, res) => {
      try {
        const { agentId } = req.params;
        const reputation = await this.reputationSystem.getReputation(agentId);
        res.json(reputation);
      } catch (error) {
        this.logger.error('Error fetching reputation', { error });
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Analytics routes
    this.app.get('/analytics/interactions', async (req, res) => {
      try {
        const analytics = await this.analyticsService.getInteractionAnalytics();
        res.json(analytics);
      } catch (error) {
        this.logger.error('Error fetching analytics', { error });
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    this.app.get('/analytics/realtime', async (req, res) => {
      try {
        const metrics = await this.analyticsService.getRealtimeMetrics();
        res.json(metrics);
      } catch (error) {
        this.logger.error('Error fetching realtime metrics', { error });
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    await this.initializeDatabase();

    this.httpServer.listen(this.config.port, () => {
      this.logger.info(`Interaction Layer started on port ${this.config.port}`);
      this.logger.info('Services initialized:', {
        stateMachine: '✓',
        conversationManager: '✓',
        aiOrchestrator: '✓',
        transactionService: '✓',
        reputationSystem: '✓',
        websocketServer: '✓',
        analyticsService: '✓',
        rateLimiter: '✓',
      });
    });
  }

  /**
   * Initialize database schema
   */
  private async initializeDatabase(): Promise<void> {
    // Schema initialization would go here
    // For now, assumes tables exist
    this.logger.info('Database initialized');
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Interaction Layer...');

    await this.websocketServer.shutdown();
    await this.db.end();
    await this.redis.quit();

    this.httpServer.close(() => {
      this.logger.info('Server closed');
    });
  }

  // Expose services for external use
  public getServices() {
    return {
      conversationManager: this.conversationManager,
      aiOrchestrator: this.aiOrchestrator,
      transactionService: this.transactionService,
      reputationSystem: this.reputationSystem,
      analyticsService: this.analyticsService,
      rateLimiter: this.rateLimiter,
    };
  }
}

// Export types and services
export * from './types/interaction.types';
export { ConversationManager } from './conversation/ConversationManager';
export { AIOrchestrator } from './ai/AIOrchestrator';
export { TransactionService } from './transactions/TransactionService';
export { ReputationSystem } from './reputation/ReputationSystem';
export { AnalyticsService } from './analytics/AnalyticsService';
export { RateLimiter } from './security/RateLimiter';
