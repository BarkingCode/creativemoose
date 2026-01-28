/**
 * Sign In Screen
 *
 * Allows users to sign in with multiple methods:
 * - Google OAuth
 * - Apple OAuth
 * - Email/Password
 * - OTP (6-digit code via email)
 *
 * Uses React Hook Form with Zod validation for form modes.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  AppState,
  AppStateStatus,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../contexts/AuthContext";
import FormInput from "../../components/form/FormInput";
import FormOTPInput from "../../components/form/FormOTPInput";
import {
  signInEmailSchema,
  SignInEmailData,
  signInOTPRequestSchema,
  SignInOTPRequestData,
  signInOTPVerifySchema,
  SignInOTPVerifyData,
} from "../../lib/validation/auth-schemas";
import { Mail, Lock, Sparkles, MailCheck } from "lucide-react-native";
import { HeaderButton } from "../../components/HeaderButton";

type AuthMode = "options" | "email" | "otp" | "otp-verify" | "confirm-email";

const RESEND_COOLDOWN_SECONDS = 60;

// Module-level persistence for OTP state survives component unmount/remount
// This allows the screen to restore to otp-verify when user returns from background
let persistedOtpState: { mode: AuthMode; email: string } | null = null;

// Function to clear persisted OTP state (call on sign out)
export function clearPersistedOtpState() {
  persistedOtpState = null;
}

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, signInWithOAuth, signInWithAppleNative, signInWithOTP, verifyOTP } = useAuth();

  const [mode, setMode] = useState<AuthMode>("options");
  const [otpEmail, setOtpEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Restore persisted OTP state on mount (handles component remount after background)
  useEffect(() => {
    if (persistedOtpState && persistedOtpState.mode === "otp-verify") {
      console.log("[SignIn] Restoring OTP state from module persistence");
      setMode(persistedOtpState.mode);
      setOtpEmail(persistedOtpState.email);
    }
  }, []);

  // Persist OTP state when entering otp-verify mode
  useEffect(() => {
    if (mode === "otp-verify" && otpEmail) {
      persistedOtpState = { mode, email: otpEmail };
    } else if (mode === "options") {
      // Clear persistence when user goes back to options
      persistedOtpState = null;
    }
  }, [mode, otpEmail]);

  // Handle app state changes to restore OTP screen when returning from background
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // Restore from module-level persistence if we were on OTP verify
        if (persistedOtpState?.mode === "otp-verify") {
          console.log("[SignIn] App resumed, restoring OTP verify screen");
          setMode("otp-verify");
          setOtpEmail(persistedOtpState.email);
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Email/Password form
  const emailForm = useForm<SignInEmailData>({
    resolver: zodResolver(signInEmailSchema),
    defaultValues: { email: "", password: "" },
  });

  // OTP Request form (email only)
  const otpRequestForm = useForm<SignInOTPRequestData>({
    resolver: zodResolver(signInOTPRequestSchema),
    defaultValues: { email: "" },
  });

  // OTP Verify form (6-digit code)
  const otpVerifyForm = useForm<SignInOTPVerifyData>({
    resolver: zodResolver(signInOTPVerifySchema),
    defaultValues: { code: "" },
  });

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Clear errors and messages on mode change
  const switchMode = (newMode: AuthMode) => {
    setServerError(null);
    setResendMessage(null);
    setMode(newMode);
  };

  const handleEmailSignIn = async (data: SignInEmailData) => {
    setServerError(null);
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);

    if (error) {
      setServerError(error.message);
    } else {
      router.replace("/(tabs)/home");
    }
  };

  const handleGoogleSignIn = async () => {
    setServerError(null);
    setIsLoading(true);
    const { error } = await signInWithOAuth("google");
    setIsLoading(false);

    if (error && error.message !== "Authentication cancelled") {
      setServerError(error.message);
    }
  };

  const handleAppleSignIn = async () => {
    setServerError(null);
    setIsLoading(true);
    const { error } = await signInWithAppleNative();
    setIsLoading(false);

    if (error && error.message !== "Authentication cancelled") {
      setServerError(error.message);
    }
  };

  const handleSendOTP = async (data: SignInOTPRequestData) => {
    setServerError(null);
    setIsLoading(true);
    const { error, isNewUser } = await signInWithOTP(data.email);
    setIsLoading(false);

    if (error) {
      setServerError(error.message);
    } else {
      setOtpEmail(data.email);
      if (isNewUser) {
        // New user - confirmation email sent, not OTP
        switchMode("confirm-email");
      } else {
        // Existing user - OTP code sent
        otpVerifyForm.reset({ code: "" });
        switchMode("otp-verify");
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
      }
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setServerError(null);
    setResendMessage(null);
    setIsLoading(true);
    const { error } = await signInWithOTP(otpEmail);
    setIsLoading(false);

    if (error) {
      setServerError(error.message);
    } else {
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      otpVerifyForm.reset({ code: "" });
      setResendMessage(`New code sent to ${otpEmail}`);
    }
  };

  const handleVerifyOTP = useCallback(
    async (code: string) => {
      setServerError(null);
      setResendMessage(null);
      setIsLoading(true);
      const { error } = await verifyOTP(otpEmail, code);
      setIsLoading(false);

      if (error) {
        setServerError(error.message);
        otpVerifyForm.reset({ code: "" });
      } else {
        router.replace("/(tabs)/home");
      }
    },
    [otpEmail, verifyOTP, router, otpVerifyForm]
  );

  const handleBackPress = () => {
    setServerError(null);
    setResendMessage(null);
    if (mode === "otp-verify" || mode === "confirm-email") {
      switchMode("otp");
    } else if (mode === "options") {
      router.back();
    } else {
      switchMode("options");
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
            <View className="mb-8">
              <Text className="text-white text-3xl font-bold">
                {mode === "otp-verify"
                  ? "Enter Code"
                  : mode === "confirm-email"
                    ? "Verify Your Email"
                    : "Welcome back"}
              </Text>
              <Text className="text-white/60 mt-2">
                {mode === "otp-verify"
                  ? `Enter the 6-digit code sent to ${otpEmail}`
                  : mode === "confirm-email"
                    ? `We sent a verification link to ${otpEmail}`
                    : "Sign in to continue generating amazing photos"}
              </Text>
            </View>

            {/* Server Error Display */}
            {serverError && (
              <View className="bg-red-500/10 p-4 rounded-xl border border-red-500/30 mb-4">
                <Text className="text-red-400 text-sm text-center">
                  {serverError}
                </Text>
              </View>
            )}

            {/* Resend Success Message */}
            {resendMessage && mode === "otp-verify" && (
              <View className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/30 mb-4">
                <Text className="text-emerald-400 text-sm text-center">
                  {resendMessage}
                </Text>
              </View>
            )}

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

                {/* Apple - iOS only */}
                {Platform.OS === "ios" && (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                    cornerRadius={12}
                    style={styles.appleButton}
                    onPress={handleAppleSignIn}
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
                  onPress={() => switchMode("email")}
                  className="flex-row items-center justify-center gap-2.5 bg-white/10 py-4 rounded-xl active:opacity-80"
                >
                  <View pointerEvents="none">
                    <Mail color="white" size={20} />
                  </View>
                  <Text className="text-white text-base font-medium">
                    Continue with Email
                  </Text>
                </Pressable>

                {/* OTP option */}
                <Pressable
                  onPress={() => switchMode("otp")}
                  className="items-center py-4"
                >
                  <Text className="text-white/60 text-sm underline">
                    Sign in with OTP code
                  </Text>
                </Pressable>

                {/* Sign Up Link */}
                <View className="flex-row justify-center mt-4">
                  <Text className="text-white/60">Don't have an account? </Text>
                  <Link href="/(auth)/sign-up" replace asChild>
                    <Pressable>
                      <Text className="text-white font-semibold">Sign Up</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            )}

            {mode === "email" && (
              <View className="gap-4">
                <FormInput
                  control={emailForm.control}
                  name="email"
                  icon={Mail}
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <FormInput
                  control={emailForm.control}
                  name="password"
                  icon={Lock}
                  placeholder="Password"
                  secureTextEntry
                />

                <Pressable
                  onPress={emailForm.handleSubmit(handleEmailSignIn)}
                  disabled={isLoading}
                  className={`bg-white py-4 rounded-xl items-center mt-2 ${isLoading ? "opacity-50" : "active:opacity-80"
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
                  <Link href="/(auth)/sign-up" replace asChild>
                    <Pressable>
                      <Text className="text-white font-semibold">Sign Up</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            )}

            {mode === "otp" && (
              <View className="gap-4">
                <View className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/30 mb-2">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Sparkles color="#10b981" size={18} />
                    <Text className="text-emerald-500 font-semibold">
                      Passwordless Sign In
                    </Text>
                  </View>
                  <Text className="text-white/60 text-sm">
                    Enter your email and we'll send you a 6-digit code. Enter
                    the code to sign in instantly.
                  </Text>
                </View>

                <FormInput
                  control={otpRequestForm.control}
                  name="email"
                  icon={Mail}
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Pressable
                  onPress={otpRequestForm.handleSubmit(handleSendOTP)}
                  disabled={isLoading}
                  className={`bg-white py-4 rounded-xl items-center mt-2 ${isLoading ? "opacity-50" : "active:opacity-80"
                    }`}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#0f0a0a" />
                  ) : (
                    <Text className="text-background font-semibold text-base">
                      Send Code
                    </Text>
                  )}
                </Pressable>

                {/* Sign Up Link */}
                <View className="flex-row justify-center mt-4">
                  <Text className="text-white/60">Don't have an account? </Text>
                  <Link href="/(auth)/sign-up" replace asChild>
                    <Pressable>
                      <Text className="text-white font-semibold">Sign Up</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            )}

            {mode === "otp-verify" && (
              <View className="gap-6">
                {/* OTP Input */}
                <FormOTPInput
                  control={otpVerifyForm.control}
                  name="code"
                  onComplete={handleVerifyOTP}
                  isLoading={isLoading}
                />

                {/* Verify Button */}
                {isLoading && (
                  <View className="items-center py-4">
                    <ActivityIndicator color="white" />
                    <Text className="text-white/60 mt-2">Verifying...</Text>
                  </View>
                )}

                {/* Resend Code */}
                <View className="items-center">
                  <Text className="text-white/40 text-sm mb-2">
                    Didn't receive the code?
                  </Text>
                  <Pressable
                    onPress={handleResendOTP}
                    disabled={resendCooldown > 0 || isLoading}
                  >
                    <Text
                      className={`text-sm font-medium ${resendCooldown > 0 ? "text-white/30" : "text-white underline"
                        }`}
                    >
                      {resendCooldown > 0
                        ? `Resend code in ${resendCooldown}s`
                        : "Resend Code"}
                    </Text>
                  </Pressable>
                </View>

                {/* Sign Up Link */}
                <View className="flex-row justify-center mt-4">
                  <Text className="text-white/60">Don't have an account? </Text>
                  <Link href="/(auth)/sign-up" replace asChild>
                    <Pressable>
                      <Text className="text-white font-semibold">Sign Up</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            )}

            {mode === "confirm-email" && (
              <View className="gap-6">
                {/* Email Icon */}
                <View className="items-center py-8">
                  <View className="w-20 h-20 bg-emerald-500/10 rounded-full items-center justify-center mb-4">
                    <MailCheck color="#10b981" size={40} />
                  </View>
                </View>

                {/* Confirmation Message */}
                <View className="bg-neutral-900 p-5 rounded-xl border border-white/10">
                  <Text className="text-white font-semibold text-base mb-2">
                    Check your inbox
                  </Text>
                  <Text className="text-white/60 text-sm leading-5">
                    We sent a verification link to{" "}
                    <Text className="text-white font-medium">{otpEmail}</Text>.
                    Click the link to verify your email address.
                  </Text>
                </View>

                {/* Next Steps */}
                <View className="bg-white/5 p-4 rounded-xl">
                  <Text className="text-white/80 text-sm leading-5">
                    Once verified, come back here and request a new code to sign in.
                  </Text>
                </View>

                {/* Try Again Button */}
                <Pressable
                  onPress={() => switchMode("otp")}
                  className="bg-white py-4 rounded-xl items-center active:opacity-80"
                >
                  <Text className="text-background font-semibold text-base">
                    Request OTP Code
                  </Text>
                </Pressable>

                {/* Sign In Link */}
                <View className="flex-row justify-center mt-2">
                  <Text className="text-white/60">Already verified? </Text>
                  <Pressable onPress={() => switchMode("otp")}>
                    <Text className="text-white font-semibold">Try Again</Text>
                  </Pressable>
                </View>
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
