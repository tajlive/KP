# Blyt Audit-log — Klarpakke

## 2026-08-12 — Master Prompt v4.1 adoptert

- **Aktør:** Hermes · **Hjemmel:** Master Prompt v4.1 (Tom)
- **Hendelse:** v4.1 lagret som grunnprompt; .blyt/ oppdatert (architecture-history.md,
  policies §8/§9/§11/§18, agents §6); Project Factory utvides.
- **Ikke endret:** produksjon, secrets, trading, DB, deploy.

## 2026-08-12 — Control Plane v1 initiert

- **Aktør:** Hermes (Chief Architect + Operations)
- **Hjemmel:** Hermes Master Prompt v4.0 (Tom, 2026-08-12), §3-§4
- **Hendelse:** .blyt/ opprettet (project, agents, secrets, environments, policies, audit-log, decisions) + Secret Governance v1 (secret://-registrering, resolver, audit-scanner, init-script)
- **Linear:** KLA-274 (p0) — «Blyt Control Plane v1 + Secret Governance»
- **Branch:** blyt-control-plane-v1
- **Compliance-funn (read-only):** 2 tokens i ~/.hermes/config.yaml (gho*… linje 435, Bearer sbp*… linje 501) — brudd på §4, dokumentert i policies.yaml, IKKE endret (forbudt i v1-scope)
- **Ikke endret:** produksjon, secrets, trading, DB, deploy

## Format

`Dato — Hendelse` med aktør, hjemmel, omfang og bevis (commit/SHA/CI-referanser).
