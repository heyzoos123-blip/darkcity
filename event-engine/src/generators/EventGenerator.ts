/**
 * DARKCITY Event Generator
 * Orchestrates all event generation: scheduled, random, triggered
 */

import { EventEmitter } from 'events';
import * as cron from 'node-cron';
import {
  BaseEvent,
  EventType,
  EventGenerationConfig,
  EventPriority,
  RoutedEvent,
  ZoneId,
  AgentId,
} from '../types/events';
import { Zone } from '../types/zones';
import { EnvironmentalGenerator } from './EnvironmentalGenerator';
import { EncounterGenerator } from './EncounterGenerator';
import { EventRouter } from '../routers/EventRouter';

export interface GeneratorConfig {
  tickInterval: number; // milliseconds between ticks
  enableScheduled: boolean;
  enableRandom: boolean;
  enableTriggered: boolean;
  globalEventRate: number; // base probability multiplier
}

export class EventGenerator extends EventEmitter {
  private config: GeneratorConfig;
  private isRunning: boolean = false;
  private tickInterval?: NodeJS.Timeout;
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();
  
  // Sub-generators
  private environmentalGenerator: EnvironmentalGenerator;
  private encounterGenerator: EncounterGenerator;
  
  // Router
  private router: EventRouter;
  
  // State tracking
  private activeEvents: Map<string, BaseEvent> = new Map();
  private cooldowns: Map<EventType, number> = new Map();
  private eventCounts: Map<EventType, number> = new Map();
  
  // Zone/Agent data (would be from services in real impl)
  private zones: Map<ZoneId, Zone> = new Map();
  private agentLocations: Map<AgentId, ZoneId> = new Map();

  constructor(
    config: GeneratorConfig,
    router: EventRouter,
    environmentalGenerator: EnvironmentalGenerator,
    encounterGenerator: EncounterGenerator
  ) {
    super();
    this.config = config;
    this.router = router;
    this.environmentalGenerator = environmentalGenerator;
    this.encounterGenerator = encounterGenerator;
  }

  /**
   * Start the event generation engine
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('EventGenerator already running');
    }

    console.log('[EventGenerator] Starting event engine...');
    this.isRunning = true;

    // Initialize scheduled events
    if (this.config.enableScheduled) {
      this.initializeScheduledEvents();
    }

    // Start tick loop for random and triggered events
    if (this.config.enableRandom || this.config.enableTriggered) {
      this.startTickLoop();
    }

    this.emit('started');
    console.log('[EventGenerator] Event engine started');
  }

  /**
   * Stop the event generation engine
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('[EventGenerator] Stopping event engine...');
    this.isRunning = false;

    // Stop tick loop
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = undefined;
    }

    // Stop all scheduled tasks
    for (const [name, task] of this.scheduledTasks) {
      task.stop();
      console.log(`[EventGenerator] Stopped scheduled task: ${name}`);
    }
    this.scheduledTasks.clear();

    this.emit('stopped');
    console.log('[EventGenerator] Event engine stopped');
  }

  /**
   * Main tick loop - called every game tick
   */
  private startTickLoop(): void {
    this.tickInterval = setInterval(() => {
      this.tick().catch(err => {
        console.error('[EventGenerator] Tick error:', err);
        this.emit('error', err);
      });
    }, this.config.tickInterval);
  }

  /**
   * Process one game tick
   */
  private async tick(): Promise<void> {
    const startTime = Date.now();

    try {
      // 1. Check for expired events
      this.cleanupExpiredEvents();

      // 2. Generate random environmental events
      if (this.config.enableRandom) {
        await this.generateRandomEnvironmentalEvents();
      }

      // 3. Generate random encounter events per zone
      if (this.config.enableRandom) {
        await this.generateRandomEncounterEvents();
      }

      // 4. Process agent-specific triggers
      if (this.config.enableTriggered) {
        await this.processAgentTriggers();
      }

      // Emit tick stats
      const duration = Date.now() - startTime;
      this.emit('tick', {
        duration,
        activeEvents: this.activeEvents.size,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('[EventGenerator] Tick processing error:', error);
      this.emit('error', error);
    }
  }

  /**
   * Initialize scheduled events (day/night cycle, etc.)
   */
  private initializeScheduledEvents(): void {
    // Day/night cycle - every 2 hours real-time = 12 hour game time
    // So every 10 minutes = 1 hour game time
    const dayNightTask = cron.schedule('*/10 * * * *', async () => {
      const event = await this.environmentalGenerator.generateTimeChange();
      await this.routeEvent(event, EventPriority.NORMAL);
    });
    this.scheduledTasks.set('day-night-cycle', dayNightTask);

    // Weather changes - every 30 minutes
    const weatherTask = cron.schedule('*/30 * * * *', async () => {
      const event = await this.environmentalGenerator.generateWeatherChange();
      await this.routeEvent(event, EventPriority.NORMAL);
    });
    this.scheduledTasks.set('weather-cycle', weatherTask);

    // City announcements - random times
    const announcementTask = cron.schedule('0 */3 * * *', async () => {
      if (Math.random() < 0.3) {
        const event = await this.environmentalGenerator.generateCityAnnouncement();
        await this.routeEvent(event, EventPriority.HIGH);
      }
    });
    this.scheduledTasks.set('city-announcements', announcementTask);

    console.log('[EventGenerator] Scheduled events initialized');
  }

  /**
   * Generate random environmental events
   */
  private async generateRandomEnvironmentalEvents(): Promise<void> {
    // District-wide events with low probability
    const districtEventChance = 0.001 * this.config.globalEventRate;
    
    if (Math.random() < districtEventChance) {
      const event = await this.environmentalGenerator.generateRandomDistrictEvent();
      if (event) {
        await this.routeEvent(event, EventPriority.NORMAL);
      }
    }
  }

  /**
   * Generate random encounter events per zone
   */
  private async generateRandomEncounterEvents(): Promise<void> {
    for (const [zoneId, zone] of this.zones) {
      const agentsInZone = this.getAgentsInZone(zoneId);
      
      if (agentsInZone.length === 0) {
        continue; // No agents, no events
      }

      // Calculate event probability for this zone
      const baseProb = zone.eventProbabilities['ENCOUNTER'] || 0.01;
      const modifiedProb = baseProb * this.config.globalEventRate;

      if (Math.random() < modifiedProb) {
        const event = await this.encounterGenerator.generateZoneEncounter(
          zone,
          agentsInZone
        );
        
        if (event) {
          await this.routeEvent(event, EventPriority.NORMAL);
        }
      }
    }
  }

  /**
   * Process agent-specific event triggers
   */
  private async processAgentTriggers(): Promise<void> {
    // Check each agent for triggers based on:
    // - Location
    // - Recent actions
    // - Stats/inventory
    // - Time of day
    
    for (const [agentId, zoneId] of this.agentLocations) {
      const triggers = await this.encounterGenerator.evaluateAgentTriggers(
        agentId,
        zoneId
      );

      for (const event of triggers) {
        await this.routeEvent(event, EventPriority.NORMAL);
      }
    }
  }

  /**
   * Clean up expired events
   */
  private cleanupExpiredEvents(): void {
    const now = Date.now();
    for (const [eventId, event] of this.activeEvents) {
      // Check if event has expired (implementation depends on event type)
      // For now, remove events older than 1 hour
      if (now - event.timestamp > 3600000) {
        this.activeEvents.delete(eventId);
        this.emit('event:expired', event);
      }
    }
  }

  /**
   * Route an event to appropriate handlers
   */
  private async routeEvent(
    event: BaseEvent,
    priority: EventPriority
  ): Promise<void> {
    // Track active event
    this.activeEvents.set(event.id, event);

    // Create routed event
    const routedEvent: RoutedEvent = {
      event,
      priority,
      targetZones: [], // Router will determine this
      broadcast: true
    };

    // Send to router
    await this.router.route(routedEvent);

    // Update stats
    const currentCount = this.eventCounts.get(event.type) || 0;
    this.eventCounts.set(event.type, currentCount + 1);

    this.emit('event:generated', event);
  }

  /**
   * Get agents currently in a zone
   */
  private getAgentsInZone(zoneId: ZoneId): AgentId[] {
    const agents: AgentId[] = [];
    for (const [agentId, agentZoneId] of this.agentLocations) {
      if (agentZoneId === zoneId) {
        agents.push(agentId);
      }
    }
    return agents;
  }

  /**
   * Public methods for external control
   */

  public registerZone(zone: Zone): void {
    this.zones.set(zone.id, zone);
  }

  public updateAgentLocation(agentId: AgentId, zoneId: ZoneId): void {
    this.agentLocations.set(agentId, zoneId);
  }

  public removeAgent(agentId: AgentId): void {
    this.agentLocations.delete(agentId);
  }

  public getActiveEvents(): BaseEvent[] {
    return Array.from(this.activeEvents.values());
  }

  public getEventStats(): Record<EventType, number> {
    return Object.fromEntries(this.eventCounts) as Record<EventType, number>;
  }

  public setGlobalEventRate(rate: number): void {
    this.config.globalEventRate = rate;
    console.log(`[EventGenerator] Global event rate set to ${rate}`);
  }
}
