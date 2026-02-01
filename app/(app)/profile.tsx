/**
 * Profile Screen (Credits-Focused)
 *
 * Premium credits experience with Northern Lights-inspired design.
 * - Dramatic aurora gradient hero with animated glow
 * - Large, prominent credit display
 * - One-tap purchase with visual feedback
 * - Condensed account management
 *
 * Design: "Luxury Aurora" - dark elegance with organic flowing gradients
 */

import { useState, useCallback, useEffect, useRef } from "react";
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
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../contexts/AuthContext";
import { useRevenueCat } from "../../contexts/RevenueCatContext";
import { supabase } from "../../lib/supabase";
import { Avatar } from "../../components/Avatar";
import {
  Camera,
  X,
  Pencil,
  Sparkles,
  ChevronRight,
  Shield,
  ImageIcon,
  Vibrate,
  Lock,
} from "lucide-react-native";
import { HeaderButton } from "../../components/HeaderButton";
import { useBiometricLock } from "../../contexts/BiometricLockContext";
import { getHapticsEnabled, setHapticsEnabled } from "../../lib/haptic-settings";
import { authenticateWithBiometrics } from "../../lib/biometrics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Brand color palette - red, black, white
const BRAND = {
  red: "#E63946",
  redLight: "#FF4D5A",
  redDark: "#C41E2A",
  redGlow: "rgba(230, 57, 70, 0.3)",
};

export default function ProfileScreen() {
  const router = useRouter();
  const {
    user,
    deleteAccount,
    isAnonymous,
    linkWithApple,
    linkWithGoogle,
  } = useAuth();
  const {
    credits,
    isLoadingCredits,
    offerings,
    purchasePackage,
    isPurchasing,
    isAvailable: isRevenueCatAvailable,
  } = useRevenueCat();
  const {
    isAvailable: isBiometricAvailable,
    isEnabled: isBiometricEnabled,
    biometricName,
    setEnabled: setBiometricEnabled,
  } = useBiometricLock();

  // Settings state
  const [hapticsEnabled, setHapticsEnabledState] = useState(true);

  // UI state
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);

  // Profile state
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Edit sheet state
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Animation values
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Start animations
  useEffect(() => {
    // Slow glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: false,
        }),
      ])
    ).start();

    // Subtle pulse for credit number
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Derived values
  const userEmail = user?.email || "";
  const totalCredits =
    (credits?.free_credits || 0) + (credits?.image_credits || 0);

  // Get first available package for direct purchase
  const firstPackage = offerings?.availablePackages?.[0];
  const packagePrice = firstPackage?.product?.priceString || "$1.99";
  const packageCredits = 5;

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
      // Fetch haptics setting
      getHapticsEnabled().then(setHapticsEnabledState);
    }, [fetchProfile])
  );

  // Handle haptics toggle
  const handleHapticsToggle = async (enabled: boolean) => {
    setHapticsEnabledState(enabled);
    await setHapticsEnabled(enabled);
  };

  const openEditSheet = () => {
    setEditFirstName(firstName);
    setEditLastName(lastName);
    setShowEditSheet(true);
  };

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

      if (error) throw new Error(error.message);

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
      quality: 0.7,
      exif: false,
    });

    if (result.canceled || !result.assets[0]) return;

    setIsUploadingAvatar(true);
    try {
      const asset = result.assets[0];
      const fileExt = asset.uri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${user?.id}/avatar.${fileExt}`;

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, {
          upsert: true,
          contentType: `image/${fileExt}`,
        });

      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: newAvatarUrl })
        .eq("id", user?.id);

      if (updateError) throw new Error(updateError.message);

      setAvatarUrl(newAvatarUrl);
    } catch (err: any) {
      console.error("[Profile] Avatar upload error:", err);
      Alert.alert("Error", err.message || "Failed to upload avatar.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleDeleteAccount = async () => {
    // If biometric lock is enabled, require authentication first
    if (isBiometricEnabled && isBiometricAvailable) {
      const authenticated = await authenticateWithBiometrics(
        `Authenticate to delete ${isAnonymous ? "data" : "account"}`
      );
      if (!authenticated) {
        // User cancelled or auth failed - don't proceed
        return;
      }
    }

    Alert.alert(
      isAnonymous ? "Delete Data" : "Delete Account",
      isAnonymous
        ? "Are you sure you want to delete all your photos and data? This cannot be undone."
        : "Are you sure you want to permanently delete your account? This will delete all your photos, generations, and credits. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            const { error } = await deleteAccount();
            if (error) {
              setIsDeleting(false);
              Alert.alert("Error", "Failed to delete. Please try again.");
            } else {
              router.replace("/");
            }
          },
        },
      ]
    );
  };

  const handleLinkWithApple = async () => {
    setIsLinking(true);
    try {
      const { error } = await linkWithApple();
      if (error && error.message !== "Authentication cancelled") {
        Alert.alert("Error", error.message || "Failed to link account.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to link account.");
    } finally {
      setIsLinking(false);
    }
  };

  const handleLinkWithGoogle = async () => {
    setIsLinking(true);
    try {
      const { error } = await linkWithGoogle();
      if (error && error.message !== "Authentication cancelled") {
        Alert.alert("Error", error.message || "Failed to link account.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to link account.");
    } finally {
      setIsLinking(false);
    }
  };

  const handlePurchase = async () => {
    if (!firstPackage) {
      Alert.alert("Error", "No purchase options available.");
      return;
    }

    // Button press animation
    Animated.sequence([
      Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }),
      Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }),
    ]).start();

    await purchasePackage(firstPackage);
  };

  const displayedName = isAnonymous
    ? "Guest"
    : firstName || lastName
      ? `${firstName} ${lastName}`.trim()
      : user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      userEmail.split("@")[0];

  const effectiveAvatarUrl =
    avatarUrl ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture;

  // Animated glow color
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.35],
  });

  return (
    <View className="flex-1 bg-background">
      {/* Animated Red Glow Background */}
      <Animated.View
        className="absolute top-0 left-0 right-0"
        style={{
          height: 350,
          opacity: glowOpacity,
        }}
      >
        <LinearGradient
          colors={[BRAND.red, BRAND.redDark, "transparent"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
            <HeaderButton variant="back" onPress={() => router.back()} />
            <Text className="text-white text-lg font-semibold tracking-tight">
              Credits
            </Text>
            <View className="w-10" />
          </View>

          {/* Credits Hero Section */}
          <View className="px-6 pt-8 pb-10 items-center">
            {/* Credit Number - Large & Prominent */}
            <Animated.View
              style={{ transform: [{ scale: pulseAnim }] }}
              className="items-center"
            >
              <Text
                className="font-bold text-white"
                style={{
                  fontSize: 96,
                  lineHeight: 96,
                  // letterSpacing: -4,
                  // textShadowColor: BRAND.redGlow,
                  // textShadowOffset: { width: 0, height: 0 },
                  // textShadowRadius: 30,
                }}
              >
                {isLoadingCredits ? "—" : totalCredits}
              </Text>
            </Animated.View>

            {/* Subtitle */}
            <Text className="text-white/50 text-base mt-2 tracking-wide">
              credits remaining
            </Text>

            {/* Value Indicator */}
            <View className="flex-row items-center gap-2 mt-4 bg-white/5 px-4 py-2 rounded-full">
              <ImageIcon color={BRAND.red} size={16} />
              <Text className="text-white/60 text-sm">
                {isLoadingCredits ? "—" : totalCredits * 4} photos available
              </Text>
            </View>
          </View>

          {/* Purchase Button */}
          {isRevenueCatAvailable && firstPackage && (
            <View className="mx-5 mb-8">
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <Pressable
                  onPress={handlePurchase}
                  disabled={isPurchasing}
                  className="overflow-hidden rounded-full"
                  style={{ backgroundColor: BRAND.red }}
                >
                  <View className="px-8 py-5 flex-row items-center justify-center gap-3">
                    {isPurchasing ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <>
                        <Sparkles color="white" size={20} />
                        <Text className="text-white font-bold text-lg">
                          Get {packageCredits} Credits
                        </Text>
                        <Text className="text-white/70 text-base font-medium">
                          ·
                        </Text>
                        <Text className="text-white font-bold text-lg">
                          {packagePrice}
                        </Text>
                      </>
                    )}
                  </View>
                </Pressable>
              </Animated.View>

              {/* Trust Badge */}
              <View className="flex-row items-center justify-center gap-2 mt-4">
                <Shield color="rgba(255,255,255,0.3)" size={14} />
                <Text className="text-white/30 text-xs">
                  Secure payment via App Store
                </Text>
              </View>
            </View>
          )}

          {/* RevenueCat Unavailable */}
          {!isRevenueCatAvailable && (
            <View className="mx-5 mb-8">
              <View className="rounded-3xl p-5 bg-amber-500/10 border border-amber-500/20">
                <Text className="text-amber-400 font-semibold text-base mb-1">
                  Purchases Unavailable
                </Text>
                <Text className="text-white/50 text-sm">
                  This may be due to running a beta iOS version.
                </Text>
              </View>
            </View>
          )}

          {/* Divider */}
          <View className="h-px bg-white/5 mx-6 my-2" />

          {/* Auth-Dependent Section */}
          {isAnonymous ? (
            // Anonymous: Sign-up CTA
            <View className="mx-5 mt-6">
              <View className="flex-row items-center gap-3 mb-4">
                <View className="w-10 h-10 rounded-xl bg-white/5 items-center justify-center">
                  <Shield color={BRAND.red} size={20} />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-base">
                    Save your account
                  </Text>
                  <Text className="text-white/40 text-sm">
                    Keep your photos & credits safe
                  </Text>
                </View>
              </View>

              {/* Sign in with Apple */}
              <Pressable
                onPress={handleLinkWithApple}
                disabled={isLinking}
                className="bg-white flex-row items-center justify-center py-4 rounded-full mb-3"
              >
                {isLinking ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <>
                    <Text className="text-black text-lg mr-2"></Text>
                    <Text className="text-black font-semibold text-base">
                      Continue with Apple
                    </Text>
                  </>
                )}
              </Pressable>

              {/* Sign in with Google */}
              <Pressable
                onPress={handleLinkWithGoogle}
                disabled={isLinking}
                className="bg-white/5 flex-row items-center justify-center py-4 rounded-full border border-white/10"
              >
                {isLinking ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white font-medium text-base">
                    Continue with Google
                  </Text>
                )}
              </Pressable>
            </View>
          ) : (
            // Signed-in: Compact Profile Row
            <Pressable onPress={openEditSheet} className="mx-5 mt-6">
              <View className="bg-white/5 rounded-3xl p-4 flex-row items-center border border-white/5">
                <Avatar
                  url={effectiveAvatarUrl}
                  name={displayedName}
                  size="medium"
                />
                <View className="flex-1 ml-4">
                  <Text className="text-white font-semibold text-base">
                    {displayedName}
                  </Text>
                  <Text className="text-white/40 text-sm">{userEmail}</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Pencil color="rgba(255,255,255,0.4)" size={16} />
                  <ChevronRight color="rgba(255,255,255,0.3)" size={18} />
                </View>
              </View>
            </Pressable>
          )}

          {/* Security Settings Section */}
          <View className="mx-5 mt-6">
            <View className="flex-row items-center gap-2 mb-3">
              <Shield color="rgba(255,255,255,0.5)" size={16} />
              <Text className="text-white/50 text-sm font-medium">
                Settings
              </Text>
            </View>

            <View className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
              {/* Haptic Feedback Toggle */}
              <View className="flex-row items-center justify-between px-4 py-3.5">
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="w-8 h-8 rounded-lg bg-white/10 items-center justify-center">
                    <Vibrate color="white" size={18} />
                  </View>
                  <Text className="text-white text-base">Haptic Feedback</Text>
                </View>
                <Pressable
                  onPress={() => handleHapticsToggle(!hapticsEnabled)}
                  className={`w-12 h-7 rounded-full p-0.5 ${
                    hapticsEnabled ? "bg-red-500" : "bg-white/20"
                  }`}
                >
                  <View
                    className={`w-6 h-6 rounded-full bg-white shadow-sm ${
                      hapticsEnabled ? "ml-auto" : ""
                    }`}
                  />
                </Pressable>
              </View>

              {/* Biometric Lock Toggle - Only show if hardware available */}
              {isBiometricAvailable && (
                <>
                  <View className="h-px bg-white/5 mx-4" />
                  <View className="flex-row items-center justify-between px-4 py-3.5">
                    <View className="flex-row items-center gap-3 flex-1">
                      <View className="w-8 h-8 rounded-lg bg-white/10 items-center justify-center">
                        <Lock color="white" size={18} />
                      </View>
                      <Text className="text-white text-base">
                        Require {biometricName}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setBiometricEnabled(!isBiometricEnabled)}
                      className={`w-12 h-7 rounded-full p-0.5 ${
                        isBiometricEnabled ? "bg-red-500" : "bg-white/20"
                      }`}
                    >
                      <View
                        className={`w-6 h-6 rounded-full bg-white shadow-sm ${
                          isBiometricEnabled ? "ml-auto" : ""
                        }`}
                      />
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Spacer */}
          <View className="flex-1 min-h-[60px]" />

          {/* Delete - Minimal at Bottom */}
          <Pressable
            onPress={handleDeleteAccount}
            disabled={isDeleting}
            className="py-4 mx-5"
          >
            {isDeleting ? (
              <ActivityIndicator color={BRAND.red} size="small" />
            ) : (
              <Text className="text-center text-sm" style={{ color: BRAND.red }}>
                {isAnonymous ? "Delete my data" : "Delete account"}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>

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
            className="flex-1 bg-black/60"
            onPress={() => setShowEditSheet(false)}
          />
          <View className="bg-neutral-900 rounded-t-3xl">
            <SafeAreaView edges={["bottom"]}>
              {/* Handle Bar */}
              <View className="items-center pt-3 pb-2">
                <View className="w-10 h-1 rounded-full bg-white/20" />
              </View>

              <View className="flex-row items-center justify-between px-5 py-3 border-b border-white/5">
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
                  className="px-4 py-2 rounded-full"
                  style={{ backgroundColor: BRAND.red }}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="text-white font-semibold text-sm">
                      Save
                    </Text>
                  )}
                </Pressable>
              </View>

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
                      <View
                        className="absolute bottom-0 right-0 w-8 h-8 rounded-full items-center justify-center border-2 border-neutral-900"
                        style={{ backgroundColor: BRAND.red }}
                      >
                        <Camera color="#fff" size={16} />
                      </View>
                    )}
                  </View>
                </Pressable>
                <Text className="text-white/40 text-xs mt-3">
                  Tap to change photo
                </Text>
              </View>

              <View className="px-5 pb-6">
                <View className="mb-4">
                  <Text className="text-white/50 text-xs mb-2 ml-1">
                    First Name
                  </Text>
                  <TextInput
                    value={editFirstName}
                    onChangeText={setEditFirstName}
                    placeholder="Enter first name"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    className="bg-white/5 text-white text-base px-5 py-4 rounded-2xl border border-white/5"
                    maxLength={50}
                    autoCapitalize="words"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-white/50 text-xs mb-2 ml-1">
                    Last Name
                  </Text>
                  <TextInput
                    value={editLastName}
                    onChangeText={setEditLastName}
                    placeholder="Enter last name"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    className="bg-white/5 text-white text-base px-5 py-4 rounded-2xl border border-white/5"
                    maxLength={50}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
