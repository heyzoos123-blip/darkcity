/**
 * Redis Pub/Sub
 * Real-time event broadcasting
 */

import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { BaseEvent } from '../types/events';

export interface RedisPubSubConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
}

export class RedisPubSub extends EventEmitter {
  private config: RedisPubSubConfig;
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private isConnected: boolean = false;
  
  // Track subscriptions
  private subscriptions: Map<string, Set<(message: any) => void>> = new Map();

  constructor(config: RedisPubSubConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('[RedisPubSub] Already connected');
      return;
    }

    try {
      // Create publisher client
      this.publisher = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db || 0,
        keyPrefix: this.config.keyPrefix,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        }
      });

      // Create subscriber client
      this.subscriber = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db || 0,
        keyPrefix: this.config.keyPrefix,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        }
      });

      // Handle subscriber messages
      this.subscriber.on('message', (channel, message) => {
        this.handleMessage(channel, message);
      });

      this.subscriber.on('pmessage', (pattern, channel, message) => {
        this.handleMessage(channel, message, pattern);
      });

      // Wait for connections
      await Promise.all([
        this.waitForReady(this.publisher),
        this.waitForReady(this.subscriber)
      ]);

      this.isConnected = true;
      console.log('[RedisPubSub] Connected to Redis');
      this.emit('connected');

    } catch (error) {
      console.error('[RedisPubSub] Connection failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Wait for Redis client to be ready
   */
  private waitForReady(client: Redis): Promise<void> {
    return new Promise((resolve, reject) => {
      if (client.status === 'ready') {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Redis connection timeout'));
      }, 10000);

      client.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });

      client.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    console.log('[RedisPubSub] Disconnecting...');

    if (this.publisher) {
      await this.publisher.quit();
      this.publisher = null;
    }

    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }

    this.isConnected = false;
    this.subscriptions.clear();
    console.log('[RedisPubSub] Disconnected');
    this.emit('disconnected');
  }

  /**
   * Publish an event
   */
  async publish(channel: string, event: BaseEvent): Promise<void> {
    if (!this.isConnected || !this.publisher) {
      throw new Error('Not connected to Redis');
    }

    const message = JSON.stringify(event);
    const recipients = await this.publisher.publish(channel, message);
    
    console.log(`[RedisPubSub] Published to ${channel} - ${recipients} recipients`);
  }

  /**
   * Subscribe to a channel
   */
  async subscribe(
    channel: string,
    handler: (event: BaseEvent) => void
  ): Promise<void> {
    if (!this.isConnected || !this.subscriber) {
      throw new Error('Not connected to Redis');
    }

    // Add handler to subscriptions
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
      await this.subscriber.subscribe(channel);
      console.log(`[RedisPubSub] Subscribed to ${channel}`);
    }

    this.subscriptions.get(channel)!.add(handler);
  }

  /**
   * Subscribe to a pattern
   */
  async psubscribe(
    pattern: string,
    handler: (channel: string, event: BaseEvent) => void
  ): Promise<void> {
    if (!this.isConnected || !this.subscriber) {
      throw new Error('Not connected to Redis');
    }

    // Add handler
    if (!this.subscriptions.has(pattern)) {
      this.subscriptions.set(pattern, new Set());
      await this.subscriber.psubscribe(pattern);
      console.log(`[RedisPubSub] Pattern subscribed to ${pattern}`);
    }

    this.subscriptions.get(pattern)!.add(handler);
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string): Promise<void> {
    if (!this.isConnected || !this.subscriber) {
      return;
    }

    if (this.subscriptions.has(channel)) {
      await this.subscriber.unsubscribe(channel);
      this.subscriptions.delete(channel);
      console.log(`[RedisPubSub] Unsubscribed from ${channel}`);
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(
    channel: string,
    message: string,
    pattern?: string
  ): void {
    try {
      const event = JSON.parse(message) as BaseEvent;
      
      // Call handlers
      const lookupKey = pattern || channel;
      const handlers = this.subscriptions.get(lookupKey);
      
      if (handlers) {
        for (const handler of handlers) {
          try {
            if (pattern) {
              // Pattern subscription - pass channel info
              (handler as any)(channel, event);
            } else {
              // Regular subscription
              handler(event);
            }
          } catch (error) {
            console.error(`[RedisPubSub] Handler error for ${channel}:`, error);
          }
        }
      }

      // Emit event for generic listeners
      this.emit('message', channel, event);

    } catch (error) {
      console.error(`[RedisPubSub] Failed to parse message from ${channel}:`, error);
    }
  }

  /**
   * Get all subscribed channels
   */
  getChannels(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Check if connected
   */
  isReady(): boolean {
    return this.isConnected && 
           this.publisher !== null && 
           this.subscriber !== null &&
           this.publisher.status === 'ready' &&
           this.subscriber.status === 'ready';
  }

  /**
   * Get stats
   */
  async getStats() {
    if (!this.publisher) {
      return null;
    }

    try {
      const info = await this.publisher.info('stats');
      return {
        connected: this.isConnected,
        subscriptions: this.subscriptions.size,
        channels: this.getChannels(),
        info: info
      };
    } catch (error) {
      console.error('[RedisPubSub] Failed to get stats:', error);
      return null;
    }
  }
}
