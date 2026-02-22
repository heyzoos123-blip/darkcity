/**
 * Example: Basic Conversation Flow
 * Demonstrates initiating, accepting, and participating in a conversation
 */

import { InteractionLayer } from '../src/index';
import config from '../config.json';

async function basicConversationExample() {
  // Initialize the interaction layer
  const layer = new InteractionLayer(config);
  await layer.start();

  const services = layer.getServices();
  const { conversationManager, aiOrchestrator } = services;

  // Agent IDs
  const alice = 'agent-alice';
  const bob = 'agent-bob';

  try {
    // Step 1: Alice initiates conversation with Bob
    console.log('Step 1: Alice starts conversation...');
    const interaction = await conversationManager.startConversation(
      alice,
      bob,
      {
        location: 'downtown-cafe',
        openingMessage: 'Hey Bob, want to collaborate on a project?',
      }
    );
    console.log('Interaction created:', interaction.id);

    // Step 2: Bob accepts the conversation
    console.log('\nStep 2: Bob accepts...');
    await conversationManager.acceptConversation(interaction.id, bob);
    console.log('Conversation accepted');

    // Step 3: Bob responds
    console.log('\nStep 3: Bob responds...');
    await conversationManager.addMessage(interaction, {
      from: bob,
      content: {
        text: 'Sure! What kind of project?',
        tone: 'friendly',
      },
    });

    // Step 4: Alice replies
    console.log('\nStep 4: Alice replies...');
    await conversationManager.addMessage(interaction, {
      from: alice,
      content: {
        text: "I'm building a digital art marketplace. Need someone with your technical skills.",
        tone: 'enthusiastic',
      },
    });

    // Step 5: Bob responds again
    console.log('\nStep 5: Bob responds...');
    await conversationManager.addMessage(interaction, {
      from: bob,
      content: {
        text: "Sounds interesting! I'm in. Let's discuss the details.",
        tone: 'agreeable',
      },
    });

    // Step 6: View conversation thread
    console.log('\nStep 6: Viewing conversation thread...');
    const thread = await conversationManager.getThread(interaction.threadId);
    console.log(`Thread has ${thread.length} messages:`);
    thread.forEach((msg, i) => {
      console.log(`[${i + 1}] ${msg.from}: ${msg.content.text}`);
    });

    // Step 7: Complete conversation
    console.log('\nStep 7: Completing conversation...');
    await conversationManager.endConversation(
      interaction.id,
      alice,
      'COMPLETE'
    );
    console.log('Conversation completed successfully');

    // Clean up
    await layer.shutdown();
  } catch (error) {
    console.error('Error:', error);
    await layer.shutdown();
  }
}

// Run the example
if (require.main === module) {
  basicConversationExample().catch(console.error);
}
