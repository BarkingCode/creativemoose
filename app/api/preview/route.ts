/**
 * Preview API Route
 *
 * POST: Generate watermarked preview images for anonymous users.
 * - Tracks free tries via client-side localStorage (validated here)
 * - Returns watermarked, downscaled images as base64 (no storage)
 * - Rate limited by IP to prevent abuse
 */

import { NextRequest, NextResponse } from "next/server";
import { generateImages } from "@/lib/image-generation";
import { getPreset, getPresetPromptsWithStyle } from "@/lib/presets";
import { watermarkAndDownscale } from "@/lib/watermark";
import { readFile } from "fs/promises";
import path from "path";

// Simple in-memory rate limiting by IP
// In production, use Redis or similar
const ipGenerations = new Map<string, { count: number; resetAt: number }>();
const MAX_GENERATIONS_PER_IP = 5; // Maximum per day per IP
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = ipGenerations.get(ip);

  if (!record || record.resetAt < now) {
    // Reset or new entry
    ipGenerations.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: MAX_GENERATIONS_PER_IP - 1 };
  }

  if (record.count >= MAX_GENERATIONS_PER_IP) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: MAX_GENERATIONS_PER_IP - record.count };
}

export async function POST(req: NextRequest) {
  try {
    // Get client IP for rate limiting
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";

    // Check rate limit
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later or sign up for more generations.",
          code: "RATE_LIMITED",
        },
        { status: 429 }
      );
    }

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

    const preset = getPreset(presetId);
    if (!preset) {
      return NextResponse.json({ error: "Invalid preset" }, { status: 400 });
    }

    // Video presets not supported in preview
    if (preset.type === "video") {
      return NextResponse.json(
        { error: "Video generation requires a signed-in account" },
        { status: 400 }
      );
    }

    // Convert photo to base64
    const photoBuffer = Buffer.from(await photoFile.arrayBuffer());
    const photoBase64 = `data:${photoFile.type};base64,${photoBuffer.toString("base64")}`;

    // Load reference images if needed
    let referenceImages: string[] | undefined;
    if (preset.requiresRefs) {
      try {
        if (presetId === "ilacSceneMatch") {
          const refs = ["ilac1.jpg", "ilac2.jpg", "ilac3.jpg", "ilac4.jpg"];
          referenceImages = await Promise.all(
            refs.map(async (ref) => {
              const refPath = path.join(process.cwd(), `public/refs/${ref}`);
              const refBuffer = await readFile(refPath);
              return `data:image/jpeg;base64,${refBuffer.toString("base64")}`;
            })
          );
        } else {
          // Default "With Us" references
          const ref1Path = path.join(process.cwd(), "public/refs/withus_guyA.jpg");
          const ref2Path = path.join(process.cwd(), "public/refs/withus_guyB.jpg");
          const ref1Buffer = await readFile(ref1Path);
          const ref2Buffer = await readFile(ref2Path);
          referenceImages = [
            `data:image/jpeg;base64,${ref1Buffer.toString("base64")}`,
            `data:image/jpeg;base64,${ref2Buffer.toString("base64")}`,
          ];
        }
      } catch (error) {
        console.error("Error loading reference images:", error);
      }
    }

    // Get styled prompts
    const styledPrompts = getPresetPromptsWithStyle(presetId, styleId as any);

    // Generate images
    const result = await generateImages({
      baseImage: photoBase64,
      referenceImages,
      prompts: styledPrompts,
      quality: "high",
    });

    // Watermark and downscale all images (always downscale for preview)
    const watermarkedImages = await Promise.all(
      result.images.map((img) => watermarkAndDownscale(img, true)) // true = downscale
    );

    return NextResponse.json({
      success: true,
      images: watermarkedImages, // Base64 images
      metadata: result.metadata,
      isPreview: true,
      remainingTries: rateLimit.remaining,
      type: "image",
    });
  } catch (error) {
    console.error("Error generating preview:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
