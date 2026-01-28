/**
 * Tab Layout
 *
 * Bottom tab navigation for authenticated users.
 * Three tabs: Home (feed), Create (+), Gallery.
 *
 * Features:
 * - Custom tab bar styling
 * - Center Create button with prominent styling
 * - Auth guard - redirects to landing if not authenticated
 */

import { Tabs, useRouter } from "expo-router";
import { View } from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useEffect } from "react";
import { Home, Plus, Image as ImageIcon } from "lucide-react-native";

export default function TabLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // All users (including anonymous) have a valid user object
  // Only redirect if somehow there's no user at all (shouldn't happen)
  useEffect(() => {
    if (!isLoading && !user) {
      console.log("[TabLayout] No user found, redirecting to landing");
      router.replace("/");
    }
  }, [user, isLoading, router]);

  // Show nothing while checking auth
  if (isLoading || !user) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#1a1517",
          borderTopWidth: 1,
          borderTopColor: "rgba(255, 255, 255, 0.1)",
          height: 85,
          paddingTop: 8,
          paddingBottom: 24,
          paddingHorizontal: 24,
        },
        tabBarActiveTintColor: "white",
        tabBarInactiveTintColor: "rgba(255, 255, 255, 0.5)",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`p-2 rounded-xl ${focused ? "bg-white/10" : ""}`}
            >
              <View pointerEvents="none">
                <Home color={color} size={24} strokeWidth={2} />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="generate"
        options={{
          title: "",
          tabBarStyle: { display: "none" },
          tabBarIcon: ({ focused }) => (
            <View className="w-14 h-14 rounded-2xl bg-white justify-center items-center mb-10 shadow-lg shadow-white/30">
              <View pointerEvents="none">
                <Plus color="#0f0a0a" size={28} strokeWidth={2.5} />
              </View>
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: "Gallery",
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`p-2 rounded-xl ${focused ? "bg-white/10" : ""}`}
            >
              <View pointerEvents="none">
                <ImageIcon color={color} size={24} strokeWidth={2} />
              </View>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
