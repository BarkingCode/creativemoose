"use client";

import { useRef, useEffect } from "react";
import { getAllPresets } from "@/lib/presets";
import { cn } from "@/lib/utils";
import GlassSurface from "./GlassSurface";

interface PresetSelectorProps {
  selectedPreset: string | null;
  onPresetChange: (presetId: string) => void;
  disabled?: boolean;
  hideWithUs?: boolean;
  className?: string;
}

const BUTTON_BASE_CLASSES =
  "px-6 py-0 rounded-2xl text-sm whitespace-nowrap transition-all font-bold flex-shrink-0";

export function PresetSelector({
  selectedPreset,
  onPresetChange,
  disabled,
  hideWithUs,
  className,
}: PresetSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const presets = getAllPresets().filter(
    (preset) => !(hideWithUs && preset.requiresRefs)
  );

  // Center selected item on mount and when selection changes
  useEffect(() => {
    if (!scrollRef.current || !selectedPreset) return;

    const container = scrollRef.current;
    const selectedIndex = presets.findIndex((p) => p.id === selectedPreset);
    if (selectedIndex === -1) return;

    const buttons = container.children;
    const selectedButton = buttons[selectedIndex] as HTMLElement;

    if (selectedButton) {
      const containerWidth = container.offsetWidth;
      const buttonLeft = selectedButton.offsetLeft;
      const buttonWidth = selectedButton.offsetWidth;
      const scrollPosition = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);

      container.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });
    }
  }, [selectedPreset, presets]);

  // Handle scroll snap - detect which item is centered
  useEffect(() => {
    if (!scrollRef.current) return;

    const container = scrollRef.current;
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(scrollTimeout);

      scrollTimeout = setTimeout(() => {
        const containerWidth = container.offsetWidth;
        const scrollLeft = container.scrollLeft;
        const centerPosition = scrollLeft + containerWidth / 2;

        // Find which button is closest to center
        let closestIndex = 0;
        let closestDistance = Infinity;

        Array.from(container.children).forEach((child, index) => {
          const button = child as HTMLElement;
          const buttonCenter = button.offsetLeft + button.offsetWidth / 2;
          const distance = Math.abs(centerPosition - buttonCenter);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        });

        const centeredPreset = presets[closestIndex];
        if (centeredPreset && centeredPreset.id !== selectedPreset) {
          onPresetChange(centeredPreset.id);
        }
      }, 150);
    };

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [presets, selectedPreset, onPresetChange]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        "flex gap-4 items-center overflow-x-auto py-2  scrollbar-hide snap-x snap-mandatory",
        className
      )}
      style={{
        paddingLeft: "50%",
        paddingRight: "50%",
      }}
    >
      {presets.map((preset, index) => {
        const isSelected = preset.id === selectedPreset;

        const handleClick = () => {
          if (disabled) return;

          // Update selection
          onPresetChange(preset.id);

          // Scroll to center
          if (scrollRef.current) {
            const container = scrollRef.current;
            const button = container.children[index] as HTMLElement;

            if (button) {
              const containerWidth = container.offsetWidth;
              const buttonLeft = button.offsetLeft;
              const buttonWidth = button.offsetWidth;
              const scrollPosition = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);

              container.scrollTo({
                left: scrollPosition,
                behavior: "smooth",
              });
            }
          }
        };

        return (
          <div
            key={preset.id}
            className="snap-center w-fit"
          >
            <GlassSurface
              borderRadius={50}
              height={50}
              blur={25}
              displace={4}
              className={cn(
                "transition-all relative",
                isSelected ? "scale-110" : "scale-90",
                disabled && "cursor-not-allowed opacity-30",
                preset.rainbowBorder && "animate-rainbow before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:[filter:blur(0.75rem)]",
                preset.rainbowBorder && "[background-clip:padding-box,border-box,border-box] [background-origin:border-box] [border:calc(0.125rem)_solid_transparent]"
              )}
              style={preset.rainbowBorder ? {
                background: "linear-gradient(#121213,#111111),linear-gradient(#121213 50%,rgba(18,18,19,0.6) 80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))",
                backgroundSize: "200%",
                ["--speed" as string]: "3s"
              } : undefined}
            >
              <button
                type="button"
                onClick={handleClick}
                disabled={disabled}
                className={cn(
                  BUTTON_BASE_CLASSES,
                  isSelected
                    ? "text-white"
                    : "text-white opacity-80 cursor-pointer hover:opacity-100",
                  disabled && "cursor-not-allowed",

                )}
              >
                {preset.name}
              </button>
            </GlassSurface>

          </div>
        );
      })}
    </div>
  );
}
