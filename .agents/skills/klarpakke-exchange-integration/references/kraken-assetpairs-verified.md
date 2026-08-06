# Kraken AssetPairs — verifisert mot live API (2026-08-05)

Kilde: `curl -s https://api.kraken.com/0/public/AssetPairs` (public endpoint, ingen auth).
**Re-verifiser ALLTID mot live API før endring av symbol-map, min-ordre-tabell eller par-navn-konstruksjon.** Hardkodede exchange-konstanter uten live-verifisering ga 4 produksjonsklare bugs (se nederst).

## Verifiserte par i Klarpakkes univers

| Internt symbol | Kraken altname | wsname | ordermin | lot_decimals | pair_decimals | status |
|---|---|---|---|---|---|---|
| BTCUSDT | XBTUSDT | XBT/USDT | 0.00005 | 8 | 1 | online |
| ETHUSDT | ETHUSDT | ETH/USDT | 0.001 | 8 | 2 | online |
| SOLUSDT | SOLUSDT | SOL/USDT | 0.06 | 8 | 2 | online |
| AVAXUSDT | AVAXUSDT | AVAX/USDT | 0.5 | 8 | 3 | online |
| DOGEUSDT | **XDGUSDT** | XDG/USDT | 50 | 8 | — | online |
| LINKUSDT | LINKUSDT | LINK/USDT | 0.55 | 8 | 5 | online |
| ADAUSDT | ADAUSDT | ADA/USDT | 20 | 8 | 6 | online |
| DOTUSDT | DOTUSDT | DOT/USDT | 3.9 | 8 | 4 | online |
| (fiat-konv) | USDTUSD | USDT/USD | 5 | 8 | 5 | online |
| (fiat-konv) | USDTEUR | USDT/EUR | 5 | 8 | — | online |
| (fiat-konv) | POLUSD | POL/USD | 70 | 8 | — | online |
| (fiat-konv) | POLEUR | POL/EUR | 70 | 8 | — | online |

## Kritiske funn

1. **DOGE = XDG hos Kraken.** Binance DOGEUSDT → Kraken XDGUSDT. Balance-asset: XXDG.
2. **POLUSDT finnes IKKE på Kraken.** Kun POLUSD og POLEUR (begge ordermin 70). POL er gyldig på Binance og blir i TOP_SYMBOLS, men må filtreres bort fra alle Kraken-spesifikke lister.
3. **Fiat-par uten Z-prefiks:** USDTEUR / USDTUSD. Balance-assets MED Z-prefiks: ZEUR / ZUSD. Pair-navn kan ALDRI template-bygges fra balance-asset-navn (`USDT` + `ZEUR` = USDTZEUR → finnes ikke → ordre avvist).
4. **USDT fiat-konvertering: ordermin = 5** (USD eller EUR). Avvis beløp < 5 før AddOrder.
5. **Alle verifiserte par har lot_decimals = 8.**
6. **ordermin er i BASE-enhet** (SOL, ADA, …), ikke quote. Grid-celle-kapital må være ≥ ordermin × nåpris × 1.1, ellers avviser Kraken hver eneste ordre (`EOrder:Volume minimum not met`).
7. Små kundeinnskudd (200 kr ≈ 21 USDT) rommer realistisk kun 1–2 grid-par — Allocation-logikk må tidsbegrense antall par etter kapital, ikke spre tynt over alle.

## Hendelse 2026-08-05 (hvorfor denne filen finnes)

Verifisering før live trading avdekket 4 bugs i deployet Kraken-kode:
- `KRAKEN_MIN_ORDER` 6–39× for lavt på 7 av 9 par (hardkodet, aldri sjekket mot API)
- auto-convert bygget `USDTZEUR`/`USDTZUSD` (begge ikke-eksisterende) → 100 % av fiat-konverteringer ville feilet
- `POLUSDT` i Kraken-grid-universet → kapital svart hull
- Node `crypto`/`Buffer` i KrakenClient → brekker i Cloudflare Workers edge-runtime

Fikset av 4 parallelle subagenter, deployet i commit `8f238d890` (1860/1866 tester grønne, tsc=0, lint=0).

## Re-verifikasjonsoppskrift

```bash
curl -s https://api.kraken.com/0/public/AssetPairs | python3 -c "
import json,sys
pairs = json.load(sys.stdin)['result']
for k,v in pairs.items():
    print(k, v.get('wsname'), 'ordermin:', v.get('ordermin'), 'status:', v.get('status','?'))
"
```
Sammenlign mot `KRAKEN_MIN_ORDER` i `src/lib/exchanges/kraken/symbols.ts` — avvik = bug.
