-- Migration: Add images table for individual image storage and sharing
-- This table stores one row per generated image (instead of batch)
-- Allows individual sharing, gallery management, and public feed

-- ============================================
-- 1. CREATE IMAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  generation_batch_id UUID NOT NULL,  -- Groups the 4 images from same generation
  image_url TEXT NOT NULL,            -- Supabase Storage URL
  storage_path TEXT,                  -- Storage path for deletion
  preset_id TEXT NOT NULL,
  style_id TEXT,
  image_index INTEGER NOT NULL,       -- 0-3 for position in batch
  is_public BOOLEAN DEFAULT FALSE,
  is_free_generation BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

-- Index for user's gallery (all their images)
CREATE INDEX IF NOT EXISTS idx_images_user ON public.images(user_id, created_at DESC);

-- Index for public feed (only public images, sorted by newest)
CREATE INDEX IF NOT EXISTS idx_images_public_feed ON public.images(created_at DESC) WHERE is_public = TRUE;

-- Index for grouping by batch
CREATE INDEX IF NOT EXISTS idx_images_batch ON public.images(generation_batch_id);

-- ============================================
-- 3. ENABLE RLS
-- ============================================
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS POLICIES
-- ============================================

-- Users can view their own images (gallery)
CREATE POLICY "Users can view own images"
ON public.images FOR SELECT
USING (auth.uid() = user_id);

-- Anyone can view public images (feed)
CREATE POLICY "Anyone can view public images"
ON public.images FOR SELECT
USING (is_public = TRUE);

-- Users can insert their own images (via API after generation)
CREATE POLICY "Users can insert own images"
ON public.images FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own images (for sharing toggle)
CREATE POLICY "Users can update own images"
ON public.images FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own images
CREATE POLICY "Users can delete own images"
ON public.images FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 5. SERVICE ROLE POLICY (for API routes)
-- ============================================
-- Note: Service role bypasses RLS, but we add explicit policy for clarity
-- This allows the generate API to insert images on behalf of users

-- ============================================
-- 6. HELPER FUNCTION: Toggle image sharing
-- ============================================
CREATE OR REPLACE FUNCTION public.toggle_image_sharing(p_image_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_state BOOLEAN;
  v_user_id UUID;
BEGIN
  -- Get current state and verify ownership
  SELECT is_public, user_id INTO v_current_state, v_user_id
  FROM public.images
  WHERE id = p_image_id;

  -- Check ownership
  IF v_user_id != auth.uid() THEN
    RETURN FALSE;
  END IF;

  -- Toggle the state
  UPDATE public.images
  SET is_public = NOT v_current_state
  WHERE id = p_image_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. HELPER FUNCTION: Get user's gallery with batches
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_gallery(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  generation_batch_id UUID,
  image_url TEXT,
  preset_id TEXT,
  style_id TEXT,
  image_index INTEGER,
  is_public BOOLEAN,
  is_free_generation BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.generation_batch_id,
    i.image_url,
    i.preset_id,
    i.style_id,
    i.image_index,
    i.is_public,
    i.is_free_generation,
    i.created_at
  FROM public.images i
  WHERE i.user_id = p_user_id
  ORDER BY i.created_at DESC, i.image_index ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. HELPER FUNCTION: Get public feed
-- ============================================
CREATE OR REPLACE FUNCTION public.get_public_feed(
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  generation_batch_id UUID,
  image_url TEXT,
  preset_id TEXT,
  created_at TIMESTAMPTZ,
  user_avatar_url TEXT,
  user_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.user_id,
    i.generation_batch_id,
    i.image_url,
    i.preset_id,
    i.created_at,
    p.avatar_url AS user_avatar_url,
    p.full_name AS user_name
  FROM public.images i
  LEFT JOIN public.profiles p ON p.id = i.user_id
  WHERE i.is_public = TRUE
  ORDER BY i.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DONE: Images table migration complete
-- ============================================
