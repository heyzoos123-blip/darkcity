import { z } from 'zod';
import { Agent, AgentStatus } from './agent';
import { Event } from './event';
import { Interaction, Message } from './interaction';
import { Memory } from './memory';

// WebSocket Event Types
export enum WSEventType {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  
  // Agent Events
  AGENT_JOINED = 'agent:joined',
  AGENT_LEFT = 'agent:left',
  AGENT_MOVED = 'agent:moved',
  AGENT_STATUS_CHANGED = 'agent:status_changed',
  AGENT_UPDATED = 'agent:updated',
  
  // Game Events
  EVENT_CREATED = 'event:created',
  EVENT_UPDATED = 'event:updated',
  EVENT_EXPIRED = 'event:expired',
  
  // Interaction Events
  INTERACTION_STARTED = 'interaction:started',
  INTERACTION_UPDATED = 'interaction:updated',
  INTERACTION_ENDED = 'interaction:ended',
  MESSAGE_SENT = 'message:sent',
  
  // Zone/Location Events
  ZONE_UPDATED = 'zone:updated',
  DISTRICT_UPDATED = 'district:updated',
  
  // System Events
  SYSTEM_ANNOUNCEMENT = 'system:announcement',
  SYSTEM_MAINTENANCE = 'system:maintenance'
}

// Base WebSocket Event
export const WSEventSchema = z.object({
  type: z.nativeEnum(WSEventType),
  timestamp: z.date(),
  data: z.record(z.any())
});

export type WSEvent = z.infer<typeof WSEventSchema>;

// Agent Position Update
export const AgentPositionUpdateSchema = z.object({
  type: z.literal(WSEventType.AGENT_MOVED),
  timestamp: z.date(),
  data: z.object({
    agentId: z.string().uuid(),
    position: z.object({
      lat: z.number(),
      lng: z.number()
    }),
    street: z.string().optional(),
    districtId: z.string().uuid(),
    zoneId: z.string().uuid(),
    activity: z.string().optional()
  })
});

export type AgentPositionUpdate = z.infer<typeof AgentPositionUpdateSchema>;

// Agent Status Change
export const AgentStatusChangeSchema = z.object({
  type: z.literal(WSEventType.AGENT_STATUS_CHANGED),
  timestamp: z.date(),
  data: z.object({
    agentId: z.string().uuid(),
    previousStatus: z.nativeEnum(AgentStatus),
    newStatus: z.nativeEnum(AgentStatus)
  })
});

export type AgentStatusChange = z.infer<typeof AgentStatusChangeSchema>;

// Event Broadcast
export const EventBroadcastSchema = z.object({
  type: z.literal(WSEventType.EVENT_CREATED),
  timestamp: z.date(),
  data: z.object({
    eventId: z.string().uuid(),
    eventType: z.string(),
    title: z.string(),
    description: z.string(),
    zoneId: z.string().uuid().optional(),
    districtId: z.string().uuid().optional(),
    affectedAgents: z.array(z.string().uuid())
  })
});

export type EventBroadcast = z.infer<typeof EventBroadcastSchema>;

// Message Broadcast
export const MessageBroadcastSchema = z.object({
  type: z.literal(WSEventType.MESSAGE_SENT),
  timestamp: z.date(),
  data: z.object({
    messageId: z.string().uuid(),
    interactionId: z.string().uuid(),
    senderId: z.string().uuid(),
    content: z.string(),
    participants: z.array(z.string().uuid())
  })
});

export type MessageBroadcast = z.infer<typeof MessageBroadcastSchema>;

// System Announcement
export const SystemAnnouncementSchema = z.object({
  type: z.literal(WSEventType.SYSTEM_ANNOUNCEMENT),
  timestamp: z.date(),
  data: z.object({
    message: z.string(),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']),
    expiresAt: z.date().optional()
  })
});

export type SystemAnnouncement = z.infer<typeof SystemAnnouncementSchema>;

// Client -> Server Events
export enum ClientEventType {
  SUBSCRIBE_ZONE = 'subscribe:zone',
  UNSUBSCRIBE_ZONE = 'unsubscribe:zone',
  SUBSCRIBE_AGENT = 'subscribe:agent',
  UNSUBSCRIBE_AGENT = 'unsubscribe:agent',
  PING = 'ping'
}

export const ClientEventSchema = z.object({
  type: z.nativeEnum(ClientEventType),
  data: z.record(z.any()).optional()
});

export type ClientEvent = z.infer<typeof ClientEventSchema>;
