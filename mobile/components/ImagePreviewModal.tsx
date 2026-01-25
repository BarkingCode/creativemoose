/**
 * ImagePreviewModal Component
 *
 * Fullscreen modal for viewing generated images with gesture support.
 * Features:
 * - Pinch-to-zoom functionality
 * - Swipe down to dismiss
 * - Bottom action bar: Save, Share to Feed, Native Share
 * - Preview mode handling (hides Share to Feed for anonymous users)
 */

import React, { useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Download, Globe, Share2, ChevronLeft, ChevronRight } from "lucide-react-native";
import { HeaderButton } from "./HeaderButton";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const DISMISS_THRESHOLD = 100;

interface ImagePreviewModalProps {
  visible: boolean;
  imageUrl: string | null;
  imageId: string | null;
  isPreview: boolean; // Hide Share to Feed for preview mode
  onClose: () => void;
  onSave: () => Promise<void>;
  onShareToFeed: () => Promise<void>;
  onNativeShare: () => void;
  // Navigation props for cycling through images
  currentIndex?: number;
  totalImages?: number;
  onPrevious?: () => void;
  onNext?: () => void;
}

export function ImagePreviewModal({
  visible,
  imageUrl,
  imageId,
  isPreview,
  onClose,
  onSave,
  onShareToFeed,
  onNativeShare,
  currentIndex = 0,
  totalImages = 1,
  onPrevious,
  onNext,
}: ImagePreviewModalProps) {
  const insets = useSafeAreaInsets();

  // Animation values
  const backdropOpacity = useSharedValue(0);
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSharing, setIsSharing] = React.useState(false);

  // Animate in when visible
  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      scale.value = 1;
      translateY.value = 0;
      savedScale.value = 1;
    }
  }, [visible]);

  const handleClose = () => {
    backdropOpacity.value = withTiming(0, { duration: 150 });
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 });
    setTimeout(onClose, 200);
  };

  // Pinch gesture for zoom
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      // Clamp scale between 0.5 and 4
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
      } else if (scale.value > 4) {
        scale.value = withSpring(4);
        savedScale.value = 4;
      } else {
        savedScale.value = scale.value;
      }
    });

  // Pan gesture for swipe-to-dismiss
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      // Only allow vertical dragging when not zoomed
      if (savedScale.value <= 1) {
        translateY.value = Math.max(0, e.translationY);
        // Fade backdrop as user drags down
        backdropOpacity.value = 1 - Math.min(translateY.value / DISMISS_THRESHOLD, 0.5);
      }
    })
    .onEnd((e) => {
      if (savedScale.value <= 1 && e.translationY > DISMISS_THRESHOLD) {
        // Dismiss if dragged past threshold
        runOnJS(handleClose)();
      } else {
        // Spring back
        translateY.value = withSpring(0);
        backdropOpacity.value = withTiming(1, { duration: 150 });
      }
    });

  // Combine gestures
  const combinedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  // Double tap to reset zoom
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value !== 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
      } else {
        scale.value = withSpring(2);
        savedScale.value = 2;
      }
    });

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(0, 0, 0, ${backdropOpacity.value * 0.95})`,
  }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareToFeed = async () => {
    Alert.alert(
      "Share to Feed",
      "This will make your image visible to everyone on the public feed. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Share",
          onPress: async () => {
            setIsSharing(true);
            try {
              await onShareToFeed();
            } finally {
              setIsSharing(false);
            }
          },
        },
      ]
    );
  };

  if (!visible || !imageUrl) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[styles.container, backdropStyle]}>
          {/* Close button */}
          <HeaderButton
            variant="close"
            size="lg"
            background="glass"
            onPress={handleClose}
            style={[styles.closeButton, { top: insets.top + 12 }]}
          />

          {/* Left chevron navigation */}
          {onPrevious && currentIndex > 0 && (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonLeft]}
              onPress={onPrevious}
              activeOpacity={0.7}
            >
              <ChevronLeft color="white" size={32} />
            </TouchableOpacity>
          )}

          {/* Image with gestures */}
          <GestureDetector gesture={Gesture.Exclusive(doubleTapGesture, combinedGesture)}>
            <Animated.View style={[styles.imageContainer, animatedImageStyle]}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                contentFit="contain"
                transition={200}
              />
            </Animated.View>
          </GestureDetector>

          {/* Right chevron navigation */}
          {onNext && currentIndex < totalImages - 1 && (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonRight]}
              onPress={onNext}
              activeOpacity={0.7}
            >
              <ChevronRight color="white" size={32} />
            </TouchableOpacity>
          )}

          {/* Image counter indicator */}
          {totalImages > 1 && (
            <View style={[styles.counterContainer, { top: insets.top + 16 }]}>
              <Text style={styles.counterText}>
                {currentIndex + 1} / {totalImages}
              </Text>
            </View>
          )}

          {/* Bottom action bar */}
          <View style={[styles.actionBar, { paddingBottom: insets.bottom + 16 }]}>
            {/* Save button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Download color="white" size={22} />
                  <Text style={styles.actionText}>Save</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Share to Feed - only show for authenticated users with a valid imageId */}
            {!isPreview && imageId && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleShareToFeed}
                disabled={isSharing}
                activeOpacity={0.7}
              >
                {isSharing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Globe color="white" size={22} />
                    <Text style={styles.actionText}>Share to Feed</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Native Share */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onNativeShare}
              activeOpacity={0.7}
            >
              <Share2 color="white" size={22} />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    right: 16,
    zIndex: 10,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH, // Square aspect ratio
  },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingTop: 16,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  actionButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 80,
    gap: 6,
  },
  actionText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  navButton: {
    position: "absolute",
    top: "50%",
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  navButtonLeft: {
    left: 16,
  },
  navButtonRight: {
    right: 16,
  },
  counterContainer: {
    position: "absolute",
    left: 16,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  counterText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});
