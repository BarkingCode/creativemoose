/**
 * Authentication utilities for Supabase Edge Functions
 * Validates JWT tokens and extracts user information
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

export interface AuthResult {
  success: boolean;
  userId?: string;
  error?: string;
}

export async function validateAuth(req: Request): Promise<AuthResult> {
  if (!supabaseServiceKey) {
    console.error("[validateAuth] SUPABASE_SERVICE_ROLE_KEY is not set!");
    return { success: false, error: "Server configuration error" };
  }

  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { success: false, error: "Missing or invalid authorization header" };
  }

  const token = authHeader.replace("Bearer ", "");

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

  if (error || !user) {
    console.error("[validateAuth] Auth failed:", error?.message);
    return { success: false, error: error?.message || "Invalid token" };
  }

  return { success: true, userId: user.id };
}

export function createServiceClient() {
  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
