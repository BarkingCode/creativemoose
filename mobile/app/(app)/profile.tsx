/**
 * Profile Screen
 *
 * Displays user profile information with an edit sheet.
 * Features:
 * - Read-only profile display
 * - Edit button opens bottom sheet for editing
 * - Editable first name, last name, and avatar in sheet
 * - Credits balance display
 * - Sign out and account deletion
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
  Modal,
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
  X,
  Pencil,
} from "lucide-react-native";
import { HeaderButton } from "../../components/HeaderButton";
import InviteFriendModal from "../../components/InviteFriendModal";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, deleteAccount } = useAuth();
  const { credits, isLoadingCredits } = useRevenueCat();

  // UI state
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);

  // Profile state
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Edit sheet state (temporary values while editing)
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Derived values
  const userEmail = user?.email || "";
  const totalCredits =
    (credits?.free_credits || 0) + (credits?.image_credits || 0);

  // Fetch profile data on mount
  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;

    setIsLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("[Profile] Fetch error:", error);
      }

      if (data) {
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
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

  // Open edit sheet with current values
  const openEditSheet = () => {
    setEditFirstName(firstName);
    setEditLastName(lastName);
    setShowEditSheet(true);
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: editFirstName.trim() || null,
          last_name: editLastName.trim() || null,
        })
        .eq("id", user.id);

      if (error) {
        throw new Error(error.message);
      }

      // Update local state
      setFirstName(editFirstName.trim());
      setLastName(editLastName.trim());
      setShowEditSheet(false);
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

    // Use optimized settings for faster loading
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      exif: false,
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

  // Get the display name to show
  const displayedName =
    firstName || lastName
      ? `${firstName} ${lastName}`.trim()
      : user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        userEmail.split("@")[0];

  // For avatar, prefer custom avatar, then OAuth avatar
  const effectiveAvatarUrl =
    avatarUrl ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3">
          <HeaderButton variant="back" onPress={() => router.back()} />
          <Text className="text-white text-lg font-semibold ml-4">Profile</Text>
        </View>

        {/* Profile Card */}
        <View className="items-center py-8">
          <Avatar
            url={effectiveAvatarUrl}
            name={displayedName}
            size="xlarge"
          />
          <Text className="text-white text-xl font-semibold mt-4">
            {displayedName}
          </Text>
          <Text className="text-white/50 text-sm mt-1">{userEmail}</Text>

          {/* Edit Profile Button */}
          <Pressable
            onPress={openEditSheet}
            className="flex-row items-center gap-2 mt-4 bg-white/10 px-4 py-2 rounded-full"
          >
            <Pencil color="white" size={16} />
            <Text className="text-white text-sm font-medium">Edit Profile</Text>
          </Pressable>
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
                <Text className="text-white/60 text-sm">Available Credits</Text>
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

        {/* Menu Items */}
        <View className="mx-4 bg-neutral-900 rounded-2xl overflow-hidden mb-6">
          {/* Email */}
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

      {/* Edit Profile Sheet */}
      <Modal
        visible={showEditSheet}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditSheet(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <Pressable
            className="flex-1 bg-black/50"
            onPress={() => setShowEditSheet(false)}
          />
          <View className="bg-neutral-900 rounded-t-3xl">
            <SafeAreaView edges={["bottom"]}>
              {/* Sheet Header */}
              <View className="flex-row items-center justify-between px-4 py-4 border-b border-white/10">
                <Pressable
                  onPress={() => setShowEditSheet(false)}
                  className="w-10 h-10 items-center justify-center"
                >
                  <X color="white" size={24} />
                </Pressable>
                <Text className="text-white text-lg font-semibold">
                  Edit Profile
                </Text>
                <Pressable
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                  className="bg-white px-4 py-2 rounded-lg"
                >
                  {isSaving ? (
                    <ActivityIndicator color="#0f0a0a" size="small" />
                  ) : (
                    <Text className="text-background font-semibold text-sm">
                      Save
                    </Text>
                  )}
                </Pressable>
              </View>

              {/* Avatar Edit */}
              <View className="items-center py-6">
                <Pressable
                  onPress={handleAvatarPress}
                  disabled={isUploadingAvatar}
                >
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
                      <View className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full items-center justify-center border-2 border-neutral-900">
                        <Camera color="#0f0a0a" size={16} />
                      </View>
                    )}
                  </View>
                </Pressable>
                <Text className="text-white/40 text-xs mt-3">
                  Tap to change photo
                </Text>
              </View>

              {/* Form Fields */}
              <View className="px-4 pb-6">
                {/* First Name */}
                <View className="mb-4">
                  <Text className="text-white/50 text-xs mb-2 ml-1">
                    First Name
                  </Text>
                  <TextInput
                    value={editFirstName}
                    onChangeText={setEditFirstName}
                    placeholder="Enter first name"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    className="bg-white/10 text-white text-base px-4 py-3 rounded-xl"
                    maxLength={50}
                    autoCapitalize="words"
                  />
                </View>

                {/* Last Name */}
                <View className="mb-4">
                  <Text className="text-white/50 text-xs mb-2 ml-1">
                    Last Name
                  </Text>
                  <TextInput
                    value={editLastName}
                    onChangeText={setEditLastName}
                    placeholder="Enter last name"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    className="bg-white/10 text-white text-base px-4 py-3 rounded-xl"
                    maxLength={50}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Invite Friend Modal */}
      <InviteFriendModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </SafeAreaView>
  );
}
