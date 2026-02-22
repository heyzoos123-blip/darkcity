import { Express, Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { DatabaseService } from '../services/database';
import { EventEngine } from '../services/events';
import { CreateAgentSchema, UpdateAgentSchema, AgentStatus } from '@darkcity/shared';
import { v4 as uuidv4 } from 'uuid';

export function setupAgentRoutes(
  app: Express,
  db: DatabaseService,
  events: EventEngine,
  io: SocketIOServer
) {
  // Create agent
  app.post('/api/agents', async (req: Request, res: Response) => {
    try {
      const data = CreateAgentSchema.parse(req.body);
      
      const agent = await db.createAgent({
        id: uuidv4(),
        walletAddress: data.walletAddress,
        name: data.name,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        status: AgentStatus.ACTIVE,
        personality: data.personality,
        solBalance: 0,
        reputation: 0,
        level: 1,
        createdAt: new Date(),
        lastActiveAt: new Date()
      });
      
      // Broadcast agent joined
      io.emit('agent:joined', { agent });
      
      res.status(201).json({ agent });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Get agent by ID
  app.get('/api/agents/:id', async (req: Request, res: Response) => {
    try {
      const agent = await db.getAgent(req.params.id);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      res.json({ agent });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update agent
  app.patch('/api/agents/:id', async (req: Request, res: Response) => {
    try {
      const data = UpdateAgentSchema.parse(req.body);
      
      const agent = await db.updateAgent(req.params.id, {
        ...data,
        lastActiveAt: new Date()
      });
      
      // Broadcast agent updated
      io.emit('agent:updated', { agent });
      
      res.json({ agent });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // List agents
  app.get('/api/agents', async (req: Request, res: Response) => {
    try {
      const { status, limit = '100' } = req.query;
      
      const agents = await db.listAgents({
        status: status as AgentStatus | undefined
      });
      
      res.json({
        agents: agents.slice(0, parseInt(limit as string)),
        total: agents.length
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update agent position
  app.post('/api/agents/:id/position', async (req: Request, res: Response) => {
    try {
      const { zoneId, districtId, lat, lng, activity } = req.body;
      
      await db.updateAgent(req.params.id, {
        currentZoneId: zoneId,
        lastActiveAt: new Date()
      });
      
      // Broadcast position update
      io.emit('agent:moved', {
        agentId: req.params.id,
        position: { lat, lng },
        zoneId,
        districtId,
        activity
      });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
}
