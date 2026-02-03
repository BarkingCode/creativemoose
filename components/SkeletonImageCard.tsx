/**
 * SkeletonImageCard Component
 *
 * Displays a skeleton loader with shimmer animation while images are being generated.
 * Features:
 * - Shimmer animation using expo-linear-gradient + reanimated
 * - Smooth fade-in transition when image loads
 * - Error state display with retry option
 * - "Generating X..." label showing current generation status
 *
 * Used in the results screen to progressively display images as they arrive.
 */

import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  withDelay,
  interpolate,
} from "react-native-reanimated";
import { AlertCircle, RefreshCw } from "lucide-react-native";

interface SkeletonImageCardProps {
  /** The URL of the generated image, null while loading */
  imageUrl: string | null;
  /** Whether the image is currently being generated */
  isLoading: boolean;
  /** Error message if generation failed */
  error: string | null;
  /** Index of this image (0-3), used for staggered animations */
  index: number;
  /** Optional callback when retry is pressed */
  onRetry?: () => void;
}

const { width: screenWidth } = Dimensions.get("window");
const cardWidth = screenWidth; // Full width edge-to-edge

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export function SkeletonImageCard({
  imageUrl,
  isLoading,
  error,
  index,
  onRetry,
}: SkeletonImageCardProps) {
  // Shimmer animation
  const shimmerTranslate = useSharedValue(-cardWidth);

  // Fade in animation for loaded image
  const imageOpacity = useSharedValue(0);

  useEffect(() => {
    // Start shimmer animation with staggered delay based on index
    shimmerTranslate.value = withDelay(
      index * 100, // Stagger start by 100ms per card
      withRepeat(
        withTiming(cardWidth * 2, {
          duration: 1200,
          easing: Easing.linear,
        }),
        -1, // Infinite repeat
        false
      )
    );
  }, []);

  useEffect(() => {
    // Fade in when image loads
    if (imageUrl && !isLoading) {
      imageOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [imageUrl, isLoading]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerTranslate.value }],
  }));

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
  }));

  if (error) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, styles.errorCard]}>
          <View style={styles.errorContent}>
            <AlertCircle color="#ef4444" size={32} />
            <Text style={styles.errorText}>Failed</Text>
            <Text style={styles.errorSubtext} numberOfLines={2}>
              {error}
            </Text>
            {onRetry && (
              <Pressable onPress={onRetry} style={styles.retryButton}>
                <RefreshCw color="#fff" size={16} />
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  }

  if (imageUrl && !isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Animated.View style={[styles.imageContainer, imageAnimatedStyle]}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={300}
            />
          </Animated.View>
        </View>
      </View>
    );
  }

  // Loading state with shimmer
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.skeletonContainer}>
          {/* Base skeleton color */}
          <View style={styles.skeletonBase} />

          {/* Shimmer overlay */}
          <View style={styles.shimmerMask}>
            <Animated.View style={[styles.shimmerContainer, shimmerStyle]}>
              <LinearGradient
                colors={["transparent", "rgba(255,255,255,0.15)", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 16,
  },
  card: {
    overflow: "hidden",
    backgroundColor: "#1c1c1c",
  },
  errorCard: {
    aspectRatio: 1,
  },
  errorContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
  },
  errorSubtext: {
    color: "#9ca3af",
    fontSize: 12,
    textAlign: "center",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#374151",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    marginTop: 8,
  },
  retryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  imageContainer: {
    aspectRatio: 1,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  skeletonContainer: {
    aspectRatio: 1,
    position: "relative",
  },
  skeletonBase: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#1c1c1c",
  },
  shimmerMask: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  shimmerContainer: {
    width: cardWidth,
    height: "100%",
  },
  shimmerGradient: {
    width: "100%",
    height: "100%",
  },
});
