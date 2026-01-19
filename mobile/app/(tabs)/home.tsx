/**
 * Home Feed Screen
 *
 * Displays public shared images from all users.
 * Infinite scroll with pull-to-refresh.
 *
 * Features:
 * - Grid layout of shared images
 * - User avatars and names
 * - Pull to refresh
 * - Load more on scroll
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
import { supabase } from "../../lib/supabase";

const { width } = Dimensions.get("window");
const IMAGE_SIZE = (width - 48) / 2;
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

interface FeedImage {
  id: string;
  user_id: string;
  image_url: string;
  preset_id: string;
  created_at: string;
  user_avatar_url?: string;
  user_name?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [images, setImages] = useState<FeedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async (offset = 0, refresh = false) => {
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
        `${API_URL}/api/feed?limit=20&offset=${offset}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch feed");
      }

      const data = await response.json();

      if (refresh || offset === 0) {
        setImages(data.images || []);
      } else {
        setImages((prev) => [...prev, ...(data.images || [])]);
      }

      setHasMore(data.hasMore ?? false);
    } catch (err: any) {
      console.error("Feed error:", err);
      setError(err.message || "Failed to load feed");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed(0);
  }, [fetchFeed]);

  const handleRefresh = () => {
    fetchFeed(0, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchFeed(images.length);
    }
  };

  const handleImagePress = (image: FeedImage) => {
    router.push({
      pathname: "/image-preview",
      params: {
        imageId: image.id,
        imageUrl: image.image_url,
        isOwner: "false",
      },
    });
  };

  const renderItem = ({ item }: { item: FeedImage }) => (
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
      {item.user_name && (
        <View className="flex-row items-center p-2.5 gap-2">
          {item.user_avatar_url ? (
            <Image
              source={{ uri: item.user_avatar_url }}
              style={{ width: 24, height: 24, borderRadius: 12 }}
              contentFit="cover"
            />
          ) : (
            <View className="w-6 h-6 rounded-full bg-white/10 justify-center items-center">
              <Text className="text-white text-xs font-semibold">
                {item.user_name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text className="text-white/70 text-[13px] flex-1" numberOfLines={1}>
            {item.user_name}
          </Text>
        </View>
      )}
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
          No shared photos yet
        </Text>
        <Text className="text-white/50 text-sm text-center">
          Be the first to share your AI-generated photos!
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-4 py-3">
        <Text className="text-[28px] font-bold text-white">Discover</Text>
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
            onPress={() => fetchFeed(0)}
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
