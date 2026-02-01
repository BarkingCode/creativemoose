/**
 * Haptic Settings
 *
 * SecureStore-based preference storage for haptic feedback.
 * Default: enabled (true)
 */

import * as SecureStore from "expo-secure-store";

const HAPTICS_ENABLED_KEY = "haptics_enabled";

/**
 * Get whether haptics are enabled (default: true)
 */
export async function getHapticsEnabled(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(HAPTICS_ENABLED_KEY);
    // Default to true if not set
    if (value === null) {
      return true;
    }
    return value === "true";
  } catch {
    return true;
  }
}

/**
 * Set whether haptics are enabled
 */
export async function setHapticsEnabled(enabled: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(HAPTICS_ENABLED_KEY, enabled ? "true" : "false");
  } catch (error) {
    console.error("[HapticSettings] Failed to save preference:", error);
  }
}
