/**
 * paper-account-sync.ts
 *
 * Synkroniserer paper_accounts.current_balance med faktisk kapital fra
 * trading_sessions. Kalles etter hver trade for å holde kontobalansen
 * i sync — slik at dashboard og trade-side viser riktige tall.
 *
 * Arkitektur-sannhet #1: paper_accounts.current_balance er source of truth.
 *
 * ⚠️  Scope (2026-08-04): active + paused + stopped paper-sesjoner telles
 *     ALLE med. Stoppede sesjoner har fortsatt cash + posisjoner som tilhører
 *     brukeren — de er ikke slettet, bare stoppet (Tom-bevis: 9 578 vs
 *     199 198 kr når kun 'active' ble telt). Matcher
 *     klarpakke_hourly_balance_sync og portfolio/summary.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Beregn total kapital på tvers av alle aktive/pausede/stoppede
 * paper-sesjoner for én bruker, og skriv resultatet tilbake til
 * paper_accounts.current_balance.
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
      .in("status", ["active", "paused", "stopped"]);

    if (sessionError) {
      console.warn("[syncPaperBalance] session fetch error:", sessionError.message);
      return;
    }

    const totalCapital = (sessions ?? []).reduce(
      (sum, s) => sum + Number(s.current_capital_nok ?? 0), 0);
    const totalInitial = (sessions ?? []).reduce(
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
