/**
 * API route for paid generation - Uses parallel generation flow
 *
 * This route:
 * 1. Validates the user's auth via Supabase
 * 2. Converts FormData photo to base64
 * 3. Calls reserve-credit to get a sessionId
 * 4. Calls generate-single 4 times in parallel
 * 5. Returns all generated images
 *
 * This matches the mobile app's parallel generation flow for consistency.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface GenerateSingleResult {
  success: boolean;
  variationIndex: number;
  imageUrl: string;
  imageId: string | null;
  generationId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get user session and access token
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Step 1: Reserve credit and create generation session
    const reserveResponse = await fetch(`${supabaseUrl}/functions/v1/reserve-credit`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrl,
        presetId,
        styleId,
        imageCount: 4,
      }),
    });

    const reserveData = await reserveResponse.json();

    if (!reserveResponse.ok) {
      console.error("Reserve credit error:", reserveData);

      if (reserveData.code === "INSUFFICIENT_CREDITS") {
        return NextResponse.json(
          {
            error: reserveData.error || "Insufficient credits",
            creditType: "image",
          },
          { status: 402 }
        );
      }

      return NextResponse.json(
        { error: reserveData.error || "Failed to reserve credit" },
        { status: reserveResponse.status }
      );
    }

    const { sessionId, isFreeGeneration, remainingFree, remainingPaid } = reserveData;

    // Step 2: Generate all 4 images in parallel
    const generatePromises = [0, 1, 2, 3].map(async (variationIndex) => {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/generate-single`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            variationIndex,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Generate-single error for variation ${variationIndex}:`, errorData);
          return null;
        }

        const result: GenerateSingleResult = await response.json();
        return result;
      } catch (error) {
        console.error(`Generate-single exception for variation ${variationIndex}:`, error);
        return null;
      }
    });

    const results = await Promise.all(generatePromises);

    // Collect successful image URLs
    const imageUrls = results
      .filter((r): r is GenerateSingleResult => r !== null && r.success)
      .sort((a, b) => a.variationIndex - b.variationIndex)
      .map((r) => r.imageUrl);

    if (imageUrls.length === 0) {
      return NextResponse.json(
        { error: "All image generations failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      images: imageUrls,
      type: "image",
      isFreeGeneration,
      remainingFree,
      remainingPaid,
      generatedCount: imageUrls.length,
    });
  } catch (error) {
    console.error("Error generating images:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
