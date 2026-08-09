/**
 * paper-account-sync.ts
 *
 * Synkroniserer paper_accounts.current_balance med faktisk kapital fra
 * trading_sessions. Kalles etter hver trade for å holde kontobalansen
 * i sync — slik at dashboard og trade-side viser riktige tall.
 *
 * Arkitektur-sannhet #1: paper_accounts.current_balance er source of truth.
 *
 * ⚠️  P0-FIKS (2026-08-10): Tidligere summeres active+paused+stopped.
 *     Stoppede sesjoners current_capital_nok er FRYSTE historiske verdier —
 *     summert inn i SSoT hver 5. minutt (tick-cron) ga eksponentiell inflasjon:
 *     Toms saldo 100k → 199k → 697k uten én reell trade.
 *     Nå: KUN aktive/pausede sesjoner summeres. Stoppede er historikk.
 *     (Tidligere kommentar om «stoppede tilhører brukeren» var feil —
 *     deres kapital er allerede telt da de var aktive. Å telle dem igjen
 *     er dobbelt-telling. Tom-bevis 2026-08-10: saldo 697 576,98 → 99 646,50.)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Beregn total kapital på tvers av AKTIVE/PAUSED paper-sesjoner for én
 * bruker, og skriv resultatet tilbake til paper_accounts.current_balance.
 *
 * Stoppede sesjoner telles IKKE — deres current_capital_nok er fryst
 * historikk, ikke levende penger (P0 2026-08-10).
 */
export async function syncPaperAccountBalance(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  try {
    const { data: sessions, error: sessionError } = await supabase
      .from("trading_sessions")
      .select("current_capital_nok, starting_capital_nok")
      .eq("user_id", userId)
      .eq("mode", "paper")
      .in("status", ["active", "paused"]); // KUN levende sesjoner (2026-08-10)

    if (sessionError) {
      console.warn("[syncPaperBalance] session fetch error:", sessionError.message);
      return;
    }

    // Ingen aktive/pausede sesjoner → ikke oppdater (behold SSoT uendret)
    if (!sessions || sessions.length === 0) {
      return;
    }

    const totalCapital = sessions.reduce(
      (sum, s) => sum + Number(s.current_capital_nok ?? 0), 0);
    const totalInitial = sessions.reduce(
      (sum, s) => sum + Number(s.starting_capital_nok ?? 0), 0);

    if (!Number.isFinite(totalCapital) || totalCapital <= 0) {
      return; // Ingen gyldige sesjoner — ikke oppdater
    }

    // Sanity-cap (2026-08-04): sesjons-sum > 3× startkapital = arvet inflasjon
    // (f.eks. fra sesjoner opprettet med hele balansen per symbol — prod-hendelse:
    // 11 × 94 389 kr ble 1 038 280 kr i paper_accounts). Da skriver vi IKKE —
    // bedre å beholde forrige kjente balance enn å spre inflasjon til SSoT.
    if (totalInitial > 0 && totalCapital > totalInitial * 3) {
      console.warn(
        `[syncPaperBalance] Sanity-cap: sessions-sum ${totalCapital} > 3× initial ${totalInitial} — hopper over (user ${userId})`,
      );
      return;
    }

    const { error: updateError } = await supabase
      .from("paper_accounts")
      .update({
        current_balance: Math.round(totalCapital * 100) / 100,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      console.warn("[syncPaperBalance] update error:", updateError.message);
    }
  } catch (err) {
    console.warn("[syncPaperBalance] unexpected error:", err);
  }
}
