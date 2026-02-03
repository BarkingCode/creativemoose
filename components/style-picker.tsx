/**
 * StylePicker Component
 *
 * Bottom sheet style picker that slides up to show all available photo styles.
 * User can select a style which affects the AI generation aesthetic.
 */

"use client";

import { useState } from "react";
import { PHOTO_STYLES, PhotoStyleId } from "@/lib/photo-styles";
import { Palette } from "lucide-react";

interface StylePickerProps {
  selectedStyle: PhotoStyleId;
  onStyleChange: (styleId: PhotoStyleId) => void;
}

export function StylePicker({ selectedStyle, onStyleChange }: StylePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleStyleSelect = (styleId: PhotoStyleId) => {
    onStyleChange(styleId);
    setIsOpen(false);
  };

  return (
    <>
      {/* Style Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex flex-col items-center gap-0.5 px-2 py-1 rounded transition-colors text-white/70 hover:text-white"
        title="Change photo style"
      >
        <Palette className="w-6 h-6" />
        <span className="text-[10px] font-medium">
          {PHOTO_STYLES[selectedStyle].name}
        </span>
      </button>

      {/* Bottom Sheet Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-[#1a1a1a] rounded-t-3xl w-full max-w-lg p-6 pb-8 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-semibold">Photo Style</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/50 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Style Grid */}
            <div className="grid grid-cols-2 gap-3">
              {Object.values(PHOTO_STYLES).map((style) => (
                <button
                  key={style.id}
                  onClick={() => handleStyleSelect(style.id)}
                  className={`p-4 rounded-2xl border-2 transition-all text-left ${
                    selectedStyle === style.id
                      ? 'border-white bg-white/10'
                      : 'border-white/20 hover:border-white/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Palette className={`w-5 h-5 mt-0.5 ${
                      selectedStyle === style.id ? 'text-white' : 'text-white/60'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${
                        selectedStyle === style.id ? 'text-white' : 'text-white/80'
                      }`}>
                        {style.name}
                      </p>
                      <p className="text-xs text-white/50 mt-0.5">
                        {style.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
