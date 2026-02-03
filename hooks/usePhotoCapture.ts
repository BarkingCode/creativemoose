/**
 * usePhotoCapture Hook
 *
 * Handles photo capture logic from camera stream.
 * Manages photo state and preview generation.
 */

import { useState } from "react";

interface UseCaptureProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  stream: MediaStream | null;
  stopCamera: () => void;
  onCapture: (file: File) => void;
}

export function usePhotoCapture({
  videoRef,
  canvasRef,
  stream,
  stopCamera,
  onCapture,
}: UseCaptureProps) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Flip the canvas horizontally to match the mirrored video display
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0);
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
          setPhoto(file);
          setPhotoPreview(canvas.toDataURL("image/jpeg"));

          // Stop camera stream
          stopCamera();

          // Trigger callback with captured file
          onCapture(file);
        }
      }, "image/jpeg");
    }
  };

  const resetPhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
  };

  return {
    photo,
    photoPreview,
    capturePhoto,
    resetPhoto,
  };
}
