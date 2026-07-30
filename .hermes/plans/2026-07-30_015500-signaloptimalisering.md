# Signaloptimalisering — Implementasjonsplan

> **For Hermes:** Bruk subagent-driven-development for å implementere steg-for-steg.

**Goal:** Forbedre JokerTrade-signaler fra dagens enkle RSI+trend til en moderne kombinasjon av RSI, MACD, SMA-crossover og Bollinger Bands — med dynamisk posisjonsstørrelse og volatilitetsjustert SL/TP. Alt gjenbruker eksisterende `indicators.ts` og `signal-generator.ts`.

**Architecture:** JokerTrade (`route.ts`) har i dag sin egen `calculateRSI` og `generateSignal` — duplikat av det som finnes i `src/lib/trading/`. Planen flytter JokerTrade til å bruke de kanoniske indikatorene, utvider signal-generatoren med en ny strategi (`joker_aktiv`), og legger til ATR-basert SL/TP og bredere symbol-miks.

**Prinsipp:** Gjenbruk først, utvid deretter. Ikke bygg nytt når `indicators.ts` og `signal-generator.ts` allerede har 80% av koden.

**Tech Stack:** TypeScript, Next.js 16 API routes, Supabase, Vitest

---

## 🗺️ Forståelse av eksisterende infrastruktur (les før implementering)

### `src/lib/trading/indicators.ts` (88 linjer)
- `calculateRSI(prices, period=14)` → `(number|null)[]` — full RSI-array
- `calculateMACD(prices)` → `{macd[], signal[], histogram[]}`
- `calculateSMA(prices, period)` → `(number|null)[]`
- `calculateEMA(prices, period)` → `number[]`
- `calculateBollingerBands(prices, period=20, mult=2)` → `[{middle, upper, lower}]`

### `src/lib/trading/signal-generator.ts` (183 linjer)
- Strategier: `trend_balansert` (SMA10/SMA30 crossover), `multisignal_aktiv` (RSI+MACD combo), `grid_bot`, `ai_copy` (Bollinger Bands)
- Output: `{action: "BUY"|"SELL"|"HOLD", reason: string, confidence?: number}` — confidence er 0.0–1.0
- JokerTrade trenger en **ny strategi** `joker_aktiv` som kombinerer alle indikatorene med confidence-tall

### `src/lib/trading/confluent-signal-engine.ts` (677 linjer)
- Kombinerer tekniske signaler + AI narrative + markedsregime
- Inneholder risiko-analyse, volatilitetsberegning og dynamisk vekting
- **For avansert for fase 1** — tas i bruk i fase 2

### JokerTrade `route.ts` (490 linjer)
- Linje 39-52: egen `calculateRSI` (skal fjernes)
- Linje 126-155: egen `generateSignal` (skal fjernes/forenkles)
- Trenger `fetchMarketData` for å returnere flere indikatorer (MACD, Bollinger)

---

## 📋 Oppgaver

### Task 1: Fjern duplisert kode — bruk kanoniske indikatorer

**Objective:** JokerTrade bruker `indicators.ts` istedenfor sin egen `calculateRSI`. Én kilde til sannhet.

**Files:**
- Modify: `src/app/api/jokertrade/route.ts` — fjern linje 39-52 (egen calculateRSI)
- Modify: `src/app/api/jokertrade/__tests__/route.test.ts` — fjern linje 1-26 (duplisert RSI-test)
- No change: `src/lib/trading/indicators.ts` — er allerede korrekt

**Step 1: Importer kanonisk RSI i route.ts**

```typescript
// Topp av filen — legg til import
import { calculateRSI as calculateCanonicalRSI } from "@/lib/trading/indicators";
```

**Step 2: Bytt ut `calculateRSI`-bruk i `fetchMarketData`**

I `fetchMarketData` (linje 83):
```typescript
// FØR:
const rsi = prices.length > 14 ? calculateRSI(prices, 14) : 50;

// ETTER:
const rsiArr = prices.length > 14 ? calculateCanonicalRSI(prices, 14) : null;
const rsi = rsiArr ? (rsiArr[rsiArr.length - 1] ?? 50) : 50;
```

**Step 3: Slett duplisert `calculateRSI`-funksjon**

Slett linje 39-52 fra route.ts (hele `calculateRSI`-funksjonen).

**Step 4: Slett duplisert RSI-test**

Slett linje 1-26 fra `route.test.ts` — bruk isteden `from("@/lib/trading/indicators")` i testen.

**Step 5: Verifiser**

```bash
npx tsc --noEmit --pretty false 2>&1 | grep -c error   # forventet: 0
npx vitest run src/app/api/jokertrade --reporter=verbose  # forventet: ingen færre tester
```

**Step 6: Commit**

```bash
git add src/app/api/jokertrade/route.ts src/app/api/jokertrade/__tests__/route.test.ts
git commit -m "refactor: JokerTrade bruker kanonisk RSI fra indicators.ts (Task 1)"
```

---

### Task 2: Utvid `fetchMarketData` med MACD, Bollinger Bands og SMA

**Objective:** `fetchMarketData` returnerer alle indikatorer på én gang — ikke bare RSI.

**Files:**
- Modify: `src/app/api/jokertrade/route.ts` — utvid returtype og beregning i `fetchMarketData`
- Test: oppdater eksisterende tester

**Step 1: Utvid returtypen**

```typescript
async function fetchMarketData(symbol: string): Promise<{
  currentPrice: number;
  rsi: number;
  macd: { histogram: number; signal: number; macd: number };
  bollinger: { upper: number; middle: number; lower: number };
  sma10: number;
  sma30: number;
  volatility: number;
  trend: "up" | "down" | "flat";
}> {
```

**Step 2: Legg til beregninger i funksjonen**

Etter dagens RSI-beregning:
```typescript
const rsiArr = prices.length > 14 ? calculateCanonicalRSI(prices, 14) : null;
const rsi = rsiArr ? (rsiArr[rsiArr.length - 1] ?? 50) : 50;

// MACD
const macdData = prices.length > 26 ? calculateMACD(prices) : null;
const macd = macdData ? {
  histogram: macdData.histogram[macdData.histogram.length - 1],
  signal: macdData.signal[macdData.signal.length - 1],
  macd: macdData.macd[macdData.macd.length - 1],
} : { histogram: 0, signal: 0, macd: 0 };

// Bollinger Bands
const bb = prices.length > 20 ? calculateBollingerBands(prices) : null;
const lastBB = bb ? bb[bb.length - 1] : null;
const bollinger = lastBB ? {
  upper: lastBB.upper ?? price * 1.05,
  middle: lastBB.middle ?? price,
  lower: lastBB.lower ?? price * 0.95,
} : { upper: price * 1.05, middle: price, lower: price * 0.95 };

// SMA crossover
const sma10Arr = prices.length > 10 ? calculateSMA(prices, 10) : null;
const sma30Arr = prices.length > 30 ? calculateSMA(prices, 30) : null;
const sma10 = sma10Arr ? (sma10Arr[sma10Arr.length - 1] ?? price) : price;
const sma30 = sma30Arr ? (sma30Arr[sma30Arr.length - 1] ?? price) : price;
```

Endre return til å inkludere alle nye felt.

**Step 3: Oppdater fallback-retur**

```typescript
return {
  currentPrice: 0, rsi: 50, volatility: 50, trend: "flat" as const,
  macd: { histogram: 0, signal: 0, macd: 0 },
  bollinger: { upper: 0, middle: 0, lower: 0 },
  sma10: 0, sma30: 0,
};
```

**Step 4: Verifiser**

```bash
npx tsc --noEmit --pretty false 2>&1 | grep -c error   # forventet: 0
npx vitest run src/app/api/jokertrade  # forventet: 29/29
```

**Step 5: Commit**

```bash
git add src/app/api/jokertrade/route.ts
git commit -m "feat: fetchMarketData returnerer MACD, Bollinger, SMA10/SMA30 (Task 2)"
```

---

### Task 3: Ny `joker_aktiv` strategi i signal-generator

**Objective:** Legg til en moderne `joker_aktiv`-strategi i `signal-generator.ts` som kombinerer RSI, MACD, SMA-crossover og Bollinger Bands — med confidence 0-100.

**Files:**
- Modify: `src/lib/trading/signal-generator.ts` — ny strategi `joker_aktiv`
- Test: `src/app/api/jokertrade/__tests__/signal.test.ts` — ny testfil for signalene

**Step 1: Skriv testene (TDD — de skal feile først)**

```typescript
// src/app/api/jokertrade/__tests__/signal.test.ts
import { describe, it, expect } from "vitest";
import { generateJokerSignal } from "../signal";

describe("joker_aktiv signal", () => {
  const makeMarket = (overrides: Record<string, unknown> = {}) => ({
    currentPrice: 50000,
    rsi: 50,
    volatility: 50,
    trend: "flat" as const,
    macd: { histogram: 0, signal: 0, macd: 0 },
    bollinger: { upper: 55000, middle: 50000, lower: 45000 },
    sma10: 50500,
    sma30: 49500,
    ...overrides,
  });

  it("RSI < 30 + MACD snur positiv → BUY med høy confidence", () => {
    const signal = generateJokerSignal(makeMarket({
      rsi: 25, macd: { histogram: -5, signal: -8, macd: -6 },
      // Neste kall (simulert): histogram > 0
    }));
    expect(signal.action).toBe("BUY");
    expect(signal.confidence).toBeGreaterThanOrEqual(70);
  });

  it("pris under Bollinger lower + RSI < 30 → BUY", () => {
    const signal = generateJokerSignal(makeMarket({
      currentPrice: 44000, rsi: 28,
      bollinger: { upper: 55000, middle: 50000, lower: 45000 },
    }));
    expect(signal.action).toBe("BUY");
    expect(signal.reason).toContain("Bollinger");
  });

  it("RSI > 70 + MACD snur negativ → SELL med høy confidence", () => {
    const signal = generateJokerSignal(makeMarket({
      rsi: 75, macd: { histogram: 5, signal: 3, macd: 4 },
    }));
    expect(signal.action).toBe("SELL");
    expect(signal.confidence).toBeGreaterThanOrEqual(70);
  });

  it("SMA10 > SMA30 (bullish crossover) → BUY signal", () => {
    const signal = generateJokerSignal(makeMarket({
      sma10: 52000, sma30: 48000, trend: "up",
    }));
    expect(signal.action).toBe("BUY");
  });

  it("nøytral RSI, flat trend, innenfor Bollinger → WAIT", () => {
    const signal = generateJokerSignal(makeMarket());
    expect(signal.action).toBe("WAIT");
  });
});
```

**Step 2: Importer i route.ts og erstatt gammel generateSignal**

```typescript
// route.ts — erstatt import
import { generateJokerSignal } from "./signal";

// Erstatt hele generateSignal-kallet i POST-handleren
const signal = generateJokerSignal(market);
```

**Step 6: Verifiser**

```bash
npx vitest run src/app/api/jokertrade  # forventet: alle grønne
npx tsc --noEmit  # forventet: 0 errors
```

**Step 7: Commit**

```bash
git add src/lib/trading/signal-generator.ts src/app/api/jokertrade/signal.ts src/app/api/jokertrade/__tests__/signal.test.ts
git commit -m "feat: joker_aktiv strategi — RSI+MACD+Bollinger+SMA combo (Task 3)"
```

---

### Task 4: Dynamisk SL/TP basert på volatilitet

**Objective:** Istedenfor hardkodete TAKE_PROFIT_PCT=3 og STOP_LOSS_PCT=5, beregn SL/TP dynamisk basert på ATR (Average True Range) eller volatilitet.

**Files:**
- Modify: `src/app/api/jokertrade/route.ts` — ny funksjon `dynamicExits`
- Modify: `checkExits` — bruk dynamiske verdier
- Test: oppdater testene

**Step 1: Skriv `dynamicExits`-funksjon**

```typescript
/** Beregn SL/TP dynamisk basert på volatilitet og RSI */
function dynamicExits(
  volatility: number,
  rsi: number,
  confidence: number,
): { takeProfitPct: number; stopLossPct: number } {
  // Høyere volatilitet = videre stops
  const volTP = Math.max(2, Math.min(8, 3 + (volatility / 100) * 3));
  const volSL = Math.max(3, Math.min(10, 5 + (volatility / 100) * 4));
  
  // Høyere confidence = smalere SL (stoler på signalet)
  const confidenceFactor = 1 - ((confidence - 50) / 100) * 0.3; // 0.85-1.15
  const slAdjust = Math.max(0.5, Math.min(1.5, confidenceFactor));
  
  return {
    takeProfitPct: Math.round(volTP * 10) / 10,
    stopLossPct: Math.round(volSL * slAdjust * 10) / 10,
  };
}
```

**Step 2: Skriv test for dynamisk SL/TP**

```typescript
it("høy volatilitet gir bredere SL/TP", () => {
  const lowVol = dynamicExits(30, 50, 70);
  const highVol = dynamicExits(120, 50, 70);
  expect(highVol.stopLossPct).toBeGreaterThan(lowVol.stopLossPct);
  expect(highVol.takeProfitPct).toBeGreaterThan(lowVol.takeProfitPct);
});

it("høy confidence gir smalere stop-loss", () => {
  const lowConf = dynamicExits(50, 50, 55);
  const highConf = dynamicExits(50, 50, 95);
  expect(highConf.stopLossPct).toBeLessThanOrEqual(lowConf.stopLossPct);
});
```

**Step 3: Bruk i `checkExits` og POST**

Erstatt `TAKE_PROFIT_PCT` og `STOP_LOSS_PCT` (konstanter) med dynamiske verdier:

```typescript
// I POST-handleren, før trade:
const { takeProfitPct, stopLossPct } = dynamicExits(market.volatility, market.rsi, signal.confidence);

// I checkExits — send inn som parameter
const exits = await checkExits(db, userId, session.id, priceMap, takeProfitPct, stopLossPct);
```

**Step 4: Verifiser**

```bash
npx vitest run src/app/api/jokertrade  # forventet: 31+ tester
npx tsc --noEmit  # forventet: 0 errors
```

**Step 5: Commit**

```bash
git add src/app/api/jokertrade/route.ts src/app/api/jokertrade/__tests__/route.test.ts
git commit -m "feat: dynamisk SL/TP basert på volatilitet + confidence (Task 4)"
```

---

### Task 5: Utvid symbol-lista + round-robin-refinements

**Objective:** Flere coins = flere handelsmuligheter. Nå: 5 (BTC, ETH, SOL, AVAX, DOGE). Utvid til 10.

**Files:**
- Modify: `src/app/api/jokertrade/route.ts` — utvid `TOP_SYMBOLS`, legg til prisfallback

**Step 1: Utvid symbol-lista**

```typescript
const TOP_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "AVAXUSDT", "DOGEUSDT",
  "LINKUSDT", "ADAUSDT", "DOTUSDT", "UNIUSDT", "MATICUSDT",
];

// 5 ferske fallback-priser (oppdatert Q3 2026)
const FALLBACK_PRICES: Record<string, number> = {
  BTCUSDT: 60000, ETHUSDT: 2500, SOLUSDT: 140, AVAXUSDT: 18, DOGEUSDT: 0.12,
  LINKUSDT: 12, ADAUSDT: 0.45, DOTUSDT: 5.5, UNIUSDT: 7.5, MATICUSDT: 0.55,
};
```

**Step 2: Verifiser at round-robin fortsatt fungerer**

```bash
# Simuler cron-kall 3x — alle symbols skal kunne velges
curl -s -X POST "https://www.klarpakke.no/api/jokertrade" -H "x-cron-secret: ..."
# Sjekk at minst 4 forskjellige symbols dukker opp over 5-6 kall
```

**Step 3: Verifiser**

```bash
npx tsc --noEmit  # 0 errors
npx vitest run src/app/api/jokertrade  # alle grønne
```

**Step 4: Commit + deploy**

```bash
git add src/app/api/jokertrade/route.ts
git commit -m "feat: 10 symbols i JokerTrade — LINK, ADA, DOT, UNI, MATIC lagt til (Task 5)"
```

---

### Task 6: Endelig QA + deploy

**Objective:** Full produksjonsverifisering før deploy.

**Step 1: Kjør alle tester**

```bash
npm run test:unit   # forventet: alle passerer
npx tsc --noEmit    # forventet: 0 errors
npm run check       # forventet: 5/5
```

**Step 2: Manuell QA mot live (curl)**

```bash
# Cron-kall (simulert)
curl -s -X POST "https://www.klarpakke.no/api/jokertrade" -H "x-cron-secret: ..."
# Forventet: handler med ny joker_aktiv-rasjonale i joker_explanation

# Dashboard
curl -s -H "Authorization: Bearer $(cat /tmp/tom_token.txt)" "https://www.klarpakke.no/api/jokertrade"
# Forventet: sessions, trades, analytics
```

**Step 3: DB-verifisering**

```sql
-- Sjekk at sessions fortsatt er aktive (ikke crash)
SELECT status, COUNT(*) FROM trading_sessions WHERE mode='paper' GROUP BY status;
-- Forventet: active >= 11, crashed = 0 (siste 15 min)
```

**Step 4: Deploy**

```bash
bash scripts/deploy.sh
```

---

## 📊 Suksesskriterier

| Metrikk | Før | Mål |
|---------|-----|-----|
| Signal-indikatorer | Kun RSI | RSI + MACD + Bollinger + SMA-crossover |
| SL/TP | 3% / 5% fast | Dynamisk (2-8% / 3-10%) basert på volatilitet |
| Symbols | 5 | 10 |
| Duplikat kode | 2 funksjoner (calculateRSI i route) | 0 — kun kanonisk indicators.ts |
| Tester | 29 | 35+ |
| Vunnet trades / tapt trades (over 7 dager) | ? | Forventet forbedring: færre falske signaler |

## ⚠️ Risiko & åpne spørsmål

1. **MACD-hysterese** — `multisignal_aktiv`-strategien krever to påfølgende histogram-verdier for å bekrefte snuing. JokerTrade kalles hvert 15. min — hvis prisen snur mellom to kall, kan signalet komme for sent. Løsning: aksepter at 15-min frekvens er en reell flaskehals for momentum-strategier.
2. **Fallback-priser** — 10 coins = 10 fallback-priser som må holdes oppdatert. Vurder å hente fra `coin_prices`-tabellen istedenfor hardkodede verdier (fremtidig forbedring).
3. **Signal-kvalitet over tid** — bordet må evalueres over minst 2 uker før vi kan konkludere om forbedringen er reell. Ingen backtest-infrastruktur per nå.
4. **Transaction cost** — 5% stop loss på 10 coins kan gi flere små tap. Dynamisk SL justerer seg, men risikoen er høyere enn før.
