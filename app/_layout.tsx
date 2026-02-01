/**
 * Root Layout
 *
 * The root layout wraps the entire app with providers:
 * - AuthProvider for authentication state
 * - RevenueCatProvider for in-app purchases
 * - SafeAreaProvider for safe area insets
 * - GestureHandlerRootView for gesture handling
 * - Automatic EAS update checking
 * - Push notification registration
 */

import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { RevenueCatProvider } from "../contexts/RevenueCatContext";
import { BiometricLockProvider } from "../contexts/BiometricLockContext";
import { BiometricLockScreen } from "../components/BiometricLockScreen";
import { useAppUpdates } from "../hooks/useAppUpdates";
import { useNotifications } from "../hooks/useNotifications";
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

/**
 * Notification handler component - registers for push notifications
 * Must be inside AuthProvider to access user ID
 */
function NotificationHandler({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  // Register for push notifications and save token to profile
  useNotifications({
    userId: user?.id,
    onNotificationResponse: (response) => {
      // Handle notification tap - navigate to relevant screen
      const data = response.notification.request.content.data;

      if (data?.type === "generation_complete" && data?.generationId) {
        // Navigate to results screen with generation ID
        router.push(`/(app)/results?id=${data.generationId}`);
      }
    },
  });

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <UpdateChecker>
          <AuthProvider>
            <NotificationHandler>
              <RevenueCatProvider>
                <BiometricLockProvider>
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
                  {/* Biometric lock overlay - renders on top of everything */}
                  <BiometricLockScreen />
                </BiometricLockProvider>
              </RevenueCatProvider>
            </NotificationHandler>
          </AuthProvider>
        </UpdateChecker>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
