/**
 * DARKCITY Event Engine
 * Main orchestrator for all event generation and processing
 */

import { EventEmitter } from 'events';
import { EventGenerator, GeneratorConfig } from './generators/EventGenerator';
import { EnvironmentalGenerator } from './generators/EnvironmentalGenerator';
import { EncounterGenerator } from './generators/EncounterGenerator';
import { EventRouter, RouterConfig } from './routers/EventRouter';
import { EventProcessor, ProcessorConfig } from './processors/EventProcessor';
import { EventStore, EventStoreConfig } from './storage/EventStore';
import { RedisPubSub, RedisPubSubConfig } from './utils/RedisPubSub';
import { Zone, AgentLocation } from './types/zones';
import { BaseEvent, AgentId, ZoneId } from './types/events';

export interface EventEngineConfig {
  generator: GeneratorConfig;
  router: RouterConfig;
  processor: ProcessorConfig;
  store: EventStoreConfig;
  redis: RedisPubSubConfig;
}

export class EventEngine extends EventEmitter {
  private config: EventEngineConfig;
  
  // Core components
  private generator: EventGenerator;
  private environmentalGenerator: EnvironmentalGenerator;
  private encounterGenerator: EncounterGenerator;
  private router: EventRouter;
  private processor: EventProcessor;
  private store: EventStore;
  private pubsub: RedisPubSub;
  
  // State
  private isRunning: boolean = false;
  private zones: Map<ZoneId, Zone> = new Map();

  constructor(config: EventEngineConfig) {
    super();
    this.config = config;

    // Initialize components
    this.pubsub = new RedisPubSub(config.redis);
    this.store = new EventStore(config.store);
    this.processor = new EventProcessor(config.processor);
    this.router = new EventRouter(config.router, this.processor, this.store, this.pubsub);
    
    this.environmentalGenerator = new EnvironmentalGenerator();
    this.encounterGenerator = new EncounterGenerator();
    
    this.generator = new EventGenerator(
      config.generator,
      this.router,
      this.environmentalGenerator,
      this.encounterGenerator
    );

    this.setupEventListeners();
  }

  /**
   * Start the Event Engine
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Event Engine already running');
    }

    console.log('=================================');
    console.log('DARKCITY EVENT ENGINE');
    console.log('=================================');

    try {
      // 1. Connect to Redis
      console.log('[EventEngine] Connecting to Redis...');
      await this.pubsub.connect();

      // 2. Start generator
      console.log('[EventEngine] Starting event generator...');
      await this.generator.start();

      this.isRunning = true;
      console.log('[EventEngine] ✓ Event Engine started successfully');
      console.log('=================================');
      
      this.emit('started');

    } catch (error) {
      console.error('[EventEngine] Failed to start:', error);
      await this.stop();
      throw error;
    }
  }

  /**
   * Stop the Event Engine
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('[EventEngine] Stopping Event Engine...');

    try {
      // Stop generator
      await this.generator.stop();

      // Disconnect from Redis
      await this.pubsub.disconnect();

      this.isRunning = false;
      console.log('[EventEngine] ✓ Event Engine stopped');
      this.emit('stopped');

    } catch (error) {
      console.error('[EventEngine] Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Register a zone
   */
  registerZone(zone: Zone): void {
    this.zones.set(zone.id, zone);
    this.generator.registerZone(zone);
    console.log(`[EventEngine] Registered zone: ${zone.name} (${zone.id})`);
  }

  /**
   * Update agent location
   */
  updateAgentLocation(agentId: AgentId, zoneId: ZoneId): void {
    this.generator.updateAgentLocation(agentId, zoneId);
    
    // Update zone occupancy
    const zone = this.zones.get(zoneId);
    if (zone) {
      zone.currentOccupancy++;
    }
  }

  /**
   * Remove agent
   */
  removeAgent(agentId: AgentId): void {
    this.generator.removeAgent(agentId);
  }

  /**
   * Subscribe to events for a zone
   */
  async subscribeToZone(
    zoneId: ZoneId,
    handler: (event: BaseEvent) => void
  ): Promise<void> {
    const channel = `darkcity.events.zone.${zoneId}`;
    await this.pubsub.subscribe(channel, handler);
    console.log(`[EventEngine] Subscribed to zone events: ${zoneId}`);
  }

  /**
   * Subscribe to events for an agent
   */
  async subscribeToAgent(
    agentId: AgentId,
    handler: (event: BaseEvent) => void
  ): Promise<void> {
    const channel = `darkcity.events.agent.${agentId}`;
    await this.pubsub.subscribe(channel, handler);
    console.log(`[EventEngine] Subscribed to agent events: ${agentId}`);
  }

  /**
   * Subscribe to global events
   */
  async subscribeToGlobal(
    handler: (event: BaseEvent) => void
  ): Promise<void> {
    await this.pubsub.subscribe('darkcity.events.global', handler);
    console.log('[EventEngine] Subscribed to global events');
  }

  /**
   * Query event history
   */
  async queryEvents(query: any): Promise<BaseEvent[]> {
    return this.store.queryEvents(query);
  }

  /**
   * Get agent event history
   */
  async getAgentHistory(agentId: AgentId, limit: number = 50): Promise<BaseEvent[]> {
    return this.store.getAgentHistory(agentId, limit);
  }

  /**
   * Get zone events
   */
  async getZoneEvents(
    zoneId: ZoneId,
    startTime?: number,
    endTime?: number,
    limit: number = 50
  ): Promise<BaseEvent[]> {
    return this.store.getZoneEvents(zoneId, startTime, endTime, limit);
  }

  /**
   * Handle agent choice in encounter
   */
  async handleAgentChoice(
    eventId: string,
    agentId: AgentId,
    choiceId: string
  ): Promise<any> {
    return this.processor.handleAgentChoice(eventId, agentId, choiceId);
  }

  /**
   * Set global event rate
   */
  setGlobalEventRate(rate: number): void {
    this.generator.setGlobalEventRate(rate);
  }

  /**
   * Get current environmental state
   */
  getEnvironmentalState() {
    return this.environmentalGenerator.getCurrentState();
  }

  /**
   * Get statistics
   */
  async getStats() {
    const [storeStats, routerStats, processorStats] = await Promise.all([
      this.store.getStats(),
      Promise.resolve(this.router.getStats()),
      Promise.resolve(this.processor.getStats())
    ]);

    return {
      running: this.isRunning,
      zones: this.zones.size,
      environmental: this.environmentalGenerator.getCurrentState(),
      generator: this.generator.getEventStats(),
      store: storeStats,
      router: routerStats,
      processor: processorStats,
      redis: await this.pubsub.getStats()
    };
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Generator events
    this.generator.on('event:generated', (event) => {
      this.emit('event:generated', event);
    });

    this.generator.on('error', (error) => {
      console.error('[EventEngine] Generator error:', error);
      this.emit('error', error);
    });

    // Router events
    this.router.on('event:routed', (event) => {
      this.emit('event:routed', event);
    });

    this.router.on('event:failed', (event, error) => {
      console.error('[EventEngine] Routing failed:', event.id, error);
      this.emit('event:failed', event, error);
    });

    // Processor events
    this.processor.on('event:processed', (event) => {
      this.emit('event:processed', event);
    });

    this.processor.on('encounter:started', (event) => {
      this.emit('encounter:started', event);
    });

    this.processor.on('social:started', (event) => {
      this.emit('social:started', event);
    });

    this.processor.on('event:resolved', (resolution) => {
      this.emit('event:resolved', resolution);
    });

    // PubSub events
    this.pubsub.on('connected', () => {
      console.log('[EventEngine] Redis connected');
    });

    this.pubsub.on('error', (error) => {
      console.error('[EventEngine] Redis error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      running: this.isRunning,
      zones: this.zones.size,
      redisConnected: this.pubsub.isReady()
    };
  }
}
