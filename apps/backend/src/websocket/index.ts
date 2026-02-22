import { Server as SocketIOServer, Socket } from 'socket.io';
import { DatabaseService } from '../services/database';
import { EventEngine } from '../services/events';
import { MemoryService } from '../services/memory';
import { InteractionService } from '../services/interactions';
import { WSEventType, ClientEventType } from '@darkcity/shared';

interface Services {
  db: DatabaseService;
  events: EventEngine;
  memory: MemoryService;
  interactions: InteractionService;
}

export function setupWebSocket(io: SocketIOServer, services: Services) {
  const { db } = services;
  
  // Set up Redis subscribers for broadcasting
  const eventsSub = db.subscribe('events', (message) => {
    io.emit(message.type, message.data);
  });
  
  const interactionsSub = db.subscribe('interactions', (message) => {
    io.emit(message.type, message.data);
  });
  
  const messagesSub = db.subscribe('messages', (message) => {
    io.emit(message.type, message.data);
  });
  
  io.on('connection', (socket: Socket) => {
    console.log(`WebSocket client connected: ${socket.id}`);
    
    // Track subscriptions
    const subscriptions = new Set<string>();
    
    // Handle client subscriptions
    socket.on(ClientEventType.SUBSCRIBE_ZONE, (data: { zoneId: string }) => {
      const room = `zone:${data.zoneId}`;
      socket.join(room);
      subscriptions.add(room);
      console.log(`Client ${socket.id} subscribed to ${room}`);
    });
    
    socket.on(ClientEventType.UNSUBSCRIBE_ZONE, (data: { zoneId: string }) => {
      const room = `zone:${data.zoneId}`;
      socket.leave(room);
      subscriptions.delete(room);
      console.log(`Client ${socket.id} unsubscribed from ${room}`);
    });
    
    socket.on(ClientEventType.SUBSCRIBE_AGENT, (data: { agentId: string }) => {
      const room = `agent:${data.agentId}`;
      socket.join(room);
      subscriptions.add(room);
      console.log(`Client ${socket.id} subscribed to ${room}`);
    });
    
    socket.on(ClientEventType.UNSUBSCRIBE_AGENT, (data: { agentId: string }) => {
      const room = `agent:${data.agentId}`;
      socket.leave(room);
      subscriptions.delete(room);
      console.log(`Client ${socket.id} unsubscribed from ${room}`);
    });
    
    // Ping/pong
    socket.on(ClientEventType.PING, () => {
      socket.emit('pong', { timestamp: new Date() });
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`WebSocket client disconnected: ${socket.id}`);
      subscriptions.clear();
    });
    
    // Send initial connection confirmation
    socket.emit(WSEventType.CONNECT, {
      timestamp: new Date(),
      data: { socketId: socket.id }
    });
  });
  
  console.log('✅ WebSocket handlers configured');
  
  // Clean up subscribers on shutdown
  process.on('SIGTERM', () => {
    eventsSub.disconnect();
    interactionsSub.disconnect();
    messagesSub.disconnect();
  });
}
