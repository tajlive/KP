# Arch — Changelog

Format: SemVer. Arch selv er versjonert fordi den etter hvert brukes på flere kunder.

## v1.1.0 (2026-08-12) — F3 Pilot

**Added:**

- **F3 Pilot-prosjekt** — `arch-dashboard` (Internal Platform) = første prosjekt generert fra null av Project Factory. Team `ARC` + prosjekt `arch-dashboard` i Linear; 4 lessons arvet; 13 filer scaffoldet. Referanse: `.hermes/plans/2026-08-12-arch-f3-reference-implementation.md`.
- **Arch Health Score** — `scripts/arch/health-score.mjs` (Governance/Secrets/CI-CD/Documentation/Testing → TOTAL). Klarpakke = 100 %, fersk scaffold = 55 %.

**Fixed:**

- `init-project.mjs` v2.1 — `projectCreate` GraphQL-typefeil (`ID!` → `String!`); idempotent team-lookup (gjenbruker eksisterende team-key); idempotent scaffold (hopper over ved eksisterende `.arch/`).
- `analyze-project.mjs` — type-deteksjon for `arch-`/`internal`/`dash`/`admin`/`ops`/`control` → «Internal Platform».

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
