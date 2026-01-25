/**
 * Profile Screen
 *
 * Displays and allows editing of user profile information.
 * Features:
 * - Editable display name
 * - Tappable avatar for photo upload
 * - Credits balance display
 * - Sign out functionality
 * - Account deletion
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../contexts/AuthContext";
import { useRevenueCat } from "../../contexts/RevenueCatContext";
import { supabase } from "../../lib/supabase";
import { Avatar } from "../../components/Avatar";
import {
  LogOut,
  CreditCard,
  Mail,
  ChevronRight,
  Trash2,
  UserPlus,
  Camera,
  Check,
} from "lucide-react-native";
import { HeaderButton } from "../../components/HeaderButton";
import InviteFriendModal from "../../components/InviteFriendModal";

interface ProfileData {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, deleteAccount } = useAuth();
  const { credits, isLoadingCredits } = useRevenueCat();

  // UI state
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Profile editing state
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Original values for change detection
  const [originalDisplayName, setOriginalDisplayName] = useState("");

  // Derived values
  const userEmail = user?.email || "";
  const fallbackName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    userEmail.split("@")[0];
  const totalCredits =
    (credits?.free_credits || 0) + (credits?.image_credits || 0);

  // Fetch profile data on mount
  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;

    setIsLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, bio")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("[Profile] Fetch error:", error);
      }

      if (data) {
        const name = data.display_name || "";
        setDisplayName(name);
        setOriginalDisplayName(name);
        setAvatarUrl(data.avatar_url);
      }
    } catch (err) {
      console.error("[Profile] Error fetching profile:", err);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  // Track changes
  useEffect(() => {
    setHasChanges(displayName !== originalDisplayName);
  }, [displayName, originalDisplayName]);

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!user?.id || !hasChanges) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim() || null,
        })
        .eq("id", user.id);

      if (error) {
        throw new Error(error.message);
      }

      setOriginalDisplayName(displayName);
      setHasChanges(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (err: any) {
      console.error("[Profile] Save error:", err);
      Alert.alert("Error", err.message || "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle avatar upload
  const handleAvatarPress = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please grant photo library access to change your avatar."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    setIsUploadingAvatar(true);
    try {
      const asset = result.assets[0];
      const fileExt = asset.uri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${user?.id}/avatar.${fileExt}`;

      // Read file as blob
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, {
          upsert: true,
          contentType: `image/${fileExt}`,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: newAvatarUrl })
        .eq("id", user?.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setAvatarUrl(newAvatarUrl);
      Alert.alert("Success", "Avatar updated successfully!");
    } catch (err: any) {
      console.error("[Profile] Avatar upload error:", err);
      Alert.alert("Error", err.message || "Failed to upload avatar.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setIsSigningOut(true);
          await signOut();
          router.dismissAll();
          router.replace("/");
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This will delete all your photos, generations, and credits. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            const { error } = await deleteAccount();
            if (error) {
              setIsDeleting(false);
              Alert.alert(
                "Error",
                "Failed to delete account. Please try again."
              );
            } else {
              router.replace("/");
            }
          },
        },
      ]
    );
  };

  // Get the display name to show (custom or fallback)
  const displayedName = displayName || fallbackName;
  // For avatar, prefer custom avatar, then OAuth avatar
  const effectiveAvatarUrl =
    avatarUrl ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3">
            <View className="flex-row items-center">
              <HeaderButton variant="back" onPress={() => router.back()} />
              <Text className="text-white text-lg font-semibold ml-4">
                Profile
              </Text>
            </View>
            {hasChanges && (
              <Pressable
                onPress={handleSaveProfile}
                disabled={isSaving}
                className="bg-emerald-500 px-4 py-2 rounded-xl"
              >
                {isSaving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <View className="flex-row items-center gap-1">
                    <Check color="white" size={16} />
                    <Text className="text-white font-semibold text-sm">
                      Save
                    </Text>
                  </View>
                )}
              </Pressable>
            )}
          </View>

          {/* Avatar Section */}
          <View className="items-center py-8">
            <Pressable onPress={handleAvatarPress} disabled={isUploadingAvatar}>
              <View className="relative">
                <Avatar
                  url={effectiveAvatarUrl}
                  name={displayedName}
                  size="xlarge"
                />
                {isUploadingAvatar ? (
                  <View className="absolute inset-0 bg-black/50 rounded-full items-center justify-center">
                    <ActivityIndicator color="white" size="small" />
                  </View>
                ) : (
                  <View className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full items-center justify-center border-2 border-background">
                    <Camera color="#0f0a0a" size={16} />
                  </View>
                )}
              </View>
            </Pressable>

            {/* Display Name Input */}
            <View className="mt-6 w-full px-8">
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={fallbackName || "Enter your name"}
                placeholderTextColor="rgba(255,255,255,0.3)"
                className="text-white text-xl font-semibold text-center py-2 border-b border-white/10"
                maxLength={50}
              />
              <Text className="text-white/40 text-xs text-center mt-2">
                Tap to edit your display name
              </Text>
            </View>

            <Text className="text-white/50 text-sm mt-4">{userEmail}</Text>
          </View>

          {/* Stats Card */}
          <View className="mx-4 bg-neutral-900 rounded-2xl p-5 mb-6">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-emerald-500/20 items-center justify-center">
                  <View pointerEvents="none">
                    <CreditCard color="#10b981" size={20} />
                  </View>
                </View>
                <View>
                  <Text className="text-white/60 text-sm">
                    Available Credits
                  </Text>
                  <Text className="text-white text-xl font-bold">
                    {isLoadingCredits ? "..." : totalCredits}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => router.push("/(app)/purchase")}
                className="bg-white px-4 py-2 rounded-xl"
              >
                <Text className="text-background font-semibold text-sm">
                  Get More
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Menu Items - Email only (Account Type removed) */}
          <View className="mx-4 bg-neutral-900 rounded-2xl overflow-hidden mb-6">
            <View className="flex-row items-center px-4 py-4">
              <View className="w-10 h-10 rounded-full bg-white/5 items-center justify-center">
                <View pointerEvents="none">
                  <Mail color="rgba(255,255,255,0.5)" size={18} />
                </View>
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-white/50 text-xs">Email</Text>
                <Text className="text-white text-sm">{userEmail}</Text>
              </View>
            </View>
          </View>

          {/* Invite Friend Button */}
          <Pressable
            onPress={() => setShowInviteModal(true)}
            className="mx-4 mb-6 bg-neutral-900 rounded-2xl overflow-hidden"
          >
            <View className="flex-row items-center px-4 py-4">
              <View className="w-10 h-10 rounded-full bg-emerald-500/20 items-center justify-center">
                <View pointerEvents="none">
                  <UserPlus color="#10b981" size={18} />
                </View>
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-white font-medium">Invite a Friend</Text>
                <Text className="text-white/50 text-xs">
                  Share the app with someone
                </Text>
              </View>
              <View pointerEvents="none">
                <ChevronRight color="rgba(255,255,255,0.3)" size={20} />
              </View>
            </View>
          </Pressable>

          {/* Sign Out Button */}
          <View className="mx-4 mb-4">
            <Pressable
              onPress={handleSignOut}
              disabled={isSigningOut || isDeleting}
              className="flex-row items-center justify-center gap-2 bg-red-500/10 py-4 rounded-2xl border border-red-500/20"
            >
              {isSigningOut ? (
                <ActivityIndicator color="#ef4444" size="small" />
              ) : (
                <>
                  <View pointerEvents="none">
                    <LogOut color="#ef4444" size={20} />
                  </View>
                  <Text className="text-red-500 font-semibold text-base">
                    Sign Out
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Delete Account Button */}
          <View className="mx-4 mb-8">
            <Pressable
              onPress={handleDeleteAccount}
              disabled={isDeleting || isSigningOut}
              className="flex-row items-center justify-center gap-2 bg-red-900/30 py-4 rounded-2xl border border-red-900/50"
            >
              {isDeleting ? (
                <ActivityIndicator color="#dc2626" size="small" />
              ) : (
                <>
                  <View pointerEvents="none">
                    <Trash2 color="#dc2626" size={20} />
                  </View>
                  <Text className="text-red-600 font-semibold text-base">
                    Delete Account
                  </Text>
                </>
              )}
            </Pressable>
            <Text className="text-white/40 text-xs text-center mt-2">
              This permanently deletes all your data
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Invite Friend Modal */}
      <InviteFriendModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </SafeAreaView>
  );
}
