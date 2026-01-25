/**
 * HeaderButton - Unified back/close button component for headers and modals
 *
 * Provides consistent styling across the app for navigation buttons:
 * - "back" variant: Left arrow for navigating back
 * - "close" variant: X icon for closing modals/screens
 *
 * Supports three sizes and two background styles to match different contexts.
 */

import { TouchableOpacity, View, StyleProp, ViewStyle } from "react-native";
import { ArrowLeft, X } from "lucide-react-native";

type HeaderButtonVariant = "back" | "close";
type HeaderButtonSize = "sm" | "md" | "lg";
type HeaderButtonBackground = "solid" | "glass";

interface HeaderButtonProps {
  /** Button variant - "back" shows arrow, "close" shows X */
  variant: HeaderButtonVariant;
  /** Button size - sm (32px), md (40px), lg (44px) */
  size?: HeaderButtonSize;
  /** Background style - "solid" for opaque, "glass" for translucent */
  background?: HeaderButtonBackground;
  /** Press handler */
  onPress: () => void;
  /** Optional custom className for positioning */
  className?: string;
  /** Optional style prop for StyleSheet positioning */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing */
  testID?: string;
}

const sizeConfig = {
  sm: {
    container: 32,
    icon: 18,
  },
  md: {
    container: 40,
    icon: 20,
  },
  lg: {
    container: 44,
    icon: 24,
  },
} as const;

const backgroundConfig = {
  solid: "bg-neutral-900",
  glass: "bg-white/10",
} as const;

export function HeaderButton({
  variant,
  size = "md",
  background = "solid",
  onPress,
  className = "",
  style,
  testID,
}: HeaderButtonProps) {
  const { container, icon } = sizeConfig[size];
  const bgClass = backgroundConfig[background];
  const Icon = variant === "back" ? ArrowLeft : X;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
      className={`rounded-full items-center justify-center ${bgClass} ${className}`}
      style={[{ width: container, height: container }, style]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View pointerEvents="none">
        <Icon color="white" size={icon} />
      </View>
    </TouchableOpacity>
  );
}
