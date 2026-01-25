/**
 * Reserve Credit Edge Function
 *
 * Reserves a generation credit and creates a session for parallel image generation.
 * This function:
 * 1. Validates the user's auth token
 * 2. Decrements one credit atomically
 * 3. Creates a generation session with a 5-minute expiry
 * 4. Returns the sessionId for use in parallel generate-single calls
 *
 * This enables the progressive loading pattern where the client makes 4 parallel
 * generation requests that all share a single credit.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { validateAuth } from "../_shared/auth.ts";
import { reserveGenerationSession } from "../_shared/credits.ts";
import type { PhotoStyleId } from "../_shared/presets.ts";

interface ReserveRequest {
  imageUrl: string;
  presetId: string;
  styleId?: PhotoStyleId;
  imageCount?: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate authentication
    const authResult = await validateAuth(req);
    if (!authResult.success || !authResult.userId) {
      return new Response(
        JSON.stringify({ error: authResult.error || "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = authResult.userId;

    // Parse request body
    const body: ReserveRequest = await req.json();
    const {
      imageUrl,
      presetId,
      styleId = "photorealistic",
      imageCount = 4,
    } = body;

    // Validate required fields
    if (!imageUrl || !presetId) {
      return new Response(
        JSON.stringify({ error: "Missing imageUrl or presetId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Reserve credit and create session
    const result = await reserveGenerationSession(
      userId,
      presetId,
      styleId,
      imageUrl,
      imageCount
    );

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: result.error || "Failed to reserve credit",
          code: result.error === "INSUFFICIENT_CREDITS" ? "INSUFFICIENT_CREDITS" : "RESERVATION_FAILED",
          remainingFree: result.remainingFree,
          remainingPaid: result.remainingPaid,
        }),
        {
          status: result.error === "INSUFFICIENT_CREDITS" ? 402 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return success with sessionId
    return new Response(
      JSON.stringify({
        success: true,
        sessionId: result.sessionId,
        isFreeGeneration: result.isFree,
        remainingFree: result.remainingFree,
        remainingPaid: result.remainingPaid,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Reserve credit error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
