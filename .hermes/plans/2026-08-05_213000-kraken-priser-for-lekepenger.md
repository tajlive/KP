# Lekepenger-priser fra Kraken for tilkoblede brukere

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Når en bruker er Kraken-tilkoblet (har rad i `user_kraken_keys`), skal lekepenger-tick-motoren bruke Kraken-priser i stedet for Binance — én priskilde, én sannhet, samme ticker for papir og live. Kun for tilkoblede brukere; alle andre fortsetter med Binance-proxy som i dag.

**Architecture:** Ny `KrakenMarketDataProvider` som implementerer samme `MarketDataProvider`-interface (getPrice/getKlines/get24hChange/getDepth) mot Krakens **offentlige** API (ingen nøkkel nødvendig — kun REST). Tick-route velger provider **per sesjon** basert på om sesjonens bruker er Kraken-tilkoblet. Prefetch-cache blir per (symbol × kilde). Symbol-mapping: interne `BTCUSDT` → `XBTUSDC` (verifisert: alle TOP_SYMBOLS unntatt POL har USDC-par; POL → `POLUSD`).

**Tech Stack:** Kraken public REST (`/0/public/OHLC`, `/0/public/Ticker`, `/0/public/Depth`), eksisterende `KrakenClient.getTicker` (public), `symbols.ts` mapping, tick-route (`src/app/api/cron/tick/route.ts`, 2518 linjer — KUN punktvis endring).

---

## Verifisert fakta (2026-08-05, live mot Kraken)

| Funn | Bevis |
|---|---|
| OHLC (klines) fungerer: 721 lys, 1t-intervall | `GET /0/public/OHLC?pair=XBTUSDC&interval=60` → 200 |
| Ticker fungerer: `c[0]` = siste pris | `GET /0/public/Ticker?pair=XBTUSDC` → 200 |
| Alle TOP_SYMBOLS unntatt POL har USDC-par | BTC/ETH/SOL/AVAX/DOGE/LINK/ADA/DOT-USDC = ✅ |
| POLUSDT finnes ikke → bruk `POLUSD` | AssetPairs-sjekk: POLUSD ✅, POLUSDC ❌ |
| Offentlige endpoints krever ingen API-nøkkel | Ingen auth-headers i kallene |
| Tick-route bruker kun klines for `currentPrice` | `route.ts:332-333` — `candles[len-1].close` |
| Eksisterende cache = 10s TTL per symbol | `binance-provider.ts:121` |

**Designvalg — per-bruker, ikke per-symbol:** Tom skal ha Kraken-priser for SINE lekepenger. Andre brukere som handler samme symbol skal IKKE påvirkes (Toms eksplisitte krav: «berører ikke eksisterende lekepenger-brukere»). Derfor velges kilde i `processSession` fra `session.user_id ∈ krakenUserIds`.

**Konsekvens for prefetch:** Ett symbol kan trenge to kilder i samme tick (Tom + vanlig bruker handler BTCUSDT). Løsning: `candleCache` blir `Map<symbol, { binance?: Candle[]; kraken?: Candle[] }>` og `processSession` leser riktig nøkkel.

---

## Task 1: KrakenMarketDataProvider — ny provider-modul

**Objective:** Full `MarketDataProvider`-implementasjon mot Kraken public API, testet med mockede fetch-kall.

**Files:**
- Create: `src/lib/trading/canonical/market-data/kraken-provider.ts`
- Read: `src/lib/trading/canonical/market-data/types.ts` (interface-kontrakt)
- Read: `src/lib/exchanges/kraken/symbols.ts` (mapping)

**Step 1: Skriv feilende test** — `src/lib/trading/canonical/market-data/__tests__/kraken-provider.test.ts`
```typescript
// getPrice: XBTUSDC ticker c[0] → 64820.61
// getKlines: OHLC-array → Kline[]{timestamp, open, high, low, close, volume}
//  (Kraken-format: [time, open, high, low, close, vwap, volume, count])
// get24hChange: fra siste 24 1h-lys (close[-1] vs close[-24]) — IKKE ticker-o (upålitelig, observert "6")
// getDepth: Depth-respons → OrderBookSnapshot
// Symbol-mapping: BTCUSDT→XBTUSDC, ETHUSDT→ETHUSDC, POLUSDT→POLUSD
// Ugyldig symbol → kast feil (fallback til Binance i tick)
```

**Step 2: Implementer** — `kraken-provider.ts`
```typescript
import type { Kline, MarketDataProvider, OrderBookSnapshot } from "./types";

// Interne symboler (BTCUSDT) → Kraken-par med USDC-kvote (USDT blokkert for NO)
const INTERNAL_TO_KRAKEN: Record<string, string> = {
  BTCUSDT: "XBTUSDC", ETHUSDT: "ETHUSDC", SOLUSDT: "SOLUSDC",
  AVAXUSDT: "AVAXUSDC", DOGEUSDT: "XDGUSDC", LINKUSDT: "LINKUSDC",
  ADAUSDT: "ADAUSDC", DOTUSDT: "DOTUSDC", POLUSDT: "POLUSD",
};

const INTERVAL_MAP: Record<string, number> = { "15m": 15, "1h": 60, "4h": 240 };
const API = "https://api.kraken.com/0/public";

export class KrakenMarketDataProvider implements MarketDataProvider {
  private cache = new Map<string, { price: number; ts: number }>();
  private static TTL = 10_000;

  private toKraken(symbol: string): string {
    const s = symbol.toUpperCase().replace("/", "");
    const mapped = INTERNAL_TO_KRAKEN[s];
    if (!mapped) throw new Error(`KRAKEN_PAIR_UNAVAILABLE: ${s}`);
    return mapped;
  }

  async getPrice(symbol: string): Promise<number> {
    // cache → Ticker → c[0]
  }

  async getKlines(symbol, interval, limit, startTime?, endTime?): Promise<Kline[]> {
    // OHLC?pair=X&interval={map}&since=... (startTime/1000)
    // result[pair] → siste `limit` lys → Kline[]
  }

  async get24hChange(symbol): Promise<number> {
    // 24 × 1h-lys: (close[-1] - close[-24]) / close[-24] * 100
  }

  async getDepth(symbol, limit=20): Promise<OrderBookSnapshot> {
    // Depth?pair=X&count=limit → bids/asks [price, qty][]
  }
}
```
Viktig: OHLC-respons er `{ [pair]: [...], last: timestamp }` — filtrer ut `last`-nøkkelen. `since`-param: `startTime/1000` (Kraken tar UNIX-sekunder, ikke ms!).

**Step 3: Kjør test**
Run: `npx vitest run src/lib/trading/canonical/market-data/__tests__/kraken-provider.test.ts`
Expected: alle nye tester PASS.

**Step 4: Eksporter fabrikk** — `src/lib/trading/canonical/market-data/index.ts`
```typescript
export { KrakenMarketDataProvider } from "./kraken-provider";
export function createKrakenMarketDataProvider(): MarketDataProvider {
  return new KrakenMarketDataProvider();
}
```

**Step 5: Commit** — `feat: KrakenMarketDataProvider (public REST, USDC-kvoter)`

---

## Task 2: Tick-route — per-bruker kildevalg

**Objective:** Tick velger priskilde per sesjon; prefetch cacher begge kilder per symbol.

**Files:**
- Modify: `src/app/api/cron/tick/route.ts` — punktvis:
  - ~linje 121: beholde `BinanceMarketDataProvider` + legge til `KrakenMarketDataProvider`
  - `fetchCandles(pair, interval, limit, source: "binance"|"kraken")` — 4. parameter
  - Prefetch-blokken (~2196): cache per (symbol, source)
  - `processSession(...)`: velg kilde fra `krakenUserIds.has(session.user_id)`

**Step 1: Test (unit) — kildevalg-logikk som ren funksjon**
Create: `src/lib/trading/__tests__/price-source.test.ts`
```typescript
export function pickPriceSource(userId: string, krakenUserIds: Set<string>): "kraken" | "binance" {
  return krakenUserIds.has(userId) ? "kraken" : "binance";
}
// + candlestick-cache-nøkkel: `${source}:${symbol}`
```

**Step 2: Implementer i route** — tre endringer:
1. Øverst i POST: hent kraken-brukere
```typescript
const { data: krakenUsers } = await supabase
  .from("user_kraken_keys")
  .select("user_id")
  .eq("is_active", true);
const krakenUserIds = new Set((krakenUsers ?? []).map((u) => u.user_id));
```
2. Prefetch: for hvert unikt symbol, hent kilden(e) som trengs
```typescript
const candleCache = new Map<string, Candle[]>(); // nøkkel `${source}:${symbol}`
// per sesjon: source = pickPriceSource(s.user_id, krakenUserIds)
// unike (source, symbol)-par → Promise.all → fetchCandles(symbol, "1h", 100, source)
// Fallback: hvis kraken-kall feiler → bruk binance-candles for den sesjonen (ikke krasj tick)
```
3. `processSession`: `const candles = candleCache.get(`${source}:${pair}`) ?? ...`

**⚠️ Fallback-regel (kritisk):** Hvis Kraken-OHLC feiler for et symbol, FALL TILBAKE til binance-cache for de sesjonene — tick skal ALDRI dø fordi én priskilde er nede. Logg `warn` med source-fallback.

**Step 3: Full test-suite**
Run: `npm run test` — 1860+ nye, alle grønne. TSC=0.

**Step 4: Commit** — `feat: tick velger priskilde per bruker (kraken for tilkoblede)`

---

## Task 3: Verifisering mot prod

**Step 1: Deploy**
Run: `git push origin main && bash scripts/deploy.sh` → bekreft `✅ Deploy ferdig! v<sha>`

**Step 2: Verifiser Tom (kraken-tilkoblet)**
- Triggr tick manuelt: `curl -X POST https://www.klarpakke.no/api/cron/tick -H "x-api-key: $CRON_SECRET"` (eller via `cron.run_job`)
- Sjekk at Toms sesjoner har fersk `last_tick_at` og ingen `BINANCE_API_UNAVAILABLE`-feil
- Sammenlign Toms siste tick-pris mot Kraken-ticker: `SELECT trading_pair, current_price ... ` og `Ticker?pair=XBTUSDC` — avvik < 0,5% (Kraken close vs live ticker)

**Step 3: Verifiser ikkekoblet bruker (regresjon)**
- Velg en annen aktiv paper-bruker uten kraken-keys; sjekk deres tick-pris samsvarer Binance-proxy (uendret oppførsel)

**Step 4: Kill-switch + helse**
- `/api/health` → 200; ingen nye feil i tick-loggen etter 3 automatiske kjøringer

---

## Task 4: Daglig analyse — legg til priskilde-spor

**Objective:** Daglig analyse (cron ada921a4e191) viser hvilken kilde lekepenger-tick brukte.

**Step 1:** Oppdater cron-prompt: les `kraken_live_state.updated_at` og bekreft at Toms lekepenger-priser ≈ Kraken-live-priser (avvik < 0,5% i rapporten).
**Step 2:** Ingen kode-endring nødvendig — kun prompt-tillegg.

---

## Risiko og tradeoffs

| Risiko | Sannsynlighet | Mitigering |
|---|---|---|
| Kraken OHLC-nedetid stopper tick for Tom | Lav | Fallback til binance-cache per symbol; tick dør aldri |
| Prisavvik Binance vs Kraken (0,05–0,2%) | Garantert | Akseptert — konsistens innenfor Toms egen opplevelse > paritet på tvers av kilder; grid-spacing (0,8–1,2%) er 4–20× større enn avviket |
| OHLC `since`-parameter: ms vs s | Middels (vanlig felle) | Test dekker startTime-konvertering; task 1 step 3 |
| Kraken public rate-limit (1-2 rps) | Middels | Prefetch er én batch per symbol per tick (max ~10 kall); cache 10s; samme mønster som Binance-provider |
| POL-priser fra POLUSD (USD-kvote) | Lav | Kun prisreferanse — lekepenger; verdi-messig ~identisk |
| Prefetch dobler kall for delte symboler | Lav | Kun når BÅDE kraken- og binance-bruker handler samme symbol i samme tick — sjeldent; cache begge |

## Åpne spørsmål

Ingen blokkerende. (Tom godkjente retning; per-bruker-design bekreftet i samtale. POL fallback til POLUSD er eneste antagelse — dokumentert.)

## Go-kriterier

- [ ] `kraken-provider.test.ts` grønn (TDD først)
- [ ] `price-source.test.ts` grønn
- [ ] Full suite 1860+ grønn, tsc=0
- [ ] Deploy verifisert; Toms tick-pris ≈ Kraken-ticker (< 0,5%)
- [ ] Ikkekoblet bruker uendret (Binance)
