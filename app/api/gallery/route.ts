/**
 * Gallery API Route
 *
 * GET: Fetch current user's generated images.
 * Requires authentication.
 * Supports pagination with limit/offset parameters.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Fetch user's images
    const { data: images, error } = await supabase
      .from("images")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("image_index", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching gallery:", error);
      return NextResponse.json(
        { error: "Failed to fetch gallery" },
        { status: 500 }
      );
    }

    // Check if there are more images
    const { count } = await supabase
      .from("images")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const hasMore = (count || 0) > offset + limit;

    return NextResponse.json({
      images: images || [],
      hasMore,
      total: count,
    });
  } catch (error) {
    console.error("Gallery API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
