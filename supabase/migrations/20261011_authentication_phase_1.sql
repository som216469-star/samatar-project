-- DUGSI PRO 2026 — Phase 1 authentication recovery schema
-- Idempotent migration; does not drop or rewrite existing account data.

ALTER TABLE public.dugsiga_users
  ADD COLUMN IF NOT EXISTS password_reset_token_hash text,
  ADD COLUMN IF NOT EXISTS password_reset_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;

-- Expiry lookup optimization for one-time recovery links.
CREATE INDEX IF NOT EXISTS idx_dugsiga_users_password_reset_expiry
  ON public.dugsiga_users (password_reset_expires_at)
  WHERE password_reset_token_hash IS NOT NULL;

-- The users table must remain server-side only.
ALTER TABLE public.dugsiga_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.dugsiga_users FROM public, anon, authenticated;
GRANT ALL ON TABLE public.dugsiga_users TO service_role;
