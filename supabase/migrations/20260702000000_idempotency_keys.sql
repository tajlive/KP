CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  scope TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'completed', 'failed')),
  response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours',
  UNIQUE (key, scope)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_scope_key ON public.idempotency_keys(scope, key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON public.idempotency_keys(expires_at);

-- This table is intentionally accessed only via the Supabase service_role key
-- (trading-engine backend). RLS is enabled as a defense-in-depth measure, but no
-- end-user policies are defined because no authenticated user should read or
-- write idempotency records directly.
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
