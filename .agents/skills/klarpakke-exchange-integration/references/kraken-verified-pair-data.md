# Kraken — verifiserte par-data (audits mot live API)

Kilde: `GET https://api.kraken.com/0/public/AssetPairs` (ingen auth). Kjør denne
auditen FØR live trading og ved hvert symbol-univers-utvidelse — aldri stol på
hardkodede symbol/minimums-tabeller uten verifikasjon.

## Audit 2026-08-05 — status=online for alle rader under

| Internt symbol | Kraken altname | wsname | ordermin | pair_decimals | Merknad |
|---|---|---|---|---|---|
| BTCUSDT | XBTUSDT | XBT/USDT | 0.00005 | 1 | |
| ETHUSDT | ETHUSDT | ETH/USDT | 0.001 | 2 | |
| SOLUSDT | SOLUSDT | SOL/USDT | 0.06 | 2 | Kode hadde 0.01 (6× for lavt) |
| AVAXUSDT | AVAXUSDT | AVAX/USDT | 0.5 | 3 | Kode hadde 0.1 (5× for lavt) |
| DOGEUSDT | **XDGUSDT** | XDG/USDT | 50 | — | DOGE heter XDG på Kraken! Kode hadde DOGEUSDT+10 |
| LINKUSDT | LINKUSDT | LINK/USDT | 0.55 | 5 | Kode hadde 0.1 |
| ADAUSDT | ADAUSDT | ADA/USDT | 20 | 6 | Kode hadde 1 (20× for lavt) |
| DOTUSDT | DOTUSDT | DOT/USDT | 3.9 | 4 | Kode hadde 0.1 (39× for lavt) |
| POLUSDT | **finnes ikke** | — | — | — | Kun POLUSD (ordermin 70) og POLEUR |
| USD→USDT | USDTUSD (altname) / USDTZUSD (internal) | USDT/USD | 5 | 5 | Konverteringer under $5 avvises |
| EUR→USDT | **USDTEUR** (ikke USDTZEUR!) | USDT/EUR | 5 | — | Balanse-asset er ZEUR, men pair er USDTEUR |

## Kritiske navneregler (brudd = garantert order-feil)

1. **Aldri bygg pair-navn ved string-konkatenering av `Z`-prefiksede fiat-koder.**
   `ZUSD`/`ZEUR` er *balanse-asset*-navn. Pair-navn følger eget mønster:
   `USDTZUSD` (internal) / `USDTUSD` (altname) for USD, men `USDTEUR` for EUR —
   det finnes INGEN `USDTZEUR`. Auto-convert som bygde `` `${to}${Z}${from}` ``
   feilet 100% for EUR. Bruk eksplisitt mapping-tabell.
2. **DOGE = XDG på Kraken** (alle par: XDGUSDT, XDGUSD, XDGEUR, XXDGXXBT).
3. **POL har intet USDT-par** — grid-univers med POLUSDT er et svart hull for
   kapitalen. Alternativer: POLUSD (ordermin 70), eller dropp POL på Kraken.
4. **AssetPairs-responsen har tre navneformer per par**: objekt-nøkkel
   (f.eks. `XBTUSDT`), `altname` (f.eks. `XBTUSDT`), og `wsname` (f.eks.
   `XBT/USDT`). AddOrder godtar både nøkkel og altname — men balanse-assets
   (`XXBT`, `ZUSD`) er EN FJERDE form. Map alle fire.

## Audit-oppskrift (rerunbar)

```python
import json, urllib.request
req = urllib.request.Request("https://api.kraken.com/0/public/AssetPairs",
                             headers={"User-Agent":"curl/8"})
pairs = json.load(urllib.request.urlopen(req, timeout=20))["result"]
# Match på altname, wsname (fjern '/'), og nøkkel — sjekk status=='online',
# trekk ut ordermin + pair_decimals per symbol i universet.
```

Sammenlign mot `KRAKEN_MIN_ORDER` i `src/lib/exchanges/kraken/symbols.ts` og
TOP_SYMBOLS-universet. Enhver diff = blokkér live-lansering for det paret.
