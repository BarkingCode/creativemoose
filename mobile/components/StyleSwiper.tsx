/**
 * StyleSwiper Component
 *
 * Instagram-like vertical style selector with smooth animations.
 * Uses FlashList for performance + Reanimated for buttery scale/opacity effects.
 *
 * Features:
 * - Selected style centered vertically on left side of screen
 * - Scale/opacity animation based on distance from center
 * - Momentum scrolling with snap-to-item
 * - Tap on item to select and center it
 */

import { useRef, useEffect, useCallback, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { FlashList, FlashListRef } from "@shopify/flash-list";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withTiming,
  runOnJS,
  SharedValue,
} from "react-native-reanimated";

interface Style {
  id: string;
  name: string;
  emoji: string;
}

interface StyleSwiperProps {
  styles: Style[];
  selectedStyleId: string;
  onStyleChange: (styleId: string) => void;
}

const ITEM_HEIGHT = 52;
const ITEM_WIDTH = 60;
const VISIBLE_ITEMS = 5;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

// Create animated FlashList
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList<Style>);

// Animated item component
function StyleItem({
  item,
  index,
  scrollY,
  isSelected,
  onPress,
}: {
  item: Style;
  index: number;
  scrollY: SharedValue<number>;
  isSelected: boolean;
  onPress: () => void;
}) {
  // Calculate center position for this item
  const itemCenter = index * ITEM_HEIGHT;

  const animatedStyle = useAnimatedStyle(() => {
    // Distance from scroll position to item center
    const distance = scrollY.value - itemCenter;

    // Scale: 1 at center, smaller with distance
    const scale = interpolate(
      Math.abs(distance),
      [0, ITEM_HEIGHT, ITEM_HEIGHT * 2],
      [1, 0.8, 0.65],
      Extrapolation.CLAMP
    );

    // Opacity: 1 at center, fades with distance
    const opacity = interpolate(
      Math.abs(distance),
      [0, ITEM_HEIGHT, ITEM_HEIGHT * 2],
      [1, 0.6, 0.35],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Pressable
      onPress={onPress}
      style={{
        width: ITEM_WIDTH,
        height: ITEM_HEIGHT,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Animated.View
        style={[
          {
            width: 44,
            height: 44,
            backgroundColor: isSelected
              ? "rgba(255, 255, 255, 0.2)"
              : "transparent",
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
          },
          animatedStyle,
        ]}
      >
        <Text
          style={{
            fontSize: 22,
            textAlign: "center",
          }}
        >
          {item.emoji}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// Animated label that shows during interaction
function AnimatedLabel({
  name,
  labelOpacity,
}: {
  name: string;
  labelOpacity: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [
      {
        translateX: interpolate(
          labelOpacity.value,
          [0, 1],
          [-8, 0],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: ITEM_WIDTH + 4,
          top: CONTAINER_HEIGHT / 2 - 14,
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          backgroundColor: "rgba(20, 20, 20, 0.8)",
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 8,
          flexDirection: "row",
        }}
      >
        <Text
          style={{
            fontSize: 13,
            color: "white",
            fontWeight: "500",
          }}
        >
          {name}
        </Text>
      </View>
    </Animated.View>
  );
}

export function StyleSwiper({
  styles,
  selectedStyleId,
  onStyleChange,
}: StyleSwiperProps) {
  const listRef = useRef<FlashListRef<Style>>(null);
  const scrollY = useSharedValue(0);
  const labelOpacity = useSharedValue(0);
  const [centeredIndex, setCenteredIndex] = useState(0);
  const currentIndex = styles.findIndex((s) => s.id === selectedStyleId);

  // Padding to center first/last items
  const verticalPadding = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2;

  // Scroll to selected item on mount
  useEffect(() => {
    if (listRef.current && currentIndex >= 0) {
      setCenteredIndex(currentIndex);
      setTimeout(() => {
        listRef.current?.scrollToIndex({
          index: currentIndex,
          animated: true,
          viewPosition: 0.5,
        });
      }, 100);
    }
  }, []);

  // Update centered index from scroll position
  const updateCenteredIndex = useCallback(
    (offsetY: number) => {
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, styles.length - 1));
      setCenteredIndex(clampedIndex);
    },
    [styles.length]
  );

  // Track scroll position and show label
  const scrollHandler = useAnimatedScrollHandler({
    onBeginDrag: () => {
      labelOpacity.value = withTiming(1, { duration: 150 });
    },
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      // Update centered index on JS thread
      runOnJS(updateCenteredIndex)(event.contentOffset.y);
    },
    onEndDrag: () => {
      labelOpacity.value = withTiming(0, { duration: 300 });
    },
  });

  // Handle snap end - select the centered item
  const handleMomentumEnd = useCallback(
    (offsetY: number) => {
      const index = Math.round(offsetY / ITEM_HEIGHT);
      if (index >= 0 && index < styles.length) {
        const style = styles[index];
        if (style && style.id !== selectedStyleId) {
          onStyleChange(style.id);
        }
      }
    },
    [styles, selectedStyleId, onStyleChange]
  );

  // Handle tap on item
  const handleSelect = useCallback(
    (index: number) => {
      const style = styles[index];
      if (style) {
        onStyleChange(style.id);
        listRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
      }
    },
    [styles, onStyleChange]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Style; index: number }) => (
      <StyleItem
        item={item}
        index={index}
        scrollY={scrollY}
        isSelected={item.id === selectedStyleId}
        onPress={() => handleSelect(index)}
      />
    ),
    [scrollY, selectedStyleId, handleSelect]
  );

  // Get the name of centered style for label (updates during scroll)
  const centeredStyleName = styles[centeredIndex]?.name || "";

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 8,
        top: "50%",
        marginTop: -CONTAINER_HEIGHT / 2,
        zIndex: 10,
        overflow: "visible",
        width: "100%"
      }}
    >
      <View
        style={{
          width: ITEM_WIDTH,
          height: CONTAINER_HEIGHT,
        }}
      >
        <AnimatedFlashList
          ref={listRef}
          data={styles}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event) => {
            handleMomentumEnd(event.nativeEvent.contentOffset.y);
          }}
          contentContainerStyle={{
            paddingVertical: verticalPadding,
          }}
        />
      </View>

      {/* Animated label - shows during scroll */}
      <AnimatedLabel name={centeredStyleName} labelOpacity={labelOpacity} />
    </View>
  );
}
