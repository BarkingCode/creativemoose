/**
 * Purchase Screen
 *
 * Displays credit purchase options using RevenueCat.
 * - Loads offerings dynamically from RevenueCat
 * - Handles purchase flow with error handling
 * - Syncs credits to Supabase after successful purchase
 * - Provides restore purchases functionality
 */

import { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PurchasesPackage } from "react-native-purchases";
import { useRevenueCat } from "../../contexts/RevenueCatContext";

// Fallback packages for when RevenueCat offerings aren't available
const FALLBACK_PACKAGES = [
  { id: "photoapp_5_credits", credits: 5, price: "$2.99", popular: false },
  { id: "photoapp_10_credits", credits: 10, price: "$4.99", popular: true },
  { id: "photoapp_25_credits", credits: 25, price: "$9.99", popular: false },
];

// Map product IDs to credit amounts
const PRODUCT_CREDITS: Record<string, number> = {
  "photoapp_5_credits": 5,
  "photoapp_10_credits": 10,
  "photoapp_25_credits": 25,
};

export default function PurchaseScreen() {
  const router = useRouter();
  const {
    offerings,
    isLoading,
    isPurchasing,
    error,
    purchasePackage,
    restorePurchases,
    refreshOfferings,
  } = useRevenueCat();

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  // Set default selection when offerings load
  useEffect(() => {
    if (offerings?.availablePackages?.length) {
      // Select the middle package (usually "popular") by default
      const middleIndex = Math.floor(offerings.availablePackages.length / 2);
      setSelectedPackageId(offerings.availablePackages[middleIndex]?.identifier || null);
    } else {
      // Use fallback default
      setSelectedPackageId("photoapp_10_credits");
    }
  }, [offerings]);

  const handlePurchase = async () => {
    if (!selectedPackageId) return;

    // Find the selected package from RevenueCat offerings
    const selectedPkg = offerings?.availablePackages?.find(
      (pkg) => pkg.identifier === selectedPackageId
    );

    if (selectedPkg) {
      const success = await purchasePackage(selectedPkg);
      if (success) {
        router.back();
      }
    }
  };

  const handleRestore = async () => {
    await restorePurchases();
  };

  // Get packages to display (from RevenueCat or fallback)
  const packages = offerings?.availablePackages || [];
  const useFallback = packages.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-6 pt-4 pb-8">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-8">
            <View>
              <Text className="text-white text-2xl font-bold">Get Credits</Text>
              <Text className="text-muted-foreground mt-1">
                Purchase credits to generate more photos
              </Text>
            </View>
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 bg-card rounded-full items-center justify-center"
            >
              <Text className="text-white text-xl">×</Text>
            </Pressable>
          </View>

          {/* Loading State */}
          {isLoading && (
            <View className="py-12 items-center">
              <ActivityIndicator size="large" color="#ffffff" />
              <Text className="text-muted-foreground mt-4">Loading packages...</Text>
            </View>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <View className="py-8 items-center">
              <Text className="text-red-400 text-center mb-4">{error}</Text>
              <Pressable
                onPress={refreshOfferings}
                className="bg-card px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-medium">Try Again</Text>
              </Pressable>
            </View>
          )}

          {/* Credit Packages */}
          {!isLoading && (
            <View className="gap-3">
              {useFallback
                ? FALLBACK_PACKAGES.map((pkg) => (
                    <PackageCard
                      key={pkg.id}
                      id={pkg.id}
                      credits={pkg.credits}
                      price={pkg.price}
                      isPopular={pkg.popular}
                      isSelected={selectedPackageId === pkg.id}
                      onSelect={() => setSelectedPackageId(pkg.id)}
                    />
                  ))
                : packages.map((pkg) => {
                    const productId = pkg.product.identifier;
                    const credits = PRODUCT_CREDITS[productId] || 0;
                    const isPopular = productId.includes("10");

                    return (
                      <PackageCard
                        key={pkg.identifier}
                        id={pkg.identifier}
                        credits={credits}
                        price={pkg.product.priceString}
                        isPopular={isPopular}
                        isSelected={selectedPackageId === pkg.identifier}
                        onSelect={() => setSelectedPackageId(pkg.identifier)}
                      />
                    );
                  })}
            </View>
          )}

          {/* Features */}
          <View className="mt-8 bg-card/50 p-4 rounded-2xl">
            <Text className="text-white font-semibold mb-3">What you get:</Text>
            <View className="gap-2">
              <FeatureItem text="4 unique AI-generated variations per credit" />
              <FeatureItem text="High-resolution downloads" />
              <FeatureItem text="All 10 Canadian presets" />
              <FeatureItem text="6 artistic styles" />
              <FeatureItem text="Credits never expire" />
            </View>
          </View>

          {/* Restore Purchases */}
          <Pressable onPress={handleRestore} className="mt-6 py-2">
            <Text className="text-muted-foreground text-center text-sm underline">
              Restore Purchases
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Purchase Button - Fixed at Bottom */}
      <View className="px-6 pb-6 pt-2 bg-background border-t border-border">
        <Pressable
          onPress={handlePurchase}
          disabled={isPurchasing || !selectedPackageId || isLoading}
          className={`bg-white py-4 rounded-2xl items-center ${
            isPurchasing || !selectedPackageId || isLoading
              ? "opacity-50"
              : "active:opacity-80"
          }`}
        >
          {isPurchasing ? (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color="#0f0a0a" />
              <Text className="text-background font-semibold text-lg ml-2">
                Processing...
              </Text>
            </View>
          ) : (
            <Text className="text-background font-semibold text-lg">
              Purchase
            </Text>
          )}
        </Pressable>

        <Text className="text-muted-foreground text-xs text-center mt-3">
          Secure payment powered by Apple Pay / Google Pay
        </Text>
      </View>
    </SafeAreaView>
  );
}

interface PackageCardProps {
  id: string;
  credits: number;
  price: string;
  isPopular: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

function PackageCard({
  id,
  credits,
  price,
  isPopular,
  isSelected,
  onSelect,
}: PackageCardProps) {
  return (
    <Pressable
      onPress={onSelect}
      className={`p-4 rounded-2xl border-2 ${
        isSelected ? "border-white bg-card" : "border-border bg-card/50"
      }`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          {/* Radio Button */}
          <View
            className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-3 ${
              isSelected ? "border-white" : "border-muted-foreground"
            }`}
          >
            {isSelected && <View className="w-3 h-3 rounded-full bg-white" />}
          </View>

          <View>
            <View className="flex-row items-center">
              <Text className="text-white font-bold text-lg">
                {credits} Credits
              </Text>
              {isPopular && (
                <View className="ml-2 bg-green-500/20 px-2 py-0.5 rounded-full">
                  <Text className="text-green-400 text-xs font-medium">
                    POPULAR
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-muted-foreground text-sm">
              {credits} AI-generated photos
            </Text>
          </View>
        </View>

        <Text className="text-white font-bold text-xl">{price}</Text>
      </View>
    </Pressable>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <View className="flex-row items-center">
      <Text className="text-green-400 mr-2">✓</Text>
      <Text className="text-muted-foreground">{text}</Text>
    </View>
  );
}
