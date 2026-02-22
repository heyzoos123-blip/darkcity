import { EventEmitter } from 'events';
import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './database';
import { EventType, EventPriority } from '@darkcity/shared';

interface EventConfig {
  tickInterval: number;
  enableScheduled: boolean;
  enableRandom: boolean;
  enableTriggered: boolean;
  globalEventRate: number;
}

export class EventEngine extends EventEmitter {
  private db: DatabaseService;
  private config: EventConfig;
  private running: boolean = false;
  private tickInterval?: NodeJS.Timeout;
  private cronJobs: cron.ScheduledTask[] = [];

  constructor(db: DatabaseService, config?: Partial<EventConfig>) {
    super();
    this.db = db;
    this.config = {
      tickInterval: 100,
      enableScheduled: true,
      enableRandom: true,
      enableTriggered: true,
      globalEventRate: 1.0,
      ...config
    };
  }

  async initialize() {
    console.log('Initializing event engine...');
    
    if (this.config.enableScheduled) {
      this.setupScheduledEvents();
    }
  }

  private setupScheduledEvents() {
    // Day/night cycle (every 4 hours in real time = 24 hours in game)
    const dayNightCycle = cron.schedule('0 */4 * * *', () => {
      this.generateEnvironmentalEvent('Time cycle shift');
    });
    this.cronJobs.push(dayNightCycle);
    
    // Weather changes (every 30 minutes)
    const weatherCycle = cron.schedule('*/30 * * * *', () => {
      this.generateEnvironmentalEvent('Weather change');
    });
    this.cronJobs.push(weatherCycle);
    
    // Random encounters (every 5 minutes)
    const encounterCycle = cron.schedule('*/5 * * * *', async () => {
      const activeAgents = await this.db.listAgents({ status: 'ACTIVE' });
      if (activeAgents.length > 0) {
        this.generateEncounterEvent(activeAgents);
      }
    });
    this.cronJobs.push(encounterCycle);
  }

  start() {
    if (this.running) return;
    
    this.running = true;
    console.log('✅ Event engine started');
    
    if (this.config.enableRandom) {
      this.tickInterval = setInterval(() => {
        this.tick();
      }, this.config.tickInterval);
    }
  }

  stop() {
    this.running = false;
    
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }
    
    this.cronJobs.forEach(job => job.stop());
    this.cronJobs = [];
    
    console.log('Event engine stopped');
  }

  isRunning(): boolean {
    return this.running;
  }

  private async tick() {
    // Random event generation logic
    const roll = Math.random();
    
    if (roll < 0.01 * this.config.globalEventRate) { // 1% chance per tick
      await this.generateRandomEvent();
    }
  }

  private async generateEnvironmentalEvent(description: string) {
    const event = {
      id: uuidv4(),
      type: EventType.ENVIRONMENTAL,
      title: 'Environmental Change',
      description,
      priority: EventPriority.LOW,
      affectedAgents: [],
      data: {
        timestamp: new Date()
      },
      createdAt: new Date()
    };
    
    await this.createAndBroadcastEvent(event);
  }

  private async generateEncounterEvent(agents: any[]) {
    const randomAgent = agents[Math.floor(Math.random() * agents.length)];
    const encounterTypes = ['CRIME', 'OPPORTUNITY', 'DISCOVERY', 'DANGER'];
    const encounterType = encounterTypes[Math.floor(Math.random() * encounterTypes.length)];
    
    const event = {
      id: uuidv4(),
      type: EventType.ENCOUNTER,
      title: `Random ${encounterType}`,
      description: `${randomAgent.name} encountered a ${encounterType.toLowerCase()}`,
      priority: EventPriority.NORMAL,
      affectedAgents: [randomAgent.id],
      zoneId: randomAgent.currentZoneId || undefined,
      data: {
        encounterType,
        participants: [randomAgent.id],
        reward: Math.floor(Math.random() * 100)
      },
      createdAt: new Date()
    };
    
    await this.createAndBroadcastEvent(event);
  }

  private async generateRandomEvent() {
    const eventTypes = [EventType.ENVIRONMENTAL, EventType.ENCOUNTER];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    
    const event = {
      id: uuidv4(),
      type: eventType,
      title: 'Random Event',
      description: 'Something happened in the city',
      priority: EventPriority.NORMAL,
      affectedAgents: [],
      data: {},
      createdAt: new Date()
    };
    
    await this.createAndBroadcastEvent(event);
  }

  async createEvent(eventData: any) {
    const event = await this.db.createEvent({
      ...eventData,
      id: eventData.id || uuidv4(),
      createdAt: new Date()
    });
    
    await this.broadcastEvent(event);
    return event;
  }

  private async createAndBroadcastEvent(eventData: any) {
    const event = await this.db.createEvent(eventData);
    await this.broadcastEvent(event);
    return event;
  }

  private async broadcastEvent(event: any) {
    // Publish to Redis for WebSocket distribution
    await this.db.publish('events', {
      type: 'event:created',
      data: event
    });
    
    // Emit locally for services listening
    this.emit('event:created', event);
  }

  async getEvents(filters?: any) {
    return this.db.listEvents(filters);
  }
}
