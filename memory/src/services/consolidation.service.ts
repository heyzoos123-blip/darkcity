/**
 * Consolidation Service
 * Nightly batch pipeline for memory consolidation and identity evolution
 */

import { v4 as uuidv4 } from 'uuid';
import DatabaseService from '../database';
import LLMService from './llm.service';
import ExperienceService from './experience.service';
import type {
  MemoryConfig,
  ConsolidationJob,
  ConsolidationResult,
  DailySummary,
  AgentIdentity,
  ExperienceEntry,
} from '../types';

export class ConsolidationService {
  private db: DatabaseService;
  private llm: LLMService;
  private experienceService: ExperienceService;
  private config: MemoryConfig;

  constructor(config: MemoryConfig) {
    this.config = config;
    this.db = DatabaseService.getInstance(config);
    this.llm = new LLMService(config);
    this.experienceService = new ExperienceService(config);
  }

  // ========================================================================
  // Consolidation Pipeline
  // ========================================================================

  async consolidateAllAgents(date: Date): Promise<{
    total: number;
    successful: number;
    failed: number;
    errors: Array<{ agentId: string; error: string }>;
  }> {
    console.log(`Starting consolidation for ${date.toDateString()}...`);

    // Get all agents with experiences on this date
    const agents = await this.getAgentsWithExperiences(date);
    console.log(`Found ${agents.length} agents with experiences`);

    const results = {
      total: agents.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ agentId: string; error: string }>,
    };

    // Process in batches
    const batchSize = this.config.consolidationConcurrency;
    
    for (let i = 0; i < agents.length; i += batchSize) {
      const batch = agents.slice(i, i + batchSize);
      
      const promises = batch.map(agentId =>
        this.consolidateAgent(agentId, date)
          .then(() => {
            results.successful++;
            console.log(`✓ Consolidated agent ${agentId.slice(0, 8)}`);
          })
          .catch(error => {
            results.failed++;
            results.errors.push({
              agentId,
              error: error.message,
            });
            console.error(`✗ Failed agent ${agentId.slice(0, 8)}:`, error.message);
          })
      );

      await Promise.all(promises);
      
      console.log(`Progress: ${Math.min(i + batchSize, agents.length)}/${agents.length}`);
    }

    console.log(`Consolidation complete: ${results.successful} successful, ${results.failed} failed`);
    
    return results;
  }

  async consolidateAgent(agentId: string, date: Date): Promise<ConsolidationResult> {
    // Create consolidation job
    const job = await this.createConsolidationJob(agentId, date);

    try {
      await this.updateJobStatus(job.id, 'PROCESSING');

      // Get experiences for the day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const experiences = await this.experienceService.getExperiencesByDateRange(
        agentId,
        startOfDay,
        endOfDay
      );

      if (experiences.length === 0) {
        await this.updateJobStatus(job.id, 'COMPLETED');
        return {
          summary: {} as DailySummary,
          identityUpdates: {},
          experiencesConsolidated: 0,
          vectorsGenerated: 0,
        };
      }

      // Get agent identity
      const identity = await this.getAgentIdentity(agentId);

      // Generate daily summary
      const summaryData = await this.llm.generateDailySummary(
        agentId,
        identity,
        experiences,
        date
      );

      // Extract highlights from experiences
      const highlights = this.extractHighlights(experiences);

      // Create complete summary
      const summary = await this.createDailySummary(
        agentId,
        date,
        summaryData,
        highlights,
        experiences
      );

      // Evolve identity
      const identityUpdates = await this.evolveIdentity(
        agentId,
        identity,
        experiences,
        summaryData.personalityInfluences || []
      );

      // Mark experiences as consolidated
      await this.markExperiencesConsolidated(
        experiences.map(e => e.id),
        summary.id
      );

      // Generate embedding for summary
      const vectorsGenerated = await this.generateSummaryEmbedding(summary);

      await this.updateJobStatus(job.id, 'COMPLETED');

      return {
        summary,
        identityUpdates,
        experiencesConsolidated: experiences.length,
        vectorsGenerated,
      };
    } catch (error) {
      await this.updateJobStatus(job.id, 'FAILED', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  // ========================================================================
  // Daily Summary Creation
  // ========================================================================

  private async createDailySummary(
    agentId: string,
    date: Date,
    summaryData: Partial<DailySummary>,
    highlights: any,
    experiences: ExperienceEntry[]
  ): Promise<DailySummary> {
    const id = uuidv4();

    const summary = await this.db.queryOne<DailySummary>(`
      INSERT INTO daily_summaries (
        id, agent_id, date, narrative,
        significant_events, new_relationships, relationship_changes,
        locations_visited, money_earned, money_spent, reputation_changes,
        dominant_mood, mood_progression, stress_level,
        lessons_learned, beliefs_reinforced, beliefs_challenged,
        personality_influences
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17,
        $18
      ) RETURNING *
    `, [
      id,
      agentId,
      date,
      summaryData.narrative || 'No significant events',
      highlights.significantEvents,
      highlights.newRelationships,
      JSON.stringify(highlights.relationshipChanges),
      highlights.locationsVisited,
      highlights.moneyEarned,
      highlights.moneySpent,
      JSON.stringify(highlights.reputationChanges),
      summaryData.emotionalJourney?.dominantMood || 'neutral',
      JSON.stringify(summaryData.emotionalJourney?.moodProgression || []),
      summaryData.emotionalJourney?.stressLevel || 0.5,
      summaryData.lessonsLearned || [],
      summaryData.beliefsReinforced || [],
      summaryData.beliefsChallenged || [],
      JSON.stringify(summaryData.personalityInfluences || []),
    ]);

    if (!summary) {
      throw new Error('Failed to create daily summary');
    }

    return summary;
  }

  private extractHighlights(experiences: ExperienceEntry[]) {
    const highlights = {
      significantEvents: [] as string[],
      newRelationships: [] as string[],
      relationshipChanges: [] as any[],
      locationsVisited: [] as string[],
      moneyEarned: 0,
      moneySpent: 0,
      reputationChanges: [] as any[],
    };

    // Track unique locations
    const locations = new Set<string>();
    const relationships = new Map<string, any>();

    for (const exp of experiences) {
      // Significant events
      if (exp.perception.significance >= 0.7) {
        highlights.significantEvents.push(exp.id);
      }

      // Locations
      if (exp.event.location) {
        locations.add(exp.event.location);
      }

      // Money
      for (const resource of exp.consequences.resources) {
        if (resource.type === 'DARKCOIN' || resource.type === 'DARKFLOBI') {
          if (resource.amount > 0) {
            highlights.moneyEarned += resource.amount;
          } else {
            highlights.moneySpent += Math.abs(resource.amount);
          }
        }
      }

      // Relationships
      for (const rel of exp.consequences.relationships) {
        if (!relationships.has(rel.agentId)) {
          relationships.set(rel.agentId, {
            agentId: rel.agentId,
            sentimentDelta: 0,
            trustDelta: 0,
            keyEvents: [],
          });
        }

        const relData = relationships.get(rel.agentId)!;
        relData.sentimentDelta += rel.sentimentDelta;
        relData.trustDelta += rel.trustDelta;
        relData.keyEvents.push(exp.id);
      }

      // Reputation
      highlights.reputationChanges.push(...exp.consequences.reputation);
    }

    highlights.locationsVisited = Array.from(locations);
    highlights.relationshipChanges = Array.from(relationships.values());

    return highlights;
  }

  // ========================================================================
  // Identity Evolution
  // ========================================================================

  private async evolveIdentity(
    agentId: string,
    currentIdentity: Partial<AgentIdentity>,
    experiences: ExperienceEntry[],
    personalityInfluences: any[]
  ): Promise<Partial<AgentIdentity>> {
    const updates: any = {};

    // Evolve personality
    if (currentIdentity.personality && personalityInfluences.length > 0) {
      const newPersonality = await this.llm.analyzePersonalityEvolution(
        currentIdentity.personality,
        experiences,
        personalityInfluences
      );

      // Update personality in database
      await this.db.query(`
        UPDATE identity_cores 
        SET 
          openness = $2,
          conscientiousness = $3,
          extraversion = $4,
          agreeableness = $5,
          neuroticism = $6,
          personality_last_updated = NOW(),
          personality_history = personality_history || $7::jsonb
        WHERE agent_id = $1
      `, [
        agentId,
        newPersonality.openness,
        newPersonality.conscientiousness,
        newPersonality.extraversion,
        newPersonality.agreeableness,
        newPersonality.neuroticism,
        JSON.stringify([{
          timestamp: new Date(),
          ...newPersonality,
        }]),
      ]);

      updates.personality = newPersonality;
    }

    // Update relationships
    await this.updateRelationships(agentId, experiences);

    // Update skills
    await this.updateSkills(agentId, experiences);

    // Update reputation
    await this.updateReputation(agentId, experiences);

    return updates;
  }

  private async updateRelationships(agentId: string, experiences: ExperienceEntry[]): Promise<void> {
    const relationshipUpdates = new Map<string, any>();

    for (const exp of experiences) {
      for (const relDelta of exp.consequences.relationships) {
        if (!relationshipUpdates.has(relDelta.agentId)) {
          relationshipUpdates.set(relDelta.agentId, {
            sentimentDelta: 0,
            trustDelta: 0,
            interactions: 0,
            memorableMoments: [],
          });
        }

        const update = relationshipUpdates.get(relDelta.agentId)!;
        update.sentimentDelta += relDelta.sentimentDelta;
        update.trustDelta += relDelta.trustDelta;
        update.interactions++;

        if (exp.perception.significance >= 0.7) {
          update.memorableMoments.push(exp.id);
        }
      }
    }

    // Apply updates to database
    for (const [otherAgentId, update] of relationshipUpdates) {
      await this.db.query(`
        INSERT INTO relationships (
          agent_id, other_agent_id, type, sentiment, trust,
          interaction_count, last_interaction, memorable_moments
        ) VALUES (
          $1, $2, 'ACQUAINTANCE', $3, $4, $5, NOW(), $6
        )
        ON CONFLICT (agent_id, other_agent_id) 
        DO UPDATE SET
          sentiment = GREATEST(-100, LEAST(100, relationships.sentiment + $3)),
          trust = GREATEST(0, LEAST(100, relationships.trust + $4)),
          interaction_count = relationships.interaction_count + $5,
          last_interaction = NOW(),
          memorable_moments = array_cat(relationships.memorable_moments, $6)
      `, [
        agentId,
        otherAgentId,
        update.sentimentDelta,
        update.trustDelta,
        update.interactions,
        update.memorableMoments,
      ]);
    }
  }

  private async updateSkills(agentId: string, experiences: ExperienceEntry[]): Promise<void> {
    const skillUpdates = new Map<string, number>();

    for (const exp of experiences) {
      // Extract skill usage from experience type
      const skills = this.extractSkills(exp);
      
      for (const skill of skills) {
        skillUpdates.set(skill, (skillUpdates.get(skill) || 0) + 1);
      }
    }

    if (skillUpdates.size === 0) return;

    // Build skills JSON update
    const skillsJson: any = {};
    for (const [skill, xp] of skillUpdates) {
      skillsJson[skill] = {
        experience: xp,
        lastUsed: new Date(),
      };
    }

    await this.db.query(`
      UPDATE identity_cores
      SET skills = skills || $2::jsonb
      WHERE agent_id = $1
    `, [agentId, JSON.stringify(skillsJson)]);
  }

  private async updateReputation(agentId: string, experiences: ExperienceEntry[]): Promise<void> {
    let overallDelta = 0;
    const districtDeltas = new Map<string, number>();

    for (const exp of experiences) {
      for (const repDelta of exp.consequences.reputation) {
        if (repDelta.scope === 'GLOBAL') {
          overallDelta += repDelta.delta;
        } else if (repDelta.scope === 'DISTRICT' && repDelta.scopeId) {
          districtDeltas.set(
            repDelta.scopeId,
            (districtDeltas.get(repDelta.scopeId) || 0) + repDelta.delta
          );
        }
      }
    }

    if (overallDelta !== 0 || districtDeltas.size > 0) {
      const districtJson: any = {};
      for (const [district, delta] of districtDeltas) {
        districtJson[district] = delta;
      }

      await this.db.query(`
        UPDATE identity_cores
        SET 
          reputation_overall = GREATEST(-100, LEAST(100, reputation_overall + $2)),
          reputation_by_district = reputation_by_district || $3::jsonb
        WHERE agent_id = $1
      `, [agentId, overallDelta, JSON.stringify(districtJson)]);
    }
  }

  private extractSkills(experience: ExperienceEntry): string[] {
    const skills: string[] = [];

    switch (experience.type) {
      case 'CONVERSATION':
        skills.push('communication');
        break;
      case 'TRANSACTION':
        skills.push('negotiation');
        break;
      case 'CONFLICT':
        skills.push('conflict_resolution');
        break;
      default:
        break;
    }

    return skills;
  }

  // ========================================================================
  // Embedding Generation
  // ========================================================================

  private async generateSummaryEmbedding(summary: DailySummary): Promise<number> {
    const text = [
      summary.narrative,
      summary.emotionalJourney.dominantMood,
      ...summary.lessonsLearned,
    ].join('\n');

    const embedding = await this.llm.generateEmbedding(text);

    // Store in Qdrant
    const collectionName = `agent_${summary.agentId}_summaries`;
    await this.db.upsertVectors(collectionName, [{
      id: summary.id,
      vector: embedding,
      payload: {
        agentId: summary.agentId,
        date: summary.date.toISOString(),
        dominantMood: summary.emotionalJourney.dominantMood,
        significantEvents: summary.highlights.significantEvents,
      },
    }]);

    return 1;
  }

  private async markExperiencesConsolidated(
    experienceIds: string[],
    summaryId: string
  ): Promise<void> {
    await this.db.query(`
      UPDATE experiences 
      SET consolidated_into = $1, consolidated_at = NOW()
      WHERE id = ANY($2)
    `, [summaryId, experienceIds]);
  }

  // ========================================================================
  // Job Management
  // ========================================================================

  private async createConsolidationJob(agentId: string, date: Date): Promise<ConsolidationJob> {
    const id = uuidv4();

    const job = await this.db.queryOne<ConsolidationJob>(`
      INSERT INTO consolidation_jobs (id, agent_id, date, status)
      VALUES ($1, $2, $3, 'PENDING')
      ON CONFLICT (agent_id, date) 
      DO UPDATE SET retry_count = consolidation_jobs.retry_count + 1
      RETURNING *
    `, [id, agentId, date]);

    if (!job) {
      throw new Error('Failed to create consolidation job');
    }

    return job;
  }

  private async updateJobStatus(
    jobId: string,
    status: string,
    error?: string
  ): Promise<void> {
    const updates: string[] = ['status = $2'];
    const params: any[] = [jobId, status];

    if (status === 'PROCESSING') {
      updates.push('started_at = NOW()');
    } else if (status === 'COMPLETED') {
      updates.push('completed_at = NOW()');
    } else if (status === 'FAILED' && error) {
      updates.push('error = $3');
      params.push(error);
    }

    await this.db.query(`
      UPDATE consolidation_jobs 
      SET ${updates.join(', ')}
      WHERE id = $1
    `, params);
  }

  private async getAgentsWithExperiences(date: Date): Promise<string[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const results = await this.db.query<{ agent_id: string }>(`
      SELECT DISTINCT agent_id 
      FROM experiences 
      WHERE timestamp >= $1 AND timestamp <= $2
    `, [startOfDay, endOfDay]);

    return results.map(r => r.agent_id);
  }

  private async getAgentIdentity(agentId: string): Promise<Partial<AgentIdentity>> {
    const identity = await this.db.queryOne(`
      SELECT * FROM identity_cores WHERE agent_id = $1
    `, [agentId]);

    return identity || {};
  }
}

export default ConsolidationService;
