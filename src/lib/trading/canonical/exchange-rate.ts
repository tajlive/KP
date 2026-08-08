/**
 * Canonical exchange rate service — USDTNOK
 *
 * Henter levende USDT→NOK rate fra egen rute /api/fx/usdt-nok
 * (kilde: global_settings.usdt_nok_rate — EU/EØS 2026: Kraken/MiCA,
 * ingen Binance-kall noe sted i valutakjeden).
 * Cache i 60 sekunder, fallback ved feil.
 * Validerer at rate er innenfor [5, 20] for å guarde mot korrupt API-data.
 */

const FX_ROUTE = "/api/fx/usdt-nok";
const CACHE_TTL_MS = 60_000;
const MIN_RATE = 5;
const MAX_RATE = 20;
// MÅ henge med markedet og med FALLBACK_USDT_NOK i currency.ts.
// 2026-07-31: 10.5 var ~8.5 % over reell kurs (~9.6-9.7) og blåste opp
// pnlPct i PilotTrade-exits → falske take-profits som solgte med tap.
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
 * Fetch the USDT → NOK exchange rate from /api/fx/usdt-nok (global_settings).
 *
 * Caches the result for 60 seconds. Falls back to the cached value (or
 * DEFAULT_FALLBACK) on any fetch/parse error. Validates the returned rate
 * is between 5 and 20 to guard against corrupted data.
 */
export async function getNokUsdtRate(): Promise<number> {
  // Return cached value if still fresh
  if (isCacheValid()) {
    return cache!.rate;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5_000);

    const res = await fetch(FX_ROUTE, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`FX route responded with ${res.status}`);
    }

    const body: unknown = await res.json();

    // Egen rute: { rate: number, source: "global_settings" }
    if (!body || typeof body !== "object" || !("rate" in (body as Record<string, unknown>))) {
      throw new Error("Rate field not found in FX response");
    }

    const rate = Number((body as Record<string, unknown>).rate);

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
