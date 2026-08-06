# Scanner / balanse-nøkkel-mapping — Task B1 (2026-08-06)

Referanseimplementasjon: `src/lib/trading/autopilot/scanner.ts` (Portfolio Scanner, TDD-grønn).

## 1. PAIR_CFG.asset er SSoT for balanse-nøkkelen i NY kode

`src/lib/trading/kraken-grid-config.mjs` sin PAIR_CFG har et `asset`-felt per par:
`XBTUSDC → XXBT`, `ETHUSDC → XETH`, `SOLUSDC → SOL`, `ADAUSDC → ADA`, `DOTUSDC → DOT`.

Scanneren leser `balance[PAIR_CFG[pair].asset]` — aldri utledet fra par-navnet
(`pair.replace("USDC","")` er kun trygt for ikke-legacy coins; `bal["XBT"]` er ALLTID
undefined). Dette er den tredje generasjonen av balanse-mappingen:
per-par map (gammel) → `pair.replace` (farlig) → `PAIR_CFG.asset` (nå, SSoT).
Ny kode som leser Kraken-balanse skal importere PAIR_CFG, ikke definere egne kart.

## 2. TS-felle: .mjs-konfig med infererte literal-nøkler i streng .ts

`PAIR_CFG` er JS (.mjs) → TypeScript infererer nøklene som literaler
(`{ XBTUSDC: ...; ETHUSDC: ... }`). Indeksering med `pair: string` gir:

```
TS7053: Element implicitly has an 'any' type because expression of type 'string'
can't be used to index type '{ XBTUSDC: {...}; ETHUSDC: {...}; ... }'
```

Fiks — cast ÉN gang i fila, deretter normal indeksering:

```ts
const PAIR_CFG_LOOKUP = PAIR_CFG as unknown as Record<
  string,
  { asset: string } | undefined
>;
// ... PAIR_CFG_LOOKUP[pair]?.asset
```

## 3. Mock-grensesnitt må verifiseres mot den FAKTISKE klientklassen

Task-briefen sa «Mock KrakenClient: `{ call: fn }`» — men den ekte `KrakenClient`
(`src/lib/exchanges/kraken/client.ts`) har INGEN `call`-metode. Den har
`getBalance(): Promise<KrakenBalance>` og `getTicker(pair): Promise<KrakenTicker>`.

Regel: før du skriver tester mot et mock-interface beskrevet i en brief, åpne
klientklassen og sjekk public-metodene. Skriv koden mot et minimalt strukturelt
interface som matcher den ekte klassen:

```ts
export interface ScannerClient {
  getBalance(): Promise<KrakenBalance>;
  getTicker(pair: string): Promise<KrakenTicker>;
}
```

Da er mock og prod-klient byttbare, og scanneren fungerer i orchestratoren (Task C1)
med en ekte KrakenClient. En scanner skrevet mot `call` ville kompilert og testet
grønt, men krasjet i prod.

## Ticker-avlesning

Siste pris = `ticker.c[0]` (KrakenTicker-objektet fra `getTicker`). Manglende ticker
for et par med balanse → kast feil (fail-safe: aldri undervurder equity stille,
kill-switch-beslutninger bygger på equity).
