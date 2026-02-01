/**
 * useNotifications Hook
 *
 * Handles Expo push notifications setup and token management:
 * - Requests notification permissions on mount
 * - Registers for push notifications and gets Expo push token
 * - Saves push token to Supabase profiles table
 * - Listens for incoming notifications
 * - Handles notification responses (when user taps notification)
 *
 * Usage:
 * - Add to root layout or main screen to enable push notifications
 * - Requires user to be authenticated to save token
 */

import { useEffect, useCallback, useState, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { type Subscription } from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";

// Note: setNotificationHandler is called inside useNotifications hook
// to avoid module-level execution during app reload

interface UseNotificationsOptions {
  /** User ID to associate push token with (required for saving token) */
  userId?: string | null;
  /** Callback when a notification is received while app is foregrounded */
  onNotificationReceived?: (notification: Notifications.Notification) => void;
  /** Callback when user taps on a notification */
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void;
}

interface UseNotificationsReturn {
  /** The Expo push token for this device */
  pushToken: string | null;
  /** Whether notification permissions have been granted */
  hasPermission: boolean;
  /** Whether the hook is initializing (checking permissions, getting token) */
  isLoading: boolean;
  /** Any error that occurred during setup */
  error: string | null;
  /** Manually request notification permissions */
  requestPermissions: () => Promise<boolean>;
  /** Manually register for push notifications */
  registerForPushNotifications: () => Promise<string | null>;
}

export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const { userId, onNotificationReceived, onNotificationResponse } = options;

  const [pushToken, setPushToken] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const notificationListener = useRef<Subscription | undefined>(undefined);
  const responseListener = useRef<Subscription | undefined>(undefined);

  /**
   * Request notification permissions from the user
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      const granted = finalStatus === "granted";
      setHasPermission(granted);

      if (!granted) {
        console.log("[Notifications] Permission not granted");
        setError("Notification permissions not granted");
      }

      return granted;
    } catch (err) {
      console.error("[Notifications] Error requesting permissions:", err);
      setError("Failed to request notification permissions");
      return false;
    }
  }, []);

  /**
   * Get the Expo push token for this device
   */
  const getExpoPushToken = useCallback(async (): Promise<string | null> => {
    try {
      // Must be a physical device for push notifications
      if (!Device.isDevice) {
        console.log("[Notifications] Push notifications require a physical device");
        setError("Push notifications require a physical device");
        return null;
      }

      // Get project ID from Constants
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      if (!projectId) {
        console.error("[Notifications] No project ID found");
        setError("Project ID not configured");
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      console.log("[Notifications] Push token:", tokenData.data);
      return tokenData.data;
    } catch (err) {
      console.error("[Notifications] Error getting push token:", err);
      setError("Failed to get push token");
      return null;
    }
  }, []);

  /**
   * Save push token to Supabase profiles table
   */
  const savePushToken = useCallback(
    async (token: string, uid: string): Promise<void> => {
      try {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            push_token: token,
            push_token_updated_at: new Date().toISOString(),
          })
          .eq("id", uid);

        if (updateError) {
          console.error("[Notifications] Error saving push token:", updateError);
          setError("Failed to save push token");
        } else {
          console.log("[Notifications] Push token saved to profile");
        }
      } catch (err) {
        console.error("[Notifications] Error saving push token:", err);
        setError("Failed to save push token");
      }
    },
    []
  );

  /**
   * Full registration flow: permissions -> token -> save
   */
  const registerForPushNotifications =
    useCallback(async (): Promise<string | null> => {
      setIsLoading(true);
      setError(null);

      try {
        // Request permissions
        const granted = await requestPermissions();
        if (!granted) {
          return null;
        }

        // Get push token
        const token = await getExpoPushToken();
        if (!token) {
          return null;
        }

        setPushToken(token);

        // Save to Supabase if user is authenticated
        if (userId) {
          await savePushToken(token, userId);
        }

        return token;
      } finally {
        setIsLoading(false);
      }
    }, [requestPermissions, getExpoPushToken, savePushToken, userId]);

  /**
   * Configure notification handler (moved from module level to avoid
   * execution during app reload which can cause crashes with EAS Updates)
   */
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }, []);

  /**
   * Set up Android notification channel (required for Android 8+)
   */
  useEffect(() => {
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0f0a0a",
      });
    }
  }, []);

  /**
   * Register for push notifications when user is authenticated
   * Deferred until userId is available to prevent crashes during EAS Update reload
   * (the app needs to be fully initialized before notification setup)
   */
  useEffect(() => {
    if (userId) {
      registerForPushNotifications();
    } else {
      // Not authenticated yet, just mark as not loading
      setIsLoading(false);
    }
  }, [userId, registerForPushNotifications]);

  /**
   * Re-register when user ID changes (login/logout)
   */
  useEffect(() => {
    if (userId && pushToken) {
      savePushToken(pushToken, userId);
    }
  }, [userId, pushToken, savePushToken]);

  /**
   * Set up notification listeners
   */
  useEffect(() => {
    // Listen for notifications received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("[Notifications] Received:", notification);
        onNotificationReceived?.(notification);
      });

    // Listen for when user taps on a notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("[Notifications] Response:", response);
        onNotificationResponse?.(response);
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [onNotificationReceived, onNotificationResponse]);

  return {
    pushToken,
    hasPermission,
    isLoading,
    error,
    requestPermissions,
    registerForPushNotifications,
  };
}

/**
 * Send a local notification (useful for testing or in-app alerts)
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
    trigger: null, // Immediate
  });
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get the badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set the badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}
