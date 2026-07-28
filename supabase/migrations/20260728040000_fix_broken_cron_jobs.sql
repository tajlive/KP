-- Fiks to kronisk feilende cron-jobber (oppdaget av daily_integrity_check)
--
-- klarpakke-analyze-hourly feilet HVER TIME i 24t+:
--   ANALYZE kltbalances → relation does not exist (tabellen er renamet til
--   kltbalances_deprecated; levende tabell er user_klt_balances).
-- daily-klt-bonus feilet daglig av samme grunn (INSERT mot kltbalances).
-- Bonusen er engangs-velkomstbonus (NOT EXISTS-guard) — tørrkjøring viste
-- 0 kandidater, så rettingen er null-risiko for eksisterende brukere.
--
-- APPLIED i prod 2026-07-28 via supabase-db MCP apply_migration.

SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'klarpakke-analyze-hourly'),
  command := 'ANALYZE wallets; ANALYZE global_settings; ANALYZE bot_health; ANALYZE user_klt_balances; ANALYZE auto_trade_settings; ANALYZE email_preferences; ANALYZE user_settings; ANALYZE risk_profiles; ANALYZE user_notification_settings; ANALYZE leaderboard_bots; ANALYZE user_profiles;'
);

SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'daily-klt-bonus'),
  command := $$
    INSERT INTO public.user_klt_balances (user_id, balance, total_earned)
    SELECT id, 5, 5 FROM auth.users
    WHERE created_at < NOW() - INTERVAL '1 day'
      AND NOT EXISTS (SELECT 1 FROM public.user_klt_balances b WHERE b.user_id = id);
  $$
);
