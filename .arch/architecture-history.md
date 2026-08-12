# Arch arkitekturhistorikk — Klarpakke (prosjektnivå, .arch/)

# Plattformnivå: .hermes/architecture-history.md (v4.1 §15).

# Format: dato, beslutning, begrunnelse, konsekvens.

## 2026-08-12 — Adopsjon av Master Prompt v4.1

- **Beslutning:** v4.1 (Arch Autonomous Engineering & Operations Platform) erstatter
  v4.0 som gjeldende grunnprompt. .arch/ utvides med architecture-history.md (§3).
- **Begrunnelse:** v4.1 skjerper Project Factory (§4), alert-krav (§11), kodestandard
  (§8) og gjør Control Plane komplett for multi-prosjekt/multi-agent drift.
- **Konsekvens:** init-project.mjs utvides (backup-strategy + --create-flagg);
  policy for «direkte push til main er ikke standard»; rapportformat §18.

## 2026-08-12 — Arch Control Plane v1 (KLA-274)

- **Beslutning:** .arch/ i repo-rot (prosjektforankret kontrollplan), Secret Registry
  som referanse-lag (ingen verdier), scripts/arch/ (resolve/audit/init).
- **Begrunnelse:** Master Prompt v4.0 §3-§4; repo-anchoring gir versjonskontroll.
- **Konsekvens:** commit 7bdb64bed; Linear KLA-274; compliance-gap dokumentert
  (2 tokens i ~/.hermes/config.yaml — flyttes etter Tom-godkjenning).

## 2026-08-12 — Linear-first alert-kjede (KLA, Task 2)

- **Beslutning:** Sentry-webhook → postLinearAlert() med fingerprint-dedup.
- **Begrunnelse:** idempotens + ingen spam + audit (§11-krav).
- **Konsekvens:** commit 33ce84e26; Trello-posting fjernet fra webhooken.
