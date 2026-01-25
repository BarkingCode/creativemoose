/**
 * FilterSwiper Component
 *
 * Instagram-like horizontal filter selector with smooth animations.
 * Uses ScrollView + Reanimated for buttery scale/opacity effects.
 *
 * Features:
 * - Dynamic item widths based on text content
 * - Selected filter centered horizontally
 * - Scale/opacity animation based on distance from center
 * - Momentum scrolling with snap-to-item
 * - Tap on item to select and center it
 */

import { useRef, useEffect, useCallback, useState } from "react";
import { View, Text, Pressable, Dimensions, LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  interpolateColor,
  Extrapolation,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

interface Filter {
  id: string;
  name: string;
  emoji: string;
}

interface FilterSwiperProps {
  filters: Filter[];
  selectedFilterId: string;
  onFilterChange: (filterId: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_HEIGHT = 44;
const ITEM_GAP = 8;

// Animated item component with dynamic width
function FilterItem({
  item,
  index,
  scrollX,
  itemOffsets,
  isSelected,
  onPress,
  onLayout,
}: {
  item: Filter;
  index: number;
  scrollX: Animated.SharedValue<number>;
  itemOffsets: number[];
  isSelected: boolean;
  onPress: () => void;
  onLayout: (index: number, width: number) => void;
}) {
  // Animated selection state
  const selectedProgress = useSharedValue(isSelected ? 1 : 0);

  // Animate when selection changes
  useEffect(() => {
    selectedProgress.value = withTiming(isSelected ? 1 : 0, { duration: 200 });
  }, [isSelected]);

  // Get the center offset for this item (or estimate if not measured yet)
  const itemCenter = itemOffsets[index] ?? index * 100;

  const animatedStyle = useAnimatedStyle(() => {
    // Distance from scroll position to item center
    const distance = scrollX.value - itemCenter;

    // Scale: 1 at center, smaller with distance
    const scale = interpolate(
      Math.abs(distance),
      [0, 100, 200],
      [1, 0.88, 0.78],
      Extrapolation.CLAMP
    );

    // Opacity: 1 at center, fades with distance
    const opacity = interpolate(
      Math.abs(distance),
      [0, 100, 200],
      [1, 0.7, 0.5],
      Extrapolation.CLAMP
    );

    // Animated background and border
    const backgroundColor = interpolateColor(
      selectedProgress.value,
      [0, 1],
      ["rgba(60, 60, 60, 0.4)", "rgba(0, 0, 0, 0.6)"]
    );

    const borderColor = interpolateColor(
      selectedProgress.value,
      [0, 1],
      ["transparent", "rgba(255, 255, 255, 0.3)"]
    );

    const borderWidth = interpolate(
      selectedProgress.value,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
      backgroundColor,
      borderColor,
      borderWidth,
    };
  });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    onLayout(index, width);
  };

  return (
    <Pressable
      onPress={onPress}
      onLayout={handleLayout}
      style={{
        height: ITEM_HEIGHT,
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: ITEM_GAP / 2,
      }}
    >
      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
          },
          animatedStyle,
        ]}
      >
        <Text style={{ fontSize: 14, marginRight: 6 }}>{item.emoji}</Text>
        <Text
          style={{
            fontSize: 13,
            color: "white",
            fontWeight: isSelected ? "600" : "400",
          }}
        >
          {item.name}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function FilterSwiper({
  filters,
  selectedFilterId,
  onFilterChange,
}: FilterSwiperProps) {
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const scrollX = useSharedValue(0);
  const currentIndex = filters.findIndex((f) => f.id === selectedFilterId);

  // Track measured widths for each item
  const [itemWidths, setItemWidths] = useState<number[]>([]);
  const [itemOffsets, setItemOffsets] = useState<number[]>([]);
  const [snapOffsets, setSnapOffsets] = useState<number[]>([]);
  const [isLayoutReady, setIsLayoutReady] = useState(false);

  // Handle item layout measurement
  const handleItemLayout = useCallback(
    (index: number, width: number) => {
      setItemWidths((prev) => {
        const newWidths = [...prev];
        newWidths[index] = width + ITEM_GAP; // Include gap
        return newWidths;
      });
    },
    []
  );

  // Calculate offsets and snap points when all items are measured
  useEffect(() => {
    if (itemWidths.length === filters.length && itemWidths.every((w) => w > 0)) {
      // Calculate center positions and snap offsets
      const centers: number[] = [];
      const snaps: number[] = [];
      let cumulative = 0;

      for (let i = 0; i < itemWidths.length; i++) {
        const itemWidth = itemWidths[i];
        // Center position of this item (used for animation distance calc)
        const itemCenterPos = cumulative + itemWidth / 2;
        centers.push(itemCenterPos);
        // Snap offset to center this item on screen
        // With sidePadding = SCREEN_WIDTH/2, item center in content = sidePadding + itemCenterPos
        // To center: sidePadding + itemCenterPos = scrollX + SCREEN_WIDTH/2
        // scrollX = sidePadding + itemCenterPos - SCREEN_WIDTH/2 = itemCenterPos
        snaps.push(itemCenterPos);
        cumulative += itemWidth;
      }

      setItemOffsets(centers);
      setSnapOffsets(snaps);
      setIsLayoutReady(true);
    }
  }, [itemWidths, filters.length]);

  // Scroll to selected item when layout is ready or selection changes
  useEffect(() => {
    if (isLayoutReady && currentIndex >= 0 && snapOffsets[currentIndex] !== undefined) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: snapOffsets[currentIndex],
          animated: true,
        });
      }, 100);
    }
  }, [isLayoutReady, currentIndex, snapOffsets]);

  // Track scroll position
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  // Handle snap end - select the centered item
  const handleMomentumEnd = useCallback(
    (offsetX: number) => {
      if (snapOffsets.length === 0) return;

      // Find closest snap point
      let closestIndex = 0;
      let minDistance = Math.abs(offsetX - snapOffsets[0]);

      for (let i = 1; i < snapOffsets.length; i++) {
        const distance = Math.abs(offsetX - snapOffsets[i]);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      }

      const filter = filters[closestIndex];
      if (filter && filter.id !== selectedFilterId) {
        onFilterChange(filter.id);
      }
    },
    [snapOffsets, filters, selectedFilterId, onFilterChange]
  );

  // Handle tap on item
  const handleSelect = useCallback(
    (index: number) => {
      const filter = filters[index];
      if (filter) {
        onFilterChange(filter.id);
        if (snapOffsets[index] !== undefined) {
          scrollViewRef.current?.scrollTo({
            x: snapOffsets[index],
            animated: true,
          });
        }
      }
    },
    [filters, onFilterChange, snapOffsets]
  );

  // Calculate side padding to center first/last items
  const sidePadding = SCREEN_WIDTH / 2;

  return (
    <View style={{ height: ITEM_HEIGHT }}>
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToOffsets={snapOffsets}
        snapToAlignment="center"
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => {
          handleMomentumEnd(event.nativeEvent.contentOffset.x);
        }}
        contentContainerStyle={{
          paddingHorizontal: sidePadding,
          alignItems: "center",
        }}
      >
        {filters.map((item, index) => (
          <FilterItem
            key={item.id}
            item={item}
            index={index}
            scrollX={scrollX}
            itemOffsets={itemOffsets}
            isSelected={item.id === selectedFilterId}
            onPress={() => handleSelect(index)}
            onLayout={handleItemLayout}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}
