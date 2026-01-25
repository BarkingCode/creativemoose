/**
 * InviteFriendModal Component
 *
 * A bottom sheet modal for inviting friends via email.
 * Features:
 * - Email input with validation
 * - Loading, success, and error states
 * - Smooth slide-up animation
 * - Matches app's dark theme aesthetic
 */

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { Send, CheckCircle, UserPlus } from "lucide-react-native";
import { HeaderButton } from "./HeaderButton";
import { sendInvite } from "../lib/invite";
import { useAuth } from "../contexts/AuthContext";

interface InviteFriendModalProps {
  visible: boolean;
  onClose: () => void;
}

type ModalState = "idle" | "loading" | "success" | "error";

export default function InviteFriendModal({
  visible,
  onClose,
}: InviteFriendModalProps) {
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<ModalState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  // Animate modal in/out
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setTimeout(() => {
        setEmail("");
        setState("idle");
        setErrorMessage("");
      }, 300);
    }
  }, [visible]);

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleSend = async () => {
    if (!email.trim() || !isValidEmail(email)) {
      setState("error");
      setErrorMessage("Please enter a valid email address");
      return;
    }

    if (!session) {
      setState("error");
      setErrorMessage("You must be signed in to invite friends");
      return;
    }

    Keyboard.dismiss();
    setState("loading");
    setErrorMessage("");

    try {
      await sendInvite(email.trim(), session);
      setState("success");

      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error: any) {
      setState("error");

      if (error.message === "ALREADY_REGISTERED") {
        setErrorMessage("This email is already registered");
      } else if (error.message === "INVALID_EMAIL") {
        setErrorMessage("Please enter a valid email address");
      } else {
        setErrorMessage("Failed to send invitation. Please try again.");
      }
    }
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Backdrop */}
        <Animated.View
          style={{ opacity: fadeAnim }}
          className="absolute inset-0"
        >
          <Pressable onPress={handleClose} className="flex-1">
            <BlurView intensity={20} tint="dark" className="flex-1" />
          </Pressable>
        </Animated.View>

        {/* Modal Content */}
        <Animated.View
          style={{ transform: [{ translateY: slideAnim }] }}
          className="absolute bottom-0 left-0 right-0"
        >
          <View className="bg-neutral-900 rounded-t-3xl border-t border-white/10">
            {/* Handle Bar */}
            <View className="items-center pt-3 pb-2">
              <View className="w-10 h-1 rounded-full bg-white/20" />
            </View>

            {/* Header */}
            <View className="flex-row items-center justify-between px-5 pb-4">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-emerald-500/20 items-center justify-center">
                  <UserPlus color="#10b981" size={20} />
                </View>
                <View>
                  <Text className="text-white text-lg font-semibold">
                    Invite a Friend
                  </Text>
                  <Text className="text-white/50 text-sm">
                    Share the app with someone
                  </Text>
                </View>
              </View>
              <HeaderButton
                variant="close"
                size="sm"
                background="glass"
                onPress={handleClose}
              />
            </View>

            {/* Content */}
            <View className="px-5 pb-8">
              {state === "success" ? (
                // Success State
                <View className="items-center py-8">
                  <View className="w-16 h-16 rounded-full bg-emerald-500/20 items-center justify-center mb-4">
                    <CheckCircle color="#10b981" size={32} />
                  </View>
                  <Text className="text-white text-lg font-semibold mb-1">
                    Invitation Sent!
                  </Text>
                  <Text className="text-white/50 text-center">
                    We've sent an email to {email}
                  </Text>
                </View>
              ) : (
                // Input State
                <>
                  {/* Email Input */}
                  <View className="mb-4">
                    <Text className="text-white/60 text-sm mb-2 ml-1">
                      Friend's Email
                    </Text>
                    <TextInput
                      ref={inputRef}
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        if (state === "error") {
                          setState("idle");
                          setErrorMessage("");
                        }
                      }}
                      placeholder="Enter email address"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={state !== "loading"}
                      className={`bg-white/5 border rounded-xl px-4 py-4 text-white text-base ${state === "error"
                        ? "border-red-500/50"
                        : "border-white/10"
                        }`}
                    />
                    {state === "error" && errorMessage && (
                      <Text className="text-red-400 text-sm mt-2 ml-1">
                        {errorMessage}
                      </Text>
                    )}
                  </View>

                  {/* Send Button */}
                  <Pressable
                    onPress={handleSend}
                    disabled={state === "loading" || !email.trim()}
                    style={({ pressed }) => ({
                      opacity:
                        state === "loading" || !email.trim()
                          ? 0.5
                          : pressed
                            ? 0.8
                            : 1,
                      // Subtle glow effect
                      shadowColor: "#10b981",
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: email.trim() ? 0.3 : 0,
                      shadowRadius: 12,
                    })}
                    className="bg-foreground rounded-xl py-4 flex-row items-center justify-center gap-2"
                  >
                    {state === "loading" ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <>
                        <Send color="black" size={18} />
                        <Text className="text-background font-semibold text-base">
                          Send Invite
                        </Text>
                      </>
                    )}
                  </Pressable>

                  {/* Helper Text */}
                  <Text className="text-white/40 text-xs text-center mt-4">
                    They'll receive an email with download links for the app
                  </Text>
                </>
              )}
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
