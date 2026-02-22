// Core types for DARKCITY frontend

export interface Agent {
  id: string;
  ownerId: string;
  name: string;
  createdAt: string;
  lastActiveAt?: string;
  currentLocationId?: string;
  status: AgentStatus;
  darkcoinBalance: number;
  darkflobiBalance: number;
  metadata: Record<string, any>;
}

export type AgentStatus = 'IDLE' | 'MOVING' | 'INTERACTING' | 'OFFLINE';

export interface AgentIdentity {
  agentId: string;
  personality: Personality;
  values: Record<string, Value>;
  relationships: Record<string, Relationship>;
  skills: Record<string, Skill>;
  goals: {
    shortTerm: Goal[];
    longTerm: Goal[];
    completed: Goal[];
  };
  reputation: Reputation;
  communicationStyle: CommunicationStyle;
}

export interface Personality {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  lastUpdated: string;
  evolutionHistory: PersonalitySnapshot[];
}

export interface PersonalitySnapshot {
  timestamp: string;
  traits: Record<string, number>;
}

export interface Value {
  strength: number;
  formedFrom: string[];
  lastReinforced: string;
}

export interface Relationship {
  type: RelationshipType;
  sentiment: number;
  trust: number;
  interactionCount: number;
  lastInteraction: string;
  memorableMoments: string[];
}

export type RelationshipType = 'FRIEND' | 'ACQUAINTANCE' | 'RIVAL' | 'ENEMY' | 'STRANGER';

export interface Skill {
  level: number;
  experience: number;
  lastUsed: string;
}

export interface Goal {
  id: string;
  description: string;
  priority: number;
  createdAt: string;
  targetDate?: string;
  completedAt?: string;
}

export interface Reputation {
  overall: number;
  byDistrict: Record<string, number>;
  byFaction: Record<string, number>;
  titles: string[];
}

export interface CommunicationStyle {
  vocabulary: string[];
  toneDescriptors: string[];
  topics: string[];
  avoids: string[];
}

export interface District {
  id: string;
  name: string;
  description: string;
  zones: Zone[];
  connections: string[];
  transitTime: number;
  ambiance: Ambiance;
  eventProbabilities: Record<string, number>;
  exclusiveEvents: string[];
  economy: Economy;
  aesthetic: Aesthetic;
}

export interface Zone {
  id: string;
  districtId: string;
  name: string;
  type: ZoneType;
  maxOccupancy: number;
  currentOccupancy: number;
  locations: Location[];
  activeEvents: Event[];
}

export type ZoneType = 
  | 'COMMERCIAL'
  | 'RESIDENTIAL'
  | 'ENTERTAINMENT'
  | 'BUSINESS'
  | 'INDUSTRIAL'
  | 'TRANSIT'
  | 'PUBLIC'
  | 'UNDERGROUND';

export interface Location {
  id: string;
  zoneId: string;
  name: string;
  type: LocationType;
  owner?: string;
  isPublic: boolean;
  capacity: number;
  description: string;
  interiorDescription?: string;
  thumbnail?: string;
  entryRequirements?: Requirement[];
  isOpen: boolean;
  currentVisitors: string[];
}

export type LocationType = 
  | 'BAR'
  | 'SHOP'
  | 'APARTMENT'
  | 'OFFICE'
  | 'WAREHOUSE'
  | 'CLUB'
  | 'PARK'
  | 'STATION'
  | 'PLAZA';

export interface Requirement {
  type: 'REPUTATION' | 'ITEM' | 'SKILL' | 'MEMBERSHIP';
  value: string | number;
}

export interface Ambiance {
  noiseLevel: number;
  crowding: number;
  wealthIndex: number;
  dangerLevel: number;
  timeProfile?: Record<number, Partial<Ambiance>>;
}

export interface Economy {
  avgPropertyValue: number;
  avgIncome: number;
  dominantIndustries: string[];
}

export interface Aesthetic {
  colorPalette: string[];
  architectureStyle: string;
  iconography: string[];
}

export interface Event {
  id: string;
  type: EventType;
  scope: EventScope;
  affectedArea: string[];
  startTime: string;
  duration: number;
  effects: Effect[];
  metadata: Record<string, any>;
  description: string;
  participants?: string[];
}

export type EventType = 
  | 'WEATHER'
  | 'TIME_OF_DAY'
  | 'CITY_ANNOUNCEMENT'
  | 'INFRASTRUCTURE'
  | 'RANDOM_ENCOUNTER'
  | 'CRIME'
  | 'OPPORTUNITY'
  | 'DISCOVERY'
  | 'CONVERSATION'
  | 'TRANSACTION'
  | 'COLLABORATION'
  | 'CONFLICT';

export type EventScope = 'GLOBAL' | 'DISTRICT' | 'ZONE' | 'LOCATION';

export interface Effect {
  type: string;
  target: string;
  value: number;
  duration?: number;
}

export interface Message {
  id: string;
  interactionId: string;
  from: string;
  timestamp: string;
  content: MessageContent;
  offer?: Offer;
  response?: OfferResponse;
}

export interface MessageContent {
  text: string;
  tone?: string;
  action?: string;
  items?: string[];
}

export interface Offer {
  type: 'PURCHASE' | 'SALE' | 'SERVICE' | 'TRADE';
  items: string[];
  price: number;
  currency: 'DARKCOIN' | 'DARKFLOBI';
}

export interface OfferResponse {
  accepted: boolean;
  counterOffer?: Offer;
}

export interface Transaction {
  id: string;
  type: 'PURCHASE' | 'SALE' | 'SERVICE' | 'TRADE';
  buyer: string;
  seller: string;
  items: TransactionItem[];
  price: Price;
  status: TransactionStatus;
  completedAt?: string;
  transactionHash?: string;
}

export interface TransactionItem {
  id: string;
  name: string;
  quantity: number;
}

export interface Price {
  amount: number;
  currency: 'DARKCOIN' | 'DARKFLOBI';
}

export type TransactionStatus = 
  | 'NEGOTIATING'
  | 'AGREED'
  | 'PENDING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

export interface Memory {
  id: string;
  agentId: string;
  timestamp: string;
  type: MemoryType;
  event: MemoryEvent;
  perception: Perception;
  consequences: Consequences;
  tags: string[];
}

export type MemoryType = 
  | 'CONVERSATION'
  | 'TRANSACTION'
  | 'EVENT_WITNESSED'
  | 'EVENT_PARTICIPATED'
  | 'LOCATION_VISITED'
  | 'DISCOVERY'
  | 'CONFLICT'
  | 'ACHIEVEMENT';

export interface MemoryEvent {
  type: string;
  description: string;
  location: string;
  participants: string[];
}

export interface Perception {
  emotionalValence: number;
  emotionalArousal: number;
  significance: number;
  surprise: number;
}

export interface Consequences {
  relationships: RelationshipDelta[];
  resources: ResourceDelta[];
  knowledge: string[];
  reputation: ReputationDelta[];
}

export interface RelationshipDelta {
  agentId: string;
  sentimentChange: number;
  trustChange: number;
}

export interface ResourceDelta {
  type: string;
  amount: number;
}

export interface ReputationDelta {
  scope: string;
  scopeId: string;
  change: number;
}

export interface AgentLocation {
  agentId: string;
  locationId: string;
  zoneId: string;
  districtId: string;
  position?: { x: number; y: number };
}
