import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

export class DatabaseService {
  public prisma: PrismaClient;
  public redis: Redis;
  private connected: boolean = false;

  constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
    });
    
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });
  }

  async connect(): Promise<void> {
    try {
      // Test Prisma connection
      await this.prisma.$connect();
      
      // Test Redis connection
      await this.redis.ping();
      
      this.connected = true;
      console.log('✅ Database services connected (PostgreSQL + Redis)');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    this.redis.disconnect();
    this.connected = false;
    console.log('Database services disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Agent CRUD
  async createAgent(data: any) {
    return this.prisma.agent.create({ data });
  }

  async getAgent(id: string) {
    // Try cache first
    const cached = await this.redis.get(`agent:${id}`);
    if (cached) return JSON.parse(cached);

    // Fetch from DB
    const agent = await this.prisma.agent.findUnique({ where: { id } });
    
    // Cache it
    if (agent) {
      await this.redis.setex(`agent:${id}`, 300, JSON.stringify(agent)); // 5 min TTL
    }
    
    return agent;
  }

  async updateAgent(id: string, data: any) {
    const agent = await this.prisma.agent.update({
      where: { id },
      data
    });
    
    // Invalidate cache
    await this.redis.del(`agent:${id}`);
    
    return agent;
  }

  async listAgents(filters?: any) {
    return this.prisma.agent.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' }
    });
  }

  // Event CRUD
  async createEvent(data: any) {
    return this.prisma.event.create({ data });
  }

  async getEvent(id: string) {
    return this.prisma.event.findUnique({ where: { id } });
  }

  async listEvents(filters?: any) {
    return this.prisma.event.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }

  // Interaction CRUD
  async createInteraction(data: any) {
    return this.prisma.interaction.create({ data });
  }

  async getInteraction(id: string) {
    return this.prisma.interaction.findUnique({
      where: { id },
      include: { messages: true }
    });
  }

  async updateInteraction(id: string, data: any) {
    return this.prisma.interaction.update({
      where: { id },
      data
    });
  }

  // Memory CRUD
  async createMemory(data: any) {
    return this.prisma.memory.create({ data });
  }

  async getMemories(agentId: string, filters?: any) {
    return this.prisma.memory.findMany({
      where: {
        agentId,
        ...filters
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }

  // Working Memory (Redis)
  async setWorkingMemory(agentId: string, data: any, ttl: number = 3600) {
    await this.redis.setex(`working_memory:${agentId}`, ttl, JSON.stringify(data));
  }

  async getWorkingMemory(agentId: string) {
    const data = await this.redis.get(`working_memory:${agentId}`);
    return data ? JSON.parse(data) : null;
  }

  // Pub/Sub for real-time events
  async publish(channel: string, message: any) {
    await this.redis.publish(channel, JSON.stringify(message));
  }

  subscribe(channel: string, callback: (message: any) => void) {
    const subscriber = this.redis.duplicate();
    subscriber.subscribe(channel);
    subscriber.on('message', (ch, msg) => {
      if (ch === channel) {
        callback(JSON.parse(msg));
      }
    });
    return subscriber;
  }
}
