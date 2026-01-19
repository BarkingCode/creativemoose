/**
 * SplashScreen Component
 *
 * Full-screen branded splash shown on first app visit.
 * Features logo animation and fade-out transition.
 *
 * Props:
 * - onComplete: Callback when splash animation finishes
 */

import React, { useEffect } from "react";
import { View, Image } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SPLASH_SEEN_KEY = "photoapp_splash_seen";

interface SplashScreenProps {
  onComplete: () => void;
}

/**
 * Check if splash has been shown before
 */
export async function hasSplashBeenSeen(): Promise<boolean> {
  try {
    const seen = await AsyncStorage.getItem(SPLASH_SEEN_KEY);
    return seen === "true";
  } catch {
    return false;
  }
}

/**
 * Mark splash as seen
 */
async function markSplashAsSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(SPLASH_SEEN_KEY, "true");
  } catch (error) {
    console.error("Error marking splash as seen:", error);
  }
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    // Logo fade in and scale
    logoOpacity.value = withTiming(1, { duration: 500 });
    logoScale.value = withSequence(
      withTiming(1.1, { duration: 400, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 200 })
    );

    // Fade out after delay
    containerOpacity.value = withDelay(
      1800,
      withTiming(0, { duration: 400 }, (finished) => {
        if (finished) {
          runOnJS(markSplashAsSeen)();
          runOnJS(onComplete)();
        }
      })
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View
      className="absolute inset-0 bg-background z-[100] justify-center items-center"
      style={containerAnimatedStyle}
    >
      <View className="items-center justify-center">
        <Animated.View style={logoAnimatedStyle}>
          <Image
            source={require("../assets/logo.png")}
            className="w-[120px] h-[120px]"
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}
