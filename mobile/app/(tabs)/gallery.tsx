/**
 * Gallery Screen
 *
 * Displays user's own generated images.
 * Allows sharing/unsharing and deletion.
 *
 * Features:
 * - Grid layout of user's images
 * - Share toggle indicator
 * - Pull to refresh
 * - Tap to preview with actions
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { Globe, Lock } from "lucide-react-native";

const { width } = Dimensions.get("window");
const IMAGE_SIZE = (width - 48) / 2;
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

interface GalleryImage {
  id: string;
  generation_batch_id: string;
  image_url: string;
  preset_id: string;
  style_id?: string;
  image_index: number;
  is_public: boolean;
  is_free_generation: boolean;
  created_at: string;
}

export default function GalleryScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGallery = useCallback(
    async (offset = 0, refresh = false) => {
      if (!session?.access_token) return;

      try {
        if (refresh) {
          setRefreshing(true);
        } else if (offset === 0) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        setError(null);

        const response = await fetch(
          `${API_URL}/api/gallery?limit=20&offset=${offset}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch gallery");
        }

        const data = await response.json();

        if (refresh || offset === 0) {
          setImages(data.images || []);
        } else {
          setImages((prev) => [...prev, ...(data.images || [])]);
        }

        setHasMore(data.hasMore ?? false);
      } catch (err: any) {
        console.error("Gallery error:", err);
        setError(err.message || "Failed to load gallery");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [session?.access_token]
  );

  useEffect(() => {
    fetchGallery(0);
  }, [fetchGallery]);

  const handleRefresh = () => {
    fetchGallery(0, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchGallery(images.length);
    }
  };

  const handleImagePress = (image: GalleryImage) => {
    router.push({
      pathname: "/image-preview",
      params: {
        imageId: image.id,
        imageUrl: image.image_url,
        isOwner: "true",
        isPublic: image.is_public ? "true" : "false",
      },
    });
  };

  const renderItem = ({ item }: { item: GalleryImage }) => (
    <TouchableOpacity
      className="rounded-2xl overflow-hidden bg-[#1a1517]"
      style={{ width: IMAGE_SIZE }}
      onPress={() => handleImagePress(item)}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: item.image_url }}
        style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }}
        contentFit="cover"
        transition={200}
      />
      {/* Share status indicator */}
      <View className="absolute top-2 right-2 flex-row items-center gap-1 bg-black/60 px-2 py-1 rounded-lg">
        {item.is_public ? (
          <>
            <Globe color="#10b981" size={12} strokeWidth={2.5} />
            <Text className="text-emerald-500 text-[11px] font-medium">
              Shared
            </Text>
          </>
        ) : (
          <>
            <Lock color="rgba(255,255,255,0.5)" size={12} strokeWidth={2.5} />
            <Text className="text-white/50 text-[11px] font-medium">
              Private
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View className="py-5 items-center">
        <ActivityIndicator color="white" size="small" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View className="flex-1 justify-center items-center p-6 pt-[100px]">
        <Text className="text-white text-lg font-semibold mb-2">
          No photos yet
        </Text>
        <Text className="text-white/50 text-sm text-center mb-5">
          Create your first AI-generated photo!
        </Text>
        <TouchableOpacity
          className="bg-white px-6 py-3 rounded-xl"
          onPress={() => router.push("/(tabs)/generate")}
        >
          <Text className="text-background text-sm font-semibold">
            Start Creating
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-4 py-3">
        <Text className="text-[28px] font-bold text-white">My Photos</Text>
        <Text className="text-sm text-white/50 mt-0.5">
          {images.length} images
        </Text>
      </View>

      {loading && images.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color="white" size="large" />
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-red-500 text-base text-center mb-4">
            {error}
          </Text>
          <TouchableOpacity
            className="bg-white/10 px-6 py-3 rounded-lg"
            onPress={() => fetchGallery(0)}
          >
            <Text className="text-white text-sm font-medium">Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={images}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          columnWrapperStyle={{ justifyContent: "space-between", marginBottom: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="white"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
