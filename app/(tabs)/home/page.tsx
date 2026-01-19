/**
 * Home Feed Page
 *
 * Displays publicly shared images from all users.
 * Features infinite scroll pagination and pull-to-refresh (future).
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { FeedImageCard, FeedImageCardSkeleton } from "@/components/feed-image-card";
import { ImagePreviewScreen } from "@/components/image-preview-screen";
import { Logo } from "@/components/logo";
import { UserButton } from "@/components/auth/user-button";
import { Image as ImageIcon } from "lucide-react";

interface FeedImage {
  id: string;
  user_id: string;
  generation_batch_id: string;
  image_url: string;
  preset_id: string;
  created_at: string;
  user_avatar_url: string | null;
  user_name: string | null;
}

export default function HomePage() {
  const { user } = useAuth();
  const [images, setImages] = useState<FeedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [selectedImage, setSelectedImage] = useState<FeedImage | null>(null);
  const limit = 20;

  const fetchImages = useCallback(async (reset = false) => {
    try {
      const currentOffset = reset ? 0 : offset;
      const response = await fetch(
        `/api/feed?limit=${limit}&offset=${currentOffset}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch feed");
      }

      const data = await response.json();

      if (reset) {
        setImages(data.images);
        setOffset(data.images.length);
      } else {
        setImages((prev) => [...prev, ...data.images]);
        setOffset((prev) => prev + data.images.length);
      }

      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => {
    fetchImages(true);
  }, []);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchImages();
    }
  };

  const handleImageClick = (image: FeedImage) => {
    setSelectedImage(image);
  };

  return (
    <div className="min-h-screen bg-[#0f0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0f0a0a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Logo size={40} />
          <h1 className="text-white font-semibold text-lg">Discover</h1>
          <UserButton />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        {loading && images.length === 0 ? (
          // Initial loading state
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <FeedImageCardSkeleton key={i} />
            ))}
          </div>
        ) : images.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <ImageIcon className="w-10 h-10 text-white/20" />
            </div>
            <h2 className="text-white text-lg font-medium mb-2">
              No shared photos yet
            </h2>
            <p className="text-white/50 text-sm max-w-xs">
              Be the first to share your AI-generated photos with the community!
            </p>
          </div>
        ) : (
          // Image grid
          <>
            <div className="grid grid-cols-2 gap-3">
              {images.map((image) => (
                <FeedImageCard
                  key={image.id}
                  id={image.id}
                  imageUrl={image.image_url}
                  presetId={image.preset_id}
                  createdAt={image.created_at}
                  userAvatarUrl={image.user_avatar_url}
                  userName={image.user_name}
                  onClick={() => handleImageClick(image)}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="py-8 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-6 py-3 bg-white/10 text-white rounded-full text-sm font-medium hover:bg-white/20 transition-colors disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Image Preview */}
      {selectedImage && (
        <ImagePreviewScreen
          images={[
            {
              id: selectedImage.id,
              imageUrl: selectedImage.image_url,
              isPublic: true,
            },
          ]}
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          canEdit={false}
        />
      )}
    </div>
  );
}
