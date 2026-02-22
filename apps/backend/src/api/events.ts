import { Express, Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { EventEngine } from '../services/events';
import { CreateEventSchema } from '@darkcity/shared';

export function setupEventRoutes(
  app: Express,
  events: EventEngine,
  io: SocketIOServer
) {
  // Create event
  app.post('/api/events', async (req: Request, res: Response) => {
    try {
      const data = CreateEventSchema.parse(req.body);
      
      const event = await events.createEvent(data);
      
      res.status(201).json({ event });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // List events
  app.get('/api/events', async (req: Request, res: Response) => {
    try {
      const { type, zoneId, limit = '100' } = req.query;
      
      const filters: any = {};
      if (type) filters.type = type;
      if (zoneId) filters.zoneId = zoneId;
      
      const eventList = await events.getEvents(filters);
      
      res.json({
        events: eventList.slice(0, parseInt(limit as string)),
        total: eventList.length
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
