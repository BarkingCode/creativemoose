/**
 * Entry Screen
 *
 * Handles app launch flow:
 * - Auth loading → spinner
 * - First visit → Splash screen → Instruction overlay → redirect
 * - Return visit → redirect directly
 * - All users (including anonymous) redirect to /(tabs)/home
 */

import { useState, useEffect, useRef } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { SplashScreen, hasSplashBeenSeen } from "../components/SplashScreen";
import {
  InstructionOverlay,
  hasInstructionsBeenSeen,
} from "../components/InstructionOverlay";

export default function EntryScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [showSplash, setShowSplash] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Track if initial redirect has happened to prevent multiple redirects
  const hasRedirected = useRef(false);

  // Mark mounted and check first visit
  useEffect(() => {
    setIsMounted(true);
    checkFirstVisit();
  }, []);

  const checkFirstVisit = async () => {
    const splashSeen = await hasSplashBeenSeen();
    if (splashSeen) {
      setShowSplash(false);
      const instructionsSeen = await hasInstructionsBeenSeen();
      if (!instructionsSeen) {
        setShowInstructions(true);
      }
    }
  };

  const handleSplashComplete = async () => {
    setShowSplash(false);
    const instructionsSeen = await hasInstructionsBeenSeen();
    if (!instructionsSeen) {
      setShowInstructions(true);
    }
  };

  // Redirect ALL authenticated users (including anonymous) to tabs
  useEffect(() => {
    if (!authLoading && user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace("/(tabs)/home");
    }
  }, [authLoading, user, router]);

  // Auth loading or pre-mount
  if (authLoading || !isMounted) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  // User exists → redirect is in-flight, render nothing
  if (user) {
    return null;
  }

  // No user yet (pre-anonymous-auth) → show splash/instructions or spinner
  return (
    <View className="flex-1 bg-background">
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      <InstructionOverlay
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        freeTriesRemaining={0}
      />

      {!showSplash && !showInstructions && (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="white" />
        </View>
      )}
    </View>
  );
}
