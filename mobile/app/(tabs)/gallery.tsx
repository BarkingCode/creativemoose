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

import React, { useState, useCallback, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { Avatar } from "../../components/Avatar";

const { width } = Dimensions.get("window");
const PADDING = 16;
const GAP = 16;
const IMAGE_SIZE = (width - PADDING * 2 - GAP) / 2;
const ITEM_HEIGHT = IMAGE_SIZE + GAP; // image height + gap
const PAGE_SIZE = 20;

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
  const { user } = useAuth();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);

  // Fetch profile avatar from database
  useEffect(() => {
    const fetchProfileAvatar = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("avatar_url, display_name")
          .eq("id", user.id)
          .single();
        if (data?.avatar_url) {
          setProfileAvatarUrl(data.avatar_url);
        }
      } catch (err) {
        // Silently fail - will use OAuth avatar or initials
      }
    };
    fetchProfileAvatar();
  }, [user?.id]);

  const fetchGallery = useCallback(
    async (offset = 0, refresh = false) => {
      if (!user?.id) return;

      try {
        if (refresh) {
          setRefreshing(true);
        } else if (offset === 0) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        setError(null);

        // Query Supabase directly for user's images
        const { data: fetchedImages, error: fetchError } = await supabase
          .from("images")
          .select("id, generation_batch_id, image_url, preset_id, style_id, image_index, is_public, is_free_generation, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        const transformedImages: GalleryImage[] = (fetchedImages || []).map((img) => ({
          id: img.id,
          generation_batch_id: img.generation_batch_id,
          image_url: img.image_url,
          preset_id: img.preset_id,
          style_id: img.style_id,
          image_index: img.image_index,
          is_public: img.is_public,
          is_free_generation: img.is_free_generation,
          created_at: img.created_at,
        }));

        if (refresh || offset === 0) {
          setImages(transformedImages);
        } else {
          setImages((prev) => [...prev, ...transformedImages]);
        }

        // Check if there might be more
        setHasMore(transformedImages.length === PAGE_SIZE);
      } catch (err: any) {
        console.error("Gallery error:", err);
        setError(err.message || "Failed to load gallery");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [user?.id]
  );

  useFocusEffect(
    useCallback(() => {
      fetchGallery(0, true);
    }, [fetchGallery])
  );

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

  const renderItem = ({ item, index }: { item: GalleryImage; index: number }) => {
    const isLeftColumn = index % 2 === 0;
    return (
      <TouchableOpacity
        className="rounded-2xl overflow-hidden bg-neutral-900"
        style={{
          width: IMAGE_SIZE,
          marginBottom: GAP,
          marginLeft: isLeftColumn ? 0 : GAP / 2,
          marginRight: isLeftColumn ? GAP / 2 : 0,
        }}
        onPress={() => handleImagePress(item)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: item.image_url }}
          style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }}
          contentFit="cover"
          transition={200}
        />
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    // Only show loading indicator when actually loading more (not initial load)
    // This fixes the bug where native progress indicator shows during initial page load
    if (!loadingMore || images.length === 0) return null;
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

  // Get user info for avatar
  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "U";
  // Prefer profile avatar from DB, then OAuth avatar
  const effectiveAvatarUrl =
    profileAvatarUrl ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <View>
          <Text className="text-[28px] font-bold text-white">My Photos</Text>
          <Text className="text-sm text-white/50 mt-0.5">
            {images.length} images
          </Text>
        </View>
        <Avatar
          url={effectiveAvatarUrl}
          name={userName}
          size="medium"
          onPress={() => router.push("/(app)/profile")}
        />
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
        <FlashList
          data={images}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: PADDING, paddingTop: PADDING, paddingBottom: 100 }}
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
