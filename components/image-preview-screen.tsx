/**
 * ImagePreviewScreen Component
 *
 * Full-screen image preview with actions (share, save, delete).
 * Supports swipe navigation between images in a batch.
 *
 * Features:
 * - Full-screen image view with pinch-to-zoom (via native)
 * - Share to Feed toggle
 * - Save to Photos (download)
 * - Delete with confirmation
 * - Swipe left/right to navigate batch
 */

"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Trash2,
  Globe,
  Lock,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface ImageData {
  id: string;
  imageUrl: string;
  isPublic: boolean;
  storagePath?: string | null;
}

interface ImagePreviewScreenProps {
  images: ImageData[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onShareToggle?: (imageId: string, isPublic: boolean) => Promise<boolean>;
  onDelete?: (imageId: string) => Promise<boolean>;
  canEdit?: boolean;
}

export function ImagePreviewScreen({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  onShareToggle,
  onDelete,
  canEdit = true,
}: ImagePreviewScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localImages, setLocalImages] = useState(images);

  const currentImage = localImages[currentIndex];
  const hasMultiple = localImages.length > 1;

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < localImages.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleShareToggle = async () => {
    if (!onShareToggle || isUpdating) return;

    setIsUpdating(true);
    try {
      const success = await onShareToggle(currentImage.id, !currentImage.isPublic);
      if (success) {
        // Update local state
        setLocalImages((prev) =>
          prev.map((img) =>
            img.id === currentImage.id
              ? { ...img, isPublic: !img.isPublic }
              : img
          )
        );
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(currentImage.imageUrl);
      const blob = await response.blob();
      const fileName = `photoapp-${currentImage.id.slice(0, 8)}.png`;

      // Check for mobile share API
      const isMobile =
        typeof navigator !== "undefined" &&
        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile && navigator.share) {
        const file = new File([blob], fileName, { type: blob.type });
        try {
          await navigator.share({ files: [file] });
          return;
        } catch (shareError: any) {
          if (shareError.name !== "AbortError") {
            console.log("Share failed, falling back to download");
          }
        }
      }

      // Standard download
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
    }
  };

  const handleDelete = async () => {
    if (!onDelete || isDeleting) return;

    setIsDeleting(true);
    try {
      const success = await onDelete(currentImage.id);
      if (success) {
        // Remove from local state
        const newImages = localImages.filter((img) => img.id !== currentImage.id);

        if (newImages.length === 0) {
          // No more images, close preview
          onClose();
        } else {
          // Adjust current index if needed
          setLocalImages(newImages);
          if (currentIndex >= newImages.length) {
            setCurrentIndex(newImages.length - 1);
          }
        }
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (!currentImage) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black flex flex-col"
        >
          {/* Header */}
          <header className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div className="flex items-center gap-2">
              {hasMultiple && (
                <span className="text-white/60 text-sm">
                  {currentIndex + 1} / {localImages.length}
                </span>
              )}

              <button
                onClick={handleDownload}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
              >
                <Download className="w-5 h-5 text-white" />
              </button>
            </div>
          </header>

          {/* Image Container */}
          <div className="flex-1 flex items-center justify-center relative">
            {/* Navigation Arrows */}
            {hasMultiple && currentIndex > 0 && (
              <button
                onClick={goToPrevious}
                className="absolute left-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
            )}

            {hasMultiple && currentIndex < localImages.length - 1 && (
              <button
                onClick={goToNext}
                className="absolute right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            )}

            {/* Image */}
            <motion.div
              key={currentImage.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full h-full relative"
            >
              <Image
                src={currentImage.imageUrl}
                alt="Preview"
                fill
                className="object-contain"
                priority
              />
            </motion.div>
          </div>

          {/* Actions Footer */}
          {canEdit && (
            <footer className="absolute bottom-0 left-0 right-0 p-4 pb-safe bg-gradient-to-t from-black/80 to-transparent">
              <div className="max-w-md mx-auto space-y-4">
                {/* Share Toggle */}
                {onShareToggle && (
                  <div className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      {currentImage.isPublic ? (
                        <Globe className="w-5 h-5 text-green-400" />
                      ) : (
                        <Lock className="w-5 h-5 text-white/60" />
                      )}
                      <span className="text-white font-medium">
                        {currentImage.isPublic ? "Shared to Feed" : "Private"}
                      </span>
                    </div>
                    <Switch
                      checked={currentImage.isPublic}
                      onCheckedChange={handleShareToggle}
                      disabled={isUpdating}
                    />
                  </div>
                )}

                {/* Delete Button */}
                {onDelete && (
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={isDeleting}
                    className="w-full h-12 bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl"
                  >
                    <Trash2 className="w-5 h-5 mr-2" />
                    Delete Image
                  </Button>
                )}
              </div>
            </footer>
          )}

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent className="bg-neutral-900 border-white/10 text-white">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Image</AlertDialogTitle>
                <AlertDialogDescription className="text-white/60">
                  Are you sure you want to delete this image? This action cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-red-500 text-white hover:bg-red-600"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Delete"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
