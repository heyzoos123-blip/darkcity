/**
 * DARKCITY Memory System Types
 * 
 * 4-Layer Memory Architecture:
 * - Working Memory (Redis): Current state, short-term context
 * - Episodic Memory (PostgreSQL): Raw experiences, immutable log
 * - Semantic Memory (Qdrant): Vector-searchable concepts and patterns
 * - Identity Core (PostgreSQL): Evolved personality, relationships, beliefs
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type UUID = string;
export type Timestamp = Date;
export type Float32Array = number[];

// ============================================================================
// EXPERIENCE TYPES
// ============================================================================

export type ExperienceType =
  | 'CONVERSATION'
  | 'TRANSACTION'
  | 'EVENT_WITNESSED'
  | 'EVENT_PARTICIPATED'
  | 'LOCATION_VISITED'
  | 'DISCOVERY'
  | 'CONFLICT'
  | 'ACHIEVEMENT';

export interface RelationshipDelta {
  agentId: UUID;
  sentimentDelta: number;      // -100 to +100
  trustDelta: number;           // -100 to +100
  reason: string;
}

export interface ResourceDelta {
  type: 'DARKCOIN' | 'DARKFLOBI' | 'ITEM' | 'SKILL_XP';
  amount: number;
  itemId?: UUID;
  skillName?: string;
}

export interface ReputationDelta {
  scope: 'GLOBAL' | 'DISTRICT' | 'FACTION';
  scopeId?: UUID;
  delta: number;
  reason: string;
}

export interface Perception {
  emotional_valence: number;    // -1 to 1 (negative to positive)
  emotional_arousal: number;    // 0 to 1 (calm to excited)
  significance: number;         // 0 to 1 (forgettable to life-changing)
  surprise: number;             // 0 to 1 (expected to shocking)
}

export interface Consequences {
  relationships: RelationshipDelta[];
  resources: ResourceDelta[];
  knowledge: string[];
  reputation: ReputationDelta[];
}

export interface ExperienceEntry {
  id: UUID;
  agentId: UUID;
  timestamp: Timestamp;
  type: ExperienceType;

  // What happened
  event: {
    type: string;
    description: string;
    location: UUID;
    participants: UUID[];
    metadata?: Record<string, any>;
  };

  // Agent's perspective
  perception: Perception;

  // Outcomes
  consequences: Consequences;

  // For retrieval
  embedding?: Float32Array;
  tags: string[];

  // Consolidation tracking
  consolidatedInto?: UUID;
  consolidatedAt?: Timestamp;
}

// ============================================================================
// DAILY SUMMARY TYPES
// ============================================================================

export interface RelationshipSummary {
  agentId: UUID;
  agentName: string;
  change: 'NEW' | 'IMPROVED' | 'WORSENED' | 'NEUTRAL';
  sentimentDelta: number;
  trustDelta: number;
  keyEvents: UUID[];
}

export interface ReputationSummary {
  scope: 'GLOBAL' | 'DISTRICT' | 'FACTION';
  scopeId?: UUID;
  scopeName: string;
  oldValue: number;
  newValue: number;
  delta: number;
  reasons: string[];
}

export interface MoodPoint {
  timestamp: Timestamp;
  valence: number;
  arousal: number;
  dominantEmotion: string;
}

export interface PersonalityInfluence {
  trait: string;
  delta: number;
  reason: string;
}

export interface DailySummary {
  id: UUID;
  agentId: UUID;
  date: Date;

  // Narrative summary (LLM-generated)
  narrative: string;

  // Structured highlights
  highlights: {
    significantEvents: UUID[];
    newRelationships: UUID[];
    relationshipChanges: RelationshipSummary[];
    locationsVisited: UUID[];
    moneyEarned: number;
    moneySpent: number;
    reputationChanges: ReputationSummary[];
  };

  // Emotional arc
  emotionalJourney: {
    dominantMood: string;
    moodProgression: MoodPoint[];
    stressLevel: number;
  };

  // Learning
  lessonsLearned: string[];
  beliefsReinforced: string[];
  beliefsChallenged: string[];

  // For identity evolution
  personalityInfluences: PersonalityInfluence[];

  // Vector embedding
  embedding: Float32Array;

  // Metadata
  createdAt: Timestamp;
}

// ============================================================================
// IDENTITY CORE TYPES
// ============================================================================

export interface PersonalitySnapshot {
  timestamp: Timestamp;
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface Personality {
  openness: number;             // 0-100
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  lastUpdated: Timestamp;
  evolutionHistory: PersonalitySnapshot[];
}

export interface Value {
  strength: number;             // 0-100
  formedFrom: UUID[];           // Experience references
  lastReinforced: Timestamp;
}

export type RelationshipType =
  | 'FRIEND'
  | 'ACQUAINTANCE'
  | 'COLLEAGUE'
  | 'RIVAL'
  | 'ENEMY'
  | 'ROMANTIC'
  | 'FAMILY'
  | 'MENTOR'
  | 'MENTEE'
  | 'STRANGER';

export interface Relationship {
  type: RelationshipType;
  sentiment: number;            // -100 to 100
  trust: number;                // 0-100
  interactionCount: number;
  lastInteraction: Timestamp;
  memorableMoments: UUID[];     // Key experiences together
}

export interface Skill {
  level: number;
  experience: number;
  lastUsed: Timestamp;
}

export interface Goal {
  id: UUID;
  description: string;
  type: 'SHORT_TERM' | 'LONG_TERM';
  progress: number;             // 0-100
  createdAt: Timestamp;
  completedAt?: Timestamp;
  abandoned?: boolean;
}

export interface Reputation {
  overall: number;
  byDistrict: Record<UUID, number>;
  byFaction: Record<UUID, number>;
  titles: string[];
}

export interface CommunicationStyle {
  vocabulary: string[];
  toneDescriptors: string[];
  topics: string[];
  avoids: string[];
}

export interface AgentIdentity {
  agentId: UUID;

  // Personality (Big Five, evolves over time)
  personality: Personality;

  // Values and beliefs (emergent from experiences)
  values: Record<string, Value>;

  // Relationships (summarized)
  relationships: Record<UUID, Relationship>;

  // Skills and knowledge
  skills: Record<string, Skill>;

  // Goals (short and long term)
  goals: {
    shortTerm: Goal[];
    longTerm: Goal[];
    completed: Goal[];
  };

  // Reputation (how others see this agent)
  reputation: Reputation;

  // Voice and style (for LLM consistency)
  communicationStyle: CommunicationStyle;

  // Metadata
  createdAt: Timestamp;
  lastUpdated: Timestamp;
}

// ============================================================================
// WORKING MEMORY TYPES
// ============================================================================

export interface WorkingMemory {
  agentId: UUID;
  currentLocation: UUID;
  status: 'ACTIVE' | 'IDLE' | 'IN_CONVERSATION' | 'IN_TRANSIT' | 'OFFLINE';
  mood: {
    valence: number;
    arousal: number;
    dominantEmotion: string;
  };
  activeConversations: UUID[];
  recentEvents: UUID[];
  shortTermGoals: string[];
  immediateContext: Record<string, any>;
  ttl: number;                  // Seconds until expiry
  lastUpdated: Timestamp;
}

// ============================================================================
// MEMORY RETRIEVAL TYPES
// ============================================================================

export interface MemoryQuery {
  agentId: UUID;
  context?: string;             // Semantic query
  timeRange?: {
    start: Timestamp;
    end: Timestamp;
  };
  location?: UUID;
  participants?: UUID[];
  types?: ExperienceType[];
  tags?: string[];
  minSignificance?: number;
  limit?: number;
}

export interface MemoryResult {
  experience: ExperienceEntry;
  relevanceScore: number;
  recencyScore: number;
  combinedScore: number;
}

export interface RelationshipContext {
  relationship: Relationship;
  memorableExperiences: ExperienceEntry[];
  recentInteractions: ExperienceEntry[];
}

// ============================================================================
// CONSOLIDATION TYPES
// ============================================================================

export interface ConsolidationJob {
  id: UUID;
  agentId: UUID;
  date: Date;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  experienceCount: number;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  error?: string;
  retryCount: number;
}

export interface ConsolidationResult {
  summary: DailySummary;
  identityUpdates: Partial<AgentIdentity>;
  experiencesConsolidated: number;
  vectorsGenerated: number;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface MemoryConfig {
  // Budget limits
  maxWorkingMemoryTokens: number;
  maxEpisodicMemoryTokens: number;
  maxIdentityTokens: number;

  // Compression thresholds
  summarizeAfterEntries: number;
  archiveAfterDays: number;

  // Priority weights for retrieval
  recencyDecay: number;
  significanceBoost: number;
  relationshipBoost: number;

  // Consolidation
  consolidationSchedule: string; // Cron expression
  consolidationConcurrency: number;
  consolidationRetries: number;

  // Vector search
  vectorDimensions: number;
  vectorSimilarityThreshold: number;

  // LLM settings
  llmProvider: 'openai' | 'anthropic';
  llmModel: string;
  llmTemperature: number;
}

export const DEFAULT_CONFIG: MemoryConfig = {
  maxWorkingMemoryTokens: 2000,
  maxEpisodicMemoryTokens: 3000,
  maxIdentityTokens: 1500,
  summarizeAfterEntries: 50,
  archiveAfterDays: 90,
  recencyDecay: 0.95,
  significanceBoost: 2.0,
  relationshipBoost: 1.5,
  consolidationSchedule: '0 4 * * *', // 4 AM daily
  consolidationConcurrency: 100,
  consolidationRetries: 3,
  vectorDimensions: 1536,
  vectorSimilarityThreshold: 0.7,
  llmProvider: 'anthropic',
  llmModel: 'claude-sonnet-4-5-20250929',
  llmTemperature: 0.7,
};
