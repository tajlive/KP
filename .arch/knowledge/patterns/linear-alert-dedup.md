# Pattern: Linear Alert Dedup

Bruk når: Alle eksterne varsler (CI, monitoring, Sentry, cron) skal inn i Linear.

Implementasjon: `postLinearAlert()` — sentral helper `src/lib/alerts/linear-alerts.ts`

- inline fingerprint-dedup i CI-workflows (`deploy.yml`, `synthetic-monitor.yml`).

Regler:

- **Fingerprint alltid** — `<!--arch-alert fingerprint:<kilde>:<stabil-id> -->` i description.
- **Dedup mot ÅPNE issues** — `issues(filter: { description: { contains: fp }, state: { type: { neq: "completed" } } })` før opprettelse.
- **Ingen spam** — kronisk brudd gir ÉN issue, ikke 100.
- **Fail-safe** — alert-feil krasjer aldri hovedsystemet.
- **Severity → priority:** warning=2, critical=1, emergency=0 (urgent). Label `incident`.

Kilde: `scripts/lib/escalation-rules.mjs` v2.0 + `.hermes.md` (Linear-alert-kjede).
