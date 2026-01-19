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

import { useState, useRef, useEffect } from "react";
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
import { useAuth } from "../../contexts/AuthContext";
import { supabase, Credits } from "../../lib/supabase";

// Import presets (we'll use a simplified version for now)
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

export default function GenerateScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0].id);
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0].id);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [facing, setFacing] = useState<CameraType>("front");

  // Fetch user credits
  useEffect(() => {
    fetchCredits();
  }, [user]);

  const fetchCredits = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("credits")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setCredits(data);
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    // Check credits
    const totalCredits = (credits?.free_credits || 0) + (credits?.image_credits || 0);
    if (totalCredits <= 0) {
      router.push("/(app)/purchase");
      return;
    }

    setIsCapturing(true);

    try {
      // Take photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (photo) {
        // Navigate to results with photo data
        router.push({
          pathname: "/(app)/results",
          params: {
            photoUri: photo.uri,
            photoBase64: photo.base64,
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      router.push({
        pathname: "/(app)/results",
        params: {
          photoUri: asset.uri,
          photoBase64: asset.base64,
          presetId: selectedPreset,
          styleId: selectedStyle,
        },
      });
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
  const selectedPresetData = PRESETS.find((p) => p.id === selectedPreset);
  const selectedStyleData = STYLES.find((s) => s.id === selectedStyle);

  return (
    <View className="flex-1 bg-background">
      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
        mode="picture"
      >
        {/* Overlay UI */}
        <SafeAreaView className="flex-1">
          {/* Top Bar */}
          <View className="flex-row items-center justify-between px-4 pt-2">
            {/* Logo/Title */}
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-card/80 rounded-xl items-center justify-center">
                <Text className="text-xl">📸</Text>
              </View>
              <Text className="text-white font-bold text-lg ml-2">PhotoApp</Text>
            </View>

            {/* Credits & Settings */}
            <View className="flex-row items-center space-x-2">
              <View className="bg-card/80 px-3 py-2 rounded-full flex-row items-center">
                <Text className="text-white font-semibold">
                  {totalCredits} {totalCredits === 1 ? "credit" : "credits"}
                </Text>
              </View>
              <Pressable
                onPress={signOut}
                className="bg-card/80 w-10 h-10 rounded-full items-center justify-center"
              >
                <Text className="text-lg">👤</Text>
              </Pressable>
            </View>
          </View>

          {/* Spacer */}
          <View className="flex-1" />

          {/* Bottom Controls */}
          <View className="pb-4">
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
                  className={`mr-2 px-4 py-2 rounded-full flex-row items-center ${
                    selectedPreset === preset.id
                      ? "bg-white"
                      : "bg-card/80"
                  }`}
                >
                  <Text className="mr-1">{preset.emoji}</Text>
                  <Text
                    className={`font-medium ${
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

            {/* Action Buttons Row */}
            <View className="flex-row items-center justify-center px-4">
              {/* Gallery Button */}
              <Pressable
                onPress={handlePickImage}
                className="bg-card/80 w-14 h-14 rounded-full items-center justify-center"
              >
                <Text className="text-2xl">🖼️</Text>
              </Pressable>

              {/* Capture Button */}
              <Pressable
                onPress={handleCapture}
                disabled={isCapturing}
                className="mx-6"
              >
                <View
                  className={`w-20 h-20 rounded-full border-4 border-white items-center justify-center ${
                    isCapturing ? "opacity-50" : ""
                  }`}
                >
                  <View className="w-16 h-16 rounded-full bg-white" />
                </View>
              </Pressable>

              {/* Style Picker Button */}
              <Pressable
                onPress={() => setShowStylePicker(!showStylePicker)}
                className="bg-card/80 w-14 h-14 rounded-full items-center justify-center"
              >
                <Text className="text-2xl">{selectedStyleData?.emoji}</Text>
              </Pressable>
            </View>

            {/* Style Picker Dropdown */}
            {showStylePicker && (
              <View className="mt-4 mx-4 bg-card rounded-2xl p-4">
                <Text className="text-white font-semibold mb-3">Select Style</Text>
                <View className="flex-row flex-wrap">
                  {STYLES.map((style) => (
                    <Pressable
                      key={style.id}
                      onPress={() => {
                        setSelectedStyle(style.id);
                        setShowStylePicker(false);
                      }}
                      className={`mr-2 mb-2 px-4 py-2 rounded-full flex-row items-center ${
                        selectedStyle === style.id
                          ? "bg-white"
                          : "bg-secondary"
                      }`}
                    >
                      <Text className="mr-1">{style.emoji}</Text>
                      <Text
                        className={`font-medium ${
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

            {/* Flip Camera Button */}
            <Pressable
              onPress={() => setFacing(facing === "front" ? "back" : "front")}
              className="absolute right-4 bottom-24 bg-card/80 w-10 h-10 rounded-full items-center justify-center"
            >
              <Text className="text-lg">🔄</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}
