# Tick Pipeline Og Diagnostikk

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

## 🔬 Tick-pipelinen: hvor signaler dør (2026-08-02 kveld, kartlagt)

Når en strategi genererer `buy` men ingen trade skjer, sjekk i denne rekkefølgen (signalet kan dø i hvert steg):

```
1. Strategi-evaluering: resolveStrategy(engineKey) via Dark Fleet (PATH C) eller direkte (PATH B)
   — PATH B kjøres KUN når useDarkFleet=false. DarkFleet er default ON.
   — evaluateDarkFleetSignal → regime + confluent score kan overstyre baseSignal til hold.
2. MTF-filter (linje ~729 tick/route.ts): SKIPPER grid/dca automatisk (strategyKey-sjekk).
3. signal.action === "hold" → heartbeat, INGEN trade (linje ~780).
4. evaluateSignalGuard: kjøp blokkes ved confidence===0 eller expectancy<0.
   ⚠️ Leser confidence fra signal.indicators?.confidence — IKKE top-level signal.confidence!
   GridBotStrategy v2 setter confidence: 0.7 på top-level → guard ser null → tillatt. OK.
5. Trailing exit (åpen posisjon) kan overstyre buy → sell.
6. Buy-side gates: evaluateRegimeGate (blokker crash/trend_down), evaluateAntiWhipsaw,
   jitter + symbolEdgeWeight (skalerer positionSize).
7. Størrelses-kanal: tradeAmount = current_capital × positionSize < minOrderValueForMode →
   return {action:"hold"} UTEN reason. quantity <= 0 → samme.
   ⚠️ GridBotStrategy v2: positionSize = amountPerGrid / capital. amountPerGrid=500 NOK,
   capital=10000 NOK → 0.05 → tradeAmount=500 NOK → over 100 NOK-terskel. OK.
   Men: capital MÅ være NOK (current_capital_nok). Strategien leser session via cast —
   MinimalSession har ikke current_capital_nok i typen; må caste via `as unknown as Record`.
8. Paper sell-guard, risk-validator (kun live), executeTrade (min 10 USDT etter konvertering).
```

**symbol-fallback-felle:** `GridBotStrategy` leste `config?.symbol` som aldri settes i `mergedConfig` → fallback "BTCUSDT" for ALLE par. Fiks: les `session.trading_pair` som fallback (cast via `as unknown as Record<string, unknown>` — MinimalSession-typen har ikke feltet).


## 📡 Diagnostikk-mønster: grid_hold_diagnostic (2026-08-02 kveld)

**Problem:** Grid deployet, state komplett, tick kjører — men 0 trades og NULL i `last_analysis_details` (feltet settes ALDRI av koden). Ingen observabilitet i hvorfor motoren velger hold.

**Fiks:** Når `signal.action === "hold"` og `resolvedEngine === "grid"`, INSERT til `trading_logs` med `action: "grid_hold_diagnostic"` + details (signal_reason, signal_indicators, strategy_id, resolved_engine, current_price, has_open_position). Da kan du spørre DB direkte:

```sql
SELECT details->>'signal_reason', COUNT(*) FROM trading_logs
WHERE action='grid_hold_diagnostic' AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY 1 ORDER BY 2 DESC;
```

**Bruksregel:** Ved «strategi handler ikke»-mysterier — IKKE gjetning på gates, IKKE lokal simulering alene. Legg diagnostikk-INSERT i den døde grenen, deploy, les DB. Svar på 2 ticks. Fjern eller behold som permanent observabilitet (liten kostnad, høy verdi).

**Rask helse-sjekk av hele pipelinen (2026-08-03):**

```sql
-- 1. Lever tick? (< 3 min siden)
SELECT MAX(last_tick_at) FROM trading_sessions WHERE mode='paper' AND status='active';
-- 2. Handler noen? (siste 60 min)
SELECT reason_code, COUNT(*), MAX(executed_at) FROM trades
WHERE executed_at > NOW() - INTERVAL '60 minutes' GROUP BY 1;
-- 3. Blokkeres noen?
SELECT action, COUNT(*) FROM trading_logs
WHERE action IN ('signal_guard_blocked','risk_blocked','regime_gate_blocked','grid_below_min_order')
  AND created_at > NOW() - INTERVAL '60 minutes' GROUP BY 1;
```

Tolkning: tick fersk + trades > 0 = grønt. Tick fersk + 0 trades + blokkeringer > 0 = et gate spiser signalene — differensial-diagnose (bruker som handler vs bruker som ikke handler) peker på historikk-baserte gates (expectancy, Kelly).

**strategy_id vs auto_trading_configs.strategy:** Tick bruker `trading_sessions.strategy_id` (via getStrategyConfig → engine). `auto_trading_configs.strategy` brukes IKKE av tick. Ved onboarding/strategi-endring MÅ `trading_sessions.strategy_id` oppdateres — endring i config-tabellen alene gjør ingenting. Verifiser: `SELECT strategy_id, COUNT(*) FROM trading_sessions WHERE mode='paper' AND status='active' GROUP BY 1`.


