# Kraken public market-data provider (MarketDataProvider) — 2026-08-05

Session: Task 1 of «kraken-priser-for-lekepenger» — `KrakenMarketDataProvider` at
`src/lib/trading/canonical/market-data/kraken-provider.ts` (TDD, 29 nye tester grønne,
full suite 1889 passed, tsc 0, lint 0). Ikke committet — ventet på review.

## Endpoint-shapes (public, ingen auth, base https://api.kraken.com/0/public)

```
Ticker:   GET /Ticker?pair=XBTUSDC
  { error: [], result: { XBTUSDC: { c: ["64820.61", "0.123"], ... } } }   // c[0] = siste pris
OHLC:     GET /OHLC?pair=XBTUSDC&interval=60[&since=<unix-sekunder>]
  { error: [], result: { XBTUSDC: [[time, open, high, low, close, vwap, volume, count], ...],
                         last: <unix-sekunder> } }
Depth:    GET /Depth?pair=XBTUSDC&count=20
  { error: [], result: { XBTUSDC: { bids: [["64820.0","1.5"],...], asks: [["64821.0","2.5"],...] } } }
```

## Quirks som biter

- OHLC-resultatet har en `last`-nøkkel ved siden av paret — les `result[pair]` (eller eksakt /
  case-insensitiv nøkkel-match), aldri `Object.values`.
- OHLC-lysets tid = UNIX **sekunder** → ×1000 til ms for å matche kanonisk Kline-enhet (Binance bruker ms).
- `since`-param = UNIX **sekunder** → `startTime/1000` (floor). Å sende ms gir stille feil vindu.
- OHLC max 720 lys per kall, **ingen `limit`-param** → `slice(-limit)` client-side (nyeste N). Rekkefølge: eldst→nyest.
- get24hChange fra 24×1h-lys, IKKE Ticker `o[0]` — `o[0]` observert upålitelig (returnerte «6»).
- Intervall-map: `"15m"→15, "1h"→60, "4h"→240` (minutter).
- USDC-kvote-mapping (USDT blokkert for NO-kontoer): BTCUSDT→XBTUSDC ETHUSDT→ETHUSDC SOLUSDT→SOLUSDC
  AVAXUSDT→AVAXUSDC DOGEUSDT→XDGUSDC LINKUSDT→LINKUSDC ADAUSDT→ADAUSDC DOTUSDT→DOTUSDC POLUSDT→POLUSD.
- Ukjent symbol → `Error("KRAKEN_PAIR_UNAVAILABLE: <SYM>")` (upper, skråstrek fjernet) — tick faller tilbake til Binance.
- Feil-envelope: `{ error: ["EQuery:Unknown asset pair"], result: {} }` — kast ved ikke-tom `error`-array.

## Implementasjonsmønster (speiler binance-provider.ts)

- `priceCache` Map<pair, {price, timestamp}> TTL 10s — sjekk cache før fetch.
- `krakenFetch<T>(path)`: AbortController + 10s timeout, headers `Accept: application/json` +
  `User-Agent: Klarpakke/1.0`, parse `{error, result}`, kast på `!ok` eller ikke-tom `error[]`, returner `result`.
- `extractPairData(result, pair)`: eksakt nøkkel → case-insensitiv scan → kast. Håndterer Krakens nøkkel-normalisering.
- `parseFloat` overalt (Kraken sender pris-strenger); volume på lys-indeks 6 (5 = vwap).

## Test-fixture-pitfalls (3 av 29 tester feilet på TEST-bugs, ikke impl)

1. **Nøkkelbaserte mocks må matche hver request:** `tickerResult("XBTUSDC", ...)` løser kun ETT par —
   delt `mockResolvedValue` kaster i `extractPairData` for andre symboler. Bruk `mockResolvedValueOnce` per par.
2. **Timestamp-matematikk:** timebaserte lys `startSeconds + i*3600` (s) → ms = verdi*1000; regn ut for hånd
   før assert (1_700_000_000 + 2*3600 s = 1_700_007_200_000 ms).
3. **endTime-filter-tester trenger 1s lys-avstand** — timeavstand + liten ms-endTime beholder bare 1 lys.

## Verifisering brukt

`npx vitest run <test>` (RED: module-not-found → GREEN: pass) → `npx tsc --noEmit` (0)
→ `npx eslint <filer>` (0) → `npm run lint` / `npm run test` full (1889 passed).
