/**
 * Stripe utility functions for credit management via Customer Metadata.
 * All credit tracking happens in Stripe metadata - no database needed.
 */

import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

export interface CreditMetadata {
  free_credits: number;
  image_credits: number;
  video_credits: number;
  video_free_credits: number;
  total_gens: number;
  total_video_gens: number;
  last_gen_at?: string;
  last_preset?: string;
  last_video_gen_at?: string;
  last_video_preset?: string;
  last_event_id?: string;
  last_bytes?: string;
  last_hash?: string;
}

// Simple in-memory mutex per customer
const customerLocks = new Map<string, Promise<void>>();

async function withLock<T>(
  customerId: string,
  fn: () => Promise<T>
): Promise<T> {
  while (customerLocks.has(customerId)) {
    await customerLocks.get(customerId);
  }

  let resolve: () => void;
  const lock = new Promise<void>((r) => (resolve = r));
  customerLocks.set(customerId, lock);

  try {
    return await fn();
  } finally {
    customerLocks.delete(customerId);
    resolve!();
  }
}

export async function getOrCreateStripeCustomer(
  email: string
): Promise<Stripe.Customer> {
  // Search for existing customer
  const existing = await stripe.customers.list({ email, limit: 1 });

  if (existing.data.length > 0) {
    return existing.data[0];
  }

  // Create new customer with 1 image free credit and 2 video free credits
  return await stripe.customers.create({
    email,
    metadata: {
      free_credits: "1",
      image_credits: "0",
      video_credits: "0",
      video_free_credits: "2",
      total_gens: "0",
      total_video_gens: "0",
    },
  });
}

export async function getCustomerCredits(
  customerId: string
): Promise<CreditMetadata> {
  const customer = await stripe.customers.retrieve(customerId);

  if (customer.deleted) {
    throw new Error("Customer has been deleted");
  }

  const free_credits = parseInt(customer.metadata.free_credits || "0");
  const image_credits = parseInt(customer.metadata.image_credits || "0");
  const video_credits = parseInt(customer.metadata.video_credits || "0");
  const video_free_credits = parseInt(customer.metadata.video_free_credits || "0");
  const total_gens = parseInt(customer.metadata.total_gens || "0");
  const total_video_gens = parseInt(customer.metadata.total_video_gens || "0");

  return {
    free_credits,
    image_credits,
    video_credits,
    video_free_credits,
    total_gens,
    total_video_gens,
    last_gen_at: customer.metadata.last_gen_at,
    last_preset: customer.metadata.last_preset,
    last_video_gen_at: customer.metadata.last_video_gen_at,
    last_video_preset: customer.metadata.last_video_preset,
    last_event_id: customer.metadata.last_event_id,
    last_bytes: customer.metadata.last_bytes,
    last_hash: customer.metadata.last_hash,
  };
}

export async function incrementCredits(
  customerId: string,
  amount: number,
  eventId: string,
  creditType: 'image' | 'video' = 'image'
): Promise<void> {
  await withLock(customerId, async () => {
    const current = await getCustomerCredits(customerId);

    const newImageCredits = creditType === 'image'
      ? current.image_credits + amount
      : current.image_credits;
    const newVideoCredits = creditType === 'video'
      ? current.video_credits + amount
      : current.video_credits;

    await stripe.customers.update(customerId, {
      metadata: {
        free_credits: current.free_credits.toString(),
        image_credits: newImageCredits.toString(),
        video_credits: newVideoCredits.toString(),
        video_free_credits: current.video_free_credits.toString(),
        total_gens: current.total_gens.toString(),
        total_video_gens: current.total_video_gens.toString(),
        last_event_id: eventId,
      },
    });
  });
}

export async function decrementCredit(
  customerId: string,
  presetId: string,
  hashSignature: string,
  approxBytes: number
): Promise<boolean> {
  return await withLock(customerId, async () => {
    // Re-read to ensure atomicity
    const current = await getCustomerCredits(customerId);

    console.log("Credit check:", {
      customerId,
      freeCredits: current.free_credits,
      imageCredits: current.image_credits,
      totalGens: current.total_gens,
    });

    // Check if user has any credits (prioritize free credits)
    const hasFreeCredits = current.free_credits > 0;
    const hasImageCredits = current.image_credits > 0;

    if (!hasFreeCredits && !hasImageCredits) {
      console.log("Insufficient credits");
      return false;
    }

    // Decrement credits (prioritize free credits)
    let newFreeCredits = current.free_credits;
    let newImageCredits = current.image_credits;

    if (hasFreeCredits) {
      newFreeCredits -= 1;
    } else {
      newImageCredits -= 1;
    }

    const newTotalGens = current.total_gens + 1;

    console.log("Updating credits:", {
      newFreeCredits,
      newImageCredits,
      newTotalGens,
      usedFreeCredit: hasFreeCredits,
    });

    await stripe.customers.update(customerId, {
      metadata: {
        free_credits: newFreeCredits.toString(),
        image_credits: newImageCredits.toString(),
        video_credits: current.video_credits.toString(),
        video_free_credits: current.video_free_credits.toString(),
        total_gens: newTotalGens.toString(),
        total_video_gens: current.total_video_gens.toString(),
        last_gen_at: new Date().toISOString(),
        last_preset: presetId,
        last_bytes: approxBytes.toString(),
        last_hash: hashSignature,
      },
    });

    return true;
  });
}

export async function decrementVideoCredit(
  customerId: string,
  presetId: string,
  hashSignature: string,
  approxBytes: number
): Promise<boolean> {
  return await withLock(customerId, async () => {
    // Re-read to ensure atomicity
    const current = await getCustomerCredits(customerId);

    console.log("Video credit check:", {
      customerId,
      videoFreeCredits: current.video_free_credits,
      videoCredits: current.video_credits,
      totalVideoGens: current.total_video_gens,
    });

    // Check if user has any video credits (prioritize free credits)
    const hasVideoFreeCredits = current.video_free_credits > 0;
    const hasVideoCredits = current.video_credits > 0;

    if (!hasVideoFreeCredits && !hasVideoCredits) {
      console.log("Insufficient video credits");
      return false;
    }

    // Decrement credits (prioritize video free credits)
    let newVideoFreeCredits = current.video_free_credits;
    let newVideoCredits = current.video_credits;

    if (hasVideoFreeCredits) {
      newVideoFreeCredits -= 1;
    } else {
      newVideoCredits -= 1;
    }

    const newTotalVideoGens = current.total_video_gens + 1;

    console.log("Updating video credits:", {
      newVideoFreeCredits,
      newVideoCredits,
      newTotalVideoGens,
      usedVideoFreeCredit: hasVideoFreeCredits,
    });

    await stripe.customers.update(customerId, {
      metadata: {
        free_credits: current.free_credits.toString(),
        image_credits: current.image_credits.toString(),
        video_credits: newVideoCredits.toString(),
        video_free_credits: newVideoFreeCredits.toString(),
        total_gens: current.total_gens.toString(),
        total_video_gens: newTotalVideoGens.toString(),
        last_video_gen_at: new Date().toISOString(),
        last_video_preset: presetId,
        last_bytes: approxBytes.toString(),
        last_hash: hashSignature,
      },
    });

    return true;
  });
}
