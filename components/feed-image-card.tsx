/**
 * FeedImageCard Component
 *
 * Displays a single image in the public feed.
 * Shows image with user avatar and timestamp.
 *
 * Features:
 * - Lazy loading with skeleton placeholder
 * - Click to open full preview
 * - User attribution with avatar
 * - Relative timestamp
 */

"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface FeedImageCardProps {
  id: string;
  imageUrl: string;
  presetId: string;
  createdAt: string;
  userAvatarUrl?: string | null;
  userName?: string | null;
  onClick?: () => void;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 7) {
    return date.toLocaleDateString();
  } else if (diffDays > 0) {
    return `${diffDays}d ago`;
  } else if (diffHours > 0) {
    return `${diffHours}h ago`;
  } else if (diffMins > 0) {
    return `${diffMins}m ago`;
  } else {
    return "Just now";
  }
}

export function FeedImageCard({
  id,
  imageUrl,
  presetId,
  createdAt,
  userAvatarUrl,
  userName,
  onClick,
}: FeedImageCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-neutral-900 rounded-2xl overflow-hidden border border-white/5"
    >
      {/* Image Container */}
      <div
        className="relative aspect-[3/4] cursor-pointer"
        onClick={onClick}
      >
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
            alt={`AI generated image - ${presetId}`}
            fill
            className={cn(
              "object-cover transition-opacity duration-300",
              isLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        )}
      </div>

      {/* Footer with user info */}
      <div className="p-3 flex items-center gap-3">
        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
          {userAvatarUrl ? (
            <Image
              src={userAvatarUrl}
              alt={userName || "User"}
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/40 text-sm font-medium">
              {(userName || "U")[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* User name and time */}
        <div className="flex-1 min-w-0">
          <p className="text-white/80 text-sm font-medium truncate">
            {userName || "Anonymous"}
          </p>
          <p className="text-white/40 text-xs">{formatRelativeTime(createdAt)}</p>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Skeleton version for loading states
 */
export function FeedImageCardSkeleton() {
  return (
    <div className="bg-neutral-900 rounded-2xl overflow-hidden border border-white/5">
      <Skeleton className="aspect-[3/4] bg-white/5" />
      <div className="p-3 flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-full bg-white/10" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 bg-white/10 mb-1" />
          <Skeleton className="h-3 w-16 bg-white/5" />
        </div>
      </div>
    </div>
  );
}
