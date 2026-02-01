/**
 * BiometricLockContext
 *
 * Context provider managing app-level biometric lock state.
 *
 * Features:
 * - Tracks lock state (locked/unlocked)
 * - Manages user preference for biometric lock
 * - AppState listener to lock on background→foreground
 * - Provides unlock function with biometric authentication
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  getBiometricStatus,
  getBiometricName,
  authenticateWithBiometrics,
  BiometricType,
} from "../lib/biometrics";
import {
  getBiometricLockEnabled,
  setBiometricLockEnabled,
} from "../lib/biometric-settings";

interface BiometricLockContextType {
  /** Whether the app is currently locked */
  isLocked: boolean;
  /** Whether biometric lock is enabled by user */
  isEnabled: boolean;
  /** Whether biometric hardware is available */
  isAvailable: boolean;
  /** Type of biometric (facial, fingerprint, etc.) */
  biometricType: BiometricType;
  /** User-friendly name (Face ID, Touch ID, etc.) */
  biometricName: string;
  /** Trigger biometric auth to unlock */
  unlock: () => Promise<boolean>;
  /** Toggle biometric lock setting */
  setEnabled: (enabled: boolean) => Promise<void>;
  /** Loading state for initial check */
  isLoading: boolean;
}

const BiometricLockContext = createContext<BiometricLockContextType | undefined>(
  undefined
);

interface BiometricLockProviderProps {
  children: ReactNode;
}

export function BiometricLockProvider({ children }: BiometricLockProviderProps) {
  const [isLocked, setIsLocked] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>("none");
  const [isLoading, setIsLoading] = useState(true);

  // Track app state for foreground detection
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  // Initialize on mount
  useEffect(() => {
    initializeBiometrics();
  }, []);

  // Listen for app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [isEnabled, appState]);

  /**
   * Initialize biometric status and preferences
   */
  const initializeBiometrics = async () => {
    try {
      const [status, enabled] = await Promise.all([
        getBiometricStatus(),
        getBiometricLockEnabled(),
      ]);

      setIsAvailable(status.isAvailable);
      setBiometricType(status.biometricType);
      setIsEnabled(enabled);

      // If lock was enabled and biometrics available, start locked
      if (enabled && status.isAvailable) {
        setIsLocked(true);
      }
    } catch (error) {
      console.error("[BiometricLock] Initialization error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle app state changes (background → foreground)
   */
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    // Lock when coming back from background if enabled
    if (
      appState.match(/inactive|background/) &&
      nextAppState === "active" &&
      isEnabled
    ) {
      setIsLocked(true);
    }
    setAppState(nextAppState);
  };

  /**
   * Attempt to unlock with biometric authentication
   */
  const unlock = useCallback(async (): Promise<boolean> => {
    if (!isLocked) return true;

    const biometricName = getBiometricName(biometricType);
    const success = await authenticateWithBiometrics(
      `Unlock Creative Moose with ${biometricName}`
    );

    if (success) {
      setIsLocked(false);
    }

    return success;
  }, [isLocked, biometricType]);

  /**
   * Toggle the biometric lock setting
   */
  const handleSetEnabled = useCallback(async (enabled: boolean) => {
    // If enabling, verify biometrics work first
    if (enabled) {
      const biometricName = getBiometricName(biometricType);
      const success = await authenticateWithBiometrics(
        `Enable ${biometricName} lock`
      );
      if (!success) {
        // User cancelled or auth failed, don't enable
        return;
      }
    }

    await setBiometricLockEnabled(enabled);
    setIsEnabled(enabled);

    // If disabling, ensure we're not locked
    if (!enabled) {
      setIsLocked(false);
    }
  }, [biometricType]);

  const value: BiometricLockContextType = {
    isLocked,
    isEnabled,
    isAvailable,
    biometricType,
    biometricName: getBiometricName(biometricType),
    unlock,
    setEnabled: handleSetEnabled,
    isLoading,
  };

  return (
    <BiometricLockContext.Provider value={value}>
      {children}
    </BiometricLockContext.Provider>
  );
}

/**
 * Hook to access biometric lock context
 */
export function useBiometricLock(): BiometricLockContextType {
  const context = useContext(BiometricLockContext);
  if (context === undefined) {
    throw new Error("useBiometricLock must be used within a BiometricLockProvider");
  }
  return context;
}
