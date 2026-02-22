import { Express, Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { InteractionService } from '../services/interactions';
import { CreateInteractionSchema, SendMessageSchema, CreateTransactionSchema } from '@darkcity/shared';

export function setupInteractionRoutes(
  app: Express,
  interactions: InteractionService,
  io: SocketIOServer
) {
  // Create interaction
  app.post('/api/interactions', async (req: Request, res: Response) => {
    try {
      const data = CreateInteractionSchema.parse(req.body);
      
      const interaction = await interactions.createInteraction(data);
      
      res.status(201).json({ interaction });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Start interaction
  app.post('/api/interactions/:id/start', async (req: Request, res: Response) => {
    try {
      const interaction = await interactions.startInteraction(req.params.id);
      
      res.json({ interaction });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // End interaction
  app.post('/api/interactions/:id/end', async (req: Request, res: Response) => {
    try {
      const { state } = req.body;
      const interaction = await interactions.endInteraction(req.params.id, state);
      
      res.json({ interaction });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Send message
  app.post('/api/interactions/:id/messages', async (req: Request, res: Response) => {
    try {
      const data = SendMessageSchema.parse({
        interactionId: req.params.id,
        ...req.body
      });
      
      const message = await interactions.sendMessage(data);
      
      res.status(201).json({ message });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Create transaction
  app.post('/api/transactions', async (req: Request, res: Response) => {
    try {
      const data = CreateTransactionSchema.parse(req.body);
      
      const transaction = await interactions.createTransaction(data);
      
      res.status(201).json({ transaction });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Accept transaction
  app.post('/api/transactions/:id/accept', async (req: Request, res: Response) => {
    try {
      const transaction = await interactions.acceptTransaction(req.params.id);
      
      res.json({ transaction });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Update reputation
  app.post('/api/agents/:id/reputation', async (req: Request, res: Response) => {
    try {
      const { change, reason } = req.body;
      
      const newReputation = await interactions.updateReputation(
        req.params.id,
        change,
        reason
      );
      
      res.json({ reputation: newReputation });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
}
