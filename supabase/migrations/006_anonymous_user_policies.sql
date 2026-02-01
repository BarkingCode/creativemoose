-- Migration: Add RLS policies for anonymous users
-- Anonymous users are authenticated and have auth.uid(), so most policies should work.
-- This migration ensures credits and profiles tables have proper policies.

-- ============================================
-- 1. CREDITS TABLE POLICIES
-- ============================================

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.credits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own credits" ON public.credits;
DROP POLICY IF EXISTS "Users can insert own credits" ON public.credits;
DROP POLICY IF EXISTS "Users can update own credits" ON public.credits;

-- Users (including anonymous) can view their own credits
CREATE POLICY "Users can view own credits"
ON public.credits FOR SELECT
USING (auth.uid() = user_id);

-- Service role can insert/update credits (via functions)
-- Users shouldn't insert credits directly, only via purchase functions

-- ============================================
-- 2. PROFILES TABLE POLICIES
-- ============================================

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view public profile info" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Anyone can view public profile info (for feed avatars/names)
CREATE POLICY "Anyone can view public profile info"
ON public.profiles FOR SELECT
USING (TRUE);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Users can insert their own profile (for new users including anonymous)
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- ============================================
-- 3. GENERATIONS TABLE POLICIES (if exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'generations') THEN
    ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

    -- Drop and recreate policies
    DROP POLICY IF EXISTS "Users can view own generations" ON public.generations;
    DROP POLICY IF EXISTS "Users can insert own generations" ON public.generations;

    CREATE POLICY "Users can view own generations"
    ON public.generations FOR SELECT
    USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert own generations"
    ON public.generations FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- 4. ENSURE CREDITS ROW EXISTS FOR NEW USERS
-- ============================================

-- Function to create credits row for new users (including anonymous)
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.credits (user_id, free_credits, image_credits)
  VALUES (NEW.id, 2, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;

CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();

-- ============================================
-- 5. ENSURE PROFILE ROW EXISTS FOR NEW USERS
-- ============================================

-- Function to create profile row for new users (including anonymous)
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Anonymous User'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- ============================================
-- DONE: Anonymous user policies migration complete
-- ============================================
