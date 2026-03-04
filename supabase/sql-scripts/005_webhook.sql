-- Database Webhook: bot_health INSERT → trading-push Edge Function
-- Supabase sin supabase_functions.http_request() sender automatisk
-- til prosjektets egne Edge Functions uten eksplisitt auth-header.

DROP TRIGGER IF EXISTS "bot_health_trading_push" ON public.bot_health;

CREATE TRIGGER "bot_health_trading_push"
AFTER INSERT ON public.bot_health
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/trading-push',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '5000'
);
