/**
 * Landing Page - Anonymous Camera-First Experience
 *
 * For anonymous users: Shows camera with 2 free generations
 * For authenticated users: Redirects to tab-based home (/home)
 *
 * Flow:
 * 1. First visit → Splash screen → Instructions overlay → Camera
 * 2. Return visit → Camera directly (splash/instructions skipped)
 * 3. After 2 free tries → Login prompt modal
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useAnonymousCredits } from "@/hooks/useAnonymousCredits";
import { SplashScreen, hasSplashBeenSeen } from "@/components/splash-screen";
import {
  InstructionOverlay,
  hasInstructionsBeenSeen,
} from "@/components/instruction-overlay";
import { LoginPromptModal } from "@/components/login-prompt-modal";
import { CameraView } from "@/components/camera-view";
import { CameraControls } from "@/components/camera-controls";
import { ResultsPage } from "@/components/results-page";
import { useCamera } from "@/hooks/useCamera";
import { usePhotoCapture } from "@/hooks/usePhotoCapture";
import { getPreset, getPresetPromptsWithStyle } from "@/lib/presets";
import { PhotoStyleId, DEFAULT_PHOTO_STYLE } from "@/lib/photo-styles";
import { Info } from "lucide-react";

export default function LandingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Anonymous credits tracking
  const {
    freeTriesRemaining,
    hasFreeTriesLeft,
    hasExhaustedFreeTries,
    useFreeTry,
    isReady: creditsReady,
  } = useAnonymousCredits();

  // UI State
  const [showSplash, setShowSplash] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Generation state
  const [selectedPreset, setSelectedPreset] = useState<string>("mapleAutumn");
  const [selectedStyle, setSelectedStyle] =
    useState<PhotoStyleId>(DEFAULT_PHOTO_STYLE);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Camera hooks
  const { stream, videoRef, canvasRef, stopCamera, restartCamera } =
    useCamera(isMounted);

  // Mark component as mounted
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Redirect authenticated users to home tab
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/home");
    }
  }, [authLoading, user, router]);

  // Determine preset type
  const selectedPresetData = getPreset(selectedPreset);
  const selectedPresetType = selectedPresetData?.type || "image";

  // Handle splash complete
  const handleSplashComplete = () => {
    setShowSplash(false);
    // Show instructions if not seen before
    if (!hasInstructionsBeenSeen()) {
      setShowInstructions(true);
    }
  };

  // Handle photo capture and generation
  const handleGenerate = async (photo: File) => {
    // Check if user has free tries
    if (!hasFreeTriesLeft) {
      setShowLoginModal(true);
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("photo", photo);
      formData.append("presetId", selectedPreset);
      formData.append("styleId", selectedStyle);

      const response = await fetch("/api/preview", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "RATE_LIMITED") {
          setShowLoginModal(true);
          setError(null);
        } else {
          setError(data.error || "Generation failed");
        }
        return;
      }

      // Consume a free try
      useFreeTry();

      // Set results
      setResults(data.images);
    } catch (err) {
      console.error("Generation error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // Photo capture hook
  const { photo, photoPreview, capturePhoto, resetPhoto } = usePhotoCapture({
    videoRef,
    canvasRef,
    stream,
    stopCamera,
    onCapture: handleGenerate,
  });

  // Handle back from results
  const handleBackToCapture = async () => {
    setResults(null);
    setError(null);
    resetPhoto();
    await restartCamera();
  };

  // Handle capture button click
  const handleCaptureClick = () => {
    // Check free tries before capture
    if (!hasFreeTriesLeft) {
      setShowLoginModal(true);
      return;
    }
    capturePhoto();
  };

  // Handle generate click (if photo already captured)
  const handleGenerateClick = async () => {
    if (!hasFreeTriesLeft) {
      setShowLoginModal(true);
      return;
    }
    if (photo) {
      await handleGenerate(photo);
    }
  };

  // Show loading while checking auth
  if (authLoading || !isMounted || !creditsReady) {
    return (
      <div className="h-screen w-screen bg-[#0f0a0a] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Authenticated users will be redirected
  if (user) {
    return null;
  }

  // Show results if we have them
  if (results || generating || error) {
    return (
      <ResultsPage
        images={results}
        onBack={handleBackToCapture}
        generating={generating}
        error={error}
        generatingType={selectedPresetType}
      />
    );
  }

  return (
    <div className="h-screen w-screen bg-[#0f0a0a] overflow-hidden">
      {/* Splash Screen */}
      <SplashScreen onComplete={handleSplashComplete} />

      {/* Instructions Overlay */}
      <InstructionOverlay
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        freeTriesRemaining={freeTriesRemaining}
      />

      {/* Login Prompt Modal */}
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => router.push("/home")}
      />

      {/* Main Camera View */}
      <div className="h-full w-full flex flex-col items-center justify-between p-4 gap-4">
        {/* Info Button - Top Right */}
        <button
          onClick={() => setShowInstructions(true)}
          className="absolute top-6 right-6 z-30 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <Info className="w-5 h-5 text-white" />
        </button>

        {/* Camera View */}
        <CameraView
          videoRef={videoRef}
          canvasRef={canvasRef}
          photoPreview={photoPreview}
          isSignedIn={false}
          freeCredits={freeTriesRemaining}
          selectedPreset={selectedPreset}
          onPresetChange={setSelectedPreset}
          generating={generating}
        />

        {/* Free Tries Banner */}
        {freeTriesRemaining > 0 && (
          <div className="absolute bottom-32 left-0 right-0 flex justify-center px-4 z-20">
            <div className="bg-emerald-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs font-medium">
              {freeTriesRemaining} free{" "}
              {freeTriesRemaining === 1 ? "try" : "tries"} remaining
            </div>
          </div>
        )}

        {/* Camera Controls */}
        <CameraControls
          isSignedIn={false}
          credits={null}
          videoCredits={null}
          photoPreview={photoPreview}
          generating={generating}
          stream={stream}
          selectedPresetType={selectedPresetType}
          hasCredits={hasFreeTriesLeft}
          selectedStyle={selectedStyle}
          onCapture={handleCaptureClick}
          onGenerate={handleGenerateClick}
          onPurchase={() => setShowLoginModal(true)}
          onStyleChange={setSelectedStyle}
        />
      </div>
    </div>
  );
}
