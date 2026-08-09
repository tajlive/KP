# Daglig Kraken Live-analyse — 2026-08-09

## ⚠️ KRITISK BLOKKERING: Kraken API-nøkkel har ugyldig nonce

**Konsekvens:** Direkte Kraken private API-kall (Balance, OpenOrders, TradesHistory) returnerer `EAPI:Invalid nonce` — selv med nonce +1 år frem i tid. Dette indikerer at nøkkelens lagrede høyeste nonce er ekstremt høy (sannsynligvis fra en tidligere kjøring med feil tidsformat eller klokkefeil). **Nøkkelen må roteres i Kraken-dashboardet** før vi kan hente sanntidsdata direkte.

**Workaround brukt i denne analysen:** Supabase DB (autopilot_state, trades, trading_sessions) + Kraken public API (Ticker, OHLC).

---

## 1. Autopilot-orchestrator status (LIVE grid)

| Felt | Verdi | Vurdering |
|------|-------|-----------|
| `last_run` | 2026-08-09T03:30:11Z | **~1,5 time gammel** — cron skal kjøre hvert 5. min |
| `updated_at` | 2026-08-09T03:30:11Z | Samme — ingen nylig aktivitet |
| `current_equity_usdc` | 152.62 | ▼ -0.89 fra start (153.52) |
| `realized_profit_usdc` | 0 | **Ingen realisert gevinst** |
| `total_fills` | 0 | **Ingen fills registrert** |
| `last_fill_at` | null | — |
| `drawdown_kill` | false | OK |
| `drawdown` | 0.58% | Langt under 15% kill-terskel |

**Konklusjon:** Autopilot-cron har enten stoppet, eller kjører uten å oppdatere state (feiler stille). Ingen fills siden 2026-08-06/07.

---

## 2. Åpne grid-ordre i state (13 stk)

### XBTUSDC (6 ordre)
| Side | Pris | Volum | Status | Plassert |
|------|------|-------|--------|----------|
| buy | 62 143.20 | 0.00016958 | open | 2026-08-06 |
| buy | 62 661.10 | 0.00016818 | open | 2026-08-06 |
| buy | 63 179.00 | 0.00016680 | open | 2026-08-06 |
| buy | 63 696.80 | 0.00016544 | open | 2026-08-06 |
| buy | 63 654.50 | 0.00011853 | open | 2026-08-07 |
| sell | 65 499.00 | 0.00016411 | open | 2026-08-07 |

**Nåpris:** 64 745.54 (24h: 61 800–66 900). **Alle 5 kjøpsnivåer ble berørt i løpet av 24t.** Salgsnivå @65 499 er 1.2% over nåpris — fortsatt åpent.

### ETHUSDC (4 ordre)
| Side | Pris | Volum | Status | Plassert |
|------|------|-------|--------|----------|
| buy | 1 821.35 | 0.00487234 | open | 2026-08-06 |
| buy | 1 840.52 | 0.00482159 | open | 2026-08-06 |
| buy | 1 859.69 | 0.00477189 | open | 2026-08-06 |
| buy | 1 878.87 | 0.00472318 | open | 2026-08-06 |

**Nåpris:** 1 912.31 (24h: 1 750–1 978). **Alle 4 kjøpsnivåer berørt.** Ingen salgsnivåer i state.

### SOLUSDC (3 ordre)
| Side | Pris | Volum | Status | Plassert |
|------|------|-------|--------|----------|
| buy | 70.11 | 0.11866496 | open | 2026-08-06 |
| buy | 71.01 | 0.11716096 | open | 2026-08-06 |
| buy | 71.90 | 0.11571071 | open | 2026-08-06 |

**Nåpris:** 75.94 (24h: 70.59–79.60). **2 av 3 nivåer berørt** (70.11 var under 24h-lav). Ingen salgsnivåer.

---

## 3. Markedsregime siste 24t

| Par | 24h endring | 24h volatilitet | Regime | Grid-egnethet |
|-----|-------------|-----------------|--------|---------------|
| XBTUSDC | -0.27% | ~8.3% | Sideways/svakt ned | ✅ God — grid bør fange spreads |
| ETHUSDC | -0.17% | ~12.9% | Sideways | ✅ God — høy volatilitet innenfor range |
| SOLUSDC | -0.03% | ~12.7% | Sideways | ✅ God — men laveste nivå (70.11) ikke berørt |

**Alle tre par har beveget seg innenfor grid-rangen.** Det er derfor **høyst mistenkelig** at `total_fills = 0`.

---

## 4. Live-trades historikk (DB)

**Siste live-trade:** 2026-08-01 (ADAUSDT ×11, MULTI_SIGNAL_BUY). Ingen nye live-trades siden.

**Gamle live-sesjon:** `ensemble_ai` på ADAUSDT — stoppet 2026-08-01 med feil: *"Binance API error: 400 Account has insufficient balance"*. Denne sesjonen er arkivert og ikke relatert til nåværende Kraken-grid.

---

## 5. Paper-trading (for sammenligning)

**Aktiv paper-sesjon:** BTCUSDT grid, kapital 199 647 NOK. Siste tick: **2026-08-09T05:10:03Z** (3 minutter før denne analysen). Paper-grid kjører altså normalt.

**Siste paper-trades:** 2 BTC-kjøp 2026-08-08 (150.30 + 200.40 NOK). Ingen salg — åpen posisjon @619 111 NOK (nåpris ~623 164 NOK, +0.65% urealisert).

---

## 6. Mønster-analyse og rotårsakshypoteser

### Hypotese A: Autopilot-cron er stoppet (mest sannsynlig)
- `last_run` = 03:30:11Z = 1t 40min siden
- Forventet kadens: */5 min
- **Indikasjon:** Cron-jobb (pg_cron job 1176 eller Hermes-cron) har stoppet, eller handleren krasjer før state-oppdatering

### Hypotese B: Ordre er kansellert på Kraken, men state ikke synket
- Alle 13 ordre i state er `status: open` fra 2026-08-06/07
- Prisene berørte alle nivåene — burde utløst fills
- **Men:** Uten Kraken API-tilgang kan vi ikke verifisere om ordrene faktisk eksisterer på Kraken lenger. De kan ha blitt kansellert av:
  - Kraken (inactivity, insufficient funds, eller margin call)
  - En tidligere manager-kjøring som feilet midt i prosessen
  - Manuell inngripen

### Hypotese C: Fill-deteksjons-bug (pendingSell-mønsteret)
- Manageren hadde en bug der feilet salgsplassering førte til at kjøp ble markert `filled` uten at fill faktisk skjedde
- Fikset 2026-08-07 med `pendingSell`-retry
- **Men:** Hvis denne buggen traff før fiksen, kan state være korrupt (ordre markert som åpne, men faktisk fylt eller kansellert)

---

## 7. Tiltak og anbefalinger

### P0 — Umiddelbart (krever Tom)
1. **Roter Kraken API-nøkkel** i Kraken-dashboardet. Nåværende nøkkel har ugyldig nonce og kan ikke brukes. Uten dette kan vi ikke:
   - Verifisere om ordrene faktisk eksisterer på Kraken
   - Hente faktisk balanse og equity
   - Bekrefte om fills har skjedd uten at DB er oppdatert

### P1 — Autopilot-cron
2. **Sjekk cron-status:** Verifiser at pg_cron job 1176 (`autopilot-orchestrator`) kjører. Sjekk `cron.job_run_details` for siste status. Hvis den kjører men feiler, sjekk Sentry/GlitchTip for `captureCronError`-events.

3. **Manuell trigger:** Kjør autopilot-orchestrator manuelt for å se om den oppdaterer state:
   ```bash
   curl -X POST https://klarpakke.no/api/cron/autopilot-orchestrator \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

### P2 — Grid-state-rekonsiliering
4. **Verifiser ordre mot Kraken:** Etter nøkkelrotasjon, kjør `node scripts/kraken-live-probe.mjs` for å sammenligne DB-state med faktiske `OpenOrders`. Eventuelle avvik (state sier open, Kraken sier ikke eksisterer) må resynkes.

5. **Sjekk for ghost-fills:** Hvis Kraken viser trades i `TradesHistory` som ikke finnes i `trades`-tabellen, må disse importeres.

---

## 8. Oppsummering

| Indikator | Status | Betydning |
|-----------|--------|-----------|
| Autopilot kjører | ❌ Stoppet/stille | Ingen state-oppdatering på 1,5t |
| Grid-ordre berørt | ✅ Ja (alle nivåer) | Markedet har svingt innenfor rangen |
| Fills registrert | ❌ 0 | Enten ingen fills, eller fill-deteksjon ødelagt |
| Realisert gevinst | ❌ 0 USDC | Ingen P&L å rapportere |
| Drawdown | ✅ 0.58% | Lav — ingen fare for kill |
| Paper-grid | ✅ Kjører normalt | Live-grid er isolert problem |

**Bunnlinje:** Live Kraken-grid har vært inaktivt i minst 1,5 time. Alle indikasjoner peker på at autopilot-cron ikke fullfører sine kjøringer. Kombinert med den blokkerte API-nøkkelen er det umulig å verifisere om ordrene faktisk er aktive på Kraken. **Roter nøkkelen og sjekk cron før videre analyse.**

---
*Rapport generert 2026-08-09 05:10 UTC. Datakilder: Supabase DB (autopilot_state, trades, trading_sessions), Kraken public API.*
