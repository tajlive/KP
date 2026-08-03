# JokerTrade Daglig Statusrapport

**Rapportdato:** 2026-08-03 kl. 08:17 CEST  
**Datagrense:** Kun handler etter 2026-07-30 kl. 11:00 UTC (post-bugfiks)  
**System:** Klarpakke Paper Trading (JokerTrade)

---

## 1. HANDLER / PnL (siden fiksen)

| Metrikk | Verdi |
|---------|-------|
| Totalt antall trades | 6 864 |
| Åpne posisjoner | 6 587 (96 %) |
| Lukkede handler (med PnL) | 270 |
| Wins (realized_pnl > 0) | 142 |
| Win rate (lukkede) | **52,6 %** |
| Total realized PnL | **+12 035 NOK** |
| Gj.sn. PnL per lukket trade | +44,6 NOK |

> ⚠️ **Kritisk:** 6 587 av 6 864 trades (96 %) har `realized_pnl = NULL` — de er altså åpne og aldri lukket. Exit-logikken fungerer i praksis ikke.

### Per symbol (lukkede handler)

| Symbol | Exits | Wins | Win rate | Total PnL | Gj.sn. PnL |
|--------|-------|------|----------|-----------|------------|
| BTCUSDT | 162 | 84 | 51,9 % | +8 211,12 | +50,7 |
| ETHUSDT | 100 | 55 | 55,0 % | +4 061,24 | +40,6 |
| ADAUSDT | 1 | 1 | 100 % | +3,82 | +3,8 |
| DOTUSDT | 1 | 1 | 100 % | +0,39 | +0,4 |
| AVAXUSDT | 2 | 0 | 0 % | −53,98 | −27,0 |
| LINKUSDT | 4 | 1 | 25 % | −87,57 | −21,9 |
| **Total** | **270** | **142** | **52,6 %** | **+12 035** | **+44,6** |

Nesten all gevinst kommer fra **BTCUSDT og ETHUSDT** — de andre symbolene er i praksis flat eller småtaps.

### Daglig trend (lukkede handler)

| Dato | Exits | Wins | Win rate | PnL |
|------|-------|------|----------|-----|
| 2026-08-03 | 183 | 139 | **76,0 %** | **+13 864,17** |
| 2026-08-02 | 11 | 0 | 0 % | −51,82 |
| 2026-08-01 | 33 | 0 | 0 % | −924,49 |
| 2026-07-31 | 21 | 0 | 0 % | −258,01 |
| 2026-07-30 | 31 | 3 | 9,7 % | −701,02 |

> 2026-08-03 er en dramatisk outlier: 183 exits og +13 864 NOK. De foregående dagene hadde 0 wins. Dette tyder på enten (a) at TP/SL nådde nivåer etter et kraftig markedsmovement, eller (b) at en batch-exit ble trigget manuelt / av en annen mekanisme.

---

## 2. SESJONSHELSE

| Metrikk | Verdi | Status |
|---------|-------|--------|
| Aktive paper-sesjoner | 351 | — |
| Freshest heartbeat | 2026-08-03 06:28 UTC (~2 min gammelt ved sjekk) | ✅ OK |
| Nye sesjoner siste 24t | **359** fra **36 distinkte brukere** | 🚨 **ALARM** |
| Stoppet siste 24t | 11 | — |
| smart_trader_enabled | **false for ALLE 351 sesjoner** | 🚨 **ALARM** |

### smart_trader_enabled — tidslinje

| Dato | Enabled | Disabled |
|------|---------|----------|
| 2026-08-03 | 0 | 320 |
| 2026-08-02 | 8 | 43 |
| 2026-08-01 | 1 | 2 |
| 2026-07-31 | 0 | 35 |
| 2026-07-30 | 0 | 7 |

> 🚨 **Kritisk funn:** `smart_trader_enabled = false` for **samtlige** 351 aktive sesjoner. Kun **1 av 36 brukere** har `user_auto_trading_configs.is_enabled = true`. JokerTrade-automasjonen kjører med andre ord **ikke** for noen brukere nå.

---

## 3. CRON-HELSE

### Key cron-jobbstatus (siste 24t)

| Jobb | Status |
|------|--------|
| `klarpakke-trading-tick` (/api/cron/tick) | ✅ Kjører, "succeeded" |
| `binance-sync` (/api/cron/binance-sync) | ✅ Kjører, "succeeded" |
| `session_maintenance` | ✅ Kjører, "succeeded" |
| `sync-prices` (/api/cron/sync-prices) | ✅ Kjører, "succeeded" |

> Merk: `cron.job_run_details` viser "succeeded" selv når HTTP-responsen er 500/401 — dette er et kjent pg_cron-atferdsmønster.

### cron_health_events (siste 24t) — varig overvåking

| status_code | Antall | Type feil |
|-------------|--------|-----------|
| **500** | 721 | "Binance leaderboard API error: 403" |
| **null** (timeout) | 486 | "Timeout of 25000 ms reached" |
| **503** | 48 | Tjenesteutilgjengelig |
| **405** | 24 | Method not allowed |
| **401** | 1 | Uautorisert |
| **Total feil** | **1 280** | — |

> 🚨 **ALARM:** 1 280 feil-hendelser siste 24t. 721 x HTTP 500 fra Binance (403 Forbidden) + 486 x timeout. Binance blokkerer fortsatt Cloudflare Workers-IP-er. Timeout-ene er konsistente (~25 sek) og tyder på at cron-kall henger.

### Siste cron-feil (utdrag)

```
06:28 — 500: "Binance leaderboard API error: 403"
06:28 — Timeout: "Timeout of 25000 ms reached. Total time: 25006 ms"
06:27 — Timeout: "Timeout of 25000 ms reached. Total time: 25004 ms"
06:26 — 500: "Binance leaderboard API error: 403"
06:26 — Timeout: "Timeout of 25000 ms reached. Total time: 25007 ms"
```

---

## 4. PAPER ACCOUNT-HELSE

| Metrikk | Verdi |
|---------|-------|
| Antall kontoer | 36 |
| Gj.sn. balanse | 53 726 NOK (start: 100 000) |
| Laveste balanse | 9 578 NOK |
| Høyeste balanse | 99 101 NOK |
| Negative balanser | 0 |

Gjennomsnittlig drawdown er ~46 % fra startkapital. Enkelte kontoer har tapt halvparten av lekepengene (f.eks. ETHUSDT-posisjoner med −48 % capital_change_pct ifølge `jokertrade_monitor`).

---

## 5. ÆRLIG VURDERING: Er vi klare til live fredag 2026-08-07?

### 🔴 NEI — tre røde flagg blokkerer live

| # | Problem | Konsekvens | Hva som må skje |
|---|---------|------------|-----------------|
| 1 | **smart_trader_enabled = false for alle** | JokerTrade tar ingen autonome handler. Plattformen er i praksis inaktiv for brukerne. | Re-aktiver globalt eller per bruker. Sjekk om kill switch / guard-logikk har slått inn. |
| 2 | **96 % åpne posisjoner** | Exit-logikken (TP/SL) fungerer ikke. Handler går inn men aldri ut. Brukerne sitter med frysende posisjoner. | Verifiser at `smart-trader-v3` faktisk evaluerer exits med korrekt NOK/USDT-konvertering. Test med én sesjon. |
| 3 | **1 280 cron-feil / 24t** | Systemet er ustabilt. Binance 403 + timeouts indikerer at markedsdata og synkronisering feiler konstant. | Diagnostiser om feilene påvirker trading (ikke bare leaderboard/binance-sync). Vurder om proxy/fallback er robust nok. |

### 🟡 Gule flagg (obs, ikke blokkerende)

- **PnL-data er positiv for lukkede handler** (+12K, 52,6 % win rate), men basert på kun 270 trades over 4 dager — for tynt grunnlag til å konkludere.
- **359 nye sesjoner fra 36 brukere** = ~10 sesjoner per bruker. Kan være OK for beta, men bølge-garden bør verifisere at dette ikke er en loop-bug.
- **Nesten all PnL kommer fra BTC/ETH**. Andre symboler er flat — porteføljespredningen er ikke verifisert.

### Konklusjon

**Datagrunnlaget er IKKE godt nok til en live-beslutning fredag 2026-08-07.**

- Den positive realized PnL-en er et godt tegn på at strategien *kan* fungere, men den representerer kun 4 % av alle trades (de resterende 96 % er åpne og uten exit).
- smart_trainer-mekanismen er globalt deaktivert — uten denne kjører ikke JokerTrade i det hele tatt.
- Cron-infrastrukturen er under konstant feiltrykk.

**Anbefaling:** Utsett live til følgende er på plass:
1. smart_trader re-aktivert og verifisert med minst én bruker-sesjon som tar både entry OG exit i løpet av 1 time.
2. Exit-rate over 24t > 20 % (ikke 4 %).
3. cron_health_events < 50 feil / 24t.
4. Binance 403 løst eller isolert til ikke-kritiske endepunkter.

---

*Rapport generert av Hermes (Kimi) — 2026-08-03 08:17 CEST*
