/**
 * Preview Edge Function - Image Generation for Anonymous Users
 *
 * Generates 4 preview images using fal.ai for anonymous users.
 * Returns image URLs with watermarkRequired flag for client-side watermarking.
 * Uses the same variation prompts as authenticated generation for consistency.
 *
 * Model: fal-ai/kling-image/v3/image-to-image (Kling Image v3)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getPresetPromptWithStyle, type PhotoStyleId } from "../_shared/presets.ts";

const FAL_KEY = Deno.env.get("FAL_KEY");
// Use queue.fal.run with polling for reliable async generation
const FAL_QUEUE_URL = "https://queue.fal.run";

// Default model for image editing
// Kling Image v3 for high-quality image transformations
const DEFAULT_MODEL = "fal-ai/kling-image/v3/image-to-image";

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
  console.log(`Queued preview request: ${queueData.request_id}`);

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
      // Fetch the final result
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

interface PreviewRequest {
  // User's photo as base64 data URL or HTTP URL
  imageUrl: string;
  // Preset ID (e.g., "mapleAutumn", "winterWonderland")
  presetId: string;
  // Photo style (e.g., "photorealistic", "cartoon")
  styleId?: PhotoStyleId;
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

    // Parse request body
    const body: PreviewRequest = await req.json();
    const { imageUrl, presetId, styleId = "photorealistic" } = body;

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

    // Get prompt for preset+style combination
    const prompt = getPresetPromptWithStyle(presetId, styleId);
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Invalid presetId or styleId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Variation prompts for lighting/atmosphere (same as authenticated flow)
    const variations = [
      "morning light, golden hour warmth",
      "soft afternoon glow, natural lighting",
      "sunset glow, warm amber tones",
      "bright midday, clear crisp light",
    ];

    // Generate 4 preview images in parallel
    console.log("Starting parallel generation of 4 preview images...");

    const generationPromises = variations.map(async (variation, index) => {
      try {
        const result = await generateWithPolling(DEFAULT_MODEL, {
          image_url: imageUrl,
          prompt: `${prompt}, ${variation}`,
          num_images: 1,
          output_format: "jpeg",
          aspect_ratio: "1:1",
        });

        const urls = extractImageUrls(result);
        console.log(`Preview image ${index} generated successfully`);
        return { index, url: urls[0] || null, error: null };
      } catch (error) {
        console.error(`Preview image ${index} failed:`, error);
        return {
          index,
          url: null,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    });

    const results = await Promise.all(generationPromises);

    // Collect successful image URLs in order
    const imageUrls: string[] = [];
    for (const result of results.sort((a, b) => a.index - b.index)) {
      if (result.url) {
        imageUrls.push(result.url);
      }
    }

    console.log(`Generated ${imageUrls.length}/4 preview images successfully`);

    if (imageUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: "No images generated" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return preview images with watermark flag
    return new Response(
      JSON.stringify({
        success: true,
        images: imageUrls.map((url) => ({ url })),
        imageCount: imageUrls.length,
        isPreview: true,
        watermarkRequired: true,
        presetId,
        styleId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Preview function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Extract image URLs from various fal.ai response formats
 */
function extractImageUrls(falResult: unknown): string[] {
  const urls: string[] = [];

  if (typeof falResult !== "object" || falResult === null) {
    return urls;
  }

  const result = falResult as Record<string, unknown>;

  // Format 1: { images: [{ url: string }] }
  if (Array.isArray(result.images)) {
    for (const img of result.images) {
      if (typeof img === "object" && img !== null && "url" in img) {
        urls.push((img as { url: string }).url);
      } else if (typeof img === "string") {
        urls.push(img);
      }
    }
  }

  // Format 2: { image: { url: string } }
  if (result.image && typeof result.image === "object" && "url" in result.image) {
    urls.push((result.image as { url: string }).url);
  }

  // Format 3: { output: [string] } or { output: string }
  if (Array.isArray(result.output)) {
    for (const item of result.output) {
      if (typeof item === "string") {
        urls.push(item);
      }
    }
  } else if (typeof result.output === "string") {
    urls.push(result.output);
  }

  return urls;
}
