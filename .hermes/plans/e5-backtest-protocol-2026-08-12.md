# E5 Backtest-protokoll — 2026-08-12

> **Status:** FORHÅNDSREGISTRERT. Låst før kjøring.
> **Regel:** Ingen endring av parametre eller testvindu etter at protokollen er skrevet.

---

## 1. Datasett

| Felt               | Verdi                                                   |
| ------------------ | ------------------------------------------------------- |
| Symboler           | SOLUSDT, BTCUSDT, ETHUSDT                               |
| Kilde              | `price_candles` (Supabase, produksjon)                  |
| Start              | 2025-08-04                                              |
| Slutt              | 2026-08-11                                              |
| Kalenderdager      | ~372                                                    |
| Candles per symbol | 8914 (1H)                                               |
| Hente-metode       | `hentCandles()` — identisk med `build-sol-backtest.mts` |

## 2. Kostnader

| Parameter         | Verdi        | Merknad                      |
| ----------------- | ------------ | ---------------------------- |
| Gebyr             | 0.1% (0.001) | Standard taker-fee           |
| Slippage          | 0.05%        | Samme som 4-year/5-year JSON |
| Minste ordreverdi | $1.50 (OKX)  | Exchange-aware minimum       |

**Disse låses for hele testen. Ingen etterjustering.**

## 3. Varianter (maks 3, forhåndsdefinert)

| ID     | Navn           | Config-overstyringer                                                                  |
| ------ | -------------- | ------------------------------------------------------------------------------------- |
| **V0** | Baseline       | `regime_filter_enabled: false` — ren simple_grid                                      |
| **V1** | E5 basis       | `regime_filter_enabled: true, adx_range_max: 20, adx_trend_min: 25, bbw_min_pct: 2.0` |
| **V2** | E5 konservativ | `regime_filter_enabled: true, adx_range_max: 18, adx_trend_min: 22, bbw_min_pct: 3.0` |

**Merk:** V2 er strammere — krever lavere ADX og høyere volatilitet for RANGE. Dette bør gi færre kjøpssignaler, men potensielt bedre kvalitet per kjøp.

## 4. Evalueringsmetode

- **Walk-forward split:** 60% train / 40% OOS (samme som tidligere runder)
- **Samme split** på alle tre symboler (samme split-indeks)
- **DSR/PSR:** korrigert med `nTrials=3` (3 varianter testet)
- Rapporter PER SYMBOL og aggregert (gjennomsnitt)

## 5. Metrikker per variant

| Metrikk          | Beskrivelse                    |
| ---------------- | ------------------------------ |
| `returnPct`      | Total strategi-avkastning i %  |
| `buyHoldReturn`  | Buy-and-hold i samme periode   |
| `alpha`          | `returnPct - buyHoldReturn`    |
| `pfTrain`        | Profit Factor på train (60%)   |
| `pfOos`          | Profit Factor på OOS (40%)     |
| `dsr`            | DSR korrigert (nTrials=3)      |
| `maxDD`          | Maks drawdown i %              |
| `trades`         | Antall lukkede handler         |
| `regimeRangePct` | Andel tid i RANGE              |
| `regimeTrendPct` | Andel tid i TREND              |
| `regimeMidPct`   | Andel tid i MELLOMREGIME       |
| `blockedBuys`    | Antall blokkerte kjøpssignaler |
| `blockedDca`     | Antall blokkerte DCA-signaler  |

## 6. Gater (identiske for alle tidligere runder)

| Gate                      | Krav   |
| ------------------------- | ------ |
| PF train                  | ≥ 1.3  |
| PF OOS                    | ≥ 1.1  |
| DSR korrigert (nTrials=3) | ≥ 0.95 |
| Maks Drawdown             | ≤ 15%  |
| Lukkede handler           | ≥ 100  |

**Ingen variant aktiveres uten at ALLE gater består + 48t paper A/B.**

## 7. Output

- **JSON:** `backtest-results-e5-regimefilter-2026-08-12.json`
- **Rapport:** `.hermes/reports/e5-regimefilter-resultat-2026-08-12.md`
- **Commit:** Begge committet til repoet

## 8. Hypotese (forhåndsregistrert)

> E5 vil redusere antall handler og drawdown i TREND-regimer, men vil IKKE endre den grunnleggende utfordringen: spot-only 1× grid+DCA kan ikke levere PF > 1.3 i et sideveis/nedadgående marked. Alpha over hold bør forbli positiv.

---

## Forfatter

Hermes (DeepSeek V4 Pro) · Klarpakke · 2026-08-12 · FØR backtest-kjøring
