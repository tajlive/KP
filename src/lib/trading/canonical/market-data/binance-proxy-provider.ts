/**
 * Binance Proxy Market Data Provider
 *
 * Ruter public Binance API-kall (pris, klines, depth) gjennom
 * Supabase Edge Function for å unngå Cloudflare Worker IP-blokk.
 *
 * Brukes av BinanceMarketDataProvider som fallback når direkte API feiler.
 */

interface ProxyResponse {
  ok: true;
  status: number;
  data: unknown;
  endpointUsed?: string;
}

interface ProxyError {
  ok: false;
  error: string;
  status?: number;
}

async function fetchViaProxy(path: string): Promise<unknown> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const proxySecret = process.env.BINANCE_PROXY_SECRET;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !proxySecret || !anonKey) {
    throw new Error("Supabase proxy not configured (missing env vars)");
  }

  const proxyUrl = `${supabaseUrl}/functions/v1/binance-proxy`;
  const res = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
      "X-Binance-Proxy-Secret": proxySecret,
    },
    body: JSON.stringify({
      action: "publicApi",
      apiKey: "",      // Dummy — not used for publicApi
      apiSecret: "public",   // Dummy
      publicApiPath: path,
    }),
  });

  const payload: ProxyResponse | ProxyError = await res.json();
  if (!res.ok || !payload.ok) {
    const msg = "error" in payload ? payload.error : `Proxy error: ${res.status}`;
    throw new Error(msg);
  }

  return payload.data;
}

export async function fetchPriceViaProxy(symbol: string): Promise<number> {
  const data = await fetchViaProxy(`/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`) as { price: string };
  return parseFloat(data.price);
}

export async function fetchKlinesViaProxy(symbol: string, interval: string, limit: number): Promise<unknown[]> {
  const data = await fetchViaProxy(
    `/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`
  ) as unknown[];
  return data;
}

export async function fetchDepthViaProxy(symbol: string, limit = 20): Promise<{ bids: [string, string][]; asks: [string, string][] }> {
  return fetchViaProxy(
    `/api/v3/depth?symbol=${symbol.toUpperCase()}&limit=${limit}`
  ) as Promise<{ bids: [string, string][]; asks: [string, string][] }>;
}

export async function fetch24hChangeViaProxy(symbol: string): Promise<number> {
  const data = await fetchViaProxy(`/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}`) as { priceChangePercent: string };
  return parseFloat(data.priceChangePercent);
}
