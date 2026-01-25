# RevenueCat Webhook Setup Guide

This document explains how to set up RevenueCat webhooks for the PhotoApp mobile application to ensure reliable credit synchronization.

## Overview

PhotoApp uses a dual credit sync mechanism:

1. **Client-side sync (primary)**: When a user completes a purchase, the app immediately calls `add_credits` RPC to sync credits to Supabase.
2. **Webhook sync (backup)**: RevenueCat sends webhooks to a Supabase Edge Function as a fallback if client-side sync fails.

## Product ID to Credits Mapping

| Product ID | Credits |
|------------|---------|
| `photoapp_5_credits` | 5 |
| `photoapp_10_credits` | 10 |
| `photoapp_25_credits` | 25 |

## RevenueCat Dashboard Setup

### 1. Create Products in App Store Connect / Google Play Console

First, create consumable in-app purchases in your app stores:

**App Store Connect:**
- Product Type: Consumable
- Product IDs: `photoapp_5_credits`, `photoapp_10_credits`, `photoapp_25_credits`
- Set pricing and descriptions

**Google Play Console:**
- Product Type: Managed Product (consumable)
- Product IDs: Same as above

### 2. Configure RevenueCat

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Create/select your project
3. Add your apps (iOS and Android)
4. Under **Products**, add the product IDs above
5. Create an **Offering** with these products as packages

### 3. Get API Keys

Navigate to **Project Settings > API Keys**:
- Copy the **iOS API Key** → Set as `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
- Copy the **Android API Key** → Set as `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`

### 4. Configure Webhooks

Navigate to **Project Settings > Integrations > Webhooks**:

1. Click **+ Add Webhook**
2. Set the URL: `https://<YOUR_SUPABASE_PROJECT>.supabase.co/functions/v1/revenuecat-webhook`
3. Enable these events:
   - `INITIAL_PURCHASE`
   - `RENEWAL` (if you add subscriptions later)
   - `NON_RENEWING_PURCHASE`
4. Copy the **Authorization Header** value for the Edge Function

## Supabase Edge Function Setup

### 1. Create the Webhook Edge Function

Create `supabase/functions/revenuecat-webhook/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Product ID to credits mapping
const PRODUCT_CREDITS: Record<string, number> = {
  "photoapp_5_credits": 5,
  "photoapp_10_credits": 10,
  "photoapp_25_credits": 25,
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authorization header
    const authHeader = req.headers.get("Authorization");
    const expectedAuth = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");

    if (!expectedAuth || authHeader !== `Bearer ${expectedAuth}`) {
      console.error("Invalid authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { event } = body;

    // Only process purchase events
    if (!["INITIAL_PURCHASE", "NON_RENEWING_PURCHASE", "RENEWAL"].includes(event.type)) {
      return new Response(JSON.stringify({ message: "Event ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = event.app_user_id;
    const productId = event.product_id;
    const transactionId = event.transaction_id;
    const originalTransactionId = event.original_transaction_id;

    // Skip anonymous users (starts with $RCAnonymousID:)
    if (userId.startsWith("$RCAnonymousID:")) {
      console.warn("Skipping anonymous user purchase");
      return new Response(JSON.stringify({ message: "Anonymous user, skipping" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const creditsToAdd = PRODUCT_CREDITS[productId];
    if (!creditsToAdd) {
      console.error("Unknown product ID:", productId);
      return new Response(JSON.stringify({ error: "Unknown product" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase admin client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if this transaction was already processed (idempotency)
    const { data: existingPurchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("rc_transaction_id", transactionId)
      .single();

    if (existingPurchase) {
      console.log("Transaction already processed:", transactionId);
      return new Response(JSON.stringify({ message: "Already processed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add credits using RPC
    const { data: creditResult, error: creditError } = await supabase.rpc("add_credits", {
      p_user_id: userId,
      p_credits: creditsToAdd,
    });

    if (creditError || creditResult === false) {
      console.error("Failed to add credits:", creditError);
      return new Response(JSON.stringify({ error: "Failed to add credits" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record the purchase
    const { error: purchaseError } = await supabase
      .from("purchases")
      .insert({
        user_id: userId,
        rc_product_id: productId,
        rc_transaction_id: transactionId,
        rc_original_transaction_id: originalTransactionId,
        credits_added: creditsToAdd,
        platform: event.store === "APP_STORE" ? "ios" : "android",
      });

    if (purchaseError) {
      console.error("Failed to record purchase:", purchaseError);
      // Credits were added, so we still return success
      // The purchase record is for audit purposes
    }

    console.log("Webhook processed successfully:", { userId, productId, creditsToAdd });

    return new Response(JSON.stringify({ success: true, credits_added: creditsToAdd }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### 2. Deploy the Edge Function

```bash
supabase functions deploy revenuecat-webhook
```

### 3. Set Environment Variables

In Supabase Dashboard > Edge Functions > revenuecat-webhook > Settings:

| Variable | Value |
|----------|-------|
| `REVENUECAT_WEBHOOK_SECRET` | The authorization header value from RevenueCat |

## Environment Variables Summary

### Mobile App (`.env`)

```
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxx
```

### Supabase Edge Functions (Dashboard)

```
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret_from_revenuecat
```

## Testing

### Test Client-Side Sync

1. Run the app in development mode
2. Make a purchase using a sandbox account
3. Check the Supabase `credits` table for updated balance

### Test Webhook

1. In RevenueCat Dashboard, go to **Webhooks**
2. Click **Send Test Event**
3. Select `INITIAL_PURCHASE` and fill test data
4. Check Supabase Edge Function logs for the event
5. Verify `purchases` table has the record

## Troubleshooting

### Credits not appearing after purchase

1. Check RevenueCat Dashboard > Events for the purchase event
2. Check Supabase Edge Function logs for webhook delivery
3. Verify the `app_user_id` matches the Supabase `user.id`
4. Ensure the `credits` row exists for the user

### Webhook not receiving events

1. Verify the webhook URL is correct
2. Check the authorization header matches
3. Ensure the Edge Function is deployed
4. Check RevenueCat webhook delivery status

### Duplicate credits

The webhook uses `rc_transaction_id` for idempotency. If duplicates occur:
1. Check if the transaction ID is being set correctly
2. Verify the `purchases` table unique constraint on `rc_transaction_id`

## Credit Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Makes Purchase                          │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────────┐
│   Client-Side Sync      │     │     RevenueCat Webhook          │
│   (Immediate)           │     │     (Backup, ~seconds delay)    │
│                         │     │                                 │
│ 1. Purchase completes   │     │ 1. RevenueCat sends event       │
│ 2. Call add_credits RPC │     │ 2. Edge Function receives       │
│ 3. Update UI            │     │ 3. Check idempotency            │
│                         │     │ 4. Add credits if not processed │
└─────────────────────────┘     └─────────────────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │    Supabase Database    │
                 │  - credits table        │
                 │  - purchases table      │
                 └─────────────────────────┘
```

## Security Considerations

1. **Webhook Authorization**: Always verify the authorization header before processing
2. **Idempotency**: Use transaction IDs to prevent duplicate credit additions
3. **Service Role Key**: The webhook uses service role for admin access - keep this secret
4. **User Verification**: Only process purchases for valid Supabase user IDs
