/**
 * Auth Form Validation Schemas
 *
 * Zod schemas for validating authentication forms:
 * - Sign-in email/password
 * - Sign-in OTP request (email only)
 * - Sign-in OTP verify (6-digit code)
 * - Sign-up with email, password, and confirm password
 */

import { z } from "zod";

/**
 * Sign-in email/password form schema
 */
export const signInEmailSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type SignInEmailData = z.infer<typeof signInEmailSchema>;

/**
 * Sign-in OTP request form schema (email only)
 */
export const signInOTPRequestSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email"),
});

export type SignInOTPRequestData = z.infer<typeof signInOTPRequestSchema>;

/**
 * Sign-in OTP verify form schema (6-digit code)
 */
export const signInOTPVerifySchema = z.object({
  code: z
    .string()
    .length(6, "Code must be 6 digits")
    .regex(/^\d{6}$/, "Code must contain only numbers"),
});

export type SignInOTPVerifyData = z.infer<typeof signInOTPVerifySchema>;

/**
 * Sign-up email form schema with password confirmation
 */
export const signUpEmailSchema = z
  .object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpEmailData = z.infer<typeof signUpEmailSchema>;
