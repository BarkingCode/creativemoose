#!/bin/bash

echo "🎯 Starting Stripe webhook listener..."
echo "📡 Forwarding to: http://localhost:3000/api/webhooks/stripe"
echo ""
echo "⚠️  Make sure your Next.js dev server is running on port 3000"
echo "⚠️  You should see webhook events below when purchases are completed"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

stripe listen --forward-to localhost:3000/api/webhooks/stripe --log-level debug
