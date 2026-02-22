import { z } from 'zod';

// Interaction State
export enum InteractionState {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED'
}

// Interaction Type
export enum InteractionType {
  CONVERSATION = 'CONVERSATION',
  TRANSACTION = 'TRANSACTION',
  COLLABORATION = 'COLLABORATION',
  CONFLICT = 'CONFLICT'
}

// Base Interaction Schema
export const InteractionSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(InteractionType),
  state: z.nativeEnum(InteractionState),
  initiatorId: z.string().uuid(),
  participantIds: z.array(z.string().uuid()),
  zoneId: z.string().uuid().optional(),
  startedAt: z.date(),
  endedAt: z.date().optional(),
  metadata: z.record(z.any())
});

export type Interaction = z.infer<typeof InteractionSchema>;

// Conversation
export const ConversationSchema = InteractionSchema.extend({
  type: z.literal(InteractionType.CONVERSATION),
  metadata: z.object({
    topic: z.string().optional(),
    messageCount: z.number().int().min(0).default(0),
    sentiment: z.number().min(-1).max(1).optional()
  })
});

export type Conversation = z.infer<typeof ConversationSchema>;

// Message
export const MessageSchema = z.object({
  id: z.string().uuid(),
  interactionId: z.string().uuid(),
  senderId: z.string().uuid(),
  content: z.string().min(1).max(2000),
  sentiment: z.number().min(-1).max(1).optional(),
  createdAt: z.date()
});

export type Message = z.infer<typeof MessageSchema>;

// Transaction
export const TransactionSchema = InteractionSchema.extend({
  type: z.literal(InteractionType.TRANSACTION),
  metadata: z.object({
    offerDetails: z.object({
      type: z.enum(['SALE', 'PURCHASE', 'TRADE', 'SERVICE']),
      amount: z.number(),
      itemId: z.string().optional(),
      description: z.string()
    }),
    status: z.enum(['PROPOSED', 'NEGOTIATING', 'ACCEPTED', 'REJECTED', 'COMPLETED']),
    finalAmount: z.number().optional()
  })
});

export type Transaction = z.infer<typeof TransactionSchema>;

// Reputation Update
export const ReputationUpdateSchema = z.object({
  agentId: z.string().uuid(),
  change: z.number(),
  reason: z.string(),
  relatedInteractionId: z.string().uuid().optional()
});

export type ReputationUpdate = z.infer<typeof ReputationUpdateSchema>;

// Create Interaction Request
export const CreateInteractionSchema = z.object({
  type: z.nativeEnum(InteractionType),
  initiatorId: z.string().uuid(),
  participantIds: z.array(z.string().uuid()).min(1),
  zoneId: z.string().uuid().optional(),
  metadata: z.record(z.any()).default({})
});

export type CreateInteractionRequest = z.infer<typeof CreateInteractionSchema>;

// Send Message Request
export const SendMessageSchema = z.object({
  interactionId: z.string().uuid(),
  senderId: z.string().uuid(),
  content: z.string().min(1).max(2000)
});

export type SendMessageRequest = z.infer<typeof SendMessageSchema>;

// Create Transaction Request
export const CreateTransactionSchema = z.object({
  initiatorId: z.string().uuid(),
  participantId: z.string().uuid(),
  offerDetails: z.object({
    type: z.enum(['SALE', 'PURCHASE', 'TRADE', 'SERVICE']),
    amount: z.number(),
    itemId: z.string().optional(),
    description: z.string()
  }),
  zoneId: z.string().uuid().optional()
});

export type CreateTransactionRequest = z.infer<typeof CreateTransactionSchema>;
