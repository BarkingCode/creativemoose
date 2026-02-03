/**
 * CameraControls Component
 *
 * Bottom control bar with credit display and capture/generate button.
 * Shows purchase button instead of shutter when user lacks credits for selected preset type.
 */

"use client";

import { PhotoStyleId } from "@/lib/photo-styles";
import { StylePicker } from "./style-picker";

interface CameraControlsProps {
  isSignedIn: boolean;
  credits: number | null;
  videoCredits: number | null;
  photoPreview: string | null;
  generating: boolean;
  stream: MediaStream | null;
  selectedPresetType: 'image' | 'video';
  hasCredits: boolean;
  selectedStyle: PhotoStyleId;
  onCapture: () => void;
  onGenerate: () => void;
  onPurchase: () => void;
  onStyleChange: (styleId: PhotoStyleId) => void;
}

export function CameraControls({
  isSignedIn,
  credits,
  videoCredits,
  photoPreview,
  generating,
  stream,
  selectedPresetType,
  hasCredits,
  selectedStyle,
  onCapture,
  onGenerate,
  onPurchase,
  onStyleChange,
}: CameraControlsProps) {
  const displayCredits = selectedPresetType === 'video' ? videoCredits : credits;

  return (
    <div className="w-full flex items-center justify-between px-2">
      {/* Credit Display */}
      {isSignedIn && displayCredits !== null ? (
        <p className="text-sm text-white font-normal w-20">
          {selectedPresetType === 'video' ? 'Video' : 'Credit'}: {displayCredits}
        </p>
      ) : (
        <div className="w-20" />
      )}

      {/* Camera/Generate Button OR Purchase Button */}
      {photoPreview && !hasCredits ? (
        <button
          onClick={onPurchase}
          className="px-6 py-3 rounded-full bg-white text-black font-semibold hover:bg-gray-100 transition-colors"
        >
          Purchase Credits
        </button>
      ) : (
        <button
          onClick={photoPreview ? onGenerate : onCapture}
          disabled={generating || (!stream && !photoPreview)}
          className="w-16 h-16 rounded-full bg-black border-4 border-white p-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
        >
          <div className="w-full h-full rounded-full bg-gradient-to-b from-red-900 to-red-600" />
        </button>
      )}

      {/* Style Picker */}
      <div className="w-20 flex justify-end">
        <StylePicker
          selectedStyle={selectedStyle}
          onStyleChange={onStyleChange}
        />
      </div>
    </div>
  );
}
