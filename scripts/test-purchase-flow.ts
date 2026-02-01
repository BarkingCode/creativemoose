/**
 * Complete end-to-end test of purchase flow
 */
import Stripe from 'stripe';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

async function testPurchaseFlow() {
  try {
    console.log('🧪 Testing complete purchase flow...\n');

    // Step 1: Create customer with credits metadata
    console.log('1️⃣ Creating test customer...');
    const customer = await stripe.customers.create({
      email: `test-${Date.now()}@example.com`,
      metadata: {
        free_credits: '5',
        image_credits: '0',
        video_credits: '0',
        video_free_credits: '2',
        total_gens: '0',
        total_video_gens: '0',
      },
    });
    console.log('✅ Customer created:', customer.id);
    console.log('   Credits:', customer.metadata);

    // Step 2: Create a payment intent (simulating a purchase)
    console.log('\n2️⃣ Creating payment intent...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000, // $10.00
      currency: 'usd',
      customer: customer.id,
      payment_method_types: ['card'],
      metadata: {
        userId: 'test_user_123',
      },
    });
    console.log('✅ Payment intent created:', paymentIntent.id);

    // Step 3: Create checkout session with the customer
    console.log('\n3️⃣ Creating checkout session...');
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'payment',
      line_items: [
        {
          price: process.env.NEXT_PUBLIC_STRIPE_PRICE_IMAGE_SM!,
          quantity: 1,
        },
      ],
      success_url: 'http://localhost:3000?success=true',
      cancel_url: 'http://localhost:3000?canceled=true',
      metadata: {
        userId: 'test_user_123',
      },
    });
    console.log('✅ Checkout session created:', session.id);
    console.log('   Customer ID:', session.customer);

    // Step 4: Simulate completing the session by creating a test completed event
    console.log('\n4️⃣ Simulating checkout completion...');

    // In a real scenario, the customer would complete the checkout
    // For testing, we'll manually trigger the webhook by calling our endpoint
    const webhookPayload = {
      id: `evt_test_${Date.now()}`,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          ...session,
          payment_status: 'paid',
        },
      },
    };

    console.log('   Session customer:', session.customer);
    console.log('   Session metadata:', session.metadata);

    // Step 5: Check customer credits before
    console.log('\n5️⃣ Checking credits BEFORE webhook...');
    const customerBefore = await stripe.customers.retrieve(customer.id) as Stripe.Customer;
    console.log('   Image credits:', customerBefore.metadata.image_credits);
    console.log('   Video credits:', customerBefore.metadata.video_credits);

    console.log('\n✅ Test setup complete!');
    console.log('\n📋 Manual steps:');
    console.log('1. Open this URL in your browser:');
    console.log('   ', session.url);
    console.log('2. Complete the checkout with test card: 4242 4242 4242 4242');
    console.log('3. Watch your terminal running `stripe listen` for the webhook event');
    console.log('4. After completion, run this command to check credits:');
    console.log(`   stripe customers retrieve ${customer.id} | grep -A 10 metadata`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testPurchaseFlow();
