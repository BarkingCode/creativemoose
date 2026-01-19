/**
 * GalleryImageCard Component
 *
 * Displays a user's own image in their gallery.
 * Shows share status indicator and click to open preview.
 *
 * Features:
 * - Share status indicator (globe icon if public)
 * - Lazy loading with skeleton
 * - Click to open full preview
 * - Batch grouping visual (optional)
 */

"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Globe, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface GalleryImageCardProps {
  id: string;
  imageUrl: string;
  presetId: string;
  styleId?: string | null;
  isPublic: boolean;
  createdAt: string;
  imageIndex: number;
  batchId: string;
  onClick?: () => void;
}

export function GalleryImageCard({
  id,
  imageUrl,
  presetId,
  styleId,
  isPublic,
  createdAt,
  imageIndex,
  batchId,
  onClick,
}: GalleryImageCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="relative rounded-2xl overflow-hidden bg-[#1a1517] border border-white/5 cursor-pointer group"
      onClick={onClick}
    >
      {/* Image */}
      <div className="aspect-[3/4] relative">
        {!isLoaded && !hasError && (
          <Skeleton className="absolute inset-0 bg-white/5" />
        )}

        {hasError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/5">
            <span className="text-white/40 text-sm">Failed to load</span>
          </div>
        ) : (
          <Image
            src={imageUrl}
            alt={`Generated image ${imageIndex + 1}`}
            fill
            className={cn(
              "object-cover transition-all duration-300",
              isLoaded ? "opacity-100" : "opacity-0",
              "group-hover:scale-105"
            )}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        )}

        {/* Share Status Indicator */}
        <div
          className={cn(
            "absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center",
            "backdrop-blur-sm transition-opacity",
            isPublic ? "bg-green-500/80" : "bg-black/40"
          )}
        >
          {isPublic ? (
            <Globe className="w-4 h-4 text-white" />
          ) : (
            <Lock className="w-3 h-3 text-white/60" />
          )}
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-sm font-medium">View</span>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Skeleton version for loading states
 */
export function GalleryImageCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-[#1a1517] border border-white/5">
      <Skeleton className="aspect-[3/4] bg-white/5" />
    </div>
  );
}

/**
 * Batch header to group 4 images from same generation
 */
export function GalleryBatchHeader({
  presetId,
  createdAt,
}: {
  presetId: string;
  createdAt: string;
}) {
  const date = new Date(createdAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });

  // Format preset name for display
  const presetName = presetId
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();

  return (
    <div className="col-span-2 flex items-center gap-2 py-2">
      <div className="h-px flex-1 bg-white/10" />
      <span className="text-white/40 text-xs font-medium">
        {presetName} • {formattedDate}
      </span>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}
