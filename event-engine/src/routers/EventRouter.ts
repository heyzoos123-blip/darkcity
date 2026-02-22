/**
 * Event Router
 * Routes events to appropriate zones, agents, and processors
 */

import { EventEmitter } from 'events';
import {
  BaseEvent,
  RoutedEvent,
  EventPriority,
  EnvironmentalEvent,
  EncounterEvent,
  SocialEvent,
  EconomicEvent,
  ZoneId,
  AgentId
} from '../types/events';
import { EventProcessor } from '../processors/EventProcessor';
import { EventStore } from '../storage/EventStore';
import { RedisPubSub } from '../utils/RedisPubSub';

export interface RouterConfig {
  enableBroadcast: boolean;
  enableZoneRouting: boolean;
  enablePriority: boolean;
  maxRetries: number;
}

export class EventRouter extends EventEmitter {
  private config: RouterConfig;
  private processor: EventProcessor;
  private store: EventStore;
  private pubsub: RedisPubSub;
  
  // Tracking
  private routedEvents: Map<string, RoutedEvent> = new Map();
  private failedEvents: Map<string, { event: RoutedEvent; attempts: number }> = new Map();

  constructor(
    config: RouterConfig,
    processor: EventProcessor,
    store: EventStore,
    pubsub: RedisPubSub
  ) {
    super();
    this.config = config;
    this.processor = processor;
    this.store = store;
    this.pubsub = pubsub;
  }

  /**
   * Route an event to appropriate handlers
   */
  async route(routedEvent: RoutedEvent): Promise<void> {
    try {
      const { event, priority } = routedEvent;

      // Log routing
      console.log(`[EventRouter] Routing event: ${event.type} (${event.id}) - Priority: ${priority}`);

      // 1. Determine target zones and agents
      const targets = this.determineTargets(event);
      routedEvent.targetZones = targets.zones;
      routedEvent.targetAgents = targets.agents;

      // 2. Store event (immutable log)
      await this.store.storeEvent(event);

      // 3. Process event
      await this.processor.process(event);

      // 4. Broadcast to relevant parties
      if (this.config.enableBroadcast) {
        await this.broadcastEvent(routedEvent);
      }

      // 5. Track
      this.routedEvents.set(event.id, routedEvent);
      this.emit('event:routed', event);

    } catch (error) {
      console.error(`[EventRouter] Failed to route event ${routedEvent.event.id}:`, error);
      await this.handleRoutingFailure(routedEvent, error as Error);
    }
  }

  /**
   * Determine target zones and agents for an event
   */
  private determineTargets(event: BaseEvent): {
    zones: ZoneId[];
    agents: AgentId[];
  } {
    const targets = {
      zones: [] as ZoneId[],
      agents: [] as AgentId[]
    };

    // Route based on event type
    if (this.isEnvironmentalEvent(event)) {
      return this.routeEnvironmentalEvent(event);
    }

    if (this.isEncounterEvent(event)) {
      return this.routeEncounterEvent(event);
    }

    if (this.isSocialEvent(event)) {
      return this.routeSocialEvent(event);
    }

    if (this.isEconomicEvent(event)) {
      return this.routeEconomicEvent(event);
    }

    return targets;
  }

  /**
   * Route environmental event
   */
  private routeEnvironmentalEvent(event: EnvironmentalEvent): {
    zones: ZoneId[];
    agents: AgentId[];
  } {
    const targets = {
      zones: [] as ZoneId[],
      agents: [] as AgentId[]
    };

    // Global events go to all zones
    if (event.scope === 'GLOBAL') {
      targets.zones = ['*']; // Special marker for "all zones"
    } else {
      // Specific zones
      targets.zones = event.affectedArea;
    }

    return targets;
  }

  /**
   * Route encounter event
   */
  private routeEncounterEvent(event: EncounterEvent): {
    zones: ZoneId[];
    agents: AgentId[];
  } {
    return {
      zones: [event.location],
      agents: event.participants
    };
  }

  /**
   * Route social event
   */
  private routeSocialEvent(event: SocialEvent): {
    zones: ZoneId[];
    agents: AgentId[];
  } {
    return {
      zones: [event.location],
      agents: [event.initiator, ...event.participants]
    };
  }

  /**
   * Route economic event
   */
  private routeEconomicEvent(event: EconomicEvent): {
    zones: ZoneId[];
    agents: AgentId[];
  } {
    const agents: AgentId[] = [];
    if (event.from !== 'SYSTEM') agents.push(event.from);
    if (event.to !== 'SYSTEM') agents.push(event.to);

    return {
      zones: [event.location],
      agents
    };
  }

  /**
   * Broadcast event to zones and agents
   */
  private async broadcastEvent(routedEvent: RoutedEvent): Promise<void> {
    const { event, targetZones, targetAgents, broadcast } = routedEvent;

    // Broadcast to zones via Redis pub/sub
    if (this.config.enableZoneRouting && targetZones.length > 0) {
      for (const zoneId of targetZones) {
        const channel = zoneId === '*' 
          ? 'darkcity.events.global' 
          : `darkcity.events.zone.${zoneId}`;

        await this.pubsub.publish(channel, event);
        console.log(`[EventRouter] Published to ${channel}`);
      }
    }

    // Send directly to specific agents
    if (targetAgents && targetAgents.length > 0) {
      for (const agentId of targetAgents) {
        await this.pubsub.publish(`darkcity.events.agent.${agentId}`, event);
        console.log(`[EventRouter] Published to agent ${agentId}`);
      }
    }

    // Priority broadcast for urgent events
    if (this.config.enablePriority && routedEvent.priority >= EventPriority.HIGH) {
      await this.pubsub.publish('darkcity.events.high-priority', event);
    }
  }

  /**
   * Handle routing failure
   */
  private async handleRoutingFailure(
    routedEvent: RoutedEvent,
    error: Error
  ): Promise<void> {
    const eventId = routedEvent.event.id;
    
    // Track failure
    const existing = this.failedEvents.get(eventId);
    const attempts = existing ? existing.attempts + 1 : 1;

    if (attempts < this.config.maxRetries) {
      // Retry
      this.failedEvents.set(eventId, { event: routedEvent, attempts });
      console.log(`[EventRouter] Retry ${attempts}/${this.config.maxRetries} for event ${eventId}`);
      
      // Retry with exponential backoff
      setTimeout(() => {
        this.route(routedEvent).catch(err => {
          console.error(`[EventRouter] Retry failed for event ${eventId}:`, err);
        });
      }, Math.pow(2, attempts) * 1000);

    } else {
      // Dead letter queue
      console.error(`[EventRouter] Event ${eventId} failed after ${attempts} attempts. Moving to DLQ.`);
      await this.pubsub.publish('darkcity.events.dlq', routedEvent.event);
      this.failedEvents.delete(eventId);
      this.emit('event:failed', routedEvent.event, error);
    }
  }

  /**
   * Type guards
   */
  private isEnvironmentalEvent(event: BaseEvent): event is EnvironmentalEvent {
    return [
      'WEATHER_CHANGE',
      'TIME_OF_DAY_CHANGE',
      'CITY_ANNOUNCEMENT',
      'INFRASTRUCTURE_EVENT',
      'DISTRICT_EVENT',
      'FESTIVAL',
      'EMERGENCY'
    ].includes(event.type);
  }

  private isEncounterEvent(event: BaseEvent): event is EncounterEvent {
    return [
      'RANDOM_ENCOUNTER',
      'CRIME',
      'OPPORTUNITY',
      'DISCOVERY',
      'MUGGING',
      'FOUND_ITEM',
      'MYSTERIOUS_STRANGER',
      'ACCIDENT'
    ].includes(event.type);
  }

  private isSocialEvent(event: BaseEvent): event is SocialEvent {
    return [
      'CONVERSATION',
      'TRANSACTION',
      'COLLABORATION',
      'CONFLICT',
      'GREETING',
      'GOSSIP'
    ].includes(event.type);
  }

  private isEconomicEvent(event: BaseEvent): event is EconomicEvent {
    return [
      'PURCHASE',
      'SALE',
      'SERVICE',
      'RENT',
      'WAGE',
      'THEFT',
      'FIND'
    ].includes(event.type);
  }

  /**
   * Stats
   */
  public getStats() {
    return {
      routedEvents: this.routedEvents.size,
      failedEvents: this.failedEvents.size
    };
  }
}
