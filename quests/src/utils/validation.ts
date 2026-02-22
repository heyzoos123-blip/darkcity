/**
 * Validation utilities
 */
import { z } from 'zod';
import { QuestType, QuestDifficulty, QuestStatus } from '../types';

export const QuestCreationSchema = z.object({
  type: z.nativeEnum(QuestType),
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  difficulty: z.nativeEnum(QuestDifficulty),
  rewardSol: z.number().positive().max(1),
  createdBy: z.string(),
  createdAt: z.number(),
  expiresAt: z.number().nullable(),
  maxCompletions: z.number().int(),
  requirements: z.object({
    minReputation: z.number().optional(),
    requiredSkills: z.array(z.string()).optional(),
    previousQuestsCompleted: z.number().optional(),
    timeLimitSeconds: z.number().optional(),
    specificAgents: z.array(z.string()).optional()
  }),
  metadata: z.record(z.any()),
  isActive: z.boolean()
});

export const QuestSubmissionSchema = z.object({
  content: z.string().min(1),
  proofUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
  submittedAt: z.number()
});

export const SolanaAddressSchema = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);

export function validateQuestCreation(data: any) {
  return QuestCreationSchema.parse(data);
}

export function validateSubmission(data: any) {
  return QuestSubmissionSchema.parse(data);
}

export function validateSolanaAddress(address: string): boolean {
  try {
    SolanaAddressSchema.parse(address);
    return true;
  } catch {
    return false;
  }
}
