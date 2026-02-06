/**
 * Generate Single Edge Function
 *
 * Generates a single image as part of a parallel generation session.
 * This function:
 * 1. Validates the session ID and user ownership
 * 2. Checks session hasn't expired
 * 3. Generates one image with the specified variation
 * 4. Persists image to storage and images table
 * 5. Updates generations.image_urls for unified tracking
 *
 * Use this after calling reserve-credit to enable parallel image generation.
 * The sessionId ensures only one credit is consumed for all 4 images.
 * The generationId links to the canonical generations record.
 *
 * Models: Kling (photorealistic/cinematic/vintage) or Nano Banana Pro (cartoon/painting/watercolor)
 * Model selection is automatic based on the style chosen by the user.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { validateAuth, createServiceClient } from "../_shared/auth.ts";
import { validateAndUseSession, updateGenerationImages } from "../_shared/credits.ts";
import { getPresetPromptWithStyle, getModelForStyle, buildModelParams, type PhotoStyleId } from "../_shared/presets.ts";

const FAL_KEY = Deno.env.get("FAL_KEY");
const FAL_QUEUE_URL = "https://queue.fal.run";

// Kling v3 image-to-image typically takes 60-90 seconds
// Supabase Edge Functions have a 150s wall-clock limit on all plans
const MAX_POLL_TIME_MS = 120000;
const POLL_INTERVAL_MS = 2000;

interface FalQueueResponse {
  status: string;
  request_id: string;
  response_url: string;
  status_url: string;
}

interface FalStatusResponse {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED";
  response_url?: string;
}

/**
 * Submit a generation request to fal.ai queue and poll for result
 */
async function generateWithPolling(
  model: string,
  params: Record<string, unknown>
): Promise<unknown> {
  // Submit to queue
  const submitResponse = await fetch(`${FAL_QUEUE_URL}/${model}`, {
    method: "POST",
    headers: {
      "Authorization": `Key ${FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    throw new Error(`Queue submit failed: ${errorText}`);
  }

  const queueData: FalQueueResponse = await submitResponse.json();
  console.log(`Queued request: ${queueData.request_id}`);

  // Poll for completion
  const startTime = Date.now();
  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const statusResponse = await fetch(queueData.status_url, {
      headers: { "Authorization": `Key ${FAL_KEY}` },
    });

    if (!statusResponse.ok) {
      console.warn("Status check failed, retrying...");
      continue;
    }

    const statusData: FalStatusResponse = await statusResponse.json();

    if (statusData.status === "COMPLETED") {
      const resultResponse = await fetch(queueData.response_url, {
        headers: { "Authorization": `Key ${FAL_KEY}` },
      });

      if (!resultResponse.ok) {
        throw new Error("Failed to fetch completed result");
      }

      return resultResponse.json();
    }

    if (statusData.status !== "IN_QUEUE" && statusData.status !== "IN_PROGRESS") {
      throw new Error(`Unexpected status: ${statusData.status}`);
    }
  }

  throw new Error("Generation timed out");
}

function extractImageUrl(falResult: unknown): string | null {
  if (typeof falResult !== "object" || falResult === null) {
    return null;
  }

  const result = falResult as Record<string, unknown>;

  // Format 1: { images: [{ url: string }] }
  if (Array.isArray(result.images) && result.images.length > 0) {
    const img = result.images[0];
    if (typeof img === "object" && img !== null && "url" in img) {
      return (img as { url: string }).url;
    }
    if (typeof img === "string") {
      return img;
    }
  }

  // Format 2: { image: { url: string } }
  if (result.image && typeof result.image === "object" && "url" in result.image) {
    return (result.image as { url: string }).url;
  }

  // Format 3: { output: [string] } or { output: string }
  if (Array.isArray(result.output) && result.output.length > 0) {
    if (typeof result.output[0] === "string") {
      return result.output[0];
    }
  } else if (typeof result.output === "string") {
    return result.output;
  }

  return null;
}

/**
 * Download image from fal.ai, upload to Supabase Storage, and insert into images table
 * Uses generationId (from generations table) as the batch identifier for data consistency
 */
async function persistImage(
  falImageUrl: string,
  userId: string,
  generationId: string, // Canonical generation record ID
  variationIndex: number,
  presetId: string,
  styleId: string,
  isFree: boolean
): Promise<{ storageUrl: string; imageId: string } | null> {
  try {
    const supabase = createServiceClient();

    // Download image from fal.ai
    const imageResponse = await fetch(falImageUrl);
    if (!imageResponse.ok) {
      console.error("Failed to download image from fal.ai:", imageResponse.status);
      return null;
    }

    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();

    // Upload to Supabase Storage: generations/{userId}/{generationId}/{variationIndex}.jpg
    const storagePath = `${userId}/${generationId}/${variationIndex}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("generations")
      .upload(storagePath, imageBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Failed to upload to storage:", uploadError);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("generations")
      .getPublicUrl(storagePath);

    const storageUrl = urlData.publicUrl;

    // Insert record into images table with generationId as batch reference
    const { data: imageRecord, error: insertError } = await supabase
      .from("images")
      .insert({
        user_id: userId,
        generation_batch_id: generationId, // Links to generations.id
        image_url: storageUrl,
        storage_path: storagePath,
        preset_id: presetId,
        style_id: styleId,
        image_index: variationIndex,
        is_public: false,
        is_free_generation: isFree,
      })
      .select("id")
      .single();

    if (insertError || !imageRecord) {
      console.error("Failed to insert image record:", insertError);
      // Try to clean up the uploaded file
      await supabase.storage.from("generations").remove([storagePath]);
      return null;
    }

    console.log(`Image ${variationIndex} persisted: ${imageRecord.id}`);
    return { storageUrl, imageId: imageRecord.id };
  } catch (error) {
    console.error("Error persisting image:", error);
    return null;
  }
}

interface GenerateSingleRequest {
  sessionId: string;
  variationIndex: number; // 0-3
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
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
    const body: GenerateSingleRequest = await req.json();
    const { sessionId, variationIndex } = body;

    // Validate required fields
    if (!sessionId || variationIndex === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing sessionId or variationIndex" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate session and get details (includes generationId)
    const sessionResult = await validateAndUseSession(sessionId, userId, variationIndex);

    if (!sessionResult) {
      return new Response(
        JSON.stringify({
          error: "Invalid or expired session",
          code: "INVALID_SESSION",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { session, variationPrompt, generationId, isLastImage } = sessionResult;

    // Get the base prompt for the preset+style
    const basePrompt = getPresetPromptWithStyle(
      session.presetId,
      session.styleId as PhotoStyleId
    );

    if (!basePrompt) {
      return new Response(
        JSON.stringify({ error: "Invalid preset or style" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Combine with variation
    const finalPrompt = `${basePrompt}, ${variationPrompt}`;

    // Route to the correct model based on style
    const modelConfig = getModelForStyle(session.styleId as PhotoStyleId);
    console.log(`Generating image ${variationIndex} for session ${sessionId} (generation: ${generationId}) using model: ${modelConfig.modelId}`);

    // Build model-specific params (handles image_url vs image_urls)
    const modelParams = buildModelParams(modelConfig, session.imageUrl, finalPrompt);
    const result = await generateWithPolling(modelConfig.modelId, modelParams);

    const imageUrl = extractImageUrl(result);

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "No image generated" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Image ${variationIndex} generated successfully`);

    // Persist image to Supabase Storage and database
    const persistResult = await persistImage(
      imageUrl,
      userId,
      generationId, // Use generationId for consistent data linking
      variationIndex,
      session.presetId,
      session.styleId,
      session.isFree
    );

    if (!persistResult) {
      // Fallback: return fal.ai URL if persistence fails (images will be temporary)
      console.warn("Image persistence failed, returning temporary URL");
      return new Response(
        JSON.stringify({
          success: true,
          variationIndex,
          imageUrl,
          imageId: null, // No database record
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update generations.image_urls array for unified tracking
    await updateGenerationImages(
      generationId,
      persistResult.storageUrl,
      isLastImage
    );

    return new Response(
      JSON.stringify({
        success: true,
        variationIndex,
        imageUrl: persistResult.storageUrl,
        imageId: persistResult.imageId,
        generationId, // Include for client-side reference
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Generate single error:", error);
    return new Response(
      JSON.stringify({
        error: "Generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
