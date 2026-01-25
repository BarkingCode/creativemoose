/**
 * FormInput Component
 *
 * A React Hook Form integrated TextInput wrapper that:
 * - Uses Controller for form state management
 * - Shows red border on validation errors
 * - Displays error message below the field
 * - Supports optional left icon
 */

import React from "react";
import { View, Text, TextInput, TextInputProps } from "react-native";
import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { LucideIcon } from "lucide-react-native";

interface FormInputProps<T extends FieldValues>
  extends Omit<TextInputProps, "value" | "onChangeText"> {
  control: Control<T>;
  name: Path<T>;
  icon?: LucideIcon;
}

export default function FormInput<T extends FieldValues>({
  control,
  name,
  icon: Icon,
  ...textInputProps
}: FormInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => (
        <View>
          <View
            className={`flex-row items-center bg-neutral-900 rounded-xl px-4 gap-3 border h-14 ${error ? "border-red-500/50" : "border-white/10"
              }`}
          >
            {Icon && <Icon color="rgba(255,255,255,0.5)" size={20} />}
            <TextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholderTextColor="rgba(255,255,255,0.4)"
              className="flex-1 text-white "
              style={{
                includeFontPadding: false,
              }}
              {...textInputProps}
            />
          </View>
          {error && (
            <Text className="text-red-400 text-sm mt-2 ml-1">
              {error.message}
            </Text>
          )}
        </View>
      )}
    />
  );
}
