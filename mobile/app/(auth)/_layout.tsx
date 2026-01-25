/**
 * Auth Layout
 *
 * Layout for authentication screens (sign-in, sign-up).
 * These screens are only accessible to unauthenticated users.
 */

import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0f0a0a" },
        // Fade animation for switching between sign-in/sign-up (no slide)
        animation: "fade",
        // Disable swipe gesture since these screens replace each other
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
