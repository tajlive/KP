/**
 * Paper trading uses NOK balance (current_capital_nok) while Binance prices are in USDT.
 * This module provides USDT -> NOK conversion so order value is correct.
 * Rate: env USDT_NOK_RATE > global_settings.usdt_nok_rate (cron) > fallback 10.8.
 */

const FALLBACK_USDT_NOK = 10.8;

/**
 * Get USDT to NOK rate (sync). Prefers env USDT_NOK_RATE, else fallback.
 * Use getUsdtToNokRateAsync when you have a Supabase client to read from DB.
 */
export function getUsdtToNokRate(): number {
  const env = process.env.USDT_NOK_RATE;
  if (env != null && env !== "") {
    const parsed = Number(env);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return FALLBACK_USDT_NOK;
}

/**
 * Get USDT to NOK rate: env > global_settings.usdt_nok_rate (DB) > fallback.
 * Pass the Supabase client (e.g. from createClient()) to read from DB when env unset.
 */
export async function getUsdtToNokRateAsync(
  supabase?: unknown
): Promise<number> {
  const env = process.env.USDT_NOK_RATE;
  if (env != null && env !== "") {
    const parsed = Number(env);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  if (supabase && typeof supabase === "object" && supabase !== null && "from" in supabase) {
    try {
      const client = supabase as { from: (t: string) => { select: (c: string) => { eq: (col: string, val: number) => { maybeSingle: () => Promise<{ data: { usdt_nok_rate?: number | null } | null }> } } } };
      const result = await client.from("global_settings").select("usdt_nok_rate").eq("id", 1).maybeSingle();
      const rate = result.data?.usdt_nok_rate;
      if (typeof rate === "number" && rate > 0) return rate;
    } catch {
      // ignore, use fallback
    }
  }
  return FALLBACK_USDT_NOK;
}

/**
 * Convert a value in USDT (e.g. quantity * price from Binance) to NOK.
 */
export function usdtToNok(usdtAmount: number, rate?: number): number {
  return usdtAmount * (rate ?? getUsdtToNokRate());
}
