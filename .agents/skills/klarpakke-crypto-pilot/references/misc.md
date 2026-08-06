# Misc

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

## Architecture

Klarpakke uses a **multi-agent ensemble** approach: 12 independent trading agents each generate their own signals, and an ensemble engine combines them with weighted scoring.

### Active Agents

| Agent | Weight | Strategy | Added |
|---|---|---|---|
| trendAgent | 0.20 | Follow directional price trends | original |
| meanReversionAgent | 0.15 | Buy oversold, sell overbought | original |
| breakoutAgent | 0.15 | Enter on volatility breakouts | original |
| volatilityAgent | 0.10 | Trade volatility regimes | original |
| momentumAgent | 0.10 | Follow price momentum | original |
| volumeAgent | 0.10 | Volume-confirmed entries | original |
| hurstAgent | 0.10 | Hurst exponent regime detection | original |
| gridAgent | 0.05 | Range-bound grid trading | original |
| sentimentAgent | 0.05 | Social/Reddit sentiment signals | original |
| newsAgent | 0.08 | NewsPulse: CryptoPanic + LLM analysis | 2026-07-27 |
| onchainAgent | 0.07 | ChainRadar: whale tracking + exchange flow | 2026-07-27 |
| narrativeAgent | 0.05 | Narrative detection + rotation signals | 2026-07-27 |

### Signal Pipeline

```
Market Data → 12 Agents → Ensemble Engine → Signal Guard → Risk Engine → Execution
                    ↑              ↑
          News/On-chain/Narrative   Makro (6 regimes)
```


## Competitive Strategy — 6 Data Layers

To beat Binance/Bybit/3Commas, CryptoPilot aims to be the first platform with ALL of:

1. **Technical Analysis** — RSI, MACD, Bollinger, Hurst (existing ✅)
2. **Social Sentiment** — Reddit (existing ✅), planned: Twitter/X, Telegram
3. **News** — CryptoPanic API, CoinGecko News, LLM-based analysis
4. **On-Chain** — Whale Alert, exchange flows, DeFi yields
5. **Macro** — FRED, S&P correlation, 6 market regimes
6. **Mistake Memory** — AutoHeal: classify → heal → remember → predict


## AutoHeal — Self-Healing Trading System

The **MistakeMemory** system is CryptoPilot's unique differentiator. No competitor has automated mistake learning.

### 10 Mistake Categories

```
entry_too_early      — Bought before bottom, price continued down then recovered
entry_too_late       — Bought at peak, price reversed immediately
exit_too_early       — Sold too soon, missed upside
exit_too_late        — Held too long, gave back profit
stop_loss_too_tight  — Stopped out by normal volatility
stop_loss_too_wide   — Unnecessary large loss from wide stop
position_too_large   — Position too large relative to risk
position_too_small   — Missed gains from undersized position
wrong_regime         — Correct signal, wrong market regime
signal_false_positive — Signal was fundamentally wrong
```

### 6 Healing Actions

```
adjust_stop_loss      — Widen stop by 20% after too-tight stops
adjust_position_size  — Reduce position 30% after oversized losses
adjust_entry_timing   — Add 5-min delay after entry-too-early patterns
disable_agent_in_regime — Disable agent in regimes where it underperforms
adjust_confidence_threshold — Raise threshold for false-positive agents
adjust_take_profit    — Tighten TP after exit-too-late patterns
```

### Daily Learning Cycle

A cron job (`CryptoPilot Daily Learning`, 06:00 CET) runs:
1. Fetch all losing trades last 24h
2. Classify each into a mistake category
3. Group by agent, find patterns (≥3 same mistakes)
4. Auto-apply healings
5. Generate learning report

### Database

```sql
CREATE TABLE trade_mistakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  trade_id UUID REFERENCES trades(id),
  agent_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  category TEXT NOT NULL,
  pnl NUMERIC NOT NULL,
  pnl_pct NUMERIC NOT NULL,
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC NOT NULL,
  exit_reason TEXT,
  regime_at_entry TEXT,
  rsi_at_entry NUMERIC,
  volatility_at_entry NUMERIC,
  news_at_entry JSONB,
  healing_applied BOOLEAN DEFAULT false,
  healing_action JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```


## Pitfalls

1. **Never prefix import names with `_`** — The TypeScript convention is to prefix unused variable *bindings*, not imported symbols. `import { X }` → remove X, don't make it `import { _X }`. Subagents often get this wrong.

2. **`noUnusedLocals`/`noUnusedParameters` must be done as a dedicated sprint** — Enabling both flags at once produces 500+ errors across 250+ files. Use a focused subagent with strict rules, or do it gradually (one flag at a time, one directory at a time).

3. **Signal guard blokkerer BÅDE kjøp OG auto-salg med confidence=0** — `evaluateSignalGuard()` avviser nå alle handler med confidence=0, med mindre exit-reason er `stop_loss`, `take_profit`, `manual`, eller `margin_call`. I tillegg rate-limiter auto-salg til maks 1 per 15 min per symbol for å forhindre exit-cascade. `StrategySignal` har fått to nye felter: `confidence` og `exitReason`. Se `src/lib/trading/signal-guard.ts` (15 tester).

4. **Confidence thresholds are risk-level-dependent** — low: 75, medium: 60, high: 40. Don't hardcode.

6. **JokerTrade v1/v2 var en demo — ikke ekte trading** — Før v3 (2026-07-29) genererte JokerTrade `Math.random()` for RSI/MACD/priser, og lagret KUN analyse i `market_intelligence` uten å kalle `executeTrade()`. Hvis du ser `joker_trade: null` på trades, er de fra manuell DCA, ikke CryptoPilot. Verifiser at `joker_trade: true` på trades for å bekrefte at JokerTrade faktisk handler.

7. **Alle endringer skal være systemnivå, ikke per bruker** — Tom krever at fikser gjelder ALLE brukere. Hvis du fikser for én bruker (f.eks. opprette auto_trading_configs manuelt), må du også fikse for alle andre. Bruk `enableAutoTradingForPaperUsers()` eller tilsvarende bulk-operasjon.

8. **Cron-modus velger ÉN tilfeldig bruker per POST** — `POST /api/jokertrade` i cron-modus henter alle enabled brukere og plukker én tilfeldig (`Math.random()`). For å prosessere ALLE brukere i samme tick trengs N+ API-kall (med 11 brukere tok det 17 kall for 100% dekning). Enkelte brukere kan bli valgt 7+ ganger mens andre ikke blir valgt i det hele tatt i en batch. Designet er bevisst (spredning over tid via 15-min cron-rytme), men ved bulk-operasjoner bør du heller iterere direkte over enabled_users i databasen eller kalle POST i loop til alle er dekket. `ensureActiveSession()` håndterer brukere uten aktiv session (f.eks. crashed/stopped) ved auto-opprettelse.

9. **CRON_SECRET MÅ være i wrangler.jsonc vars** — `process.env.CRON_SECRET` er utilgjengelig i Cloudflare Workers med mindre den er eksplisitt satt i `wrangler.jsonc` under `"vars"`. .env.local er KUN for lokal utvikling. Bruk `"CRON_SECRET": "smart-trader-v3-cron-2026-1785191554"`.

10. **`trading_sessions` krever `current_capital` + `initial_capital`** — CONSTRAINT `trading_sessions_capital_nonnegative` krever at ALLE tre feltene `current_capital`, `current_capital_nok`, og `initial_capital` er ≥0. `ensureActiveSession()` MÅ sette alle tre. For paper-brukere settes `current_capital` = `current_capital_nok` (NOK-verdi). Trigger `on_trade_update_session` har `GREATEST(..., 0)` guard for å hindre negative verdier.

11. **`trades` krever `is_copy` + `is_mock`** — Begge er NOT NULL. `is_copy` = false, `is_mock` = false (CHECK constraint: `is_mock IS NOT TRUE`). executeTrade må sette disse i tradeInsert.

12. **Script-cron (no_agent) er 0-token alternativ til LLM-cron** — `scripts/jokertrade-ping.sh` kaller `/api/jokertrade` 10 ganger med cron-secret. Ingen LLM-kostnad. Script-filene må ligge i `~/.hermes/scripts/` for at cron skal finne dem, IKKE kun i prosjektets `scripts/`-mappe. Cron parametere: `no_agent: true`, `script: "jokertrade-ping.sh"`.

13. **`auto_trading_configs` strategy CHECK constraint** — Constraint tillater KUN `['dca', 'grid', 'momentum', 'combined', 'cryptopilot']`. `cryptopilot` ble lagt til 2026-07-29. Ved nye strategier: sjekk constraint og utvid:
```sql
ALTER TABLE auto_trading_configs DROP CONSTRAINT auto_trading_configs_strategy_check;
ALTER TABLE auto_trading_configs ADD CONSTRAINT auto_trading_configs_strategy_check 
  CHECK (strategy = ANY (ARRAY['dca', 'grid', 'momentum', 'combined', 'cryptopilot', '<ny>']));
```

14. **Phantom-kapital — sessions dupliserer penger (FIKSET v4.1)** — Løst 2026-07-29: `ensureActiveSession()` bruker `paper_accounts.current_balance` direkte og gjenbruker eksisterende aktiv session. `getRealAvailableCapital()` (som ga 100 kr minimum) er FJERNET — den lagde verre UX enn phantom-kapital ved å vise 100 kr for brukere med åpne posisjoner. **Riktig tilnærming:** paper_accounts er source of truth (arkitektur-regel #1). Sessions er bare operasjonelle — de opprettes én gang og gjenbrukes.

16. **Pitfalls nummerert — `18` betyr at `15` mangler.** Skill-redigeringer flytter tall. Pitfalls beholder sine tall for sporbarhet — `16` og `18` refererer til samme katastrofe (git checkout).

17. **Over-engineering er verre enn ingen features** — v5 la til markedsregime-filter, sentiment-agent (F&G), og trailing stop-loss. Alle tre ble fjernet fordi: (a) regime-filter blokkerte ALLE handler i normalt volatilt kryptomarked, (b) Fear & Greed er BTC-indikator — å bruke den for DOGE/AVAX/SOL er ulogisk, (c) trailing stop krevde `open_position.highest_price` per symbol, men DB sporer kun én global `open_position`. **Regel:** hver ny feature må vurderes mot "gjør dette handel bedre eller bare mer kompleks?" Hvis usikkert → ikke legg til. Enkel RSI+trend > 12-agent ensemble som ikke finnes i git.

18. **ALDRI `git checkout --` på deployet men ucommittet kode** — ⚠️ KRITISK. Hvis Cloudflare worker har nyere kode enn local git, vil `git checkout --` overskrive med en gammel stub. Den deployede koden går tapt. **Alltid commit deployet kode umiddelbart. Sjekk `git status` før checkout.** Hvis checkout allerede er gjort: rekonstruer fra hukommelsen eller workerens kompilerte JS. Dette skjedde 2026-07-29 med `src/app/api/jokertrade/route.ts` — hele v4 (668 linjer) ble overskrevet med 282-linjers stub. **Redning:** rekonstruert v4.1 fra hukommelsen (ca. 450 linjer), men 12-agent ensemble gikk tapt permanent.

19. **Valutamismatch: session.capital er NOK — alltid konverter til USDT før posisjonsberegning** — `session.capital` / `current_capital_nok` er i NOK. `price` fra binance-proxy er i USDT. Å gjøre `NOK / USDT = quantity` gir enorm kvantitet, som executeTrade så multipliserer med USD-kurs → 7.3× overbelastning per trade. **Fiks:** `capitalUsdt = session.capital / 7.3`, deretter `positionUsdt = capitalUsdt * sizing%`, til slutt `quantity = positionUsdt / price`. Se `references/currency-mismatch-fix.md` for detaljert forklaring og bevis (99 485 → 47 000 på 4 handler ble 99 485 → 97 631 på 1 handel etter fiks).

### Nye v4.1-funksjoner (2026-07-29, post-rekonstruksjon)

- **Per-coin fallback-priser** — `FALLBACK_PRICES` dict i stedet for hardkodet 60000 (BTC). Forhindrer at DOGE/AVAX/SOL får mikroskopiske ordre når binance-proxy feiler. Se `references/minimum-order-value-fix.md`.
- **Signal-læring** — `getCoinWinRate()` sporer historisk win-rate per coin og justerer confidence opp/ned. 50% → 1.0x, 80% → 1.3x, 30% → 0.7x.
- **Session-cleanup** — Etter failed trades stoppes session automatisk. Forhindrer oppsamling av 15+ tomme crashed sessions. Se `references/session-cleanup-pattern.md`.
- **Dashboard** — `/dashboard/jokertrade` viser P&L, win-rate, per-coin breakdown, handler med forklaringer. Client-side, fetcher `GET /api/jokertrade`.

**Symptom:** Paper-balance viser OK beløp, men totalt investert over alle sessions er langt høyere enn startkapital. Dashboard viser flere krasjede sessions med handler.

**Diagnose (SQL):**
```sql
SELECT 
  (SELECT SUM(total_value::numeric) FROM trades WHERE user_id='X' AND side='buy') AS total_invested,
  (SELECT SUM(total_value::numeric) FROM trades WHERE user_id='X' AND side='sell') AS total_recovered,
  (SELECT current_balance FROM paper_accounts WHERE user_id='X') AS paper_balance;
-- Hvis total_invested > paper_balance + total_recovered: phantom-kapital!
```

**Fiks — `getRealAvailableCapital()`:**
```typescript
async function getRealAvailableCapital(db, userId): Promise<number> {
  const paperBalance = Number(account?.current_balance ?? 0);
  const { data: openTrades } = await db.from("trades")
    .select("side, total_value")
    .eq("user_id", userId).eq("status", "filled").is("realized_pnl", null);
  let lockedCapital = 0, pendingReturns = 0;
  for (const t of openTrades) {
    if (t.side === "buy") lockedCapital += Number(t.total_value);
    else pendingReturns += Number(t.total_value);
  }
  // Reell disponible = paper_balance − låst i kjøp + ventende salg
  return Math.max(paperBalance - lockedCapital + pendingReturns, 100);
}
```

**Engangskorreksjon for ALLE brukere:**
```sql
UPDATE paper_accounts pa SET current_balance = subquery.corrected
FROM (
  SELECT t.user_id,
    GREATEST(100000 + COALESCE(SUM(t.realized_pnl) FILTER (WHERE t.realized_pnl IS NOT NULL), 0), 1000) AS corrected
  FROM trades t GROUP BY t.user_id
) subquery
WHERE pa.user_id = subquery.user_id;

UPDATE user_profiles up SET paper_balance = pa.current_balance
FROM paper_accounts pa WHERE up.id = pa.user_id AND up.paper_balance != pa.current_balance;
```

**Prevensjon (forenklet v4.1):** `ensureActiveSession()` gjenbruker aktiv session. Paper_accounts er fasit. Ingen kompleks kapitalutregning. Se `references/phantom-capital-fix.md` for historisk kontekst.

15. **Deployet kode vs git er IKKE i sync uten commit** — `git status` viser 53 modified, 94 untracked. Deploy scriptet bygger fra arbeidsmappen, ikke fra git HEAD. Committed kode → trygg. Ucommittet kode → risikabel (git checkout overskriver).


## Reference

See `.hermes/plans/2026-07-27_061500-crypto-pilot-agent.md` for the full CryptoPilot implementation plan including NewsPulse, ChainRadar, MacroScope, and AlphaSquad phases.

See `references/jokertrade-integration.md` for how JokerTrade was converted from Math.random() to the CryptoPilot 12-agent ensemble (2026-07-27 session).

See `references/db-constraint-debugging.md` for DB constraint pitfalls on the `trades` table (is_copy, is_mock, double-balance from paused sessions).

See `references/competitor-research-v5.md` for the 2026 competitor analysis that drove v5 features (market-regime filter, sentiment agent, trailing stop-loss).

See `references/phantom-capital-fix.md` for the critical phantom-capital accounting bug, root cause analysis, `getRealAvailableCapital()` permanent fix, and one-time correction query.

See `references/currency-mismatch-fix.md` for the critical currency mismatch bug (NOK vs USDT) and how it was fixed — 7.3× capital drain per trade.

See `references/session-crash-investigation.md` for the unresolved investigation into what sets `trading_sessions.status = 'crashed'` — the trigger, tick cron, and application code were all ruled out.

See `references/minimum-order-value-fix.md` for the minimum order value bug (4.74 < 10.00) — per-coin fallback prices, USDT-aware guard, and why hardcoded BTC fallback breaks non-BTC coins.

See `references/session-cleanup-pattern.md` for the session cleanup pattern — stopping empty sessions after failed trades to prevent 15+ active/crashed sessions with 0 trades.


