-- Migration: Fix credit functions to handle missing rows
-- Problem: decrement_credits and add_credits fail silently when credits row doesn't exist

-- ============================================
-- 1. FIX add_credits: Use UPSERT pattern
-- ============================================
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id UUID, p_credits INT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Try to update existing row first
  UPDATE public.credits
  SET image_credits = image_credits + p_credits,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- If no row was updated, insert a new one
  IF NOT FOUND THEN
    INSERT INTO public.credits (user_id, free_credits, image_credits)
    VALUES (p_user_id, 0, p_credits)
    ON CONFLICT (user_id) DO UPDATE
    SET image_credits = public.credits.image_credits + p_credits,
        updated_at = NOW();
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. FIX decrement_credits: Handle missing rows
-- ============================================
CREATE OR REPLACE FUNCTION public.decrement_credits(p_user_id UUID, p_preset TEXT, p_style TEXT)
RETURNS TABLE(success BOOLEAN, is_free BOOLEAN, remaining_free INT, remaining_paid INT) AS $$
DECLARE
  v_free_credits INT;
  v_image_credits INT;
  v_is_free BOOLEAN := FALSE;
  v_row_exists BOOLEAN;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT free_credits, image_credits
  INTO v_free_credits, v_image_credits
  FROM public.credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if row exists (GET DIAGNOSTICS doesn't work with SELECT INTO)
  v_row_exists := FOUND;

  -- If no credits row exists, return failure
  IF NOT v_row_exists THEN
    RAISE NOTICE 'No credits row found for user %', p_user_id;
    RETURN QUERY SELECT FALSE, FALSE, 0, 0;
    RETURN;
  END IF;

  -- Check if user has any credits (handle NULL as 0)
  v_free_credits := COALESCE(v_free_credits, 0);
  v_image_credits := COALESCE(v_image_credits, 0);

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

-- ============================================
-- 3. Ensure user has credits row (helper)
-- ============================================
CREATE OR REPLACE FUNCTION public.ensure_credits_exist(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.credits (user_id, free_credits, image_credits)
  VALUES (p_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DONE: Credit functions are now more robust
-- ============================================
