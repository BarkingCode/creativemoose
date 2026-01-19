/**
 * API route to check current user's credit balance from Supabase.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCredits } from "@/lib/credits";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get credits from Supabase
    const creditData = await getCredits(user.id);

    if (!creditData) {
      // Return default values if no credits record exists
      return NextResponse.json({
        free_credits: 1,
        image_credits: 0,
        video_credits: 0,
        video_free_credits: 0,
        total_credits: 1,
        total_video_credits: 0,
        total_gens: 0,
        total_video_gens: 0,
        lastGeneratedAt: null,
        lastPreset: null,
        lastVideoGeneratedAt: null,
        lastVideoPreset: null,
      });
    }

    return NextResponse.json({
      free_credits: creditData.free_credits,
      image_credits: creditData.image_credits,
      video_credits: 0, // Video credits not in current schema, add if needed
      video_free_credits: 0, // Video free credits not in current schema
      total_credits: creditData.free_credits + creditData.image_credits,
      total_video_credits: 0,
      total_gens: creditData.total_generations,
      total_video_gens: 0,
      lastGeneratedAt: creditData.last_generation_at,
      lastPreset: creditData.last_preset,
      lastVideoGeneratedAt: null,
      lastVideoPreset: null,
    });
  } catch (error) {
    console.error("Error fetching credits:", error);
    return NextResponse.json(
      { error: "Failed to fetch credits" },
      { status: 500 }
    );
  }
}
