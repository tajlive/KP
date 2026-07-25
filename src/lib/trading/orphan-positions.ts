/**
 * Orphan-posisjoner: stoppede sesjoner etterlater åpne posisjoner som
 * aldri tickes — exit-logikken (trailing TP / time-exit / partial TP)
 * kjører kun på aktive sesjoner. Resultat: posisjoner som ALDRI selges.
 *
 * Redning: når en ny aktiv sesjon finnes/opprettes for samme bruker+par,
 * slås orphan-posisjonene sammen (FIFO-lots og kostgrunnlag bevares) og
 * flyttes til den aktive sesjonen. Exit-logikken overtar derfra.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { normalizePair } from "./pair";
import type { StrategyPosition } from "./strategies/types";

type Db = SupabaseClient<Database>;

/**
 * Slår sammen flere åpne posisjoner til én.
 * - quantity: sum
 * - entry_price: vektet snitt (kostgrunnlag)
 * - entry_time: tidligste (time-exit regner fra første kjøp)
 * - highest_price: maks (trailing TP må ikke nullstilles)
 * - lots: konkateneres sortert på tid (FIFO-rekkefølge bevares)
 */
export function mergeOrphanPositions(
  positions: StrategyPosition[],
): StrategyPosition | null {
  if (positions.length === 0) return null;

  let totalQty = 0;
  let weightedCost = 0;
  let earliest = positions[0].entry_time;
  let highest = 0;
  const allLots: NonNullable<StrategyPosition["lots"]> = [];
  let anyLots = false;

  for (const pos of positions) {
    totalQty += pos.quantity;
    weightedCost += pos.quantity * pos.entry_price;
    if (pos.entry_time < earliest) earliest = pos.entry_time;
    if (pos.highest_price && pos.highest_price > highest) {
      highest = pos.highest_price;
    }
    if (pos.lots && pos.lots.length > 0) {
      anyLots = true;
      allLots.push(...pos.lots);
    }
  }

  const merged: StrategyPosition = {
    side: positions[0].side,
    quantity: totalQty,
    entry_price: totalQty > 0 ? weightedCost / totalQty : 0,
    entry_time: earliest,
    highest_price: highest > 0 ? highest : undefined,
  };

  if (anyLots) {
    merged.lots = allLots.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  return merged;
}

interface OrphanSessionRow {
  id: string;
  open_position: unknown;
}

/**
 * Finn og adopter orphan-posisjoner for en aktiv sesjon.
 * Returnerer antall adopterte orphan-sesjoner (0 = ingenting å gjøre).
 *
 * Idempotent: orphans nullstilles etter flytting, så re-kjøring er trygg.
 */
export async function adoptOrphanPositions(
  db: Db,
  activeSession: { id: string; user_id: string; trading_pair: string },
): Promise<number> {
  const pair = normalizePair(activeSession.trading_pair);

  // Finn stoppede (ikke-arkiverte) sesjoner m/ åpen posisjon for samme bruker.
  // trading_pair kan forekomme i begge formater ("BTCUSDT"/"BTC/USDT") i
  // eldre data — derfor hentes begge varianter og filtreres normalisert.
  const { data: stopped, error } = await db
    .from("trading_sessions")
    .select("id, trading_pair, open_position")
    .eq("user_id", activeSession.user_id)
    .eq("status", "stopped")
    .eq("archived", false)
    .not("open_position", "is", null);

  if (error || !stopped || stopped.length === 0) return 0;

  const orphans = (stopped as unknown as (OrphanSessionRow & {
    trading_pair: string;
  })[]).filter((s) => normalizePair(s.trading_pair) === pair);

  if (orphans.length === 0) return 0;

  const positions = orphans.map(
    (o) => o.open_position as StrategyPosition,
  );
  const merged = mergeOrphanPositions(positions);
  if (!merged) return 0;

  // Flytt sammenslått posisjon til den aktive sesjonen.
  // Bevar eksisterende highest_price hvis den er høyere (posisjonen kan
  // allerede ha ticket opp en topp).
  const { data: current } = await db
    .from("trading_sessions")
    .select("open_position")
    .eq("id", activeSession.id)
    .single();

  const existing = current?.open_position as StrategyPosition | null;
  const finalPosition = existing
    ? (mergeOrphanPositions([existing, merged]) ?? merged)
    : merged;

  const { error: updateError } = await db
    .from("trading_sessions")
    .update({ open_position: finalPosition as never })
    .eq("id", activeSession.id);

  if (updateError) {
    console.error(
      `[Orphan] Kunne ikke adoptere posisjon til sesjon ${activeSession.id}:`,
      updateError,
    );
    return 0;
  }

  // Nullstill orphans — posisjonen er nå eid av den aktive sesjonen.
  const orphanIds = orphans.map((o) => o.id);
  const { error: clearError } = await db
    .from("trading_sessions")
    .update({ open_position: null as never })
    .in("id", orphanIds);

  if (clearError) {
    console.error(
      `[Orphan] Posisjon adoptert, men nullstilling av orphans feilet:`,
      clearError,
    );
  }

  console.info(
    `[Orphan] Adopterte ${orphans.length} orphan-posisjon(er) til sesjon ${activeSession.id} (${pair})`,
  );
  return orphans.length;
}
