-- =============================================================================
-- CRON JOB: TWAP Executor
-- Kjører hvert 5. minutt for å utføre limits-ordrer i chunks for pågående rebalanseringer
-- =============================================================================

SELECT cron.schedule(
  'klarpakke-twap-executor',
  '*/5 * * * *',
  $$SELECT klarpakke_trigger_cron('/api/cron/twap-execute')$$
);
