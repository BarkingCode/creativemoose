/**
 * Gemini 2.5 Flash Image Generation integration.
 * Generates creative AI images using Google's Gemini API.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface GenerationOptions {
  baseImage: string; // Base64 data URI
  referenceImages?: string[]; // For "With Us" preset
  prompts: string[];
  quality: "low" | "high";
}

export interface GenerationResult {
  images: string[]; // Array of base64 data URIs
  metadata?: {
    model: string;
    processingTime: number;
  };
}

/**
 * Generate images using Gemini 2.5 Flash Image model.
 */
export async function generateImages(
  options: GenerationOptions
): Promise<GenerationResult> {
  const apiKey = process.env.NB_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("NB_GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-image",
  });

  const startTime = Date.now();
  const generatedImages: string[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Extract base64 data from data URI
  const extractBase64 = (dataUri: string): string => {
    return dataUri.split(",")[1];
  };

  const extractMimeType = (dataUri: string): string => {
    const match = dataUri.match(/data:([^;]+);/);
    return match ? match[1] : "image/jpeg";
  };

  // Generate all images in parallel
  const generationPromises = options.prompts.map(async (prompt, index) => {
    try {
      const parts: any[] = [];

      // Add the prompt text
      parts.push({ text: prompt });

      // Add base image for image+text-to-image generation
      parts.push({
        inlineData: {
          mimeType: extractMimeType(options.baseImage),
          data: extractBase64(options.baseImage),
        },
      });

      // Add reference images if provided (for "With Us" preset)
      if (options.referenceImages && options.referenceImages.length > 0) {
        for (const refImage of options.referenceImages) {
          parts.push({
            inlineData: {
              mimeType: extractMimeType(refImage),
              data: extractBase64(refImage),
            },
          });
        }
      }

      // Use simple generateContent call with parts
      const result = await model.generateContent(parts);

      const response = result.response;

      // Track token usage
      let inputTokens = 0;
      let outputTokens = 0;
      if (response.usageMetadata) {
        inputTokens = response.usageMetadata.promptTokenCount || 0;
        outputTokens = response.usageMetadata.candidatesTokenCount || 0;

        if (process.env.NODE_ENV === 'development') {
          console.log(`Image ${index + 1} token usage:`, {
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
          });
        }
      }

      // Log the full response for debugging in dev mode
      if (process.env.NODE_ENV === 'development') {
        console.log("Full Gemini response:", JSON.stringify(response, null, 2));
      }

      // Extract generated image from response
      if (response.candidates && response.candidates[0]?.content?.parts) {
        const imagePart = response.candidates[0].content.parts.find(
          (part: any) => part.inlineData
        );

        if (imagePart?.inlineData?.data) {
          const mimeType = imagePart.inlineData.mimeType || "image/png";
          const base64Data = imagePart.inlineData.data;
          const dataUri = `data:${mimeType};base64,${base64Data}`;
          return { dataUri, inputTokens, outputTokens };
        } else {
          console.error("No image data in response parts:", response.candidates[0].content.parts);
          throw new Error("No image generated");
        }
      } else {
        console.error("Invalid response structure:", {
          hasCandidates: !!response.candidates,
          candidatesLength: response.candidates?.length,
          firstCandidate: response.candidates?.[0],
        });
        throw new Error("Invalid response structure");
      }
    } catch (error) {
      console.error("Error generating image for prompt:", prompt, error);
      throw error; // Re-throw to handle at API level
    }
  });

  // Wait for all images to generate in parallel
  const results = await Promise.all(generationPromises);

  // Extract images and accumulate token counts
  results.forEach((result) => {
    generatedImages.push(result.dataUri);
    totalInputTokens += result.inputTokens;
    totalOutputTokens += result.outputTokens;
  });

  const processingTime = Date.now() - startTime;

  // Log total token usage in dev mode
  if (process.env.NODE_ENV === 'development') {
    console.log("=== Total Generation Summary ===", {
      totalImages: generatedImages.length,
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      avgTokensPerImage: Math.round((totalInputTokens + totalOutputTokens) / generatedImages.length),
      processingTimeMs: processingTime,
    });
  }

  return {
    images: generatedImages,
    metadata: {
      model: "gemini-2.5-flash-image",
      processingTime,
    },
  };
}

/**
 * Convert file to base64 for API transmission
 */
export async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
