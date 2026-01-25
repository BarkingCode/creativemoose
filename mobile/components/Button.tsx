/**
 * Button - Reusable button component with consistent styling
 *
 * Provides primary, secondary, and ghost variants matching the app's design system.
 * - Primary: White background, dark text (main CTAs)
 * - Secondary: Semi-transparent white background
 * - Ghost: Transparent with subtle text
 *
 * Supports loading state, disabled state, and full-width option.
 */

import { ReactNode } from "react";
import {
  Pressable,
  Text,
  View,
  ActivityIndicator,
  PressableProps,
} from "react-native";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<PressableProps, "children"> {
  /** Button text or custom content */
  children: ReactNode;
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Show loading spinner */
  loading?: boolean;
  /** Loading text (replaces children when loading) */
  loadingText?: string;
  /** Make button full width */
  fullWidth?: boolean;
  /** Left icon component */
  leftIcon?: ReactNode;
  /** Right icon component */
  rightIcon?: ReactNode;
}

const variantStyles = {
  primary: {
    container: "bg-white",
    text: "text-background",
    spinner: "#0f0a0a",
  },
  secondary: {
    container: "bg-white/10",
    text: "text-white",
    spinner: "#ffffff",
  },
  ghost: {
    container: "bg-transparent",
    text: "text-white/60",
    spinner: "#ffffff",
  },
} as const;

const sizeStyles = {
  sm: {
    container: "py-2.5 px-4",
    text: "text-sm",
    radius: "rounded-xl",
  },
  md: {
    container: "py-3.5 px-6",
    text: "text-base",
    radius: "rounded-xl",
  },
  lg: {
    container: "py-4 px-8",
    text: "text-lg",
    radius: "rounded-2xl",
  },
} as const;

export function Button({
  children,
  variant = "primary",
  size = "lg",
  loading = false,
  loadingText,
  fullWidth = true,
  leftIcon,
  rightIcon,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  const isDisabled = disabled || loading;

  const content = loading ? loadingText || children : children;

  return (
    <Pressable
      disabled={isDisabled}
      className={`
        ${variantStyle.container}
        ${sizeStyle.container}
        ${sizeStyle.radius}
        flex-row items-center justify-center
        ${fullWidth ? "w-full" : ""}
        ${isDisabled ? "opacity-50" : "active:opacity-80"}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" color={variantStyle.spinner} />
          {loadingText && (
            <Text className={`${variantStyle.text} font-semibold ${sizeStyle.text}`}>
              {loadingText}
            </Text>
          )}
        </View>
      ) : (
        <View className="flex-row items-center gap-2">
          {leftIcon && <View pointerEvents="none">{leftIcon}</View>}
          {typeof children === "string" ? (
            <Text className={`${variantStyle.text} font-semibold ${sizeStyle.text}`}>
              {children}
            </Text>
          ) : (
            children
          )}
          {rightIcon && <View pointerEvents="none">{rightIcon}</View>}
        </View>
      )}
    </Pressable>
  );
}
