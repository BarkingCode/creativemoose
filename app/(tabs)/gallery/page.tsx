/**
 * Gallery Page
 *
 * Displays the current user's generated images.
 * Features share toggle, delete, and image preview.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  GalleryImageCard,
  GalleryImageCardSkeleton,
} from "@/components/gallery-image-card";
import { ImagePreviewScreen } from "@/components/image-preview-screen";
import { Logo } from "@/components/logo";
import { UserButton } from "@/components/auth/user-button";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Plus } from "lucide-react";
import Link from "next/link";

interface GalleryImage {
  id: string;
  generation_batch_id: string;
  image_url: string;
  storage_path: string | null;
  preset_id: string;
  style_id: string | null;
  image_index: number;
  is_public: boolean;
  is_free_generation: boolean;
  created_at: string;
}

export default function GalleryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );
  const limit = 20;

  const fetchImages = useCallback(
    async (reset = false) => {
      if (!user) return;

      try {
        const currentOffset = reset ? 0 : offset;
        const response = await fetch(
          `/api/gallery?limit=${limit}&offset=${currentOffset}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch gallery");
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
        console.error("Error fetching gallery:", error);
      } finally {
        setLoading(false);
      }
    },
    [user, offset]
  );

  useEffect(() => {
    if (user) {
      fetchImages(true);
    }
  }, [user]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchImages();
    }
  };

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleShareToggle = async (
    imageId: string,
    isPublic: boolean
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: isPublic }),
      });

      if (!response.ok) {
        throw new Error("Failed to update share status");
      }

      // Update local state
      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId ? { ...img, is_public: isPublic } : img
        )
      );

      return true;
    } catch (error) {
      console.error("Error toggling share:", error);
      return false;
    }
  };

  const handleDelete = async (imageId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete image");
      }

      // Update local state
      setImages((prev) => prev.filter((img) => img.id !== imageId));

      return true;
    } catch (error) {
      console.error("Error deleting image:", error);
      return false;
    }
  };

  // Transform images for preview screen
  const previewImages = images.map((img) => ({
    id: img.id,
    imageUrl: img.image_url,
    isPublic: img.is_public,
    storagePath: img.storage_path,
  }));

  return (
    <div className="min-h-screen bg-[#0f0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0f0a0a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Logo size={40} />
          <h1 className="text-white font-semibold text-lg">My Photos</h1>
          <UserButton />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        {loading && images.length === 0 ? (
          // Initial loading state
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <GalleryImageCardSkeleton key={i} />
            ))}
          </div>
        ) : images.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <ImageIcon className="w-10 h-10 text-white/20" />
            </div>
            <h2 className="text-white text-lg font-medium mb-2">
              No photos yet
            </h2>
            <p className="text-white/50 text-sm max-w-xs mb-6">
              Create your first AI-generated photo to see it here.
            </p>
            <Link href="/generate">
              <Button className="bg-white text-black hover:bg-gray-100 rounded-full">
                <Plus className="w-5 h-5 mr-2" />
                Start Creating
              </Button>
            </Link>
          </div>
        ) : (
          // Image grid
          <>
            <div className="grid grid-cols-2 gap-3">
              {images.map((image, index) => (
                <GalleryImageCard
                  key={image.id}
                  id={image.id}
                  imageUrl={image.image_url}
                  presetId={image.preset_id}
                  styleId={image.style_id}
                  isPublic={image.is_public}
                  createdAt={image.created_at}
                  imageIndex={image.image_index}
                  batchId={image.generation_batch_id}
                  onClick={() => handleImageClick(index)}
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
      {selectedImageIndex !== null && (
        <ImagePreviewScreen
          images={previewImages}
          initialIndex={selectedImageIndex}
          isOpen={selectedImageIndex !== null}
          onClose={() => setSelectedImageIndex(null)}
          onShareToggle={handleShareToggle}
          onDelete={handleDelete}
          canEdit={true}
        />
      )}
    </div>
  );
}
