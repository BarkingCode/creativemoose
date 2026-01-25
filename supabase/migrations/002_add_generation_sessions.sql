-- Migration: Add generation_sessions table for parallel image generation
-- This table stores temporary session data that allows multiple parallel
-- image generation requests to share a single credit deduction.

-- ============================================
-- 1. CREATE GENERATION_SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.generation_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  preset_id TEXT NOT NULL,
  style_id TEXT NOT NULL,
  image_url TEXT NOT NULL,              -- Original input image (base64 or URL)
  is_free BOOLEAN DEFAULT FALSE,        -- Whether this used a free credit
  image_count INTEGER DEFAULT 4,        -- Number of images to generate
  completed_images INTEGER DEFAULT 0,   -- Images completed so far
  expires_at TIMESTAMPTZ NOT NULL,      -- Session expiry time
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

-- Index for session lookup by user
CREATE INDEX IF NOT EXISTS idx_generation_sessions_user
ON public.generation_sessions(user_id, created_at DESC);

-- Index for cleanup of expired sessions
CREATE INDEX IF NOT EXISTS idx_generation_sessions_expires
ON public.generation_sessions(expires_at);

-- ============================================
-- 3. ENABLE RLS
-- ============================================
ALTER TABLE public.generation_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS POLICIES
-- ============================================

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
ON public.generation_sessions FOR SELECT
USING (auth.uid() = user_id);

-- Service role can insert sessions (via Edge Functions)
-- Note: Service role bypasses RLS

-- ============================================
-- 5. CLEANUP FUNCTION: Remove expired sessions
-- ============================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.generation_sessions
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DONE: Generation sessions table complete
-- ============================================
