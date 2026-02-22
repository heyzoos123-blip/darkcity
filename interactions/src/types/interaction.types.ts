/**
 * Core interaction types for DARKCITY Agent Interaction Layer
 * These define the structure of agent-to-agent interactions
 */

export type InteractionType = 
  | 'CONVERSATION'
  | 'TRANSACTION'
  | 'SERVICE'
  | 'CHALLENGE'
  | 'COLLABORATION'
  | 'GREETING'
  | 'GOSSIP';

export type InteractionStatus = 
  | 'PENDING'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ABANDONED'
  | 'REJECTED'
  | 'CANCELLED';

export interface Interaction {
  id: string;
  type: InteractionType;
  status: InteractionStatus;
  
  // Participants
  initiator: string;
  targets: string[];
  
  // Context
  location: string;
  startedAt: Date;
  endedAt?: Date;
  lastActivityAt: Date;
  
  // Content
  threadId: string;
  messageCount: number;
  
  // Metadata
  metadata: Record<string, any>;
  
  // Outcomes
  outcomes?: InteractionOutcome;
}

export interface InteractionOutcome {
  relationshipChanges: RelationshipDelta[];
  reputationChanges: ReputationDelta[];
  economicImpact?: EconomicImpact;
  emotionalImpact: EmotionalImpact;
  memorability: number; // 0-1 scale
}

export interface Message {
  id: string;
  interactionId: string;
  threadId: string;
  from: string;
  timestamp: Date;
  
  content: MessageContent;
  
  // For transactions
  offer?: Offer;
  response?: OfferResponse;
  
  // AI metadata
  generationMetadata?: GenerationMetadata;
}

export interface MessageContent {
  text: string;
  tone?: string;
  action?: string;
  items?: string[];
  emotion?: string;
}

export interface Offer {
  id: string;
  type: 'BUY' | 'SELL' | 'TRADE' | 'SERVICE';
  items: TransactionItem[];
  price: {
    amount: number;
    currency: 'DARKCOIN' | 'DARKFLOBI';
  };
  conditions?: string[];
  expiresAt?: Date;
}

export interface OfferResponse {
  offerId: string;
  action: 'ACCEPT' | 'REJECT' | 'COUNTER';
  counterOffer?: Offer;
  reason?: string;
}

export interface TransactionItem {
  id: string;
  type: string;
  quantity: number;
  metadata?: Record<string, any>;
}

export interface RelationshipDelta {
  agentId: string;
  sentimentDelta: number; // -100 to 100
  trustDelta: number; // -100 to 100
  reason: string;
}

export interface ReputationDelta {
  district?: string;
  faction?: string;
  delta: number;
  reason: string;
}

export interface EconomicImpact {
  agentId: string;
  moneyChanged: number;
  itemsGained: string[];
  itemsLost: string[];
}

export interface EmotionalImpact {
  agentId: string;
  valence: number; // -1 to 1 (negative to positive)
  arousal: number; // 0 to 1 (calm to excited)
  dominantEmotion: string;
}

export interface GenerationMetadata {
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  temperature: number;
}

// State machine transitions
export interface StateTransition {
  from: InteractionStatus;
  to: InteractionStatus;
  trigger: string;
  condition?: (interaction: Interaction) => boolean;
  action?: (interaction: Interaction) => Promise<void>;
}

// Agent availability
export interface AgentStatus {
  agentId: string;
  online: boolean;
  inConversation: boolean;
  currentLocation: string;
  lastSeen: Date;
  mood?: string;
  availability: 'AVAILABLE' | 'BUSY' | 'DO_NOT_DISTURB';
}

// Conversation context for AI generation
export interface ConversationContext {
  interaction: Interaction;
  messages: Message[];
  agentIdentity: AgentIdentity;
  relationshipContext: RelationshipContext;
  location: Location;
  relevantMemories: Memory[];
}

export interface AgentIdentity {
  agentId: string;
  name: string;
  personality: Personality;
  values: Record<string, number>;
  communicationStyle: CommunicationStyle;
  goals: Goal[];
}

export interface Personality {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface CommunicationStyle {
  vocabulary: string[];
  toneDescriptors: string[];
  topics: string[];
  avoids: string[];
  averageMessageLength: number;
}

export interface Goal {
  id: string;
  description: string;
  priority: number;
  type: 'SHORT_TERM' | 'LONG_TERM';
}

export interface RelationshipContext {
  targetAgentId: string;
  sentiment: number;
  trust: number;
  interactionCount: number;
  lastInteraction?: Date;
  memorableExperiences: string[];
  sharedHistory: string;
}

export interface Location {
  id: string;
  name: string;
  type: string;
  atmosphere: string;
  district: string;
}

export interface Memory {
  id: string;
  timestamp: Date;
  description: string;
  significance: number;
  emotionalValence: number;
}

// Rate limiting
export interface RateLimit {
  agentId: string;
  interactionsPerHour: number;
  messagesPerMinute: number;
  tokensPerHour: number;
}

// Analytics
export interface InteractionAnalytics {
  totalInteractions: number;
  averageDuration: number;
  completionRate: number;
  byType: Record<InteractionType, number>;
  byStatus: Record<InteractionStatus, number>;
  popularLocations: Array<{ location: string; count: number }>;
  topPairs: Array<{ agent1: string; agent2: string; count: number }>;
}
