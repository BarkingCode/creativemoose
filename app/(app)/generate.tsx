/**
 * Generate Screen
 *
 * Main screen for photo generation. Features:
 * - Camera preview with real-time view
 * - Preset selector (horizontal carousel)
 * - Style picker (bottom sheet)
 * - Capture button to take photo
 * - Credits display
 */

import { useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useAuth } from "../../contexts/AuthContext";
import { useRevenueCat } from "../../contexts/RevenueCatContext";
import { Image as ImageIcon, RefreshCw } from "lucide-react-native";
import { HeaderButton } from "../../components/HeaderButton";
import { StyleSwiper } from "../../components/StyleSwiper";
import { FilterSwiper } from "../../components/FilterSwiper";
import { PRESET_PICKER_OPTIONS, STYLE_PICKER_OPTIONS } from "../../shared/presets";

// Max dimension for API uploads (keeps base64 under ~500KB)
const MAX_IMAGE_DIMENSION = 1024;

/**
 * Resize image to max dimension while maintaining aspect ratio
 */
async function resizeImageForUpload(uri: string): Promise<{ uri: string; base64: string }> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_IMAGE_DIMENSION } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  return { uri: result.uri, base64: result.base64 || "" };
}

export default function GenerateScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { credits } = useRevenueCat();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESET_PICKER_OPTIONS[0].id);
  const [selectedStyle, setSelectedStyle] = useState<string>(STYLE_PICKER_OPTIONS[0].id);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [facing, setFacing] = useState<CameraType>("front");

  // Flash animation for capture effect
  const flashOpacity = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    // Check credits
    const totalCredits = (credits?.free_credits || 0) + (credits?.image_credits || 0);
    if (totalCredits <= 0) {
      router.push("/(app)/purchase");
      return;
    }

    setIsCapturing(true);

    // Trigger flash effect
    flashOpacity.value = withSequence(
      withTiming(0.7, { duration: 50 }),   // Quick brighten
      withTiming(0, { duration: 150 })     // Fade out
    );

    try {
      // Take photo (without base64 - we'll resize first)
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
      });

      if (photo) {
        // Resize image for API upload (keeps payload small)
        const resized = await resizeImageForUpload(photo.uri);
        console.log("[GenerateScreen] Image resized, base64 size:", Math.round(resized.base64.length / 1024), "KB");

        // Navigate to results with resized photo data
        router.replace({
          pathname: "/(app)/results",
          params: {
            photoUri: resized.uri,
            photoBase64: resized.base64,
            presetId: selectedPreset,
            styleId: selectedStyle,
          },
        });
      }
    } catch (error) {
      console.error("Failed to capture photo:", error);
      Alert.alert("Error", "Failed to capture photo. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePickImage = async () => {
    // Check credits
    const totalCredits = (credits?.free_credits || 0) + (credits?.image_credits || 0);
    if (totalCredits <= 0) {
      router.push("/(app)/purchase");
      return;
    }

    setIsPickingImage(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        // Resize image for API upload (keeps payload small)
        const resized = await resizeImageForUpload(asset.uri);
        console.log("[GenerateScreen] Image resized, base64 size:", Math.round(resized.base64.length / 1024), "KB");

        router.replace({
          pathname: "/(app)/results",
          params: {
            photoUri: resized.uri,
            photoBase64: resized.base64,
            presetId: selectedPreset,
            styleId: selectedStyle,
          },
        });
      }
    } finally {
      setIsPickingImage(false);
    }
  };

  // Permission handling
  if (!permission) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-white text-xl font-bold text-center mb-4">
            Camera Access Needed
          </Text>
          <Text className="text-muted-foreground text-center mb-8">
            PhotoApp needs camera access to capture photos for AI generation
          </Text>
          <Pressable
            onPress={requestPermission}
            className="bg-white py-4 px-8 rounded-2xl"
          >
            <Text className="text-background font-semibold text-lg">
              Grant Permission
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const totalCredits = (credits?.free_credits || 0) + (credits?.image_credits || 0);

  return (
    <View className="flex-1 bg-background">
      {/* Full-screen loading overlay - shows immediately on capture */}
      {isCapturing && (
        <View className="absolute inset-0 z-50 bg-background/90 items-center justify-center">
          <ActivityIndicator size="large" color="#fff" />
          <Text className="text-white text-lg font-semibold mt-4">
            Capturing...
          </Text>
        </View>
      )}

      {/* Camera layer */}
      <CameraView
        ref={cameraRef}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        facing={facing}
        mode="picture"
      />

      {/* Flash overlay for capture effect */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "white",
            zIndex: 40,
          },
          flashStyle,
        ]}
      />

      {/* UI overlay layer */}
      <SafeAreaView className="flex-1">
        {/* Top Bar */}
        <View className="flex-row items-center justify-center px-4 pt-2 relative">
          {/* Close button - absolute positioned left */}
          {/* Use replace() to go directly to home, avoiding stack pollution issues */}
          <HeaderButton
            variant="close"
            onPress={() => router.replace("/(tabs)/home")}
            className="absolute left-4"
          />

          {/* Centered Logo */}
          <Image
            source={require("../../assets/logo.png")}
            style={{ width: 120, height: 40 }}
            contentFit="contain"
          />

          {/* Credits - absolute positioned right */}
          <View className="absolute right-4">
            <View className="bg-neutral-900/80 px-3 py-2 rounded-[20px]">
              <Text className="text-white font-semibold text-sm">
                {totalCredits} {totalCredits === 1 ? "credit" : "credits"}
              </Text>
            </View>
          </View>
        </View>

        {/* Style Swiper - left side */}
        <StyleSwiper
          styles={STYLE_PICKER_OPTIONS}
          selectedStyleId={selectedStyle}
          onStyleChange={setSelectedStyle}
        />

        {/* Spacer */}
        <View className="flex-1" />

        {/* Bottom Controls */}
        <View className="pb-4">
          {/* Preset Selector - Centered swipeable */}
          <View className="mb-4">
            <FilterSwiper
              filters={PRESET_PICKER_OPTIONS}
              selectedFilterId={selectedPreset}
              onFilterChange={setSelectedPreset}
            />
          </View>

          {/* Action Buttons Row */}
          <View className="relative">
            <View className="flex-row items-center justify-center px-4">
              {/* Gallery Button */}
              <Pressable
                onPress={handlePickImage}
                disabled={isPickingImage}
                className="bg-neutral-900/80 w-14 h-14 rounded-full items-center justify-center"
              >
                {isPickingImage ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <View pointerEvents="none">
                    <ImageIcon color="white" size={24} />
                  </View>
                )}
              </Pressable>

              {/* Capture Button */}
              <Pressable
                onPress={handleCapture}
                disabled={isCapturing}
                className="w-20 h-20 rounded-full border-4 border-white items-center justify-center mx-6"
              >
                {isCapturing ? (
                  <ActivityIndicator color="white" size="large" />
                ) : (
                  <View className="w-16 h-16 rounded-full bg-white" />
                )}
              </Pressable>

              {/* Placeholder for symmetry */}
              <View className="w-14 h-14" />
            </View>

            {/* Flip Camera Button - aligned with shutter button */}
            <Pressable
              onPress={() => setFacing(facing === "front" ? "back" : "front")}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-neutral-900/80 w-10 h-10 rounded-full items-center justify-center"
            >
              <View pointerEvents="none">
                <RefreshCw color="white" size={20} />
              </View>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
