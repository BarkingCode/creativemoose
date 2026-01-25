/**
 * Delete Account Edge Function
 *
 * Permanently deletes a user's account and all associated data:
 * 1. Validates the user's auth token
 * 2. Deletes all files from storage (generations and uploads buckets)
 * 3. Deletes the user from auth.users (cascades to all related tables)
 *
 * This requires the service role key since auth.admin.deleteUser() is admin-only.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { validateAuth, createServiceClient } from "../_shared/auth.ts";

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate authentication
    const authResult = await validateAuth(req);
    if (!authResult.success || !authResult.userId) {
      return new Response(
        JSON.stringify({ error: authResult.error || "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = authResult.userId;

    // Create service client for admin operations
    const supabase = createServiceClient();

    // Delete storage files (best-effort - continue even if this fails)
    const buckets = ["generations", "uploads"];

    for (const bucket of buckets) {
      try {
        // List all files for this user
        const { data: files, error: listError } = await supabase.storage
          .from(bucket)
          .list(userId);

        if (listError) {
          console.warn(`[delete-account] Failed to list ${bucket}/${userId}:`, listError.message);
          continue;
        }

        if (files && files.length > 0) {
          // Build array of file paths to delete
          const filePaths = files.map((file) => `${userId}/${file.name}`);

          const { error: deleteError } = await supabase.storage
            .from(bucket)
            .remove(filePaths);

          if (deleteError) {
            console.warn(`[delete-account] Failed to delete files in ${bucket}:`, deleteError.message);
          } else {
            console.log(`[delete-account] Deleted ${filePaths.length} files from ${bucket}`);
          }
        }
      } catch (storageError) {
        console.warn(`[delete-account] Storage cleanup error for ${bucket}:`, storageError);
        // Continue with user deletion even if storage cleanup fails
      }
    }

    // Delete the user account (cascades to all related tables)
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error("[delete-account] Failed to delete user:", deleteUserError);
      return new Response(
        JSON.stringify({
          error: "Failed to delete account",
          code: "DELETION_FAILED",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[delete-account] Successfully deleted user ${userId}`);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[delete-account] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
