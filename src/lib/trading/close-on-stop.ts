/**
 * Close-on-stop: selg åpen posisjon automatisk når en sesjon stoppes.
 *
 * DEFAULT PÅ — avanserte brukere kan skru det av med
 * strategy_config.close_on_stop = false.
 *
 * Bakgrunn: uten dette forlates posisjonen (orphan) og selges ALDRI,
 * fordi exit-logikken i tick kun kjører på aktive sesjoner.
 * Brukeren får alltid en læringsforklaring med resultatet — Klarpakke
 * lærer mens vi automatiserer.
 *
 * Scope: kun paper-modus. Live-salg krever ekte børs-executor og er
 * bevisst utelatt (returnerer "live_not_supported").
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { normalizePair } from "./pair";
import { usdtToNok } from "./currency";
import {
  createLedger,
  migrateFromLegacy,
  sellFIFO,
  type LedgerState,
} from "./position-ledger";
import type { StrategyPosition } from "./strategies/types";

type Db = SupabaseClient<Database>;

const SLIPPAGE = 0.0005; // samme som tick-motoren
const FEE_RATE = 0.001; // samme antatte fee som paper-executor

export interface CloseOnStopSession {
  id: string;
  user_id: string;
  trading_pair: string;
  mode: string;
  strategy_config: Record<string, unknown> | null;
  open_position: StrategyPosition | null;
}

export interface CloseOnStopDeps {
  /** Nåværende pris i USDT (fra market-data-provider). */
  priceUsdt: number;
  /** USDT→NOK-kurs. */
  rate: number;
}

export interface CloseOnStopResult {
  closed: boolean;
  reason?:
    | "no_position"
    | "disabled_by_config"
    | "live_not_supported"
    | "capital_credit_failed"
    | "error";
  tradeId?: string;
  realizedPnl?: number;
  explanation?: string;
}

/** close_on_stop er TRUE som default — kun eksplisitt false skrur av. */
export function isCloseOnStopEnabled(
  config: Record<string, unknown> | null | undefined,
): boolean {
  return config?.close_on_stop !== false;
}

export function buildCloseOnStopExplanation(input: {
  pair: string;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  realizedPnl: number;
  pnlPct: number;
  daysHeld: number;
  locale?: string;
}): string {
  const { pair, quantity, entryPrice, exitPrice, realizedPnl, pnlPct, daysHeld } = input;
  const base = pair.replace(/USDT$/, "");
  const sign = realizedPnl >= 0 ? "+" : "−";
  const pnlAbs = Math.abs(Math.round(realizedPnl));
  const pct = pnlPct.toFixed(1).replace(".", ",");
  const days = daysHeld.toFixed(1).replace(".", ",");

  if (input.locale === "en") {
    const lesson =
      realizedPnl >= 0
        ? "Lesson: closing in profit locks in the gain — unrealized profit is not yours until you sell."
        : "Lesson: cutting a loss limits the downside — holding a losing position unmanaged rarely ends well.";
    return (
      `Bot stopped with an open position — sold automatically (close-on-stop). ` +
      `Result: ${sign}${pnlAbs} kr (${sign}${pct.replace(",", ".")}%) on ${quantity} ${base} ` +
      `held for ${days.replace(",", ".")} days (entry ${Math.round(entryPrice).toLocaleString("en-US")} kr, exit ${Math.round(exitPrice).toLocaleString("en-US")} kr). ` +
      lesson
    );
  }

  const lesson =
    realizedPnl >= 0
      ? "Læringspoeng: Å selge i gevinst sikrer gevinsten — urealisert gevinst er ikke din før du selger."
      : "Læringspoeng: Å begrense tapet beskytter kontoen — en uovervåket posisjon i minus ender sjelden godt.";
  return (
    `Bot stoppet med åpen posisjon — solgt automatisk (close-on-stop). ` +
    `Resultat: ${sign}${pnlAbs} kr (${sign}${pct} %) på ${quantity} ${base} ` +
    `holdt i ${days} dager (inngang ${Math.round(entryPrice).toLocaleString("nb-NO")} kr, utgang ${Math.round(exitPrice).toLocaleString("nb-NO")} kr). ` +
    lesson
  );
}

/**
 * Selg hele den åpne posisjonen til markedspris (paper).
 * Idempotent nok: posisjonen nullstilles etter salg, så et gjentatt
 * kall treffer "no_position".
 */
export async function closeSessionPositionOnStop(
  db: Db,
  session: CloseOnStopSession,
  deps: CloseOnStopDeps,
): Promise<CloseOnStopResult> {
  const position = session.open_position;
  if (!position || !position.quantity || position.quantity <= 0) {
    return { closed: false, reason: "no_position" };
  }

  if (!isCloseOnStopEnabled(session.strategy_config)) {
    return { closed: false, reason: "disabled_by_config" };
  }

  if (session.mode !== "paper") {
    return { closed: false, reason: "live_not_supported" };
  }

  try {
    const pair = normalizePair(session.trading_pair);
    const exitPrice = usdtToNok(deps.priceUsdt * (1 - SLIPPAGE), deps.rate);
    const quantity = position.quantity;
    const totalValue = quantity * exitPrice;
    const fee = totalValue * FEE_RATE;

    // FIFO realisert P&L fra kostgrunnlaget
    const ledger: LedgerState = position.lots
      ? { side: position.side || "long", lots: position.lots }
      : position
        ? migrateFromLegacy(position)
        : createLedger("long");
    const sellResult = sellFIFO(ledger, quantity, exitPrice);
    const realizedPnl = Math.round(sellResult.realizedPnl * 100) / 100;

    const entryPrice = position.entry_price;
    const pnlPct =
      entryPrice > 0 ? ((exitPrice - entryPrice) / entryPrice) * 100 : 0;
    const daysHeld =
      (Date.now() - new Date(position.entry_time).getTime()) /
      (1000 * 60 * 60 * 24);

    const explanation = buildCloseOnStopExplanation({
      pair,
      quantity,
      entryPrice,
      exitPrice,
      realizedPnl,
      pnlPct,
      daysHeld,
      locale: "no",
    });

    // 1. Bokfør salgstrade (speiler tick-motorens insert)
    const { data: trade, error: tradeError } = await db
      .from("trades")
      .insert({
        session_id: session.id,
        user_id: session.user_id,
        idempotency_key: `close-on-stop-${session.id}-${Date.now()}`,
        mode: "paper",
        trading_pair: session.trading_pair,
        symbol: pair,
        side: "sell",
        order_type: "market",
        quantity,
        filled_quantity: quantity,
        price: exitPrice,
        total_value: totalValue,
        fee,
        status: "filled",
        realized_pnl: realizedPnl,
        strategy_signal: {
          source: "close_on_stop",
          explanation,
        },
        reason_code: "close_on_stop",
        reason_params: {
          entry_price: entryPrice,
          exit_price: exitPrice,
          pnl_pct: pnlPct,
          days_held: daysHeld,
        },
        executed_at: new Date().toISOString(),
      } as never)
      .select("id")
      .single();

    if (tradeError) {
      console.error("[CloseOnStop] Trade insert feilet:", tradeError);
      return { closed: false, reason: "error" };
    }

    // 2. Kredittér kapital (samme RPC som tick-salg — p_user_id er
    // PÅKREVD i SQL-signaturen; uten den feiler RPC-en alltid).
    // Feiler krediteringen, ABORTER vi: posisjonen nullstilles IKKE og
    // closed rapporteres IKKE som true — ellers ville traden ligge som
    // solgt mens kapitalen aldri ble kreditert (stille pengefeil).
    // NB: traden er allerede bokført (steg 1), så dette krever
    // oppmerksomhet — derfor egen reason og høylytt logging.
    const { error: capitalError } = await db.rpc("increment_capital", {
      p_session_id: session.id,
      p_amount: totalValue - fee,
      p_user_id: session.user_id,
    } as never);
    if (capitalError) {
      console.error(
        "[CloseOnStop] KRITISK: Trade bokført, men kapital-kreditering " +
          `feilet for sesjon ${session.id} (trade ${trade?.id}). ` +
          "Posisjonen er bevart — manuell oppfølging kreves.",
        capitalError,
      );
      return {
        closed: false,
        reason: "capital_credit_failed",
        tradeId: trade?.id,
      };
    }

    // 3. Nullstill posisjonen (først ETTER at kapitalen er kreditert —
    // ellers kan salget aldri gjentas uten dobbeltkreditering)
    const { error: clearError } = await db
      .from("trading_sessions")
      .update({ open_position: null as never })
      .eq("id", session.id);
    if (clearError) {
      // Kapital er kreditert — posisjonen MÅ ikke selges på nytt.
      // Logg høylytt; neste stopp-forsøk vil treffe no_position kun
      // hvis nullstillingen likevel gikk gjennom.
      console.error(
        "[CloseOnStop] KRITISK: Kapital kreditert, men posisjon-" +
          `nullstilling feilet for sesjon ${session.id} — risiko for ` +
          "dobbeltsalg ved neste forsøk.",
        clearError,
      );
    }

    // 4. Audit-logg
    try {
      await db.from("trading_logs").insert({
        session_id: session.id,
        user_id: session.user_id,
        action: "close_on_stop",
        details: {
          trade_id: trade?.id,
          realized_pnl: realizedPnl,
          pnl_pct: pnlPct,
          days_held: daysHeld,
        } as never,
      } as never);
    } catch {
      // Ikke kritisk
    }

    return {
      closed: true,
      tradeId: trade?.id,
      realizedPnl,
      explanation,
    };
  } catch (err) {
    console.error("[CloseOnStop] Uventet feil:", (err as Error).message);
    return { closed: false, reason: "error" };
  }
}
