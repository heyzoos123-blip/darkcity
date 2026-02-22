/**
 * WebSocket Server for Real-Time Interaction Updates
 * Provides live notifications, presence, and interaction events
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import Redis from 'ioredis';
import { Logger } from 'winston';
import { createAdapter } from '@socket.io/redis-adapter';

export interface WebSocketConfig {
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  pingTimeout: number;
  pingInterval: number;
}

export class WebSocketServer {
  private io: SocketIOServer;
  private redis: Redis;
  private redisSub: Redis;
  private logger: Logger;
  private connectedAgents: Map<string, Set<string>>; // agentId -> Set<socketId>

  constructor(
    httpServer: HTTPServer,
    redis: Redis,
    config: WebSocketConfig,
    logger: Logger
  ) {
    this.redis = redis;
    this.redisSub = redis.duplicate();
    this.logger = logger;
    this.connectedAgents = new Map();

    // Initialize Socket.IO
    this.io = new SocketIOServer(httpServer, {
      cors: config.cors,
      pingTimeout: config.pingTimeout,
      pingInterval: config.pingInterval,
    });

    // Set up Redis adapter for horizontal scaling
    this.setupRedisAdapter();

    // Set up event handlers
    this.setupEventHandlers();

    // Subscribe to Redis channels
    this.subscribeToRedis();
  }

  /**
   * Set up Redis adapter for multi-instance support
   */
  private async setupRedisAdapter() {
    const pubClient = this.redis;
    const subClient = this.redisSub;
    
    this.io.adapter(createAdapter(pubClient, subClient));
    
    this.logger.info('WebSocket Redis adapter configured');
  }

  /**
   * Set up Socket.IO event handlers
   */
  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      this.logger.info('Client connected', { socketId: socket.id });

      // Authentication
      socket.on('authenticate', async (data: { agentId: string; token: string }) => {
        const isValid = await this.verifyToken(data.agentId, data.token);
        
        if (!isValid) {
          socket.emit('error', { message: 'Invalid token' });
          socket.disconnect();
          return;
        }

        // Associate socket with agent
        socket.data.agentId = data.agentId;
        this.addAgentConnection(data.agentId, socket.id);

        // Join agent's personal room
        socket.join(`agent:${data.agentId}`);

        // Update presence
        await this.updatePresence(data.agentId, true);

        socket.emit('authenticated', { agentId: data.agentId });
        
        this.logger.info('Agent authenticated', { 
          agentId: data.agentId, 
          socketId: socket.id 
        });
      });

      // Subscribe to location
      socket.on('subscribe:location', (locationId: string) => {
        socket.join(`location:${locationId}`);
        this.logger.debug('Subscribed to location', { locationId, socketId: socket.id });
      });

      // Unsubscribe from location
      socket.on('unsubscribe:location', (locationId: string) => {
        socket.leave(`location:${locationId}`);
      });

      // Subscribe to interaction
      socket.on('subscribe:interaction', (interactionId: string) => {
        socket.join(`interaction:${interactionId}`);
      });

      // Typing indicator
      socket.on('typing', (data: { interactionId: string }) => {
        if (socket.data.agentId) {
          this.io.to(`interaction:${data.interactionId}`).emit('agent:typing', {
            agentId: socket.data.agentId,
            interactionId: data.interactionId,
          });
        }
      });

      // Disconnect
      socket.on('disconnect', async () => {
        if (socket.data.agentId) {
          this.removeAgentConnection(socket.data.agentId, socket.id);
          
          // Update presence if no more connections
          if (!this.hasAgentConnections(socket.data.agentId)) {
            await this.updatePresence(socket.data.agentId, false);
          }
        }
        
        this.logger.info('Client disconnected', { socketId: socket.id });
      });

      // Error handling
      socket.on('error', (error) => {
        this.logger.error('Socket error', { 
          error: error.message, 
          socketId: socket.id 
        });
      });
    });
  }

  /**
   * Subscribe to Redis pub/sub channels
   */
  private subscribeToRedis() {
    // Subscribe to interaction events
    this.redisSub.psubscribe('interaction:*', (err) => {
      if (err) {
        this.logger.error('Redis subscribe error', { error: err.message });
      }
    });

    // Subscribe to agent notifications
    this.redisSub.psubscribe('agent:*:notifications', (err) => {
      if (err) {
        this.logger.error('Redis subscribe error', { error: err.message });
      }
    });

    // Handle messages
    this.redisSub.on('pmessage', (pattern, channel, message) => {
      this.handleRedisMessage(channel, message);
    });

    this.logger.info('Subscribed to Redis channels');
  }

  /**
   * Handle Redis pub/sub messages
   */
  private handleRedisMessage(channel: string, message: string) {
    try {
      const data = JSON.parse(message);

      // Route to appropriate handler
      if (channel.startsWith('interaction:')) {
        this.handleInteractionEvent(data);
      } else if (channel.includes(':notifications')) {
        this.handleNotification(data);
      }
    } catch (error) {
      this.logger.error('Error handling Redis message', {
        channel,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle interaction events
   */
  private handleInteractionEvent(data: any) {
    const { interactionId, event, payload } = data;

    // Broadcast to interaction room
    this.io.to(`interaction:${interactionId}`).emit('interaction:event', {
      interactionId,
      event,
      payload,
      timestamp: new Date(),
    });
  }

  /**
   * Handle agent notifications
   */
  private handleNotification(data: any) {
    const { agentId, type, payload } = data;

    // Send to agent's personal room
    this.io.to(`agent:${agentId}`).emit('notification', {
      type,
      payload,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast message to interaction
   */
  async broadcastMessage(interactionId: string, message: any) {
    this.io.to(`interaction:${interactionId}`).emit('interaction:message', message);
  }

  /**
   * Broadcast interaction status change
   */
  async broadcastStatusChange(interactionId: string, status: string, metadata?: any) {
    this.io.to(`interaction:${interactionId}`).emit('interaction:status', {
      interactionId,
      status,
      metadata,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast agent entered location
   */
  async broadcastAgentEntered(locationId: string, agentId: string) {
    this.io.to(`location:${locationId}`).emit('location:agent_entered', {
      locationId,
      agentId,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast agent left location
   */
  async broadcastAgentLeft(locationId: string, agentId: string) {
    this.io.to(`location:${locationId}`).emit('location:agent_left', {
      locationId,
      agentId,
      timestamp: new Date(),
    });
  }

  /**
   * Update agent presence
   */
  private async updatePresence(agentId: string, online: boolean) {
    await this.redis.hset('agent:presence', agentId, online ? '1' : '0');
    await this.redis.hset(
      'agent:last_seen',
      agentId,
      new Date().toISOString()
    );

    // Broadcast presence change
    this.io.emit('presence:change', {
      agentId,
      online,
      timestamp: new Date(),
    });
  }

  /**
   * Verify authentication token
   */
  private async verifyToken(agentId: string, token: string): Promise<boolean> {
    // In production, verify JWT or session token
    // For now, simple check
    const storedToken = await this.redis.get(`agent:token:${agentId}`);
    return storedToken === token;
  }

  /**
   * Add agent connection
   */
  private addAgentConnection(agentId: string, socketId: string) {
    if (!this.connectedAgents.has(agentId)) {
      this.connectedAgents.set(agentId, new Set());
    }
    this.connectedAgents.get(agentId)!.add(socketId);
  }

  /**
   * Remove agent connection
   */
  private removeAgentConnection(agentId: string, socketId: string) {
    const sockets = this.connectedAgents.get(agentId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.connectedAgents.delete(agentId);
      }
    }
  }

  /**
   * Check if agent has active connections
   */
  private hasAgentConnections(agentId: string): boolean {
    const sockets = this.connectedAgents.get(agentId);
    return sockets ? sockets.size > 0 : false;
  }

  /**
   * Get online agents
   */
  async getOnlineAgents(): Promise<string[]> {
    return Array.from(this.connectedAgents.keys());
  }

  /**
   * Shutdown server
   */
  async shutdown() {
    this.io.close();
    await this.redisSub.quit();
    this.logger.info('WebSocket server shut down');
  }
}
