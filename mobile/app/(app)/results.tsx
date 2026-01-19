/**
 * Results Screen
 *
 * Displays the generated images after AI processing.
 * Features:
 * - Loading state with generation progress
 * - Grid display of 4 generated images
 * - Download functionality
 * - Back to camera button
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
} from "react-native";
import { Image } from "expo-image";
import { File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";

// API base URL - should come from env in production
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    photoUri: string;
    photoBase64?: string;
    presetId: string;
    styleId: string;
  }>();
  const { user } = useAuth();

  const [isGenerating, setIsGenerating] = useState(true);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (params.photoBase64 || params.photoUri) {
      generateImages();
    }
  }, []);

  const generateImages = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Create FormData with the photo
      const formData = new FormData();

      if (params.photoBase64) {
        // Convert base64 to blob for upload
        const response = await fetch(`data:image/jpeg;base64,${params.photoBase64}`);
        const blob = await response.blob();
        formData.append("photo", blob, "photo.jpg");
      } else if (params.photoUri) {
        // Use file URI directly
        formData.append("photo", {
          uri: params.photoUri,
          type: "image/jpeg",
          name: "photo.jpg",
        } as any);
      }

      formData.append("presetId", params.presetId || "mapleAutumn");
      formData.append("styleId", params.styleId || "photorealistic");

      // Call the generation API
      const response = await fetch(`${API_BASE_URL}/api/generate`, {
        method: "POST",
        body: formData,
        headers: {
          // Note: In production, you'd include auth token here
          // Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 402) {
          // Insufficient credits
          Alert.alert(
            "No Credits",
            "You don't have enough credits. Purchase more to continue.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Buy Credits",
                onPress: () => router.push("/(app)/purchase"),
              },
            ]
          );
          router.back();
          return;
        }
        throw new Error(`Generation failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.images && data.images.length > 0) {
        setGeneratedImages(data.images);
      } else {
        throw new Error("No images returned from generation");
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "Failed to generate images. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (imageUri: string, index: number) => {
    setDownloadingIndex(index);

    try {
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant photo library access to save images."
        );
        return;
      }

      // Download the image
      let localUri: string;

      if (imageUri.startsWith("data:")) {
        // Base64 image - save to temp file first
        const base64Data = imageUri.split(",")[1];
        const file = new File(Paths.cache, `photoapp_${Date.now()}_${index}.png`);
        file.write(base64Data, { encoding: "base64" });
        localUri = file.uri;
      } else {
        // URL image - download first
        const file = await File.downloadFileAsync(
          imageUri,
          new File(Paths.cache, `photoapp_${Date.now()}_${index}.png`),
          { idempotent: true }
        );
        localUri = file.uri;
      }

      // Save to media library
      await MediaLibrary.saveToLibraryAsync(localUri);

      Alert.alert("Saved!", "Image saved to your photo library.");
    } catch (err) {
      console.error("Download error:", err);
      Alert.alert("Error", "Failed to save image. Please try again.");
    } finally {
      setDownloadingIndex(null);
    }
  };

  const handleShare = async (imageUri: string) => {
    try {
      await Share.share({
        message: "Check out my AI-generated photo from PhotoApp!",
        url: imageUri,
      });
    } catch (err) {
      console.error("Share error:", err);
    }
  };

  if (isGenerating) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator size="large" color="#fff" />
          <Text className="text-white text-xl font-bold mt-6">
            Generating your photos...
          </Text>
          <Text className="text-muted-foreground text-center mt-2">
            Our AI is creating 4 unique variations.{"\n"}This may take a moment.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-4xl mb-4">😔</Text>
          <Text className="text-white text-xl font-bold text-center">
            Generation Failed
          </Text>
          <Text className="text-muted-foreground text-center mt-2 mb-6">
            {error}
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="bg-white py-4 px-8 rounded-2xl"
          >
            <Text className="text-background font-semibold text-lg">
              Try Again
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2">
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-card rounded-xl items-center justify-center">
            <Text className="text-xl">📸</Text>
          </View>
          <Text className="text-white font-bold text-lg ml-2">Results</Text>
        </View>
      </View>

      {/* Images Grid */}
      <ScrollView className="flex-1 px-4">
        <View className="flex-row flex-wrap justify-between">
          {generatedImages.map((imageUri, index) => (
            <View key={index} className="w-[48%] mb-4">
              <View className="bg-card rounded-2xl overflow-hidden">
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: "100%", aspectRatio: 1 }}
                  contentFit="cover"
                  transition={300}
                />
                <View className="flex-row p-2">
                  <Pressable
                    onPress={() => handleDownload(imageUri, index)}
                    disabled={downloadingIndex === index}
                    className="flex-1 bg-white py-2 rounded-xl items-center mr-1"
                  >
                    {downloadingIndex === index ? (
                      <ActivityIndicator size="small" color="#0f0a0a" />
                    ) : (
                      <Text className="text-background font-semibold">
                        Save
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => handleShare(imageUri)}
                    className="bg-secondary py-2 px-4 rounded-xl items-center"
                  >
                    <Text className="text-white">📤</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View className="px-4 pb-4">
        <Pressable
          onPress={() => router.replace("/(app)/generate")}
          className="bg-white py-4 rounded-2xl items-center"
        >
          <Text className="text-background font-semibold text-lg">
            Generate More
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
