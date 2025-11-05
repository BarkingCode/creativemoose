/**
 * CameraView Component
 *
 * Displays the camera feed or captured photo preview.
 * Shows the main video/photo frame with overlays for logo, user button, and presets.
 * Displays banner for image free credits when available.
 */

"use client";

import { Logo } from "@/components/logo";
import { PresetSelector } from "@/components/preset-selector";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { LogIn } from "lucide-react";
import Image from "next/image";

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  photoPreview: string | null;
  isSignedIn: boolean;
  freeCredits: number;
  selectedPreset: string;
  onPresetChange: (preset: string) => void;
  generating: boolean;
}

export function CameraView({
  videoRef,
  canvasRef,
  photoPreview,
  isSignedIn,
  freeCredits,
  selectedPreset,
  onPresetChange,
  generating,
}: CameraViewProps) {
  return (
    <div className="flex-1 w-full rounded-3xl overflow-hidden relative bg-black">
      {photoPreview ? (
        <Image
          src={photoPreview}
          alt="Captured photo"
          fill
          className="object-cover"
        />
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          />
          <canvas ref={canvasRef} className="hidden" />
        </>
      )}

      {/* Generating Overlay */}
      {generating && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-20 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-xl font-medium">Generating...</p>
            <p className="text-white/70 text-sm mt-2">Creating your AI images</p>
          </div>
        </div>
      )}

      {/* Logo Overlay */}
      <div className="absolute top-6 z-10 w-full flex items-center justify-between px-6">
        <div className="w-10"></div>

        <Logo size={72} className="drop-shadow-lg" />

        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                  userButtonPopoverCard: "shadow-xl",
                },
              }}
            />
          ) : (
            <SignInButton
              mode="modal"
              forceRedirectUrl="/generate"
              signUpForceRedirectUrl="/generate"
            >
              <button
                data-clerk-sign-in
                className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gray-100 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            </SignInButton>
          )}
        </div>
      </div>

      {/* Free Credits Banner */}
      {isSignedIn && freeCredits > 0 && (
        <div className="absolute bottom-20 left-0 right-0 flex justify-center px-6">
          <div className="bg-green-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs font-medium">
            🎉 {freeCredits} free {freeCredits === 1 ? "image credit" : "image credits"}{" "}
            remaining
          </div>
        </div>
      )}

      {/* DEV ONLY: Reset Credits Button */}
      {process.env.NODE_ENV === "development" && (
        <button
          onClick={async () => {
            const res = await fetch("/api/reset-credits", { method: "POST" });
            const data = await res.json();
            console.log(data);
            alert("Credits/Rate limit reset! Refresh the page.");
            window.location.reload();
          }}
          className="absolute bottom-20 left-4 w-fit mx-auto z-10 bg-yellow-500 text-black px-3 py-1 rounded text-xs"
        >
          Reset Credits (Dev)
        </button>
      )}

      {/* Preset Buttons - Bottom */}
      <PresetSelector
        selectedPreset={selectedPreset}
        onPresetChange={onPresetChange}
        className="absolute bottom-8 left-0 right-0"
      />
    </div>
  );
}
