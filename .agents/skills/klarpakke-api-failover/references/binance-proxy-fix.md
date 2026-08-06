# Binance Proxy Fix — full detail (2026-07-28)

## Key Files

- `src/lib/trading/canonical/market-data/binance-provider.ts` — Already proxy-first (line 144). Falls back through 7 Binance endpoints + CoinGecko.
- `src/lib/trading/canonical/market-data/binance-proxy-provider.ts` — `fetchPriceViaProxy()` routes through Supabase Edge Function.
- `src/app/api/paper-trading/execute/route.ts` — Was using `createBinanceMarketDataProvider().getPrice(symbol)`. Now uses `fetchPriceViaProxy(symbol)` directly.

## The Fix Chain

1. **User reports:** "Nettverksfeil" when trying to trade
2. **Diagnosis:** `createBinanceMarketDataProvider().getPrice()` → proxy fails (secret missing) → 7 endpoints × 5s timeout → 20s → Worker 522 timeout
3. **Check secrets:** `npx wrangler secret list` → BINANCE_PROXY_SECRET missing
4. **Set secret:** `source .env.local && npx wrangler secret put BINANCE_PROXY_SECRET < /tmp/bps`
5. **Code change:** Replace `createBinanceMarketDataProvider().getPrice()` with `fetchPriceViaProxy()` in execute route
6. **Deploy:** `bash scripts/deploy.sh`
7. **Verify:** curl returns 401 (auth) in <5s instead of 522 timeout

## Provider Class vs Direct Proxy

`BinanceMarketDataProvider.getPrice()` already calls `fetchPriceViaProxy()` first
(line 144-148), so the class IS proxy-first. But for API routes, calling
`fetchPriceViaProxy()` directly is:
- Faster (no provider instantiation)
- Cleaner error messages
- No 10s cache (each request gets fresh price)

## Other Call Sites

10+ other places use `createBinanceMarketDataProvider()` — these are internal
(backtesting, auto-trader, signals). They already benefit from the class-level
proxy-first pattern. No changes needed as long as BINANCE_PROXY_SECRET is set.
