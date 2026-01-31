/**
 * Auth Context Provider
 *
 * Provides authentication state and methods throughout the app.
 * Wraps Supabase auth with React context for easy access in components.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import { supabase } from "../lib/supabase";
import { deleteAccount as deleteAccountApi } from "../lib/fal";
import { clearPersistedOtpState } from "../app/(auth)/sign-in";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signInWithOAuth: (provider: "google" | "apple") => Promise<{ error: Error | null }>;
  signInWithAppleNative: () => Promise<{ error: Error | null }>;
  signInWithOTP: (email: string) => Promise<{ error: Error | null; isNewUser: boolean }>;
  verifyOTP: (email: string, token: string) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Handle deep links for auth callbacks (when app is already open)
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      if (url.includes("auth/callback")) {
        console.log("[AuthContext] Deep link received:", url);

        // Parse both fragment (#) and query (?) parameters
        const hashIndex = url.indexOf("#");
        const queryIndex = url.indexOf("?");
        let params: Record<string, string> = {};

        // Parse fragment parameters (where Supabase puts tokens)
        if (hashIndex !== -1) {
          const fragment = url.substring(hashIndex + 1);
          const fragmentParams = new URLSearchParams(fragment);
          fragmentParams.forEach((value, key) => {
            params[key] = value;
          });
        }

        // Also check query parameters as fallback
        if (queryIndex !== -1) {
          const endIndex = hashIndex !== -1 ? hashIndex : url.length;
          const queryString = url.substring(queryIndex + 1, endIndex);
          const queryParams = new URLSearchParams(queryString);
          queryParams.forEach((value, key) => {
            if (!params[key]) params[key] = value;
          });
        }

        const accessToken = params.access_token;
        const refreshToken = params.refresh_token;
        const tokenHash = params.token_hash;
        const type = params.type;

        if (accessToken && refreshToken) {
          console.log("[AuthContext] Setting session from deep link");
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        } else if (tokenHash && type) {
          // Skip if already authenticated - prevents duplicate verification error
          // This happens when user enters OTP manually, then the magic link is clicked
          const { data: { session: existingSession } } = await supabase.auth.getSession();
          if (existingSession) {
            console.log("[AuthContext] Already authenticated, skipping deep link verification");
            return;
          }

          console.log("[AuthContext] Verifying OTP from deep link");
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "email" | "magiclink" | "signup",
          });

          // Silently handle error - user may have already verified via manual entry
          if (error) {
            console.log("[AuthContext] Deep link verification failed (may be expected):", error.message);
          }
        }
      }
    };

    // Listen for deep links while app is open
    const linkingSubscription = Linking.addEventListener("url", handleDeepLink);

    return () => {
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    clearPersistedOtpState();
    await supabase.auth.signOut();
  };

  const signInWithOAuth = async (provider: "google" | "apple") => {
    const redirectUrl = Linking.createURL("auth/callback");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        skipBrowserRedirect: true,
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      return { error: error as Error };
    }

    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === "cancel") {
        return { error: new Error("Authentication cancelled") };
      }
    }

    return { error: null };
  };

  const signInWithAppleNative = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        return { error: new Error("No identity token received from Apple") };
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });

      return { error: error as Error | null };
    } catch (e: any) {
      if (e.code === "ERR_REQUEST_CANCELED") {
        return { error: new Error("Authentication cancelled") };
      }
      return { error: e as Error };
    }
  };

  const signInWithOTP = async (email: string): Promise<{ error: Error | null; isNewUser: boolean }> => {
    // First try for existing users only (sends OTP code)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });

    // If user exists, OTP was sent successfully
    if (!error) {
      return { error: null, isNewUser: false };
    }

    // If user doesn't exist, create account (sends confirmation email, not OTP)
    const errorMsg = error.message.toLowerCase();
    if (errorMsg.includes("signups not allowed") || errorMsg.includes("user not found") || errorMsg.includes("otp")) {
      const { error: createError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: "creative-moose://auth/callback",
        },
      });

      if (createError) {
        return { error: createError as Error, isNewUser: false };
      }

      return { error: null, isNewUser: true };
    }

    // Some other error
    return { error: error as Error, isNewUser: false };
  };

  const verifyOTP = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    return { error: error as Error | null };
  };

  const deleteAccount = async (): Promise<{ error: Error | null }> => {
    if (!session) {
      return { error: new Error("No active session") };
    }

    try {
      await deleteAccountApi(session);
      // Sign out locally after successful deletion
      await supabase.auth.signOut();
      return { error: null };
    } catch (error: any) {
      console.error("[AuthContext] deleteAccount error:", error);
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signIn,
        signUp,
        signOut,
        signInWithOAuth,
        signInWithAppleNative,
        signInWithOTP,
        verifyOTP,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
