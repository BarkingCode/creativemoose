/**
 * useAppUpdates Hook
 *
 * Checks for EAS updates and applies them without requiring app restart.
 * - Checks for updates on app launch and when app comes to foreground
 * - Downloads updates in background
 * - Prompts user to reload or auto-reloads for critical updates
 *
 * Usage:
 * - Add to root layout to enable automatic update checking
 * - Updates are applied immediately after download (with user prompt)
 */

import { useEffect, useCallback, useState, useRef } from "react";
import { AppState, AppStateStatus, Alert } from "react-native";
import * as Updates from "expo-updates";

interface UseAppUpdatesOptions {
  /** Whether to show an alert before reloading (default: true) */
  showAlert?: boolean;
  /** Whether to check when app comes to foreground (default: true) */
  checkOnForeground?: boolean;
  /** Minimum time between checks in ms (default: 5 minutes) */
  minCheckInterval?: number;
}

interface UseAppUpdatesReturn {
  /** Whether an update is currently being checked/downloaded */
  isChecking: boolean;
  /** Whether an update is available and ready to apply */
  isUpdateReady: boolean;
  /** Manually trigger an update check */
  checkForUpdate: () => Promise<void>;
  /** Apply the downloaded update (reloads the app) */
  applyUpdate: () => Promise<void>;
}

const DEFAULT_MIN_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useAppUpdates(options: UseAppUpdatesOptions = {}): UseAppUpdatesReturn {
  const {
    showAlert = true,
    checkOnForeground = true,
    minCheckInterval = DEFAULT_MIN_CHECK_INTERVAL,
  } = options;

  const [isChecking, setIsChecking] = useState(false);
  const [isUpdateReady, setIsUpdateReady] = useState(false);
  const lastCheckTime = useRef<number>(0);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  /**
   * Apply the downloaded update by reloading the app
   */
  const applyUpdate = useCallback(async () => {
    try {
      await Updates.reloadAsync();
    } catch (error) {
      console.error("[Updates] Failed to reload app:", error);
    }
  }, []);

  /**
   * Check for updates and download if available
   */
  const checkForUpdate = useCallback(async () => {
    // Skip in development mode
    if (__DEV__) {
      console.log("[Updates] Skipping update check in development mode");
      return;
    }

    // Throttle checks
    const now = Date.now();
    if (now - lastCheckTime.current < minCheckInterval) {
      console.log("[Updates] Skipping check - too soon since last check");
      return;
    }

    setIsChecking(true);
    lastCheckTime.current = now;

    try {
      console.log("[Updates] Checking for updates...");
      const checkResult = await Updates.checkForUpdateAsync();

      if (checkResult.isAvailable) {
        console.log("[Updates] Update available, downloading...");

        // Download the update
        const fetchResult = await Updates.fetchUpdateAsync();

        if (fetchResult.isNew) {
          console.log("[Updates] Update downloaded successfully");
          setIsUpdateReady(true);

          if (showAlert) {
            Alert.alert(
              "Update Available",
              "A new version has been downloaded. Would you like to restart to apply the update?",
              [
                {
                  text: "Later",
                  style: "cancel",
                  onPress: () => {
                    console.log("[Updates] User deferred update");
                  },
                },
                {
                  text: "Restart Now",
                  onPress: applyUpdate,
                },
              ],
              { cancelable: false }
            );
          } else {
            // Auto-apply without prompt
            await applyUpdate();
          }
        }
      } else {
        console.log("[Updates] App is up to date");
      }
    } catch (error) {
      // Don't show error to user - updates are non-critical
      console.warn("[Updates] Error checking for updates:", error);
    } finally {
      setIsChecking(false);
    }
  }, [showAlert, applyUpdate, minCheckInterval]);

  /**
   * Check for updates on app launch
   */
  useEffect(() => {
    // Small delay to let app initialize first
    const timer = setTimeout(() => {
      checkForUpdate();
    }, 2000);

    return () => clearTimeout(timer);
  }, [checkForUpdate]);

  /**
   * Check for updates when app comes to foreground
   */
  useEffect(() => {
    if (!checkOnForeground) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        console.log("[Updates] App came to foreground, checking for updates...");
        checkForUpdate();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [checkOnForeground, checkForUpdate]);

  return {
    isChecking,
    isUpdateReady,
    checkForUpdate,
    applyUpdate,
  };
}

/**
 * Standalone function to check and apply updates silently
 * Use this for critical updates that should apply automatically
 */
export async function checkAndApplyUpdates(): Promise<boolean> {
  if (__DEV__) return false;

  try {
    const checkResult = await Updates.checkForUpdateAsync();

    if (checkResult.isAvailable) {
      const fetchResult = await Updates.fetchUpdateAsync();

      if (fetchResult.isNew) {
        await Updates.reloadAsync();
        return true;
      }
    }

    return false;
  } catch (error) {
    console.warn("[Updates] Silent update check failed:", error);
    return false;
  }
}
