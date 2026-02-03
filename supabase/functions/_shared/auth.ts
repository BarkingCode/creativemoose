/**
 * Authentication utilities for Supabase Edge Functions
 * Validates JWT tokens and extracts user information
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export interface AuthResult {
  success: boolean;
  userId?: string;
  error?: string;
}

export async function validateAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");

  console.log("[validateAuth] === AUTH DEBUG ===");
  console.log("[validateAuth] SUPABASE_URL:", supabaseUrl);
  console.log("[validateAuth] Has auth header:", !!authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("[validateAuth] Missing or invalid auth header");
    return { success: false, error: "Missing or invalid authorization header" };
  }

  const token = authHeader.replace("Bearer ", "");
  console.log("[validateAuth] User token length:", token.length);
  console.log("[validateAuth] User token prefix:", token.substring(0, 50) + "...");

  // Decode and log JWT payload for debugging (without signature)
  let jwtPayload: { sub?: string; exp?: number; iss?: string } | null = null;
  try {
    jwtPayload = JSON.parse(atob(token.split(".")[1]));
    console.log("[validateAuth] JWT payload - sub:", jwtPayload?.sub, "exp:", jwtPayload?.exp, "iss:", jwtPayload?.iss);
  } catch (e) {
    console.log("[validateAuth] Could not decode JWT payload");
  }

  // Use service role client to validate user token
  // This is more reliable than using the anon key
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // getUser with token parameter validates the JWT and returns user info
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  console.log("[validateAuth] getUser result - user:", user?.id, "error:", error?.message);
  console.log("[validateAuth] === END DEBUG ===");

  if (error || !user) {
    return { success: false, error: error?.message || "Invalid token" };
  }

  return { success: true, userId: user.id };
}

export function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
