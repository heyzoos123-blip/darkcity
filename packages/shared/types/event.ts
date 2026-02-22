import { z } from 'zod';

// Event Types
export enum EventType {
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  ENCOUNTER = 'ENCOUNTER',
  SOCIAL = 'SOCIAL',
  ECONOMIC = 'ECONOMIC',
  QUEST = 'QUEST',
  COMBAT = 'COMBAT'
}

// Event Priority
export enum EventPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Base Event Schema
export const EventSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(EventType),
  title: z.string(),
  description: z.string(),
  priority: z.nativeEnum(EventPriority),
  zoneId: z.string().uuid().optional(),
  districtId: z.string().uuid().optional(),
  affectedAgents: z.array(z.string().uuid()),
  data: z.record(z.any()), // Event-specific data
  createdAt: z.date(),
  expiresAt: z.date().optional()
});

export type Event = z.infer<typeof EventSchema>;

// Encounter Event
export const EncounterEventSchema = EventSchema.extend({
  type: z.literal(EventType.ENCOUNTER),
  data: z.object({
    encounterType: z.enum(['CRIME', 'OPPORTUNITY', 'DISCOVERY', 'DANGER']),
    participants: z.array(z.string().uuid()),
    location: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional(),
    reward: z.number().optional()
  })
});

export type EncounterEvent = z.infer<typeof EncounterEventSchema>;

// Social Event
export const SocialEventSchema = EventSchema.extend({
  type: z.literal(EventType.SOCIAL),
  data: z.object({
    initiatorId: z.string().uuid(),
    participantIds: z.array(z.string().uuid()),
    interactionType: z.enum(['CONVERSATION', 'COLLABORATION', 'CONFLICT'])
  })
});

export type SocialEvent = z.infer<typeof SocialEventSchema>;

// Economic Event
export const EconomicEventSchema = EventSchema.extend({
  type: z.literal(EventType.ECONOMIC),
  data: z.object({
    transactionType: z.enum(['PURCHASE', 'SALE', 'RENT', 'TRANSFER']),
    amount: z.number(),
    fromAgentId: z.string().uuid().optional(),
    toAgentId: z.string().uuid().optional(),
    itemId: z.string().optional()
  })
});

export type EconomicEvent = z.infer<typeof EconomicEventSchema>;

// Event Creation Request
export const CreateEventSchema = z.object({
  type: z.nativeEnum(EventType),
  title: z.string(),
  description: z.string(),
  priority: z.nativeEnum(EventPriority).default(EventPriority.NORMAL),
  zoneId: z.string().uuid().optional(),
  districtId: z.string().uuid().optional(),
  affectedAgents: z.array(z.string().uuid()).default([]),
  data: z.record(z.any()),
  expiresAt: z.date().optional()
});

export type CreateEventRequest = z.infer<typeof CreateEventSchema>;
