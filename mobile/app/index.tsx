/**
 * Landing Page - Anonymous Camera-First Experience
 *
 * For anonymous users: Shows camera with 2 free generations
 * For authenticated users: Redirects to tab-based home
 *
 * Flow:
 * 1. First visit → Splash screen → Instructions overlay → Camera
 * 2. Return visit → Camera directly (splash/instructions skipped)
 * 3. Capture/pick image → Generate images → Navigate to /preview-results
 * 4. Credit consumed ONLY after successful generation
 * 5. Return to camera with 0 tries → Redirect to sign-up
 * 6. Initial open with 0 tries → Camera shows, but capture shows "Sign Up" prompt
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "expo-image";
import { useAuth } from "../contexts/AuthContext";
import { useRevenueCat } from "../contexts/RevenueCatContext";
import { SplashScreen, hasSplashBeenSeen } from "../components/SplashScreen";
import {
  InstructionOverlay,
  hasInstructionsBeenSeen,
} from "../components/InstructionOverlay";
import { Info, Image as ImageIcon, RefreshCw } from "lucide-react-native";
import { StyleSwiper } from "../components/StyleSwiper";
import { FilterSwiper } from "../components/FilterSwiper";
import { PRESET_PICKER_OPTIONS } from "../shared/presets";
import { STYLE_PICKER_OPTIONS } from "../shared/photo-styles";

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

export default function LandingScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAnonymous } = useAuth();
  const { credits, isLoadingCredits, refreshCredits } = useRevenueCat();
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  // Calculate available credits from Supabase (works for both anonymous and authenticated)
  const totalCredits = (credits?.free_credits ?? 0) + (credits?.image_credits ?? 0);
  const hasCredits = totalCredits > 0;
  const creditsReady = !isLoadingCredits && user !== null;

  // Debug: Log credit state changes
  useEffect(() => {
    if (creditsReady) {
      console.log("[LandingScreen] Credits ready:", {
        totalCredits,
        hasCredits,
        isAnonymous,
      });
    }
  }, [creditsReady, totalCredits, hasCredits, isAnonymous]);

  // UI State
  const [showSplash, setShowSplash] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Camera state
  const [permission, requestPermission] = useCameraPermissions();
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESET_PICKER_OPTIONS[0].id);
  const [selectedStyle, setSelectedStyle] = useState<string>(STYLE_PICKER_OPTIONS[0].id);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [facing, setFacing] = useState<CameraType>("front");

  // Frozen frame state (shows captured photo while navigating)
  const [frozenPhotoUri, setFrozenPhotoUri] = useState<string | null>(null);

  // Clear frozen frame when leaving screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        setFrozenPhotoUri(null);
      };
    }, [])
  );

  // Refresh credits when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        refreshCredits();
      }
    }, [user?.id, refreshCredits])
  );

  // Mark mounted
  useEffect(() => {
    setIsMounted(true);
    checkFirstVisit();
  }, []);

  // Check if first visit
  const checkFirstVisit = async () => {
    const splashSeen = await hasSplashBeenSeen();
    if (splashSeen) {
      setShowSplash(false);
      const instructionsSeen = await hasInstructionsBeenSeen();
      if (!instructionsSeen) {
        setShowInstructions(true);
      }
    }
  };

  // Track if initial redirect has happened to prevent multiple redirects
  const hasRedirected = useRef(false);

  // Redirect non-anonymous authenticated users to tabs (users who linked their account)
  useEffect(() => {
    if (!authLoading && user && !isAnonymous && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace("/(tabs)/home");
    }
  }, [authLoading, user, isAnonymous, router]);


  // Handle splash complete
  const handleSplashComplete = async () => {
    setShowSplash(false);
    const instructionsSeen = await hasInstructionsBeenSeen();
    if (!instructionsSeen) {
      setShowInstructions(true);
    }
  };

  // Handle photo capture
  const handleCapture = async () => {
    if (!cameraRef.current) return;

    // Check if user has credits
    if (!hasCredits) {
      Alert.alert(
        "No Credits",
        "Purchase credits to generate more images!",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Get Credits", onPress: () => router.push("/(app)/purchase") },
        ]
      );
      return;
    }

    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
      });

      if (photo) {
        // Freeze frame immediately after capture
        setFrozenPhotoUri(photo.uri);

        // Resize image for API upload (keeps payload small)
        const resized = await resizeImageForUpload(photo.uri);
        console.log("[LandingScreen] Image resized, base64 size:", Math.round(resized.base64.length / 1024), "KB");

        await handleGenerate(resized.base64, resized.uri);
      }
    } catch (err) {
      console.error("Capture error:", err);
      setFrozenPhotoUri(null); // Clear on error
      Alert.alert("Error", "Failed to capture photo. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle image from gallery
  const handlePickImage = async () => {
    // Check if user has credits
    if (!hasCredits) {
      Alert.alert(
        "No Credits",
        "Purchase credits to generate more images!",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Get Credits", onPress: () => router.push("/(app)/purchase") },
        ]
      );
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
        console.log("[LandingScreen] Image resized, base64 size:", Math.round(resized.base64.length / 1024), "KB");
        await handleGenerate(resized.base64, resized.uri);
      }
    } finally {
      setIsPickingImage(false);
    }
  };

  // Navigate to unified results screen with photo params
  // Generation happens in results.tsx (handles both anonymous and authenticated)
  const handleGenerate = async (base64: string, uri: string) => {
    router.push({
      pathname: "/results",
      params: {
        photoUri: uri,
        photoBase64: base64,
        presetId: selectedPreset,
        styleId: selectedStyle,
      },
    });
  };


  // Loading state
  if (authLoading || !isMounted || !creditsReady) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  // Non-anonymous authenticated users will be redirected to tabs
  if (user && !isAnonymous) {
    return null;
  }

  // Permission handling
  if (!permission) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-white text-[22px] font-bold text-center mb-3">
            Camera Access Needed
          </Text>
          <Text className="text-white/60 text-base text-center mb-8">
            PhotoApp needs camera access to capture photos for AI generation
          </Text>
          <Pressable
            onPress={requestPermission}
            className="bg-white py-4 px-8 rounded-2xl"
          >
            <Text className="text-background font-semibold text-base">
              Grant Permission
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Only render camera when screen is focused and not showing overlays
  const shouldShowCamera = isFocused && !showSplash && !showInstructions;

  return (
    <View className="flex-1 bg-background">
      {/* Splash Screen */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      {/* Instruction Overlay */}
      <InstructionOverlay
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        freeTriesRemaining={totalCredits}
      />

      {/* Camera View - only rendered when focused and not showing overlays */}
      {shouldShowCamera ? (
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing={facing}
          mode="picture"
        >
        <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
          {/* Top Bar */}
          <View className="flex-row items-center justify-between px-4 pt-2" style={{ zIndex: 20 }}>
            {/* Spacer for symmetry */}
            <View className="w-10 h-10" />

            {/* Centered Logo */}
            <Image
              source={require("../assets/logo.png")}
              style={{ width: 120, height: 40 }}
              contentFit="contain"
            />

            {/* Info button */}
            <TouchableOpacity
              onPress={() => setShowInstructions(true)}
              activeOpacity={0.7}
              style={{
                backgroundColor: 'rgba(23, 23, 23, 0.8)',
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View pointerEvents="none">
                <Info color="white" size={20} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Style Swiper - left side */}
          <StyleSwiper
            styles={STYLE_PICKER_OPTIONS}
            selectedStyleId={selectedStyle}
            onStyleChange={setSelectedStyle}
          />

          <View className="flex-1" />

          {/* Credits Banner */}
          {totalCredits > 0 && (
            <View className="self-center bg-emerald-500/90 px-4 py-2 rounded-[20px] mb-4">
              <Text className="text-white text-[13px] font-semibold">
                {totalCredits} credit{totalCredits === 1 ? "" : "s"} remaining
              </Text>
            </View>
          )}
          {totalCredits === 0 && creditsReady && (
            <Pressable 
              onPress={() => router.push("/(app)/purchase")}
              className="self-center bg-amber-500/90 px-4 py-2 rounded-[20px] mb-4"
            >
              <Text className="text-white text-[13px] font-semibold">
                Get credits to generate →
              </Text>
            </Pressable>
          )}

          {/* Bottom Controls */}
          <View className="pb-6">
            {/* Preset Selector - Centered swipeable */}
            <View className="mb-4">
              <FilterSwiper
                filters={PRESET_PICKER_OPTIONS}
                selectedFilterId={selectedPreset}
                onFilterChange={setSelectedPreset}
              />
            </View>

            {/* Action Buttons */}
            <View className="relative">
              <View className="flex-row items-center justify-center px-4">
                <Pressable
                  onPress={handlePickImage}
                  disabled={isPickingImage}
                  className="bg-neutral-900/80 w-14 h-14 rounded-full items-center justify-center"
                >
                  {isPickingImage ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <ImageIcon color="white" size={24} />
                  )}
                </Pressable>

                <Pressable
                  onPress={handleCapture}
                  disabled={isCapturing}
                  className="w-20 h-20 rounded-full border-4 border-white items-center justify-center mx-6"
                >
                  <View
                    className={`w-16 h-16 rounded-full bg-white ${isCapturing ? "opacity-50" : ""}`}
                  />
                </Pressable>

                {/* Placeholder for symmetry */}
                <View className="w-14 h-14" />
              </View>

              {/* Flip Camera - aligned with shutter button */}
              <Pressable
                onPress={() => setFacing(facing === "front" ? "back" : "front")}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-neutral-900/80 w-10 h-10 rounded-full items-center justify-center"
              >
                <RefreshCw color="white" size={20} />
              </Pressable>
            </View>

            {/* Account Link - for anonymous users to preserve data across devices */}
            {isAnonymous && (
              <Pressable
                onPress={() => router.push("/(auth)/sign-in")}
                className="self-center mt-5"
              >
                <Text className="text-white/60 text-sm">
                  Link account to save across devices
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </CameraView>
      ) : (
        /* Placeholder when camera is not active */
        <View style={{ flex: 1 }} />
      )}

      {/* Frozen frame overlay - displays captured photo instantly */}
      {frozenPhotoUri && (
        <Image
          source={{ uri: frozenPhotoUri }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 45,
          }}
          contentFit="cover"
        />
      )}

    </View>
  );
}
