/**
 * BiometricLockScreen Component
 *
 * Full-screen overlay that blocks app content until biometric authentication succeeds.
 *
 * Features:
 * - Dark background hiding app content
 * - App logo centered
 * - "Unlock with Face ID/Touch ID" button
 * - Auto-triggers biometric prompt on mount
 * - Retry button if authentication fails
 */

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBiometricLock } from "../contexts/BiometricLockContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Brand color
const BRAND_RED = "#E63946";

export function BiometricLockScreen() {
  const insets = useSafeAreaInsets();
  const { isLocked, unlock, biometricName, isLoading } = useBiometricLock();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);

  // Track if we've already auto-triggered for this lock session
  const hasAutoTriggeredRef = useRef(false);

  // Reset auto-trigger flag when lock state changes
  useEffect(() => {
    if (!isLocked) {
      hasAutoTriggeredRef.current = false;
      setAuthFailed(false);
    }
  }, [isLocked]);

  // Auto-trigger authentication once when locked
  useEffect(() => {
    if (isLocked && !isLoading && !hasAutoTriggeredRef.current && !isAuthenticating) {
      hasAutoTriggeredRef.current = true;
      handleUnlock();
    }
  }, [isLocked, isLoading]);

  const handleUnlock = async () => {
    if (isAuthenticating) return;

    setIsAuthenticating(true);
    setAuthFailed(false);

    const success = await unlock();

    if (!success) {
      setAuthFailed(true);
    }

    setIsAuthenticating(false);
  };

  // Don't render if not locked or still loading
  if (!isLocked || isLoading) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Background */}
      <View style={styles.background} />

      {/* Content */}
      <View style={styles.content}>
        {/* Logo */}
        <Image
          source={require("../assets/logo.png")}
          style={styles.logo}
          contentFit="contain"
        />

        {/* App Name */}
        <Text style={styles.appName}>Creative Moose</Text>

        {/* Status Message */}
        <Text style={styles.statusText}>
          {authFailed ? "Authentication failed" : "App is locked"}
        </Text>

        {/* Unlock Button */}
        <Pressable
          onPress={handleUnlock}
          disabled={isAuthenticating}
          style={({ pressed }) => [
            styles.unlockButton,
            pressed && styles.unlockButtonPressed,
          ]}
        >
          {isAuthenticating ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.unlockButtonText}>
              {authFailed ? `Try ${biometricName} again` : `Unlock with ${biometricName}`}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0f0a0a",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  appName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: 48,
  },
  unlockButton: {
    backgroundColor: BRAND_RED,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
    minWidth: 200,
    alignItems: "center",
  },
  unlockButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  unlockButtonText: {
    color: "white",
    fontSize: 17,
    fontWeight: "600",
  },
});
