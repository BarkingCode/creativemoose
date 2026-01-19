-- PhotoApp Supabase Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- ============================================
-- 1. PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. CREDITS TABLE (replaces Stripe metadata)
-- ============================================
CREATE TABLE IF NOT EXISTS public.credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  image_credits INT DEFAULT 0 CHECK (image_credits >= 0),
  free_credits INT DEFAULT 1 CHECK (free_credits >= 0),
  total_generations INT DEFAULT 0 CHECK (total_generations >= 0),
  last_generation_at TIMESTAMPTZ,
  last_preset TEXT,
  last_style TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

-- Policies for credits
CREATE POLICY "Users can view their own credits"
  ON public.credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits"
  ON public.credits FOR UPDATE
  USING (auth.uid() = user_id);

-- Only service role can insert credits (done via trigger or admin)
CREATE POLICY "Service role can insert credits"
  ON public.credits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 3. GENERATIONS TABLE (history of generated images)
-- ============================================
CREATE TABLE IF NOT EXISTS public.generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  preset_id TEXT NOT NULL,
  style_id TEXT,
  image_urls TEXT[] DEFAULT '{}',
  input_image_url TEXT,
  is_free_generation BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- Policies for generations
CREATE POLICY "Users can view their own generations"
  ON public.generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generations"
  ON public.generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON public.generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON public.generations(created_at DESC);

-- ============================================
-- 4. PURCHASES TABLE (RevenueCat webhook data)
-- ============================================
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rc_product_id TEXT NOT NULL,
  rc_transaction_id TEXT UNIQUE,
  rc_original_transaction_id TEXT,
  credits_added INT NOT NULL CHECK (credits_added > 0),
  amount_paid DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Policies for purchases
CREATE POLICY "Users can view their own purchases"
  ON public.purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert purchases (via webhook)
-- No INSERT policy for regular users

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_rc_transaction_id ON public.purchases(rc_transaction_id);

-- ============================================
-- 5. FUNCTIONS & TRIGGERS
-- ============================================

-- Function to create profile and credits on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Create credits with 1 free generation
  INSERT INTO public.credits (user_id, free_credits, image_credits)
  VALUES (NEW.id, 1, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger for credits updated_at
DROP TRIGGER IF EXISTS update_credits_updated_at ON public.credits;
CREATE TRIGGER update_credits_updated_at
  BEFORE UPDATE ON public.credits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 6. HELPER FUNCTIONS FOR CREDIT MANAGEMENT
-- ============================================

-- Function to safely decrement credits (atomic operation)
CREATE OR REPLACE FUNCTION public.decrement_credits(p_user_id UUID, p_preset TEXT, p_style TEXT)
RETURNS TABLE(success BOOLEAN, is_free BOOLEAN, remaining_free INT, remaining_paid INT) AS $$
DECLARE
  v_free_credits INT;
  v_image_credits INT;
  v_is_free BOOLEAN := FALSE;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT free_credits, image_credits
  INTO v_free_credits, v_image_credits
  FROM public.credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if user has any credits
  IF v_free_credits <= 0 AND v_image_credits <= 0 THEN
    RETURN QUERY SELECT FALSE, FALSE, 0, 0;
    RETURN;
  END IF;

  -- Use free credits first, then paid
  IF v_free_credits > 0 THEN
    UPDATE public.credits
    SET
      free_credits = free_credits - 1,
      total_generations = total_generations + 1,
      last_generation_at = NOW(),
      last_preset = p_preset,
      last_style = p_style
    WHERE user_id = p_user_id;
    v_is_free := TRUE;
    v_free_credits := v_free_credits - 1;
  ELSE
    UPDATE public.credits
    SET
      image_credits = image_credits - 1,
      total_generations = total_generations + 1,
      last_generation_at = NOW(),
      last_preset = p_preset,
      last_style = p_style
    WHERE user_id = p_user_id;
    v_image_credits := v_image_credits - 1;
  END IF;

  RETURN QUERY SELECT TRUE, v_is_free, v_free_credits, v_image_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits after purchase
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id UUID, p_credits INT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.credits
  SET image_credits = image_credits + p_credits
  WHERE user_id = p_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. STORAGE BUCKETS (run in Supabase Dashboard > Storage)
-- ============================================
-- Note: Storage buckets are created via the Supabase Dashboard
-- Create these buckets:
-- 1. "uploads" - For temporary user photo uploads (private)
-- 2. "generations" - For generated images (private with signed URLs)

-- Storage policies (run after creating buckets):
/*
-- For 'uploads' bucket:
CREATE POLICY "Users can upload their own photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own uploads"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- For 'generations' bucket:
CREATE POLICY "Users can view their own generations"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'generations' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Service role can insert generations"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'generations');
*/

-- ============================================
-- DONE! Your Supabase schema is ready.
-- ============================================
