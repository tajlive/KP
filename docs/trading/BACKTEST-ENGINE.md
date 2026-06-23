# Backtest Engine

Én sannhetskilde (single source of truth) for avkastningsberegning på tvers av Klarpakke.

## Oversikt

Backtest Engine er en felles modul som brukes av:
- **Landing page** (`ROISimulator.tsx`) — ROI-kalkulator for markedsføring
- **Dashboard** — Backtest-visning i appen
- **Paper trading** — Simulering med realistiske fills
- **Live trading** — Performance-estimater

Motoren henter ekte historiske data fra Binance og simulerer trading med SMA-crossover strategier, inkludert realistiske fees og slippage.

## Input/Output-kontrakt

### Hovedfunksjon: `calculateBacktest()`

```typescript
interface BacktestInput {
  initialCapitalNOK: number;  // Startkapital i NOK (f.eks. 100000)
  strategyId: StrategyId;      // 'eth-dca' | 'btc-sma-20-50' | 'btc-sma-10-30'
  months: number;              // Periode i måneder (f.eks. 12)
  usdNokRate?: number;         // Valgfri, default fra getUsdtToNokRate()
}

interface BacktestResult {
  trades: BacktestTrade[];
  equityCurve: Array<{ timestamp: number; equity: number }>;
  metrics: BacktestMetrics;
  scenarios: BacktestScenarios;
  buyHoldReturn: number;
  alpha: number;
  startValueNOK: number;
  endValueNOK: number;
  usdNokRate: number;
}
```

### Convenience: `calculateBacktestWithProfile()`

Brukes fra landingssiden der brukeren velger risikoprofil:

```typescript
// Landingssiden kaller:
const result = await calculateBacktestWithProfile('balansert', 100000, 12);

// Dette mapper til:
// strategyId: 'btc-sma-20-50'
// symbol: 'BTCUSDT'
// smaFast: 20, smaSlow: 50
```

## Strategier

| Profil | Strategi-ID | Asset | SMA | Posisjon | Fee |
|--------|-------------|-------|-----|----------|-----|
| **Konservativ** | `eth-dca` | ETHUSDT | 30/100 | 50% | 0.1% |
| **Balansert** | `btc-sma-20-50` | BTCUSDT | 20/50 | 75% | 0.1% |
| **Aggressiv** | `btc-sma-10-30` | BTCUSDT | 10/30 | 100% | 0.1% |

### Strategi-beskrivelser

**ETH DCA (Konservativ)**
- Asset: Ethereum (ETHUSDT)
- Metode: Dollar-cost averaging med SMA 30/100
- Egenskaper: Lavere volatilitet, færre trades, mindre drawdown

**BTC SMA 20/50 (Balansert)**
- Asset: Bitcoin (BTCUSDT)
- Metode: SMA crossover 20/50
- Egenskaper: Middels volatilitet, moderat trade-frekvens

**BTC SMA 10/30 (Aggressiv)**
- Asset: Bitcoin (BTCUSDT)
- Metode: SMA crossover 10/30
- Egenskater: Høyere volatilitet, flere trades, høyere potensiell avkastning

## Eksempelkall

### Basis bruk

```typescript
import { calculateBacktest, formatBacktestResult } from '@/lib/trading/backtestEngine';

const result = await calculateBacktest({
  initialCapitalNOK: 100000,
  strategyId: 'btc-sma-20-50',
  months: 12,
});

console.log(result.metrics.totalReturnPct);  // +45.2
console.log(result.scenarios.expected);       // 45.2
console.log(result.metrics.maxDrawdownPct);   // -12.5
```

### Med formatering for UI

```typescript
const formatted = formatBacktestResult(result);

// Scenarier
formatted.scenarios.optimistic    // "kr 178 500"
formatted.scenarios.expected      // "kr 145 200"
formatted.scenarios.pessimistic   // "kr 112 800"

// Metrics
formatted.metrics.totalReturn     // "+45.2%"
formatted.metrics.maxDrawdown     // "-12.5%"
formatted.metrics.winRate         // "62%"
```

### Fra landingssiden

```typescript
import { calculateBacktestWithProfile } from '@/lib/trading/backtestEngine';

// Bruker velger "Balansert"
const result = await calculateBacktestWithProfile('balansert', 100000, 12);
```

## Disclaimer-tekst

Standard disclaimer som skal vises sammen med alle backtest-resultater:

> **Beregnet med historisk backtest.** Tidligere avkastning er ingen garanti for fremtidig avkastning. Strategien har utført {totalTrades} trades over {dataPoints} dager med 0.1% trading fees. Start med paper trading.

## Tekniske detaljer

### Datakilde
- **Binance API**: `https://api.binance.com/api/v3/klines`
- **Intervall**: 1d (daglige candlesticks)
- **Maks periode**: 3 år (1095 dager)
- **Timeout**: 15 sekunder

### Beregninger

**SMA (Simple Moving Average)**
```
SMA = Sum(priser over N perioder) / N
```

**Total avkastning**
```
Return% = ((EndEquity - StartEquity) / StartEquity) * 100
```

**Sharpe Ratio**
```
Sharpe = (AvgDailyReturn - RiskFreeRate) / StdDev * sqrt(365)
```

**Scenarier**
```
Optimistisk = TotalReturn + (Volatility * 0.5 * 100)
Expected    = TotalReturn
Pessimistisk = TotalReturn - (Volatility * 0.5 * 100)
```

### Antagelser

1. **Trading fees**: 0.1% per trade (Binance taker fee)
2. **Slippage**: Modellert eksplisitt via kanonisk `computeFill`
3. **Execution**: Market fills med lot-size-avrunding
4. **Valuta**: USD/NOK hentes dynamisk via `getUsdtToNokRate` — ingen hardkodet kurs
5. **Risk-free rate**: 3% annualisert

## Kanoniske komponenter

Backtest-motoren deler implementasjon med live- og paper-trading for å sikre at simulerte resultater samsvarer med faktisk oppførsel:

- **Fill-modell**: `computeFill` fra `src/lib/trading/canonical/execution/fill-model` håndterer fees, slippage og lot-size-avrunding.
- **Posisjons-ledger**: FIFO-ledger (`src/lib/trading/position-ledger`) brukes for kostnadsbasis og realisert P&L.
- **P&L-sanity-check**: `calculatePnlFromTrades` validerer at motorens P&L stemmer med kanonisk beregning.
- **Risikogrenser**: `resolveRiskLimits` fra `src/lib/trading/canonical/risk/limits-resolver` håndhever maksimal posisjons- og eksponeringsgrense før hver kjøpsordre.
- **Markedsdata**: Historiske data hentes via kanonisk `createBinanceMarketDataProvider`.
- **Valutakurs**: `getUsdtToNokRate` og `getUsdtToNokRateAsync` gir USD/NOK uten hardkodede verdier.

## Caching

Backtest Engine implementerer to-nivå caching for optimal ytelse:

### Cache-arkitektur

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Klient        │────▶│   Minne-cache   │────▶│   Database      │
│   (ROISimulator)│     │   (1 time TTL)  │     │   (24t TTL)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                               │
         └───────────────────────────────────────────────┘
                            Fallback ved miss
```

### Cache-strategi

- **Minne-cache**: 1 time TTL per strategi+periode kombinasjon
- **Database-cache**: 24 timer TTL, delt på tvers av brukere
- **Cache-nøkkel**: `{symbol}:{strategyId}:{months}`

### Bruk med caching

```typescript
import { calculateBacktestWithCache } from '@/lib/trading/backtestEngine';

// Automatisk caching - sjekker minne → database → kjører backtest
const result = await calculateBacktestWithCache({
  initialCapitalNOK: 100000,
  strategyId: 'btc-sma-20-50',
  months: 12,
});

console.log(result.fromCache); // true hvis cache hit

// Tving full backtest (f.eks. for testing)
const fresh = await calculateBacktestWithCache(input, { skipCache: true });
```

### Cache-tabell

| Felt | Beskrivelse |
|------|-------------|
| `symbol` | Handelspar (f.eks. BTCUSDT) |
| `strategy_id` | Strategi-identifikator |
| `period_months` | Tidsperiode |
| `result_data` | Komplett BacktestResult JSON |
| `metrics_summary` | Hurtig-tilgang til nøkkeltall |
| `expires_at` | Cache invalidation timestamp |

### Pre-caching

Standard-kombinasjoner (9 totalt) kan pre-caches:
- 3 strategier × 3 perioder (12, 24, 36 måneder)

### Deploy / cache invalidation

Etter deploy av endringer i backtest-motoren (fill-modell, fees, slippage, risikogrenser, strategier, etc.) må eksisterende cachede resultater invalides. Kjør følgende mot databasen:

```sql
TRUNCATE backtest_cache;
```

> **Merk:** Uten dette kan brukere få utdaterte eller inkonsistente backtest-resultater fra `backtest_cache` inntil TTL-en (24t) utløper.

## Telemetri

Backtest Engine logger anonymisert bruk for analyse og konverteringssporing.

### Hva logges

```typescript
interface BacktestTelemetry {
  sessionId: string;           // Anonym session ID (24t cookie)
  strategyId: string;          // Valgt strategi
  periodMonths: number;        // Tidsperiode
  initialCapitalNOK: number;   // Startkapital
  metrics: {
    cagr: number;              // CAGR fra backtest
    maxDrawdown: number;       // Max drawdown
    winRate: number;           // Win rate %
    totalTrades: number;       // Antall trades
    volatility: number;        // Volatilitet
  };
  cacheHit: boolean;           // Om resultatet kom fra cache
}
```

### Konverteringssporing

Spor hvor mange som går fra kalkulator til paper trading:

```typescript
import { markBacktestConverted } from '@/lib/trading/backtestEngine';

// Ved klikk på "Start paper trading"
await markBacktestConverted();
```

### Telemetri-tabell

| Felt | Beskrivelse |
|------|-------------|
| `session_id` | Anonym session identifier |
| `strategy_id` | Valgt strategi |
| `converted_to_paper` | Om bruker konverterte |
| `converted_at` | Tidspunkt for konvertering |
| `cache_hit` | Om cache ble brukt |

## Testing

```bash
# Kjør enhetstester
npm run test:unit -- src/lib/trading/__tests__/backtestEngine.test.ts

# Kjør cross-engine parity-tester
npm run test:unit -- src/lib/trading/__tests__/backtest-parity.test.ts

# Kjør e2e-tester
npm run test:e2e -- e2e/landing/backtest-match.spec.ts
```

## Versjonshistorie

| Versjon | Dato | Endringer |
|---------|------|-----------|
| 1.1.0 | 2026-04-04 | P1: Caching + Telemetri implementert |
| 1.0.0 | 2026-04-04 | Initial release, én sannhetskilde |

---

**Ansvarlig**: Backend & Trading Team  
**Sist oppdatert**: 2026-06-23
