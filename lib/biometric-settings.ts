/**
 * Biometric Settings
 *
 * SecureStore-based preference storage for biometric lock.
 * Default: disabled (false) - users must opt-in
 */

import * as SecureStore from "expo-secure-store";

const BIOMETRIC_LOCK_ENABLED_KEY = "biometric_lock_enabled";

/**
 * Get whether biometric lock is enabled (default: false)
 */
export async function getBiometricLockEnabled(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(BIOMETRIC_LOCK_ENABLED_KEY);
    // Default to false - user must opt-in
    if (value === null) {
      return false;
    }
    return value === "true";
  } catch {
    return false;
  }
}

/**
 * Set whether biometric lock is enabled
 */
export async function setBiometricLockEnabled(enabled: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(BIOMETRIC_LOCK_ENABLED_KEY, enabled ? "true" : "false");
  } catch (error) {
    console.error("[BiometricSettings] Failed to save preference:", error);
  }
}
