/**
 * Auth Utilities
 *
 * Shared authentication utilities used across the app.
 */

// Module-level persistence for OTP state survives component unmount/remount
// This allows screens to restore to otp-verify when user returns from background
let persistedOtpState: { mode: string; email: string } | null = null;

/**
 * Get the persisted OTP state
 */
export function getPersistedOtpState() {
  return persistedOtpState;
}

/**
 * Set the persisted OTP state
 */
export function setPersistedOtpState(state: { mode: string; email: string } | null) {
  persistedOtpState = state;
}

/**
 * Clear persisted OTP state (call on sign out)
 */
export function clearPersistedOtpState() {
  persistedOtpState = null;
}
