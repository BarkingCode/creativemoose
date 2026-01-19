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
        animation: "slide_from_bottom",
      }}
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
