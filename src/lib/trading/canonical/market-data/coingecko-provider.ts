/**
 * CoinGecko pris-provider — gratis fallback når Binance er blokkert
 * Ingen API-nøkkel, 10k kall/måned, fungerer fra Cloudflare Workers
 */
export async function fetchPriceFromCoinGecko(symbol: string): Promise<number> {
  const coinMap: Record<string, string> = {
    BTCUSDT: "bitcoin",
    ETHUSDT: "ethereum",
    SOLUSDT: "solana",
    BNBUSDT: "binancecoin",
    XRPUSDT: "ripple",
    DOGEUSDT: "dogecoin",
    ADAUSDT: "cardano",
    AVAXUSDT: "avalanche-2",
    DOTUSDT: "polkadot",
    MATICUSDT: "matic-network",
  };

  const coinId = coinMap[symbol.toUpperCase()] || symbol.toLowerCase().replace("usdt", "");
  
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
    { signal: AbortSignal.timeout(5000) }
  );

  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  
  const data = await res.json();
  const price = data[coinId]?.usd;
  
  if (!price) throw new Error(`CoinGecko: no price for ${symbol}`);
  
  return price;
}

/**
 * Hent 24t endring fra CoinGecko
 */
export async function fetch24hChangeFromCoinGecko(symbol: string): Promise<number> {
  const coinMap: Record<string, string> = {
    BTCUSDT: "bitcoin",
    ETHUSDT: "ethereum",
    SOLUSDT: "solana",
  };
  const coinId = coinMap[symbol.toUpperCase()] || symbol.toLowerCase().replace("usdt", "");
  
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`,
    { signal: AbortSignal.timeout(5000) }
  );
  
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  
  const data = await res.json();
  const change = data[coinId]?.usd_24h_change;
  
  if (change === undefined) throw new Error("CoinGecko: no 24h change");
  
  return change;
}
