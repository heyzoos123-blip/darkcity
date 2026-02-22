/**
 * DARKCITY Event Engine - Core Event Types
 * Based on ARCHITECTURE.md Section 2: Event-Driven Architecture
 */

export type EventId = string;
export type AgentId = string;
export type LocationId = string;
export type ZoneId = string;
export type DistrictId = string;

/**
 * Base Event Structure
 * All events inherit from this
 */
export interface BaseEvent {
  id: EventId;
  timestamp: number;
  type: EventType;
  version: string; // For event schema evolution
  metadata?: Record<string, any>;
}

/**
 * Event Type Categories
 */
export type EventType = 
  | EnvironmentalEventType
  | EncounterEventType
  | SocialEventType
  | EconomicEventType;

/**
 * Environmental Events (System-Generated)
 */
export type EnvironmentalEventType = 
  | 'WEATHER_CHANGE'
  | 'TIME_OF_DAY_CHANGE'
  | 'CITY_ANNOUNCEMENT'
  | 'INFRASTRUCTURE_EVENT'
  | 'DISTRICT_EVENT'
  | 'FESTIVAL'
  | 'EMERGENCY';

export interface EnvironmentalEvent extends BaseEvent {
  type: EnvironmentalEventType;
  scope: 'GLOBAL' | 'DISTRICT' | 'ZONE' | 'LOCATION';
  affectedArea: string[];
  startTime: number;
  duration: number; // seconds
  effects: Effect[];
  description: string;
}

/**
 * Encounter Events (Random + Triggered)
 */
export type EncounterEventType = 
  | 'RANDOM_ENCOUNTER'
  | 'CRIME'
  | 'OPPORTUNITY'
  | 'DISCOVERY'
  | 'MUGGING'
  | 'FOUND_ITEM'
  | 'MYSTERIOUS_STRANGER'
  | 'ACCIDENT';

export interface EncounterEvent extends BaseEvent {
  type: EncounterEventType;
  triggerType: 'PROXIMITY' | 'ACTION' | 'TIME' | 'RANDOM';
  participants: AgentId[];
  location: LocationId;
  choices: Choice[];
  consequences: ConsequenceMap;
  expiresAt: number;
  narrative: string;
}

/**
 * Social Events (Agent-Initiated)
 */
export type SocialEventType = 
  | 'CONVERSATION'
  | 'TRANSACTION'
  | 'COLLABORATION'
  | 'CONFLICT'
  | 'GREETING'
  | 'GOSSIP';

export interface SocialEvent extends BaseEvent {
  type: SocialEventType;
  initiator: AgentId;
  participants: AgentId[];
  location: LocationId;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  thread: InteractionMessage[];
}

/**
 * Economic Events (Transaction-Based)
 */
export type EconomicEventType = 
  | 'PURCHASE'
  | 'SALE'
  | 'SERVICE'
  | 'RENT'
  | 'WAGE'
  | 'THEFT'
  | 'FIND';

export interface EconomicEvent extends BaseEvent {
  type: EconomicEventType;
  from: AgentId | 'SYSTEM';
  to: AgentId | 'SYSTEM';
  amount: number;
  currency: 'DARKCOIN' | 'DARKFLOBI';
  item?: string;
  service?: string;
  location: LocationId;
  verified: boolean; // on-chain confirmation
}

/**
 * Event Effects
 */
export interface Effect {
  type: EffectType;
  target: 'AGENT' | 'ZONE' | 'GLOBAL';
  targetId?: string;
  magnitude: number;
  duration?: number; // seconds, undefined = permanent
  description: string;
}

export type EffectType = 
  | 'STAT_MODIFIER'
  | 'MOOD_CHANGE'
  | 'REPUTATION_CHANGE'
  | 'RESOURCE_CHANGE'
  | 'LOCATION_MODIFIER'
  | 'AVAILABILITY_CHANGE';

/**
 * Event Choices (for interactive events)
 */
export interface Choice {
  id: string;
  label: string;
  description: string;
  requirements?: Requirement[];
  outcomes: WeightedOutcome[];
}

export interface Requirement {
  type: 'SKILL' | 'ITEM' | 'REPUTATION' | 'RESOURCE' | 'STAT';
  name: string;
  value: number;
  operator: 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ';
}

export interface WeightedOutcome {
  weight: number; // 0-1, used for probability
  effects: Effect[];
  narrative: string;
  followupEvent?: EventType;
}

export interface ConsequenceMap {
  [choiceId: string]: WeightedOutcome[];
}

/**
 * Interaction Messages (for social events)
 */
export interface InteractionMessage {
  id: string;
  from: AgentId;
  timestamp: number;
  content: {
    text: string;
    tone?: string;
    action?: string;
    items?: string[];
  };
}

/**
 * Event Priority
 */
export enum EventPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3,
  CRITICAL = 4
}

/**
 * Event Status
 */
export enum EventStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

/**
 * Event with Routing Info
 */
export interface RoutedEvent {
  event: BaseEvent;
  priority: EventPriority;
  targetZones: ZoneId[];
  targetAgents?: AgentId[];
  broadcast: boolean; // If true, send to all agents in zones
}

/**
 * Event Generation Config
 */
export interface EventGenerationConfig {
  type: EventType;
  probability: number; // per tick
  zones?: ZoneId[]; // If specified, only generate in these zones
  timeRestrictions?: TimeRestriction;
  cooldown?: number; // seconds before can generate again
  maxConcurrent?: number;
}

export interface TimeRestriction {
  startHour?: number; // 0-23
  endHour?: number;
  days?: number[]; // 0-6, 0 = Sunday
}

/**
 * Event Participation
 */
export interface EventParticipation {
  eventId: EventId;
  agentId: AgentId;
  joinedAt: number;
  role: 'INITIATOR' | 'PARTICIPANT' | 'OBSERVER';
  choicesMade: {
    choiceId: string;
    timestamp: number;
  }[];
}

/**
 * Event Resolution
 */
export interface EventResolution {
  eventId: EventId;
  resolvedAt: number;
  outcomes: Effect[];
  participantResults: {
    [agentId: string]: {
      effects: Effect[];
      narrative: string;
    };
  };
  followupEvents: EventId[];
}
