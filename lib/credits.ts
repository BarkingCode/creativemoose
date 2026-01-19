/**
 * Credit Service
 *
 * Provides credit management operations using Supabase.
 * - Get user credits
 * - Decrement credits (atomic operation)
 * - Add credits (after purchase)
 * - All operations use Row Level Security
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { Credits } from "@/lib/supabase/types";

export interface UserCredits {
  image_credits: number;
  free_credits: number;
  total_generations: number;
  last_generation_at: string | null;
  last_preset: string | null;
  last_style: string | null;
}

/**
 * Get user credits from Supabase
 */
export async function getCredits(userId: string): Promise<UserCredits | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("credits")
    .select("image_credits, free_credits, total_generations, last_generation_at, last_preset, last_style")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching credits:", error);
    return null;
  }

  const creditData = data as Credits;

  return {
    image_credits: creditData.image_credits,
    free_credits: creditData.free_credits,
    total_generations: creditData.total_generations,
    last_generation_at: creditData.last_generation_at,
    last_preset: creditData.last_preset,
    last_style: creditData.last_style,
  };
}

/**
 * Get total available credits (free + paid)
 */
export async function getTotalCredits(userId: string): Promise<number> {
  const credits = await getCredits(userId);
  if (!credits) return 0;
  return credits.free_credits + credits.image_credits;
}

/**
 * Decrement credits atomically using Supabase RPC function
 * Prioritizes free credits over paid credits
 */
export async function decrementCredit(
  userId: string,
  preset?: string,
  style?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("decrement_credits", {
    p_user_id: userId,
    p_preset: preset || null,
    p_style: style || null,
  });

  if (error) {
    console.error("Error decrementing credits:", error);
    return { success: false, error: error.message };
  }

  // The RPC function returns true if successful, false if insufficient credits
  if (data === false) {
    return { success: false, error: "Insufficient credits" };
  }

  return { success: true };
}

/**
 * Add credits to user account (after purchase)
 * Uses admin client to bypass RLS for webhook operations
 */
export async function addCredits(
  userId: string,
  amount: number,
  source?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("add_credits", {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    console.error("Error adding credits:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Create initial credits record for new user
 * Called after user signs up
 */
export async function createInitialCredits(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("credits").insert({
    user_id: userId,
    image_credits: 0,
    free_credits: 1, // 1 free generation for new users
    total_generations: 0,
  });

  if (error) {
    // Ignore duplicate key errors (user already has credits)
    if (error.code === "23505") {
      return { success: true };
    }
    console.error("Error creating initial credits:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Record a generation in the generations table
 */
export async function recordGeneration(
  userId: string,
  presetId: string,
  styleId: string | null,
  imageUrls: string[],
  inputImageUrl: string | null,
  isFreeGeneration: boolean
): Promise<{ success: boolean; generationId?: string; error?: string }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      preset_id: presetId,
      style_id: styleId,
      image_urls: imageUrls,
      input_image_url: inputImageUrl,
      is_free_generation: isFreeGeneration,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error recording generation:", error);
    return { success: false, error: error.message };
  }

  return { success: true, generationId: data.id };
}

/**
 * Record a purchase in the purchases table
 * Used by RevenueCat webhook
 */
export async function recordPurchase(
  userId: string,
  productId: string,
  transactionId: string,
  originalTransactionId: string | null,
  creditsAdded: number,
  amountPaid: number,
  currency: string,
  platform: "ios" | "android" | "web"
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Check if transaction already exists (idempotency)
  const { data: existing } = await supabase
    .from("purchases")
    .select("id")
    .eq("rc_transaction_id", transactionId)
    .single();

  if (existing) {
    // Transaction already processed
    return { success: true };
  }

  const { error } = await supabase.from("purchases").insert({
    user_id: userId,
    rc_product_id: productId,
    rc_transaction_id: transactionId,
    rc_original_transaction_id: originalTransactionId,
    credits_added: creditsAdded,
    amount_paid: amountPaid,
    currency: currency,
    platform: platform,
  });

  if (error) {
    console.error("Error recording purchase:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get user by email (for webhook lookups)
 */
export async function getUserByEmail(
  email: string
): Promise<{ userId: string } | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (error || !data) {
    return null;
  }

  return { userId: data.id };
}
