/**
 * Feed API Route
 *
 * GET: Fetch publicly shared images for the discover feed.
 * Supports pagination with limit/offset parameters.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// CORS headers for mobile app access
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");

    const supabase = createAdminClient();

    // Fetch public images with user info
    const { data: images, error } = await supabase
      .from("images")
      .select(
        `
        id,
        user_id,
        generation_batch_id,
        image_url,
        preset_id,
        created_at,
        profiles!images_user_id_fkey (
          avatar_url,
          full_name
        )
      `
      )
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching feed:", error);
      return NextResponse.json(
        { error: "Failed to fetch feed" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Transform the data to flatten the user info
    const transformedImages = (images || []).map((img: any) => ({
      id: img.id,
      user_id: img.user_id,
      generation_batch_id: img.generation_batch_id,
      image_url: img.image_url,
      preset_id: img.preset_id,
      created_at: img.created_at,
      user_avatar_url: img.profiles?.avatar_url || null,
      user_name: img.profiles?.full_name || null,
    }));

    // Check if there are more images
    const { count } = await supabase
      .from("images")
      .select("*", { count: "exact", head: true })
      .eq("is_public", true);

    const hasMore = (count || 0) > offset + limit;

    return NextResponse.json(
      {
        images: transformedImages,
        hasMore,
        total: count,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Feed API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
