/**
 * Credit management utilities for Supabase Edge Functions
 *
 * Handles credit checking, atomic decrementation, and generation tracking.
 * Both mobile (parallel) and web (serial) flows use `generations` table
 * as the single source of truth for all generation records.
 */

import { createServiceClient } from "./auth.ts";

export interface CreditResult {
  success: boolean;
  isFree: boolean;
  remainingFree: number;
  remainingPaid: number;
}

export async function decrementCredits(
  userId: string,
  preset: string,
  style: string
): Promise<CreditResult> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("decrement_credits", {
    p_user_id: userId,
    p_preset: preset,
    p_style: style,
  });

  if (error) {
    console.error("Error decrementing credits:", error);
    return { success: false, isFree: false, remainingFree: 0, remainingPaid: 0 };
  }

  // RPC returns an array with one row
  const result = data?.[0];
  if (!result) {
    return { success: false, isFree: false, remainingFree: 0, remainingPaid: 0 };
  }

  return {
    success: result.success,
    isFree: result.is_free,
    remainingFree: result.remaining_free,
    remainingPaid: result.remaining_paid,
  };
}

/**
 * Record a completed generation (used by serial flow)
 * For parallel flow, use reserveGenerationSession + updateGenerationImages
 */
export async function recordGeneration(
  userId: string,
  presetId: string,
  styleId: string,
  imageUrls: string[],
  inputImageUrl: string | null,
  isFreeGeneration: boolean
): Promise<string | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      preset_id: presetId,
      style_id: styleId,
      image_urls: imageUrls,
      input_image_url: inputImageUrl,
      is_free_generation: isFreeGeneration,
      status: "completed",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error recording generation:", error);
    return null;
  }

  return data?.id || null;
}

/**
 * Update generation with image URLs (used by parallel flow)
 */
export async function updateGenerationImages(
  generationId: string,
  imageUrl: string,
  allComplete: boolean
): Promise<boolean> {
  const supabase = createServiceClient();

  // Append image URL to the array
  const { error } = await supabase.rpc("append_generation_image", {
    p_generation_id: generationId,
    p_image_url: imageUrl,
    p_mark_complete: allComplete,
  });

  if (error) {
    // Fallback: try direct update if RPC doesn't exist yet
    console.warn("RPC append_generation_image not found, using fallback:", error);

    // Get current URLs
    const { data: gen } = await supabase
      .from("generations")
      .select("image_urls")
      .eq("id", generationId)
      .single();

    const currentUrls = gen?.image_urls || [];
    const newUrls = [...currentUrls, imageUrl];

    const { error: updateError } = await supabase
      .from("generations")
      .update({
        image_urls: newUrls,
        status: allComplete ? "completed" : "in_progress",
      })
      .eq("id", generationId);

    if (updateError) {
      console.error("Error updating generation images:", updateError);
      return false;
    }
  }

  return true;
}

// ============================================
// Session reservation for parallel generation
// ============================================

export interface ReserveSessionResult {
  success: boolean;
  sessionId?: string;
  generationId?: string; // Canonical generation record ID
  isFree?: boolean;
  remainingFree?: number;
  remainingPaid?: number;
  error?: string;
}

export interface GenerationSession {
  userId: string;
  presetId: string;
  styleId: string;
  imageUrl: string;
  isFree: boolean;
  imageCount: number;
  completedImages: number;
  createdAt: string;
  expiresAt: string;
  generationId: string; // Link to canonical generations record
}

/**
 * Reserve a credit and create a generation session
 *
 * Creates both:
 * 1. A `generations` record (canonical, permanent) with status='pending'
 * 2. A `generation_sessions` record (temporary, for session management)
 *
 * Returns sessionId for parallel generation calls and generationId for data integrity
 */
export async function reserveGenerationSession(
  userId: string,
  presetId: string,
  styleId: string,
  imageUrl: string,
  imageCount: number = 4
): Promise<ReserveSessionResult> {
  const supabase = createServiceClient();

  // First decrement credits
  const creditResult = await decrementCredits(userId, presetId, styleId);

  if (!creditResult.success) {
    return {
      success: false,
      remainingFree: creditResult.remainingFree,
      remainingPaid: creditResult.remainingPaid,
      error: "INSUFFICIENT_CREDITS",
    };
  }

  // Create canonical generations record (permanent)
  const { data: generation, error: genError } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      preset_id: presetId,
      style_id: styleId,
      image_urls: [], // Will be populated as images complete
      input_image_url: imageUrl,
      is_free_generation: creditResult.isFree,
      status: "pending",
    })
    .select("id")
    .single();

  if (genError || !generation) {
    console.error("Error creating generation record:", genError);
    return {
      success: false,
      error: "Failed to create generation record",
    };
  }

  // Create session record (temporary, for parallel generation tracking)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes expiry

  const { data: session, error: sessionError } = await supabase
    .from("generation_sessions")
    .insert({
      user_id: userId,
      preset_id: presetId,
      style_id: styleId,
      image_url: imageUrl,
      is_free: creditResult.isFree,
      image_count: imageCount,
      completed_images: 0,
      expires_at: expiresAt,
      generation_id: generation.id, // Link to canonical record
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    console.error("Error creating generation session:", sessionError);
    // Clean up the generation record since session failed
    await supabase.from("generations").delete().eq("id", generation.id);
    return {
      success: false,
      error: "Failed to create session",
    };
  }

  return {
    success: true,
    sessionId: session.id,
    generationId: generation.id,
    isFree: creditResult.isFree,
    remainingFree: creditResult.remainingFree,
    remainingPaid: creditResult.remainingPaid,
  };
}

/**
 * Validate a generation session and mark an image slot as used
 * Returns session details including generationId for proper data linking
 */
export async function validateAndUseSession(
  sessionId: string,
  userId: string,
  variationIndex: number
): Promise<{
  session: GenerationSession;
  variationPrompt: string;
  generationId: string;
  isLastImage: boolean;
} | null> {
  const supabase = createServiceClient();

  // Get the session
  const { data: session, error } = await supabase
    .from("generation_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (error || !session) {
    console.error("Session not found or invalid:", error);
    return null;
  }

  // Check if expired
  if (new Date(session.expires_at) < new Date()) {
    console.error("Session expired");
    return null;
  }

  // Check if already completed all images
  if (session.completed_images >= session.image_count) {
    console.error("Session already completed all images");
    return null;
  }

  // Check for generation_id (required for data integrity)
  if (!session.generation_id) {
    console.error("Session missing generation_id - data integrity issue");
    return null;
  }

  const newCompletedCount = session.completed_images + 1;
  const isLastImage = newCompletedCount >= session.image_count;

  // Increment completed images
  await supabase
    .from("generation_sessions")
    .update({ completed_images: newCompletedCount })
    .eq("id", sessionId);

  // Update generation status to in_progress if this is the first image
  if (session.completed_images === 0) {
    await supabase
      .from("generations")
      .update({ status: "in_progress" })
      .eq("id", session.generation_id);
  }

  // Variation prompts for lighting/atmosphere
  const variations = [
    "morning light, golden hour warmth",
    "soft afternoon glow, natural lighting",
    "sunset glow, warm amber tones",
    "bright midday, clear crisp light",
  ];

  const variationPrompt = variations[variationIndex % variations.length];

  return {
    session: {
      userId: session.user_id,
      presetId: session.preset_id,
      styleId: session.style_id,
      imageUrl: session.image_url,
      isFree: session.is_free,
      imageCount: session.image_count,
      completedImages: newCompletedCount,
      createdAt: session.created_at,
      expiresAt: session.expires_at,
      generationId: session.generation_id,
    },
    variationPrompt,
    generationId: session.generation_id,
    isLastImage,
  };
}
