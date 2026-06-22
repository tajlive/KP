-- Server-controlled identity mapping for custom OAuth/OIDC providers.
-- Never store provider subjects in auth.users.raw_user_meta_data because users
-- can update that field themselves.

CREATE TABLE IF NOT EXISTS public.external_auth_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT external_auth_identities_provider_subject_key
    UNIQUE (provider, provider_subject),
  CONSTRAINT external_auth_identities_provider_user_key
    UNIQUE (provider, user_id)
);

ALTER TABLE public.external_auth_identities ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.external_auth_identities FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_auth_identities TO service_role;

CREATE POLICY external_auth_identities_service_role_all
  ON public.external_auth_identities
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.external_auth_identities IS
  'Server-controlled mapping between external provider subjects and auth.users.';

