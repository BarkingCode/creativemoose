/**
 * FormOTPInput Component
 *
 * A React Hook Form integrated wrapper for OTPInput that:
 * - Uses Controller for form state management
 * - Displays error message below the OTP boxes
 * - Supports onComplete callback for auto-submit
 */

import React from "react";
import { View, Text } from "react-native";
import { Control, Controller, FieldValues, Path } from "react-hook-form";
import OTPInput from "../OTPInput";

interface FormOTPInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  onComplete: (code: string) => void;
  isLoading?: boolean;
  autoFocus?: boolean;
}

export default function FormOTPInput<T extends FieldValues>({
  control,
  name,
  onComplete,
  isLoading = false,
  autoFocus = true,
}: FormOTPInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <View>
          <OTPInput
            value={value || ""}
            onChange={onChange}
            onComplete={onComplete}
            isLoading={isLoading}
            autoFocus={autoFocus}
          />
          {error && (
            <Text className="text-red-400 text-sm mt-3 text-center">
              {error.message}
            </Text>
          )}
        </View>
      )}
    />
  );
}
