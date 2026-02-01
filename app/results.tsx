/**
 * Unified Results Screen
 *
 * Displays generated images for both anonymous and authenticated users.
 * This is an unprotected route (outside (app)/ folder) so it can be accessed
 * by anyone, with conditional logic handling the different flows.
 *
 * Features:
 * - Skeleton loaders with shimmer animation while images generate
 * - Progressive image display as each image completes
 * - Parallel API calls for authenticated users (4 images simultaneously)
 * - Preview generation for anonymous users (4 images via preview endpoint)
 * - ImagePreviewModal with pinch-zoom and swipe-dismiss
 * - Download functionality
 * - Client-side watermarking for preview mode
 * - Credit consumption only after successful generation
 *
 * Flow:
 * - Anonymous users: generatePreview() → credit consumed after success
 * - Authenticated users: reserveCredit() + generateSingleImage() x4
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
  TouchableOpacity,
} from "react-native";
import { HeaderButton } from "../components/HeaderButton";
import { Image } from "expo-image";
import { File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as ImageManipulator from "expo-image-manipulator";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { useRevenueCat } from "../contexts/RevenueCatContext";
import { supabase } from "../lib/supabase";
import {
  reserveCredit,
  generateSingleImage,
  base64ToDataUrl,
} from "../lib/fal";
// Credits are now handled by Supabase for all users (anonymous + linked)
import { SkeletonImageCard } from "../components/SkeletonImageCard";
import { ImagePreviewModal } from "../components/ImagePreviewModal";
import type { PhotoStyleId } from "../shared/presets";

// Image slot state for progressive loading
interface ImageSlot {
  imageUrl: string | null;
  imageId: string | null; // Database UUID for sharing/gallery features
  isLoading: boolean;
  error: string | null;
}

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    photoUri: string;
    photoBase64?: string;
    presetId: string;
    styleId: string;
  }>();
  const { session } = useAuth();
  const { refreshCredits } = useRevenueCat();

  // State for progressive image loading
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>([
    { imageUrl: null, imageId: null, isLoading: true, error: null },
    { imageUrl: null, imageId: null, isLoading: true, error: null },
    { imageUrl: null, imageId: null, isLoading: true, error: null },
    { imageUrl: null, imageId: null, isLoading: true, error: null },
  ]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const [isReservingCredit, setIsReservingCredit] = useState(true);
  // Modal state for fullscreen preview
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );

  useEffect(() => {
    if (params.photoBase64 || params.photoUri) {
      runGeneration();
    }
  }, []);

  /**
   * Run image generation based on authentication state.
   * - Anonymous: Use preview endpoint (4 images)
   * - Authenticated: Use parallel generation (reserve + 4x generate-single)
   */
  const runGeneration = useCallback(async () => {
    // Reset state
    setImageSlots([
      { imageUrl: null, imageId: null, isLoading: true, error: null },
      { imageUrl: null, imageId: null, isLoading: true, error: null },
      { imageUrl: null, imageId: null, isLoading: true, error: null },
      { imageUrl: null, imageId: null, isLoading: true, error: null },
    ]);
    setGlobalError(null);
    setIsReservingCredit(true);
    setSelectedImageIndex(null);

    console.log("[ResultsScreen] Starting generation");

    try {
      const presetId = params.presetId || "mapleAutumn";
      const styleId = (params.styleId || "photorealistic") as PhotoStyleId;

      // Get the image as base64 data URL (resize if needed for API upload)
      let imageBase64 = params.photoBase64 || "";
      if (!imageBase64 && params.photoUri) {
        // Resize image for API upload (keeps payload under ~500KB)
        console.log("[ResultsScreen] Resizing image for upload...");
        const resized = await ImageManipulator.manipulateAsync(
          params.photoUri,
          [{ resize: { width: 1024 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        imageBase64 = resized.base64 || "";
        console.log("[ResultsScreen] Image resized, base64 size:", Math.round(imageBase64.length / 1024), "KB");
      }

      const imageUrl = base64ToDataUrl(imageBase64);

      // All users (anonymous + linked) now have a session and use the same flow
      if (!session?.access_token) {
        setGlobalError("Please wait while we set up your session...");
        return;
      }

      // Force refresh the session to get a fresh JWT
      console.log("[ResultsScreen] Refreshing session...");
      const {
        data: { session: currentSession },
        error: refreshError,
      } = await supabase.auth.refreshSession();

      console.log("[ResultsScreen] Refresh result:", {
        hasSession: !!currentSession,
        error: refreshError?.message,
        tokenLength: currentSession?.access_token?.length,
        tokenPrefix: currentSession?.access_token?.substring(0, 20),
      });

      if (refreshError || !currentSession) {
        console.error("[ResultsScreen] Session refresh failed:", refreshError);
        setGlobalError("Your session has expired. Please restart the app.");
        return;
      }

      // Debug: Log token details
      console.log("[ResultsScreen] === SESSION DEBUG ===");
      console.log("[ResultsScreen] User ID:", currentSession.user?.id);
      console.log(
        "[ResultsScreen] Token expires:",
        new Date(currentSession.expires_at! * 1000).toISOString()
      );
      console.log(
        "[ResultsScreen] Token length:",
        currentSession.access_token?.length
      );
      console.log("[ResultsScreen] === END DEBUG ===");

      // Validate token by calling getUser
      const {
        data: { user: validatedUser },
        error: validateError,
      } = await supabase.auth.getUser();
      if (validateError || !validatedUser) {
        console.error("[ResultsScreen] Token validation failed:", validateError);
        throw new Error("UNAUTHORIZED");
      }
      console.log("[ResultsScreen] Token validated, user:", validatedUser.id);

      // Step 1: Reserve credit
      console.log("[ResultsScreen] Reserving credit...");
      const reserveResult = await reserveCredit(
        { imageUrl, presetId, styleId },
        currentSession
      );

      setIsReservingCredit(false);
      console.log(
        "[ResultsScreen] Credit reserved, sessionId:",
        reserveResult.sessionId
      );

      // Step 2: Launch 4 parallel generation requests
      const variationIndices = [0, 1, 2, 3];

      const promises = variationIndices.map(async (index) => {
        try {
          console.log(`[ResultsScreen] Starting image ${index}...`);
          const result = await generateSingleImage(
            { sessionId: reserveResult.sessionId, variationIndex: index },
            currentSession
          );

          console.log(`[ResultsScreen] Image ${index} completed:`);
          console.log(`  - imageUrl: ${result.imageUrl?.substring(0, 100)}...`);
          console.log(`  - imageId: ${result.imageId}`);

          // Validate we actually got an image URL
          if (!result.imageUrl) {
            console.error(`[ResultsScreen] Image ${index} has no URL!`);
            setImageSlots((prev) => {
              const next = [...prev];
              next[index] = {
                imageUrl: null,
                imageId: null,
                isLoading: false,
                error: "No image URL returned",
              };
              return next;
            });
            return { index, success: false, error: "No image URL" };
          }

          // Update the specific slot
          setImageSlots((prev) => {
            const next = [...prev];
            next[index] = {
              imageUrl: result.imageUrl,
              imageId: result.imageId,
              isLoading: false,
              error: null,
            };
            return next;
          });

          return { index, success: true };
        } catch (err: any) {
          console.error(`[ResultsScreen] Image ${index} failed:`, err);

          // Update the specific slot with error
          setImageSlots((prev) => {
            const next = [...prev];
            next[index] = {
              imageUrl: null,
              imageId: null,
              isLoading: false,
              error: err.message || "Generation failed",
            };
            return next;
          });

          return { index, success: false, error: err.message };
        }
      });

      // Wait for all to complete (success or failure)
      await Promise.allSettled(promises);

      console.log("[ResultsScreen] All generation requests completed");

      // Refresh credits after generation to update UI
      await refreshCredits();
    } catch (err: any) {
      console.error("[ResultsScreen] Generation error:", err);

      if (err.message === "INSUFFICIENT_CREDITS") {
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

      if (err.message === "UNAUTHORIZED") {
        setGlobalError("Please sign in to generate images.");
        return;
      }

      setGlobalError(err.message || "Failed to generate images. Please try again.");
      // Mark all slots as failed
      setImageSlots((prev) =>
        prev.map((slot) => ({
          ...slot,
          isLoading: false,
          error: slot.imageUrl ? null : "Generation failed",
        }))
      );
    } finally {
      setIsReservingCredit(false);
    }
  }, [params, session, router]);

  const handleDownload = async (imageUri: string, index: number) => {
    await performDownload(imageUri, index);
  };

  const performDownload = async (imageUri: string, index: number) => {
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

  /**
   * Share image to public feed via Supabase
   */
  const handleShareToFeed = async () => {
    if (selectedImageIndex === null) return;

    const imageId = imageSlots[selectedImageIndex].imageId;
    if (!imageId) {
      Alert.alert("Error", "This image cannot be shared to the feed.");
      return;
    }

    try {
      const { error } = await supabase
        .from("images")
        .update({ is_public: true })
        .eq("id", imageId);

      if (error) {
        throw new Error(error.message);
      }

      Alert.alert("Success", "Your image is now visible on the public feed!");
    } catch (err: any) {
      console.error("Share to feed error:", err);
      Alert.alert("Error", err.message || "Failed to share image to feed.");
    }
  };

  // Global error state (e.g., auth failure before generation starts)
  if (globalError && !imageSlots.some((slot) => slot.imageUrl || slot.isLoading)) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-4xl mb-4">😔</Text>
          <Text className="text-white text-xl font-bold text-center">
            Generation Failed
          </Text>
          <Text className="text-muted-foreground text-center mt-2 mb-6">
            {globalError}
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

  // Credit reservation loading state
  if (isReservingCredit) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator size="large" color="#fff" />
          <Text className="text-white text-xl font-bold mt-6">
            Preparing generation...
          </Text>
          <Text className="text-muted-foreground text-center mt-2">
            Setting up your image generation
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Close button */}
      <View className="flex-row justify-end px-4 py-2">
        <HeaderButton
          variant="close"
          onPress={() => router.replace("/(tabs)/home")}
        />
      </View>

      {/* Images List - Skeleton + Progressive Loading */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View>
          {imageSlots.map((slot, index) => {
            // Show skeleton or completed image
            if (slot.isLoading || slot.error || !slot.imageUrl) {
              return (
                <SkeletonImageCard
                  key={index}
                  imageUrl={slot.imageUrl}
                  isLoading={slot.isLoading}
                  error={slot.error}
                  index={index}
                  onRetry={
                    slot.error
                      ? () => {
                          // Retry would require re-reserving credit, so just prompt to start over
                          Alert.alert(
                            "Retry Generation",
                            "Would you like to try generating again?",
                            [
                              { text: "Cancel", style: "cancel" },
                              { text: "Retry", onPress: runGeneration },
                            ]
                          );
                        }
                      : undefined
                  }
                />
              );
            }

            // Show completed image - tap to open fullscreen preview
            return (
              <Pressable
                key={index}
                className="w-full mb-4"
                onPress={() => setSelectedImageIndex(index)}
              >
                <Image
                  source={{ uri: slot.imageUrl }}
                  style={{ width: "100%", aspectRatio: 1 }}
                  contentFit="cover"
                  transition={300}
                  onError={(e) => {
                    console.error(
                      `[ResultsScreen] Image ${index} failed to load:`,
                      e
                    );
                    console.error(
                      `  URL was: ${slot.imageUrl?.substring(0, 100)}`
                    );
                  }}
                  onLoad={() =>
                    console.log(
                      `[ResultsScreen] Image ${index} loaded successfully`
                    )
                  }
                />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View className="px-4 pb-4">
        <Pressable
          onPress={() => router.replace("/(tabs)/generate")}
          className="bg-white py-4 rounded-2xl items-center"
        >
          <Text className="text-background font-semibold text-lg">
            Generate More
          </Text>
        </Pressable>
      </View>

      {/* Fullscreen Image Preview Modal */}
      <ImagePreviewModal
        visible={selectedImageIndex !== null}
        imageUrl={
          selectedImageIndex !== null
            ? imageSlots[selectedImageIndex].imageUrl
            : null
        }
        imageId={
          selectedImageIndex !== null
            ? imageSlots[selectedImageIndex].imageId
            : null
        }
        isPreview={false}
        onClose={() => setSelectedImageIndex(null)}
        onSave={async () => {
          if (
            selectedImageIndex !== null &&
            imageSlots[selectedImageIndex].imageUrl
          ) {
            await handleDownload(
              imageSlots[selectedImageIndex].imageUrl!,
              selectedImageIndex
            );
          }
        }}
        onShareToFeed={handleShareToFeed}
        onNativeShare={() => {
          if (
            selectedImageIndex !== null &&
            imageSlots[selectedImageIndex].imageUrl
          ) {
            handleShare(imageSlots[selectedImageIndex].imageUrl!);
          }
        }}
        currentIndex={selectedImageIndex ?? 0}
        totalImages={imageSlots.filter((s) => s.imageUrl).length}
        onPrevious={() => {
          if (selectedImageIndex !== null && selectedImageIndex > 0) {
            setSelectedImageIndex(selectedImageIndex - 1);
          }
        }}
        onNext={() => {
          if (
            selectedImageIndex !== null &&
            selectedImageIndex < imageSlots.length - 1
          ) {
            setSelectedImageIndex(selectedImageIndex + 1);
          }
        }}
      />
    </SafeAreaView>
  );
}
