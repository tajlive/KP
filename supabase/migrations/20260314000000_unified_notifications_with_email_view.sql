-- Migration: View for unified_notifications with email (unngår PostgREST 400 på auth.users!inner)
-- Bruk denne view i stedet for: .from('unified_notifications').select('*,auth.users!inner(email)')
-- Kallere (f.eks. Edge Functions / cron) bør hente fra unified_notifications_with_email med service_role.

CREATE OR REPLACE VIEW public.unified_notifications_with_email
WITH (security_invoker = false)
AS
SELECT
  n.id,
  n.user_id,
  n.channel,
  n.type,
  n.title,
  n.body,
  n.data,
  n.is_sent,
  n.sent_at,
  n.is_read,
  n.created_at,
  u.email
FROM public.unified_notifications n
JOIN auth.users u ON u.id = n.user_id;
COMMENT ON VIEW public.unified_notifications_with_email IS
  'Unified notifications med e-post. Bruk i stedet for PostgREST-select med auth.users!inner(email) for å unngå 400. Kun service_role.';
-- Kun service_role kan lese (Edge Functions med service key). Ikke eksponer til anon.
REVOKE ALL ON public.unified_notifications_with_email FROM anon, authenticated;
GRANT SELECT ON public.unified_notifications_with_email TO service_role;
