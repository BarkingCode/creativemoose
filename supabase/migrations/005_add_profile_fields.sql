-- Migration: Add profile fields and avatars storage
--
-- This migration adds:
-- 1. display_name column to profiles (user-chosen display name)
-- 2. bio column to profiles (user bio/description)
-- 3. avatars storage bucket for user-uploaded avatars
--
-- Note: profiles table already has full_name (from OAuth) and avatar_url

-- ============================================
-- 1. ADD DISPLAY_NAME TO PROFILES
-- ============================================

-- Add display_name column for user-customizable name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'display_name'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN display_name TEXT;
  END IF;
END $$;

-- ============================================
-- 2. ADD BIO TO PROFILES
-- ============================================

-- Add bio column for user description
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'bio'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN bio TEXT;
  END IF;
END $$;

-- ============================================
-- 3. STORAGE BUCKET: avatars
-- ============================================

-- Note: Storage buckets must be created via Supabase Dashboard or API
-- The following is documentation for manual setup:

/*
Create 'avatars' bucket in Supabase Dashboard > Storage:
- Bucket name: avatars
- Public bucket: YES (so avatar URLs can be accessed without auth)
- File size limit: 2MB
- Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

Storage policies for 'avatars' bucket:

-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow anyone to view avatars (public bucket)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow users to update their own avatars
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
*/

-- ============================================
-- DONE: Profile fields and avatars storage ready
-- ============================================
