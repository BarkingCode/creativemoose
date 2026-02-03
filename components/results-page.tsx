/**
 * ResultsPage Component
 *
 * Displays generated AI images (4 in grid) or videos (1 full width) with download buttons.
 * Shows skeleton loaders during generation and error states.
 * Each item has a download button overlay in the bottom right corner.
 */

"use client";

import { Logo } from "@/components/logo";
import { Download } from "lucide-react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import LightRays from "@/components/LightRays";

interface ResultsPageProps {
  images?: string[] | null;
  videos?: string[] | null;
  onBack: () => void;
  generating?: boolean;
  error?: string | null;
  generatingType?: 'image' | 'video';
}

export function ResultsPage({ images, videos, onBack, generating = false, error = null, generatingType = 'image' }: ResultsPageProps) {
  // Determine if we're showing video content
  const isVideo = (videos && videos.length > 0) || (generating && generatingType === 'video');
  const content = isVideo ? videos : images;

  const handleDownload = async (contentUrl: string, index: number) => {
    try {
      const fileName = isVideo
        ? `generated-video-${index + 1}.mp4`
        : `generated-image-${index + 1}.png`;
      const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      // Convert base64 to blob
      const response = await fetch(contentUrl);
      const blob = await response.blob();

      if (isMobile && navigator.share) {
        // Use Web Share API for mobile - works on iOS Safari and modern Android
        const file = new File([blob], fileName, { type: blob.type });
        try {
          await navigator.share({
            files: [file],
          });
          return;
        } catch (shareError: any) {
          // User cancelled or share not supported, fall through to download
          if (shareError.name !== 'AbortError') {
            console.log('Share failed:', shareError);
          }
        }
      }

      // Standard download for desktop or if share fails
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
      alert(`Failed to download ${isVideo ? 'video' : 'image'}`);
    }
  };

  return (
    <div className="min-h-screen h-full bg-[#0f0a0a] flex flex-col overflow-y-auto pb-24">
      {/* Light Rays Background - only show during generation */}
      {generating && (
        <div className="absolute inset-0 z-0">
          <LightRays />
        </div>
      )}

      <div className="flex-1 pt-4 px-4 flex flex-col items-center z-10">
        {/* Logo */}
        <div className="mb-6">
          <Logo size={72} />
        </div>

        {/* Status Message */}
        {(generating || error) && (
          <div className="w-full text-center mb-4">
            {generating && (
              <p className="text-white text-lg font-medium">
                {isVideo ? 'Generating video (this may take a few minutes)...' : 'Generating...'}
              </p>
            )}
            {error && (
              <p className="text-red-400 text-lg font-medium">{error}</p>
            )}
          </div>
        )}

        {/* Grid of Images/Videos or Skeletons */}
        <div className={isVideo ? "w-full mb-4" : "grid md:grid-cols-2 w-full gap-2 mb-4"}>
          {generating || error ? (
            // Show skeleton loaders
            Array.from({ length: isVideo ? 1 : 4 }).map((_, index) => (
              <div
                key={index}
                className={`relative rounded-3xl overflow-hidden bg-black/40 ${isVideo ? 'w-full aspect-video' : 'aspect-[3/4]'}`}
              >
                <Skeleton className="w-full h-full" />
                {/* Download Icon Placeholder */}
                <div className="absolute bottom-6 right-6 w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Download className="w-6 h-6 text-white/40" />
                </div>
              </div>
            ))
          ) : isVideo ? (
            // Show video
            content?.map((videoUrl, index) => (
              <div
                key={index}
                className="relative aspect-video rounded-3xl overflow-hidden bg-black"
              >
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Download Button */}
                <button
                  onClick={() => handleDownload(videoUrl, index)}
                  className="absolute bottom-6 right-6 w-10 h-10 bg-white rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <Download className="w-6 h-6 text-black" />
                </button>
              </div>
            ))
          ) : (
            // Show images
            content?.map((imageUrl, index) => (
              <div
                key={index}
                className="relative rounded-3xl overflow-hidden bg-black flex items-center justify-center"
              >
                <img
                  src={imageUrl}
                  alt={`Generated image ${index + 1}`}
                  className="w-full h-auto rounded-3xl"
                />

                {/* Download Button */}
                <button
                  onClick={() => handleDownload(imageUrl, index)}
                  className="absolute bottom-6 right-6 w-10 h-10 bg-white rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <Download className="w-6 h-6 text-black" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Back Button */}
      <div className=" p-4 self-center">
        <button
          onClick={onBack}
          className="bg-white text-black px-8 py-4 rounded-2xl font-semibold hover:bg-gray-100 transition-colors min-w-[272px]"
        >
          Back to Generate
        </button>
      </div>
    </div>
  );
}
