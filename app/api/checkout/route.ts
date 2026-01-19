/**
 * API route to create Stripe Checkout session for purchasing credits.
 * Uses Supabase auth and stores user ID for webhook processing.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { priceId } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    }

    // Validate price ID
    const validPriceIds = [
      process.env.NEXT_PUBLIC_STRIPE_PRICE_IMAGE_SM,
      process.env.NEXT_PUBLIC_STRIPE_PRICE_IMAGE_MD,
      process.env.NEXT_PUBLIC_STRIPE_PRICE_IMAGE_LG,
      process.env.NEXT_PUBLIC_STRIPE_PRICE_VIDEO_SM,
      process.env.NEXT_PUBLIC_STRIPE_PRICE_VIDEO_MD,
      process.env.NEXT_PUBLIC_STRIPE_PRICE_VIDEO_LG,
      // Legacy price IDs
      process.env.NEXT_PUBLIC_STRIPE_PRICE_GEN_1,
      process.env.NEXT_PUBLIC_STRIPE_PRICE_GEN_5,
      process.env.NEXT_PUBLIC_STRIPE_PRICE_GEN_10,
    ].filter(Boolean);

    if (!validPriceIds.includes(priceId)) {
      return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
    }

    // Get or create Stripe customer by email
    const email = user.email;
    if (!email) {
      return NextResponse.json(
        { error: "No email address found" },
        { status: 400 }
      );
    }

    // Search for existing Stripe customer
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    let customerId: string;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      // Create new Stripe customer
      const newCustomer = await stripe.customers.create({
        email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = newCustomer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/generate?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/generate?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        price_id: priceId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
