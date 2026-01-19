/**
 * Single Image API Route
 *
 * PATCH: Update image (toggle is_public for sharing)
 * DELETE: Delete image from database and storage
 * Requires authentication and ownership verification.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { deleteImage } from "@/lib/storage";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH - Update image properties (e.g., toggle sharing)
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { is_public } = body;

    if (typeof is_public !== "boolean") {
      return NextResponse.json(
        { error: "is_public must be a boolean" },
        { status: 400 }
      );
    }

    // Verify ownership and update
    const { data: image, error: fetchError } = await supabase
      .from("images")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    if (image.user_id !== user.id) {
      return NextResponse.json(
        { error: "Not authorized to modify this image" },
        { status: 403 }
      );
    }

    // Update the image
    const { data: updatedImage, error: updateError } = await supabase
      .from("images")
      .update({ is_public })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating image:", updateError);
      return NextResponse.json(
        { error: "Failed to update image" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      image: updatedImage,
    });
  } catch (error) {
    console.error("Image PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove image from database and storage
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const { data: image, error: fetchError } = await supabase
      .from("images")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    if (image.user_id !== user.id) {
      return NextResponse.json(
        { error: "Not authorized to delete this image" },
        { status: 403 }
      );
    }

    // Delete from storage if path exists
    if (image.storage_path) {
      const storageDeleted = await deleteImage(image.storage_path);
      if (!storageDeleted) {
        console.warn("Failed to delete image from storage:", image.storage_path);
        // Continue with database deletion even if storage fails
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("images")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting image:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete image" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error("Image DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
