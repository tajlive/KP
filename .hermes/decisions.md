# Arch / Klarpakke — Beslutningslogg (plattformnivå)

> Prosjektnivå-beslutninger: `.arch/decisions.md`. Denne filen: plattform- og
> arkitekturbeslutninger som gjelder på tvers av prosjekter.
> Format: dato / beslutning / begrunnelse / konsekvens.

## 2026-08-12 — Linear er eneste oppgave-SSoT (KLA-274/275/276)

**Beslutning:** Linear (team KLA, https://linear.app/klarpakke) er eneste aktive
krav-/oppgavekilde for Klarpakke og Arch-porteføljen. Trello er historisk system.

**Begrunnelse:** Trello degenererte (85/110 kort i alert-kirkegård, plukker-cron
feilende); Linear er i faktisk drift (KLA-numre i commits, autofix-cron hvert 10.
min) og har workflow, labels og prosjekter.

**Konsekvens:** Alle alert-sinks (Sentry, auto-rollback, synthetic-monitor,
max-aggressive-monitor) konverteres fra Trello til Linear — idempotent med
fingerprint, label `incident`, ingen spam. Commit-meldinger bruker KLA-numre.

## 2026-08-12 — Arch Control Plane v1 (KLA-274)

**Beslutning:** `.arch/` (project.yaml, agents.yaml, environments.yaml,
policies.yaml, decisions.md, audit-log.md, architecture-history.md,
secrets/ + secret-audit.allow) er obligatorisk struktur for alle prosjekter.
«Arch» = kontrollplanet/styringsmodellen, ikke en programvarekomponent.

**Begrunnelse:** Én standard for prosjektstyring, secrets og audit på tvers av
porteføljen; «Arch» i målmodellen er Toms beslutningslag, ikke ny programvare.

**Konsekvens:** Ingen prosjekt regnes som komplett uten `.arch/`. Project
Factory (`scripts/arch/init-project.mjs`) scaffolder standard-strukturen
(dry-run default, `--create-github`/`--create-linear` styrt og bekreftet).

## 2026-08-12 — Master Prompt v4.1 (KLA-275)

**Beslutning:** HERMES MASTER PROMPT v4.1 (`.hermes/prompts/hermes-prompt-v4.1.md`)
er gjeldende grunnprompt. v4.0 beholdes som historikk.

**Begrunnelse:** v4.1 formaliserer Linear-first, Control Plane, agent-hierarki
(Hermes/Codex/Kimi), kodestandard og produksjonsregler.

**Konsekvens:** Minstegates: `tsc --noEmit` + `npm test` + `npm run build`.
Ingen commit uten grønn test + Linear issue + dokumentert endring.
Git-flyt: Issue → Branch → Review → Main; direkte push til main er ikke
standard. Kun Tom flytter Ready for Tom → Approved.

## 2026-08-12 — Secret Governance v2 (KLA-276)

**Beslutning:** Secrets refereres som `secret://project/environment/service/key`.
Registry i `.arch/secrets/` (registry.yaml + mapping.yaml). Scanner
(`scripts/arch/secret-audit.mjs`) med `--json`/`--check`; CI-gate
`security-audit.yml` + `security-check`-jobb i deploy.yml.

**Begrunnelse:** 2 MCP-tokens lå i klartekst i `~/.hermes/config.yaml`;
plaintext-backup `.env.local.bak` eksisterte.

**Konsekvens:** Deploy krever grønn secret-gate. Hermes MCP-tokens flyttet til
dedikert secret-fil med miljøvariabel-referanser i config.yaml. Aldri literal
secrets i config.yaml, prompts eller commits.

## 2026-08-12 — Agent-hierarki og sonekart

**Beslutning:** Hermes = Chief Architect/Operations (Linear-triage, drift,
små/mellomstore endringer). Codex = Senior Software Engineer (tunge
flerfil-refaktoreringer, arver K3-sonen når aktivert). Kimi = Research/Analysis
(ingen produksjonstilgang).

**Begrunnelse:** Kostnad + kvalitet: DeepSeek Flash/Pro er ~20× billigere enn
gpt-5.5 for rutinearbeid; Codex aktiveres per issue («codex»-label / >5-fil-scope).

**Konsekvens:** Ingen agent flytter egne saker til Approved. Live trading,
kill switch, DB-schema, secrets og UI-fjerninger krever alltid Tom.
