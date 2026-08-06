# Kraken API Notes — condensed knowledge bank

## Auth (private REST)

- Base: `https://api.kraken.com`, path `/<version>/<public|private>/<endpoint>`, version `0`.
- Sign: `HMAC-SHA512(key=base64_decode(apiSecret), message=path + SHA256(nonce + postData))` → base64.
- Headers: `API-Key`, `API-Sign`; body is `application/x-www-form-urlencoded` with `nonce`.
- Error shape: `{ error: [...], result: ... }` — non-empty `error` array = fail. `EAPI:Invalid key` on bad creds.

## Symbol/asset quirks

| Standard | Kraken pair | Kraken balance asset |
|---|---|---|
| BTC | XBT | XXBT |
| USD | ZUSD | ZUSD |
| EUR | ZEUR | ZEUR |
| ETH/SOL/ADA/DOT/LINK/AVAX/DOGE/POL | unchanged | mostly unchanged |

- Balance response keys carry the extra prefix (`XXBT`, `ZUSD`); pair symbols for orders are `XBTUSDT`, `USDTZUSD`.
- Keep a bidirectional map (`toKrakenSymbol`/`fromKrakenSymbol`) and convert at the exchange boundary only.

## Endpoints used by Klarpakke

- Public: `Ticker` (pair → last trade `c[0]`), `AssetPairs`.
- Private: `Balance`, `AddOrder` (`type` buy/sell, `ordertype` market/limit, `volume`, `price` for limit), `OpenOrders`, `CancelOrder` (txid), `TradesHistory`, `DepositStatus`.
- No deposit webhooks — poll `DepositStatus` (Klarpakke: every 5 min via cron route, filter `status === "Success"` and last 24h, dedupe by txid).

## Fees (spot, 30d volume tiers)

| Volume | Maker | Taker |
|---|---|---|
| $0+ | 0.25% | 0.40% |
| $50K+ | 0.14% | 0.24% |
| $1M+ | 0.06% | 0.16% |
| $10M+ | 0.00% | 0.10% |

Cheaper than Coinbase at retail tiers (0.40%/0.60% taker at $0) and far cheaper than Bitstamp (0.50% flat).

## Affiliate program (2026)

- Up to 50% revenue share on eligible volume, lifetime, terms negotiated per partner.
- Two tracks: **in-house** (creators/KOLs, USDC payout, dedicated manager) and **Impact.com** (platforms/media, fiat payout to bank). Klarpakke uses Impact: campaign `Kraken.brand`, tag ID `P-A7568938`.
- Includes spot + futures trade fees + margin fees; excludes funding-rate and conversion fees.
- Attribution caveat: blocked Google Analytics/cookies (Brave, ad blockers) = NO attribution, no manual override. Referral must click + sign up on same device/browser.
- Payout timing: revenue visible daily (3-4 day delay), withdrawable on the 15th of following month, paid ~29th.
- Applications declined for: "Offline"/"Other" partner type without context, private socials, inactive sites, irrelevant content. Review takes ~5 business days.
- Site verification: `<meta name="impact-site-verification" content="...">` in `<head>`.

## Binance comparison (why Klarpakke left)

- TRD_GRP_031: unrestricted-IP keys can't trade (error -2015). CIDR whitelist rejected. Fiat conversion manual-only.
- MiCA: no EU license (application via Hellas pending, Reuters June 2026 reports risk of losing it); USDT delisted from EØS spot March 2025.
