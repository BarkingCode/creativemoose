/**
 * InstructionOverlay Component
 *
 * Full-screen overlay showing how to use the app.
 * Displayed on first visit after splash, accessible via info icon.
 *
 * Features:
 * - 3-step visual guide (Camera, Choose Preset, Get Results)
 * - CTA button to start creating
 * - Note about free generations for anonymous users
 * - Dismissible by tapping CTA or background
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Camera, Palette, Sparkles, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const INSTRUCTIONS_SEEN_KEY = "photoapp_instructions_seen";

interface InstructionOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  freeTriesRemaining?: number;
}

const steps = [
  {
    icon: Camera,
    title: "Take a Photo",
    desc: "Use your camera or upload",
  },
  {
    icon: Palette,
    title: "Choose a Preset",
    desc: "Pick a Canadian theme",
  },
  {
    icon: Sparkles,
    title: "Get 4 Variations",
    desc: "AI generates 4 unique images",
  },
];

export function InstructionOverlay({
  isOpen,
  onClose,
  freeTriesRemaining = 2,
}: InstructionOverlayProps) {
  const handleClose = () => {
    // Mark instructions as seen
    if (typeof window !== "undefined") {
      localStorage.setItem(INSTRUCTIONS_SEEN_KEY, "true");
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6"
          onClick={handleClose}
        >
          {/* Content Container - prevent close on content click */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Logo */}
            <div className="flex justify-center mb-8">
              <Image
                src="/logo.webp"
                alt="PhotoApp"
                width={80}
                height={80}
                className="rounded-2xl shadow-lg"
              />
            </div>

            {/* Title */}
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8">
              Create AI Profile Photos
            </h2>

            {/* Steps */}
            <div className="space-y-6 mb-8">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 * (index + 1) }}
                  className="flex items-center gap-4"
                >
                  {/* Step Number & Icon */}
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                      <step.icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-white text-black text-sm font-bold flex items-center justify-center">
                      {index + 1}
                    </div>
                  </div>

                  {/* Text */}
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className="text-white/60 text-sm">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA Button */}
            <Button
              onClick={handleClose}
              size="lg"
              className="w-full bg-white text-black hover:bg-gray-100 rounded-2xl h-14 text-lg font-semibold"
            >
              Start Creating
            </Button>

            {/* Free note */}
            {freeTriesRemaining > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center text-white/50 text-sm mt-4"
              >
                {freeTriesRemaining} free{" "}
                {freeTriesRemaining === 1 ? "generation" : "generations"}, no
                signup required
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Check if instructions have been seen
 */
export function hasInstructionsBeenSeen(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(INSTRUCTIONS_SEEN_KEY) === "true";
}

/**
 * Reset instructions seen state (for testing)
 */
export function resetInstructionsSeen(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(INSTRUCTIONS_SEEN_KEY);
  }
}
