/**
 * paper-account-sync.ts
 *
 * Synkroniserer paper_accounts.current_balance med faktisk kapital fra
 * KUN aktive trading_sessions. Kalles etter hver trade for å holde
 * kontobalansen i sync — slik at dashboard og trade-side viser riktige tall.
 *
 * Arkitektur-sannhet #1: paper_accounts.current_balance er source of truth.
 * Denne garantien opprettholdes KUN hvis vi synkroniserer aktivt.
 *
 * ⚠️  Pausede/stoppete sesjoner telles IKKE — de representerer ikke aktiv
 *     kapital. Dette var tidligere en kilde til dobbel balansevisning.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Beregn total kapital på tvers av alle AKTIVE paper-sesjoner for én bruker,
 * og skriv resultatet tilbake til paper_accounts.current_balance.
 */
export async function syncPaperAccountBalance(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  try {
    // Kun aktive sesjoner — pausede/stoppete telles ikke
    const { data: sessions, error: sessionError } = await supabase
      .from("trading_sessions")
      .select("current_capital_nok")
      .eq("user_id", userId)
      .eq("mode", "paper")
      .eq("status", "active");

    if (sessionError) {
      console.warn("[syncPaperBalance] session fetch error:", sessionError.message);
      return;
    }

    // Summer kapital: kun aktive sesjoner
    const totalCapital = (sessions ?? []).reduce(
      (sum, s) => sum + Number(s.current_capital_nok ?? 0), 0);

    if (!Number.isFinite(totalCapital) || totalCapital <= 0) {
      return; // Ingen gyldige sesjoner — ikke oppdater
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
