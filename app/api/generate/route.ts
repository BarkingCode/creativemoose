/**
 * API route for paid generation with credit deduction.
 * Validates credits, decrements, and calls NB-G2.5 for images or Veo 3.1 for videos.
 * Uploads generated images to Supabase Storage and saves records to images table.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { decrementCredit, getCredits, getTotalCredits } from "@/lib/credits";
import { generateImages } from "@/lib/image-generation";
import { generateVideo } from "@/lib/video-generation";
import { getPreset, getPresetPromptsWithStyle } from "@/lib/presets";
import { watermarkAndDownscale } from "@/lib/watermark";
import { uploadImageBatch, generateBatchId } from "@/lib/storage";
import crypto from "crypto";
import { readFile } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Check if this is a video preset
    const isVideoPreset = preset.type === "video";

    // Video generation not yet supported with Supabase
    if (isVideoPreset) {
      return NextResponse.json(
        { error: "Video generation not yet supported" },
        { status: 400 }
      );
    }

    // Check current credits
    const creditInfo = await getCredits(user.id);
    const totalCredits = await getTotalCredits(user.id);
    const isFreeGeneration = (creditInfo?.total_generations || 0) === 0;

    if (totalCredits <= 0) {
      return NextResponse.json(
        {
          error: "Insufficient image credits",
          creditType: "image",
        },
        { status: 402 }
      );
    }

    // Convert photo to base64
    const photoBuffer = Buffer.from(await photoFile.arrayBuffer());
    const photoBase64 = `data:${photoFile.type};base64,${photoBuffer.toString("base64")}`;

    // Attempt to decrement credit atomically
    const decrementResult = await decrementCredit(user.id, presetId, styleId);

    if (!decrementResult.success) {
      return NextResponse.json(
        {
          error: decrementResult.error || "Insufficient image credits",
          creditType: "image",
        },
        { status: 402 }
      );
    }

    // Load reference images if needed
    let referenceImages: string[] | undefined;
    if (preset.requiresRefs) {
      try {
        // Load different reference images based on preset
        if (presetId === "ilacSceneMatch") {
          const ref1Path = path.join(process.cwd(), "public/refs/ilac1.jpg");
          const ref2Path = path.join(process.cwd(), "public/refs/ilac2.jpg");
          const ref3Path = path.join(process.cwd(), "public/refs/ilac3.jpg");
          const ref4Path = path.join(process.cwd(), "public/refs/ilac4.jpg");

          const ref1Buffer = await readFile(ref1Path);
          const ref2Buffer = await readFile(ref2Path);
          const ref3Buffer = await readFile(ref3Path);
          const ref4Buffer = await readFile(ref4Path);

          referenceImages = [
            `data:image/jpeg;base64,${ref1Buffer.toString("base64")}`,
            `data:image/jpeg;base64,${ref2Buffer.toString("base64")}`,
            `data:image/jpeg;base64,${ref3Buffer.toString("base64")}`,
            `data:image/jpeg;base64,${ref4Buffer.toString("base64")}`,
          ];
        } else {
          // Default to "With Us" preset references
          const ref1Path = path.join(
            process.cwd(),
            "public/refs/withus_guyA.jpg"
          );
          const ref2Path = path.join(
            process.cwd(),
            "public/refs/withus_guyB.jpg"
          );

          const ref1Buffer = await readFile(ref1Path);
          const ref2Buffer = await readFile(ref2Path);

          referenceImages = [
            `data:image/jpeg;base64,${ref1Buffer.toString("base64")}`,
            `data:image/jpeg;base64,${ref2Buffer.toString("base64")}`,
          ];
        }
      } catch (error) {
        console.error("Error loading reference images:", error);
        // Continue without refs - the generation may still work
      }
    }

    // Get styled prompts based on user preference
    const styledPrompts = getPresetPromptsWithStyle(
      presetId,
      styleId as any
    );

    // Image generation: use all prompts, generates 4 images
    const result = await generateImages({
      baseImage: photoBase64,
      referenceImages,
      prompts: styledPrompts,
      quality: "high",
    });

    // Watermark all generated images
    // Free users: watermark + downscale to 768px
    // Paid users: watermark only, full size
    const watermarkedImages = await Promise.all(
      result.images.map((img) =>
        watermarkAndDownscale(img, isFreeGeneration)
      )
    );

    // Upload images to Supabase Storage
    const batchId = generateBatchId();
    const uploadResult = await uploadImageBatch(watermarkedImages, user.id, false);

    if (!uploadResult.success || uploadResult.urls.length === 0) {
      console.error("Failed to upload images to storage:", uploadResult.errors);
      // Return base64 as fallback if storage upload fails
      return NextResponse.json({
        success: true,
        images: watermarkedImages,
        metadata: result.metadata,
        isFreeGeneration,
        type: "image",
        storedToGallery: false,
      });
    }

    // Save image records to database
    const adminSupabase = createAdminClient();
    const imageRecords = uploadResult.urls.map((url, index) => ({
      user_id: user.id,
      generation_batch_id: uploadResult.batchId,
      image_url: url,
      storage_path: uploadResult.paths[index],
      preset_id: presetId,
      style_id: styleId,
      image_index: index,
      is_public: false,
      is_free_generation: isFreeGeneration,
    }));

    const { error: insertError } = await adminSupabase
      .from("images")
      .insert(imageRecords);

    if (insertError) {
      console.error("Failed to save image records:", insertError);
      // Images are still in storage, but not tracked in DB
    }

    return NextResponse.json({
      success: true,
      images: uploadResult.urls, // Return storage URLs instead of base64
      metadata: result.metadata,
      isFreeGeneration,
      type: "image",
      batchId: uploadResult.batchId,
      storedToGallery: !insertError,
    });
  } catch (error) {
    console.error("Error generating images:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
