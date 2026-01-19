/**
 * Supabase Storage Utilities
 *
 * Handles image uploads to Supabase Storage buckets:
 * - "generations" bucket: Stores generated AI images
 * - "uploads" bucket: Stores user input photos (optional)
 *
 * Images are stored with paths like:
 *   generations/{user_id}/{batch_id}/{image_index}.png
 *
 * For anonymous users:
 *   generations/anonymous/{session_id}/{batch_id}/{image_index}.png
 */

import { createAdminClient } from "@/lib/supabase/server";
import crypto from "crypto";

const GENERATIONS_BUCKET = "generations";
const UPLOADS_BUCKET = "uploads";

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface BatchUploadResult {
  success: boolean;
  urls: string[];
  paths: string[];
  batchId: string;
  errors?: string[];
}

/**
 * Generate a unique batch ID for grouping 4 images from the same generation
 */
export function generateBatchId(): string {
  return crypto.randomUUID();
}

/**
 * Convert base64 data URI to Buffer
 */
function base64ToBuffer(base64DataUri: string): {
  buffer: Buffer;
  mimeType: string;
} {
  // Handle both data URIs and raw base64
  let base64Data = base64DataUri;
  let mimeType = "image/png";

  if (base64DataUri.startsWith("data:")) {
    const matches = base64DataUri.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      base64Data = matches[2];
    }
  }

  return {
    buffer: Buffer.from(base64Data, "base64"),
    mimeType,
  };
}

/**
 * Get file extension from mime type
 */
function getExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return extensions[mimeType] || "png";
}

/**
 * Upload a single image to Supabase Storage
 */
export async function uploadImage(
  base64Image: string,
  userId: string,
  batchId: string,
  imageIndex: number,
  isAnonymous: boolean = false
): Promise<UploadResult> {
  try {
    const supabase = createAdminClient();
    const { buffer, mimeType } = base64ToBuffer(base64Image);
    const extension = getExtension(mimeType);

    // Build path: {user_type}/{user_id}/{batch_id}/{index}.{ext}
    const userFolder = isAnonymous ? "anonymous" : userId;
    const path = `${userFolder}/${batchId}/${imageIndex}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(GENERATIONS_BUCKET)
      .upload(path, buffer, {
        contentType: mimeType,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(GENERATIONS_BUCKET).getPublicUrl(path);

    return {
      success: true,
      url: publicUrl,
      path,
    };
  } catch (error) {
    console.error("Upload image error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Upload a batch of generated images (typically 4)
 */
export async function uploadImageBatch(
  base64Images: string[],
  userId: string,
  isAnonymous: boolean = false
): Promise<BatchUploadResult> {
  const batchId = generateBatchId();
  const results: UploadResult[] = [];
  const errors: string[] = [];

  // Upload all images in parallel
  const uploadPromises = base64Images.map((image, index) =>
    uploadImage(image, userId, batchId, index, isAnonymous)
  );

  const uploadResults = await Promise.all(uploadPromises);

  for (const result of uploadResults) {
    if (result.success) {
      results.push(result);
    } else {
      errors.push(result.error || "Unknown error");
    }
  }

  // If all failed, return failure
  if (results.length === 0) {
    return {
      success: false,
      urls: [],
      paths: [],
      batchId,
      errors,
    };
  }

  return {
    success: true,
    urls: results.map((r) => r.url!),
    paths: results.map((r) => r.path!),
    batchId,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Upload user's input photo (optional - for reconstruction/history)
 */
export async function uploadInputPhoto(
  base64Photo: string,
  userId: string,
  batchId: string
): Promise<UploadResult> {
  try {
    const supabase = createAdminClient();
    const { buffer, mimeType } = base64ToBuffer(base64Photo);
    const extension = getExtension(mimeType);

    const path = `${userId}/${batchId}/input.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(UPLOADS_BUCKET)
      .upload(path, buffer, {
        contentType: mimeType,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Input photo upload error:", uploadError);
      return { success: false, error: uploadError.message };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(UPLOADS_BUCKET).getPublicUrl(path);

    return {
      success: true,
      url: publicUrl,
      path,
    };
  } catch (error) {
    console.error("Upload input photo error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Delete an image from storage
 */
export async function deleteImage(path: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.storage
      .from(GENERATIONS_BUCKET)
      .remove([path]);

    if (error) {
      console.error("Delete image error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Delete image error:", error);
    return false;
  }
}

/**
 * Delete multiple images (batch delete)
 */
export async function deleteImages(paths: string[]): Promise<boolean> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.storage
      .from(GENERATIONS_BUCKET)
      .remove(paths);

    if (error) {
      console.error("Delete images error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Delete images error:", error);
    return false;
  }
}

/**
 * Get a signed URL for private image access (if bucket is private)
 */
export async function getSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase.storage
      .from(GENERATIONS_BUCKET)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error("Get signed URL error:", error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("Get signed URL error:", error);
    return null;
  }
}
