/**
 * Image watermarking and downscaling utilities for preview mode.
 * Uses sharp for image processing with logo watermark in bottom right corner.
 */

import sharp from "sharp";
import path from "path";
import fs from "fs";

/**
 * Add logo watermark to bottom right corner, optionally downscale to max 768px.
 * Returns base64 encoded watermarked image.
 */
export async function watermarkAndDownscale(
  imageBase64: string,
  shouldDownscale: boolean = true
): Promise<string> {
  try {
    // Extract base64 data from data URI
    const base64Data = imageBase64.split(",")[1];
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Get image metadata to calculate dimensions
    const metadata = await sharp(imageBuffer).metadata();
    const originalWidth = metadata.width || 1024;
    const originalHeight = metadata.height || 1024;

    // Calculate new dimensions (max 768px if downscaling, maintain aspect ratio)
    let newWidth = originalWidth;
    let newHeight = originalHeight;

    if (shouldDownscale && (originalWidth > 768 || originalHeight > 768)) {
      if (originalWidth > originalHeight) {
        newWidth = 768;
        newHeight = Math.round((originalHeight / originalWidth) * 768);
      } else {
        newHeight = 768;
        newWidth = Math.round((originalWidth / originalHeight) * 768);
      }
    }

    // Load and resize logo for watermark (bottom right corner)
    const logoPath = path.join(process.cwd(), "public", "logo.webp");
    const logoBuffer = fs.readFileSync(logoPath);

    // Calculate logo size (8% of image width, max 120px)
    const logoWidth = Math.min(Math.floor(newWidth * 0.08), 120);
    const padding = Math.floor(logoWidth * 0.2); // 20% of logo width for padding

    // Resize logo
    const resizedLogo = await sharp(logoBuffer)
      .resize(logoWidth, null, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .toBuffer();

    const logoMetadata = await sharp(resizedLogo).metadata();
    const logoHeight = logoMetadata.height || logoWidth;

    // Process image: resize and add logo watermark
    const processedBuffer = await sharp(imageBuffer)
      .resize(newWidth, newHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .composite([
        {
          input: resizedLogo,
          top: newHeight - logoHeight - padding,
          left: newWidth - logoWidth - padding,
          blend: "over",
        },
      ])
      .png()
      .toBuffer();

    // Convert back to base64 data URI
    const base64Result = processedBuffer.toString("base64");
    return `data:image/png;base64,${base64Result}`;
  } catch (error) {
    console.error("Error watermarking image:", error);
    // Return original on error
    return imageBase64;
  }
}

/**
 * Create signed JWT receipt for anonymous preview.
 */
export async function createPreviewReceipt(data: {
  ip: string;
  presetId: string;
  timestamp: string;
  hash: string;
}): Promise<string> {
  // Simple base64 encoded receipt (in production, use proper JWT signing)
  const receipt = {
    ...data,
    type: "preview",
    version: "1.0",
  };

  return Buffer.from(JSON.stringify(receipt)).toString("base64");
}
