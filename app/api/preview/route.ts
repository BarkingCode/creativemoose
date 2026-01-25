/**
 * Preview API Route - Thin proxy to Supabase Edge Function
 *
 * This route:
 * 1. Converts FormData photo to base64
 * 2. Forwards the request to the Supabase Edge Function
 * 3. Returns the Edge Function response
 *
 * The Edge Function handles:
 * - Rate limiting by IP (persistent in Supabase DB)
 * - fal.ai API calls for image generation
 * - Response formatting
 *
 * Note: Preview generates a single watermarked image (vs 4 for paid)
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Parse FormData
    const formData = await req.formData();
    const photoFile = formData.get("photo") as File;
    const presetId = formData.get("presetId") as string;
    const styleId = (formData.get("styleId") as string) || "photorealistic";

    if (!photoFile || !presetId) {
      return NextResponse.json(
        { error: "Photo and preset ID are required" },
        { status: 400 }
      );
    }

    // Convert photo to base64 data URL
    const photoBuffer = Buffer.from(await photoFile.arrayBuffer());
    const imageUrl = `data:${photoFile.type};base64,${photoBuffer.toString("base64")}`;

    // Get Supabase URL from environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error("NEXT_PUBLIC_SUPABASE_URL not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Get client IP for rate limiting (passed to Edge Function via headers)
    const forwardedFor = req.headers.get("x-forwarded-for");
    const clientIp = forwardedFor?.split(",")[0]?.trim() || "unknown";

    // Get the anon key for unauthenticated requests
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseAnonKey) {
      console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Call the Supabase Edge Function (no auth required for preview)
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/preview`;

    const edgeResponse = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
        "X-Forwarded-For": clientIp,
        "X-Real-IP": clientIp,
      },
      body: JSON.stringify({
        imageUrl,
        presetId,
        styleId,
      }),
    });

    // Parse the Edge Function response
    const data = await edgeResponse.json();

    if (!edgeResponse.ok) {
      console.error("Preview Edge Function error:", data);

      // Handle rate limit error
      if (edgeResponse.status === 429 || data.code === "RATE_LIMITED") {
        return NextResponse.json(
          {
            error: data.message || "Rate limit exceeded. Please try again later or sign up for more generations.",
            code: "RATE_LIMITED",
            retryAfter: data.retryAfter,
          },
          {
            status: 429,
            headers: data.retryAfter
              ? { "Retry-After": String(Math.ceil(data.retryAfter / 1000)) }
              : {},
          }
        );
      }

      return NextResponse.json(
        { error: data.error || "Preview generation failed" },
        { status: edgeResponse.status }
      );
    }

    // Transform Edge Function response to match expected frontend format
    // Edge Function returns: { success, images: [{ url }], isPreview, watermarkRequired, ... }
    // Frontend expects: { success, images: [url1, ...], isPreview, type, ... }
    const imageUrls = data.images?.map((img: { url: string }) => img.url) || [];

    return NextResponse.json({
      success: true,
      images: imageUrls,
      isPreview: true,
      watermarkRequired: data.watermarkRequired,
      type: "image",
    });
  } catch (error) {
    console.error("Error generating preview:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
