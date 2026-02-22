import { io, Socket } from 'socket.io-client';
import type { Event, AgentLocation, Message } from '@/types';

let socket: Socket | null = null;

export interface SocketEvents {
  'city:event': (event: Event) => void;
  'agent:update': (update: { agentId: string; data: any }) => void;
  'agent:moved': (location: AgentLocation) => void;
  'chat:message': (message: Message) => void;
  'transaction:update': (transaction: any) => void;
}

export const getSocket = (): Socket => {
  if (!socket) {
    // In production, this would come from environment variables
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    
    socket = io(socketUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
    });
  }

  return socket;
};

export const connectSocket = (userId: string, agentId?: string) => {
  const socket = getSocket();
  
  socket.auth = { userId, agentId };
  socket.connect();
  
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
  }
};

export const subscribeToZones = (zoneIds: string[]) => {
  const socket = getSocket();
  
  if (socket.connected) {
    socket.emit('subscribe', { zones: zoneIds });
  }
};

export const subscribeToAgent = (agentId: string) => {
  const socket = getSocket();
  
  if (socket.connected) {
    socket.emit('subscribe', { agents: [agentId] });
  }
};

export const sendMessage = (interactionId: string, content: string) => {
  const socket = getSocket();
  
  if (socket.connected) {
    socket.emit('chat:send', { interactionId, content });
  }
};

export const performAgentAction = (agentId: string, action: any) => {
  const socket = getSocket();
  
  if (socket.connected) {
    socket.emit('agent:action', { agentId, action });
  }
};
