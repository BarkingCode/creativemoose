/**
 * SplashScreen Component
 *
 * Full-screen branded splash shown on first app visit.
 * Displays logo with tagline and fade-out animation.
 * Uses localStorage to track if user has seen splash before.
 *
 * Props:
 * - onComplete: Callback when splash animation finishes
 * - duration: How long to show splash (default 2000ms)
 */

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const SPLASH_SEEN_KEY = "photoapp_splash_seen";

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
  forceShow?: boolean;
}

export function SplashScreen({
  onComplete,
  duration = 2000,
  forceShow = false,
}: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Check if user has seen splash before
    const hasSeenSplash = localStorage.getItem(SPLASH_SEEN_KEY) === "true";

    if (hasSeenSplash && !forceShow) {
      // Skip splash if already seen
      setShouldRender(false);
      onComplete();
      return;
    }

    // Show splash
    setIsVisible(true);

    // Mark as seen
    localStorage.setItem(SPLASH_SEEN_KEY, "true");

    // Auto-hide after duration
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, forceShow, onComplete]);

  // Handle animation complete
  const handleExitComplete = () => {
    setShouldRender(false);
    onComplete();
  };

  if (!shouldRender) return null;

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed inset-0 z-[100] bg-[#0f0a0a] flex flex-col items-center justify-center"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Image
              src="/logo.webp"
              alt="PhotoApp"
              width={120}
              height={120}
              className="rounded-3xl shadow-2xl"
              priority
            />
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
            className="mt-6 text-white/70 text-lg font-medium tracking-wide"
          >
            AI Profile Photos
          </motion.p>

          {/* Subtle loading indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="absolute bottom-20"
          >
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-white/30"
                  animate={{
                    opacity: [0.3, 1, 0.3],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Reset splash seen state (for testing)
 */
export function resetSplashSeen(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SPLASH_SEEN_KEY);
  }
}

/**
 * Check if splash has been seen
 */
export function hasSplashBeenSeen(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SPLASH_SEEN_KEY) === "true";
}
