/**
 * Veo 3.1 Video Generation integration.
 * Generates creative AI videos using Google's Veo API.
 */

import { GoogleGenAI, VideoGenerationReferenceType } from "@google/genai";
import ffmpeg from "fluent-ffmpeg";

export interface VideoGenerationOptions {
  baseImage: string; // Base64 data URI
  prompt: string; // Single prompt for video generation
}

export interface VideoGenerationResult {
  videoUrl: string; // URL to download the generated video
  metadata?: {
    model: string;
    processingTime: number;
    duration: number;
  };
}

/**
 * Generate video using Veo 3.1 model.
 * Generates a single 8-second video from an image and prompt.
 */
export async function generateVideo(
  options: VideoGenerationOptions
): Promise<VideoGenerationResult> {
  const apiKey = process.env.NB_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("NB_GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey });
  const startTime = Date.now();

  try {
    // Extract base64 data and mime type from data URI
    const extractBase64 = (dataUri: string): string => {
      return dataUri.split(",")[1];
    };

    const extractMimeType = (dataUri: string): string => {
      const match = dataUri.match(/data:([^;]+);/);
      return match ? match[1] : "image/jpeg";
    };

    // Convert the user's base64 image to the format needed by Veo
    const userImageBase64 = extractBase64(options.baseImage);
    const mimeType = extractMimeType(options.baseImage);

    if (process.env.NODE_ENV === 'development') {
      console.log("Using user's uploaded image for video generation");
      console.log("Image data length:", userImageBase64.length);
      console.log("MIME type:", mimeType);
    }

    // Start video generation operation using the user's uploaded image
    // The image parameter needs to be wrapped in VideoGenerationReferenceImage format
    const imageInput = {
      image: {
        imageBytes: userImageBase64,
        mimeType: mimeType,
      },
      referenceType: VideoGenerationReferenceType.ASSET,
    };

    if (process.env.NODE_ENV === 'development') {
      console.log("Image input object:", JSON.stringify(imageInput, null, 2));
    }

    let operation = await ai.models.generateVideos({
      model: "veo-3.1-generate-preview",
      prompt: options.prompt,
      config: {
        referenceImages: [imageInput],
      },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log("Video generation started, operation:", operation.name);
    }

    // Poll for completion
    const pollInterval = 10000; // 10 seconds
    const maxWaitTime = 300000; // 5 minutes maximum
    const startPollTime = Date.now();

    while (!operation.done) {
      // Check if we've exceeded max wait time
      if (Date.now() - startPollTime > maxWaitTime) {
        throw new Error("Video generation timed out after 5 minutes");
      }

      if (process.env.NODE_ENV === 'development') {
        console.log("Waiting for video generation...");
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      // Get updated operation status
      operation = await ai.operations.getVideosOperation({
        operation: operation,
      });
    }

    // Log the full operation response for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log("Operation completed, response:", JSON.stringify(operation.response, null, 2));
      console.log("Generated videos:", operation.response?.generatedVideos);
      console.log("First video:", operation.response?.generatedVideos?.[0]);
    }

    if (!operation.response?.generatedVideos?.[0]?.video) {
      // Log what we actually got
      console.error("No video in response. Full operation:", JSON.stringify(operation, null, 2));
      throw new Error("No video generated in response");
    }

    const videoFile = operation.response.generatedVideos[0].video;

    if (process.env.NODE_ENV === 'development') {
      console.log("Video generation completed, downloading video...");
    }

    // Download the video to a temporary file
    const fs = await import('fs/promises');
    const os = await import('os');
    const path = await import('path');

    // Create a unique temp directory for this download
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-gen-'));
    const tempVideoPath = path.join(tempDir, `video_${Date.now()}.mp4`);

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log("Attempting to download video...");
        console.log("Temp directory:", tempDir);
        console.log("Temp file path:", tempVideoPath);
      }

      // The download method might not work as expected in Node.js
      // Let's try to fetch the video using the URI directly
      if (videoFile.uri) {
        if (process.env.NODE_ENV === 'development') {
          console.log("Fetching video from URI:", videoFile.uri);
        }

        // Fetch the video directly from Google's servers with API key
        const response = await fetch(videoFile.uri, {
          headers: {
            'X-Goog-Api-Key': apiKey,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch video: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        let videoBuffer = Buffer.from(arrayBuffer);

        if (process.env.NODE_ENV === 'development') {
          console.log("Video fetched successfully, size:", videoBuffer.length, "bytes");
        }

        // Optionally trim the first 1 second to remove static frame
        // This requires ffmpeg to be installed on the system
        const shouldTrimVideo = process.env.TRIM_VIDEO_START === 'true';

        if (shouldTrimVideo) {
          try {
            // Write video to temp file for ffmpeg processing
            await fs.writeFile(tempVideoPath, videoBuffer);

            // Trim the first 1 second to remove static frame
            const trimmedVideoPath = path.join(tempDir, `video_trimmed_${Date.now()}.mp4`);

            if (process.env.NODE_ENV === 'development') {
              console.log("Trimming first 1 second from video...");
            }

            await new Promise<void>((resolve, reject) => {
              ffmpeg(tempVideoPath)
                .setStartTime(1) // Skip first 1 second
                .output(trimmedVideoPath)
                .on('end', () => {
                  if (process.env.NODE_ENV === 'development') {
                    console.log("Video trimming completed");
                  }
                  resolve();
                })
                .on('error', (err) => {
                  console.error("Error trimming video:", err);
                  reject(err);
                })
                .run();
            });

            // Read the trimmed video
            videoBuffer = Buffer.from(await fs.readFile(trimmedVideoPath));

            if (process.env.NODE_ENV === 'development') {
              console.log("Trimmed video size:", videoBuffer.length, "bytes");
            }

            // Clean up the original file
            await fs.unlink(tempVideoPath);
          } catch (trimError) {
            console.error("Video trimming failed, using original video:", trimError);
            console.log("To enable video trimming:");
            console.log("1. Install ffmpeg: brew install ffmpeg");
            console.log("2. Set TRIM_VIDEO_START=true in .env.local");
            // Continue with original video buffer
          }
        } else if (process.env.NODE_ENV === 'development') {
          console.log("Video trimming disabled. To enable, set TRIM_VIDEO_START=true in .env.local");
        }

        const videoBase64 = videoBuffer.toString('base64');
        const videoDataUri = `data:video/mp4;base64,${videoBase64}`;

        const processingTime = Date.now() - startTime;

        if (process.env.NODE_ENV === 'development') {
          console.log("=== Video Generation Summary ===", {
            model: "veo-3.1-generate-preview",
            processingTimeMs: processingTime,
            videoSizeKB: Math.round(videoBuffer.length / 1024),
          });
        }

        // Clean up temp directory
        try {
          await fs.rmdir(tempDir);
        } catch (cleanupErr) {
          console.error("Error cleaning up temp directory:", cleanupErr);
        }

        return {
          videoUrl: videoDataUri,
          metadata: {
            model: "veo-3.1-generate-preview",
            processingTime,
            duration: 8, // Veo 3.1 generates 8-second videos
          },
        };
      } else {
        throw new Error("Video file has no URI");
      }
    } catch (downloadError) {
      console.error("Error downloading video:", downloadError);

      // Try to clean up on error
      try {
        await fs.rmdir(tempDir).catch(() => {});
      } catch {}

      throw new Error(`Failed to download video: ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error("Error generating video:", error);
    throw error;
  }
}
