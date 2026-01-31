/**
 * useAnonymousCredits Hook
 *
 * Tracks anonymous user's free generation attempts using AsyncStorage.
 * Anonymous users get 2 free generations before requiring signup.
 *
 * Features:
 * - Persists across app restarts
 * - Tracks remaining tries
 * - Provides methods to consume and check credits
 */

import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "photoapp_anon_credits";
const MAX_FREE_GENERATIONS = 2;

interface AnonymousCreditsData {
  usedCount: number;
  lastUsedAt: string | null;
}

interface UseAnonymousCreditsReturn {
  freeTriesRemaining: number;
  hasFreeTriesLeft: boolean;
  hasExhaustedFreeTries: boolean;
  useFreeTry: () => Promise<boolean>;
  resetCredits: () => Promise<void>;
  isReady: boolean;
}

/**
 * Get credits data from AsyncStorage
 */
async function getCreditsData(): Promise<AnonymousCreditsData> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading anonymous credits:", error);
  }
  return { usedCount: 0, lastUsedAt: null };
}

/**
 * Save credits data to AsyncStorage
 */
async function saveCreditsData(data: AnonymousCreditsData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving anonymous credits:", error);
  }
}

/**
 * Hook for managing anonymous user credits
 */
export function useAnonymousCredits(): UseAnonymousCreditsReturn {
  const [creditsData, setCreditsData] = useState<AnonymousCreditsData>({
    usedCount: 0,
    lastUsedAt: null,
  });
  const [isReady, setIsReady] = useState(false);

  // Load credits on mount
  useEffect(() => {
    const loadCredits = async () => {
      const data = await getCreditsData();
      setCreditsData(data);
      setIsReady(true);
    };
    loadCredits();
  }, []);

  const freeTriesRemaining = Math.max(
    0,
    MAX_FREE_GENERATIONS - creditsData.usedCount
  );
  const hasFreeTriesLeft = freeTriesRemaining > 0;
  const hasExhaustedFreeTries = creditsData.usedCount >= MAX_FREE_GENERATIONS;

  /**
   * Consume one free try
   */
  const useFreeTry = useCallback(async (): Promise<boolean> => {
    if (!hasFreeTriesLeft) return false;

    const newData: AnonymousCreditsData = {
      usedCount: creditsData.usedCount + 1,
      lastUsedAt: new Date().toISOString(),
    };

    await saveCreditsData(newData);
    setCreditsData(newData);
    return true;
  }, [creditsData.usedCount, hasFreeTriesLeft]);

  /**
   * Reset credits (for testing)
   */
  const resetCredits = useCallback(async (): Promise<void> => {
    const newData: AnonymousCreditsData = { usedCount: 0, lastUsedAt: null };
    await saveCreditsData(newData);
    setCreditsData(newData);
  }, []);

  return {
    freeTriesRemaining,
    hasFreeTriesLeft,
    hasExhaustedFreeTries,
    useFreeTry,
    resetCredits,
    isReady,
  };
}

/**
 * Standalone function to check credits (for use outside hooks)
 */
export async function checkAnonymousCredits(): Promise<{
  remaining: number;
  hasCredits: boolean;
}> {
  const data = await getCreditsData();
  const remaining = Math.max(0, MAX_FREE_GENERATIONS - data.usedCount);
  return {
    remaining,
    hasCredits: remaining > 0,
  };
}

/**
 * Standalone function to consume a credit (for use outside hooks)
 */
export async function consumeAnonymousCredit(): Promise<boolean> {
  const data = await getCreditsData();
  if (data.usedCount >= MAX_FREE_GENERATIONS) {
    return false;
  }

  await saveCreditsData({
    usedCount: data.usedCount + 1,
    lastUsedAt: new Date().toISOString(),
  });
  return true;
}
