import { Express, Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { MemoryService } from '../services/memory';
import { CreateMemorySchema, SearchMemorySchema } from '@darkcity/shared';

export function setupMemoryRoutes(
  app: Express,
  memory: MemoryService,
  io: SocketIOServer
) {
  // Create memory
  app.post('/api/memory', async (req: Request, res: Response) => {
    try {
      const data = CreateMemorySchema.parse(req.body);
      
      const mem = await memory.createMemory(data);
      
      res.status(201).json({ memory: mem });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Get agent memories
  app.get('/api/agents/:agentId/memories', async (req: Request, res: Response) => {
    try {
      const { type, importance, limit = '50' } = req.query;
      
      const memories = await memory.getMemories(req.params.agentId, {
        type: type as any,
        importance: importance as any,
        limit: parseInt(limit as string)
      });
      
      res.json({ memories, total: memories.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Search memories
  app.post('/api/agents/:agentId/memories/search', async (req: Request, res: Response) => {
    try {
      const data = SearchMemorySchema.parse({
        agentId: req.params.agentId,
        ...req.body
      });
      
      const memories = await memory.searchMemories(
        data.agentId,
        data.query || '',
        data.limit
      );
      
      res.json({ memories, total: memories.length });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Get working memory
  app.get('/api/agents/:agentId/working-memory', async (req: Request, res: Response) => {
    try {
      const workingMem = await memory.getWorkingMemory(req.params.agentId);
      
      res.json({ workingMemory: workingMem });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update working memory
  app.patch('/api/agents/:agentId/working-memory', async (req: Request, res: Response) => {
    try {
      const updated = await memory.updateWorkingMemory(req.params.agentId, req.body);
      
      res.json({ workingMemory: updated });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
}
