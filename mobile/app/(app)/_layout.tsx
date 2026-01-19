/**
 * App Layout (Authenticated)
 *
 * Layout for authenticated screens. Protects routes by checking auth state
 * and redirecting unauthenticated users to sign-in.
 */

import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { View, Text } from "react-native";

export default function AppLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    // If not authenticated, redirect to sign-in
    if (!user) {
      router.replace("/(auth)/sign-in");
    }
  }, [user, isLoading]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-white text-lg">Loading...</Text>
      </View>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0f0a0a" },
        animation: "fade",
      }}
    >
      <Stack.Screen name="generate" />
      <Stack.Screen
        name="results"
        options={{ animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="purchase"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
    </Stack>
  );
}
