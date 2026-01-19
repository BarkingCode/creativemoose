/**
 * LoginPromptModal Component
 *
 * Modal shown when anonymous user exhausts free tries.
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
  Dimensions,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { X, Mail, Lock, Sparkles } from "lucide-react-native";
import { useAuth } from "../contexts/AuthContext";

const { height } = Dimensions.get("window");

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type AuthMode = "options" | "email" | "magiclink";

export function LoginPromptModal({
  isOpen,
  onClose,
  onSuccess,
}: LoginPromptModalProps) {
  const { signIn, signUp, signInWithOAuth, signInWithOTP } = useAuth();
  const [mode, setMode] = useState<AuthMode>("options");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backdropOpacity = useSharedValue(isOpen ? 1 : 0);
  const contentTranslateY = useSharedValue(isOpen ? 0 : height);

  useEffect(() => {
    if (isOpen) {
      backdropOpacity.value = withTiming(1, { duration: 300 });
      contentTranslateY.value = withSpring(0, { damping: 20 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      contentTranslateY.value = withTiming(height, { duration: 200 });
    }
  }, [isOpen]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
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
      const { error } = await signInWithOTP(email);
      if (error) throw error;
      Alert.alert(
        "Magic Link Sent",
        "Check your email for a sign-in link. Click it to sign in."
      );
    } catch (err: any) {
      setError(err.message || "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMode("options");
    setEmail("");
    setPassword("");
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal transparent visible={isOpen} animationType="none">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end"
      >
        <Animated.View
          className="absolute inset-0 bg-black/60"
          style={backdropStyle}
        >
          <TouchableOpacity
            className="absolute inset-0"
            onPress={handleClose}
            activeOpacity={1}
          />
        </Animated.View>

        <Animated.View
          className="bg-[#1a1517] rounded-t-3xl p-6 pb-10 max-h-[85%] border-t border-l border-r border-white/10"
          style={contentStyle}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-row items-center gap-2.5 flex-1">
                <Sparkles color="#f59e0b" size={24} strokeWidth={2} />
                <Text className="text-xl font-bold text-white flex-1">
                  You've used your free tries!
                </Text>
              </View>
              <TouchableOpacity onPress={handleClose} className="p-1">
                <X color="white" size={24} />
              </TouchableOpacity>
            </View>

            <Text className="text-[15px] text-white/60 mb-6">
              Sign up to continue creating amazing AI photos
            </Text>

            {error && (
              <View className="bg-red-500/10 p-3 rounded-lg mb-4">
                <Text className="text-red-500 text-sm text-center">{error}</Text>
              </View>
            )}

            {mode === "options" && (
              <View className="gap-3">
                {/* Google */}
                <TouchableOpacity
                  className="bg-white py-3.5 rounded-xl items-center"
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                >
                  <Text className="text-base font-semibold text-background">
                    Continue with Google
                  </Text>
                </TouchableOpacity>

                {/* Apple */}
                <TouchableOpacity
                  className="bg-black py-3.5 rounded-xl items-center border border-white/20"
                  onPress={handleAppleSignIn}
                  disabled={loading}
                >
                  <Text className="text-base font-semibold text-white">
                    Continue with Apple
                  </Text>
                </TouchableOpacity>

                <View className="flex-row items-center my-2">
                  <View className="flex-1 h-[1px] bg-white/10" />
                  <Text className="text-white/40 px-4 text-sm">or</Text>
                  <View className="flex-1 h-[1px] bg-white/10" />
                </View>

                {/* Email option */}
                <TouchableOpacity
                  className="flex-row items-center justify-center gap-2.5 bg-white/10 py-3.5 rounded-xl"
                  onPress={() => setMode("email")}
                >
                  <Mail color="white" size={20} />
                  <Text className="text-white text-base font-medium">
                    Continue with Email
                  </Text>
                </TouchableOpacity>

                {/* Magic Link option */}
                <TouchableOpacity
                  className="items-center py-3"
                  onPress={() => setMode("magiclink")}
                >
                  <Text className="text-white/60 text-sm underline">
                    Send me a Magic Link
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === "email" && (
              <View className="gap-4">
                <View className="flex-row items-center bg-white/5 rounded-xl px-4 gap-3 border border-white/10">
                  <Mail color="rgba(255,255,255,0.5)" size={20} />
                  <TextInput
                    className="flex-1 text-white text-base py-3.5"
                    placeholder="Email"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View className="flex-row items-center bg-white/5 rounded-xl px-4 gap-3 border border-white/10">
                  <Lock color="rgba(255,255,255,0.5)" size={20} />
                  <TextInput
                    className="flex-1 text-white text-base py-3.5"
                    placeholder="Password"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  className="bg-white py-3.5 rounded-xl items-center mt-2"
                  onPress={handleEmailAuth}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#0f0a0a" />
                  ) : (
                    <Text className="text-base font-semibold text-background">
                      {isSignUp ? "Sign Up" : "Sign In"}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsSignUp(!isSignUp)}
                  className="items-center py-2"
                >
                  <Text className="text-white/60 text-sm">
                    {isSignUp
                      ? "Already have an account? Sign In"
                      : "Don't have an account? Sign Up"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setMode("options")}
                  className="items-center py-2"
                >
                  <Text className="text-white/40 text-sm">Back to options</Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === "magiclink" && (
              <View className="gap-4">
                <View className="flex-row items-center bg-white/5 rounded-xl px-4 gap-3 border border-white/10">
                  <Mail color="rgba(255,255,255,0.5)" size={20} />
                  <TextInput
                    className="flex-1 text-white text-base py-3.5"
                    placeholder="Email"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <TouchableOpacity
                  className="bg-white py-3.5 rounded-xl items-center"
                  onPress={handleMagicLink}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#0f0a0a" />
                  ) : (
                    <Text className="text-base font-semibold text-background">
                      Send Magic Link
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setMode("options")}
                  className="items-center py-2"
                >
                  <Text className="text-white/40 text-sm">Back to options</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
