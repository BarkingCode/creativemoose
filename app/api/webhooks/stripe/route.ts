/**
 * Stripe Webhook Handler
 *
 * Handles Stripe checkout events to add credits to users.
 * Events handled:
 * - checkout.session.completed: Add credits after successful payment
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { addCredits, recordPurchase } from "@/lib/credits";
import { createAdminClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

// Price ID to credits mapping
const PRICE_CREDITS: Record<string, number> = {
  // Image credits
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_IMAGE_SM || ""]: 5,
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_IMAGE_MD || ""]: 10,
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_IMAGE_LG || ""]: 25,
  // Legacy price IDs
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_GEN_1 || ""]: 1,
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_GEN_5 || ""]: 5,
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_GEN_10 || ""]: 10,
};

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error("Missing Stripe signature");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    console.log("Stripe webhook received:", event.type);

    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Get user ID from session metadata
      const userId = session.metadata?.supabase_user_id;
      const priceId = session.metadata?.price_id;

      if (!userId) {
        console.error("No user ID in session metadata");
        return NextResponse.json(
          { error: "No user ID" },
          { status: 400 }
        );
      }

      // Get credits amount for this price
      const creditsToAdd = priceId ? PRICE_CREDITS[priceId] : 0;

      if (!creditsToAdd) {
        // Try to get from line items
        const lineItems = await stripe.checkout.sessions.listLineItems(
          session.id
        );
        const firstItem = lineItems.data[0];
        const foundPriceId = firstItem?.price?.id;

        if (foundPriceId && PRICE_CREDITS[foundPriceId]) {
          const credits = PRICE_CREDITS[foundPriceId];
          await processCredits(
            userId,
            credits,
            session.id,
            session.amount_total || 0,
            session.currency || "usd"
          );
        } else {
          console.error("Unknown price ID:", foundPriceId);
          return NextResponse.json(
            { error: "Unknown price ID" },
            { status: 400 }
          );
        }
      } else {
        await processCredits(
          userId,
          creditsToAdd,
          session.id,
          session.amount_total || 0,
          session.currency || "usd"
        );
      }

      return NextResponse.json({ received: true, processed: true });
    }

    // For other events, just acknowledge
    return NextResponse.json({ received: true, processed: false });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function processCredits(
  userId: string,
  credits: number,
  sessionId: string,
  amountTotal: number,
  currency: string
) {
  // Verify user exists
  const supabase = createAdminClient();
  const { data: userProfile, error: userError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();

  if (userError || !userProfile) {
    console.error("User not found in Supabase:", userId);
    throw new Error("User not found");
  }

  // Record the purchase (idempotent check)
  const purchaseResult = await recordPurchase(
    userId,
    "stripe_web",
    sessionId,
    null,
    credits,
    amountTotal / 100, // Convert cents to dollars
    currency,
    "web"
  );

  if (!purchaseResult.success) {
    console.error("Failed to record purchase:", purchaseResult.error);
    // If it's a duplicate, that's fine - we already processed this
    if (!purchaseResult.error?.includes("duplicate")) {
      throw new Error(purchaseResult.error);
    }
    return;
  }

  // Add credits
  const creditResult = await addCredits(userId, credits, "stripe");

  if (!creditResult.success) {
    console.error("Failed to add credits:", creditResult.error);
    throw new Error(creditResult.error);
  }

  console.log("Successfully processed Stripe purchase:", {
    userId,
    credits,
    sessionId,
  });
}

// Handle GET for webhook verification
export async function GET() {
  return NextResponse.json({ status: "Stripe webhook endpoint ready" });
}
