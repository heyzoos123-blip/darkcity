/**
 * DARKCITY Quest System Types
 */

export enum QuestType {
  DATA_ANALYSIS = 'data_analysis',
  CONTENT_GENERATION = 'content_generation',
  AGENT_SERVICES = 'agent_services',
  DAILY_CHALLENGE = 'daily_challenge'
}

export enum QuestStatus {
  AVAILABLE = 'available',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export enum QuestDifficulty {
  TRIVIAL = 'trivial',
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert'
}

export interface Quest {
  id: string;
  type: QuestType;
  title: string;
  description: string;
  difficulty: QuestDifficulty;
  rewardSol: number;
  createdBy: string; // 'system' or agent wallet
  createdAt: number;
  expiresAt: number | null;
  maxCompletions: number; // -1 for unlimited
  currentCompletions: number;
  requirements: QuestRequirements;
  metadata: Record<string, any>;
  isActive: boolean;
}

export interface QuestRequirements {
  minReputation?: number;
  requiredSkills?: string[];
  previousQuestsCompleted?: number;
  timeLimitSeconds?: number;
  specificAgents?: string[]; // null = any agent
}

export interface QuestAcceptance {
  id: string;
  questId: string;
  agentWallet: string;
  acceptedAt: number;
  submittedAt: number | null;
  completedAt: number | null;
  status: QuestStatus;
  submission: QuestSubmission | null;
  payoutTxSignature: string | null;
}

export interface QuestSubmission {
  content: string; // Result data, could be URL, text, JSON
  proofUrl?: string; // Optional proof of work
  metadata?: Record<string, any>;
  submittedAt: number;
}

export interface AgentReputation {
  agentWallet: string;
  totalQuests: number;
  completedQuests: number;
  rejectedQuests: number;
  totalEarned: number; // SOL
  reputation: number; // 0-1000 scale
  tier: ReputationTier;
  lastActiveAt: number;
  joinedAt: number;
}

export enum ReputationTier {
  NEWCOMER = 'newcomer',      // 0-99
  APPRENTICE = 'apprentice',  // 100-299
  SKILLED = 'skilled',        // 300-599
  EXPERT = 'expert',          // 600-899
  MASTER = 'master'           // 900-1000
}

export interface QuestGenerationConfig {
  type: QuestType;
  minReward: number;
  maxReward: number;
  templates: QuestTemplate[];
  generationRate: number; // per hour
  expirationHours: number;
}

export interface QuestTemplate {
  titleTemplate: string;
  descriptionTemplate: string;
  difficulty: QuestDifficulty;
  requirements: QuestRequirements;
  metadataTemplate?: Record<string, any>;
}

export interface QuestBoardFilters {
  type?: QuestType;
  difficulty?: QuestDifficulty;
  minReward?: number;
  maxReward?: number;
  agentWallet?: string; // Check if agent meets requirements
}

export interface PayoutRequest {
  acceptanceId: string;
  recipientWallet: string;
  amountSol: number;
}
