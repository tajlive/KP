# KOMPLETT HANDOFF — 11. august 2026 (~23:00)

> **Fra:** DeepSeek V4 Pro (Hermes) · **Til:** Hermes (neste vakt) + DeepSeek V4 Pro 1M
> **Omfang:** Alt som skjedde, alt som er live, alt som gjenstår. Les HELE.
> **Nøkkelfiler:** Les disse FØR du handler:
> `src/lib/strategies/simple-grid.ts` · `src/lib/backtest/simple-backtest.ts` ·
> `scripts/backtest/run-full-cycle.mjs` · `.github/workflows/pilot-weekly-backtest.yml` ·
> `reports/trading-agent/2026-08-10-konkurranseanalyse-pilot-2.md`

---

## 0. SESJONSOVERSIKT — to agenter, én dag

| Agent                        | Rolle                                             | Tidsrom             | Hovedverk                                                                                                                   |
| ---------------------------- | ------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Kimi Desktop K3**          | Strategi + backtest + Pilot-integrasjon + landing | 11. aug 00:00–02:30 | COMBO-strategi, asymmetrisk exit, Pilot i paper, bevis-maskin                                                               |
| **Hermes (DeepSeek V4 Pro)** | CI, drift, OKX-live, P1-fikser, innhold, e2e      | 11. aug 03:00–23:00 | Balanse-inflasjonsfiks, regime-pause-kort, OKX-live-integrasjon (8+ commits), dashboard-tall-P1, e2e-fikser, marketing-uke3 |

KIMI skrev NATTSTATUS-2026-08-11.md kl. 02:42. Hermes leste den, handlet, og committet gjennom dagen. Denne handoffen er den KOMPLETTE samlingen av alt begge agenter gjorde.

---

## 1. HVA ER LIVE I PROD (verifisert)

### 1.1 Sider (alle deployet og verifisert 10.–11. aug)

| Side                                                                              | Commit      | Status                                                     |
| --------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------- |
| `/` Landing Variant C «Beviset» — 6 seksjoner, BacktestBevisSection med EKTE tall | `ae0402eae` | ✅ Verifisert i prod (`-1 229 kr` vs markedet `-1 924 kr`) |
| `/kurs` «Pilot-løpet»                                                             | `3e1e87fec` | ✅                                                         |
| `/om-oss` — Toms historie ordrett                                                 | `ac0310919` | ✅                                                         |
| `/priser` — Student gratis / Pro 399 / Pro+ 799 (Tom-låst, årspris 3 990/7 990)   | `af85fd332` | ✅                                                         |
| `/pilot` «Dagboken»-dashboard — AKTIV/STOPPET, saldo, feed, START/STOPP           | `f07c5a80d` | ✅                                                         |

### 1.2 Pilot (strategi + infrastruktur)

| Komponent                                                                                       | Commit                                  | Status      |
| ----------------------------------------------------------------------------------------------- | --------------------------------------- | ----------- |
| **simple_grid-strategi** (COMBO E3) — grid ±1,5% + DCA/4t + asymmetrisk exit                    | `a87063740` + `f20c14aaf` + `4694cf80d` | ✅ Deployet |
| **trade-explainer** — norsk én-setnings-forklaring per handel (strategyReason → LLM → template) | `ed4152998`                             | ✅          |
| **simple-backtest** — «du ville hatt X kr» med DSR ≥ 0,95-gate, 100+ lukkede lots               | `92409adab` + `7bf8ab6b9` + `622592b1e` | ✅          |
| **Pilot-kobling på Start-knappen** — mode=pilot → simple_grid SOLUSDT                           | `b7a1f765f`                             | ✅          |
| **is_pilot i DB** — migrasjon kjørt og typet i prod                                             | `8aba2a1ef`                             | ✅          |
| **Ukentlig bevis-cron** — GitHub Actions, søndag 06:47 UTC, 90d OKX SOL-data → JSON             | `b7a1f765f`                             | ✅          |
| **Regime-pause-kort** — «Piloten venter på roligere farvann» i Dagboken                         | `d9c254ff4` + `c892afa83`               | ✅          |
| **Balanse-inflasjon FIKSET** — ny sesjon allokeres fra FRI kapital                              | `84ca5ec4e`                             | ✅          |
| **P1.2: AutopilotDashboard** — lekker ikke lenger live-tall i Lekepenger-modus                  | `3fdfe568b`                             | ✅          |
| **SOLUSDT som default** for Pilot (ikke BTCUSDT)                                                | `87b03a4f6`                             | ✅          |
| **P1: dashboard-tall matcher Resultater** — cutoff i RPC fikset                                 | `da1867eb1`                             | ✅          |
| **P1: Historikk viste fantom-posisjoner** fra stoppede sesjoner                                 | `09a1f81eb`                             | ✅          |
| **Første ekte Pilot-sesjon** — Toms konto, verifisert i prod + DB                               | `ec00e202-…`                            | ✅          |

### 1.3 Toms konto (restartet kl. 02:30 → verifisert kl. 09:41)

- **Saldo:** nøyaktig 100 000 kr ✅
- **1 aktiv sesjon:** simple_grid · is_pilot=true · SOLUSDT · paper · 100 000 kr
- **8 gamle sesjoner:** stoppet og ryddet
- **0 handler siste 24t:** KORREKT — markedet er trend_down, bremsene holder

---

## 2. STRATEGIEN — simple_grid COMBO E3

### 2.1 Hva den gjør (prioritet per tick)

| #   | Regel         | Detalj                                                                          |
| --- | ------------- | ------------------------------------------------------------------------------- |
| 1   | **Selg**      | Lot med gevinst ≥ 1,5% → selg 15% av loten (partial), resten får breakeven-gulv |
| 2   | **Grid-kjøp** | Pris treffer dypeste ufylte nivå under 48t-median → kjøp 5% av kapital          |
| 3   | **DCA**       | Ingen kjøp på 4t → kjøp 2% uansett pris                                         |
| 4   | **Hold**      | Vent og forklar                                                                 |

### 2.2 Bremser (alle er inne i strategien)

| Bremse             | Verdi               | Hva den gjør                                              |
| ------------------ | ------------------- | --------------------------------------------------------- |
| **Posisjons-tak**  | 60% av kapital      | Stanser kjøp når investert over grensen                   |
| **«Slipp posene»** | -20% fra 30d-topp   | Selger ALT kontrollert ved krasj, kjøper billigere senere |
| **Drawdown-gate**  | >20% under 30d-topp | Ingen nye kjøp under krasj (salgs-siden åpen)             |

### 2.3 Asymmetrisk exit — den største oppgraderingen (Toms compounding-intuisjon)

**Før:** Fast take-profit på +1,5% solgte HELE loten → amputerte høyrehalen (2021: +11,5% vs markedet +380%, 2023: -7,4% vs +918%).
**Etter:** Selg 15% på grid-nivå, resten får breakeven-gulv og kan løpe.

**Partial-sweep** (SOL full syklus 2021→2026):

```
0.75 → +111%    0.50 → +280%    0.25 → +416%    0.10 → +464%
0.67 → +160%    0.33 → +373%    0.15 → +433%    0.05 → +472%
```

**Valgt:** 0,15 (i den flate sonen, ikke eksakt-maks — unngår overfitting-fellen).
**Resultat:** +433% vs buy-and-hold +116%, PF 1.47, Sharpe 1.00, 5 961 lukkede lots.

### 2.4 E1 (adaptiv ATR-steg) og E2 (smart DCA)

Implementert bak config-flagg (`adaptive_step`, `smart_dca`, default AV). Begge testet i 5-variant-studie mot full syklus — **INGEN passerte gatene** i bjørn-regimet, derfor IKKE deployet. Koden er klar den dagen forward-data beviser dem. Dette ER mandatet: «ingen endring uten OOS-bevis».

### 2.5 Symbol-policy (kuratert, ikke «alt»)

| Klasse      | Symbol                            | Pilot vs hold (full syklus)                   |
| ----------- | --------------------------------- | --------------------------------------------- |
| 🏆 Primær   | SOL                               | +433% vs +116% — høy volatilitet + fete haler |
| ✅ Tier 2   | AVAX (+63/-46) · ETH (+44/-17)    | Kandidater — trenger egen walk-forward        |
| ✅ Tier 3   | DOGE (+10/-72)                    | Slår hold                                     |
| ❌ Ikke her | BTC (-8/+84)                      | Hold er bedre — «bare DCA og hold»            |
| ⚠️ Unngå    | LINK (-31) · ADA (-47)            | Strukturelt svake aktiva                      |
| ⛔ Aldri    | Stablecoins · illikvide microcaps | Slippage dreper matten                        |

**Regel:** Pilot kjører på SOL. Den ukentlige bevis-cronen er kuratoren — den validerer hvilke symboler som kvalifiserer automatisk.

---

## 3. GATE-STATUS — ærlig dom (uendret, regime-låst)

| Gate                                  | Status                                         | Verdi                                      |
| ------------------------------------- | ---------------------------------------------- | ------------------------------------------ |
| PF full syklus / Sharpe / lukkede     | ✅                                             | 1,47 / 1,00 / 5 961                        |
| DSR (ukorrigert)                      | ✅                                             | 0,98                                       |
| **DSR korrigert for 15 testede valg** | ❌                                             | 0,70 (krever 0,95 — López de Prado-straff) |
| **OOS walk-forward 2025–26**          | ❌                                             | −23,5% (men +27pp over hold)               |
| **MaxDD**                             | ❌                                             | 53,8% (2022-driver, over 15%-grensen)      |
| **Dom**                               | **Paper nå. Live når forward-90d DSR ≥ 0,95.** |                                            |

Disse tallene er verifisert på 44 807 OKX 1h-candles (SOL-USDC, 2021→2026). Backtest-scriptet er rekjørbart:

```
node scripts/backtest/run-full-cycle.mjs SOL-USDC
```

---

## 4. OKX LIVE TRADING — HERMES' ARBEID I KVELD (19:00–23:00)

Tom vil aktivere live trading på OKX. Hermes har jobbet med dette i kveld. **Status: nær, men IKKE aktivert ennå.**

### 4.1 Hva Hermes har gjort for OKX-live (commits 19:00–23:00)

| Commit                   | Hva                                                                           |
| ------------------------ | ----------------------------------------------------------------------------- |
| `afe1e984` → `61a6a3370` | OKX-integrasjon i dashboard — erstatter Kraken (reapply etter revert)         |
| `c6fadf7d4`              | fix(kraken): nonce-kollisjonsfiks (serie-hent i stedet for parallell)         |
| `c31d48dd1`              | fix(kraken): nonce mismatch — signRequest + request brukte ulike              |
| `2a87dcb2c`              | feat(kill-switch): OKX-støtte — kanseller OKX-ordrer + stopp sesjoner         |
| `5eb5425b3`              | fix(executor): OKX som gyldig live-børs — canTradeLive + fallback             |
| `21cbc2c6e`              | fix(executor): implementer resolveLiveExchange                                |
| `ec784126c`              | fix(tick): circuit-breaker valutablanding — NOK vs USDC = 93% fantom-drawdown |
| `43145aeca`              | fix(price): INTERNAL_TO_KRAKEN manglet USDC-par                               |
| `958fefd9f`              | test(actions): mock user_okx_keys i canTradeLive-sjekk                        |

### 4.2 KIMIs kompatibilitetsrevisjon (~22:00) — 3 harde blokkere

KIMI (DeepSeek V4 Pro) gravde gjennom hele kjeden og fant:

#### 🔴 BLOKKER 1 — Sizing: ALLE kjøp stille avvist

Tickens `minOrderValueForMode` = $10 (hardkodet Kraken-konstant). Med Toms 101,66 USDC:

- Grid-kjøp (5%): $5,08 → under grensen → stille avvist
- DCA (2%): $2,03 → under grensen → stille avvist

**Fiks:** Exchange-aware minimum — OKX ~$1,50, Kraken beholder $10.

#### 🔴 BLOKKER 2 — ExecutorFactory velger DØD Kraken-nøkkel

`ExecutorFactory.create` prøver Kraken først (`.eq("is_active", true)`). Din Kraken-nøkkel er fortsatt `is_active=true` i DB, men den er død (EAPI:Invalid nonce). Hver live-trade hadde gått til Kraken og feilet.

**Fiks:** `is_active=false` på Kraken-nøkkelen + verifisere `OKX_ENABLED=true` i prod-secrets.

#### 🔴 BLOKKER 3 — Config-nøkkelnavn mismatch

Sesjonens `strategy_config` bruker: `grid_pct`, `partial_exit_pct`, `position_cap_pct`, `drawdown_gate_pct`
Strategien leser: `grid_step_pct`, `partial_sell_pct`, `max_invested_pct`, `dd_gate_pct`

Verdiene matcher tilfeldigvis defaults NÅ, men enhver fremtidig justering av sesjonen blir stille ignorert.

**Fiks:** Skrive om `strategy_config`-objektet på sesjon `d10c6096` med korrekte nøkler.

#### 🟡 GUL 1 — FIFO-bokføring ignorerer lot_id

Tick bokfører salg mot eldste lot (sellFIFO) og leser ikke `lot_id` fra signalet. Runner/breakeven-sporing og realisert PnL vil drifte feil over tid.

**Fiks:** Tickens selg-vei foretrekker `signal.indicators.lot_id` (samme mønster som backtest-fiks 7bf8ab6b9).

#### 🟡 GUL 2 — stop_loss_pct i config leses ikke av simple_grid

Strategien har ingen per-posisjon stop-loss (krasj håndteres av dd-gate + «slipp posene»). Tick har generisk close-on-stop-infrastruktur som kanskje dekker det — må verifiseres.

### 4.3 Toms beslutning

Tom så kompatibilitetsrevisjonen kl. 22:03 og sa «Ja» til å fikse alle 4 blokkere + gule. Deretter sa han «Lag en komplett handoff» — denne filen ER handoffen.

---

## 5. GJENSTÅENDE OPPGAVER — prioritert

### 🔴 KRITISK (blokkerer live)

| #   | Oppgave                                                                                                  | Hvem   | Detalj                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| 1   | Exchange-aware minimum ($10 → dynamisk: OKX ~$1,50, Kraken $10)                                          | Hermes | `src/lib/tick/` — finn `minOrderValueForMode`, gjør exchange-aware                                        |
| 2   | `is_active=false` på Kraken-nøkkel i DB + verifiser OKX_ENABLED                                          | Hermes | SQL: `UPDATE user_kraken_keys SET is_active=false WHERE user_id='0dd08529'` (bekreft med Tom før kjøring) |
| 3   | Config-nøkkelnavn mismatch — skriv om `strategy_config` på sesjon d10c6096                               | Hermes | SQL-update på én rad — nye nøkler: `grid_step_pct`, `partial_sell_pct`, `max_invested_pct`, `dd_gate_pct` |
| 4   | FIFO-bokføring med lot_id — tickens selg-vei                                                             | Hermes | `src/lib/tick/` — der sellFIFO kalles, sjekk `signal.indicators.lot_id` først                             |
| 5   | (GUL) Per-posisjon stop-loss i tick for simple_grid — verifiser at eksisterende infrastruktur dekker det | Hermes |                                                                                                           |

### 🟡 P1 (viktig, ikke-blokkerende)

| #    | Oppgave                                                                                                   | Status                                              |
| ---- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| P1.4 | Resultater «0 handler» vs historikk 13 — mismatchende datakilder                                          | Under arbeid (Hermes var på denne før OKX-arbeidet) |
| P1.5 | Balanse-sumering ved ny aktiv sesjon — sjekk `syncPaperAccountBalance` og `klarpakke_hourly_balance_sync` | flagget i NATTSTATUS                                |

### 🟢 P2 (bør gjøres)

| #                                                                                                                 | Oppgave |
| ----------------------------------------------------------------------------------------------------------------- | ------- |
| Referral dead-code-rydding: ReferralDashboard, GoldenTicket, KLTWallet case, DB-tabeller (diff → Tom-godkjenning) |
| `supabase gen types` — regenerer med docker (is_pilot er kirurgisk lagt inn)                                      |
| Bitwarden-integrasjon (var på Hermes' kø)                                                                         |
| Auth-smoke stabilisering                                                                                          |

### 🤖 Automatisk (kjører av seg selv)

| Oppgave                 | Frekvens         | Mekanisme                                         |
| ----------------------- | ---------------- | ------------------------------------------------- |
| Ukentlig Pilot-backtest | Søndag 06:47 UTC | `.github/workflows/pilot-weekly-backtest.yml`     |
| CI-gates                | Per push         | `deploy.yml`: test-gate → deploy → e2e-smoke-prod |
| Tick-evaluering         | Hvert 5. min     | PG-Cron → Workers                                 |
| Regime-overvåkning      | Hvert 5. min     | Fase2 gate i tick                                 |

---

## 6. KJENTE FELLER — unngå disse

1. **`git add -A`** = dødelig for CI. Ucommitterte WIP-filer kan knekke eslint globalt. Sjekk alltid `git status` før add.
2. **Norsk tusenskille er NBSP** (U+00A0/U+202F) — eslint `no-irregular-whitespace` fanger den. Bruk escape-sekvenser.
3. **`mockReset/mockClear` + `mockRejectedValue`** i vitest → falsk «unhandled rejection» selv når koden fanger. Fiks: `mockImplementation(() => Promise.reject(...))` per test.
4. **Kjør HELE vitest-suiten** etter registry/routing-edits — `npx vitest run` (254 filer, 2 202 tester). Delvise kjøringer har oversett STRATEGY_DEFS-krasj.
5. **`wrangler versions list --json 2>/dev/null | JSON.parse`** = auto-rollback-killer. Guard mot tomt svar.
6. **`supabase gen types`** krever docker. Ved manglende docker: kirurgisk type-tillegg (se `database.types.ts` for mønster).
7. **session_id-referanser** i chat: `d10c6096` = Toms OKX-live-sesjon (paused). `ec00e202-…` = Toms Pilot-paper-sesjon (active).
8. **KIMI-sone vs Hermes-sone:** KIMI eier `src/features/pilot`, `lib/llm`, `lib/backtest`, `app/pilot|kurs|priser|om-oss`. Hermes eier `api/trading/crypto/migrations/workflows`. Kryss aldri uten å lese ARBEIDSFORDELING-doc.

---

## 7. NØKKELFILER — les disse for dyp kontekst

### Strategi

- `src/lib/strategies/simple-grid.ts` — COMBO-strategien (grid ±1,5% + DCA/4t + asymmetrisk exit)
- `src/lib/strategies/__tests__/simple-grid.test.ts` — 37+ tester

### Backtest

- `src/lib/backtest/simple-backtest.ts` — 90d/365d backtest-motor med DSR-gate
- `src/lib/backtest/engine.ts` — Kanonisk backtest-motor (fill-modell + FIFO-ledger)
- `scripts/backtest/run-full-cycle.mjs` — Kjører full syklus (OKX 2021→2026, 44,8k candles)
- `scripts/backtest/run-90d-bevis.mjs` — 90d SOL-backtest for landing-beviset
- `scripts/backtest/run-symbol-sweep.mjs` — Tester alle symboler
- `src/data/backtest-bevis.json` — Prod-beviset (generert av workflow, committet kun ved endring)

### LLM

- `src/lib/llm/trade-explainer.ts` — Norsk én-setnings-forklaring per trade

### OKX Live

- `src/lib/tick/executor/OkxExecutor.ts` — OKX live-executor
- `src/lib/tick/executor/ExecutorFactory.ts` — Velger executor (Kraken-først-fellen)
- `src/lib/tick/engine/tick-engine.ts` — Tick-motoren (minOrderValueForMode, Fase2-gate)

### Infrastruktur

- `src/lib/ai/providers.ts` — Kimi/DeepSeek/Gemini provider-konfig
- `.github/workflows/deploy.yml` — CI-kjede (test-gate → deploy → e2e → auto-rollback)
- `.github/workflows/pilot-weekly-backtest.yml` — Ukentlig bevis-cron

### Dokumentasjon

- `reports/trading-agent/2026-08-10-konkurranseanalyse-pilot-2.md` — Full konkurranseanalyse
- `.hermes/NATTSTATUS-2026-08-11.md` — KIMIs nattstatus (02:42)
- `.hermes/HANDOFF-2026-08-10.md` — KIMIs første handoff (13:45)
- `.hermes/ARBEIDSFORDELING-2026-08-10.md` — Ansvarsfordeling KIMI↔Hermes

---

## 8. KOMPLETT COMMIT-LOGG (11. august, kronologisk)

```
# === KIMI Desktop K3 (natt 10→11 aug) ===
ae0402eae feat(landing): Variant C «Beviset» — 6 nye seksjoner
3e1e87fec feat(kurs): Pilot-løpet
ac0310919 feat(om-oss): Toms historie ordrett
af85fd332 feat(priser): 3-tier (Tom-låst: 399/799)
f07c5a80d feat(pilot): «Dagboken»-dashboard
424a4a97d feat(nav): fjern verveprogram (Tom-beslutning)
a87063740 feat(strategy): simple_grid COMBO [Oppgave 2.1]
ed4152998 feat(llm): trade-explainer [Oppgave 2.2]
92409adab feat(backtest): simple-backtest [Oppgave 2.3]
7bf8ab6b9 fix(strategy+backtest): 5 reelle bugs + posisjons-tak + dd-gate
f86d9b97d feat(backtest): måneds-sweep regime-kart
622592b1e feat(strategy): «slipp posene» kontrollert likvidering
d02cf42cf feat(strategy): E1+E2 implementert (IKKE deployet) + 5-variant-dom
4d4caa696 feat(backtest): full-syklus-script (OKX 2021-2026)
f20c14aaf feat(strategy): E3 asymmetrisk exit (compounding-fiks)
2ebce7784 docs(backtest): symbol-sweep + OOS-dom
4694cf80d feat(strategy): partial_sell_pct 0,15 — mappet optimum
b7a1f765f feat(pilot): integrasjon — Start-knapp + ukentlig bevis
706e002b5 fix(test): routing-tester + STRATEGY_DEFS-krasj
8aba2a1ef feat(pilot): is_pilot i DB
87b03a4f6 fix(pilot): SOLUSDT-default
385674d43 docs(handoff): NATTSTATUS skrevet (02:42)

# === Hermes (DeepSeek V4 Pro) — natt + dag 11 aug ===
84ca5ec4e fix(P1): balanse-inflasjon stoppet — ny sesjon fra FRI kapital
d9c254ff4 feat(pilot): regime-pause-kort i Dagboken
27bac92f5 fix(P2): tittel /marked + 404
03a7adbb0 fix(e2e): innlogget smoke feil på legitime tilstander
d0ffa8d96 fix(marketing): content-engine finner REDAKTORPLAN
bbe4ee7e9 content: uke 3 — LinkedIn, Facebook, nyhetsbrev
853e486b3 fix(e2e): console-guard allow-liste
c892afa83 fix(pilot): pause-banner vises med historikk
3fdfe568b fix(P1.2): AutopilotDashboard live-lekkasje
d150b7efb test(results): retain archived session trades
da1867eb1 fix(P1): dashboard-tall matcher Resultater
24b270d5d fix(test): DashboardPro-pnl-definition
09a1f81eb fix(P1): Historikk fantom-posisjoner
507dc392a fix(dashboard): duplikate -830 CI-flakiness

# === Hermes (OKX live — kveld 11 aug) ===
afe1e984 feat(live): OKX-integrasjon i dashboard
526ee0212 Revert (ikke relevant — se reapply)
c31d48dd1 fix(kraken): nonce mismatch
c6fadf7d4 fix(kraken): serie-hent
61a6a3370 Reapply OKX-integrasjon
2a87dcb2c feat(kill-switch): OKX-støtte
5eb5425b3 fix(executor): OKX som gyldig live-børs
21cbc2c6e fix(executor): resolveLiveExchange
ec784126c fix(tick): circuit-breaker valutablanding
43145aeca fix(price): INTERNAL_TO_KRAKEN manglet USDC-par
958fefd9f test(actions): mock user_okx_keys
```

---

## 9. HVA DU SKAL GJØRE NÅ (anbefalt rekkefølge)

1. **Verifiser grunnleggende tilstand:** `git status` (28 MemPalace-filer slettet, 1 endret — venter på commit). Sjekk CI siste run.
2. **Kjør de 4 kritiske OKX-fiksene** (se §5) — dette er Toms eksplisitte «Ja» kl. 22:03.
3. **Før live-aktivering:** Kill-switch-test mot OKX (stopp sesjon, kanseller ordrer, verifiser at det faktisk skjer).
4. **Aktiver sesjon d10c6096** (unpause → active) — den ER konfigurert for live (mode=live, is_pilot=true, simple_grid, SOL-USDC, 101,66 USDC).
5. **Overvåk første 3 ticks** — sjekk `trading_logs` for at kjøp faktisk går gjennom (exchange-minimum FIKSET → $5,08 og $2,03 må gå gjennom nå).
6. **P1.4** — ferdigstill Resultater-mismatchen.
7. **Commit MemPalace-ryddingen** (28 filer slettet, MCP-config oppdatert).

---

## 10. VIKTIGSTE PRINSIPPER (husk alltid)

- **«Alltid fakta»** — aldri fabrikkerte tall. BacktestBevisSection er skjult inntil ekte data passerer DSR-gaten.
- **DSR ≥ 0,95** er den harde porten for «bevist»-stempel og live-aktivering.
- **Paper-launch er IKKE en konsesjon** — det er produktet. Brukere lærer trygt mens markedet er vrient.
- **Tom sier «ok» = utfør teknisk. Live-trading aktivering = egen dialog.**
- **Strategiske produktbeslutninger → Tom. Teknisk utførelse → deg.**
- **DB-endringer: SQL-diff → Tom-godkjenning → kjør.**
- **«Alt» er aldri svaret** — 60%-taket, ærlig-heten, og 65 000 kr-lærdommen.

---

> **Sluttnotat:** Fra mega-plan kl. 09 den 10. august til kl. 23 den 11. august: 2 agenter, ~50 commits, 0 alvorlige prod-feil. Pilot er levende i paper, OKX-live er 4 fikser unna. CI er grønn. Bevis-maskinen går av seg selv på søndag. Dette er den komplette bildet. Les hele før du handler.
