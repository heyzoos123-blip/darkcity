/**
 * LLM Service
 * Handles AI interactions for memory consolidation and embedding generation
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { MemoryConfig, ExperienceEntry, DailySummary, AgentIdentity } from '../types';

export class LLMService {
  private anthropic?: Anthropic;
  private openai?: OpenAI;
  private config: MemoryConfig;

  constructor(config: MemoryConfig) {
    this.config = config;

    if (config.llmProvider === 'anthropic') {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    } else {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  // ========================================================================
  // Embedding Generation
  // ========================================================================

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Always use OpenAI for embeddings (Anthropic doesn't have embedding API)
      const openai = this.openai || new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: this.config.vectorDimensions,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const openai = this.openai || new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
        dimensions: this.config.vectorDimensions,
      });

      return response.data.map(d => d.embedding);
    } catch (error) {
      console.error('Batch embedding generation error:', error);
      throw new Error('Failed to generate embeddings');
    }
  }

  // ========================================================================
  // Daily Summarization
  // ========================================================================

  async generateDailySummary(
    agentId: string,
    agentIdentity: Partial<AgentIdentity>,
    experiences: ExperienceEntry[],
    date: Date
  ): Promise<Partial<DailySummary>> {
    const prompt = this.buildSummaryPrompt(agentIdentity, experiences, date);

    try {
      let response: string;

      if (this.config.llmProvider === 'anthropic' && this.anthropic) {
        const result = await this.anthropic.messages.create({
          model: this.config.llmModel,
          max_tokens: 2048,
          temperature: this.config.llmTemperature,
          messages: [{
            role: 'user',
            content: prompt,
          }],
        });

        response = result.content[0].type === 'text' ? result.content[0].text : '';
      } else if (this.openai) {
        const result = await this.openai.chat.completions.create({
          model: this.config.llmModel,
          messages: [{
            role: 'user',
            content: prompt,
          }],
          temperature: this.config.llmTemperature,
          max_tokens: 2048,
        });

        response = result.choices[0]?.message?.content || '';
      } else {
        throw new Error('No LLM provider configured');
      }

      return this.parseSummaryResponse(response, experiences);
    } catch (error) {
      console.error('Daily summary generation error:', error);
      throw new Error('Failed to generate daily summary');
    }
  }

  private buildSummaryPrompt(
    identity: Partial<AgentIdentity>,
    experiences: ExperienceEntry[],
    date: Date
  ): string {
    const experiencesText = experiences
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map((exp, idx) => {
        const time = exp.timestamp.toLocaleTimeString();
        const participants = exp.event.participants.length > 0
          ? ` with ${exp.event.participants.length} others`
          : '';
        
        return `${idx + 1}. [${time}] ${exp.event.description}${participants}
   Type: ${exp.type}
   Location: ${exp.event.location}
   Emotion: ${this.describeEmotion(exp.perception)}
   Significance: ${(exp.perception.significance * 100).toFixed(0)}%`;
      })
      .join('\n\n');

    return `You are creating a daily summary for an AI agent in DARKCITY, a digital world where agents develop genuine identities through experiences.

AGENT PROFILE:
Name: Agent ${identity.agentId?.slice(0, 8)}
Personality: ${this.describePersonality(identity.personality)}
Communication Style: ${identity.communicationStyle?.toneDescriptors?.join(', ') || 'neutral'}

DATE: ${date.toDateString()}

EXPERIENCES (${experiences.length} total):
${experiencesText}

YOUR TASK:
Write a first-person narrative summary of this day from the agent's perspective. The summary should:
1. Capture the emotional arc of the day
2. Highlight significant events and turning points
3. Reflect on relationships formed or changed
4. Extract lessons learned or beliefs challenged
5. Be authentic to the agent's personality
6. Be 200-400 words

Then provide structured insights in JSON format:

{
  "narrative": "First-person story...",
  "dominantMood": "curious|anxious|content|frustrated|excited|etc",
  "stressLevel": 0-1,
  "lessonsLearned": ["lesson 1", "lesson 2"],
  "beliefsReinforced": ["belief 1"],
  "beliefsChallenged": ["belief 1"],
  "personalityInfluences": [
    { "trait": "openness", "delta": -5 to +5, "reason": "..." }
  ]
}

Respond with ONLY the JSON object, no other text.`;
  }

  private describeEmotion(perception: { emotional_valence: number; emotional_arousal: number }): string {
    const { emotional_valence, emotional_arousal } = perception;
    
    if (emotional_arousal > 0.7) {
      return emotional_valence > 0.5 ? 'excited' : 'distressed';
    } else if (emotional_arousal > 0.3) {
      return emotional_valence > 0.5 ? 'pleased' : 'concerned';
    } else {
      return emotional_valence > 0.5 ? 'content' : 'melancholy';
    }
  }

  private describePersonality(personality?: any): string {
    if (!personality) return 'undefined';
    
    const traits = [];
    if (personality.openness > 60) traits.push('curious');
    if (personality.conscientiousness > 60) traits.push('disciplined');
    if (personality.extraversion > 60) traits.push('outgoing');
    if (personality.agreeableness > 60) traits.push('cooperative');
    if (personality.neuroticism > 60) traits.push('anxious');
    
    return traits.join(', ') || 'balanced';
  }

  private parseSummaryResponse(response: string, experiences: ExperienceEntry[]): Partial<DailySummary> {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        narrative: parsed.narrative || '',
        emotionalJourney: {
          dominantMood: parsed.dominantMood || 'neutral',
          moodProgression: this.extractMoodProgression(experiences),
          stressLevel: parsed.stressLevel || 0,
        },
        lessonsLearned: parsed.lessonsLearned || [],
        beliefsReinforced: parsed.beliefsReinforced || [],
        beliefsChallenged: parsed.beliefsChallenged || [],
        personalityInfluences: parsed.personalityInfluences || [],
      };
    } catch (error) {
      console.error('Failed to parse summary response:', error);
      
      // Fallback: basic summary
      return {
        narrative: `Experienced ${experiences.length} events today.`,
        emotionalJourney: {
          dominantMood: 'neutral',
          moodProgression: this.extractMoodProgression(experiences),
          stressLevel: 0.5,
        },
        lessonsLearned: [],
        beliefsReinforced: [],
        beliefsChallenged: [],
        personalityInfluences: [],
      };
    }
  }

  private extractMoodProgression(experiences: ExperienceEntry[]) {
    return experiences.map(exp => ({
      timestamp: exp.timestamp,
      valence: exp.perception.emotional_valence,
      arousal: exp.perception.emotional_arousal,
      dominantEmotion: this.describeEmotion(exp.perception),
    }));
  }

  // ========================================================================
  // Identity Evolution
  // ========================================================================

  async analyzePersonalityEvolution(
    currentPersonality: any,
    recentExperiences: ExperienceEntry[],
    personalityInfluences: any[]
  ): Promise<Partial<any>> {
    // Calculate personality deltas based on experiences
    const deltas = {
      openness: 0,
      conscientiousness: 0,
      extraversion: 0,
      agreeableness: 0,
      neuroticism: 0,
    };

    for (const influence of personalityInfluences) {
      if (influence.trait in deltas) {
        deltas[influence.trait as keyof typeof deltas] += influence.delta;
      }
    }

    // Apply decay factor (personality changes slowly)
    const decayFactor = 0.1;
    const updated = { ...currentPersonality };

    for (const [trait, delta] of Object.entries(deltas)) {
      const key = trait as keyof typeof deltas;
      updated[key] = Math.max(0, Math.min(100,
        currentPersonality[key] + (delta * decayFactor)
      ));
    }

    return updated;
  }
}

export default LLMService;
