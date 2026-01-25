/**
 * Auth Callback Screen
 *
 * Handles deep link callbacks from Supabase auth (magic links, OAuth).
 * Extracts tokens from the URL and exchanges them for a session.
 */

import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Get the full URL that opened the app
      const url = await Linking.getInitialURL();
      console.log("[Auth Callback] URL received:", url);

      if (url) {
        // Supabase returns tokens in the URL fragment (after #)
        // Example: kg-photo://auth/callback#access_token=xxx&refresh_token=xxx&...
        const hashIndex = url.indexOf("#");
        const queryIndex = url.indexOf("?");

        let params: Record<string, string> = {};

        // Parse fragment (hash) parameters - this is where Supabase puts tokens
        if (hashIndex !== -1) {
          const fragment = url.substring(hashIndex + 1);
          const fragmentParams = new URLSearchParams(fragment);
          fragmentParams.forEach((value, key) => {
            params[key] = value;
          });
        }

        // Also check query parameters as fallback
        if (queryIndex !== -1) {
          const endIndex = hashIndex !== -1 ? hashIndex : url.length;
          const queryString = url.substring(queryIndex + 1, endIndex);
          const queryParams = new URLSearchParams(queryString);
          queryParams.forEach((value, key) => {
            if (!params[key]) params[key] = value;
          });
        }

        console.log("[Auth Callback] Parsed params:", Object.keys(params));

        const accessToken = params.access_token;
        const refreshToken = params.refresh_token;
        const tokenHash = params.token_hash;
        const type = params.type;

        if (accessToken && refreshToken) {
          console.log("[Auth Callback] Setting session with tokens");
          // Set the session directly with the tokens
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("[Auth Callback] setSession error:", error.message);
            setError(error.message);
            return;
          }
          console.log("[Auth Callback] Session set successfully");
        } else if (tokenHash && type) {
          console.log("[Auth Callback] Verifying OTP with token_hash");
          // Handle email confirmation / magic link with token_hash
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "email" | "magiclink" | "signup",
          });

          if (error) {
            console.error("[Auth Callback] verifyOtp error:", error.message);
            setError(error.message);
            return;
          }
          console.log("[Auth Callback] OTP verified successfully");
        } else {
          console.warn("[Auth Callback] No valid auth params found in URL");
        }
      }

      // Success - navigate to home
      router.replace("/(tabs)/home");
    } catch (err) {
      console.error("[Auth Callback] Error:", err);
      setError(err instanceof Error ? err.message : "Authentication failed");
    }
  };

  if (error) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-red-500 text-lg font-semibold mb-2">
          Authentication Failed
        </Text>
        <Text className="text-white/60 text-center mb-6">{error}</Text>
        <Text
          className="text-white underline"
          onPress={() => router.replace("/(auth)/sign-in")}
        >
          Back to Sign In
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background items-center justify-center">
      <ActivityIndicator size="large" color="white" />
      <Text className="text-white/60 mt-4">Signing you in...</Text>
    </View>
  );
}
