# Arch / Klarpakke — Arkitekturhistorikk (plattformnivå)

> Store beslutninger med dato, beslutning, begrunnelse, konsekvens
> (Master Prompt v4.1 §15). Prosjektnivå: `.arch/architecture-history.md`.

## 2026-08-12 — Linear-first arbeidsarkitektur (KLA-274/275/276)

**Beslutning:** Målmodellen `Linear → Arch (kontrollplan) → Hermes → Codex →
GitHub → CI → Supabase/Cloudflare` gjøres gjeldende. Linear blir eneste
oppgave-SSoT; Trello fryses.

**Begrunnelse:** Gap-rapport 2026-08-12 (`.hermes/plans/2026-08-12-linear-migrasjon-gap-rapport.md`):
Trello var zombie-kanal (85/110 kort i alert-kirkegård, plukker-cron feilet),
mens Linear allerede fungerte som faktisk krav-kanal.

**Konsekvens:** 3 leveranser commitet på `arch-control-plane-v1`:

- `7bdb64bed` — Control Plane v1 (.arch/-struktur + Secret Governance) — KLA-274
- `2a7dc74b0` — Master Prompt v4.1 + Project Factory — KLA-275
- `35a36f12f` — Secret Governance v2 (registry, scanner, CI security-gate) — KLA-276
  Pluss Task 2 (`33ce84e26`): Sentry-webhook Trello → Linear + pre-commit-gate-fiks (`set -e`).

## 2026-08-12 — Alert-arkitektur: Linear Incident-modell

**Beslutning:** Alle varsler følger `System → postLinearIssue() → Linear
Incident → Hermes → Fix → Evidence`. Ingen nye parallelle alert-systemer.

**Begrunnelse:** Trello-«Varsler»-listen var en kirkegård uten lukkemekanisme.
Linear gir eierskap, tilstand (Triage/Monitoring/Done) og lukking.

**Konsekvens:** Idempotens via fingerprint, label `incident`, audit-logg,
fail-safe (alert-feil krasjer ikke hovedsystemet). Sentry-webhook konvertert
først; auto-rollback, synthetic-monitor og max-aggressive-monitor følger.

## 2026-08-12 — Secret Governance: referansebasert tilgang

**Beslutning:** Secrets eksisterer aldri i kode/Git/chat/prompts. Agenter bruker
`secret://`-referanser og kan verifisere eksistens, aldri vise verdier.

**Begrunnelse:** Funn av 2 MCP-tokens i klartekst i `~/.hermes/config.yaml`

- plaintext-backup på disk (KLA-276-audit).

**Konsekvens:** `.arch/secrets/`-registry + scanner med `--check` + CI-gate som
blokkerer deploy ved funn. Lokale stores (`.env.local`, `.env.mcp.local`) er
godkjente, gitignorede unntak.

## 2026-08-12 — Arch Control Plane standardstruktur

**Beslutning:** Alle prosjekter styres via `.arch/` med Project Factory
(`scripts/arch/init-project.mjs` v1.1): scaffold + governed
`--create-github`/`--create-linear`, dry-run default.

**Begrunnelse:** Skalerbarhet: «Customer Project Package» (.arch, Linear,
GitHub, Secrets, CI/CD, Monitoring, Docs, Agent policy, Backup) for fremtidige
kundeprosjekter (Master Prompt v4.1 §16).

**Konsekvens:** Nye prosjekter opprettes automatisk og styrt; ingen prosjekt
uten kontrollplan.
