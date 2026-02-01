-- Migration: Add push notification token to profiles
--
-- This migration adds:
-- 1. push_token column to profiles for storing Expo push tokens
-- 2. push_token_updated_at column for tracking when token was last updated

-- ============================================
-- 1. ADD PUSH_TOKEN TO PROFILES
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'push_token'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN push_token TEXT;
  END IF;
END $$;

-- ============================================
-- 2. ADD PUSH_TOKEN_UPDATED_AT TO PROFILES
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'push_token_updated_at'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN push_token_updated_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================
-- 3. CREATE INDEX FOR PUSH TOKEN LOOKUPS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_push_token
ON public.profiles(push_token)
WHERE push_token IS NOT NULL;

-- ============================================
-- DONE: Push token column ready
-- ============================================
