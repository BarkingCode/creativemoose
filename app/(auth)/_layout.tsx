/**
 * Auth Layout
 *
 * Layout for authentication-related screens.
 * Currently only contains the callback handler for OAuth redirects.
 */

import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0f0a0a" },
        animation: "fade",
        gestureEnabled: false,
      }}
    />
  );
}
