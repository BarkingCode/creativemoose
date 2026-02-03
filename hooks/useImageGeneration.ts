/**
 * useImageGeneration Hook
 *
 * Manages AI image and video generation flow including API calls, error handling,
 * and state management for generation results.
 */

import { useState } from "react";
import { PhotoStyleId } from "@/lib/photo-styles";

export function useImageGeneration(
  isSignedIn: boolean,
  fetchCredits: () => Promise<void>
) {
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<string[] | null>(null);
  const [videos, setVideos] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const handleGenerate = async (file: File, presetId: string, styleId: PhotoStyleId = 'photorealistic') => {
    if (!file || !presetId) return;

    // Require sign-in for generation
    if (!isSignedIn) {
      const signInButton = document.querySelector(
        "[data-clerk-sign-in]"
      ) as HTMLButtonElement;
      if (signInButton) {
        signInButton.click();
      }
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("presetId", presetId);
      formData.append("styleId", styleId);

      const endpoint = "/api/generate";
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Generation error:", errorData);
        if (res.status === 402) {
          setShowPurchaseModal(true);
          setGenerating(false);
          setError(errorData.error || "Insufficient credits");
        } else {
          setError(errorData.error || "Generation failed");
        }
        return;
      }

      const data = await res.json();
      console.log("Generation response:", data);

      // Set results based on type
      if (data.type === 'video') {
        setVideos(data.videos);
        setResults(null);
      } else {
        setResults(data.images);
        setVideos(null);
      }

      // Refresh credits after successful generation
      await fetchCredits();
    } catch (err) {
      console.error("Error generating images:", err);
      setError("Failed to generate images");
    } finally {
      setGenerating(false);
    }
  };

  const resetGeneration = () => {
    setResults(null);
    setVideos(null);
    setError(null);
  };

  return {
    generating,
    results,
    videos,
    error,
    showPurchaseModal,
    setShowPurchaseModal,
    handleGenerate,
    resetGeneration,
  };
}
