# JokerTrade Daglig Statusrapport — 5. august 2026

**Generert:** 2026-08-05 ~06:22 UTC  
**Dataperiode:** 2026-07-30T11:00:00Z og fremover (ren data etter bug-fiks)  
**Kilde:** Supabase REST API (service-role), tabellene `trades`, `trading_sessions`, `cron_health_events`

---

## 1. HANDEL / PnL — Siden fiksen

| Mål | Verdi |
|---|---|
| Totalt antall handler | **8 273** |
| Handler med realized PnL | **806** |
| Wins (PnL > 0) | **608** |
| Losses (PnL < 0) | **198** |
| Win-rate | **75,4 %** |
| **Sum realized PnL** | **+89 793 NOK** |
| Gjennomsnitt PnL (per lukket trade) | **111,41 NOK** |

### 1.1 Per symbol (siden fiksen)

| Symbol | Handler m/PnL | Wins | Losses | Sum PnL (NOK) |
|---|---|---|---|---|
| BTCUSDT | 448 | 367 | 81 | **+55 951,60** |
| ETHUSDT | 280 | 219 | 61 | **+34 075,10** |
| DOGEUSDT | 17 | 9 | 8 | **−120,60** |
| ADAUSDT | 9 | 8 | 1 | **+93,51** |
| UNIUSDT | 29 | 0 | 29 | **−124,14** |
| SOLUSDT | 7 | 0 | 7 | **−108,24** |
| AVAXUSDT | 4 | 2 | 2 | **+113,86** |
| POLUSDT | 7 | 1 | 6 | **−0,79** |
| LINKUSDT | 4 | 1 | 3 | **−87,57** |
| DOTUSDT | 1 | 1 | 0 | **+0,39** |

**Observasjon:** BTC og ETH dominerer positivt. UNI og SOL har 0 % win-rate. DOGE er marginalt negativ.

### 1.2 Daglig trend (siden fiksen)

| Dato | Handler | Wins | Sum PnL (NOK) |
|---|---|---|---|
| 2026-07-30 | 112 | 3 | −701,02 |
| 2026-07-31 | 132 | 0 | −258,01 |
| 2026-08-01 | 70 | 0 | −924,49 |
| 2026-08-02 | 2 229 | 0 | −51,82 |
| 2026-08-03 | 5 717 | 592 | **+91 630,42** |
| 2026-08-04 | 13 | 13 | +98,04 |

**⚠️ ALARM:** Ekstremt ujevn daglig fordeling. De fire første dagene (30/31 juli + 1/2 aug) ga tap til sammen −1 935 NOK. Deretter kom 3. august med **+91 630 NOK** — nesten 100× forrige dags tap. 4. august er nesten stille (13 handler, alle wins). Dette mønsteret er IKKE typisk for en stabil strategi.

**Mistanke:** 3. august kan ha inneholdt en hendelse (stor markedsbevegelse, batch-salg, eller en bug som førte til inflerte PnL-tall) som drar hele perioden. Alle de store positive trades var BTC- og ETH-salg med "trailing exit" som reason — dette ser ut som en markedsrally som ble fanget.

---

## 2. SESJONSHELSE

| Mål | Verdi | Status |
|---|---|---|
| Aktive paper-sesjoner | **200** | — |
| Ferskeste heartbeat | **~2 minutter siden** (06:20 UTC) | ✅ OK |
| Sesjoner med heartbeat > 10 min | **0** | ✅ OK |
| Nye sesjoner siste 24t | **10** (alle én bruker: `0dd08529…`) | ⚠️ VERDI |

### 2.1 Nye sesjoner — vurdering
- 10 nye sesjoner er over den myke terskelen på 5, men alle tilhører **én enkelt bruker** som ble onboardet natt til 5. august (opprettet 01:28 UTC). Dette er normal autogenerering ved første pålogging — IKKE en bølge-guard-brudd.
- Alle 10 har strategy `multi_signal` og `current_capital = 10 000 NOK` (nye, ubrukte).

### 2.2 Øvrige aktive sesjoner
- Eldre sesjoner (fra 2.–3. aug) kjører grid-strategi med varierende kapital. Eksempel:
  - `4af37f63…` / UNIUSDT: 4 215 NOK (ned fra 10 000)
  - `4af37f63…` / ADAUSDT: 7 768 NOK (ned fra 10 000)
  - `4af37f63…` / BTCUSDT: 6 917 NOK (ned fra 10 000)
- Flere sesjoner viser drawdown uten at `max_drawdown_pct` er oppdatert (står på 0,0 %). Dette kan være et visningsproblem.

---

## 3. CRON-HELSE (varig overvåking)

### 3.1 Siste 24t (2026-08-04T06:00Z → 2026-08-05T06:22Z)

| Mål | Verdi |
|---|---|
| Totalt registrerte hendelser | **500** |
| Feil (status ≥ 400) | **53** (10,6 %) |

**Per jobb:**
| Jobb | Hendelser |
|---|---|
| `detect-crashed-sessions` | 242 |
| `supabase-health-monitor` | 204 |
| *(ukjent / None)* | 54 |

**Status-koder:**
| Kode | Antall | Forklaring |
|---|---|---|
| 500 | 42 | Serverfeil (Binance leaderboard 403, interne feil) |
| 503 | 7 | Tjeneste utilgjengelig |
| 405 | 4 | Method Not Allowed |

### 3.2 Nøkkeljobber — `klarpakke-trading-tick`, `smart-trader-v3`, `cron-health-collector`

| Jobb | Siste feil | Siste 24t feil | Status |
|---|---|---|---|
| `klarpakke-trading-tick` | 2026-08-03 18:59 — "job startup timeout" | **0** | ✅ STABIL |
| `smart-trader-v3` | Ingen i `cron_health_events` | **0** | ✅ OK |
| `cron-health-collector` | Ingen i `cron_health_events` | **0** | ✅ OK |

**Viktig:** `klarpakke-trading-tick` hadde en serie "job startup timeout" 3. august (ca. kl. 17:06–18:59), men har vært stille siden. Dette tyder på at feilen ble løst — enten ved deploy, cron-jobb-endring, eller at lasten ble redusert.

`smart-trader-v3` og `cron-health-collector` viser **ingen** feil i overvåkingstabellen. Merk at `cron_health_events` primært fanger opp HTTP-feil fra `net._http_response` — dette betyr at jobber som returnerer HTTP 200 selv om de feiler internt, IKKE logges her. Derfor er null feil et nødvendig, men ikke tilstrekkelig, tegn på helse.

### 3.3 `detect-crashed-sessions` — gjentakende SQL-feil

Denne jobben genererer **242 hendelser/dag** med følgende feil:
```
ERROR: duplicate key value violates unique constraint "idx_one_active_paper_session_per_pair"
DETAIL: Key (user_id, trading_pair)=(1016b26e…, UNIUSDT) already exists.
```

**Årsak:** `detect-crashed-sessions` prøver å re-aktivere en krasjet sesjon for bruker `1016b26e…` / UNIUSDT, men det finnes allerede en aktiv sesjon for samme par. **Dette er ikke kritisk** for trading, men indikerer at healer-logikken ikke håndterer duplikater. Bør ryddes opp i.

---

## 4. ÆRLIG VURDERING: Er datagrunnlaget godt nok til live-beslutning fredag 2026-08-07?

**Kort svar: Nei. Datagrunnlaget er for tynt og for ujevnt til å gi tillit til strategien.**

### Hva som taler FOR:
- 8 273 handler med 75,4 % win-rate ser imponerende ut på overflaten
- +89 793 NOK i paper trading på ~6 dager er et sterkt tall
- Cron-infrastrukturen er stabil (ingen feil siste 24t på nøkkeljobber)
- Session-heartbeats er friske (< 3 min)
- Exit-kalkulasjonen ser korrekt ut (realized_pnl i NOK, ikke USDT)

### Hva som taler MOT:
1. **Kun 806 av 8 273 handler har realized PnL.** De resterende 7 467 handler er antagelig BUY-ordrer som aldri har fått en matchende SELL. Dette er et tegn på at posisjoner blir liggende åpne — enten fordi strategien ikke selger, eller fordi systemet ikke fanger exits.

2. **Ekstrem daglig varians.** −1 935 NOK over 4 dager, deretter +91 630 NOK på én dag. 3. august alene utgjør **102 % av total PnL**. Hvis vi fjerner den dagen, er totalen −1 837 NOK. Dette er IKKE tegn på en konsistent strategi — det er tegn på at én markedshendelse (eller én batch-operasjon) skapte all avkastning.

3. **Signal vs. PnL mismatch.** Mange trades har `reason: "Stop-loss: -71.6%"` eller `reason: "Stop-loss: -140.4%"` samtidig som `realized_pnl` er **positivt**. Dette betyr at signal-genereringen (som bestemmer EXIT-reason) fortsatt bruker USDT-priser, mens PnL-kalkulasjonen bruker NOK. Exit-reason er dermed meningsløs for brukeren — en "-71 % stop-loss" som gir +2,5 NOK er forvirrende og svekker tillit.

4. **For kort observasjonsperiode.** Med bare 6 dager rene data har vi ikke sett strategien gjennom ulike markedsregimer. Én bull-dag på 3. august er ikke nok.

5. **Grid-strategier viser drawdown uten at det reflekteres.** Flere grid-sesjoner har `current_capital` godt under `initial_capital` (f.eks. 4 215 / 10 000), men `max_drawdown_pct` står på 0. Dette tyder på at risk-metrics ikke oppdateres korrekt.

### Anbefaling:
- **Utsett live-beslutningen til vi har minst 14 dager** med stabile, konsistente resultater
- **Sett opp en intern A/B-test:** Kjør to strategi-versjoner parallelt i paper og sammenlign PnL, win-rate, og drawdown
- **Fiks signal/PnL-mismatch:** La exit-reason bruke samme valuta som realized_pnl
- **Fiks `max_drawdown_pct`-beregning** i grid-sesjoner
- **Fiks `detect-crashed-sessions`** for bruker `1016b26e…` / UNIUSDT for å redusere støy i cron-loggene

**Hvis lansering 7. august likevel gjennomføres:** Anbefaler paper-only for alle nye brukere de første 30 dagene, med tydelig "beta"-merking. Ikke promoter resultater fra paper trading som forventet avkastning.

---

*Rapport generert av Kimi — JokerTrade daglig rapport, 5. august 2026.*
