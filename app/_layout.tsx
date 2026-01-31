/**
 * Root Layout
 *
 * The root layout wraps the entire app with providers:
 * - AuthProvider for authentication state
 * - RevenueCatProvider for in-app purchases
 * - SafeAreaProvider for safe area insets
 * - GestureHandlerRootView for gesture handling
 * - Automatic EAS update checking
 */

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../contexts/AuthContext";
import { RevenueCatProvider } from "../contexts/RevenueCatContext";
import { useAppUpdates } from "../hooks/useAppUpdates";
import "../global.css";

/**
 * Update checker component - handles EAS OTA updates
 */
function UpdateChecker({ children }: { children: React.ReactNode }) {
  // Check for updates on app launch and when coming to foreground
  useAppUpdates({
    showAlert: true, // Prompt user before reloading
    checkOnForeground: true, // Check when app comes back from background
    minCheckInterval: 5 * 60 * 1000, // Don't check more than once per 5 minutes
  });

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <UpdateChecker>
          <AuthProvider>
            <RevenueCatProvider>
              <StatusBar style="light" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: "#0f0a0a" },
                  animation: "slide_from_right",
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(app)" options={{ headerShown: false }} />
              </Stack>
            </RevenueCatProvider>
          </AuthProvider>
        </UpdateChecker>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
