/**
 * RevenueCat Webhook Edge Function
 *
 * Receives webhook events from RevenueCat and syncs credits to Supabase.
 * This serves as a backup to the client-side credit sync, ensuring credits
 * are always delivered even if the app crashes after payment.
 *
 * Handles:
 * - INITIAL_PURCHASE: First-time purchase of a product
 * - NON_RENEWING_PURCHASE: Consumable purchase (our credit packs)
 *
 * Security:
 * - Validates webhook bearer token from RevenueCat
 * - Uses rc_transaction_id for idempotency (prevents duplicate credits)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Product ID to credits mapping - must match mobile app
const PRODUCT_CREDITS: Record<string, number> = {
  "five_token_ios": 5,
  "ten_token_ios": 10,
  "twentyfive_token_ios": 25,
  // Android products (for future)
  "five_token_android": 5,
  "ten_token_android": 10,
  "twentyfive_token_android": 25,
};

// RevenueCat webhook event types we care about
const PURCHASE_EVENTS = [
  "INITIAL_PURCHASE",
  "NON_RENEWING_PURCHASE",
  "PRODUCT_CHANGE",
];

interface RevenueCatEvent {
  event: {
    type: string;
    app_user_id: string;
    product_id: string;
    transaction_id: string;
    original_transaction_id: string;
    price: number;
    currency: string;
    store: string;
    environment: string;
  };
  api_version: string;
}

serve(async (req: Request) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Validate webhook authorization
    const authHeader = req.headers.get("authorization");
    const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");

    if (!webhookSecret) {
      console.error("[Webhook] REVENUECAT_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // RevenueCat sends: Authorization: Bearer <your_webhook_secret>
    if (!authHeader || authHeader !== `Bearer ${webhookSecret}`) {
      console.warn("[Webhook] Invalid authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse webhook payload
    const payload: RevenueCatEvent = await req.json();
    const event = payload.event;

    console.log("[Webhook] Received event:", {
      type: event.type,
      product_id: event.product_id,
      app_user_id: event.app_user_id,
      environment: event.environment,
    });

    // Ignore events we don't care about
    if (!PURCHASE_EVENTS.includes(event.type)) {
      console.log("[Webhook] Ignoring event type:", event.type);
      return new Response(JSON.stringify({ success: true, ignored: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Ignore sandbox events in production (optional - remove if you want to test)
    // if (event.environment === "SANDBOX") {
    //   console.log("[Webhook] Ignoring sandbox event");
    //   return new Response(JSON.stringify({ success: true, sandbox: true }), {
    //     status: 200,
    //     headers: { "Content-Type": "application/json" },
    //   });
    // }

    // Map product ID to credits
    const credits = PRODUCT_CREDITS[event.product_id];
    if (!credits) {
      console.warn("[Webhook] Unknown product ID:", event.product_id);
      return new Response(
        JSON.stringify({ error: "Unknown product", product_id: event.product_id }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // app_user_id is the Supabase user ID (we set this when calling Purchases.logIn)
    const userId = event.app_user_id;

    // Skip anonymous users (shouldn't happen, but safety check)
    if (userId.startsWith("$RCAnonymousID:")) {
      console.warn("[Webhook] Received event for anonymous user");
      return new Response(
        JSON.stringify({ error: "Anonymous user", skipped: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase service client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if this transaction was already processed (idempotency)
    const { data: existingPurchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("rc_transaction_id", event.transaction_id)
      .single();

    if (existingPurchase) {
      console.log("[Webhook] Transaction already processed:", event.transaction_id);
      return new Response(
        JSON.stringify({ success: true, already_processed: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Record the purchase first (for idempotency)
    const { error: purchaseError } = await supabase.from("purchases").insert({
      user_id: userId,
      rc_product_id: event.product_id,
      rc_transaction_id: event.transaction_id,
      rc_original_transaction_id: event.original_transaction_id,
      credits_added: credits,
      amount_paid: event.price,
      currency: event.currency,
      platform: event.store === "APP_STORE" ? "ios" : "android",
    });

    if (purchaseError) {
      // If it's a unique constraint violation, another request already processed it
      if (purchaseError.code === "23505") {
        console.log("[Webhook] Transaction already processed (race condition):", event.transaction_id);
        return new Response(
          JSON.stringify({ success: true, already_processed: true }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      console.error("[Webhook] Failed to record purchase:", purchaseError);
      throw purchaseError;
    }

    // Add credits to user's account
    const { data: addResult, error: creditsError } = await supabase.rpc("add_credits", {
      p_user_id: userId,
      p_credits: credits,
    });

    if (creditsError) {
      console.error("[Webhook] Failed to add credits:", creditsError);
      // Don't throw - purchase is recorded, credits can be added manually if needed
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to add credits",
          purchase_recorded: true,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("[Webhook] Successfully processed purchase:", {
      user_id: userId,
      product_id: event.product_id,
      credits_added: credits,
      transaction_id: event.transaction_id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        credits_added: credits,
        user_id: userId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Webhook] Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
