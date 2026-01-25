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
  console.log("[validateAuth] Token length:", token.length);
  console.log("[validateAuth] Token prefix:", token.substring(0, 50) + "...");

  // Create Supabase client with the user's token
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

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
