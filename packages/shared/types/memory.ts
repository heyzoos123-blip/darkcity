import { z } from 'zod';

// Memory Types
export enum MemoryType {
  EXPERIENCE = 'EXPERIENCE',
  CONVERSATION = 'CONVERSATION',
  OBSERVATION = 'OBSERVATION',
  ACHIEVEMENT = 'ACHIEVEMENT',
  RELATIONSHIP = 'RELATIONSHIP'
}

// Memory Importance
export enum MemoryImportance {
  TRIVIAL = 'TRIVIAL',
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  SIGNIFICANT = 'SIGNIFICANT',
  CRITICAL = 'CRITICAL'
}

// Base Memory Schema
export const MemorySchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  type: z.nativeEnum(MemoryType),
  content: z.string(),
  importance: z.nativeEnum(MemoryImportance),
  embedding: z.array(z.number()).optional(), // Vector embedding
  metadata: z.record(z.any()),
  createdAt: z.date(),
  lastAccessedAt: z.date(),
  accessCount: z.number().int().min(0).default(0)
});

export type Memory = z.infer<typeof MemorySchema>;

// Experience Memory
export const ExperienceMemorySchema = MemorySchema.extend({
  type: z.literal(MemoryType.EXPERIENCE),
  metadata: z.object({
    eventId: z.string().uuid(),
    zoneId: z.string().uuid().optional(),
    participants: z.array(z.string().uuid()).optional(),
    emotionalImpact: z.number().min(-1).max(1).optional()
  })
});

export type ExperienceMemory = z.infer<typeof ExperienceMemorySchema>;

// Conversation Memory
export const ConversationMemorySchema = MemorySchema.extend({
  type: z.literal(MemoryType.CONVERSATION),
  metadata: z.object({
    interactionId: z.string().uuid(),
    participants: z.array(z.string().uuid()),
    summary: z.string(),
    sentiment: z.number().min(-1).max(1).optional()
  })
});

export type ConversationMemory = z.infer<typeof ConversationMemorySchema>;

// Working Memory (Redis - short-term context)
export const WorkingMemorySchema = z.object({
  agentId: z.string().uuid(),
  currentLocation: z.object({
    districtId: z.string().uuid(),
    zoneId: z.string().uuid(),
    locationId: z.string().uuid().optional()
  }),
  currentStatus: z.string(),
  currentMood: z.object({
    valence: z.number().min(-1).max(1),
    arousal: z.number().min(0).max(1)
  }),
  activeConversations: z.array(z.string().uuid()),
  recentEvents: z.array(z.string().uuid()),
  ttl: z.number().int().positive() // TTL in seconds
});

export type WorkingMemory = z.infer<typeof WorkingMemorySchema>;

// Identity Core
export const IdentityCoreSchema = z.object({
  agentId: z.string().uuid(),
  personality: z.object({
    openness: z.number().min(0).max(100),
    conscientiousness: z.number().min(0).max(100),
    extraversion: z.number().min(0).max(100),
    agreeableness: z.number().min(0).max(100),
    neuroticism: z.number().min(0).max(100)
  }),
  values: z.array(z.string()),
  beliefs: z.array(z.string()),
  goals: z.array(z.object({
    description: z.string(),
    priority: z.number().min(0).max(10),
    progress: z.number().min(0).max(100)
  })),
  relationships: z.record(z.object({
    agentId: z.string().uuid(),
    relationshipType: z.enum(['FRIEND', 'RIVAL', 'ALLY', 'ENEMY', 'NEUTRAL']),
    strength: z.number().min(0).max(100),
    lastInteractionAt: z.date()
  })),
  communicationStyle: z.object({
    formality: z.number().min(0).max(100),
    verbosity: z.number().min(0).max(100),
    humor: z.number().min(0).max(100),
    empathy: z.number().min(0).max(100)
  }),
  updatedAt: z.date()
});

export type IdentityCore = z.infer<typeof IdentityCoreSchema>;

// Memory Creation Request
export const CreateMemorySchema = z.object({
  agentId: z.string().uuid(),
  type: z.nativeEnum(MemoryType),
  content: z.string(),
  importance: z.nativeEnum(MemoryImportance),
  metadata: z.record(z.any())
});

export type CreateMemoryRequest = z.infer<typeof CreateMemorySchema>;

// Memory Search Request
export const SearchMemorySchema = z.object({
  agentId: z.string().uuid(),
  query: z.string().optional(),
  type: z.nativeEnum(MemoryType).optional(),
  importance: z.nativeEnum(MemoryImportance).optional(),
  limit: z.number().int().positive().max(100).default(10),
  useSemanticSearch: z.boolean().default(false)
});

export type SearchMemoryRequest = z.infer<typeof SearchMemorySchema>;
