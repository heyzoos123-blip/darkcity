/**
 * Event Store
 * Immutable event storage with history tracking
 */

import { BaseEvent, EventType, EventId, AgentId, ZoneId } from '../types/events';

export interface EventStoreConfig {
  enablePersistence: boolean;
  enableIndexing: boolean;
  retentionDays: number;
}

export interface EventQuery {
  eventId?: EventId;
  type?: EventType;
  agentId?: AgentId;
  zoneId?: ZoneId;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}

export class EventStore {
  private config: EventStoreConfig;
  
  // In-memory storage (would be PostgreSQL in production)
  private events: Map<EventId, BaseEvent> = new Map();
  
  // Indexes for fast queries
  private byType: Map<EventType, Set<EventId>> = new Map();
  private byAgent: Map<AgentId, Set<EventId>> = new Map();
  private byZone: Map<ZoneId, Set<EventId>> = new Map();
  private byTime: Array<{ timestamp: number; eventId: EventId }> = [];

  constructor(config: EventStoreConfig) {
    this.config = config;
  }

  /**
   * Store an event (immutable)
   */
  async storeEvent(event: BaseEvent): Promise<void> {
    // Check if already exists
    if (this.events.has(event.id)) {
      console.warn(`[EventStore] Event ${event.id} already exists. Skipping.`);
      return;
    }

    // Store
    this.events.set(event.id, event);
    console.log(`[EventStore] Stored event: ${event.type} (${event.id})`);

    // Index
    if (this.config.enableIndexing) {
      await this.indexEvent(event);
    }

    // In production, would also:
    // - Write to PostgreSQL
    // - Update TimescaleDB for analytics
    // - Trigger any event subscribers
  }

  /**
   * Index an event for fast queries
   */
  private async indexEvent(event: BaseEvent): Promise<void> {
    // By type
    if (!this.byType.has(event.type)) {
      this.byType.set(event.type, new Set());
    }
    this.byType.get(event.type)!.add(event.id);

    // By time (sorted)
    this.byTime.push({ timestamp: event.timestamp, eventId: event.id });
    this.byTime.sort((a, b) => a.timestamp - b.timestamp);

    // By zone/agent (depends on event type)
    await this.indexEventSpecifics(event);
  }

  /**
   * Index event-specific details
   */
  private async indexEventSpecifics(event: BaseEvent): Promise<void> {
    // Extract agents and zones based on event type
    const agents: AgentId[] = [];
    const zones: ZoneId[] = [];

    // Check event properties
    if ('participants' in event) {
      agents.push(...(event.participants as AgentId[]));
    }
    if ('initiator' in event) {
      agents.push(event.initiator as AgentId);
    }
    if ('from' in event && event.from !== 'SYSTEM') {
      agents.push(event.from as AgentId);
    }
    if ('to' in event && event.to !== 'SYSTEM') {
      agents.push(event.to as AgentId);
    }
    if ('location' in event) {
      zones.push(event.location as ZoneId);
    }
    if ('affectedArea' in event) {
      zones.push(...(event.affectedArea as ZoneId[]));
    }

    // Index by agents
    for (const agentId of agents) {
      if (!this.byAgent.has(agentId)) {
        this.byAgent.set(agentId, new Set());
      }
      this.byAgent.get(agentId)!.add(event.id);
    }

    // Index by zones
    for (const zoneId of zones) {
      if (!this.byZone.has(zoneId)) {
        this.byZone.set(zoneId, new Set());
      }
      this.byZone.get(zoneId)!.add(event.id);
    }
  }

  /**
   * Get event by ID
   */
  async getEvent(eventId: EventId): Promise<BaseEvent | null> {
    return this.events.get(eventId) || null;
  }

  /**
   * Query events
   */
  async queryEvents(query: EventQuery): Promise<BaseEvent[]> {
    let eventIds: Set<EventId> = new Set();

    // Start with all events
    if (!query.eventId && !query.type && !query.agentId && !query.zoneId) {
      eventIds = new Set(this.events.keys());
    }

    // Filter by specific event ID
    if (query.eventId) {
      const event = await this.getEvent(query.eventId);
      return event ? [event] : [];
    }

    // Filter by type
    if (query.type) {
      eventIds = new Set(this.byType.get(query.type) || []);
    }

    // Filter by agent
    if (query.agentId) {
      const agentEvents = this.byAgent.get(query.agentId) || new Set();
      if (eventIds.size === 0) {
        eventIds = agentEvents;
      } else {
        eventIds = new Set([...eventIds].filter(id => agentEvents.has(id)));
      }
    }

    // Filter by zone
    if (query.zoneId) {
      const zoneEvents = this.byZone.get(query.zoneId) || new Set();
      if (eventIds.size === 0) {
        eventIds = zoneEvents;
      } else {
        eventIds = new Set([...eventIds].filter(id => zoneEvents.has(id)));
      }
    }

    // Get events
    let events = Array.from(eventIds)
      .map(id => this.events.get(id))
      .filter(e => e !== undefined) as BaseEvent[];

    // Filter by time range
    if (query.startTime || query.endTime) {
      events = events.filter(e => {
        if (query.startTime && e.timestamp < query.startTime) return false;
        if (query.endTime && e.timestamp > query.endTime) return false;
        return true;
      });
    }

    // Sort by timestamp (newest first)
    events.sort((a, b) => b.timestamp - a.timestamp);

    // Pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    events = events.slice(offset, offset + limit);

    return events;
  }

  /**
   * Get event history for an agent
   */
  async getAgentHistory(
    agentId: AgentId,
    limit: number = 50
  ): Promise<BaseEvent[]> {
    return this.queryEvents({
      agentId,
      limit
    });
  }

  /**
   * Get events in a zone
   */
  async getZoneEvents(
    zoneId: ZoneId,
    startTime?: number,
    endTime?: number,
    limit: number = 50
  ): Promise<BaseEvent[]> {
    return this.queryEvents({
      zoneId,
      startTime,
      endTime,
      limit
    });
  }

  /**
   * Get events by type
   */
  async getEventsByType(
    type: EventType,
    limit: number = 50
  ): Promise<BaseEvent[]> {
    return this.queryEvents({
      type,
      limit
    });
  }

  /**
   * Get recent events
   */
  async getRecentEvents(
    limit: number = 20
  ): Promise<BaseEvent[]> {
    return this.queryEvents({
      limit
    });
  }

  /**
   * Clean up old events (based on retention policy)
   */
  async cleanupOldEvents(): Promise<number> {
    const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const [eventId, event] of this.events) {
      if (event.timestamp < cutoffTime) {
        this.events.delete(eventId);
        deletedCount++;

        // Remove from indexes
        this.removeFromIndexes(eventId, event);
      }
    }

    if (deletedCount > 0) {
      console.log(`[EventStore] Cleaned up ${deletedCount} old events`);
    }

    return deletedCount;
  }

  /**
   * Remove event from indexes
   */
  private removeFromIndexes(eventId: EventId, event: BaseEvent): void {
    // Remove from type index
    const typeSet = this.byType.get(event.type);
    if (typeSet) {
      typeSet.delete(eventId);
      if (typeSet.size === 0) {
        this.byType.delete(event.type);
      }
    }

    // Remove from agent indexes
    for (const [agentId, eventSet] of this.byAgent) {
      if (eventSet.has(eventId)) {
        eventSet.delete(eventId);
        if (eventSet.size === 0) {
          this.byAgent.delete(agentId);
        }
      }
    }

    // Remove from zone indexes
    for (const [zoneId, eventSet] of this.byZone) {
      if (eventSet.has(eventId)) {
        eventSet.delete(eventId);
        if (eventSet.size === 0) {
          this.byZone.delete(zoneId);
        }
      }
    }

    // Remove from time index
    this.byTime = this.byTime.filter(item => item.eventId !== eventId);
  }

  /**
   * Get statistics
   */
  async getStats() {
    return {
      totalEvents: this.events.size,
      eventsByType: Object.fromEntries(
        Array.from(this.byType.entries()).map(([type, ids]) => [type, ids.size])
      ),
      trackedAgents: this.byAgent.size,
      trackedZones: this.byZone.size
    };
  }

  /**
   * Clear all events (use with caution!)
   */
  async clear(): Promise<void> {
    this.events.clear();
    this.byType.clear();
    this.byAgent.clear();
    this.byZone.clear();
    this.byTime = [];
    console.log('[EventStore] All events cleared');
  }
}
