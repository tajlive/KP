/**
 * Canonical exchange rate service — USDTNOK
 *
 * Henter levende USDT→NOK rate fra Binance via Supabase proxy.
 * Cache i 60 sekunder, fallback ved feil.
 * Validerer at rate er innenfor [5, 20] for å guarde mot korrupt API-data.
 */

const BINANCE_PROXY_URL =
  "https://pskhryjzkobytnfwucrb.supabase.co/functions/v1/binance-proxy?symbol=USDTNOK";
const CACHE_TTL_MS = 60_000;
const MIN_RATE = 5;
const MAX_RATE = 20;
// MÅ henge med markedet og med FALLBACK_USDT_NOK i currency.ts.
// 2026-07-31: 10.5 var ~8.5 % over reell kurs (~9.6-9.7) og blåste opp
// pnlPct i JokerTrade-exits → falske take-profits som solgte med tap.
const DEFAULT_FALLBACK = 9.6;

interface CacheEntry {
  rate: number;
  expiresAt: number;
}

let cache: CacheEntry | null = null;

function isCacheValid(): boolean {
  return cache !== null && Date.now() < cache.expiresAt;
}

/**
 * Fetch the USDT → NOK exchange rate from Binance via the Supabase proxy.
 *
 * Caches the result for 60 seconds. Falls back to the cached value (or 10.5)
 * on any fetch/parse error. Validates the returned rate is between 5 and 20
 * to guard against corrupted proxy data.
 */
export async function getNokUsdtRate(): Promise<number> {
  // Return cached value if still fresh
  if (isCacheValid()) {
    return cache!.rate;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5_000);

    const res = await fetch(BINANCE_PROXY_URL, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Binance proxy responded with ${res.status}`);
    }

    const body: unknown = await res.json();

    // Handle both wrapped proxy response and passthrough Binance response
    let priceStr: string | undefined;

    if (body && typeof body === "object" && "data" in (body as Record<string, unknown>)) {
      // Wrapped proxy response: { ok: true, data: { symbol, price } }
      const data = (body as Record<string, unknown>).data;
      if (data && typeof data === "object" && "price" in (data as Record<string, unknown>)) {
        priceStr = (data as Record<string, unknown>).price as string;
      }
    } else if (body && typeof body === "object" && "price" in (body as Record<string, unknown>)) {
      // Passthrough Binance response: { symbol: "USDTNOK", price: "9.58320000" }
      priceStr = (body as Record<string, unknown>).price as string;
    }

    if (priceStr === undefined || priceStr === null) {
      throw new Error("Price field not found in proxy response");
    }

    const rate = Number(priceStr);

    if (!Number.isFinite(rate) || rate < MIN_RATE || rate > MAX_RATE) {
      throw new Error(
        `Invalid rate ${rate} (expected ${MIN_RATE}–${MAX_RATE})`,
      );
    }

    cache = { rate, expiresAt: Date.now() + CACHE_TTL_MS };
    return rate;
  } catch (err) {
    // Fallback to stale cache or default
    if (cache !== null) {
      console.warn(
        `[exchange-rate] Fetch failed, using stale cache (${cache.rate}): ${err instanceof Error ? err.message : String(err)}`,
      );
      return cache.rate;
    }

    console.warn(
      `[exchange-rate] Fetch failed, using default fallback (${DEFAULT_FALLBACK}): ${err instanceof Error ? err.message : String(err)}`,
    );
    return DEFAULT_FALLBACK;
  }
}

/**
 * Clear the cached rate (useful in tests).
 */
export function clearRateCache(): void {
  cache = null;
}
