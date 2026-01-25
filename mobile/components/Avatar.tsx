/**
 * Avatar Component
 *
 * A reusable avatar component that displays a user's profile image or
 * falls back to initials when no image is available.
 *
 * Features:
 * - Multiple size presets (small, medium, large, xlarge)
 * - Automatic initials generation from name
 * - Optional onPress handler for navigation
 * - Consistent styling across the app
 *
 * Usage:
 *   <Avatar url={user.avatar_url} name={user.name} size="medium" />
 *   <Avatar url={user.avatar_url} name={user.name} size="large" onPress={() => router.push('/profile')} />
 */

import { TouchableOpacity, View, Text, ViewStyle } from "react-native";
import { Image } from "expo-image";

export type AvatarSize = "small" | "medium" | "large" | "xlarge";

interface AvatarProps {
  /** URL of the avatar image */
  url?: string | null;
  /** User's name (used for initials fallback) */
  name?: string | null;
  /** Size preset */
  size?: AvatarSize;
  /** Optional press handler */
  onPress?: () => void;
  /** Additional style overrides */
  style?: ViewStyle;
}

const SIZE_CONFIG: Record<AvatarSize, { container: number; text: string }> = {
  small: { container: 24, text: "text-xs" },
  medium: { container: 36, text: "text-sm" },
  large: { container: 48, text: "text-lg" },
  xlarge: { container: 100, text: "text-4xl" },
};

/**
 * Generate initials from a name string
 * - Single word: First letter (e.g., "John" → "J")
 * - Multiple words: First letter of first two words (e.g., "John Doe" → "JD")
 */
function getInitials(name?: string | null): string {
  if (!name) return "?";

  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

export function Avatar({
  url,
  name,
  size = "medium",
  onPress,
  style,
}: AvatarProps) {
  const config = SIZE_CONFIG[size];
  const initials = getInitials(name);
  const borderRadius = config.container / 2;

  const content = url ? (
    <Image
      source={{ uri: url }}
      style={{
        width: config.container,
        height: config.container,
        borderRadius,
      }}
      contentFit="cover"
      transition={200}
    />
  ) : (
    <View
      className="bg-white/10 items-center justify-center"
      style={{
        width: config.container,
        height: config.container,
        borderRadius,
      }}
    >
      <Text className={`text-white font-semibold ${config.text}`}>
        {initials}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={style}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={style}>{content}</View>;
}

export default Avatar;
