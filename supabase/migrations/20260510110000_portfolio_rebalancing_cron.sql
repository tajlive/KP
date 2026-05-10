-- =============================================================================
-- CRON JOB: Portfolio Rebalancing
-- Kjører hvert 15. minutt for å sjekke om aktiv portefølje har avvik
-- =============================================================================

SELECT cron.schedule(
  'klarpakke-portfolio-rebalance',
  '*/15 * * * *',
  $$SELECT klarpakke_trigger_cron('/api/cron/portfolio-rebalance')$$
);
