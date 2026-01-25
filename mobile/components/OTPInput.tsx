/**
 * OTPInput Component
 *
 * A reusable 6-digit OTP input with individual boxes for each digit.
 * Features:
 * - Hidden TextInput captures all keyboard/paste events
 * - Visual boxes display the digits
 * - Paste support works reliably
 * - iOS autofill support (textContentType="oneTimeCode")
 * - Android autofill support (autoComplete="one-time-code")
 * - Loading state support
 * - onComplete callback when all digits entered
 */

import React, { useRef, useState, useEffect } from "react";
import {
  View,
  TextInput,
  Pressable,
  Text,
} from "react-native";

interface OTPInputProps {
  onComplete: (code: string) => void;
  isLoading?: boolean;
  autoFocus?: boolean;
  /** Controlled mode: external value (6-char string or empty) */
  value?: string;
  /** Controlled mode: callback when value changes */
  onChange?: (code: string) => void;
}

const OTP_LENGTH = 6;

export default function OTPInput({
  onComplete,
  isLoading = false,
  autoFocus = true,
  value,
  onChange,
}: OTPInputProps) {
  const inputRef = useRef<TextInput>(null);

  // Determine if controlled mode
  const isControlled = value !== undefined;

  // Internal state for uncontrolled mode
  const [internalCode, setInternalCode] = useState("");

  // Use controlled or internal state
  const code = isControlled ? value : internalCode;

  // Update function that handles both modes
  const setCode = (newCode: string) => {
    // Only keep digits, max 6
    const cleanCode = newCode.replace(/[^0-9]/g, "").slice(0, OTP_LENGTH);
    if (isControlled && onChange) {
      onChange(cleanCode);
    } else {
      setInternalCode(cleanCode);
    }
  };

  // Focus input on mount if autoFocus is true
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Call onComplete when all digits are entered
  useEffect(() => {
    if (code.length === OTP_LENGTH) {
      onComplete(code);
    }
  }, [code, onComplete]);

  // Convert code string to array of digits for display
  const digits = code.split("").concat(Array(OTP_LENGTH).fill("")).slice(0, OTP_LENGTH);

  const handlePress = () => {
    if (isLoading) return;
    inputRef.current?.focus();
  };

  return (
    <View>
      {/* Hidden TextInput that captures all input */}
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={OTP_LENGTH}
        editable={!isLoading}
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        caretHidden
        contextMenuHidden={false}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0,
          // iOS needs reasonable dimensions for paste to work
          // Setting full container size allows paste menu to appear
        }}
      />

      {/* Visual display boxes */}
      <Pressable onPress={handlePress}>
        <View className="flex-row justify-between gap-2">
          {digits.map((digit, index) => (
            <View
              key={index}
              className={`flex-1 aspect-square max-w-14 bg-neutral-900 rounded-xl border ${
                digit ? "border-white/40" : index === code.length ? "border-white/30" : "border-white/10"
              } items-center justify-center`}
            >
              <Text
                className={`text-white text-2xl font-bold ${
                  isLoading ? "opacity-50" : ""
                }`}
              >
                {digit}
              </Text>
            </View>
          ))}
        </View>
      </Pressable>
    </View>
  );
}

/**
 * Reset helper - can be used to clear OTP state from parent
 * Usage: Create a ref and call ref.current?.reset() to clear
 */
export function useOTPReset() {
  const [key, setKey] = useState(0);
  const reset = () => setKey((k) => k + 1);
  return { key, reset };
}
