/**
 * Event Processor
 * Processes events and applies their effects
 */

import { EventEmitter } from 'events';
import {
  BaseEvent,
  EnvironmentalEvent,
  EncounterEvent,
  SocialEvent,
  EconomicEvent,
  Effect,
  EventResolution,
  EventParticipation
} from '../types/events';

export interface ProcessorConfig {
  enableEffects: boolean;
  enableMemoryWrite: boolean;
  enableStateUpdate: boolean;
}

export class EventProcessor extends EventEmitter {
  private config: ProcessorConfig;
  
  // Track active participations
  private participations: Map<string, EventParticipation[]> = new Map();
  private resolutions: Map<string, EventResolution> = new Map();

  constructor(config: ProcessorConfig) {
    super();
    this.config = config;
  }

  /**
   * Process an event
   */
  async process(event: BaseEvent): Promise<void> {
    console.log(`[EventProcessor] Processing event: ${event.type} (${event.id})`);

    try {
      // Process based on event type
      if (this.isEnvironmentalEvent(event)) {
        await this.processEnvironmentalEvent(event);
      } else if (this.isEncounterEvent(event)) {
        await this.processEncounterEvent(event);
      } else if (this.isSocialEvent(event)) {
        await this.processSocialEvent(event);
      } else if (this.isEconomicEvent(event)) {
        await this.processEconomicEvent(event);
      }

      this.emit('event:processed', event);

    } catch (error) {
      console.error(`[EventProcessor] Failed to process event ${event.id}:`, error);
      this.emit('event:error', event, error);
      throw error;
    }
  }

  /**
   * Process environmental event
   */
  private async processEnvironmentalEvent(event: EnvironmentalEvent): Promise<void> {
    // Apply effects to affected zones/agents
    if (this.config.enableEffects) {
      for (const effect of event.effects) {
        await this.applyEffect(effect, event.id);
      }
    }

    // Update global state
    if (this.config.enableStateUpdate) {
      await this.updateEnvironmentalState(event);
    }

    console.log(`[EventProcessor] Environmental event processed: ${event.type}`);
  }

  /**
   * Process encounter event
   */
  private async processEncounterEvent(event: EncounterEvent): Promise<void> {
    // Create participation records
    for (const agentId of event.participants) {
      const participation: EventParticipation = {
        eventId: event.id,
        agentId,
        joinedAt: Date.now(),
        role: 'PARTICIPANT',
        choicesMade: []
      };

      const existing = this.participations.get(event.id) || [];
      existing.push(participation);
      this.participations.set(event.id, existing);
    }

    // Notify participants about choices
    this.emit('encounter:started', event);

    console.log(`[EventProcessor] Encounter event started: ${event.type} for ${event.participants.length} agents`);
  }

  /**
   * Process social event
   */
  private async processSocialEvent(event: SocialEvent): Promise<void> {
    // Track participants
    const allParticipants = [event.initiator, ...event.participants];
    
    for (const agentId of allParticipants) {
      const participation: EventParticipation = {
        eventId: event.id,
        agentId,
        joinedAt: Date.now(),
        role: agentId === event.initiator ? 'INITIATOR' : 'PARTICIPANT',
        choicesMade: []
      };

      const existing = this.participations.get(event.id) || [];
      existing.push(participation);
      this.participations.set(event.id, existing);
    }

    // Notify participants
    this.emit('social:started', event);

    console.log(`[EventProcessor] Social event started: ${event.type}`);
  }

  /**
   * Process economic event
   */
  private async processEconomicEvent(event: EconomicEvent): Promise<void> {
    // Apply resource changes
    if (this.config.enableEffects) {
      if (event.from !== 'SYSTEM') {
        await this.applyResourceChange(event.from, -event.amount, event.currency);
      }
      if (event.to !== 'SYSTEM') {
        await this.applyResourceChange(event.to, event.amount, event.currency);
      }
    }

    // Write to memory
    if (this.config.enableMemoryWrite) {
      await this.writeEconomicMemory(event);
    }

    this.emit('economic:completed', event);

    console.log(`[EventProcessor] Economic event processed: ${event.type} - ${event.amount} ${event.currency}`);
  }

  /**
   * Handle agent choice in an encounter
   */
  async handleAgentChoice(
    eventId: string,
    agentId: string,
    choiceId: string
  ): Promise<EventResolution | null> {
    const participations = this.participations.get(eventId);
    if (!participations) {
      console.error(`[EventProcessor] No participation found for event ${eventId}`);
      return null;
    }

    const participation = participations.find(p => p.agentId === agentId);
    if (!participation) {
      console.error(`[EventProcessor] Agent ${agentId} not participating in event ${eventId}`);
      return null;
    }

    // Record choice
    participation.choicesMade.push({
      choiceId,
      timestamp: Date.now()
    });

    // Resolve event (simplified - would need actual event data)
    const resolution = await this.resolveEncounter(eventId, choiceId, agentId);
    
    if (resolution) {
      this.resolutions.set(eventId, resolution);
      this.emit('event:resolved', resolution);
    }

    return resolution;
  }

  /**
   * Resolve an encounter event
   */
  private async resolveEncounter(
    eventId: string,
    choiceId: string,
    agentId: string
  ): Promise<EventResolution> {
    // In a real implementation, would:
    // 1. Get the encounter event
    // 2. Find the chosen outcome (weighted random)
    // 3. Apply all effects
    // 4. Generate followup events
    // 5. Write to memory

    // Simplified version:
    const effects: Effect[] = [];
    
    const resolution: EventResolution = {
      eventId,
      resolvedAt: Date.now(),
      outcomes: effects,
      participantResults: {
        [agentId]: {
          effects: effects,
          narrative: 'You made a choice...'
        }
      },
      followupEvents: []
    };

    console.log(`[EventProcessor] Encounter resolved: ${eventId} - Choice: ${choiceId}`);

    return resolution;
  }

  /**
   * Apply an effect
   */
  private async applyEffect(effect: Effect, eventId: string): Promise<void> {
    console.log(`[EventProcessor] Applying effect: ${effect.type} - ${effect.description}`);

    // In real implementation, would update:
    // - Agent stats
    // - Zone modifiers
    // - Global state
    // - Reputation
    // - Resources

    // For now, just log
    this.emit('effect:applied', effect, eventId);
  }

  /**
   * Update environmental state
   */
  private async updateEnvironmentalState(event: EnvironmentalEvent): Promise<void> {
    // Would update global state tracking:
    // - Current weather
    // - Time of day
    // - Active environmental effects
    
    console.log(`[EventProcessor] Environmental state updated for ${event.scope}`);
  }

  /**
   * Apply resource change
   */
  private async applyResourceChange(
    agentId: string,
    amount: number,
    currency: string
  ): Promise<void> {
    console.log(`[EventProcessor] Resource change: ${agentId} ${amount > 0 ? '+' : ''}${amount} ${currency}`);
    
    // In real implementation, would update agent's wallet
    this.emit('resource:changed', { agentId, amount, currency });
  }

  /**
   * Write economic event to memory
   */
  private async writeEconomicMemory(event: EconomicEvent): Promise<void> {
    // Would create memory entries for both parties
    console.log(`[EventProcessor] Writing economic memory for event ${event.id}`);
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
   * Get participation info
   */
  public getParticipation(eventId: string): EventParticipation[] | undefined {
    return this.participations.get(eventId);
  }

  /**
   * Get resolution
   */
  public getResolution(eventId: string): EventResolution | undefined {
    return this.resolutions.get(eventId);
  }

  /**
   * Stats
   */
  public getStats() {
    return {
      activeParticipations: this.participations.size,
      resolvedEvents: this.resolutions.size
    };
  }
}
