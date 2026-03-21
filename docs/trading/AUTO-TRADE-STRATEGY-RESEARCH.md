# Auto-trade strategi — forskning og tuning

**Agent:** `.agent/agents/klarpakke-auto-trade-strategy-research-agent.md`  
**Workflow:** `.agent/workflows/auto-trade-strategy-research.md`  
**Cursor-regel:** `.cursor/rules/klarpakke-auto-trade-strategy-research-agent.mdc`

## Formål

Systematisk gjennomgang av **alle auto-trade-strategier** og tilhørende risiko-/preset-konfigurasjon. Agenten skal:

- foreslå og implementere forbedringer **dypere enn bruker-UI** der det er forsvarlig;
- **forklare hvorfor** (kilde, mekanisme, risiko);
- bruke **åpne forum-/markedskilder** og **interne data** til hypoteser — **ikke** love avkastning.

## Strategi-ID-er (produkt)

| ID                  | Typisk bruk                   |
| ------------------- | ----------------------------- |
| `dca_trygg`         | Lav risiko, DCA               |
| `trend_balansert`   | Trend / MA / RSI              |
| `multisignal_aktiv` | Flere indikatorer             |
| `grid_bot`          | Range / grid                  |
| `ai_copy`           | Copy + AI-filter (høy risiko) |

**Katalog (SoT):** `src/lib/auto-trading/strategy-catalog.ts` — felles metadata for `PaperTrading`, `StrategyBuilder`, `UnifiedTradingDashboard` + berikelse av `strategy_config` ved session-start (trailing/partial TP, DCA-intervall, grid-alias). Legacy API-ID (`dca`, `grid`, …) mappes via `resolveProductStrategyId`.

**Cron-motor vs UI:** Tick-motoren (`src/app/api/cron/tick/route.ts`) brukte nøklene `dca`, `trend_follow`, `multi_signal`, `grid`, mens `startStrategy` i `trading-api.ts` lagret `dca_trygg`, `trend_balansert`, osv. — det ga `Unknown strategy` for dashboard-økter. **Løst:** `src/lib/trading/strategy-id-aliases.ts` + bruk i `processSession` (2026-03-20).

## Inventar (hvor strategien «bor»)

| Lag                                   | Innhold                                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Produkt-ID**                        | `StrategyType` i `src/lib/trading-api.ts`                                                                          |
| **UI metadata + risiko-tall**         | `UnifiedTradingDashboard.tsx` (`STRATEGY_DEFS`, `strategyConfigs`), `messages/*/trading.json` (`strategies.*`)     |
| **Paper/Builder kort**                | Henter lister fra `strategy-catalog` (SL/TP fra `optimized-risk-profiles`)                                         |
| **Risiko (sentral)**                  | `src/lib/config/optimized-risk-profiles.ts`, `src/lib/auto-trading/risk-levels.ts`, `preset-profiles.ts` (KLA-137) |
| **Paper-simulator (annen taksonomi)** | `src/lib/paper-trading/strategies.ts` (`ma_crossover`, `rsi`, …) — **ikke** samme ID-sett som auto-trade           |
| **AI-motor (egen)**                   | `src/lib/ai/auto-trading-engine.ts` (5 min intervall, sentiment/RSI) — parallell sti til tick                      |
| **Tick / utførelse**                  | `src/app/api/cron/tick/route.ts` + `strategy_config` på `trading_sessions`                                         |

## P0 / P1 (prioritert)

### P0 — kritisk / allerede adressert i runde 2026-03-20

| ID       | Beskrivelse                               | Begrunnelse                                                                                                                                                     |
| -------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0-a** | **Strategy-ID mismatch** tick ↔ dashboard | Uten mapping kjørte cron aldri logikk for `dca_trygg` osv. → ingen/få handler fra UI-startede økter. **Implementert:** `resolveTickStrategyEngineKey` + tester. |
| **P0-b** | **`ai_copy` fallback**                    | Ingen egen motor i tick — midlertidig mappet til `multi_signal` så økten ikke feiler; må kommuniseres i UI eller erstattes (se P1).                             |

### P1 — forbedring, konsistens, muligheter (hypoteser — valider i paper)

| ID       | Beskrivelse                                               | Begrunnelse                                                                                                                                                                                                                                                                 |
| -------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1-a** | **Én `strategy-catalog.ts`**                              | **Implementert** 2026-03-21: `STRATEGY_CATALOG_PAPER`, `STRATEGY_CATALOG_BUILDER`, `STRATEGY_DEFS_FOR_DASHBOARD`, `getDefaultStrategyDashboardConfigs`.                                                                                                                     |
| **P1-b** | **Align `strategyConfigs` med `optimized-risk-profiles`** | **Delvis:** `enrichStrategyConfigForSession` injiserer `trailing_stop_pct`, `partial_tp_levels`, DCA `interval_minutes`/`position_size`/`profit_target_pct`/`stop_loss_pct` fra profiler + `risk-levels`. UI-tall for trend følger nå moderate profil defaults i dashboard. |
| **P1-c** | **Dedikert `ai_copy`-motor eller disable**                | **UX:** `messages` + katalog beskriver signal-fusjon; `engine_note`/`display_mode` i config. Motor fortsatt `multi_signal` i tick (ingen copy-pipeline).                                                                                                                    |
| **P1-d** | **`startStrategy` hardkoder** `trading_pair` + kapital    | **Implementert:** `parseTradingPairFromConfig`, `parseInitialCapitalFromConfig` i `trading-api.ts` + samme mønster i `POST /api/trading/sessions`.                                                                                                                          |
| **P1-e** | **Symbol-hygiene `MATIC` → `POL`**                        | **Delvis:** `optimized-risk-profiles` (`POL/USDT`), `preset-profiles` (`POLUSDT`). Øvrige filer (Binance-liste, paper-sim) kan fortsatt nevne MATIC — egen opprydding.                                                                                                      |
| **P1-f** | **Konsolider eller dokumenter to paper-verdener**         | `paper-trading/strategies.ts` vs produkt-strategier — unngå at brukere tror de er samme motor.                                                                                                                                                                              |
| **P1-g** | **Empiri**                                                | Kjør anonymisert SQL: win rate / `total_pnl` gruppert på `strategy_id` (siste 90 d) for å prioritere tuning — via Supabase MCP / readonly.                                                                                                                                  |

## Data og forum (retningslinjer)

- **Eksterne kilder:** offentlige tråd, dokumentasjon (Binance), TradingView-publiserte ideer — alltid siter med lenke og dato.
- **Interne data:** aggregerte metrikker per strategi, signal-cache, market-brief — ingen PII i dokumentasjon.
- **Samsvar:** ingen formuleringer som garanterer profitt i brukervendt tekst.

## Siste kjøring

| Dato       | Scope                                                | Utfall                                                                                                                                                                       | PR / Linear                |
| ---------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 2026-03-20 | Alle produktstrategier + tick + presets + duplikater | P0/P1-rapport; **implementert** `strategy-id-aliases` + vitest; dokumentert mismatch `ai_copy`                                                                               | — (commit / KLA ved behov) |
| 2026-03-21 | P1 katalog + session + UX                            | **strategy-catalog**, beriket `startStrategy` + `POST /api/trading/sessions`, grid `upperPrice`/`levels`-alias i tick, `RobotThinkingStrip` (no/en i18n), vitest for katalog | —                          |

## Relatert

- `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md` — når endringer berører handler/RLS/live.
- `docs/product/KONKURRANSE-OG-BRUKERRESULTAT-2026.md` — produktmessig ramme (ingen løfter).
