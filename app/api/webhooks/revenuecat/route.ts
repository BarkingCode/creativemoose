/**
 * RevenueCat Webhook Handler
 *
 * Handles purchase events from RevenueCat:
 * - INITIAL_PURCHASE: New purchase - add credits
 * - RENEWAL: Subscription renewal (not used for consumables)
 * - CANCELLATION: Subscription cancelled (not used for consumables)
 * - PRODUCT_CHANGE: Subscription changed (not used for consumables)
 *
 * Consumable purchases (credits) only trigger INITIAL_PURCHASE events.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { addCredits, recordPurchase, getUserByEmail } from "@/lib/credits";
import { createAdminClient } from "@/lib/supabase/server";

// Product ID to credits mapping
const PRODUCT_CREDITS: Record<string, number> = {
  photoapp_5_credits: 5,
  photoapp_10_credits: 10,
  photoapp_25_credits: 25,
};

// RevenueCat event types we care about
type RevenueCatEventType =
  | "INITIAL_PURCHASE"
  | "RENEWAL"
  | "CANCELLATION"
  | "PRODUCT_CHANGE"
  | "NON_RENEWING_PURCHASE"
  | "EXPIRATION";

interface RevenueCatEvent {
  event: {
    type: RevenueCatEventType;
    app_user_id: string;
    product_id: string;
    price: number;
    currency: string;
    transaction_id: string;
    original_transaction_id: string;
    purchased_at_ms: number;
    store: "PLAY_STORE" | "APP_STORE" | "STRIPE";
    environment: "SANDBOX" | "PRODUCTION";
    subscriber_attributes?: {
      $email?: { value: string };
      [key: string]: { value: string } | undefined;
    };
  };
  api_version: string;
}

/**
 * Verify RevenueCat webhook signature
 */
function verifySignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    // In development, skip signature verification if no secret is configured
    if (process.env.NODE_ENV === "development") {
      console.warn("Skipping webhook signature verification in development");
      return true;
    }
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Map RevenueCat store to platform
 */
function mapStoreToPlatform(
  store: string
): "ios" | "android" | "web" {
  switch (store) {
    case "APP_STORE":
      return "ios";
    case "PLAY_STORE":
      return "android";
    case "STRIPE":
      return "web";
    default:
      return "web";
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("X-RevenueCat-Signature");
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

    // Verify webhook signature
    if (webhookSecret && !verifySignature(payload, signature, webhookSecret)) {
      console.error("Invalid RevenueCat webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const data: RevenueCatEvent = JSON.parse(payload);
    const { event } = data;

    console.log("RevenueCat webhook received:", {
      type: event.type,
      product_id: event.product_id,
      app_user_id: event.app_user_id,
      environment: event.environment,
    });

    // Only process initial purchases for consumables
    if (
      event.type !== "INITIAL_PURCHASE" &&
      event.type !== "NON_RENEWING_PURCHASE"
    ) {
      // Acknowledge but don't process other event types
      return NextResponse.json({ received: true, processed: false });
    }

    // Get credits amount for this product
    const creditsToAdd = PRODUCT_CREDITS[event.product_id];
    if (!creditsToAdd) {
      console.error("Unknown product ID:", event.product_id);
      return NextResponse.json(
        { error: "Unknown product ID" },
        { status: 400 }
      );
    }

    // The app_user_id should be the Supabase user ID (set during RevenueCat login)
    let userId = event.app_user_id;

    // If app_user_id looks like an anonymous ID, try to get user from email attribute
    if (userId.startsWith("$RCAnonymousID")) {
      const email = event.subscriber_attributes?.$email?.value;
      if (email) {
        const user = await getUserByEmail(email);
        if (user) {
          userId = user.userId;
        } else {
          console.error("Could not find user by email:", email);
          return NextResponse.json(
            { error: "User not found" },
            { status: 400 }
          );
        }
      } else {
        console.error("Anonymous user without email attribute");
        return NextResponse.json(
          { error: "Cannot identify user" },
          { status: 400 }
        );
      }
    }

    // Verify user exists in Supabase
    const supabase = createAdminClient();
    const { data: userProfile, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (userError || !userProfile) {
      console.error("User not found in Supabase:", userId);
      return NextResponse.json(
        { error: "User not found" },
        { status: 400 }
      );
    }

    // Record the purchase (idempotent - will skip if already exists)
    const purchaseResult = await recordPurchase(
      userId,
      event.product_id,
      event.transaction_id,
      event.original_transaction_id,
      creditsToAdd,
      event.price,
      event.currency,
      mapStoreToPlatform(event.store)
    );

    if (!purchaseResult.success) {
      // If it failed because it already exists, that's fine
      if (purchaseResult.error?.includes("duplicate")) {
        return NextResponse.json({ received: true, processed: true, note: "Already processed" });
      }
      throw new Error(purchaseResult.error);
    }

    // Add credits to user account
    const creditResult = await addCredits(userId, creditsToAdd, "revenuecat");

    if (!creditResult.success) {
      console.error("Failed to add credits:", creditResult.error);
      // Don't fail the webhook - purchase is recorded, credits can be added manually
      return NextResponse.json({
        received: true,
        processed: true,
        warning: "Purchase recorded but credits may need manual adjustment",
      });
    }

    console.log("Successfully processed purchase:", {
      userId,
      product: event.product_id,
      credits: creditsToAdd,
      transactionId: event.transaction_id,
    });

    return NextResponse.json({
      received: true,
      processed: true,
      creditsAdded: creditsToAdd,
    });
  } catch (error) {
    console.error("RevenueCat webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle GET for webhook verification
export async function GET() {
  return NextResponse.json({ status: "RevenueCat webhook endpoint ready" });
}
