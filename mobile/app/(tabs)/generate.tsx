/**
 * Generate Screen (Tabs)
 *
 * Main camera screen for signed-in users within tab navigation.
 * Features:
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
import { Image as ImageIcon, RefreshCw } from "lucide-react-native";

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
  const { user } = useAuth();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0].id);
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0].id);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [facing, setFacing] = useState<CameraType>("front");

  useEffect(() => {
    fetchCredits();
  }, [user]);

  const fetchCredits = async () => {
    if (!user) return;

    const { data } = await supabase
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

    const totalCredits =
      (credits?.free_credits || 0) + (credits?.image_credits || 0);
    if (totalCredits <= 0) {
      router.push("/(app)/purchase");
      return;
    }

    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (photo) {
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
    const totalCredits =
      (credits?.free_credits || 0) + (credits?.image_credits || 0);
    if (totalCredits <= 0) {
      router.push("/(app)/purchase");
      return;
    }

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

  if (!permission) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
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

  const totalCredits =
    (credits?.free_credits || 0) + (credits?.image_credits || 0);
  const selectedStyleData = STYLES.find((s) => s.id === selectedStyle);

  return (
    <View className="flex-1 bg-background">
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
        mode="picture"
      >
        <SafeAreaView className="flex-1" edges={["top"]}>
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

            <View className="bg-[#1a1517]/80 px-3 py-2 rounded-[20px]">
              <Text className="text-white font-semibold text-sm">
                {totalCredits} {totalCredits === 1 ? "credit" : "credits"}
              </Text>
            </View>
          </View>

          <View className="flex-1" />

          {/* Bottom Controls */}
          <View className="pb-[100px]">
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
                disabled={isCapturing}
                className="w-20 h-20 rounded-full border-4 border-white items-center justify-center mx-6"
              >
                <View
                  className={`w-16 h-16 rounded-full bg-white ${
                    isCapturing ? "opacity-50" : ""
                  }`}
                />
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
                        selectedStyle === style.id
                          ? "bg-white"
                          : "bg-white/10"
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
              className="absolute right-4 bottom-[140px] bg-[#1a1517]/80 w-10 h-10 rounded-full items-center justify-center"
            >
              <RefreshCw color="white" size={20} />
            </Pressable>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}
