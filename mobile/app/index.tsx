/**
 * Landing Page - Anonymous Camera-First Experience
 *
 * For anonymous users: Shows camera with 2 free generations
 * For authenticated users: Redirects to tab-based home
 *
 * Flow:
 * 1. First visit → Splash screen → Instructions overlay → Camera
 * 2. Return visit → Camera directly (splash/instructions skipped)
 * 3. After 2 free tries → Login prompt modal
 */

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../contexts/AuthContext";
import { useAnonymousCredits } from "../hooks/useAnonymousCredits";
import { SplashScreen, hasSplashBeenSeen } from "../components/SplashScreen";
import {
  InstructionOverlay,
  hasInstructionsBeenSeen,
} from "../components/InstructionOverlay";
import { LoginPromptModal } from "../components/LoginPromptModal";
import { Info, Image as ImageIcon, RefreshCw } from "lucide-react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

const PRESETS = [
  { id: "mapleAutumn", name: "Maple Autumn", emoji: "🍁" },
  { id: "winterWonderland", name: "Winter", emoji: "❄️" },
  { id: "northernLights", name: "Aurora", emoji: "🌌" },
  { id: "cottageLife", name: "Cottage", emoji: "🏕️" },
  { id: "urbanCanada", name: "Urban", emoji: "🏙️" },
  { id: "wildernessExplorer", name: "Wilderness", emoji: "🏔️" },
  { id: "editorialCanada", name: "Editorial", emoji: "📸" },
  { id: "canadianWildlifeParty", name: "Wildlife", emoji: "🦫" },
  { id: "ehEdition", name: "Eh Edition", emoji: "🍁" },
  { id: "withus", name: "With Us", emoji: "👥" },
];

const STYLES = [
  { id: "photorealistic", name: "Photo", emoji: "📷" },
  { id: "cartoon", name: "Cartoon", emoji: "🎨" },
  { id: "vintage50s", name: "50s Vibe", emoji: "📺" },
  { id: "cinematic", name: "Cinematic", emoji: "🎬" },
  { id: "oil-painting", name: "Oil Paint", emoji: "🖼️" },
  { id: "watercolor", name: "Watercolor", emoji: "💧" },
];

export default function LandingScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const cameraRef = useRef<CameraView>(null);

  // Anonymous credits
  const {
    freeTriesRemaining,
    hasFreeTriesLeft,
    useFreeTry,
    isReady: creditsReady,
  } = useAnonymousCredits();

  // UI State
  const [showSplash, setShowSplash] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Camera state
  const [permission, requestPermission] = useCameraPermissions();
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0].id);
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0].id);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facing, setFacing] = useState<CameraType>("front");

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Redirect authenticated users to tabs
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/(tabs)/home");
    }
  }, [authLoading, user, router]);

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

    if (!hasFreeTriesLeft) {
      setShowLoginModal(true);
      return;
    }

    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (photo) {
        await handleGenerate(photo.base64!, photo.uri);
      }
    } catch (err) {
      console.error("Capture error:", err);
      Alert.alert("Error", "Failed to capture photo. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle image from gallery
  const handlePickImage = async () => {
    if (!hasFreeTriesLeft) {
      setShowLoginModal(true);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await handleGenerate(asset.base64!, asset.uri);
    }
  };

  // Generate preview images
  const handleGenerate = async (base64: string, uri: string) => {
    setGenerating(true);
    setError(null);

    try {
      // Create form data
      const formData = new FormData();
      formData.append("photo", {
        uri: uri,
        type: "image/jpeg",
        name: "photo.jpg",
      } as any);
      formData.append("presetId", selectedPreset);
      formData.append("styleId", selectedStyle);

      const response = await fetch(`${API_URL}/api/preview`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "RATE_LIMITED") {
          setShowLoginModal(true);
          setError(null);
        } else {
          setError(data.error || "Generation failed");
        }
        return;
      }

      // Consume a free try
      await useFreeTry();

      // Navigate to results screen with data
      router.push({
        pathname: "/preview-results",
        params: {
          images: JSON.stringify(data.images),
          isPreview: "true",
        },
      });
    } catch (err) {
      console.error("Generation error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    router.replace("/(tabs)/home");
  };

  // Loading state
  if (authLoading || !isMounted || !creditsReady) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  // Authenticated users will be redirected
  if (user) {
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

  const selectedStyleData = STYLES.find((s) => s.id === selectedStyle);

  return (
    <View className="flex-1 bg-background">
      {/* Splash Screen */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      {/* Instruction Overlay */}
      <InstructionOverlay
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        freeTriesRemaining={freeTriesRemaining}
      />

      {/* Login Prompt Modal */}
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />

      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
        mode="picture"
      >
        <SafeAreaView className="flex-1">
          {/* Top Bar */}
          <View className="flex-row items-center justify-between px-4 pt-2">
            <View className="flex-row items-center">
              <Text className="text-xl bg-[#1a1517]/80 p-2 rounded-xl overflow-hidden">
                📸
              </Text>
              <Text className="text-white font-bold text-lg ml-2">
                PhotoApp
              </Text>
            </View>

            <Pressable
              onPress={() => setShowInstructions(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="bg-[#1a1517]/80 w-10 h-10 rounded-full items-center justify-center"
            >
              <Info color="white" size={20} />
            </Pressable>
          </View>

          <View className="flex-1" />

          {/* Free Tries Banner */}
          {freeTriesRemaining > 0 && (
            <View className="self-center bg-emerald-500/90 px-4 py-2 rounded-[20px] mb-4">
              <Text className="text-white text-[13px] font-semibold">
                {freeTriesRemaining} free{" "}
                {freeTriesRemaining === 1 ? "try" : "tries"} remaining
              </Text>
            </View>
          )}

          {/* Bottom Controls */}
          <View className="pb-6">
            {/* Preset Selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              {PRESETS.map((preset) => (
                <Pressable
                  key={preset.id}
                  onPress={() => setSelectedPreset(preset.id)}
                  className={`flex-row items-center px-4 py-2.5 rounded-[20px] mr-2 ${
                    selectedPreset === preset.id
                      ? "bg-white"
                      : "bg-[#1a1517]/80"
                  }`}
                >
                  <Text className="text-base mr-1.5">{preset.emoji}</Text>
                  <Text
                    className={`font-medium text-sm ${
                      selectedPreset === preset.id
                        ? "text-background"
                        : "text-white"
                    }`}
                  >
                    {preset.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Action Buttons */}
            <View className="flex-row items-center justify-center px-4">
              <Pressable
                onPress={handlePickImage}
                className="bg-[#1a1517]/80 w-14 h-14 rounded-full items-center justify-center"
              >
                <ImageIcon color="white" size={24} />
              </Pressable>

              <Pressable
                onPress={handleCapture}
                disabled={isCapturing || generating}
                className="w-20 h-20 rounded-full border-4 border-white items-center justify-center mx-6"
              >
                {generating ? (
                  <ActivityIndicator color="#0f0a0a" size="large" />
                ) : (
                  <View
                    className={`w-16 h-16 rounded-full bg-white ${
                      isCapturing ? "opacity-50" : ""
                    }`}
                  />
                )}
              </Pressable>

              <Pressable
                onPress={() => setShowStylePicker(!showStylePicker)}
                className="bg-[#1a1517]/80 w-14 h-14 rounded-full items-center justify-center"
              >
                <Text className="text-2xl">{selectedStyleData?.emoji}</Text>
              </Pressable>
            </View>

            {/* Style Picker */}
            {showStylePicker && (
              <View className="mt-4 mx-4 bg-[#1a1517] rounded-2xl p-4">
                <Text className="text-white font-semibold text-base mb-3">
                  Select Style
                </Text>
                <View className="flex-row flex-wrap">
                  {STYLES.map((style) => (
                    <Pressable
                      key={style.id}
                      onPress={() => {
                        setSelectedStyle(style.id);
                        setShowStylePicker(false);
                      }}
                      className={`flex-row items-center px-3.5 py-2.5 rounded-[20px] mr-2 mb-2 ${
                        selectedStyle === style.id ? "bg-white" : "bg-white/10"
                      }`}
                    >
                      <Text className="text-sm mr-1.5">{style.emoji}</Text>
                      <Text
                        className={`font-medium text-[13px] ${
                          selectedStyle === style.id
                            ? "text-background"
                            : "text-white"
                        }`}
                      >
                        {style.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Flip Camera */}
            <Pressable
              onPress={() => setFacing(facing === "front" ? "back" : "front")}
              className="absolute right-4 bottom-[100px] bg-[#1a1517]/80 w-10 h-10 rounded-full items-center justify-center"
            >
              <RefreshCw color="white" size={20} />
            </Pressable>

            {/* Sign In Link */}
            <Pressable
              onPress={() => router.push("/(auth)/sign-in")}
              className="self-center mt-5"
            >
              <Text className="text-white/60 text-sm">
                Already have an account? Sign in
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </CameraView>

      {/* Error display */}
      {error && (
        <View className="absolute bottom-[120px] left-4 right-4 bg-red-500/90 p-3 rounded-xl items-center">
          <Text className="text-white text-sm font-medium">{error}</Text>
        </View>
      )}
    </View>
  );
}
