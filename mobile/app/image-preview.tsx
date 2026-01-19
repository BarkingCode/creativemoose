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
  Share,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import {
  ArrowLeft,
  Download,
  Share2,
  Trash2,
  Globe,
  Lock,
} from "lucide-react-native";

const { width, height } = Dimensions.get("window");
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export default function ImagePreviewScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const params = useLocalSearchParams<{
    imageId: string;
    imageUrl: string;
    isOwner: string;
    isPublic?: string;
  }>();

  const [isPublic, setIsPublic] = useState(params.isPublic === "true");
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = params.isOwner === "true";

  const handleBack = () => {
    router.back();
  };

  const handleToggleShare = async () => {
    if (!session?.access_token) return;

    setToggling(true);
    try {
      const response = await fetch(
        `${API_URL}/api/images/${params.imageId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ is_public: !isPublic }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update sharing status");
      }

      setIsPublic(!isPublic);
      Alert.alert(
        "Success",
        isPublic ? "Image is now private" : "Image shared to feed!"
      );
    } catch (error) {
      console.error("Toggle share error:", error);
      Alert.alert("Error", "Failed to update sharing status");
    } finally {
      setToggling(false);
    }
  };

  const handleSaveToDevice = async () => {
    setLoading(true);
    try {
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to save photos to your device."
        );
        return;
      }

      // Download image using modern expo-file-system API
      const downloadedFile = await File.downloadFileAsync(
        params.imageUrl,
        new File(Paths.cache, `photoapp_${Date.now()}.jpg`),
        { idempotent: true }
      );

      // Save to media library
      await MediaLibrary.saveToLibraryAsync(downloadedFile.uri);

      Alert.alert("Saved!", "Image saved to your photo library.");
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Error", "Failed to save image to device.");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        url: params.imageUrl,
        message: "Check out this AI-generated photo from PhotoApp!",
      });
    } catch (error) {
      console.error("Share error:", error);
    }
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
    if (!session?.access_token) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `${API_URL}/api/images/${params.imageId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete image");
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
        className="absolute top-0 left-0 right-0 flex-row justify-between items-center px-4 py-2"
        edges={["top"]}
      >
        <TouchableOpacity
          onPress={handleBack}
          className="w-11 h-11 rounded-full bg-black/50 items-center justify-center"
        >
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSaveToDevice}
          className="w-11 h-11 rounded-full bg-black/50 items-center justify-center"
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Download color="white" size={24} />
          )}
        </TouchableOpacity>
      </SafeAreaView>

      {/* Bottom Actions */}
      <SafeAreaView
        className="absolute bottom-0 left-0 right-0 px-4 py-4"
        edges={["bottom"]}
      >
        <View className="flex-row justify-center gap-3">
          {isOwner && (
            <>
              {/* Share Toggle */}
              <TouchableOpacity
                className="flex-row items-center gap-2 bg-[#1a1517]/90 px-5 py-3.5 rounded-2xl border border-white/10 min-w-[100px]"
                onPress={handleToggleShare}
                disabled={toggling}
              >
                {toggling ? (
                  <ActivityIndicator color="white" size="small" />
                ) : isPublic ? (
                  <>
                    <Globe color="#10b981" size={20} />
                    <Text className="text-emerald-500 text-sm font-medium">
                      Shared
                    </Text>
                  </>
                ) : (
                  <>
                    <Lock color="rgba(255,255,255,0.6)" size={20} />
                    <Text className="text-white/80 text-sm font-medium">
                      Private
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Delete */}
              <TouchableOpacity
                className="flex-row items-center gap-2 bg-[#1a1517]/90 px-5 py-3.5 rounded-2xl border border-red-500/30"
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#ef4444" size="small" />
                ) : (
                  <>
                    <Trash2 color="#ef4444" size={20} />
                    <Text className="text-red-500 text-sm font-medium">
                      Delete
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Share via native */}
          <TouchableOpacity
            className="flex-row items-center gap-2 bg-[#1a1517]/90 px-5 py-3.5 rounded-2xl border border-white/10"
            onPress={handleShare}
          >
            <Share2 color="white" size={20} />
            <Text className="text-white/80 text-sm font-medium">Share</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
