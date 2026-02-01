/**
 * Test webhook by creating a checkout session with proper customer data
 */
import Stripe from 'stripe';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

async function testWebhook() {
  try {
    console.log('Creating test customer...');
    const customer = await stripe.customers.create({
      email: 'test@example.com',
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

    console.log('\nCreating checkout session...');
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
    console.log('Checkout URL:', session.url);

    console.log('\n📝 Next steps:');
    console.log('1. Open the checkout URL in your browser');
    console.log('2. Use test card: 4242 4242 4242 4242');
    console.log('3. Any future date, any CVC, any ZIP');
    console.log('4. Complete the payment');
    console.log('5. Check your stripe listen terminal for the webhook event');
    console.log('6. Check your dev server logs for webhook processing');

    console.log('\nCheckout URL:', session.url);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testWebhook();
