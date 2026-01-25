-- Migration: Unify generation tracking for mobile and web apps
--
-- This migration ensures both mobile (parallel) and web (serial) generation flows
-- record to the same `generations` table as the single source of truth.
--
-- Changes:
-- 1. Add generation_id FK to generation_sessions (links session to canonical record)
-- 2. Add status column to generations for tracking generation state
-- 3. Update images table to ensure generation_batch_id references generations.id

-- ============================================
-- 1. ADD GENERATION_ID TO GENERATION_SESSIONS
-- ============================================

-- Add generation_id column to link sessions to canonical generations record
ALTER TABLE public.generation_sessions
ADD COLUMN IF NOT EXISTS generation_id UUID REFERENCES public.generations(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_generation_sessions_generation_id
ON public.generation_sessions(generation_id);

-- ============================================
-- 2. ADD STATUS TO GENERATIONS TABLE
-- ============================================

-- Add status column to track generation state
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'generations'
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.generations
    ADD COLUMN status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed'));
  END IF;
END $$;

-- ============================================
-- 3. ADD GENERATION_BATCH_ID INDEX TO IMAGES
-- ============================================

-- Ensure images table has proper index for batch queries
CREATE INDEX IF NOT EXISTS idx_images_generation_batch_id
ON public.images(generation_batch_id);

-- ============================================
-- 4. HELPER FUNCTION: Append image URL atomically
-- ============================================

-- Function to atomically append an image URL to generations.image_urls
CREATE OR REPLACE FUNCTION public.append_generation_image(
  p_generation_id UUID,
  p_image_url TEXT,
  p_mark_complete BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.generations
  SET
    image_urls = array_append(image_urls, p_image_url),
    status = CASE WHEN p_mark_complete THEN 'completed' ELSE 'in_progress' END
  WHERE id = p_generation_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. UPDATE FUNCTION: Cleanup expired sessions
-- ============================================

-- Update cleanup function to also mark associated generations as failed
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Mark associated generations as failed if session expired before completion
  UPDATE public.generations g
  SET status = 'failed'
  FROM public.generation_sessions s
  WHERE s.generation_id = g.id
    AND s.expires_at < NOW()
    AND g.status = 'pending';

  -- Delete expired sessions
  DELETE FROM public.generation_sessions
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DONE: Generation tracking unified
-- ============================================
