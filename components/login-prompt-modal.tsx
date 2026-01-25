/**
 * LoginPromptModal Component
 *
 * Modal shown when anonymous user exhausts free generations.
 * Offers 4 sign-in methods: Google, Apple, Email/Password, Magic Link (OTP).
 *
 * Features:
 * - Tabs for Sign In / Sign Up modes
 * - Social OAuth buttons (Google, Apple)
 * - Email/Password form
 * - Magic link option
 * - Error handling and loading states
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, Loader2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type AuthMode = "signin" | "signup" | "otp";

export function LoginPromptModal({
  isOpen,
  onClose,
  onSuccess,
}: LoginPromptModalProps) {
  const { signIn, signUp, signInWithGoogle, signInWithApple } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setError(null);
    setOtpSent(false);
  };

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    if (newMode !== "otp") {
      setOtpSent(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const result = await signInWithGoogle();
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
    // On success, OAuth will redirect
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    setError(null);
    const result = await signInWithApple();
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
    // On success, OAuth will redirect
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email.trim()) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    if (mode !== "otp" && !password.trim()) {
      setError("Password is required");
      setLoading(false);
      return;
    }

    try {
      if (mode === "signin") {
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error);
        } else {
          onSuccess?.();
          onClose();
        }
      } else if (mode === "signup") {
        const result = await signUp(email, password);
        if (result.error) {
          setError(result.error);
        } else {
          // Show confirmation message for email verification
          setError(null);
          setOtpSent(true);
        }
      } else if (mode === "otp") {
        // Magic link - use signUp with no password (Supabase handles OTP)
        // Note: This requires enabling "Magic Link" in Supabase Auth settings
        const result = await signUp(email, ""); // Empty password for magic link
        if (result.error) {
          setError(result.error);
        } else {
          setOtpSent(true);
        }
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-neutral-900 border-white/10 text-white max-w-md mx-auto rounded-3xl p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.webp"
              alt="PhotoApp"
              width={60}
              height={60}
              className="rounded-xl"
            />
          </div>
          <DialogTitle className="text-2xl font-bold text-center">
            {otpSent
              ? "Check Your Email"
              : mode === "signup"
                ? "Create Account"
                : "Welcome Back"}
          </DialogTitle>
          <p className="text-white/60 text-center text-sm mt-2">
            {otpSent
              ? `We sent a ${mode === "otp" ? "magic link" : "verification email"} to ${email}`
              : "Sign up to continue creating AI photos"}
          </p>
        </DialogHeader>

        {/* Content */}
        <div className="px-6 pb-6">
          <AnimatePresence mode="wait">
            {otpSent ? (
              <motion.div
                key="otp-sent"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-white/70 text-sm mb-6">
                  Click the link in your email to{" "}
                  {mode === "otp" ? "sign in" : "verify your account"}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setMode("signin");
                  }}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Back to Sign In
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="auth-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {/* Social Buttons */}
                <div className="space-y-3 mb-6">
                  <Button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    variant="outline"
                    className="w-full h-12 bg-white text-black hover:bg-gray-100 rounded-xl font-medium"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </Button>

                  <Button
                    onClick={handleAppleSignIn}
                    disabled={loading}
                    variant="outline"
                    className="w-full h-12 bg-black text-white border-white/20 hover:bg-gray-900 rounded-xl font-medium text-base"
                  >
                    <svg className="w-5 h-5 mr-2" fill="white" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                    </svg>
                    Continue with Apple
                  </Button>
                </div>

                {/* Divider */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-neutral-900 text-white/40">
                      or continue with email
                    </span>
                  </div>
                </div>

                {/* Email Form */}
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 pl-12 bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-xl focus:border-white/30"
                    />
                  </div>

                  {mode !== "otp" && (
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 pl-12 bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-xl focus:border-white/30"
                      />
                    </div>
                  )}

                  {error && (
                    <p className="text-red-400 text-sm text-center">{error}</p>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-white text-black hover:bg-gray-100 rounded-xl font-semibold"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : mode === "signup" ? (
                      "Sign Up"
                    ) : mode === "otp" ? (
                      "Send Magic Link"
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>

                {/* Mode Switches */}
                <div className="mt-6 text-center space-y-2">
                  {mode === "signin" && (
                    <>
                      <button
                        onClick={() => handleModeChange("signup")}
                        className="text-white/60 text-sm hover:text-white transition-colors"
                      >
                        Don't have an account?{" "}
                        <span className="text-white font-medium">Sign Up</span>
                      </button>
                      <br />
                      <button
                        onClick={() => handleModeChange("otp")}
                        className="text-white/40 text-xs hover:text-white/60 transition-colors"
                      >
                        Sign in with magic link
                      </button>
                    </>
                  )}

                  {mode === "signup" && (
                    <button
                      onClick={() => handleModeChange("signin")}
                      className="text-white/60 text-sm hover:text-white transition-colors"
                    >
                      Already have an account?{" "}
                      <span className="text-white font-medium">Sign In</span>
                    </button>
                  )}

                  {mode === "otp" && (
                    <button
                      onClick={() => handleModeChange("signin")}
                      className="text-white/60 text-sm hover:text-white transition-colors"
                    >
                      Back to{" "}
                      <span className="text-white font-medium">Sign In</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
