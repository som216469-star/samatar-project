-- DUGSI PRO 2026 — Authentication and password-recovery hardening
-- Safe to run repeatedly against existing installations.

ALTER TABLE public.dugsiga_users
  ADD COLUMN IF NOT EXISTS password_reset_token_hash text,
  ADD COLUMN IF NOT EXISTS password_reset_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_verification_token_hash text,
  ADD COLUMN IF NOT EXISTS email_verification_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

-- Reset tokens are stored as SHA-256 hashes only. Index pending tokens for
-- low-cost, one-time redemption; expired/used tokens are cleared by the API.
CREATE INDEX IF NOT EXISTS idx_dugsiga_users_password_reset_expiry
  ON public.dugsiga_users (password_reset_expires_at)
  WHERE password_reset_token_hash IS NOT NULL;

ALTER TABLE public.dugsiga_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.dugsiga_users FROM public, anon, authenticated;
GRANT ALL ON TABLE public.dugsiga_users TO service_role;
