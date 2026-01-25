/**
 * LoginPromptModal Component
 *
 * Simple bottom sheet modal shown when anonymous user exhausts free tries.
 * Offers multiple authentication methods:
 * - Google OAuth
 * - Apple OAuth
 * - Email/Password
 * - Magic Link (OTP)
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Pressable,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Mail, Lock, Sparkles, CheckCircle } from "lucide-react-native";
import { HeaderButton } from "./HeaderButton";
import { useAuth } from "../contexts/AuthContext";
import OTPInput from "./OTPInput";

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type AuthMode = "options" | "email" | "magiclink" | "otp-verify" | "confirm-email";

export function LoginPromptModal({
  isOpen,
  onClose,
  onSuccess,
}: LoginPromptModalProps) {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, signInWithOAuth, signInWithOTP, verifyOTP } = useAuth();
  const [mode, setMode] = useState<AuthMode>("options");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Animation values
  const backdropOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(50);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    if (isOpen) {
      // Reset and animate in
      backdropOpacity.value = 0;
      contentOpacity.value = 0;
      contentTranslateY.value = 50;

      setTimeout(() => {
        backdropOpacity.value = withTiming(1, { duration: 300 });
        contentOpacity.value = withTiming(1, { duration: 350 });
        contentTranslateY.value = withTiming(0, { duration: 350 });
      }, 10);
    }
  }, [isOpen]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithOAuth("google");
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithOAuth("apple");
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Apple sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) throw error;
        Alert.alert(
          "Check your email",
          "We sent you a verification link. Please verify your email to continue."
        );
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError("Please enter your email");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error, isNewUser } = await signInWithOTP(email);
      if (error) throw error;

      // Store email for OTP verification
      setOtpEmail(email);

      if (isNewUser) {
        // New user - email confirmation link sent
        setMode("confirm-email");
      } else {
        // Existing user - 6-digit OTP code sent
        setMode("otp-verify");
        setResendCooldown(60);
      }
    } catch (err: any) {
      setError(err.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (code: string) => {
    if (code.length !== 6) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await verifyOTP(otpEmail, code);
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Invalid verification code");
      setOtpCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error } = await signInWithOTP(otpEmail);
      if (error) throw error;
      setResendCooldown(60);
      setSuccessMessage("Code sent! Check your email.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleClose = () => {
    // Animate out
    backdropOpacity.value = withTiming(0, { duration: 200 });
    contentOpacity.value = withTiming(0, { duration: 200 });
    contentTranslateY.value = withTiming(30, { duration: 200 });

    setTimeout(() => {
      setMode("options");
      setEmail("");
      setPassword("");
      setError(null);
      setOtpCode("");
      setOtpEmail("");
      setResendCooldown(0);
      setSuccessMessage(null);
      onClose();
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <Modal
      transparent
      visible={isOpen}
      animationType="none"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, justifyContent: "flex-end" }}
      >
        {/* Backdrop */}
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.6)",
            },
            backdropStyle,
          ]}
        >
          <Pressable style={{ flex: 1 }} onPress={handleClose} />
        </Animated.View>

        {/* Content */}
        <Animated.View
          style={[
            {
              backgroundColor: "#171717",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: insets.bottom + 20,
              maxHeight: "85%",
            },
            contentStyle,
          ]}
        >
          {/* Drag indicator */}
          <View
            style={{
              width: 36,
              height: 4,
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: 2,
              alignSelf: "center",
              marginBottom: 16,
            }}
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 8,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                <View pointerEvents="none">
                  <Sparkles color="#f59e0b" size={22} />
                </View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "white",
                    flex: 1,
                  }}
                >
                  Free tries used up!
                </Text>
              </View>

              <HeaderButton
                variant="close"
                size="sm"
                background="glass"
                onPress={handleClose}
              />
            </View>

            <Text
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.5)",
                marginBottom: 20,
              }}
            >
              Sign up to continue creating AI photos
            </Text>

            {error && (
              <View
                style={{
                  backgroundColor: "rgba(239,68,68,0.1)",
                  padding: 12,
                  borderRadius: 10,
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: "#ef4444", fontSize: 13, textAlign: "center" }}>
                  {error}
                </Text>
              </View>
            )}

            {mode === "options" && (
              <View style={{ gap: 12 }}>
                {/* Google */}
                <TouchableOpacity
                  style={{
                    backgroundColor: "white",
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                  }}
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#0a0a0a" }}>
                    Continue with Google
                  </Text>
                </TouchableOpacity>

                {/* Apple */}
                <TouchableOpacity
                  style={{
                    backgroundColor: "#000",
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.15)",
                  }}
                  onPress={handleAppleSignIn}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "white" }}>
                    Continue with Apple
                  </Text>
                </TouchableOpacity>

                {/* Divider */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginVertical: 4,
                  }}
                >
                  <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
                  <Text style={{ color: "rgba(255,255,255,0.3)", paddingHorizontal: 12, fontSize: 12 }}>
                    or
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
                </View>

                {/* Email option */}
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    backgroundColor: "rgba(255,255,255,0.08)",
                    paddingVertical: 14,
                    borderRadius: 12,
                  }}
                  onPress={() => setMode("email")}
                  activeOpacity={0.7}
                >
                  <View pointerEvents="none">
                    <Mail color="white" size={18} />
                  </View>
                  <Text style={{ color: "white", fontSize: 15, fontWeight: "500" }}>
                    Continue with Email
                  </Text>
                </TouchableOpacity>

                {/* Magic Link option */}
                <TouchableOpacity
                  style={{ alignItems: "center", paddingVertical: 10 }}
                  onPress={() => setMode("magiclink")}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 13,
                      textDecorationLine: "underline",
                    }}
                  >
                    Send me a Magic Link instead
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === "email" && (
              <View style={{ gap: 14 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    gap: 10,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                >
                  <Mail color="rgba(255,255,255,0.4)" size={18} />
                  <TextInput
                    style={{ flex: 1, color: "white", fontSize: 15, paddingVertical: 14 }}
                    placeholder="Email"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    gap: 10,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                >
                  <Lock color="rgba(255,255,255,0.4)" size={18} />
                  <TextInput
                    style={{ flex: 1, color: "white", fontSize: 15, paddingVertical: 14 }}
                    placeholder="Password"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: "white",
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    marginTop: 4,
                  }}
                  onPress={handleEmailAuth}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#0a0a0a" />
                  ) : (
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#0a0a0a" }}>
                      {isSignUp ? "Sign Up" : "Sign In"}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsSignUp(!isSignUp)}
                  style={{ alignItems: "center", paddingVertical: 8 }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                    {isSignUp
                      ? "Already have an account? Sign In"
                      : "Don't have an account? Sign Up"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setMode("options")}
                  style={{ alignItems: "center", paddingVertical: 8 }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
                    ← Back to options
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === "magiclink" && (
              <View style={{ gap: 14 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    gap: 10,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                >
                  <Mail color="rgba(255,255,255,0.4)" size={18} />
                  <TextInput
                    style={{ flex: 1, color: "white", fontSize: 15, paddingVertical: 14 }}
                    placeholder="Email"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: "white",
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                  }}
                  onPress={handleMagicLink}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#0a0a0a" />
                  ) : (
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#0a0a0a" }}>
                      Send Code
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setMode("options")}
                  style={{ alignItems: "center", paddingVertical: 8 }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
                    ← Back to options
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === "otp-verify" && (
              <View style={{ gap: 16 }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.7)",
                    textAlign: "center",
                    marginBottom: 4,
                  }}
                >
                  Enter the 6-digit code sent to{"\n"}
                  <Text style={{ color: "white", fontWeight: "500" }}>{otpEmail}</Text>
                </Text>

                {successMessage && (
                  <View
                    style={{
                      backgroundColor: "rgba(34,197,94,0.1)",
                      padding: 12,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ color: "#22c55e", fontSize: 13, textAlign: "center" }}>
                      {successMessage}
                    </Text>
                  </View>
                )}

                <OTPInput
                  value={otpCode}
                  onChange={setOtpCode}
                  onComplete={handleVerifyOTP}
                  isLoading={loading}
                  autoFocus
                />

                <TouchableOpacity
                  onPress={handleResendOTP}
                  disabled={resendCooldown > 0 || loading}
                  style={{ alignItems: "center", paddingVertical: 8 }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      color: resendCooldown > 0 ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.6)",
                      fontSize: 13,
                    }}
                  >
                    {resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : "Resend code"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setMode("magiclink");
                    setOtpCode("");
                    setError(null);
                  }}
                  style={{ alignItems: "center", paddingVertical: 8 }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
                    ← Change email
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === "confirm-email" && (
              <View style={{ gap: 16, alignItems: "center" }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: "rgba(34,197,94,0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <CheckCircle color="#22c55e" size={32} />
                </View>

                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "white",
                    textAlign: "center",
                  }}
                >
                  Check your email
                </Text>

                <Text
                  style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.6)",
                    textAlign: "center",
                    lineHeight: 20,
                  }}
                >
                  We sent a verification link to{"\n"}
                  <Text style={{ color: "white", fontWeight: "500" }}>{otpEmail}</Text>
                  {"\n\n"}
                  Click the link in the email to complete sign up.
                </Text>

                <TouchableOpacity
                  onPress={handleResendOTP}
                  disabled={resendCooldown > 0 || loading}
                  style={{
                    marginTop: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    backgroundColor: "rgba(255,255,255,0.08)",
                    borderRadius: 10,
                  }}
                  activeOpacity={0.7}
                >
                  {loading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text
                      style={{
                        color: resendCooldown > 0 ? "rgba(255,255,255,0.3)" : "white",
                        fontSize: 14,
                        fontWeight: "500",
                      }}
                    >
                      {resendCooldown > 0
                        ? `Request new link in ${resendCooldown}s`
                        : "Request New Link"}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setMode("magiclink");
                    setError(null);
                  }}
                  style={{ alignItems: "center", paddingVertical: 8 }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
                    ← Change email
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
