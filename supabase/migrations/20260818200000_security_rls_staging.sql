-- SEC-2026-08-18: Fiks RLS-hull i klarpakke-staging
-- Kilde: Supabase Security Advisor-epost (17 Aug 2026) — 3 kritiske funn.
-- Mål: ingen API-eksponering via anon/authenticated på interne tabeller.

-- ─────────────────────────────────────────────────────────────
-- 1. rls_disabled_in_public — 11 tabeller uten RLS
--    Interne drifts-/trading-tabeller: KUN service_role skal ha tilgang.
--    service_role har BYPASSRLS → fungerer uten policyer.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.auto_trade_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_hermes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_rejections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;

-- Tving RLS (selv tabell-eier respekterer den)
ALTER TABLE public.auto_trade_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bot_health FORCE ROW LEVEL SECURITY;
ALTER TABLE public.coin_prices FORCE ROW LEVEL SECURITY;
ALTER TABLE public.global_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.positions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.risk_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.test2 FORCE ROW LEVEL SECURITY;
ALTER TABLE public.test_hermes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.trade_rejections FORCE ROW LEVEL SECURITY;
ALTER TABLE public.trading_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.trading_signals FORCE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 2. sensitive_columns_exposed — fjern ALL API-tilgang (anon/authenticated)
--    til de RLS-frie tabellene (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/...).
--    service_role + postgres beholder tilgang via eksisterende grants.
-- ─────────────────────────────────────────────────────────────
REVOKE ALL PRIVILEGES ON public.auto_trade_settings FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.bot_health FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.coin_prices FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.global_settings FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.positions FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.risk_profiles FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.test2 FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.test_hermes FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.trade_rejections FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.trading_logs FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.trading_signals FROM anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3. auth_users_exposed — user_performance-viewet joiner auth.users
--    og eksponerer e-post. Fiks: revoke ALLE grants fra anon/authenticated.
--    Viewet er kun for service_role-admin-bruk.
-- ─────────────────────────────────────────────────────────────
REVOKE ALL PRIVILEGES ON public.user_performance FROM anon, authenticated;

-- Merk: user_profiles har ALLEREDE RLS (Users read/update own profile) —
-- binance_key_encrypted-kolonnene er beskyttet av egen-rad-policyen.
-- betasignups.email er beskyttet av "Users can read own data" (email = auth.email()).
