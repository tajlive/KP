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
import type { Database } from "@/types/database.types";
import { normalizePair } from "./pair";
import type { StrategyPosition } from "./strategies/types";
import {
  getPositionBaseQuantity,
  isPositionEntryPlausible,
  normalizePositionPricesToUsdt,
  type StoredPositionLike,
} from "./position-currency";

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

export interface OrphanAdoptionMarketContext {
  currentPriceUsdt: number;
  usdtNokRate: number;
}

export interface OrphanAdoptionResult {
  adopted: number;
  dropped: number;
}

/**
 * Finn og adopter orphan-posisjoner for en aktiv sesjon.
 *
 * Idempotent: orphans nullstilles etter flytting, så re-kjøring er trygg.
 *
 * Inflasjonsfiks 2026-07-27: orphans kan inneholde NOK-denominerte eller
 * rene korrupte priser (eks. entry 4,5k mot marked 64,5k fra ødelagt
 * pris-historikk). Slike posisjoner ga falske trailing-salg som printet
 * penger. Derfor:
 *  - korrupte posisjoner (entry >90 % under marked, eller ugyldig qty/pris)
 *    droppes: nullstilles + logges til trading_logs, adopteres ALDRI
 *  - NOK-denominerte prisfelt normaliseres til USDT før sammenslåing
 * Når `market` ikke oppgis, beholdes legacy-oppførsel (ingen validering) —
 * men alle produksjonskallere bør sende markedscontext.
 */
export async function adoptOrphanPositions(
  db: Db,
  activeSession: { id: string; user_id: string; trading_pair: string },
  market?: OrphanAdoptionMarketContext,
): Promise<OrphanAdoptionResult> {
  const none: OrphanAdoptionResult = { adopted: 0, dropped: 0 };
  const pair = normalizePair(activeSession.trading_pair);

  // Finn ALLE stoppede sesjoner m/ åpen posisjon for samme bruker —
  // også arkiverte. Stopp-flyten (api/trading-sessions/[id]/status)
  // setter archived=true ved stopp, så et archived=false-filter ville
  // utelukket akkurat de orphanene som produseres av hovedflyten
  // (bruker stopper bot med close_on_stop=av). Filteret på
  // status="stopped" er tilstrekkelig: aktive/pausede sesjoner eier
  // sine posisjoner selv, og adopsjon fra dem ville vært feil.
  // trading_pair kan forekomme i begge formater ("BTCUSDT"/"BTC/USDT") i
  // eldre data — derfor hentes begge varianter og filtreres normalisert.
  const { data: stopped, error } = await db
    .from("trading_sessions")
    .select("id, trading_pair, open_position")
    .eq("user_id", activeSession.user_id)
    .eq("status", "stopped")
    .not("open_position", "is", null);

  if (error || !stopped || stopped.length === 0) return none;

  const orphans = (stopped as unknown as (OrphanSessionRow & {
    trading_pair: string;
  })[]).filter((s) => normalizePair(s.trading_pair) === pair);

  if (orphans.length === 0) return none;

  // ── Verifisering + normalisering per orphan (inflasjonsfiks) ──────────
  const adoptablePositions: StrategyPosition[] = [];
  const adoptedIds: string[] = [];
  const droppedIds: string[] = [];

  for (const orphan of orphans) {
    const pos = orphan.open_position as StrategyPosition | null;
    const qty = getPositionBaseQuantity(pos as StoredPositionLike | null);
    const entryPrice = Number(pos?.entry_price);

    if (!pos || qty <= 0 || !(entryPrice > 0)) {
      // Ubrukelig posisjonsobjekt — datarus.
      droppedIds.push(orphan.id);
      continue;
    }

    if (
      market &&
      market.currentPriceUsdt > 0 &&
      !isPositionEntryPlausible(entryPrice, market.currentPriceUsdt)
    ) {
      // Korrupt kostgrunnlag — adopter ALDRI. Nullstill + logg slik at
      // datarus ikke sirkuleres videre til nye sesjoner.
      droppedIds.push(orphan.id);
      try {
        await db.from("trading_logs").insert({
          session_id: activeSession.id,
          user_id: activeSession.user_id,
          action: "orphan_dropped_corrupt",
          details: {
            orphan_session_id: orphan.id,
            entry_price: entryPrice,
            quantity: qty,
            current_price_usdt: market.currentPriceUsdt,
          } as never,
        } as never);
      } catch {
        // Ikke kritisk: logging skal ikke stoppe adopsjon
      }
      continue;
    }

    // NOK-denominerte prisfelt → USDT (trades lagres NOK for paper,
    // triggeren kopierer det rett inn i open_position).
    const normalized = market
      ? normalizePositionPricesToUsdt(
          pos as StoredPositionLike,
          market.currentPriceUsdt,
          market.usdtNokRate,
        )
      : (pos as StoredPositionLike);

    adoptablePositions.push(normalized as StrategyPosition);
    adoptedIds.push(orphan.id);
  }

  // Droppede orphans nullstilles alltid — de er datarus uansett.
  if (droppedIds.length > 0) {
    const { error: dropError } = await db
      .from("trading_sessions")
      .update({ open_position: null as never })
      .in("id", droppedIds);
    if (dropError) {
      console.error("[Orphan] Nullstilling av korrupte orphans feilet:", dropError);
    } else if (droppedIds.length > 0) {
      console.info(
        `[Orphan] Droppet ${droppedIds.length} korrupt(e) orphan-posisjon(er) for bruker ${activeSession.user_id} (${pair})`,
      );
    }
  }

  const merged = mergeOrphanPositions(adoptablePositions);
  if (!merged) return { adopted: 0, dropped: droppedIds.length };

  // Flytt sammenslått posisjon til den aktive sesjonen.
  // Bevar eksisterende highest_price hvis den er høyere (posisjonen kan
  // allerede ha ticket opp en topp).
  const { data: current } = await db
    .from("trading_sessions")
    .select("open_position")
    .eq("id", activeSession.id)
    .single();

  const existingRaw = current?.open_position as StrategyPosition | null;
  const existing =
    existingRaw && market
      ? (normalizePositionPricesToUsdt(
          existingRaw as StoredPositionLike,
          market.currentPriceUsdt,
          market.usdtNokRate,
        ) as StrategyPosition)
      : existingRaw;
  const finalPosition = existing
    ? (mergeOrphanPositions([existing, merged]) ?? merged)
    : merged;

  // ── Valuta-kontrakt (2026-08-03) ─────────────────────────────────────────
  // DB-guard fn_guard_session_position_symbol krever at entry_price er NOK
  // (BTC > 100 000 etc.). Internt over har vi normalisert til USDT for
  // korrekt sammenligning/merging — før lagring konverteres prisfeltene
  // TILBAKE til NOK. Ellers dobbeltkonverteres posisjonen ved neste tick
  // (adopsjon kjører hver tick): 1,79 NOK → 0,189 USDT → lagret som 0,0681
  // etter gjentatte delinger. Prod-bevis: Toms ADA entry 0,0681.
  const rate = market?.usdtNokRate ?? 0;
  const finalPositionNok =
    rate > 1
      ? ({
          ...finalPosition,
          entry_price:
            typeof finalPosition.entry_price === "number"
              ? finalPosition.entry_price * rate
              : finalPosition.entry_price,
          highest_price:
            typeof finalPosition.highest_price === "number"
              ? finalPosition.highest_price * rate
              : finalPosition.highest_price,
          lots: Array.isArray(finalPosition.lots)
            ? finalPosition.lots.map((lot) => ({
                ...lot,
                entryPrice:
                  typeof lot?.entryPrice === "number"
                    ? lot.entryPrice * rate
                    : lot?.entryPrice,
              }))
            : finalPosition.lots,
        } as StrategyPosition)
      : finalPosition;

  const { error: updateError } = await db
    .from("trading_sessions")
    .update({ open_position: finalPositionNok as never })
    .eq("id", activeSession.id);

  if (updateError) {
    console.error(
      `[Orphan] Kunne ikke adoptere posisjon til sesjon ${activeSession.id}:`,
      updateError,
    );
    return { adopted: 0, dropped: droppedIds.length };
  }

  // Nullstill adopterte orphans — posisjonen er nå eid av den aktive sesjonen.
  if (adoptedIds.length > 0) {
    const { error: clearError } = await db
      .from("trading_sessions")
      .update({ open_position: null as never })
      .in("id", adoptedIds);

    if (clearError) {
      console.error(
        `[Orphan] Posisjon adoptert, men nullstilling av orphans feilet:`,
        clearError,
      );
    }
  }

  console.info(
    `[Orphan] Adopterte ${adoptedIds.length} orphan-posisjon(er) til sesjon ${activeSession.id} (${pair})`,
  );
  return { adopted: adoptedIds.length, dropped: droppedIds.length };
}
