/**
 * Purchase Screen - Premium Credit Store
 *
 * A visually distinctive purchase experience with Northern Lights-inspired design.
 * - Tiered package cards with depth and hierarchy
 * - Aurora gradient accents on featured package
 * - Bold typography and premium feel
 * - Animated interactions
 *
 * Features:
 * - Loads offerings dynamically from RevenueCat
 * - Handles purchase flow with error handling
 * - Syncs credits to Supabase after successful purchase
 * - Handles SDK unavailability gracefully (e.g., iOS 26 beta)
 */

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRevenueCat } from "../../contexts/RevenueCatContext";
import { Button } from "../../components/Button";
import { HeaderButton } from "../../components/HeaderButton";
import { Sparkles, Zap, Crown, Check, ImageIcon } from "lucide-react-native";

// Fallback packages for when RevenueCat offerings aren't available
const FALLBACK_PACKAGES = [
  { id: "five_token_ios", credits: 5, price: "$1.99", popular: false, tier: "starter" },
  { id: "ten_token_ios", credits: 10, price: "$2.99", popular: true, tier: "popular" },
  { id: "twentyfive_token_ios", credits: 25, price: "$4.99", popular: false, tier: "pro" },
];

// Map product IDs to credit amounts and tiers
const PRODUCT_INFO: Record<string, { credits: number; tier: string }> = {
  "five_token_ios": { credits: 5, tier: "starter" },
  "ten_token_ios": { credits: 10, tier: "popular" },
  "twentyfive_token_ios": { credits: 25, tier: "pro" },
};

// Helper to get product info from various identifier formats
function getProductInfo(identifier: string, priceString?: string): { credits: number; tier: string } {
  // Direct match
  if (PRODUCT_INFO[identifier]) {
    return PRODUCT_INFO[identifier];
  }
  // Check if identifier contains a known product ID
  for (const [key, value] of Object.entries(PRODUCT_INFO)) {
    if (identifier.includes(key) || key.includes(identifier)) {
      return value;
    }
  }
  // Fallback based on identifier patterns
  if (identifier.includes("five") || identifier.includes("5")) {
    return { credits: 5, tier: "starter" };
  }
  if (identifier.includes("ten") || identifier.includes("10")) {
    return { credits: 10, tier: "popular" };
  }
  if (identifier.includes("twenty") || identifier.includes("25")) {
    return { credits: 25, tier: "pro" };
  }
  // Price-based fallback (last resort)
  if (priceString) {
    // Handle both US (1.99) and European (1,99) formats
    const normalized = priceString.replace(/[^0-9.,]/g, "").replace(",", ".");
    const price = parseFloat(normalized) || 0;
    if (price <= 2.5) return { credits: 5, tier: "starter" };
    if (price <= 4) return { credits: 10, tier: "popular" };
    return { credits: 25, tier: "pro" };
  }
  return { credits: 5, tier: "starter" }; // Default fallback
}

// Aurora gradient colors
const AURORA_COLORS = {
  primary: ["#10b981", "#06b6d4", "#8b5cf6"] as const,
  secondary: ["#059669", "#0891b2", "#7c3aed"] as const,
  glow: "rgba(16, 185, 129, 0.15)",
};

export default function PurchaseScreen() {
  const router = useRouter();
  const {
    offerings,
    isLoading,
    isPurchasing,
    error,
    isAvailable,
    purchasePackage,
    restorePurchases,
    refreshOfferings,
  } = useRevenueCat();

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  // Animation values
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Set default selection when offerings load
  useEffect(() => {
    if (offerings?.availablePackages?.length) {
      // Select the popular package by default, or first available
      const popularPkg = offerings.availablePackages.find(
        (pkg) => pkg.product.identifier.includes("ten")
      );
      const firstPkg = offerings.availablePackages[0];
      setSelectedPackageId(popularPkg?.identifier || firstPkg?.identifier || null);
    } else {
      // Use fallback default (starter tier since that's likely what's configured)
      setSelectedPackageId("five_token_ios");
    }
  }, [offerings]);

  const handlePurchase = async () => {
    if (!selectedPackageId) return;

    // Animate button press
    Animated.sequence([
      Animated.spring(buttonScale, { toValue: 0.95, useNativeDriver: true }),
      Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }),
    ]).start();

    const selectedPkg = offerings?.availablePackages?.find(
      (pkg) => pkg.identifier === selectedPackageId
    );

    if (selectedPkg) {
      const success = await purchasePackage(selectedPkg);
      if (success) {
        router.back();
      }
    } else {
      Alert.alert(
        "Unable to Purchase",
        "Products are still loading from the store. Please wait a moment and try again.",
        [
          { text: "Retry", onPress: () => refreshOfferings() },
          { text: "Cancel", style: "cancel" },
        ]
      );
    }
  };

  const handleRestore = async () => {
    await restorePurchases();
  };

  // Get packages to display
  const packages = offerings?.availablePackages || [];
  const useFallback = packages.length === 0;

  // Debug logging
  useEffect(() => {
    if (packages.length > 0) {
      console.log("[Purchase] Packages loaded:", packages.map(p => ({
        identifier: p.identifier,
        productId: p.product.identifier,
        price: p.product.priceString,
      })));
    }
  }, [packages]);

  // Get selected package info for CTA
  const getSelectedInfo = () => {
    if (!selectedPackageId) return { credits: 5, tier: "starter" };

    // Try to get from actual offerings
    const pkg = offerings?.availablePackages?.find(
      (p) => p.identifier === selectedPackageId
    );
    if (pkg) {
      return getProductInfo(pkg.product.identifier, pkg.product.priceString);
    }

    // Try fallback packages
    const fallbackPkg = FALLBACK_PACKAGES.find((p) => p.id === selectedPackageId);
    if (fallbackPkg) {
      return { credits: fallbackPkg.credits, tier: fallbackPkg.tier };
    }

    return getProductInfo(selectedPackageId);
  };
  const selectedInfo = getSelectedInfo();

  return (
    <View className="flex-1 bg-background">
      {/* Background Glow Effect */}
      <View
        className="absolute top-0 left-0 right-0 h-96"
        style={{ backgroundColor: AURORA_COLORS.glow }}
      />

      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
            <View className="flex-1" />
            <HeaderButton
              variant="close"
              background="glass"
              onPress={() => router.back()}
            />
          </View>

          {/* Hero Section */}
          <View className="px-6 mb-8">
            <View className="flex-row items-center gap-3 mb-3">
              <View className="w-12 h-12 rounded-2xl bg-gradient-to-br items-center justify-center overflow-hidden">
                <LinearGradient
                  colors={["#10b981", "#06b6d4"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="absolute inset-0"
                />
                <Sparkles color="white" size={24} />
              </View>
              <View>
                <Text className="text-white/50 text-sm tracking-wider uppercase">
                  Credit Store
                </Text>
              </View>
            </View>
            <Text className="text-white text-4xl font-bold tracking-tight">
              Unlock More{"\n"}
              <Text style={{ color: "#10b981" }}>Creations</Text>
            </Text>
            <Text className="text-white/60 text-base mt-3 leading-6">
              Each credit generates 4 unique AI variations of your photo with
              stunning Canadian-inspired presets.
            </Text>
          </View>

          {/* Loading State */}
          {isLoading && (
            <View className="py-16 items-center">
              <ActivityIndicator size="large" color="#10b981" />
              <Text className="text-white/50 mt-4">Loading packages...</Text>
            </View>
          )}

          {/* SDK Unavailable State */}
          {!isAvailable && !isLoading && (
            <View className="mx-6 mb-6">
              <LinearGradient
                colors={["rgba(251, 191, 36, 0.1)", "rgba(251, 191, 36, 0.05)"]}
                className="rounded-2xl p-5 border border-amber-500/20"
              >
                <Text className="text-amber-400 font-semibold text-lg mb-2">
                  Store Temporarily Unavailable
                </Text>
                <Text className="text-white/60 text-sm leading-5">
                  In-app purchases are currently unavailable. This may be due to
                  running a beta version of iOS.
                </Text>
              </LinearGradient>
            </View>
          )}

          {/* Error State */}
          {error && !isLoading && isAvailable && (
            <View className="mx-6 mb-6 py-8 items-center">
              <Text className="text-red-400 text-center mb-4">{error}</Text>
              <Pressable
                onPress={refreshOfferings}
                className="bg-white/10 px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-medium">Try Again</Text>
              </Pressable>
            </View>
          )}

          {/* Fallback Warning */}
          {useFallback && !isLoading && isAvailable && (
            <View className="mx-6 mb-4 py-3 px-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <Text className="text-amber-400 text-center text-sm">
                Connecting to store...
              </Text>
            </View>
          )}

          {/* Credit Packages */}
          {!isLoading && isAvailable && (
            <View className="px-4 gap-3">
              {useFallback
                ? FALLBACK_PACKAGES.map((pkg, index) => (
                    <PackageCard
                      key={pkg.id}
                      id={pkg.id}
                      credits={pkg.credits}
                      price={pkg.price}
                      tier={pkg.tier}
                      isSelected={selectedPackageId === pkg.id}
                      onSelect={() => setSelectedPackageId(pkg.id)}
                      index={index}
                    />
                  ))
                : packages.map((pkg, index) => {
                    const productId = pkg.product.identifier;
                    const priceStr = pkg.product.priceString;
                    const info = getProductInfo(productId, priceStr);
                    return (
                      <PackageCard
                        key={pkg.identifier}
                        id={pkg.identifier}
                        credits={info.credits}
                        price={priceStr}
                        tier={info.tier}
                        isSelected={selectedPackageId === pkg.identifier}
                        onSelect={() => setSelectedPackageId(pkg.identifier)}
                        index={index}
                      />
                    );
                  })}
            </View>
          )}

          {/* What You Get Section */}
          <View className="mx-6 mt-8">
            <Text className="text-white/40 text-xs tracking-wider uppercase mb-4">
              Included with every credit
            </Text>
            <View className="gap-3">
              <FeatureRow
                icon={<ImageIcon color="#10b981" size={18} />}
                text="4 unique AI-generated variations"
              />
              <FeatureRow
                icon={<Zap color="#06b6d4" size={18} />}
                text="High-resolution downloads"
              />
              <FeatureRow
                icon={<Sparkles color="#8b5cf6" size={18} />}
                text="All 10 Canadian presets & 6 styles"
              />
              <FeatureRow
                icon={<Crown color="#f59e0b" size={18} />}
                text="Credits never expire"
              />
            </View>
          </View>

          {/* Restore Purchases */}
          {isAvailable && (
            <Pressable onPress={handleRestore} className="mt-8 py-2">
              <Text className="text-white/40 text-center text-sm">
                Restore Purchases
              </Text>
            </Pressable>
          )}
        </ScrollView>

        {/* Fixed Purchase Button */}
        <View className="absolute bottom-0 left-0 right-0 bg-background border-t border-white/10">
          <SafeAreaView edges={["bottom"]}>
            <View className="px-6 pt-4 pb-2">
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <Button
                  onPress={handlePurchase}
                  disabled={isPurchasing || !selectedPackageId || isLoading || !isAvailable}
                  loading={isPurchasing}
                  loadingText="Processing..."
                >
                  {isAvailable
                    ? `Get ${selectedInfo.credits} Credits`
                    : "Unavailable"}
                </Button>
              </Animated.View>

              <Text className="text-white/30 text-xs text-center mt-3">
                {isAvailable
                  ? "Secure payment via App Store"
                  : "Please try again later"}
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </SafeAreaView>
    </View>
  );
}

interface PackageCardProps {
  id: string;
  credits: number;
  price: string;
  tier: string;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}

function PackageCard({
  id,
  credits,
  price,
  tier,
  isSelected,
  onSelect,
  index,
}: PackageCardProps) {
  const isPopular = tier === "popular";
  const isPro = tier === "pro";
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        speed: 50,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
      }),
    ]).start();
    onSelect();
  };

  // Calculate per-credit value (handle both US and European price formats)
  const normalizedPrice = price.replace(/[^0-9.,]/g, "").replace(",", ".");
  const priceNum = parseFloat(normalizedPrice) || 0;
  const perCredit = credits > 0 ? priceNum / credits : 0;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable onPress={handlePress} className="relative">
        {/* Popular Badge */}
        {isPopular && (
          <View className="absolute -top-3 left-1/2 z-10" style={{ marginLeft: -45 }}>
            <LinearGradient
              colors={["#10b981", "#06b6d4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="px-4 py-1.5 rounded-full"
            >
              <Text className="text-white text-xs font-bold tracking-wide">
                BEST VALUE
              </Text>
            </LinearGradient>
          </View>
        )}

        {/* Card Container */}
        <View
          className={`rounded-2xl overflow-hidden ${
            isSelected
              ? isPopular
                ? "border-2 border-emerald-500"
                : "border-2 border-white/50"
              : "border border-white/10"
          }`}
          style={{
            backgroundColor: isSelected
              ? isPopular
                ? "rgba(16, 185, 129, 0.1)"
                : "rgba(255, 255, 255, 0.08)"
              : "rgba(255, 255, 255, 0.03)",
          }}
        >
          {/* Aurora Glow for Popular */}
          {isPopular && isSelected && (
            <LinearGradient
              colors={["rgba(16, 185, 129, 0.2)", "rgba(6, 182, 212, 0.1)", "transparent"]}
              className="absolute inset-0"
            />
          )}

          <View className="p-5 flex-row items-center justify-between">
            {/* Left Side - Credits Info */}
            <View className="flex-row items-center flex-1">
              {/* Selection Indicator */}
              <View
                className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-4 ${
                  isSelected
                    ? isPopular
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-white bg-white"
                    : "border-white/30"
                }`}
              >
                {isSelected && <Check color={isPopular ? "white" : "#0f0a0a"} size={14} strokeWidth={3} />}
              </View>

              {/* Credit Amount */}
              <View>
                <View className="flex-row items-baseline gap-1">
                  <Text
                    className={`text-3xl font-bold ${
                      isSelected ? "text-white" : "text-white/70"
                    }`}
                  >
                    {credits}
                  </Text>
                  <Text
                    className={`text-base ${
                      isSelected ? "text-white/70" : "text-white/40"
                    }`}
                  >
                    credits
                  </Text>
                </View>
                <Text className="text-white/40 text-xs mt-0.5">
                  {credits * 4} photos • ${perCredit.toFixed(2)}/credit
                </Text>
              </View>
            </View>

            {/* Right Side - Price */}
            <View className="items-end">
              <Text
                className={`text-2xl font-bold ${
                  isPopular && isSelected ? "text-emerald-400" : "text-white"
                }`}
              >
                {price}
              </Text>
              {isPro && (
                <View className="flex-row items-center gap-1 mt-1">
                  <Crown color="#f59e0b" size={12} />
                  <Text className="text-amber-500 text-xs font-medium">
                    Save 17%
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function FeatureRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="w-8 h-8 rounded-lg bg-white/5 items-center justify-center">
        {icon}
      </View>
      <Text className="text-white/70 text-sm flex-1">{text}</Text>
    </View>
  );
}
