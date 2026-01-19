/**
 * Sign Up Screen
 *
 * Allows new users to create an account with multiple methods:
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
import { ArrowLeft, Mail, Lock, Sparkles, Gift } from "lucide-react-native";

type AuthMode = "options" | "email" | "magiclink";

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, signInWithOAuth, signInWithOTP } = useAuth();

  const [mode, setMode] = useState<AuthMode>("options");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(email, password);
    setIsLoading(false);

    if (error) {
      Alert.alert("Sign Up Failed", error.message);
    } else {
      Alert.alert(
        "Check Your Email",
        "We sent you a confirmation link. Please verify your email to continue.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(auth)/sign-in"),
          },
        ]
      );
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    const { error } = await signInWithOAuth("google");
    setIsLoading(false);

    if (error) {
      Alert.alert("Sign Up Failed", error.message);
    }
    // OAuth will redirect, no need to navigate
  };

  const handleAppleSignUp = async () => {
    setIsLoading(true);
    const { error } = await signInWithOAuth("apple");
    setIsLoading(false);

    if (error) {
      Alert.alert("Sign Up Failed", error.message);
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
        "We sent you a magic link. Click it to create your account and sign in.",
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
            <View className="mb-6">
              <Text className="text-white text-3xl font-bold">Create account</Text>
              <Text className="text-white/60 mt-2">
                Start generating amazing AI profile photos
              </Text>
            </View>

            {/* Free Credit Banner */}
            <View className="flex-row items-center gap-3 bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/30 mb-6">
              <Gift color="#10b981" size={24} />
              <View className="flex-1">
                <Text className="text-emerald-500 font-semibold">
                  1 Free Generation
                </Text>
                <Text className="text-white/60 text-sm">
                  Sign up now and get 1 free credit to try
                </Text>
              </View>
            </View>

            {mode === "options" && (
              <View className="gap-3">
                {/* Google */}
                <Pressable
                  onPress={handleGoogleSignUp}
                  disabled={isLoading}
                  className="bg-white py-4 rounded-xl items-center active:opacity-80"
                >
                  <Text className="text-background font-semibold text-base">
                    Continue with Google
                  </Text>
                </Pressable>

                {/* Apple */}
                <Pressable
                  onPress={handleAppleSignUp}
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
                    Sign up with Email
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

                {/* Terms */}
                <Text className="text-white/40 text-center text-xs mt-2 px-4">
                  By creating an account, you agree to our Terms of Service and
                  Privacy Policy
                </Text>

                {/* Sign In Link */}
                <View className="flex-row justify-center mt-4">
                  <Text className="text-white/60">Already have an account? </Text>
                  <Link href="/(auth)/sign-in" asChild>
                    <Pressable>
                      <Text className="text-white font-semibold">Sign In</Text>
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
                    placeholder="Password (min 6 characters)"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    secureTextEntry
                    className="flex-1 text-white text-base py-4"
                  />
                </View>

                <View className="flex-row items-center bg-[#1a1517] rounded-xl px-4 gap-3 border border-white/10">
                  <Lock color="rgba(255,255,255,0.5)" size={20} />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm password"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    secureTextEntry
                    className="flex-1 text-white text-base py-4"
                  />
                </View>

                <Pressable
                  onPress={handleEmailSignUp}
                  disabled={isLoading}
                  className={`bg-white py-4 rounded-xl items-center mt-2 ${
                    isLoading ? "opacity-50" : "active:opacity-80"
                  }`}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#0f0a0a" />
                  ) : (
                    <Text className="text-background font-semibold text-base">
                      Create Account
                    </Text>
                  )}
                </Pressable>

                {/* Terms */}
                <Text className="text-white/40 text-center text-xs px-4">
                  By creating an account, you agree to our Terms of Service and
                  Privacy Policy
                </Text>

                {/* Sign In Link */}
                <View className="flex-row justify-center mt-2">
                  <Text className="text-white/60">Already have an account? </Text>
                  <Link href="/(auth)/sign-in" asChild>
                    <Pressable>
                      <Text className="text-white font-semibold">Sign In</Text>
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
                      Passwordless Sign Up
                    </Text>
                  </View>
                  <Text className="text-white/60 text-sm">
                    Enter your email and we'll send you a magic link. Click it to
                    create your account instantly - no password needed.
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

                {/* Terms */}
                <Text className="text-white/40 text-center text-xs px-4">
                  By creating an account, you agree to our Terms of Service and
                  Privacy Policy
                </Text>

                {/* Sign In Link */}
                <View className="flex-row justify-center mt-2">
                  <Text className="text-white/60">Already have an account? </Text>
                  <Link href="/(auth)/sign-in" asChild>
                    <Pressable>
                      <Text className="text-white font-semibold">Sign In</Text>
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
