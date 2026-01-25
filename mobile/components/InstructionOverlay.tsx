/**
 * InstructionOverlay Component
 *
 * Modal overlay showing how to use the app.
 * Displayed on first visit after splash, accessible via info icon.
 *
 * Features:
 * - 3-step guide with icons
 * - Animated entrance
 * - Free tries counter
 */

import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Camera, Palette, Sparkles } from "lucide-react-native";

const INSTRUCTIONS_SEEN_KEY = "photoapp_instructions_seen";

interface InstructionOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  freeTriesRemaining: number;
}

interface StepData {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
}

const steps: StepData[] = [
  {
    icon: Camera,
    title: "Take a Photo",
    description: "Use your camera or choose from gallery",
  },
  {
    icon: Palette,
    title: "Choose a Preset",
    description: "Pick a Canadian theme for your photo",
  },
  {
    icon: Sparkles,
    title: "Get 4 Variations",
    description: "AI generates 4 unique profile images",
  },
];

/**
 * Check if instructions have been shown before
 */
export async function hasInstructionsBeenSeen(): Promise<boolean> {
  try {
    const seen = await AsyncStorage.getItem(INSTRUCTIONS_SEEN_KEY);
    return seen === "true";
  } catch {
    return false;
  }
}

/**
 * Mark instructions as seen
 */
async function markInstructionsAsSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(INSTRUCTIONS_SEEN_KEY, "true");
  } catch (error) {
    console.error("Error marking instructions as seen:", error);
  }
}

function StepItem({ step, index }: { step: StepData; index: number }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(index * 150, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(index * 150, withTiming(0, { duration: 400 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const IconComponent = step.icon;

  return (
    <Animated.View className="flex-row items-center gap-4" style={animatedStyle}>
      <View className="w-12 h-12 rounded-xl bg-white/10 justify-center items-center">
        <IconComponent color="white" size={24} strokeWidth={2} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-white mb-0.5">
          {step.title}
        </Text>
        <Text className="text-sm text-white/60">{step.description}</Text>
      </View>
    </Animated.View>
  );
}

export function InstructionOverlay({
  isOpen,
  onClose,
  freeTriesRemaining,
}: InstructionOverlayProps) {
  const backdropOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(30);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    if (isOpen) {
      // Reset values first, then animate
      backdropOpacity.value = 0;
      contentOpacity.value = 0;
      contentTranslateY.value = 30;

      // Small delay to ensure values are reset before animating
      setTimeout(() => {
        backdropOpacity.value = withTiming(1, { duration: 300 });
        contentOpacity.value = withTiming(1, { duration: 350 });
        contentTranslateY.value = withTiming(0, { duration: 350 });
      }, 10);
    }
  }, [isOpen]);

  const handleClose = async () => {
    await markInstructionsAsSeen();

    // Animate out - fade and move down
    backdropOpacity.value = withTiming(0, { duration: 200 });
    contentOpacity.value = withTiming(0, { duration: 200 });
    contentTranslateY.value = withTiming(20, { duration: 200 });

    setTimeout(onClose, 200);
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  return (
    <Modal transparent visible={isOpen} animationType="none">
      <View className="flex-1 justify-center items-center p-6">
        <Animated.View
          className="absolute inset-0 bg-black/80"
          style={backdropStyle}
        />

        <Animated.View
          className="bg-neutral-900 rounded-3xl p-6 w-full max-w-[400px] border border-white/10"
          style={contentStyle}
        >
          <Text className="text-2xl font-bold text-white text-center mb-6">
            Create AI Profile Photos
          </Text>

          <View className="gap-4 mb-6">
            {steps.map((step, index) => (
              <StepItem key={step.title} step={step} index={index} />
            ))}
          </View>

          {freeTriesRemaining > 0 && (
            <View className="flex-row items-center justify-center gap-2 bg-emerald-500/10 py-2.5 px-4 rounded-xl mb-5">
              <Sparkles color="#10b981" size={16} strokeWidth={2} />
              <Text className="text-sm text-emerald-500 font-medium">
                {freeTriesRemaining} free{" "}
                {freeTriesRemaining === 1 ? "try" : "tries"}, no signup required
              </Text>
            </View>
          )}

          <TouchableOpacity
            className="bg-white py-4 rounded-xl items-center"
            onPress={handleClose}
          >
            <Text className="text-base font-semibold text-background">
              Start Creating
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}
