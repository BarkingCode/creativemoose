/**
 * Image Preview Screen
 *
 * Full-screen image viewer with actions.
 * Used from Gallery and Feed to view images.
 *
 * Features:
 * - Full-screen image display
 * - Share to feed toggle (owner only)
 * - Save to device
 * - Delete (owner only)
 * - Share via native share sheet
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import {
  ArrowLeft,
  Share2,
  Trash2,
  Globe,
  Download,
} from "lucide-react-native";
import { File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { shareImage } from "../lib/sharing";

const { width, height } = Dimensions.get("window");

export default function ImagePreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    imageId: string;
    imageUrl: string;
    isOwner: string;
    isPublic?: string;
  }>();

  const [isPublic, setIsPublic] = useState(params.isPublic === "true");
  const [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const isOwner = params.isOwner === "true";

  const handleSave = async () => {
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant photo library access to save images."
        );
        return;
      }

      // Download the image
      const file = await File.downloadFileAsync(
        params.imageUrl,
        new File(Paths.cache, `creative_moose_${Date.now()}.png`),
        { idempotent: true }
      );

      await MediaLibrary.saveToLibraryAsync(file.uri);
      Alert.alert("Saved!", "Image saved to your photo library.");
    } catch (err) {
      console.error("Save error:", err);
      Alert.alert("Error", "Failed to save image. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleShareToFeed = async () => {
    if (isPublic) return;

    Alert.alert(
      "Share to Feed",
      "This will make your image visible to everyone on the public feed. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Share",
          onPress: async () => {
            setSharing(true);
            try {
              const { error } = await supabase
                .from("images")
                .update({ is_public: true })
                .eq("id", params.imageId);

              if (error) {
                throw new Error(error.message);
              }

              setIsPublic(true);
              Alert.alert("Success", "Image shared to feed!");
            } catch (error) {
              console.error("Share to feed error:", error);
              Alert.alert("Error", "Failed to share to feed");
            } finally {
              setSharing(false);
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    await shareImage(params.imageUrl);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Image",
      "Are you sure you want to delete this image? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      // First get the storage path so we can delete the file too
      const { data: imageData, error: fetchError } = await supabase
        .from("images")
        .select("storage_path")
        .eq("id", params.imageId)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      // Delete from storage if path exists
      if (imageData?.storage_path) {
        const { error: storageError } = await supabase.storage
          .from("generations")
          .remove([imageData.storage_path]);

        if (storageError) {
          console.warn("Failed to delete from storage:", storageError);
          // Continue with database deletion even if storage fails
        }
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from("images")
        .delete()
        .eq("id", params.imageId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      Alert.alert("Deleted", "Image has been deleted.");
      router.back();
    } catch (error) {
      console.error("Delete error:", error);
      Alert.alert("Error", "Failed to delete image.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      {/* Image */}
      <Image
        source={{ uri: params.imageUrl }}
        style={{ width, height }}
        contentFit="contain"
        transition={200}
      />

      {/* Header */}
      <SafeAreaView
        className="absolute top-0 left-0 right-0 flex-row justify-start items-center px-4 py-2"
        edges={["top"]}
      >
        <TouchableOpacity
          onPress={handleBack}
          className="w-11 h-11 rounded-full bg-black/50 items-center justify-center"
        >
          <View pointerEvents="none">
            <ArrowLeft color="white" size={24} />
          </View>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Bottom Actions - Only show for owner (gallery), hide for feed */}
      {isOwner && (
        <SafeAreaView
          className="absolute bottom-0 left-0 right-0"
          edges={["bottom"]}
        >
          <View className="flex-row justify-evenly items-center pt-4 pb-4 px-5 bg-black/50">
            {/* Save */}
            <TouchableOpacity
              className="items-center justify-center py-3 px-4 min-w-[80px]"
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.7}
            >
              {saving ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Download color="white" size={22} />
                  <Text className="text-white text-xs font-medium mt-1.5">
                    Save
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Share to Feed */}
            <TouchableOpacity
              className="items-center justify-center py-3 px-4 min-w-[80px]"
              onPress={handleShareToFeed}
              disabled={sharing || isPublic}
              activeOpacity={0.7}
            >
              {sharing ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Globe color={isPublic ? "#10b981" : "white"} size={22} />
                  <Text
                    className={`text-xs font-medium mt-1.5 ${
                      isPublic ? "text-emerald-500" : "text-white"
                    }`}
                  >
                    {isPublic ? "Shared" : "Share to Feed"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity
              className="items-center justify-center py-3 px-4 min-w-[80px]"
              onPress={handleDelete}
              disabled={deleting}
              activeOpacity={0.7}
            >
              {deleting ? (
                <ActivityIndicator color="#ef4444" size="small" />
              ) : (
                <>
                  <Trash2 color="#ef4444" size={22} />
                  <Text className="text-red-500 text-xs font-medium mt-1.5">
                    Delete
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity
              className="items-center justify-center py-3 px-4 min-w-[80px]"
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Share2 color="white" size={22} />
              <Text className="text-white text-xs font-medium mt-1.5">Share</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}
