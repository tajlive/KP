# Kraken verifiserte konstanter (2026-08-05)

Hentet fra live `GET https://api.kraken.com/0/public/AssetPairs`. Den hardkodede
`KRAKEN_MIN_ORDER`-tabellen var 5–39× for lav på 6 av 9 par før verifisering —
ordre ville blitt avvist med `EOrder:Volume minimum not met`. Re-verifiser før
live-aktivering av nye par.

## Par-navn som FAKTISK finnes (ikke gjett)

| Internt | Kraken altname | wsname | ordermin | Merknad |
|---|---|---|---|---|
| BTCUSDT | XBTUSDT | XBT/USDT | 0.00005 | |
| ETHUSDT | ETHUSDT | ETH/USDT | 0.001 | |
| SOLUSDT | SOLUSDT | SOL/USDT | 0.06 | var hardkodet 0.01 (6× for lavt) |
| AVAXUSDT | AVAXUSDT | AVAX/USDT | 0.5 | var 0.1 (5×) |
| DOGEUSDT | **XDGUSDT** | XDG/USDT | 50 | DOGE heter XDG på Kraken |
| LINKUSDT | LINKUSDT | LINK/USDT | 0.55 | var 0.1 |
| ADAUSDT | ADAUSDT | ADA/USDT | 20 | var 1 (20×) |
| DOTUSDT | DOTUSDT | DOT/USDT | 3.9 | var 0.1 (39×) |
| POL | **POLUSD** | POL/USD | 70 | POLUSDT finnes IKKE |
| fiat→USDT | USDTUSD | USDT/USD | 5 | IKKE USDTZUSD |
| fiat→USDT | USDTEUR | USDT/EUR | 5 | IKKE USDTZEUR |
| USDC→USDT | USDCUSDT | USDC/USDT | 5 | |

Alle status=online per 2026-08-05.

## Konverterings-retning (kritisk — brukeren korrigerte dette)

- **Fiat (ZUSD/ZEUR) → USDT**: fiat er QUOTE i USDTUSD/USDTEUR → `type=buy` +
  `oflag=viqc` (volume in quote currency). Uten viqc tolker Kraken `volume`
  som USDT-base-mengde → feil ordrestørrelse. Implementert som
  `client.marketBuyQuote(pair, quoteVolume)`.
- **USDC → USDT**: USDC er BASE i USDCUSDT → `type=sell` (marketSell) med volum
  i USDC. Bruker som "kjøper USDC" og vil ha USDT SELGER USDC — ikke buy.

## Innskuddskostnader (EEA/Norge, 2026)

| Metode | Gebyr | Tid |
|---|---|---|
| SEPA / SEPA Instant | gratis | 0–3 dager / umiddelbart |
| Debetkort | 0.25 EUR + 3.75% | nesten umiddelbart, min 10 EUR |
| Kortkjøp av USDC direkte | 1% instant-fee + ev. kortgebyr | umiddelbart |

USDT er ikke alltid kjøpbart direkte med kort — USDC er det, og USDC→USDT via
API dekker gapet.

## Minimum levedyktig grid-kapital (med verifiserte ordremin)

- ~20 USDT → 1 par (BTC, maks 5 nivåer à ~4.4 USDT — akkurat over ordremin)
- ~100 USDT → 3 par × 5 nivåer (første meningsfulle oppsett)
- Grid-spacing må > 0.52% per celle for profitt etter 2× 0.26% taker-fee
