# Klarpakke Trading-Optimalisering + Spesialisert Trading Agent — Implementasjonsplan

> **For Hermes:** Bruk subagent-driven-development for å implementere denne planen task-for-task.

**Goal:** Gjøre Klarpakkes paper/auto-trading faktisk lønnsom for ALLE brukere før live-lansering 2026-08-07, med en dedikert «Trading Agent» som kontinuerlig lærer fra forum/ledende kryptoplattformer, backtester og tuner strategien.

**Architecture:** To lag. (1) **In-product:** regime-adaptiv strategi-motor (bygger på eksisterende `src/lib/trading/regime/`) med trailing exits, anti-whipsaw og per-bruker-parametre. (2) **Hermes-side spesialagent:** skill + cron-jobb som miner eksterne kilder, backtester hypoteser mot `backtestEngine.ts`/`walk-forward.ts`, og foreslår/iverksetter config-endringer bak harde akseptkriterier.

**Tech Stack:** Next.js 16 API-ruter · Supabase (Postgres + Edge Functions) · Cloudflare Workers · Vitest · Hermes cron + skills.

---

## Del 0 — Hvorfor ledende plattformer tjener mer penger for brukerne (research-syntese)

Basert på 3Commas, Pionex, Cryptohopper, Bitsgap, Altrady-analyse og r/algotrading:

| # | Hva de gjør | Klarpakke i dag | Kilde |
|---|---|---|---|
| 1 | **Strategi-markedstilpasning** — grid i sidelengs marked, trend-følging i trend, DCA i akkumulering. Én strategi passer ALDRI alle regimer | Én fast RSI/MACD-logikk uansett regime. `regime/policy-ensemble.ts` finnes men er ikke koblet inn som gatekeeper | altrady.com (faktor 1 av 4) |
| 2 | **Exit-kvalitet > entry-kvalitet** — trailing take-profit + delvis scale-out. «Fixed take profits destroy returns» | Fast TP/SL-prosent; selger 100 % av posisjonen på én gang | hyrotrader.com, bitsgap.com, bifu.co |
| 3 | **Gebyr-/frekvensdisiplin** — 0,1 %/trade × 50 trades/uke = 5 %/år bare i gebyr. De begrenser antall trades og unngår whipsaw | Whipsaw verifisert i prod: solgt 621 415 → kjøpt tilbake 622 521 fem min senere (dobbel gebyr + tap) | altrady.com (faktor 3) |
| 4 | **Reell diversifisering** — ulike brukere/boter får ulike signaler og parametre | ALLE brukere kjøpte BTC på ~samme pris (622 520) — «diversifiseringen er illusorisk» (daglig rapport 31.07) | reports/jokertrade-daglig-2026-07-31.md |
| 5 | **Ærlige måletall** — audited marketplace-resultater (Cryptohopper), realistisk 5–25 % over buy-and-hold for gode operatører | Bot logget «+8,6 % profitt» på trades med reelt tap (verifisert i DB 31.07) | ambcrypto.com, altrady.com |
| 6 | **Backtest + walk-forward FØR kapital** — r/algotrading-konsensus: univariate feature-analyse mot faktiske utfall, OOS-validering | `backtestEngine.ts` + `walk-forward.ts` finnes men kjøres ikke systematisk på strategiendringer | reddit.com/r/algotrading |
| 7 | **Risiko først** — Sharpe > 1, max drawdown < 10–20 % som harde gates før skalering | Guard finnes, men regner feil (cash ≠ equity) og stopper ikke trades (verifisert) | youtube/EP41, investopedia |

**Konklusjon:** De tjener mer fordi de (a) aldri lyver om P&L, (b) matcher strategi til regime, (c) maksimerer exit-kvalitet, og (d) aldri deployer en strategi uten OOS-bevis. Klarpakke feiler på alle fire — alle er fiksbare.

---

## Nåtilstand (verifisert fra DB + kode 2026-07-31)

**Fra daglig rapport + egen DB-analyse (Toms konto + alle brukere):**
- 🚨 Win rate 10,8 % (9V/74T). BTCUSDT = 64 % av trades og er negativ (−671 NOK). Hele profitten bæres av ADAUSDT (+3 724 NOK) — én symbol-risiko.
- 🚨 Alle 10 aktive sesjoner i minus (−10 % til −16 %). 38 crashed, 89 nye sesjoner/24t (churn-alarm).
- 🔴 **Drawdown-guard regner på kontanter, ikke equity** (`supabase/migrations/20260731000000_jokertrade_guard_and_killswitch.sql:195`) → 20+ friske sesjoner feil-deaktivert.
- 🔴 **Guarden er tannløs** — `status` forblir `active`, kjøp fortsetter etter «auto-deaktivert» (verifisert: kjøp 06:08 og 07:45 etter guard 05:04).
- 🔴 **Posisjons-desync** — `open_position`=0,0144 BTC, ledger viser 0,0321 BTC. Kjøp overskriver i stedet for å akkumulere.
- 🟠 Falsk take-profit (+8,6 % logget, −12,75 kr realisert) — delvis fikset i `route.ts:264-270` (lagret `usdt_nok_rate`), men IKKE verifisert i prod etter fiksen.
- 🟠 `paper_accounts` stale (viser 100 000 / 0 trades mens sesjonen har 8 trades).

---

## Fase 0 — P&L-INTEGRITET (forutsetning for alt annet)

> Uten sanne tall er all «optimalisering» gjetting. Denne fasen er blokkering for fase 1–4.

### Task 0.1: Verifiser take-profit-fiksen i prod
**Objective:** Bekreft at nye TAKE_PROFIT_SELL-trades har realized_pnl > 0 når pnlPct > 0.
**Files:** Read: `src/app/api/jokertrade/route.ts:240-334`
- Steg 1: SQL: `SELECT executed_at, realized_pnl, reason_params->>'pnlPct' FROM trades WHERE reason_code='TAKE_PROFIT_SELL' AND executed_at > now() - interval '24 hours'` — flagg rader der fortegn avviker.
- Steg 2: Hvis avvik: `realized_pnl` beregnes i `src/lib/trading/core/execute-trade.ts` med levende rate mens exit-sjekken bruker lagret rate → align til samme rate-kilde.
- Steg 3: Test: `npx vitest run src/lib/trading/__tests__/execute-trade-currency.test.ts`
- Steg 4: Commit: `fix: align realized_pnl rate source with exit-check rate`

### Task 0.2: Guard regner på equity (cash + posisjonsverdi)
**Objective:** Drawdown-guard skal aldri feil-deaktivere sesjon med åpen posisjon.
**Files:**
- Modify: `supabase/migrations/` — ny migrasjon `20260731XXXXXX_guard_equity_fix.sql`
- Les først: `supabase/migrations/20260731000000_jokertrade_guard_and_killswitch.sql` (funksjon `jokertrade_health_guard`, ~linje 150-210)

**Steg 1:** Skriv migrasjon som erstatter drawdown-beregningen:
```sql
-- equity = current_capital + verdi av åpen posisjon til siste kjente pris
-- Hent posisjon fra trade-ledger (sum buy qty - sum sell qty per symbol),
-- verdisett med coin_prices.price (NOK — INGEN konvertering).
equity := s.current_capital + COALESCE((
  SELECT SUM((t.qty) * cp.price)
  FROM (
    SELECT trading_pair,
           SUM(CASE WHEN side='buy' THEN quantity ELSE -quantity END) AS qty
    FROM trades
    WHERE session_id = s.id AND status='filled'
    GROUP BY trading_pair
  ) t JOIN coin_prices cp ON cp.symbol = t.trading_pair
  WHERE t.qty > 0
), 0);
dd_pct := (equity - s.initial_capital) / s.initial_capital * 100;
-- Guard utløses kun ved dd_pct < -20
```
**Steg 2:** Vis SQL-diff til Tom FØR kjøring (DB er hellig). Idempotent (CREATE OR REPLACE).
**Steg 3:** Verifiser: Toms sesjon `0aa2eb7e` skal vise equity ~99 4xx, dd ~−0,6 % → IKKE deaktivert.
**Steg 4:** Commit migrasjonen.

### Task 0.3: Guard må faktisk stoppe trading
**Objective:** En «auto-deaktivert» sesjon skal ikke kunne kjøpe.
**Files:**
- Modify: migrasjon fra 0.2 — guard setter også `status='crashed'` (ikke bare `error_message`)
- Modify: `src/app/api/jokertrade/route.ts` (POST, cron-gren) — filtrer `WHERE status='active' AND error_message IS NULL` før bruker-behandling
- Modify: `src/app/api/cron/tick/route.ts` — samme sjekk
- Test: `src/lib/trading/__tests__/close-on-stop.test.ts`-mønster

**Steg 1 (TDD):** Test: sesjon med `status='crashed'` → ingen nye trades i tick. Kjør → FAIL.
**Steg 2:** Implementer status-filter. Kjør → PASS.
**Steg 3:** Verifiser i prod: etter neste guard-kjøring (minutt 4/19/34/49) skal `jokertrade_guard_log` + null nye trades på deaktiverte sesjoner.
**Steg 4:** Commit: `fix: enforce guard — crashed sessions cannot trade`

### Task 0.4: Posisjon akkumuleres fra ledger
**Objective:** `open_position` skal speile faktisk beholdning (sum buys − sells).
**Files:**
- Modify: `src/lib/trading/core/execute-trade.ts` (eller der `open_position` skrives)
- Bruk eksisterende: `src/lib/trading/positions-from-trades.ts` (ledger → posisjoner finnes allerede!)
- Test: `src/lib/trading/__tests__/positions-from-trades.test.ts`, `orphan-positions.test.ts`

**Steg 1 (TDD):** Test: to kjøp à 0,0161 og 0,0144 BTC → `open_position.quantity` = 0,0305 (ikke 0,0144). FAIL.
**Steg 2:** Implementer: etter hver filled trade, re-aggreger `open_position` fra ledger via `positions-from-trades`. PASS.
**Steg 3:** Backfill-script for eksisterende aktive sesjoner (engangs-SQL).
**Steg 4:** Commit: `fix: accumulate open_position from trade ledger`

### Task 0.5: Re-sync paper_accounts
**Objective:** Dashboard-saldo = sann saldo.
**Files:** `src/lib/trading/core/paper-account-sync.ts`, test: `paper-account-sync.test.ts`
- Steg 1: Finn hvorfor sync ikke kjørt siden 30.07 17:58 (cron? manglende kall i tick?).
- Steg 2: Fiks rotårsak (ikke engangs-oppdatering).
- Steg 3: Verifiser: Toms `paper_accounts.current_balance` ≈ equity fra ledger.
- Steg 4: Commit.

---

## Fase 1 — MÅLING (du kan ikke optimalisere det du ikke måler)

### Task 1.1: Edge-dashboard per symbol/strategi
**Files:** Modify: `src/lib/trading/build-trading-analytics.ts`, rapport-generator for `reports/jokertrade-daglig-*.md`
- Legg til: **expectancy** (snitt P&L/trade), **profit factor** (gross win / gross loss), per-symbol edge, per-strategi edge, gebyrandel av P&L.
- Verifisering: daglig rapport viser PF + expectancy automatisk.

### Task 1.2: Signal-treff-logg (feature→utfall)
**Files:** `trade_decisions` (2128 rader finnes) + `ai_signal_outcomes` (10 rader)
- Jobb: koble hver trade til signal-features (RSI, MACD, regime) og realized outcome → univariate analyse à la r/algotrading-metodikken. Output: hvilke features har faktisk prediktiv verdi.
- Dette er datagrunnlaget trading-agenten (fase 3) bruker.

---

## Fase 2 — STRATEGI-OPPGRADERING (det som faktisk tjener penger)

### Task 2.1: Regime-gate FØR hvert kjøp
**Files:**
- Bruk: `src/lib/trading/regime/index.ts`, `regime/policy-ensemble.ts`, `regime/tick-adapter.ts`
- Modify: `src/app/api/jokertrade/route.ts` + `src/app/api/cron/tick/route.ts`

```ts
const regime = await detectRegime(symbol); // trending | ranging | volatile
if (regime === "ranging" && strategy === "trend") skip("regime mismatch");
// ranging → grid-lignende små TP, trending → trailing exit, volatile → halv size
```
- Akseptgate: backtest PF ≥ 1,3 på regime-gated vs baseline FØR prod.

### Task 2.2: Trailing take-profit + delvis scale-out
**Files:** Modify: exit-logikken i `src/app/api/jokertrade/route.ts:282-333`; lagre high-water mark i `trades.metadata` eller `trading_sessions.open_position.hwm`
```ts
// Aktiver trailing ved +3 %; selg 50 % ved +5 %;
// resten trail: exit når pris faller 2 % fra high-water mark.
// Erstatter dagens faste TP som selger 100 % på én gang.
```
- TDD: ny test `trailing-exit.test.ts`. Backtest mot 30 dager prisdata før prod.

### Task 2.3: Anti-whipsaw cooldown
**Files:** Modify: `src/lib/trading/signal-guard.ts` (eller ny `reentry-guard.ts`)
```ts
// Ingen re-entry i samme symbol innen 60 min etter exit,
// og aldri til høyere pris enn siste salg minus 2×gebyr.
```
- TDD: reproduser prod-caset (salg 621 415 04:55 → kjøp 622 521 05:00 skal blokkeres).

### Task 2.4: Bryt identiske entries (reell diversifisering)
**Files:** Modify: brukervalg i `src/app/api/jokertrade/route.ts` (round-robin ~linje 365+) + `smart-trader-v3/signals.ts`
- `hash(user_id)` → per-bruker jitter på: symbol-prioritering (vekt mot symboler med positiv edge fra Task 1.1), entry-terskel ±0,3 %, size ±20 %.
- Mål: korreltasjon mellom brukeres entry-priser < 0,5 (målbart i rapporten).

### Task 2.5: Symbol-edge-vekting
**Files:** config `src/lib/trading/strategy-configs.ts` + auto_config
- Symboler med 30d expectancy < 0 utestenges automatisk (per dagsdata: BTC og DOGE ville vært ute, ADA/SOL inne). Re-evalueres daglig av rapporten.

---

## Fase 3 — DEN SPESIALISERTE TRADING-AGENTEN (Hermes-side)

> Dette er «spesial trading agent» Tom ba om: en dedikert agent som lærer, backtester og tuner — ikke en LLM-prompt i prod, men en kuratert agent-pipeline med harde gates.

### Task 3.1: Skill `klarpakke-trading-agent`
**Files:** Create: `~/.hermes/skills/klarpakke/klarpakke-trading-agent/SKILL.md`
Innhold:
- **Kilder som mines ukentlig:** r/algotrading, r/CryptoTechnology, 3Commas/Cryptohopper/Pionex/Bitsgap blogger, altrady research, HN trading-tråder. (AGENTS.md §3 kildeprioritering.)
- **Metodikk:** hypotese → hent prisdata (binance-proxy) → backtest (`backtestEngine.ts`) → walk-forward OOS (`walk-forward.ts`) → rapport med PF/expectancy/maxDD/Sharpe.
- **Harde akseptkriterier (endring deployes KUN hvis alle passerer):**
  - Profit factor ≥ 1,3 (backtest) OG ≥ 1,1 OOS
  - Win rate ≥ 40 % ELLER expectancy > 2× gebyrkostnad
  - Max drawdown ≤ 15 %
  - 48t paper A/B mot baseline uten forverring
- **Forbud:** ingen endring av risiko-gates uten SQL-diff vist til Tom; ingen live-påvirkning før paper-bevis.

### Task 3.2: Cron — ukentlig research + backtest
- `cronjob create`: søndag 06:00, LLM-jobb (reasoning kreves), pinnet modell per Toms cron-regler.
- Prompt: selvstendig, refererer skillen, skriver `reports/trading-agent/YYYY-MM-DD-forslag.md` + sender sammendrag.
- **Kjedet med:** daglig JokerTrade-rapport (context_from) slik at forslag alltid bygger på fersk edge-data.

### Task 3.3: Daglig auto-tune innenfor trygge grenser
- Script-basert cron (`no_agent=true`, null tokens): kjører `scripts/trading/daily-edge-reweight.mjs` (ny) — leser per-symbol expectancy fra DB og justerer symbol-vekter innenfor ±10 % band. Alt utenfor bandet → eskaleres til den ukentlige agenten.

---

## Fase 4 — LANSE-GATE (2026-08-07)

| Kriterium | Mål | Måling |
|---|---|---|
| P&L-integritet | 0 fortegnsavvik realized vs logget | Task 0.1-SQL daglig |
| Win rate | ≥ 40 % over 5 dager ren data | Daglig rapport |
| Profit factor | ≥ 1,3 samlet | Daglig rapport |
| Symbol-avhengighet | Ingen symbol > 50 % av trades | Daglig rapport |
| Entry-korrelasjon mellom brukere | < 0,5 | Task 2.4-måling |
| Guard | 0 feil-deaktiveringer, 100 % håndheving | guard_log + status-sjekk |
| Sesjon-churn | < 5 nye/døgn | Daglig rapport |

**Go/no-go:** Hvis kriteriene ikke er grønne 05.08: lanser med JokerTrade som «beta»-merket modus uten lønnsomhetspåstander (alltid fakta-regelen), aldri med dagens tall.

---

## Filer som endres (sammendrag)

| Fil | Fase |
|---|---|
| `supabase/migrations/20260731XXXXXX_guard_equity_fix.sql` (ny) | 0.2/0.3 |
| `src/app/api/jokertrade/route.ts` | 0.1, 0.3, 2.1, 2.2, 2.4 |
| `src/app/api/cron/tick/route.ts` | 0.3, 2.1 |
| `src/lib/trading/core/execute-trade.ts` | 0.1, 0.4 |
| `src/lib/trading/positions-from-trades.ts` (gjenbruk) | 0.4 |
| `src/lib/trading/core/paper-account-sync.ts` | 0.5 |
| `src/lib/trading/build-trading-analytics.ts` | 1.1 |
| `src/lib/trading/regime/*` (kobles inn) | 2.1 |
| `src/lib/trading/signal-guard.ts` / ny `reentry-guard.ts` | 2.3 |
| `src/lib/trading/strategy-configs.ts` | 2.5 |
| `supabase/functions/smart-trader-v3/signals.ts` | 2.4 |
| `scripts/trading/daily-edge-reweight.mjs` (ny) | 3.3 |
| `~/.hermes/skills/klarpakke/klarpakke-trading-agent/SKILL.md` (ny) | 3.1 |

## Tester / verifisering

```bash
npx vitest run src/lib/trading/__tests__/            # alle trading-tester grønne
npx vitest run src/lib/trading/__tests__/positions-from-trades.test.ts
npx vitest run src/lib/trading/__tests__/execute-trade-currency.test.ts
# Nye tester: trailing-exit.test.ts, reentry-guard.test.ts, guard-equity (SQL-verifisering)
# Deploy: bash scripts/deploy.sh (eller manuelle steg fra AGENTS.md ved treg maskin) + CDN purge + curl-verifisering
```

## Risiko, tradeoffs, åpne spørsmål

1. **Datagrunnlaget er tynt** (~19t ren data post-fiks). Backtest må bruke historiske priser, ikke historiske trades. Risiko: overfitting på 30d → walk-forward OOS er obligatorisk gate.
2. **Regime-deteksjon kan feilklassifisere** i brå regime-skifter → halv size i «volatile» som default-sikring.
3. **Trailing exits gir flere små gevinster men kan bomme i brå fall** → trailing-deviation backtestes (1 %/2 %/3 %) per symbol-klasse.
4. **Per-bruker-jitter gjør support vanskeligere** («hvorfor fikk naboen bedre trade?») → dokumenter i FAQ at parametre er personlige.
5. **Åpent spørsmål til Tom:** Skal fase 2-endringene rulles ut for alle brukere samtidig, eller A/B på 20 % av aktive sesjoner først? (Anbefaling: A/B — koster 48t, gir bevis.)
6. **Åpent spørsmål til Tom:** Terskel for symbol-utestenging — 30d expectancy < 0, eller strengere (PF < 1,0 over 14d)?

## Kilder (research-grunnlag)

- altrady.com/blog/crypto-bots/are-ai-crypto-trading-bots-profitable-2026 — 4 lønnsomhetsfaktorer, realistisk 5–25 % over buy-and-hold
- 3commas.io/blog/pionex-review — grid/DCA/rebalancing-bot-arkitektur
- bitsgap.com/blog/locking-in-crypto-profits — Trailing Take Profit-mekanikk (trigger + deviation)
- hyrotrader.com/blog/how-to-take-profit-crypto — trailing TP + scale-out for swing
- ambcrypto.com/9-best-ai-crypto-trading-bots-2026 — plattform-sammenligning, strategi-markedstilpasning
- reddit.com/r/algotrading — feature→utfall-analyse, walk-forward-disciplin
- reports/jokertrade-daglig-2026-07-31.md — intern fasit (win rate 10,8 %, illusorisk diversifisering)
- Supabase DB (trades, trading_sessions, paper_accounts, coin_prices) — verifisert 2026-07-31
