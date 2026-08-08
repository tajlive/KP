/**
 * Paper trading uses NOK balance (current_capital_nok) while Kraken prices are in USDT.
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

  // 3. Levende markedsrate via kanonisk tjeneste (Kraken)
  try {
    const { getNokUsdtRate } = await import("@/lib/trading/canonical/exchange-rate");
    const liveRate = await getNokUsdtRate();
    if (liveRate > 0) return liveRate;
  } catch {
    // fallthrough
  }

  // 4. Statisk fallback — logges slik at forelding ikke er stille
  console.warn(
    `[currency] USDT→NOK bruker statisk fallback ${FALLBACK_USDT_NOK} — ` +
      "verken DB (global_settings) eller env ga en kurs. Sjekk cron update-usdt-nok.",
  );
  return FALLBACK_USDT_NOK;
}

/**
 * Convert a value in USDT (e.g. quantity * price from Kraken) to NOK.
 */
export function usdtToNok(usdtAmount: number, rate?: number): number {
  return usdtAmount * (rate ?? getUsdtToNokRate());
}

/**
 * Skrivetids-guard (2026-07-28): paper-trades skal ALDRI lagres
 * USDT-denominert. Prod-bevis: tick-pipelinen skrev SOL-rader med
 * pris/total/fee i USDT (qty × pris = total, 100 % USDT-konsistent)
 * mens BTC-rader var NOK — pris-kildene er valuta-blandede per symbol.
 *
 * Sammenligner lagrede verdier mot USDT-referanseprisen (request.price)
 * og korrigerer entydige avvik:
 *   1. Innen NOK-båndet (ref × rate)      -> allerede korrekt, uendret.
 *   2. Innen USDT-båndet (ref)            -> ukonvertert, multipliser alt.
 *   3. > 2.5× over NOK-båndet             -> dobbeltkonvertert, divider.
 *   4. Ellers (ukjent opphav)             -> uendret, corrected=false.
 *
 * Båndene overlapper ikke så lenge rate > 1.6/0.45 ≈ 3.56 (rate er ~9.7).
 * RENE funksjoner — ingen I/O, kan testes isolert.
 */
export const CURRENCY_BAND_LO = 0.45;
export const CURRENCY_BAND_HI = 1.6;
export const DOUBLE_CONVERSION_FACTOR = 2.5;

export interface NokDenominationResult {
  price: number;
  totalValue: number;
  fee: number;
  corrected: boolean;
  reason: "already_nok" | "converted_usdt" | "fixed_double" | "unresolved";
}

export function ensureNokDenominated(
  values: { price: number; totalValue: number; fee: number },
  referencePriceUsdt: number,
  rate: number,
): NokDenominationResult {
  const { price, totalValue, fee } = values;
  const base: NokDenominationResult = {
    price,
    totalValue,
    fee,
    corrected: false,
    reason: "unresolved",
  };
  if (!(referencePriceUsdt > 0) || !(rate > 1) || !(price > 0)) return base;

  const expectedNok = referencePriceUsdt * rate;

  // 1. Allerede NOK
  if (price >= expectedNok * CURRENCY_BAND_LO && price <= expectedNok * CURRENCY_BAND_HI) {
    return { ...base, reason: "already_nok" };
  }
  // 2. Ukonvertert USDT
  if (price >= referencePriceUsdt * CURRENCY_BAND_LO && price <= referencePriceUsdt * CURRENCY_BAND_HI) {
    return {
      price: price * rate,
      totalValue: totalValue * rate,
      fee: fee * rate,
      corrected: true,
      reason: "converted_usdt",
    };
  }
  // 3. Dobbeltkonvertert
  if (price > expectedNok * DOUBLE_CONVERSION_FACTOR) {
    return {
      price: price / rate,
      totalValue: totalValue / rate,
      fee: fee / rate,
      corrected: true,
      reason: "fixed_double",
    };
  }
  return base;
}
