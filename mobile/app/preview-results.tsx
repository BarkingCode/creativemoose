/**
 * Preview Results Screen
 *
 * Displays watermarked preview images for anonymous users.
 * Shows sign-up prompt to get full-quality images.
 *
 * Features:
 * - Grid display of 4 generated images
 * - Watermark indicator
 * - Sign up CTA
 * - Back to camera button
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Sparkles, Lock } from "lucide-react-native";

const { width } = Dimensions.get("window");
const IMAGE_SIZE = (width - 48) / 2;

export default function PreviewResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    images: string;
    isPreview: string;
  }>();

  const images: string[] = params.images ? JSON.parse(params.images) : [];
  const isPreview = params.isPreview === "true";

  const handleBack = () => {
    router.back();
  };

  const handleSignUp = () => {
    router.push("/(auth)/sign-up");
  };

  const handleTryAgain = () => {
    router.replace("/");
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity
          onPress={handleBack}
          className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
        >
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-white">Your Photos</Text>
        <View className="w-10" />
      </View>

      {/* Preview Badge */}
      {isPreview && (
        <View className="flex-row items-center justify-center gap-2 bg-amber-500/10 mx-4 py-2.5 px-4 rounded-xl border border-amber-500/30">
          <Lock color="#f59e0b" size={16} />
          <Text className="text-amber-500 text-sm font-medium">
            Preview Mode - Images are watermarked
          </Text>
        </View>
      )}

      {/* Image Grid */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row flex-wrap justify-between">
          {images.map((imageUri, index) => (
            <View
              key={index}
              className="rounded-2xl overflow-hidden mb-4 bg-[#1a1517]"
              style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }}
            >
              <Image
                source={{ uri: imageUri }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={200}
              />
              <View className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded-md">
                <Text className="text-white/70 text-[11px] font-medium">
                  Preview
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Sign Up CTA */}
        {isPreview && (
          <View className="mt-2 mb-4">
            <View className="bg-[#1a1517] rounded-2xl p-5 items-center border border-amber-500/20">
              <Sparkles color="#f59e0b" size={24} />
              <Text className="text-lg font-semibold text-white mt-3 mb-2">
                Want full-quality images?
              </Text>
              <Text className="text-sm text-white/60 text-center mb-4 leading-5">
                Sign up to download high-resolution photos without watermarks
                and save them to your gallery.
              </Text>
              <TouchableOpacity
                className="bg-white py-3.5 px-8 rounded-xl"
                onPress={handleSignUp}
              >
                <Text className="text-background text-base font-semibold">
                  Sign Up Free
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Try Again Button */}
        <TouchableOpacity
          className="bg-white/10 py-4 rounded-xl items-center border border-white/10"
          onPress={handleTryAgain}
        >
          <Text className="text-white text-base font-medium">
            Generate More
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
