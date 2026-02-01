/**
 * Haptics Utility
 *
 * Provides haptic feedback functions with platform and low power mode checks.
 * Respects user preference stored in SecureStore.
 *
 * Features:
 * - Light feedback for individual completions
 * - Success/error notifications for final states
 * - Skips on web and when low power mode is enabled
 * - Respects user haptics preference
 */

import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import * as Battery from "expo-battery";
import { getHapticsEnabled } from "./haptic-settings";

/**
 * Check if haptics should be triggered based on:
 * - Platform (not web)
 * - User preference
 * - Low power mode
 */
async function shouldTriggerHaptics(): Promise<boolean> {
  // Skip on web
  if (Platform.OS === "web") {
    return false;
  }

  // Check user preference
  const isEnabled = await getHapticsEnabled();
  if (!isEnabled) {
    return false;
  }

  // Check low power mode
  try {
    const isLowPowerMode = await Battery.isLowPowerModeEnabledAsync();
    if (isLowPowerMode) {
      return false;
    }
  } catch {
    // If we can't check, assume it's fine to trigger
  }

  return true;
}

/**
 * Trigger light impact feedback
 * Use for individual image completion
 */
export async function triggerLightFeedback(): Promise<void> {
  if (await shouldTriggerHaptics()) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

/**
 * Trigger medium impact feedback
 * Use for more significant actions
 */
export async function triggerMediumFeedback(): Promise<void> {
  if (await shouldTriggerHaptics()) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
}

/**
 * Trigger success notification feedback
 * Use when all images complete successfully
 */
export async function triggerSuccessFeedback(): Promise<void> {
  if (await shouldTriggerHaptics()) {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

/**
 * Trigger error notification feedback
 * Use when generation fails
 */
export async function triggerErrorFeedback(): Promise<void> {
  if (await shouldTriggerHaptics()) {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}

/**
 * Trigger warning notification feedback
 * Use for partial failures or warnings
 */
export async function triggerWarningFeedback(): Promise<void> {
  if (await shouldTriggerHaptics()) {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
}
