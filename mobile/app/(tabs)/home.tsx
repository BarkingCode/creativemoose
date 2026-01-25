/**
 * Home Feed Screen
 *
 * Displays public shared images from all users in a single-column feed.
 * Uses FlashList for performant scrolling with infinite scroll and pull-to-refresh.
 *
 * Features:
 * - Full-width single-column image layout
 * - User avatars and names
 * - Pull to refresh
 * - Load more on scroll (infinite pagination)
 * - Real-time updates via Supabase Realtime subscription
 *   (new shared images appear instantly without refresh)
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
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
import { supabase } from "../../lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useAuth } from "../../contexts/AuthContext";
import { Avatar } from "../../components/Avatar";

const { width } = Dimensions.get("window");
const IMAGE_SIZE = width; // Edge-to-edge full width
const PAGE_SIZE = 20;

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
  const { user } = useAuth();
  const [images, setImages] = useState<FeedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);

  // Fetch current user's profile avatar
  useEffect(() => {
    const fetchProfileAvatar = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("avatar_url")
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

  // Set up Realtime subscription for new public images
  useEffect(() => {
    const channel = supabase
      .channel('public-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'images',
          filter: 'is_public=eq.true',
        },
        (payload) => {
          // Add new image to top of feed
          const newImage: FeedImage = {
            id: payload.new.id,
            user_id: payload.new.user_id,
            image_url: payload.new.image_url,
            preset_id: payload.new.preset_id,
            created_at: payload.new.created_at,
            user_avatar_url: null,
            user_name: null,
          };
          setImages((prev) => [newImage, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'images',
          filter: 'is_public=eq.true',
        },
        (payload) => {
          // Handle images that are newly shared (is_public changed to true)
          if (payload.old.is_public === false && payload.new.is_public === true) {
            const newImage: FeedImage = {
              id: payload.new.id,
              user_id: payload.new.user_id,
              image_url: payload.new.image_url,
              preset_id: payload.new.preset_id,
              created_at: payload.new.created_at,
              user_avatar_url: null,
              user_name: null,
            };
            // Avoid duplicates
            setImages((prev) => {
              if (prev.some(img => img.id === newImage.id)) return prev;
              return [newImage, ...prev];
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

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

      // Query images with profile info via join
      const { data: feedImages, error: fetchError } = await supabase
        .from("images")
        .select(`
          id,
          user_id,
          generation_batch_id,
          image_url,
          preset_id,
          created_at,
          profiles:user_id (
            display_name,
            full_name,
            avatar_url
          )
        `)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      // Transform data with profile info
      const transformedImages = (feedImages || []).map((img: any) => {
        const profile = img.profiles;
        return {
          id: img.id,
          user_id: img.user_id,
          generation_batch_id: img.generation_batch_id,
          image_url: img.image_url,
          preset_id: img.preset_id,
          created_at: img.created_at,
          user_avatar_url: profile?.avatar_url || null,
          user_name: profile?.display_name || profile?.full_name || null,
        };
      });

      if (refresh || offset === 0) {
        setImages(transformedImages);
      } else {
        setImages((prev) => [...prev, ...transformedImages]);
      }

      // Check if there might be more
      setHasMore(transformedImages.length === PAGE_SIZE);
    } catch (err: any) {
      console.error("Feed error:", err);
      setError(err.message || "Failed to load feed");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFeed(0, true);
    }, [fetchFeed])
  );

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
      className="overflow-hidden bg-neutral-900"
      style={{ width: IMAGE_SIZE, marginBottom: 16 }}
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
          <Avatar
            url={item.user_avatar_url}
            name={item.user_name}
            size="small"
          />
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

  // Get user info for header avatar
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
        <Text className="text-[28px] font-bold text-white">Discover</Text>
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
            onPress={() => fetchFeed(0)}
          >
            <Text className="text-white text-sm font-medium">Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={images}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          estimatedItemSize={IMAGE_SIZE + 16}
          contentContainerStyle={{ paddingBottom: 100 }}
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
