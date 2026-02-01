/**
 * Supabase Client for React Native
 *
 * This client uses AsyncStorage for session persistence on mobile devices.
 * AsyncStorage has no size limit (unlike SecureStore's 2048 byte limit on iOS),
 * which is necessary for storing Supabase sessions with JWTs and user metadata.
 */

import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Custom storage adapter for React Native using AsyncStorage
const AsyncStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      // Use localStorage for web
      if (typeof localStorage !== "undefined") {
        return localStorage.getItem(key);
      }
      return null;
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(key, value);
      }
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(key);
      }
      return;
    }
    await AsyncStorage.removeItem(key);
  },
};

// Environment variables (prefix with EXPO_PUBLIC_ for Expo)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase environment variables not set. Please add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file."
  );
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    storage: AsyncStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for React Native
  },
});

// Types from the shared schema
export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  push_token: string | null;
  push_token_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Credits {
  id: string;
  user_id: string;
  image_credits: number;
  free_credits: number;
  total_generations: number;
  last_generation_at: string | null;
  last_preset: string | null;
  last_style: string | null;
  created_at: string;
  updated_at: string;
}

export interface Generation {
  id: string;
  user_id: string;
  preset_id: string;
  style_id: string | null;
  image_urls: string[];
  input_image_url: string | null;
  is_free_generation: boolean;
  created_at: string;
}
