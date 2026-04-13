# Workflow — Perplexity Pro Research

Bruk med **Klarpakke Research Agent** (`.agent/agents/klarpakke-research-agent.md`).

## Trigger

- `architect` ber om kilder før ADR
- `analyzer` finner et ukjent mønster/feil
- `security` trenger compliance-dokumentasjon
- Manuell: teamet vurderer ny teknologi eller strategisk retning

## Fase 1 — Klargjør spørsmålet

- [ ] Formuler én tydelig research-question (1 setning)
- [ ] Identifiser **scope** (teknologi / compliance / marked / feilsøking)
- [ ] Velg Perplexity-verktøy:
  - `perplexity_research` → komplekst, flere kilder
  - `perplexity_reason` → trade-off / logikk
  - `perplexity_ask` → rask fakta-sjekk

## Fase 2 — Kjør research

- [ ] Kjør valgt Perplexity-kall med spesifikk prompt
- [ ] Les hele svaret; noter:
  - Hver kilde (navn, URL, dato)
  - Troverdighet (🔴🟡🟢)
  - Direkte sitater / data

## Fase 3 — Sammenstill for Klarpakke

- [ ] Kort svar (1-2 setninger)
- [ ] Rangerte kilder i tabell
- [ ] Detaljerte funn med sitater
- [ ] Handlingsrettet anbefaling (Option A / B / anbefalt)
- [ ] Risiko hvis anbefalingen ikke følges

## Fase 4 — MemPalace-synk

- [ ] Kjør `mempalace_add_drawer`:
  - wing: `klarpakke`
  - room: `critical_decisions`
  - content: hele leveransen
- [ ] Hvis research avdekket en feil: lag også i `error_patterns`
- [ ] Hvis teknisk gjeld: lag også i `tech_debt`

## Fase 5 — Håndover

- [ ] Ping `architect` med research-sammendrag + MemPalace-lenke/drawer-ID
- [ ] Arkitekt tar neste steg (ADR → implementasjon)
