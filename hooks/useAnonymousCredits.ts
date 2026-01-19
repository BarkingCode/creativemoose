/**
 * useAnonymousCredits Hook
 *
 * Tracks anonymous user's free generation credits in localStorage.
 * Anonymous users get 2 lifetime free generations.
 * After using all free tries, they're prompted to sign up.
 *
 * Storage key: "photoapp_anon_credits"
 * Format: { used: number, lastUsedAt: string | null }
 */

"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "photoapp_anon_credits";
const MAX_FREE_GENERATIONS = 2;

interface AnonCreditsData {
  used: number;
  lastUsedAt: string | null;
}

interface UseAnonymousCreditsReturn {
  /** Number of free generations remaining (0-2) */
  freeTriesRemaining: number;
  /** Whether user has any free tries left */
  hasFreeTriesLeft: boolean;
  /** Whether user has exhausted all free tries */
  hasExhaustedFreeTries: boolean;
  /** Use one free generation credit */
  useFreeTry: () => boolean;
  /** Reset free tries (for testing/dev only) */
  resetFreeTries: () => void;
  /** Whether the hook is ready (hydrated from localStorage) */
  isReady: boolean;
}

function getStoredCredits(): AnonCreditsData {
  if (typeof window === "undefined") {
    return { used: 0, lastUsedAt: null };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate the structure
      if (typeof parsed.used === "number") {
        return {
          used: parsed.used,
          lastUsedAt: parsed.lastUsedAt || null,
        };
      }
    }
  } catch (e) {
    console.error("Error reading anonymous credits from localStorage:", e);
  }

  return { used: 0, lastUsedAt: null };
}

function setStoredCredits(data: AnonCreditsData): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Error saving anonymous credits to localStorage:", e);
  }
}

export function useAnonymousCredits(): UseAnonymousCreditsReturn {
  const [credits, setCredits] = useState<AnonCreditsData>({
    used: 0,
    lastUsedAt: null,
  });
  const [isReady, setIsReady] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = getStoredCredits();
    setCredits(stored);
    setIsReady(true);
  }, []);

  const freeTriesRemaining = Math.max(0, MAX_FREE_GENERATIONS - credits.used);
  const hasFreeTriesLeft = freeTriesRemaining > 0;
  const hasExhaustedFreeTries = credits.used >= MAX_FREE_GENERATIONS;

  const useFreeTry = useCallback((): boolean => {
    if (!hasFreeTriesLeft) {
      return false;
    }

    const newData: AnonCreditsData = {
      used: credits.used + 1,
      lastUsedAt: new Date().toISOString(),
    };

    setCredits(newData);
    setStoredCredits(newData);

    return true;
  }, [credits.used, hasFreeTriesLeft]);

  const resetFreeTries = useCallback((): void => {
    const newData: AnonCreditsData = { used: 0, lastUsedAt: null };
    setCredits(newData);
    setStoredCredits(newData);
  }, []);

  return {
    freeTriesRemaining,
    hasFreeTriesLeft,
    hasExhaustedFreeTries,
    useFreeTry,
    resetFreeTries,
    isReady,
  };
}

/**
 * Check if user has free tries without using the hook
 * Useful for server-side or one-off checks
 */
export function checkAnonymousCredits(): {
  freeTriesRemaining: number;
  hasFreeTriesLeft: boolean;
} {
  const stored = getStoredCredits();
  const freeTriesRemaining = Math.max(0, MAX_FREE_GENERATIONS - stored.used);
  return {
    freeTriesRemaining,
    hasFreeTriesLeft: freeTriesRemaining > 0,
  };
}

/**
 * Mark one anonymous generation as used
 * Returns true if successful, false if no tries remaining
 */
export function consumeAnonymousCredit(): boolean {
  const stored = getStoredCredits();
  if (stored.used >= MAX_FREE_GENERATIONS) {
    return false;
  }

  setStoredCredits({
    used: stored.used + 1,
    lastUsedAt: new Date().toISOString(),
  });

  return true;
}
