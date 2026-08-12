# Arch — Changelog

Format: SemVer. Arch selv er versjonert fordi den etter hvert brukes på flere kunder.

## v1.0.0 (2026-08-12)

**Added:**

- **Arch Control Plane** — `.arch/` per prosjekt-repo (project/agents/secrets/environments/policies/decisions/audit-log/architecture-history)
- **Secret Governance v2** — `.arch/secrets/registry.yaml` + `secret-resolve.mjs` + `secret-audit.mjs` (referanser, aldri verdier)
- **Linear governance** — Linear (team KLA) som eneste oppgave-SSoT; Trello utfaset (Task 3A + Fase 4-arkivering)
- **Alert Layer** — Linear-first med fingerprint-dedup (deploy.yml, synthetic-monitor, max-aggressive-monitor, sentry-webhook)
- **Knowledge Graph** (F1) — `.arch/knowledge/{decisions,patterns,failures,customers,architectures,lessons}/` seedet med 21 læringer fra Klarpakke
- **Governance-policy** — «Arch lærer av systemet, men endrer aldri sikkerhetsgrenser automatisk»
- **Architecture Review Gate** (F2) — `arch project analyze` → arkitektur-forslag → Tom-godkjenning → `arch project init`
- **Project Factory v2.0** (F2) — `init-project.mjs` full pipeline, dry-run default, `--approve`-gate for eksterne ressurser

**Reference-prosjekt:** Klarpakke (tajlive/KP) — første komplette kunnskapsbase Arch arver fra.
