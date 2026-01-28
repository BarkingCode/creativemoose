/**
 * Sign Up Screen
 *
 * Allows new users to create an account with multiple methods:
 * - Google OAuth
 * - Apple OAuth
 * - Email/Password (sends confirmation email)
 *
 * Uses React Hook Form with Zod validation for the email form.
 */

import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../contexts/AuthContext";
import FormInput from "../../components/form/FormInput";
import {
  signUpEmailSchema,
  SignUpEmailData,
} from "../../lib/validation/auth-schemas";
import { Mail, Lock, Gift } from "lucide-react-native";
import { HeaderButton } from "../../components/HeaderButton";

type AuthMode = "options" | "email" | "success";

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, signInWithOAuth, signInWithAppleNative } = useAuth();

  const [mode, setMode] = useState<AuthMode>("options");
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string>("");

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SignUpEmailData>({
    resolver: zodResolver(signUpEmailSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleEmailSignUp = async (data: SignUpEmailData) => {
    setServerError(null);
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password);
    setIsLoading(false);

    if (error) {
      setServerError(error.message);
    } else {
      setSuccessEmail(data.email);
      setMode("success");
    }
  };

  const handleGoogleSignUp = async () => {
    setServerError(null);
    setIsLoading(true);
    const { error } = await signInWithOAuth("google");
    setIsLoading(false);

    if (error && error.message !== "Authentication cancelled") {
      setServerError(error.message);
    }
  };

  const handleAppleSignUp = async () => {
    setServerError(null);
    setIsLoading(true);
    const { error } = await signInWithAppleNative();
    setIsLoading(false);

    if (error && error.message !== "Authentication cancelled") {
      setServerError(error.message);
    }
  };

  const handleBackPress = () => {
    setServerError(null);
    if (mode === "options") {
      router.back();
    } else if (mode === "success") {
      reset();
      setMode("options");
    } else {
      setMode("options");
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
            {/* Back Button - always shown since users can use app anonymously */}
            <HeaderButton
              variant="back"
              onPress={handleBackPress}
              className="mb-8"
            />

            {/* Header */}
            <View className="mb-6">
              <Text className="text-white text-3xl font-bold">
                {mode === "success" ? "Check your email" : "Create account"}
              </Text>
              <Text className="text-white/60 mt-2">
                {mode === "success"
                  ? "We sent you a verification link"
                  : "Start generating amazing AI profile photos"}
              </Text>
            </View>

            {/* Free Credit Banner - hide on success */}
            {mode !== "success" && (
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
            )}

            {/* Server Error Display */}
            {serverError && mode !== "success" && (
              <View className="bg-red-500/10 p-4 rounded-xl border border-red-500/30 mb-4">
                <Text className="text-red-400 text-sm text-center">
                  {serverError}
                </Text>
              </View>
            )}

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

                {/* Apple - iOS only */}
                {Platform.OS === "ios" && (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                    cornerRadius={12}
                    style={styles.appleButton}
                    onPress={handleAppleSignUp}
                  />
                )}

                {/* Divider */}
                <View className="flex-row items-center my-4">
                  <View className="flex-1 h-[1px] bg-white/10" />
                  <Text className="text-white/40 px-4 text-sm">or</Text>
                  <View className="flex-1 h-[1px] bg-white/10" />
                </View>

                {/* Email option */}
                <Pressable
                  onPress={() => {
                    setServerError(null);
                    setMode("email");
                  }}
                  className="flex-row items-center justify-center gap-2.5 bg-white/10 py-4 rounded-xl active:opacity-80"
                >
                  <View pointerEvents="none">
                    <Mail color="white" size={20} />
                  </View>
                  <Text className="text-white text-base font-medium">
                    Sign up with Email
                  </Text>
                </Pressable>

                {/* Terms */}
                <Text className="text-white/40 text-center text-xs mt-4 px-4">
                  By creating an account, you agree to our Terms of Service and
                  Privacy Policy
                </Text>

                {/* Sign In Link */}
                <View className="flex-row justify-center mt-4">
                  <Text className="text-white/60">
                    Already have an account?{" "}
                  </Text>
                  <Link href="/(auth)/sign-in" replace asChild>
                    <Pressable>
                      <Text className="text-white font-semibold">Sign In</Text>
                    </Pressable>
                  </Link>
                </View>

                {/* Credits now managed by Supabase for all users */}
              </View>
            )}

            {mode === "email" && (
              <View className="gap-4">
                <FormInput
                  control={control}
                  name="email"
                  icon={Mail}
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <FormInput
                  control={control}
                  name="password"
                  icon={Lock}
                  placeholder="Password (min 6 characters)"
                  secureTextEntry
                />

                <FormInput
                  control={control}
                  name="confirmPassword"
                  icon={Lock}
                  placeholder="Confirm password"
                  secureTextEntry
                />

                <Pressable
                  onPress={handleSubmit(handleEmailSignUp)}
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
                  <Text className="text-white/60">
                    Already have an account?{" "}
                  </Text>
                  <Link href="/(auth)/sign-in" replace asChild>
                    <Pressable>
                      <Text className="text-white font-semibold">Sign In</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            )}

            {mode === "success" && (
              <View className="gap-6">
                {/* Success Message */}
                <View className="bg-emerald-500/10 p-5 rounded-xl border border-emerald-500/30">
                  <Text className="text-emerald-400 font-semibold text-base mb-2">
                    Verification email sent
                  </Text>
                  <Text className="text-white/60 text-sm leading-5">
                    We've sent a confirmation email to{" "}
                    <Text className="text-white font-medium">{successEmail}</Text>.
                    Please verify your email and then sign in.
                  </Text>
                </View>

                {/* Go to Sign In Button */}
                <Pressable
                  onPress={() => router.replace("/(auth)/sign-in")}
                  className="bg-white py-4 rounded-xl items-center active:opacity-80"
                >
                  <Text className="text-background font-semibold text-base">
                    Go to Sign In
                  </Text>
                </Pressable>

                {/* Resend or Try Again */}
                <Pressable
                  onPress={() => {
                    reset();
                    setMode("email");
                  }}
                  className="items-center py-2"
                >
                  <Text className="text-white/60 text-sm underline">
                    Didn't receive it? Try again
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appleButton: {
    width: "100%",
    height: 56,
  },
});
