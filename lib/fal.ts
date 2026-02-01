/**
 * Image Generation Client - Supabase Edge Function Integration
 *
 * Calls the Supabase Edge Functions for image generation.
 * This ensures:
 * 1. API keys stay on the server (secure)
 * 2. Credits are properly managed
 * 3. Same AI model is used across web and mobile
 *
 * Usage:
 *   import { reserveCredit, generateSingleImage, generatePreview } from "@/lib/fal";
 */

import { Session } from "@supabase/supabase-js";
import type { PhotoStyleId } from "../shared/presets";

// Supabase URL from environment
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Debug: Log env vars at module load
console.log("[fal.ts] Module loaded");
console.log("[fal.ts] SUPABASE_URL:", SUPABASE_URL);
console.log("[fal.ts] Has ANON_KEY:", !!SUPABASE_ANON_KEY);

export interface GenerateInput {
  imageUrl: string; // Base64 data URL or HTTP URL
  presetId: string;
  styleId?: PhotoStyleId;
}

export interface FalImage {
  url: string;
  width?: number;
  height?: number;
  content_type?: string;
}

export interface GenerateResult {
  success: boolean;
  images: FalImage[];
  imageCount: number;
  isFreeGeneration?: boolean;
  remainingFree?: number;
  remainingPaid?: number;
  isPreview?: boolean;
  watermarkRequired?: boolean;
}

export interface GenerateError {
  error: string;
  code?: string;
  remainingFree?: number;
  remainingPaid?: number;
  retryAfter?: number;
}

/**
 * Generate a preview image (no auth required, rate limited)
 *
 * @param input - Image and preset configuration
 * @returns Generated preview image or throws error
 */
export async function generatePreview(
  input: GenerateInput
): Promise<GenerateResult> {
  console.log("[generatePreview] Starting...");
  console.log("[generatePreview] SUPABASE_URL:", SUPABASE_URL);
  console.log("[generatePreview] Has anon key:", !!SUPABASE_ANON_KEY);
  console.log("[generatePreview] Image size:", Math.round((input.imageUrl?.length || 0) / 1024), "KB");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase not configured");
  }

  const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/preview`;
  console.log("[generatePreview] Calling:", edgeFunctionUrl);

  try {
    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrl: input.imageUrl,
        presetId: input.presetId,
        styleId: input.styleId || "photorealistic",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle rate limit error
      if (response.status === 429 || data.code === "RATE_LIMITED") {
        throw new Error("RATE_LIMITED");
      }
      throw new Error(data.error || "Preview generation failed");
    }

    return {
      success: true,
      images: data.images || [],
      imageCount: data.imageCount || data.images?.length || 0,
      isPreview: true,
      watermarkRequired: data.watermarkRequired,
    };
  } catch (error: any) {
    console.error("[generatePreview] Error:", error);
    throw error;
  }
}

/**
 * Helper to convert base64 to a data URL
 */
export function base64ToDataUrl(base64: string, mimeType = "image/jpeg"): string {
  if (base64.startsWith("data:")) {
    return base64;
  }
  return `data:${mimeType};base64,${base64}`;
}

// ============================================
// Parallel Generation API (Progressive Loading)
// ============================================

export interface ReserveCreditResult {
  success: boolean;
  sessionId: string;
  isFreeGeneration?: boolean;
  remainingFree?: number;
  remainingPaid?: number;
}

export interface ReserveCreditError {
  error: string;
  code?: string;
  remainingFree?: number;
  remainingPaid?: number;
}

export interface GenerateSingleInput {
  sessionId: string;
  variationIndex: number; // 0-3
}

export interface GenerateSingleResult {
  success: boolean;
  variationIndex: number;
  imageUrl: string;
  imageId: string | null; // Database UUID for sharing/gallery features
}

/**
 * Reserve a credit for parallel image generation
 *
 * This creates a session that allows 4 parallel generate-single calls
 * while only consuming one credit. The session expires after 5 minutes.
 *
 * @param input - Image and preset configuration
 * @param session - Supabase session with access token
 * @returns Session ID for use in parallel generate-single calls
 */
export async function reserveCredit(
  input: GenerateInput,
  session: Session
): Promise<ReserveCreditResult> {
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL not configured");
  }

  if (!session?.access_token) {
    throw new Error("UNAUTHORIZED");
  }

  const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/reserve-credit`;

  // Debug: Log what we're sending
  console.log("[reserveCredit] === REQUEST DEBUG ===");
  console.log("[reserveCredit] URL:", edgeFunctionUrl);
  console.log("[reserveCredit] Token length:", session.access_token?.length || 0);
  console.log("[reserveCredit] Token prefix:", session.access_token?.substring(0, 20) || "NONE");
  console.log("[reserveCredit] Token looks valid:", session.access_token?.startsWith("eyJ") ? "YES" : "NO");
  console.log("[reserveCredit] Image size:", Math.round((input.imageUrl?.length || 0) / 1024), "KB");
  console.log("[reserveCredit] === END DEBUG ===");

  try {
    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrl: input.imageUrl,
        presetId: input.presetId,
        styleId: input.styleId || "photorealistic",
        imageCount: 4,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[reserveCredit] Response error:", {
        status: response.status,
        data,
      });

      if (response.status === 401) {
        throw new Error("UNAUTHORIZED");
      }
      if (response.status === 402 || data.code === "INSUFFICIENT_CREDITS") {
        throw new Error("INSUFFICIENT_CREDITS");
      }
      throw new Error(data.error || "Failed to reserve credit");
    }

    return {
      success: true,
      sessionId: data.sessionId,
      isFreeGeneration: data.isFreeGeneration,
      remainingFree: data.remainingFree,
      remainingPaid: data.remainingPaid,
    };
  } catch (error: any) {
    console.error("[reserveCredit] Error:", error);
    throw error;
  }
}

/**
 * Generate a single image using a reserved session
 *
 * This should be called 4 times in parallel (variationIndex 0-3)
 * after calling reserveCredit to get a sessionId.
 *
 * @param input - Session ID and variation index
 * @param session - Supabase session with access token
 * @returns Generated image URL
 */
export async function generateSingleImage(
  input: GenerateSingleInput,
  session: Session
): Promise<GenerateSingleResult> {
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL not configured");
  }

  if (!session?.access_token) {
    throw new Error("UNAUTHORIZED");
  }

  const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/generate-single`;

  try {
    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: input.sessionId,
        variationIndex: input.variationIndex,
      }),
    });

    // Check for HTML response (usually means timeout/error page)
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      console.error("[generateSingleImage] Non-JSON response:", {
        status: response.status,
        contentType,
        body: text.substring(0, 200),
      });
      throw new Error("Server returned non-JSON response (possible timeout)");
    }

    const data = await response.json();

    if (!response.ok) {
      console.error("[generateSingleImage] Response error:", {
        status: response.status,
        data,
        variationIndex: input.variationIndex,
      });

      if (response.status === 401) {
        throw new Error("UNAUTHORIZED");
      }
      if (response.status === 403 || data.code === "INVALID_SESSION") {
        throw new Error("INVALID_SESSION");
      }
      throw new Error(data.error || "Generation failed");
    }

    return {
      success: true,
      variationIndex: data.variationIndex,
      imageUrl: data.imageUrl,
      imageId: data.imageId || null,
    };
  } catch (error: any) {
    console.error(`[generateSingleImage] Error for variation ${input.variationIndex}:`, error);
    throw error;
  }
}

// ============================================
// Account Management API
// ============================================

export interface DeleteAccountResult {
  success: boolean;
}

/**
 * Delete the user's account and all associated data
 *
 * This permanently deletes:
 * - All generated images from storage
 * - All uploaded photos from storage
 * - All database records (cascaded from auth.users deletion)
 * - The auth account itself
 *
 * @param session - Supabase session with access token
 * @returns Success status
 */
export async function deleteAccount(session: Session): Promise<DeleteAccountResult> {
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL not configured");
  }

  if (!session?.access_token) {
    throw new Error("UNAUTHORIZED");
  }

  const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/delete-account`;

  try {
    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[deleteAccount] Response error:", {
        status: response.status,
        data,
      });

      if (response.status === 401) {
        throw new Error("UNAUTHORIZED");
      }
      if (data.code === "DELETION_FAILED") {
        throw new Error("DELETION_FAILED");
      }
      throw new Error(data.error || "Failed to delete account");
    }

    return { success: true };
  } catch (error: any) {
    console.error("[deleteAccount] Error:", error);
    throw error;
  }
}
