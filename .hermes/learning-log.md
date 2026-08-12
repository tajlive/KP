# .hermes/learning-log.md — Hermes læringslogg (Master Prompt v4.1 §14)

# Format: Dato / Problem / Rotårsak / Løsning / Ny regel / Automatisering.

## Dato: 2026-08-12 — Adopsjon av Master Prompt v4.1

- **Problem:** Grunnprompten (v4.0) dekket ikke Project Factory-krav, alert-spesifikasjon og multi-prosjekt-skala.
- **Rotårsak:** Arkitekturen utviklet seg raskere enn dokumentasjonen.
- **Løsning:** v4.1 lagret verbatim (.hermes/prompts/hermes-prompt-v4.1.md); .blyt/ utvidet med architecture-history.md; policies/agents oppdatert til §6/§8/§9/§11/§18.
- **Ny regel:** Alle commits krever grønn test + Linear issue + dokumentert endring (§8). Direkte push til main er ikke standard (§9).
- **Automatisering:** init-project.mjs → Project Factory v1.1 (backup-strategy + governed --create-flagg).

## Dato: 2026-08-12 — Control Plane v1-initiering

- **Problem:** Ingen prosjektstyringskontrakt; «Blyt» udefinert som komponent.
- **Rotårsak:** Kontrollplanet eksisterte kun som idé i prompt.
- **Løsning:** .blyt/ (8 filer) + scripts/blyt/ (resolve/audit/init) + Secret Registry som referanse-lag.
- **Ny regel:** Ingen prosjekt regnes komplett uten .blyt/ (§3). Secrets aldri i kode/git/chat/prompts (§5).
- **Automatisering:** secret-audit.mjs (7636 filer scannet, allowlist), secret-resolve.mjs.

## Dato: 2026-08-12 — Beskyttede filer blokkert

- **Problem:** 4 skriv operasjoner blokkert (agent-instruction-vakt, godkjenningstimeout).
- **Rotårsak:** Hermes-garden krever eksplisitt samtykke for agent-instruksjonsfiler.
- **Løsning:** Ikke omgått; retry ved nytt direktiv med aktiv godkjenning.
- **Ny regel:** Stilhet ≠ samtykke — blokkerte filer rapporteres og venter.
- **Automatisering:** Innholdet er ferdig klargjort for én-klikks-godkjenning.
