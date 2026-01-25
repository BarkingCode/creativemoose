-- Migration: Add preview_requests table for rate limiting anonymous users
-- This table tracks preview generation requests by IP address

CREATE TABLE IF NOT EXISTS public.preview_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  preset_id TEXT,
  style_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_preview_requests_ip_created
  ON public.preview_requests(ip_address, created_at DESC);

-- No RLS needed - this is accessed only by service role from Edge Functions
-- But enable it for security best practices with a service-role-only policy
ALTER TABLE public.preview_requests ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table
-- No policies = only service role (which bypasses RLS) can access

-- Optional: Clean up old entries (run periodically via pg_cron or external job)
-- DELETE FROM public.preview_requests WHERE created_at < NOW() - INTERVAL '7 days';
