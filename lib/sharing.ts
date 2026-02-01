/**
 * Sharing Utility
 *
 * Native image sharing using expo-sharing with proper file handling.
 *
 * Features:
 * - Handles remote URLs (downloads to cache first)
 * - Handles base64 data URLs (writes to file first)
 * - Uses native share sheet via Sharing.shareAsync()
 * - Graceful error handling (no alert on user cancel)
 */

import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";

/**
 * Share an image using the native share sheet
 *
 * @param imageUri - Image URL (remote), local file path, or base64 data URL
 * @returns true if shared successfully, false if cancelled or failed
 */
export async function shareImage(imageUri: string): Promise<boolean> {
  try {
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      console.warn("[Sharing] Sharing is not available on this device");
      return false;
    }

    // Prepare the file for sharing
    const localUri = await prepareFileForSharing(imageUri);
    if (!localUri) {
      console.error("[Sharing] Failed to prepare file for sharing");
      return false;
    }

    // Share the file
    await Sharing.shareAsync(localUri, {
      mimeType: "image/png",
      dialogTitle: "Share your Creative Moose photo",
      UTI: "public.png", // iOS Uniform Type Identifier
    });

    return true;
  } catch (error: any) {
    // User cancelled - don't show error
    if (error?.message?.includes("cancel") || error?.code === "ERR_SHARING_CANCELLED") {
      return false;
    }

    console.error("[Sharing] Share error:", error);
    return false;
  }
}

/**
 * Prepare an image for sharing by ensuring it's a local file
 *
 * @param imageUri - Remote URL, local path, or base64 data URL
 * @returns Local file URI ready for sharing, or null if failed
 */
async function prepareFileForSharing(imageUri: string): Promise<string | null> {
  try {
    const timestamp = Date.now();
    const filename = `creative_moose_${timestamp}.png`;

    // Handle base64 data URLs
    if (imageUri.startsWith("data:")) {
      const base64Data = imageUri.split(",")[1];
      if (!base64Data) {
        console.error("[Sharing] Invalid base64 data URL");
        return null;
      }

      const file = new File(Paths.cache, filename);
      file.write(base64Data, { encoding: "base64" });
      return file.uri;
    }

    // Handle remote URLs
    if (imageUri.startsWith("http://") || imageUri.startsWith("https://")) {
      const file = await File.downloadFileAsync(
        imageUri,
        new File(Paths.cache, filename),
        { idempotent: true }
      );
      return file.uri;
    }

    // Assume it's already a local file path
    return imageUri;
  } catch (error) {
    console.error("[Sharing] Failed to prepare file:", error);
    return null;
  }
}
