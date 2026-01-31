/**
 * Invite Friend Client - Supabase Edge Function Integration
 *
 * Sends invitation emails to friends via the invite-user Edge Function.
 * The invited user receives an email with app download links.
 *
 * Usage:
 *   import { sendInvite } from "@/lib/invite";
 */

import { Session } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

export interface InviteResult {
  success: boolean;
  message?: string;
}

export interface InviteError {
  error: string;
  code?: "INVALID_EMAIL" | "ALREADY_REGISTERED" | "UNAUTHORIZED";
}

/**
 * Send an invitation email to a friend
 *
 * @param email - Friend's email address
 * @param session - Supabase session with access token
 * @returns Success status or throws error
 */
export async function sendInvite(
  email: string,
  session: Session
): Promise<InviteResult> {
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL not configured");
  }

  if (!session?.access_token) {
    throw new Error("UNAUTHORIZED");
  }

  const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/invite-user`;

  try {
    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[sendInvite] Response error:", {
        status: response.status,
        data,
      });

      if (response.status === 401) {
        throw new Error("UNAUTHORIZED");
      }
      if (response.status === 400) {
        throw new Error("INVALID_EMAIL");
      }
      if (response.status === 409) {
        throw new Error("ALREADY_REGISTERED");
      }
      throw new Error(data.error || "Failed to send invitation");
    }

    return {
      success: true,
      message: data.message,
    };
  } catch (error: any) {
    console.error("[sendInvite] Error:", error);
    throw error;
  }
}
