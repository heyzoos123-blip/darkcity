/**
 * Example: Transaction Flow
 * Demonstrates creating offers, negotiating, and completing transactions
 */

import { InteractionLayer } from '../src/index';
import config from '../config.json';

async function transactionFlowExample() {
  const layer = new InteractionLayer(config);
  await layer.start();

  const services = layer.getServices();
  const { transactionService } = services;

  const seller = 'agent-seller';
  const buyer = 'agent-buyer';

  try {
    console.log('=== Transaction Flow Example ===\n');

    // Step 1: Create an offer
    console.log('Step 1: Seller creates offer...');
    const offer = await transactionService.createOffer('interaction-123', seller, {
      type: 'SELL',
      items: [
        {
          id: 'item-digital-art-1',
          type: 'NFT',
          quantity: 1,
          metadata: {
            title: 'Cyber Dreams #42',
            artist: 'agent-seller',
            edition: '1/1',
          },
        },
      ],
      price: {
        amount: 100,
        currency: 'DARKCOIN',
      },
      conditions: ['Immediate transfer', 'No refunds'],
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
    });
    console.log(`  Offer created: ${offer.id}`);
    console.log(`  Price: ${offer.price.amount} ${offer.price.currency}`);
    console.log(`  Items: ${offer.items.length}\n`);

    // Step 2: Buyer considers and counters
    console.log('Step 2: Buyer makes counter-offer...');
    const counterResult = await transactionService.respondToOffer(
      offer.id,
      buyer,
      {
        offerId: offer.id,
        action: 'COUNTER',
        counterOffer: {
          type: 'BUY',
          items: offer.items,
          price: {
            amount: 80,
            currency: 'DARKCOIN',
          },
          conditions: ['Immediate transfer', 'Inspection period: 24h'],
        },
        reason: 'Price is a bit high for this piece',
      }
    );
    console.log('  Counter-offer submitted\n');

    // Step 3: Seller accepts counter-offer
    console.log('Step 3: Seller accepts counter-offer...');
    const finalResult = await transactionService.respondToOffer(
      offer.id,
      seller,
      {
        offerId: offer.id,
        action: 'ACCEPT',
      }
    );
    console.log('  Transaction executed!');
    console.log(`  Transaction ID: ${finalResult.transaction?.id}`);
    console.log(`  Status: ${finalResult.transaction?.status}`);
    console.log(`  Buyer: ${finalResult.transaction?.buyer}`);
    console.log(`  Seller: ${finalResult.transaction?.seller}`);
    console.log(`  Amount: ${finalResult.transaction?.price.amount} ${finalResult.transaction?.price.currency}\n`);

    // Step 4: View transaction history
    console.log('Step 4: Viewing transaction history...');
    const buyerHistory = await transactionService.getTransactionHistory(
      buyer,
      10
    );
    const sellerHistory = await transactionService.getTransactionHistory(
      seller,
      10
    );

    console.log(`  Buyer has ${buyerHistory.length} transactions`);
    console.log(`  Seller has ${sellerHistory.length} transactions`);

    console.log('\n✓ Transaction flow completed successfully');

    await layer.shutdown();
  } catch (error) {
    console.error('Error:', error);
    await layer.shutdown();
  }
}

// Run the example
if (require.main === module) {
  transactionFlowExample().catch(console.error);
}
