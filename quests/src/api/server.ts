/**
 * DARKCITY Quest System API Server
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import { QuestService } from '../services/QuestService';
import { QuestGenerator } from '../services/QuestGenerator';
import { PayoutService } from '../services/PayoutService';
import { ReputationService } from '../services/ReputationService';
import { QuestType, QuestStatus, QuestDifficulty } from '../types';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Services
const questService = new QuestService();
const questGenerator = new QuestGenerator();
const payoutService = new PayoutService(process.env.SOLANA_RPC_URL);
const reputationService = new ReputationService();

// Initialize payout service if secret key provided
if (process.env.SOLANA_SECRET_KEY) {
  const secretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_SECRET_KEY));
  payoutService.initialize(secretKey);
}

// ============================================================================
// QUEST BOARD ENDPOINTS
// ============================================================================

/**
 * GET /api/quests - Browse available quests
 */
app.get('/api/quests', (req: Request, res: Response) => {
  try {
    const filters = {
      type: req.query.type as QuestType,
      difficulty: req.query.difficulty as QuestDifficulty,
      minReward: req.query.minReward ? parseFloat(req.query.minReward as string) : undefined,
      maxReward: req.query.maxReward ? parseFloat(req.query.maxReward as string) : undefined,
      agentWallet: req.query.wallet as string
    };

    const quests = questService.browseQuests(filters);
    res.json({ success: true, quests });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/quests/:id - Get quest details
 */
app.get('/api/quests/:id', (req: Request, res: Response) => {
  try {
    const quest = questService.getQuest(req.params.id);
    if (!quest) {
      return res.status(404).json({ success: false, error: 'Quest not found' });
    }
    res.json({ success: true, quest });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/quests - Create new quest (admin)
 */
app.post('/api/quests', (req: Request, res: Response) => {
  try {
    const quest = questService.createQuest(req.body);
    res.json({ success: true, quest });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// QUEST ACCEPTANCE & COMPLETION
// ============================================================================

/**
 * POST /api/quests/:id/accept - Accept a quest
 */
app.post('/api/quests/:id/accept', (req: Request, res: Response) => {
  try {
    const { agentWallet } = req.body;
    if (!agentWallet) {
      return res.status(400).json({ success: false, error: 'Agent wallet required' });
    }

    const acceptance = questService.acceptQuest(req.params.id, agentWallet);
    res.json({ success: true, acceptance });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/acceptances/:id/submit - Submit quest completion
 */
app.post('/api/acceptances/:id/submit', (req: Request, res: Response) => {
  try {
    const { content, proofUrl, metadata } = req.body;
    
    const submission = {
      content,
      proofUrl,
      metadata,
      submittedAt: Date.now()
    };

    const acceptance = questService.submitQuest(req.params.id, submission);
    res.json({ success: true, acceptance });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/acceptances/:id/approve - Approve and payout (admin)
 */
app.post('/api/acceptances/:id/approve', async (req: Request, res: Response) => {
  try {
    const acceptance = questService.getAcceptance(req.params.id);
    if (!acceptance) {
      return res.status(404).json({ success: false, error: 'Acceptance not found' });
    }

    const quest = questService.getQuest(acceptance.questId);
    if (!quest) {
      return res.status(404).json({ success: false, error: 'Quest not found' });
    }

    // Execute payout
    const payoutRequest = {
      acceptanceId: acceptance.id,
      recipientWallet: acceptance.agentWallet,
      amountSol: quest.rewardSol
    };

    const txSignature = await payoutService.executePayout(payoutRequest);

    // Approve quest with transaction signature
    const updatedAcceptance = questService.approveQuest(req.params.id, txSignature);
    
    res.json({ success: true, acceptance: updatedAcceptance, txSignature });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/acceptances/:id/reject - Reject submission (admin)
 */
app.post('/api/acceptances/:id/reject', (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const acceptance = questService.rejectQuest(req.params.id, reason || 'Not specified');
    res.json({ success: true, acceptance });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// AGENT ENDPOINTS
// ============================================================================

/**
 * GET /api/agents/:wallet/quests - Get agent's quest history
 */
app.get('/api/agents/:wallet/quests', (req: Request, res: Response) => {
  try {
    const status = req.query.status as QuestStatus;
    const quests = questService.getAgentQuests(req.params.wallet, status);
    res.json({ success: true, quests });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/agents/:wallet/reputation - Get agent reputation
 */
app.get('/api/agents/:wallet/reputation', (req: Request, res: Response) => {
  try {
    const reputation = reputationService.getReputation(req.params.wallet);
    if (!reputation) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    res.json({ success: true, reputation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/agents/:wallet/stats - Get detailed agent statistics
 */
app.get('/api/agents/:wallet/stats', (req: Request, res: Response) => {
  try {
    const stats = reputationService.getStats(req.params.wallet);
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// REPUTATION & LEADERBOARD
// ============================================================================

/**
 * GET /api/leaderboard - Get top agents
 */
app.get('/api/leaderboard', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const leaderboard = reputationService.getLeaderboard(limit);
    res.json({ success: true, leaderboard });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/stats - Get global statistics
 */
app.get('/api/stats', (req: Request, res: Response) => {
  try {
    const stats = reputationService.getGlobalStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// QUEST GENERATION (ADMIN)
// ============================================================================

/**
 * POST /api/admin/generate/daily - Generate daily challenges
 */
app.post('/api/admin/generate/daily', (req: Request, res: Response) => {
  try {
    const quests = questGenerator.generateDailyChallenges();
    res.json({ success: true, generated: quests.length, quests });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/generate/data-analysis - Generate data analysis quests
 */
app.post('/api/admin/generate/data-analysis', (req: Request, res: Response) => {
  try {
    const quests = questGenerator.generateDataAnalysisQuests();
    res.json({ success: true, generated: quests.length, quests });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/generate/content - Generate content quests
 */
app.post('/api/admin/generate/content', (req: Request, res: Response) => {
  try {
    const quests = questGenerator.generateContentQuests();
    res.json({ success: true, generated: quests.length, quests });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// HEALTH & INFO
// ============================================================================

/**
 * GET /api/health - Health check
 */
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const balance = await payoutService.getBalance().catch(() => null);
    res.json({
      status: 'ok',
      timestamp: Date.now(),
      payoutBalance: balance
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

/**
 * GET /api/info - System information
 */
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    name: 'DARKCITY Quest System',
    version: '1.0.0',
    questTypes: Object.values(QuestType),
    difficulties: Object.values(QuestDifficulty)
  });
});

// Start server
app.listen(port, () => {
  console.log(`🌃 DARKCITY Quest System running on port ${port}`);
  console.log(`📋 Quest board: http://localhost:${port}/api/quests`);
});

export default app;
