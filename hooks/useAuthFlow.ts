/**
 * useAuthFlow Hook
 *
 * Shared authentication flow logic for login modals and screens.
 * Manages auth mode state, loading states, error handling, OTP verification,
 * and provides handlers for all auth methods (Google, Apple, Email, OTP).
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  getPersistedOtpState,
  setPersistedOtpState,
  clearPersistedOtpState,
} from "../lib/auth-utils";

export type AuthMode = "options" | "email" | "magiclink" | "otp-verify" | "confirm-email";

const RESEND_COOLDOWN_SECONDS = 60;

interface UseAuthFlowOptions {
  onSuccess?: () => void;
  persistOtpState?: boolean;
}

interface UseAuthFlowReturn {
  // State
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  otpCode: string;
  setOtpCode: (code: string) => void;
  otpEmail: string;
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  successMessage: string | null;
  resendCooldown: number;
  isSignUp: boolean;
  setIsSignUp: (isSignUp: boolean) => void;

  // Handlers
  handleGoogleSignIn: () => Promise<void>;
  handleAppleSignIn: () => Promise<void>;
  handleEmailAuth: () => Promise<void>;
  handleMagicLink: () => Promise<void>;
  handleVerifyOTP: (code: string) => Promise<void>;
  handleResendOTP: () => Promise<void>;
  resetState: () => void;
}

export function useAuthFlow(options: UseAuthFlowOptions = {}): UseAuthFlowReturn {
  const { onSuccess, persistOtpState: shouldPersist = false } = options;
  const {
    signIn,
    signUp,
    signInWithOAuth,
    signInWithAppleNative,
    signInWithOTP,
    verifyOTP,
  } = useAuth();

  const [mode, setModeInternal] = useState<AuthMode>("options");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Restore persisted OTP state on mount if enabled
  useEffect(() => {
    if (shouldPersist) {
      const persistedState = getPersistedOtpState();
      if (persistedState && persistedState.mode === "otp-verify") {
        setModeInternal("otp-verify");
        setOtpEmail(persistedState.email);
      }
    }
  }, [shouldPersist]);

  // Persist OTP state when entering otp-verify mode
  useEffect(() => {
    if (shouldPersist) {
      if (mode === "otp-verify" && otpEmail) {
        setPersistedOtpState({ mode, email: otpEmail });
      } else if (mode === "options") {
        clearPersistedOtpState();
      }
    }
  }, [mode, otpEmail, shouldPersist]);

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  const setMode = useCallback((newMode: AuthMode) => {
    setError(null);
    setSuccessMessage(null);
    setModeInternal(newMode);
  }, []);

  const resetState = useCallback(() => {
    setModeInternal("options");
    setEmail("");
    setPassword("");
    setError(null);
    setOtpCode("");
    setOtpEmail("");
    setResendCooldown(0);
    setSuccessMessage(null);
    setIsSignUp(false);
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await signInWithOAuth("google");
      if (authError && authError.message !== "Authentication cancelled") {
        setError(authError.message || "Google sign-in failed");
      } else if (!authError) {
        onSuccess?.();
      }
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }, [signInWithOAuth, onSuccess]);

  const handleAppleSignIn = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await signInWithAppleNative();
      if (authError && authError.message !== "Authentication cancelled") {
        setError(authError.message || "Apple sign-in failed");
      } else if (!authError) {
        onSuccess?.();
      }
    } catch (err: any) {
      setError(err.message || "Apple sign-in failed");
    } finally {
      setLoading(false);
    }
  }, [signInWithAppleNative, onSuccess]);

  const handleEmailAuth = useCallback(async () => {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error: authError } = await signUp(email, password);
        if (authError) throw authError;
        // For sign up, we don't call onSuccess - user needs to verify email
        setError("Check your email for a verification link.");
      } else {
        const { error: authError } = await signIn(email, password);
        if (authError) throw authError;
        onSuccess?.();
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }, [email, password, isSignUp, signIn, signUp, onSuccess]);

  const handleMagicLink = useCallback(async () => {
    if (!email) {
      setError("Please enter your email");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: authError, isNewUser } = await signInWithOTP(email);
      if (authError) throw authError;

      // Store email for OTP verification
      setOtpEmail(email);

      if (isNewUser) {
        // New user - email confirmation link sent
        setMode("confirm-email");
      } else {
        // Existing user - 6-digit OTP code sent
        setMode("otp-verify");
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
      }
    } catch (err: any) {
      setError(err.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  }, [email, signInWithOTP, setMode]);

  const handleVerifyOTP = useCallback(
    async (code: string) => {
      if (code.length !== 6) return;

      setLoading(true);
      setError(null);

      try {
        const { error: authError } = await verifyOTP(otpEmail, code);
        if (authError) throw authError;
        onSuccess?.();
      } catch (err: any) {
        setError(err.message || "Invalid verification code");
        setOtpCode("");
      } finally {
        setLoading(false);
      }
    },
    [otpEmail, verifyOTP, onSuccess]
  );

  const handleResendOTP = useCallback(async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error: authError } = await signInWithOTP(otpEmail);
      if (authError) throw authError;
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setSuccessMessage("Code sent! Check your email.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to resend code");
    } finally {
      setLoading(false);
    }
  }, [resendCooldown, otpEmail, signInWithOTP]);

  return {
    // State
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    otpCode,
    setOtpCode,
    otpEmail,
    loading,
    error,
    setError,
    successMessage,
    resendCooldown,
    isSignUp,
    setIsSignUp,

    // Handlers
    handleGoogleSignIn,
    handleAppleSignIn,
    handleEmailAuth,
    handleMagicLink,
    handleVerifyOTP,
    handleResendOTP,
    resetState,
  };
}
