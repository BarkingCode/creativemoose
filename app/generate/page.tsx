"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { PurchaseModal } from "@/components/purchase-modal";
import { ResultsPage } from "@/components/results-page";
import { CameraView } from "@/components/camera-view";
import { CameraControls } from "@/components/camera-controls";
import { useCamera } from "@/hooks/useCamera";
import { useCredits } from "@/hooks/useCredits";
import { usePhotoCapture } from "@/hooks/usePhotoCapture";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import { getPreset } from "@/lib/presets";
import { PhotoStyleId, DEFAULT_PHOTO_STYLE } from "@/lib/photo-styles";

export default function GeneratePage() {
  const { isSignedIn, isLoaded } = useUser();
  const [selectedPreset, setSelectedPreset] = useState<string>("mapleAutumn");
  const [isMounted, setIsMounted] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<PhotoStyleId>(DEFAULT_PHOTO_STYLE);

  // Mark component as mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Custom hooks
  const { stream, videoRef, canvasRef, stopCamera, restartCamera } = useCamera(isMounted);
  const {
    credits,
    freeCredits,
    videoCredits,
    videoFreeCredits,
    fetchCredits
  } = useCredits(isSignedIn || false);
  const {
    generating,
    results,
    videos,
    error,
    showPurchaseModal,
    setShowPurchaseModal,
    handleGenerate,
    resetGeneration,
  } = useImageGeneration(isSignedIn || false, fetchCredits);

  // Determine selected preset type and credit availability
  const selectedPresetData = getPreset(selectedPreset);
  const selectedPresetType = selectedPresetData?.type || 'image';

  const hasImageCredits = (freeCredits > 0) || (credits !== null && credits > 0);
  const hasVideoCredits = (videoFreeCredits > 0) || (videoCredits !== null && videoCredits > 0);
  const hasCredits = selectedPresetType === 'video' ? hasVideoCredits : hasImageCredits;

  const { photo, photoPreview, capturePhoto, resetPhoto } = usePhotoCapture({
    videoRef,
    canvasRef,
    stream,
    stopCamera,
    onCapture: (file) => handleGenerate(file, selectedPreset, selectedStyle),
  });

  const handleBackToCapture = async () => {
    // Reset state
    resetGeneration();
    resetPhoto();

    // Refresh credits when going back
    await fetchCredits();

    // Restart camera
    await restartCamera();
  };

  const handleGenerateClick = async () => {
    if (photo) {
      await handleGenerate(photo, selectedPreset, selectedStyle);
    }
  };

  // Show results/loading page if we have results or generating
  if (results || videos || generating || error) {
    return (
      <ResultsPage
        images={results}
        videos={videos}
        onBack={handleBackToCapture}
        generating={generating}
        error={error}
        generatingType={selectedPresetType}
      />
    );
  }

  if (!isMounted) {
    return (
      <div className="h-full w-full bg-[#0f0a0a] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#0f0a0a] flex flex-col items-center justify-between p-4 gap-4 overflow-hidden">
      <CameraView
        videoRef={videoRef}
        canvasRef={canvasRef}
        photoPreview={photoPreview}
        isSignedIn={isSignedIn || false}
        freeCredits={freeCredits}
        selectedPreset={selectedPreset}
        onPresetChange={setSelectedPreset}
        generating={generating}
      />

      <CameraControls
        isSignedIn={isSignedIn || false}
        credits={credits}
        videoCredits={videoCredits}
        photoPreview={photoPreview}
        generating={generating}
        stream={stream}
        selectedPresetType={selectedPresetType}
        hasCredits={hasCredits}
        selectedStyle={selectedStyle}
        onCapture={capturePhoto}
        onGenerate={handleGenerateClick}
        onPurchase={() => setShowPurchaseModal(true)}
        onStyleChange={setSelectedStyle}
      />

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <PurchaseModal
          onClose={() => setShowPurchaseModal(false)}
          onPurchaseComplete={() => {
            setShowPurchaseModal(false);
            handleGenerateClick();
          }}
          defaultCreditType={selectedPresetType}
        />
      )}
    </div>
  );
}
