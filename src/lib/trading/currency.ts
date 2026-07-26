/**
 * Paper trading uses NOK balance (current_capital_nok) while Binance prices are in USDT.
 * This module provides USDT -> NOK conversion so order value is correct.
 *
 * Hierarki (fikset 2026-07-27, E2E-funn F3):
 *   1. global_settings.usdt_nok_rate (DB — oppdateres daglig av cron
 *      /api/cron/update-usdt-nok; dette er den LEVENDE kilden).
 *      VIKTIG: user_context-klienter kan IKKE lese global_settings (RLS:
 *      kun admin + service_role). Derfor faller async-varianten tilbake
 *      til en service-role-lesing før den gir opp — ellers ender alle
 *      bruker-initierte ruter (f.eks. /api/user/trades posisjonskort) med
 *      den STATISKE fallbacken, som var 10.92 og ga ~14 % for høye
 *      NOK-verdier (prod-observasjon 2026-07-25).
 *   2. env USDT_NOK_RATE — eksplisitt manuell overstyring (dev/nødtilfelle).
 *   3. Statisk fallback (FALLBACK_USDT_NOK) — MÅ henge med markedet.
 *      Oppdatert 2026-07-27: 9.6 (markedsrate ~9.58). Forrige verdi 10.92
 *      (2026-05-15) var 14 % for høy og blåste opp urealisert P&L.
 */

const FALLBACK_USDT_NOK = 9.6;

/**
 * Get USDT to NOK rate (sync). Kan ikke gjøre DB-I/O, så denne er kun
 * env-overstyring + statisk fallback. Bruk getUsdtToNokRateAsync der du
 * har en Supabase-klient — den leser levende kurs fra DB.
 */
export function getUsdtToNokRate(): number {
  const env = process.env.USDT_NOK_RATE;
  if (env != null && env !== "") {
    const parsed = Number(env);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return FALLBACK_USDT_NOK;
}

interface GlobalSettingsRow {
  usdt_nok_rate?: number | null;
}
interface SettingsClient {
  from: (t: string) => {
    select: (c: string) => {
      eq: (
        col: string,
        val: number,
      ) => { maybeSingle: () => Promise<{ data: GlobalSettingsRow | null }> };
    };
  };
}

async function readRateFromDb(client: SettingsClient): Promise<number | null> {
  try {
    const result = await client
      .from("global_settings")
      .select("usdt_nok_rate")
      .eq("id", 1)
      .maybeSingle();
    const rate = result.data?.usdt_nok_rate;
    if (typeof rate === "number" && rate > 0) return rate;
  } catch {
    // fallthrough
  }
  return null;
}

/**
 * Get USDT to NOK rate: DB (levende, cron-oppdatert) > env > fallback.
 *
 * `supabase` kan være en user-context-klient — treffer den RLS på
 * global_settings, prøves service-role-klienten automatisk (server-side).
 * Logger en advarsel ved fallback slik at foreldet kurs blir synlig i
 * logger i stedet for å være en stille feilkilde.
 */
export async function getUsdtToNokRateAsync(
  supabase?: unknown
): Promise<number> {
  // 1. Levende kurs fra DB
  if (supabase && typeof supabase === "object" && supabase !== null && "from" in supabase) {
    const rate = await readRateFromDb(supabase as SettingsClient);
    if (rate != null) return rate;
  }
  // RLS kan ha blokkert user-context-lesingen — prøv service role (server-side)
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const rate = await readRateFromDb(createClient() as unknown as SettingsClient);
    if (rate != null) return rate;
  } catch {
    // Ikke server-kontekst eller service role utilgjengelig — fall through
  }

  // 2. Eksplisitt env-overstyring
  const env = process.env.USDT_NOK_RATE;
  if (env != null && env !== "") {
    const parsed = Number(env);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  // 3. Statisk fallback — logges slik at forelding ikke er stille
  console.warn(
    `[currency] USDT→NOK bruker statisk fallback ${FALLBACK_USDT_NOK} — ` +
      "verken DB (global_settings) eller env ga en kurs. Sjekk cron update-usdt-nok.",
  );
  return FALLBACK_USDT_NOK;
}

/**
 * Convert a value in USDT (e.g. quantity * price from Binance) to NOK.
 */
export function usdtToNok(usdtAmount: number, rate?: number): number {
  return usdtAmount * (rate ?? getUsdtToNokRate());
}
