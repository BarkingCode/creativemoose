#!/bin/bash

echo "🧪 Full Webhook Flow Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if dev server is running
echo "1️⃣ Checking Next.js dev server..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "   ✅ Dev server is running on port 3000"
else
    echo "   ❌ Dev server is NOT running!"
    echo "   Please start it with: npm run dev"
    exit 1
fi

# Check webhook endpoint
echo ""
echo "2️⃣ Checking webhook endpoint..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/webhooks/stripe \
    -H "Content-Type: application/json" \
    -H "stripe-signature: test" \
    -d '{"type":"test"}')

if [[ "$RESPONSE" == *"Invalid signature"* ]]; then
    echo "   ✅ Webhook endpoint is accessible"
else
    echo "   ❌ Webhook endpoint issue: $RESPONSE"
    exit 1
fi

# Check Stripe CLI
echo ""
echo "3️⃣ Checking Stripe CLI..."
if stripe --version > /dev/null 2>&1; then
    echo "   ✅ Stripe CLI is installed"
else
    echo "   ❌ Stripe CLI is not installed!"
    exit 1
fi

# Check webhook secret
echo ""
echo "4️⃣ Checking webhook secret..."
if grep -q "STRIPE_WEBHOOK_SECRET" .env.local; then
    echo "   ✅ Webhook secret is configured"
else
    echo "   ❌ STRIPE_WEBHOOK_SECRET not found in .env.local"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ All checks passed!"
echo ""
echo "📋 Next steps to test webhook:"
echo ""
echo "1. In a NEW terminal, run:"
echo "   stripe listen --forward-to localhost:3000/api/webhooks/stripe"
echo ""
echo "2. In ANOTHER terminal, run:"
echo "   npx tsx scripts/debug-webhook-flow.ts"
echo ""
echo "3. In your browser:"
echo "   - Go to http://localhost:3000"
echo "   - Log in with Clerk"
echo "   - Click 'Purchase Credits'"
echo "   - Complete checkout with card: 4242 4242 4242 4242"
echo ""
echo "4. Watch the terminals for webhook activity!"
echo ""
