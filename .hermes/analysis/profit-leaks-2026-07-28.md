# Profit Leaks Analysis — 2026-07-28

## Datagrunnlag
- **Kilde:** Supabase `trades` tabell (produksjon)
- **Sampling:** 506 trades totalt, 129 med `realized_pnl`
- **Periode:** Hele historikken
- **Scope:** Kun paper-trading

---

## 💀 Funn 1: 99.9% av tap kommer fra SELL-siden

| Side | Tapende Trades | Totalt Tap | Andel |
|------|---------------|-----------|-------|
| **Sell** | 41 | **-$970,103** | **99.9%** |
| Buy | 10 | -$899 | 0.1% |

**Implikasjon:** Signal-guarden må strammes vesentlig på sell-siden. Dagens guard
blokkerer kun confidence=0 sells — men de store tapene har confidence=100.

---

## 💀 Funn 2: 3 par står for 99% av tapene

| Pair | Tapende Trades | Totalt Tap | % av Totaltap | Win Rate | Risk/Reward |
|------|---------------|-----------|--------------|----------|------------|
| **BTCUSDT** | 22 | **-$620,810** | 64% | 64.7% | **0.89** 🚩 |
| **ETHUSDT** | 13 | **-$340,435** | 35% | 40.9% | **0.54** 🔴 |
| SOLUSDT | 12 | -$9,511 | 1% | 51.5% | **0.49** 🔴 |
| DOTUSDT | 2 | -$149 | <0.1% | 33.3% | 0.42 |
| BNBUSDT | 1 | -$84 | <0.1% | 0% | 0.00 |

**Implikasjon:** ETHUSDT og SOLUSDT har katastrofal RR (<0.55). De vinner sjelden,
og når de taper, taper de dobbelt så mye som de vinner. Trenger per-symbol TP/SL.

---

## 💀 Funn 3: Losing streaks uten circuit breaker

| Pair | Maks Losing Streak | Totaltap i Streak |
|------|-------------------|------------------|
| **BTCUSDT** | **6 consecutive** | **-$574,706** |
| ETHUSDT | 5 consecutive | -$452 |
| SOLUSDT | 3+3 consecutive | -$1,200 |

**Implikasjon:** Ingen circuit breaker for losing streaks. 6 strake BTCUSDT-tap
kostet $574k. Bør ha progredierende posisjonsreduksjon etter N consecutive losses.

---

## 💀 Funn 4: Konfidens-algoritmen har blindsoner

| Konfidens Bucket | Trades | Win Rate | Kommentar |
|-----------------|-------|---------|-----------|
| confidence=0 | 29 | **93.1%** ✅ | Stort sett stop-loss closes (tillatt) |
| 0.4-0.6 | 4 | 0% | Få trades, alle tapende |
| 0.6-0.8 | 3 | 33% | Få trades |
| **conf=100** | 5 duper | **0%** | 5 identiske sells, -$510k |

**Implikasjon:** Guard blokkerer confidence=0 (fungerer), men de STORE tapene
kommer fra confidence=100 trades som er dupliserte/oversized.

---

## 💀 Funn 5: BTCUSDT har problematisk RR (0.89)

BTCUSDT har 64.7% win rate (bra!) men RR=0.89 — når de taper, taper de *mer*
enn de vinner. Dette er et TP/SL-problem.

| Mål | Nåværende | Optimal |
|-----|----------|---------|
| BTCUSDT RR | 0.89 | **>1.5** |
| ETHUSDT RR | 0.54 | **>1.5** |
| SOLUSDT RR | 0.49 | **>2.0** |
| Sell-side avg loss | -$23,661 | Burde være < $10k |
| Buy-side avg win | $23,294 | OK |

---

## 🎯 Anbefalte Tiltak

### 1. Signal Guard — forbedringer
- **Sell-side size clamp**: Maks 50% av posisjon per sell-signal (unntatt stop-loss)
- **Loss streak circuit breaker**: Etter 3 consecutive losses → halver posisjonsstørrelse
- **Dupliseringsdeteksjon**: Blokker sells med identisk qty×price innen 60 sekunder
- **Minimum sell interval**: Utvid fra 15 min til 30 min for ETHUSDT/SOLUSDT

### 2. Per-Symbol TP/SL
- **ETHUSDT**: SL=3%, TP=6% (RR=2.0). Maks posisjon: 3% av kapital.
- **SOLUSDT**: SL=2%, TP=5% (RR=2.5). Maks posisjon: 2% av kapital.
- **BTCUSDT**: SL=5%, TP=10% (RR=2.0). Maks posisjon: 10% av kapital.
- **DOTUSDT/BNBUSDT**: Maks posisjon: 1% av kapital.

### 3. Prediktiv sesjonshelse
- `predictSessionHealth()` basert på: loss streak, kapitaltrend, trade frekvens, nylig PnL

### 4. Sell-side Guard
- Sell-signaler må ha exitReason satt (dagens 45/51 losing trades har reason_code=None)
- Sell uten exitReason → blokker eller default til 'unknown'

---

## Vedlegg: Rådata

```sql
-- Totaltap per par
SELECT trading_pair, COUNT(*) as losses, SUM(realized_pnl) as total_loss
FROM trades
WHERE realized_pnl < 0
GROUP BY trading_pair
ORDER BY total_loss;

-- Win rate og RR per pair
SELECT trading_pair,
  COUNT(*) as trades,
  SUM(CASE WHEN realized_pnl > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as win_rate,
  AVG(CASE WHEN realized_pnl > 0 THEN realized_pnl END) as avg_win,
  AVG(CASE WHEN realized_pnl < 0 THEN realized_pnl END) as avg_loss
FROM trades WHERE realized_pnl IS NOT NULL
GROUP BY trading_pair;
```
