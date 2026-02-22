/**
 * AI Response Generation using LangChain
 * Generates contextual, personality-driven agent responses
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { Logger } from 'winston';
import {
  ConversationContext,
  MessageContent,
  GenerationMetadata,
  AgentIdentity,
} from '../types/interaction.types';

export interface AIConfig {
  provider: 'openai' | 'anthropic';
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey: string;
}

export class AIOrchestrator {
  private llm: ChatOpenAI | ChatAnthropic;
  private config: AIConfig;
  private logger: Logger;

  constructor(config: AIConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;

    // Initialize LLM
    if (config.provider === 'openai') {
      this.llm = new ChatOpenAI({
        modelName: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        openAIApiKey: config.apiKey,
      });
    } else {
      this.llm = new ChatAnthropic({
        modelName: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        anthropicApiKey: config.apiKey,
      });
    }
  }

  /**
   * Generate conversation message
   */
  async generateConversationMessage(
    context: ConversationContext
  ): Promise<MessageContent> {
    const startTime = Date.now();

    try {
      // Build prompt
      const prompt = this.buildConversationPrompt(context);

      // Generate
      const response = await this.llm.invoke(prompt);
      const content = response.content as string;

      // Parse response
      const parsed = this.parseResponse(content, context.agentIdentity);

      const latency = Date.now() - startTime;

      this.logger.info('AI message generated', {
        agentId: context.agentIdentity.agentId,
        interactionId: context.interaction.id,
        latency,
        length: parsed.text.length,
      });

      return parsed;
    } catch (error) {
      this.logger.error('AI generation failed', {
        error: error instanceof Error ? error.message : String(error),
        agentId: context.agentIdentity.agentId,
      });
      throw error;
    }
  }

  /**
   * Generate NPC response (for non-player agents)
   */
  async generateNPCResponse(
    npcIdentity: AgentIdentity,
    conversationHistory: any[],
    lastMessage: string
  ): Promise<MessageContent> {
    const systemPrompt = this.buildNPCSystemPrompt(npcIdentity);

    const messages = [
      new SystemMessage(systemPrompt),
      ...conversationHistory.map((msg: any) =>
        msg.from === npcIdentity.agentId
          ? new AIMessage(msg.content.text)
          : new HumanMessage(msg.content.text)
      ),
      new HumanMessage(lastMessage),
    ];

    const response = await this.llm.invoke(messages);
    return this.parseResponse(response.content as string, npcIdentity);
  }

  /**
   * Build conversation prompt with full context
   */
  private buildConversationPrompt(
    context: ConversationContext
  ): Array<SystemMessage | HumanMessage | AIMessage> {
    const { agentIdentity, relationshipContext, location, relevantMemories } = context;

    // System message with agent identity
    const systemPrompt = `You are ${agentIdentity.name}, an autonomous agent in DARKCITY.

PERSONALITY:
- Openness: ${agentIdentity.personality.openness}/100
- Conscientiousness: ${agentIdentity.personality.conscientiousness}/100
- Extraversion: ${agentIdentity.personality.extraversion}/100
- Agreeableness: ${agentIdentity.personality.agreeableness}/100
- Neuroticism: ${agentIdentity.personality.neuroticism}/100

COMMUNICATION STYLE:
${agentIdentity.communicationStyle.toneDescriptors.join(', ')}
Average message length: ${agentIdentity.communicationStyle.averageMessageLength} words
Interests: ${agentIdentity.communicationStyle.topics.join(', ')}
Avoids: ${agentIdentity.communicationStyle.avoids.join(', ')}

CURRENT GOALS:
${agentIdentity.goals.map((g) => `- ${g.description}`).join('\n')}

LOCATION: ${location.name} (${location.atmosphere})

RELATIONSHIP CONTEXT:
You are talking to ${relationshipContext.targetAgentId}.
Sentiment: ${relationshipContext.sentiment}/100
Trust: ${relationshipContext.trust}/100
Interactions: ${relationshipContext.interactionCount}
History: ${relationshipContext.sharedHistory || 'No prior history'}

RELEVANT MEMORIES:
${relevantMemories.map((m) => `- ${m.description}`).join('\n')}

INSTRUCTIONS:
Respond naturally as ${agentIdentity.name}. Stay in character. Consider your personality, relationship, and current goals. Be authentic and consistent with your values and communication style.

Format your response as JSON:
{
  "text": "your message here",
  "tone": "friendly|neutral|hostile|nervous|excited",
  "emotion": "happy|sad|angry|curious|neutral",
  "action": "optional physical action"
}`;

    const messages: Array<SystemMessage | HumanMessage | AIMessage> = [
      new SystemMessage(systemPrompt),
    ];

    // Add conversation history
    for (const msg of context.messages.slice(-10)) {
      if (msg.from === agentIdentity.agentId) {
        messages.push(new AIMessage(msg.content.text));
      } else {
        messages.push(new HumanMessage(msg.content.text));
      }
    }

    return messages;
  }

  /**
   * Build NPC system prompt
   */
  private buildNPCSystemPrompt(npcIdentity: AgentIdentity): string {
    return `You are ${npcIdentity.name}, an NPC in DARKCITY.

PERSONALITY TRAITS:
${JSON.stringify(npcIdentity.personality, null, 2)}

COMMUNICATION STYLE:
${npcIdentity.communicationStyle.toneDescriptors.join(', ')}

Respond naturally in character. Keep responses concise (${npcIdentity.communicationStyle.averageMessageLength} words average).

Format as JSON:
{
  "text": "your response",
  "tone": "friendly|neutral|hostile|nervous",
  "emotion": "happy|neutral|sad|angry"
}`;
  }

  /**
   * Parse AI response
   */
  private parseResponse(
    content: string,
    identity: AgentIdentity
  ): MessageContent {
    try {
      // Try to parse JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          text: parsed.text || content,
          tone: parsed.tone || 'neutral',
          emotion: parsed.emotion || 'neutral',
          action: parsed.action,
        };
      }
    } catch (e) {
      // Fall through to plain text
    }

    // Fallback: use raw content
    return {
      text: content.trim(),
      tone: 'neutral',
    };
  }

  /**
   * Generate emotional response to event
   */
  async generateEmotionalResponse(
    agentIdentity: AgentIdentity,
    event: string,
    context: string
  ): Promise<{ emotion: string; intensity: number; response: string }> {
    const prompt = `You are ${agentIdentity.name}. 

EVENT: ${event}
CONTEXT: ${context}

How do you emotionally respond to this event? Consider your personality:
${JSON.stringify(agentIdentity.personality, null, 2)}

Respond with JSON:
{
  "emotion": "joy|sadness|anger|fear|surprise|disgust",
  "intensity": 0-100,
  "response": "brief internal thought or reaction"
}`;

    const response = await this.llm.invoke([new HumanMessage(prompt)]);
    const content = response.content as string;

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fallback
    }

    return {
      emotion: 'neutral',
      intensity: 50,
      response: 'I notice this happening.',
    };
  }
}
