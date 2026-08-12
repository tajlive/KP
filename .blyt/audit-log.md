# Blyt Audit-log — Klarpakke

## 2026-08-12 — KLA-276: Secret Governance v2 utført

- **Aktør:** Hermes · **Hjemmel:** KLA-276 task prompt
- **Hendelse:** Fase 1 audit (2 config-tokens + mal-PEM + plaintext-backup) →
  Fase 4 migrering (~/.hermes/config.yaml → ~/.hermes/.env via ${env:VAR},
  backup config.yaml.bak-kla276-1786558665419, smoke github+supabase ✅) →
  Fase 2 .blyt/secrets/ → Fase 5 scanner --json → Fase 6 security-audit.yml +
  deploy.yml security-check → audit clean (7639 filer, 0 funn).
- **Slettet:** .env.local.bak-20260809-000306 (alle levende nøkler dekket av .env.local;
  kun døde Binance-nøkler gikk tapt) og PEM-plassholder i env-mal.
- **Ikke endret:** produksjonssecrets, rotasjon, trading, DB, deploy.

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
