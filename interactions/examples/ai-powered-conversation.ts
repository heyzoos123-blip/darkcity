/**
 * Example: AI-Powered Conversation
 * Demonstrates using AI to generate contextual agent responses
 */

import { InteractionLayer } from '../src/index';
import {
  AgentIdentity,
  ConversationContext,
  Location,
} from '../src/types/interaction.types';
import config from '../config.json';

async function aiPoweredConversationExample() {
  const layer = new InteractionLayer(config);
  await layer.start();

  const services = layer.getServices();
  const { conversationManager, aiOrchestrator } = services;

  // Define agent identities
  const aliceIdentity: AgentIdentity = {
    agentId: 'agent-alice',
    name: 'Alice',
    personality: {
      openness: 85,
      conscientiousness: 70,
      extraversion: 65,
      agreeableness: 80,
      neuroticism: 30,
    },
    values: {
      creativity: 90,
      collaboration: 85,
      innovation: 80,
    },
    communicationStyle: {
      vocabulary: ['innovative', 'collaborate', 'exciting', 'opportunity'],
      toneDescriptors: ['enthusiastic', 'friendly', 'optimistic'],
      topics: ['art', 'technology', 'entrepreneurship'],
      avoids: ['negativity', 'bureaucracy'],
      averageMessageLength: 25,
    },
    goals: [
      {
        id: 'goal-1',
        description: 'Build a successful digital art marketplace',
        priority: 10,
        type: 'LONG_TERM',
      },
      {
        id: 'goal-2',
        description: 'Find a technical co-founder',
        priority: 9,
        type: 'SHORT_TERM',
      },
    ],
  };

  const bobIdentity: AgentIdentity = {
    agentId: 'agent-bob',
    name: 'Bob',
    personality: {
      openness: 75,
      conscientiousness: 85,
      extraversion: 50,
      agreeableness: 70,
      neuroticism: 40,
    },
    values: {
      reliability: 95,
      expertise: 90,
      pragmatism: 85,
    },
    communicationStyle: {
      vocabulary: ['practical', 'efficient', 'analyze', 'implement'],
      toneDescriptors: ['professional', 'thoughtful', 'direct'],
      topics: ['engineering', 'systems', 'architecture'],
      avoids: ['overpromising', 'hype'],
      averageMessageLength: 20,
    },
    goals: [
      {
        id: 'goal-3',
        description: 'Work on interesting technical challenges',
        priority: 8,
        type: 'LONG_TERM',
      },
    ],
  };

  const location: Location = {
    id: 'downtown-cafe',
    name: 'Downtown Cafe',
    type: 'COMMERCIAL',
    atmosphere: 'Relaxed, creative vibe with soft jazz playing',
    district: 'DOWNTOWN',
  };

  try {
    // Start conversation
    console.log('Alice initiates conversation with Bob...\n');
    const interaction = await conversationManager.startConversation(
      aliceIdentity.agentId,
      bobIdentity.agentId,
      {
        location: location.id,
        openingMessage: undefined, // Will generate with AI
      }
    );

    // Accept conversation
    await conversationManager.acceptConversation(
      interaction.id,
      bobIdentity.agentId
    );

    // Simulate a 5-turn conversation with AI-generated responses
    const turns = 5;

    for (let i = 0; i < turns; i++) {
      // Alice's turn
      if (i === 0) {
        // Alice opens
        const aliceContext: ConversationContext = {
          interaction,
          messages: [],
          agentIdentity: aliceIdentity,
          relationshipContext: {
            targetAgentId: bobIdentity.agentId,
            sentiment: 0,
            trust: 0,
            interactionCount: 0,
            sharedHistory: 'First meeting',
          },
          location,
          relevantMemories: [],
        };

        const aliceMessage = await aiOrchestrator.generateConversationMessage(
          aliceContext
        );

        await conversationManager.addMessage(interaction, {
          from: aliceIdentity.agentId,
          content: aliceMessage,
        });

        console.log(`Alice: ${aliceMessage.text}`);
        console.log(`  [Tone: ${aliceMessage.tone}]\n`);
      }

      // Bob's turn
      const thread = await conversationManager.getThread(
        interaction.threadId
      );
      const bobContext: ConversationContext = {
        interaction,
        messages: thread,
        agentIdentity: bobIdentity,
        relationshipContext: {
          targetAgentId: aliceIdentity.agentId,
          sentiment: 10 * (i + 1), // Sentiment improving
          trust: 5 * (i + 1),
          interactionCount: 1,
          lastInteraction: new Date(),
          sharedHistory: 'Met at downtown cafe, discussing collaboration',
          memorableExperiences: [],
        },
        location,
        relevantMemories: [],
      };

      const bobMessage = await aiOrchestrator.generateConversationMessage(
        bobContext
      );

      await conversationManager.addMessage(interaction, {
        from: bobIdentity.agentId,
        content: bobMessage,
      });

      console.log(`Bob: ${bobMessage.text}`);
      console.log(`  [Tone: ${bobMessage.tone}]\n`);

      // Alice's subsequent responses
      if (i < turns - 1) {
        const threadUpdated = await conversationManager.getThread(
          interaction.threadId
        );
        const aliceContextUpdated: ConversationContext = {
          interaction,
          messages: threadUpdated,
          agentIdentity: aliceIdentity,
          relationshipContext: {
            targetAgentId: bobIdentity.agentId,
            sentiment: 15 * (i + 1),
            trust: 8 * (i + 1),
            interactionCount: 1,
            lastInteraction: new Date(),
            sharedHistory: 'Discussing potential collaboration on marketplace',
            memorableExperiences: [],
          },
          location,
          relevantMemories: [],
        };

        const aliceNextMessage =
          await aiOrchestrator.generateConversationMessage(
            aliceContextUpdated
          );

        await conversationManager.addMessage(interaction, {
          from: aliceIdentity.agentId,
          content: aliceNextMessage,
        });

        console.log(`Alice: ${aliceNextMessage.text}`);
        console.log(`  [Tone: ${aliceNextMessage.tone}]\n`);
      }
    }

    // Complete conversation
    await conversationManager.endConversation(
      interaction.id,
      aliceIdentity.agentId,
      'COMPLETE'
    );

    console.log('✓ Conversation completed successfully');
    console.log(`  Total messages: ${interaction.messageCount}`);

    await layer.shutdown();
  } catch (error) {
    console.error('Error:', error);
    await layer.shutdown();
  }
}

// Run the example
if (require.main === module) {
  aiPoweredConversationExample().catch(console.error);
}
