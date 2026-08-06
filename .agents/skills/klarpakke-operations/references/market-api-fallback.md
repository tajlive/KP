# Market API Fallback — Implementasjonsdetaljer

Dato: 2026-07-27
Problem: Cloudflare Workers IP blokkert av Binance → 502 på market API-er

## Tre-lags fallback

```
1. Supabase binance-proxy edge function (POST /functions/v1/binance-proxy)
2. Direkte Binance API (med 7 failover-endepunkter)
3. DB coin_prices (cachet av cron/sync-prices)
```

## Berørte filer

1. `src/app/api/market/binance-24hr/route.ts` — 24h ticker med change%
2. `src/app/api/market/binance-prices/route.ts` — spot-priser
3. `src/app/api/paper-trading/execute/route.ts` — trade execution prisfetch

## API-pattern (binance-24hr)

```typescript
const BINANCE_PROXY_URL = "https://pskhryjzkobytnfwucrb.supabase.co/functions/v1/binance-proxy";

// 1. Proxy
let res = await fetch(BINANCE_PROXY_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ symbols, type: "24hr" }),
});

// 2. Direkte Binance
if (!res?.ok) {
  res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encoded}`);
}

// 3. DB fallback
if (!res?.ok) {
  const { data } = await supabase
    .from("coin_prices")
    .select("symbol, price, price_change_percent_24h")
    .in("symbol", symbols);
  return NextResponse.json({ prices: data, source: "db-cache" });
}
```

## DB fallback (paper-execute + binance-prices)

```typescript
try {
  const provider = createBinanceMarketDataProvider(); // proxy → Binance → CoinGecko
  price = await provider.getPrice(symbol);
} catch {
  // Siste utvei: DB-cache
  const { data } = await supabase
    .from("coin_prices")
    .select("price")
    .eq("symbol", symbol)
    .single();
  if (data?.price && Number(data.price) > 0) price = Number(data.price);
}
```

## Verifisering

```bash
# Live — skal vise db-cache når Binance er blokkert
curl -s "https://www.klarpakke.no/api/market/binance-24hr?symbols=BTCUSDT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('source','live'), d['prices'][0])"

# binance-prices — får live via CoinGecko
curl -s "https://www.klarpakke.no/api/market/binance-prices?symbols=BTCUSDT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['prices'][0])"
```
