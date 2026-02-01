/**
 * Debug webhook flow by monitoring Stripe events in real-time
 */
import Stripe from 'stripe';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

async function monitorEvents() {
  console.log('🔍 Monitoring Stripe events...\n');
  console.log('📋 Instructions:');
  console.log('1. Keep this terminal open');
  console.log('2. In your browser, go to http://localhost:3000');
  console.log('3. Log in with Clerk');
  console.log('4. Click to purchase credits');
  console.log('5. Complete the Stripe checkout');
  console.log('6. Watch this terminal for the event\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let lastEventTime = Math.floor(Date.now() / 1000);

  // Poll for new events every 2 seconds
  setInterval(async () => {
    try {
      const events = await stripe.events.list({
        created: { gte: lastEventTime },
        limit: 10,
      });

      for (const event of events.data) {
        if (event.created > lastEventTime) {
          console.log(`\n🔔 New Event: ${event.type}`);
          console.log(`   Event ID: ${event.id}`);
          console.log(`   Created: ${new Date(event.created * 1000).toLocaleTimeString()}`);

          if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            console.log(`   ✅ CHECKOUT COMPLETED!`);
            console.log(`   Session ID: ${session.id}`);
            console.log(`   Customer ID: ${session.customer || '❌ NULL (This is the problem!)'}`);
            console.log(`   Metadata: ${JSON.stringify(session.metadata)}`);
            console.log(`   Payment Status: ${session.payment_status}`);

            if (!session.customer) {
              console.log(`\n   ⚠️  WARNING: No customer ID in session!`);
              console.log(`   This session was NOT created by your app.`);
              console.log(`   Your webhook will reject this event.`);
            } else {
              console.log(`\n   ✅ Customer ID found! Webhook should process this.`);

              // Check if webhook processed it
              setTimeout(async () => {
                const customer = await stripe.customers.retrieve(session.customer as string) as Stripe.Customer;
                console.log(`\n   📊 Customer Credits After Webhook:`);
                console.log(`      Image Credits: ${customer.metadata.image_credits || '0'}`);
                console.log(`      Video Credits: ${customer.metadata.video_credits || '0'}`);
                console.log(`      Last Event ID: ${customer.metadata.last_event_id || 'none'}`);
              }, 3000);
            }
          }

          lastEventTime = event.created;
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }, 2000);
}

console.log('Starting event monitor...\n');
monitorEvents();
