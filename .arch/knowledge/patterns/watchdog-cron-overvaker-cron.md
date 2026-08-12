# Pattern: Watchdog (cron som overvåker cron)

Bruk når: En kritisk jobb MÅ kjøre på faste intervaller (trading-orchestrator, synk,
datakilde) og nedetid er kostbart.

Implementasjon: Egen watchdog-cron som leser `cron.job_run_details` for siste
`runid`/staleness per jobb, og alarmerer kun ved faktisk avvik (>15 min stale).

Regler:

- **«Svarer ikke» ≠ «har ingenting å si»** — en health-sjekk som alarmerer på fravær
  av data (tom logg, 0 trades, ingen nivåer) er WARNING, ALDRI CRITICAL/503.
- **Alarm kun ved faktisk nedetid**, ikke tomt resultat.
- Referanse-case: `autopilot-watchdog` fant orchestrator-nedetid 2026-08-09 01:15
  (25 min stale for user 0dd08529) — se `failures/` + escalation-rules.

Kilde: Hermes-cron `autopilot-watchdog` + `escalation-rules.mjs` (health-monitor-fellen).
