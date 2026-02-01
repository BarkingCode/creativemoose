/**
 * Biometrics Utility
 *
 * Core biometric authentication utilities using expo-local-authentication.
 *
 * Features:
 * - Check biometric availability and type
 * - Get user-friendly biometric name (Face ID, Touch ID)
 * - Perform biometric authentication
 * - Silent fallback when no hardware available
 */

import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

export type BiometricType = "facial" | "fingerprint" | "iris" | "none";

export interface BiometricStatus {
  isAvailable: boolean;
  biometricType: BiometricType;
  isEnrolled: boolean;
}

/**
 * Get the current biometric status
 */
export async function getBiometricStatus(): Promise<BiometricStatus> {
  try {
    // Check if hardware is available
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return { isAvailable: false, biometricType: "none", isEnrolled: false };
    }

    // Check if biometrics are enrolled
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      return { isAvailable: false, biometricType: "none", isEnrolled: false };
    }

    // Get supported authentication types
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let biometricType: BiometricType = "none";
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = "facial";
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = "fingerprint";
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometricType = "iris";
    }

    return {
      isAvailable: biometricType !== "none",
      biometricType,
      isEnrolled: true,
    };
  } catch (error) {
    console.error("[Biometrics] Error checking status:", error);
    return { isAvailable: false, biometricType: "none", isEnrolled: false };
  }
}

/**
 * Quick check if biometrics are available
 */
export async function isBiometricAvailable(): Promise<boolean> {
  const status = await getBiometricStatus();
  return status.isAvailable;
}

/**
 * Get user-friendly biometric name based on type and platform
 */
export function getBiometricName(biometricType: BiometricType): string {
  switch (biometricType) {
    case "facial":
      return Platform.OS === "ios" ? "Face ID" : "Face Unlock";
    case "fingerprint":
      return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
    case "iris":
      return "Iris Scanner";
    default:
      return "Biometrics";
  }
}

/**
 * Perform biometric authentication
 *
 * @param promptMessage - Message to show in the authentication prompt
 * @returns true if authenticated successfully, false otherwise
 */
export async function authenticateWithBiometrics(
  promptMessage: string = "Authenticate to continue"
): Promise<boolean> {
  try {
    const status = await getBiometricStatus();
    if (!status.isAvailable) {
      // Silent fallback - no hardware or not enrolled
      return true;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Cancel",
      disableDeviceFallback: false, // Allow passcode as fallback
      fallbackLabel: "Use Passcode",
    });

    return result.success;
  } catch (error) {
    console.error("[Biometrics] Authentication error:", error);
    return false;
  }
}
