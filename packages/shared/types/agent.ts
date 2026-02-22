import { z } from 'zod';

// Agent Status
export enum AgentStatus {
  ACTIVE = 'ACTIVE',
  IDLE = 'IDLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
  SUSPENDED = 'SUSPENDED'
}

// Big Five Personality Traits
export const PersonalitySchema = z.object({
  openness: z.number().min(0).max(100),
  conscientiousness: z.number().min(0).max(100),
  extraversion: z.number().min(0).max(100),
  agreeableness: z.number().min(0).max(100),
  neuroticism: z.number().min(0).max(100)
});

export type Personality = z.infer<typeof PersonalitySchema>;

// Agent Schema
export const AgentSchema = z.object({
  id: z.string().uuid(),
  walletAddress: z.string(),
  name: z.string().min(1).max(50),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  status: z.nativeEnum(AgentStatus),
  personality: PersonalitySchema,
  solBalance: z.number().min(0),
  currentLocationId: z.string().uuid().optional(),
  currentZoneId: z.string().uuid().optional(),
  reputation: z.number().default(0),
  level: z.number().int().min(1).default(1),
  createdAt: z.date(),
  lastActiveAt: z.date()
});

export type Agent = z.infer<typeof AgentSchema>;

// Agent Creation Request
export const CreateAgentSchema = z.object({
  walletAddress: z.string(),
  name: z.string().min(1).max(50),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  personality: PersonalitySchema
});

export type CreateAgentRequest = z.infer<typeof CreateAgentSchema>;

// Agent Update Request
export const UpdateAgentSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  status: z.nativeEnum(AgentStatus).optional()
});

export type UpdateAgentRequest = z.infer<typeof UpdateAgentSchema>;
