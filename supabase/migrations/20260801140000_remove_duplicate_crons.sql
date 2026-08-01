-- ============================================================================
-- FIX 2026-08-01: Arkitektur-rydding — ingen dobbelt-motorer, ingen død vekt
-- ============================================================================
-- Funnet under full revisjon (alle brukere / alle trade-metoder):
--
-- 1. klarpakke-tick (*/5) og klarpakke-trading-tick (hvert minutt) kalte
--    BEGGE /api/cron/tick → dobbel-triggering av samme motor hvert 5. min.
--    Beholder trading-tick (hvert minutt, original fra 20260303).
--    Fjerner klarpakke-tick (duplikat fra 20260418).
--
-- 2. test-session-role (SELECT 1 hvert minutt) var en død test-jobb.
--    Fjernes.
--
-- 3. 17 aktive DCA/CryptoPilot-sesjoner hadde smart_trader_enabled=true
--    → smart-trader-v3 (RSI/trend) OG tick (DCA-strategi) prosesserte
--    de samme posisjonene. DCA/CryptoPilot skal styres av tick-motoren
--    alene (regresjonsfiks 2026-07-31). Sett flagget false på disse.
--    smart-trader-v3-jobben forblir aktiv men finner ingen sesjoner.

-- 1. Fjern duplikat tick (behold klarpakke-trading-tick hvert minutt)
SELECT cron.unschedule('klarpakke-tick')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'klarpakke-tick');

-- 2. Fjern død test-jobb
SELECT cron.unschedule('test-session-role')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'test-session-role');

-- 2b. Fjern duplikat signal-health-selfcheck (*/30) — signal-engine-5min
--     (hvert 5. min) kaller samme endepunkt og er referert i scripts.
SELECT cron.unschedule('klarpakke-signal-health-selfcheck')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'klarpakke-signal-health-selfcheck');

-- 3. Kun tick-motoren skal styre DCA/CryptoPilot-sesjoner
UPDATE trading_sessions
SET smart_trader_enabled = false
WHERE status = 'active'
  AND mode = 'paper'
  AND strategy_id IN ('dca', 'cryptopilot')
  AND smart_trader_enabled = true;
