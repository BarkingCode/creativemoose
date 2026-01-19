/**
 * Auth Callback Route
 *
 * Handles OAuth and email verification callbacks from Supabase.
 * Exchanges the auth code for a session and redirects to the app.
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createInitialCredits } from "@/lib/credits";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/generate";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Create initial credits for new users
      // The Supabase trigger should handle this, but as a fallback:
      await createInitialCredits(data.user.id);

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return to sign-in with error
  return NextResponse.redirect(`${origin}/sign-in?error=auth_failed`);
}
