# Workflow — Auto-trade strategy research & tuning

Bruk med **Klarpakke Auto-Trade Strategy Research Agent** (`.agent/agents/klarpakke-auto-trade-strategy-research-agent.md`).

## Fase 0 — Scope

- [ ] Bekreft om oppgaven gjelder: kun paper, kun live, eller begge.
- [ ] Les `docs/trading/AUTO-TRADE-STRATEGY-RESEARCH.md` (siste kjøring).

## Fase 1 — Kartlegg

- [ ] Liste alle `StrategyType` / `STRATEGY_DEFS` / `DEFAULT_STRATEGIES` — noter duplikater.
- [ ] Les `preset-profiles.ts`, `risk-levels.ts`, `optimized-risk-profiles.ts`.
- [ ] Skann `src/lib/auto-trading/strategies/` og `binance-executor` for strategispesifikk logikk.
- [ ] Finn bruker-overrides i typer + API (custom params, overrides).

## Fase 2 — Ekstern + intern innsikt

- [ ] WebSearch / åpne forum-kilder — dokumenter URL + dato + konklusjon.
- [ ] Hent ev. anonymiserte aggregater (Supabase MCP) eller beskriv SQL-mønster.
- [ ] Vurder markedskontekst (volatilitet, korrelasjon BTC–alt) for parameterforslag.

## Fase 3 — Forslag

- [ ] For hvert forslag: **før** / **etter**, **hvorfor**, **risiko**, **breaking?**
- [ ] Skill «må backtestes» fra «trygg konsistensfiks».

## Fase 4 — Implementer (hvis i scope)

- [ ] Minste mulige diff; konsolider duplikater når det er lav risiko.
- [ ] i18n **no** + **en** ved brukertekst.
- [ ] Tester der logikk endres.

## Fase 5 — Bevis

- [ ] `npm run lint && npm run type-check && npm run test:unit`
- [ ] Oppdater `docs/trading/AUTO-TRADE-STRATEGY-RESEARCH.md` (siste kjøring).
