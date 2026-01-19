/**
 * Sign In Screen
 *
 * Allows users to sign in with multiple methods:
 * - Google OAuth
 * - Apple OAuth
 * - Email/Password
 * - Magic Link (OTP)
 */

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { ArrowLeft, Mail, Lock, Sparkles } from "lucide-react-native";

type AuthMode = "options" | "email" | "magiclink";

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, signInWithOAuth, signInWithOTP } = useAuth();

  const [mode, setMode] = useState<AuthMode>("options");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      Alert.alert("Sign In Failed", error.message);
    } else {
      router.replace("/(tabs)/home");
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const { error } = await signInWithOAuth("google");
    setIsLoading(false);

    if (error) {
      Alert.alert("Sign In Failed", error.message);
    }
    // OAuth will redirect, no need to navigate
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    const { error } = await signInWithOAuth("apple");
    setIsLoading(false);

    if (error) {
      Alert.alert("Sign In Failed", error.message);
    }
    // OAuth will redirect, no need to navigate
  };

  const handleMagicLink = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email");
      return;
    }

    setIsLoading(true);
    const { error } = await signInWithOTP(email);
    setIsLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert(
        "Check Your Email",
        "We sent you a magic link. Click it to sign in.",
        [{ text: "OK" }]
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 pt-8">
            {/* Back Button */}
            <Pressable
              onPress={() => (mode === "options" ? router.back() : setMode("options"))}
              className="w-10 h-10 bg-[#1a1517] rounded-full items-center justify-center mb-8"
            >
              <ArrowLeft color="white" size={20} />
            </Pressable>

            {/* Header */}
            <View className="mb-8">
              <Text className="text-white text-3xl font-bold">Welcome back</Text>
              <Text className="text-white/60 mt-2">
                Sign in to continue generating amazing photos
              </Text>
            </View>

            {mode === "options" && (
              <View className="gap-3">
                {/* Google */}
                <Pressable
                  onPress={handleGoogleSignIn}
                  disabled={isLoading}
                  className="bg-white py-4 rounded-xl items-center active:opacity-80"
                >
                  <Text className="text-background font-semibold text-base">
                    Continue with Google
                  </Text>
                </Pressable>

                {/* Apple */}
                <Pressable
                  onPress={handleAppleSignIn}
                  disabled={isLoading}
                  className="bg-black py-4 rounded-xl items-center border border-white/20 active:opacity-80"
                >
                  <Text className="text-white font-semibold text-base">
                    Continue with Apple
                  </Text>
                </Pressable>

                {/* Divider */}
                <View className="flex-row items-center my-4">
                  <View className="flex-1 h-[1px] bg-white/10" />
                  <Text className="text-white/40 px-4 text-sm">or</Text>
                  <View className="flex-1 h-[1px] bg-white/10" />
                </View>

                {/* Email option */}
                <Pressable
                  onPress={() => setMode("email")}
                  className="flex-row items-center justify-center gap-2.5 bg-white/10 py-4 rounded-xl active:opacity-80"
                >
                  <Mail color="white" size={20} />
                  <Text className="text-white text-base font-medium">
                    Continue with Email
                  </Text>
                </Pressable>

                {/* Magic Link option */}
                <Pressable
                  onPress={() => setMode("magiclink")}
                  className="items-center py-4"
                >
                  <Text className="text-white/60 text-sm underline">
                    Send me a Magic Link instead
                  </Text>
                </Pressable>

                {/* Sign Up Link */}
                <View className="flex-row justify-center mt-4">
                  <Text className="text-white/60">Don't have an account? </Text>
                  <Link href="/(auth)/sign-up" asChild>
                    <Pressable>
                      <Text className="text-white font-semibold">Sign Up</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            )}

            {mode === "email" && (
              <View className="gap-4">
                <View className="flex-row items-center bg-[#1a1517] rounded-xl px-4 gap-3 border border-white/10">
                  <Mail color="rgba(255,255,255,0.5)" size={20} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="flex-1 text-white text-base py-4"
                  />
                </View>

                <View className="flex-row items-center bg-[#1a1517] rounded-xl px-4 gap-3 border border-white/10">
                  <Lock color="rgba(255,255,255,0.5)" size={20} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    secureTextEntry
                    className="flex-1 text-white text-base py-4"
                  />
                </View>

                <Pressable
                  onPress={handleEmailSignIn}
                  disabled={isLoading}
                  className={`bg-white py-4 rounded-xl items-center mt-2 ${
                    isLoading ? "opacity-50" : "active:opacity-80"
                  }`}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#0f0a0a" />
                  ) : (
                    <Text className="text-background font-semibold text-base">
                      Sign In
                    </Text>
                  )}
                </Pressable>

                {/* Sign Up Link */}
                <View className="flex-row justify-center mt-4">
                  <Text className="text-white/60">Don't have an account? </Text>
                  <Link href="/(auth)/sign-up" asChild>
                    <Pressable>
                      <Text className="text-white font-semibold">Sign Up</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            )}

            {mode === "magiclink" && (
              <View className="gap-4">
                <View className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/30 mb-2">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Sparkles color="#10b981" size={18} />
                    <Text className="text-emerald-500 font-semibold">
                      Passwordless Sign In
                    </Text>
                  </View>
                  <Text className="text-white/60 text-sm">
                    Enter your email and we'll send you a magic link. Click it to
                    sign in instantly - no password needed.
                  </Text>
                </View>

                <View className="flex-row items-center bg-[#1a1517] rounded-xl px-4 gap-3 border border-white/10">
                  <Mail color="rgba(255,255,255,0.5)" size={20} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="flex-1 text-white text-base py-4"
                  />
                </View>

                <Pressable
                  onPress={handleMagicLink}
                  disabled={isLoading}
                  className={`bg-white py-4 rounded-xl items-center mt-2 ${
                    isLoading ? "opacity-50" : "active:opacity-80"
                  }`}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#0f0a0a" />
                  ) : (
                    <Text className="text-background font-semibold text-base">
                      Send Magic Link
                    </Text>
                  )}
                </Pressable>

                {/* Sign Up Link */}
                <View className="flex-row justify-center mt-4">
                  <Text className="text-white/60">Don't have an account? </Text>
                  <Link href="/(auth)/sign-up" asChild>
                    <Pressable>
                      <Text className="text-white font-semibold">Sign Up</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
