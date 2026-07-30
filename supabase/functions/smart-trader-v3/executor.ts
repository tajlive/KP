/**
 * Trade-executor — oppretter handler og oppdaterer sessions.
 *
 * FIKS 2026-07-30:
 * - Alle paper-priser konverteres USDT → NOK før posisjonsberegning.
 * - open_position lagrer nå symbol; selg/SL/TP avvises hvis posisjonen
 *   tilhører et annet par enn session.trading_pair.
 * - Harde tak på trade-verdi for å forhindre inflasjon.
 */

import type { SignalResult, SmartTraderConfig } from "./types.ts";
import { validateBuyRisk, checkPositionExit, calculatePositionSize } from "./risk.ts";

interface SupabaseClient {
  from: (table: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => any;
}

interface SessionRow {
  id: string;
  user_id: string;
  trading_pair: string;
  current_capital_nok: number | null;
  starting_capital_nok: number | null;
  open_position: Record<string, unknown> | null;
  status: string;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  total_pnl: number;
}

const DEFAULT_USDT_NOK_RATE = 10.5;
const MAX_TRADE_VALUE_CAPITAL_PCT = 0.5; // trade-verdi kan aldri overstige 50 % av capital

async function getUsdtToNokRate(supabase: SupabaseClient): Promise<number> {
  try {
    const { data } = await supabase
      .from("coin_prices")
      .select("price_usd")
      .eq("symbol", "USDTNOK")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const rate = data?.price_usd ? Number(data.price_usd) : 0;
    if (rate > 0) return rate;
  } catch {
    // fallthrough
  }
  // Fallback: siste rate fra trades
  try {
    const { data } = await supabase
      .from("trades")
      .select("usdt_nok_rate")
      .not("usdt_nok_rate", "is", null)
      .order("executed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const rate = data?.usdt_nok_rate ? Number(data.usdt_nok_rate) : 0;
    if (rate > 0) return rate;
  } catch {
    // fallthrough
  }
  return DEFAULT_USDT_NOK_RATE;
}

function priceToNok(priceUsdt: number, rate: number): number {
  return priceUsdt * (rate > 0 ? rate : DEFAULT_USDT_NOK_RATE);
}

/** Gjetter paret fra entry_price (for bakoverkompatibilitet med gamle posisjoner). */
function inferSymbolFromEntryPrice(entryPrice: number): string | null {
  if (entryPrice > 200_000) return "BTCUSDT";
  if (entryPrice > 5_000) return "ETHUSDT";
  if (entryPrice > 200) return "SOLUSDT";
  if (entryPrice > 10) return "LINKUSDT";
  if (entryPrice > 5) return "AVAXUSDT";
  if (entryPrice > 1) return "DOTUSDT";
  if (entryPrice > 0.1) return "ADAUSDT";
  return "DOGEUSDT";
}

function isPositionSymbolMismatch(
  session: SessionRow,
  position: Record<string, unknown>,
): boolean {
  const positionSymbol = position.symbol as string | undefined;
  if (positionSymbol) {
    return positionSymbol !== session.trading_pair;
  }
  // Bakoverkompatibel: gjetter fra entry_price
  const entryPrice = Number(position.entry_price ?? 0);
  const inferred = inferSymbolFromEntryPrice(entryPrice);
  return inferred !== null && inferred !== session.trading_pair;
}

/** Utfør en trade basert på signal, hvis risikogodkjent */
export async function executeTrade(
  supabase: SupabaseClient,
  session: SessionRow,
  signal: SignalResult,
  config: SmartTraderConfig,
  currentPriceUsdt: number,
): Promise<{ executed: boolean; reason?: string }> {
  if (signal.direction === "hold") {
    return { executed: false, reason: "Hold-signal — ingen handling" };
  }

  const rate = await getUsdtToNokRate(supabase);
  const currentPriceNok = priceToNok(currentPriceUsdt, rate);
  const capital = Number(session.current_capital_nok ?? 0);

  // Kjøp
  if (signal.direction === "buy") {
    const risk = validateBuyRisk(config, capital, currentPriceNok);
    if (!risk.allowed) {
      await logEvent(supabase, session, "trade_skipped", {
        reason: risk.reason,
        signal,
      });
      return { executed: false, reason: risk.reason };
    }

    const quantity = calculatePositionSize(capital, currentPriceNok, config);
    if (quantity <= 0) {
      return { executed: false, reason: "Posisjonsstørrelse for lav" };
    }

    const totalValueNok = quantity * currentPriceNok;
    const feeNok = totalValueNok * 0.001; // 0.1% fee
    const maxAllowedValue = capital * MAX_TRADE_VALUE_CAPITAL_PCT;

    if (totalValueNok > maxAllowedValue || totalValueNok <= 0) {
      await logEvent(supabase, session, "trade_skipped", {
        reason: `Trade-verdi ${totalValueNok.toFixed(2)} NOK overstiger maks ${maxAllowedValue.toFixed(2)} NOK`,
        signal,
        quantity,
        currentPriceNok,
        capital,
      });
      return {
        executed: false,
        reason: "Trade-verdi overstiger sikkerhetsgrense",
      };
    }

    // Opprett trade
    await supabase.from("trades").insert({
      session_id: session.id,
      user_id: session.user_id,
      mode: "paper",
      trading_pair: session.trading_pair,
      side: "buy",
      order_type: "market",
      quantity,
      price: currentPriceNok,
      total_value: totalValueNok,
      fee: feeNok,
      status: "filled",
      usdt_nok_rate: rate,
      strategy_signal: signal,
      indicator_snapshot: signal.indicators,
      idempotency_key: `smart-trader-${session.id}-${Date.now()}`,
      executed_at: new Date().toISOString(),
    });

    // Oppdater session
    const newCapital = capital - totalValueNok - feeNok;
    await supabase
      .from("trading_sessions")
      .update({
        current_capital_nok: newCapital,
        open_position: {
          symbol: session.trading_pair,
          side: "buy",
          entry_price: currentPriceNok,
          quantity,
          total_value: totalValueNok,
          stop_loss: risk.stopLossPrice,
          take_profit: risk.takeProfitPrice,
          entered_at: new Date().toISOString(),
        },
        total_trades: (session.total_trades || 0) + 1,
      })
      .eq("id", session.id);

    await logEvent(supabase, session, "trade_executed", {
      side: "buy",
      quantity,
      price: currentPriceNok,
      totalValue: totalValueNok,
      stopLoss: risk.stopLossPrice,
      takeProfit: risk.takeProfitPrice,
      confidence: signal.confidence,
      reasons: signal.reasons,
    });

    return { executed: true };
  }

  // Salg — sjekk om vi har åpen posisjon
  if (signal.direction === "sell" && session.open_position) {
    const position = session.open_position as Record<string, unknown>;

    if (isPositionSymbolMismatch(session, position)) {
      const positionSymbol = position.symbol || inferSymbolFromEntryPrice(Number(position.entry_price ?? 0));
      await logEvent(supabase, session, "position_mismatch_cleared", {
        sessionPair: session.trading_pair,
        positionSymbol,
        position,
      });
      await supabase
        .from("trading_sessions")
        .update({ open_position: null, updated_at: new Date().toISOString() })
        .eq("id", session.id);
      return { executed: false, reason: "Posisjonssymbol stemmer ikke overens med trading_pair — tømt" };
    }

    const entryPrice = Number(position.entry_price ?? 0);
    const quantity = Number(position.quantity ?? 0);

    if (entryPrice <= 0 || quantity <= 0) {
      return { executed: false, reason: "Ingen åpen posisjon å selge" };
    }

    const totalValueNok = quantity * currentPriceNok;
    const feeNok = totalValueNok * 0.001;
    const realizedPnl = totalValueNok - quantity * entryPrice - feeNok;
    const maxAllowedValue = capital * MAX_TRADE_VALUE_CAPITAL_PCT;

    if (totalValueNok > maxAllowedValue || totalValueNok <= 0) {
      await logEvent(supabase, session, "trade_skipped", {
        reason: `Salg-verdi ${totalValueNok.toFixed(2)} NOK overstiger maks ${maxAllowedValue.toFixed(2)} NOK`,
        signal,
        quantity,
        currentPriceNok,
        capital,
      });
      return { executed: false, reason: "Salg-verdi overstiger sikkerhetsgrense" };
    }

    await supabase.from("trades").insert({
      session_id: session.id,
      user_id: session.user_id,
      mode: "paper",
      trading_pair: session.trading_pair,
      side: "sell",
      order_type: "market",
      quantity,
      price: currentPriceNok,
      total_value: totalValueNok,
      fee: feeNok,
      realized_pnl: realizedPnl,
      status: "filled",
      usdt_nok_rate: rate,
      strategy_signal: signal,
      indicator_snapshot: signal.indicators,
      idempotency_key: `smart-trader-${session.id}-${Date.now()}`,
      executed_at: new Date().toISOString(),
    });

    // Oppdater session
    const newCapital = (capital || 0) + totalValueNok - feeNok;
    const isWin = realizedPnl > 0;

    await supabase
      .from("trading_sessions")
      .update({
        current_capital_nok: newCapital,
        open_position: null,
        total_pnl:
          ((session.total_trades || 0) + 1) > 0
            ? (session.total_pnl || 0) + realizedPnl
            : realizedPnl,
        total_trades: (session.total_trades || 0) + 1,
        winning_trades: isWin
          ? (session.winning_trades || 0) + 1
          : (session.winning_trades || 0),
        losing_trades: !isWin
          ? (session.losing_trades || 0) + 1
          : (session.losing_trades || 0),
      })
      .eq("id", session.id);

    await logEvent(supabase, session, "trade_executed", {
      side: "sell",
      quantity,
      price: currentPriceNok,
      realizedPnl,
      isWin,
      reasons: signal.reasons,
    });

    return { executed: true };
  }

  return { executed: false, reason: "Salg-signal men ingen åpen posisjon" };
}

/** Sjekk om en åpen posisjon skal lukkes via SL/TP */
export async function checkAndClosePosition(
  supabase: SupabaseClient,
  session: SessionRow,
  currentPriceUsdt: number,
  config: SmartTraderConfig,
): Promise<{ closed: boolean; reason?: string }> {
  if (!session.open_position) {
    return { closed: false, reason: "Ingen åpen posisjon" };
  }

  const position = session.open_position as Record<string, unknown>;

  if (isPositionSymbolMismatch(session, position)) {
    const positionSymbol = position.symbol || inferSymbolFromEntryPrice(Number(position.entry_price ?? 0));
    await logEvent(supabase, session, "position_mismatch_cleared", {
      sessionPair: session.trading_pair,
      positionSymbol,
      position,
    });
    await supabase
      .from("trading_sessions")
      .update({ open_position: null, updated_at: new Date().toISOString() })
      .eq("id", session.id);
    return { closed: false, reason: "Posisjonssymbol stemmer ikke overens — tømt" };
  }

  const entryPrice = Number(position.entry_price ?? 0);

  if (entryPrice <= 0) {
    return { closed: false, reason: "Ugyldig inngangspris" };
  }

  const rate = await getUsdtToNokRate(supabase);
  const currentPriceNok = priceToNok(currentPriceUsdt, rate);
  const exitSignal = checkPositionExit(entryPrice, currentPriceNok, config);

  if (exitSignal === "hold") {
    return { closed: false, reason: "Ingen SL/TP trigget" };
  }

  // Lukk posisjonen
  const quantity = Number(position.quantity ?? 0);
  const totalValueNok = quantity * currentPriceNok;
  const feeNok = totalValueNok * 0.001;
  const realizedPnl = totalValueNok - quantity * entryPrice - feeNok;
  const capital = Number(session.current_capital_nok ?? 0);
  const maxAllowedValue = capital * MAX_TRADE_VALUE_CAPITAL_PCT;

  if (totalValueNok > maxAllowedValue || totalValueNok <= 0) {
    await logEvent(supabase, session, "trade_skipped", {
      reason: `SL/TP-verdi ${totalValueNok.toFixed(2)} NOK overstiger maks ${maxAllowedValue.toFixed(2)} NOK`,
      quantity,
      currentPriceNok,
      capital,
    });
    return { executed: false, reason: "SL/TP-verdi overstiger sikkerhetsgrense" };
  }

  await supabase.from("trades").insert({
    session_id: session.id,
    user_id: session.user_id,
    mode: "paper",
    trading_pair: session.trading_pair,
    side: "sell",
    order_type: "market",
    quantity,
    price: currentPriceNok,
    total_value: totalValueNok,
    fee: feeNok,
    realized_pnl: realizedPnl,
    status: "filled",
    usdt_nok_rate: rate,
    strategy_signal: {
      direction: "sell",
      confidence: 100,
      reasons: [exitSignal === "stop_loss" ? "Stop-loss trigget" : "Take-profit trigget"],
    },
    idempotency_key: `smart-trader-sl-tp-${session.id}-${Date.now()}`,
    executed_at: new Date().toISOString(),
  });

  await supabase
    .from("trading_sessions")
    .update({
      current_capital_nok: capital + totalValueNok - feeNok,
      open_position: null,
      total_pnl:
        (session.total_trades || 0) > 0
          ? (session.total_pnl || 0) + realizedPnl
          : realizedPnl,
      total_trades: (session.total_trades || 0) + 1,
      losing_trades: realizedPnl <= 0
        ? (session.losing_trades || 0) + 1
        : (session.losing_trades || 0),
      winning_trades: realizedPnl > 0
        ? (session.winning_trades || 0) + 1
        : (session.winning_trades || 0),
    })
    .eq("id", session.id);

  await logEvent(supabase, session, exitSignal === "stop_loss" ? "stop_loss" : "take_profit", {
    entryPrice,
    exitPrice: currentPriceNok,
    realizedPnl,
    pnlPct: ((currentPriceNok - entryPrice) / entryPrice) * 100,
  });

  return { closed: true, reason: exitSignal };
}

/** Loggfør bot-aktivitet */
async function logEvent(
  supabase: SupabaseClient,
  session: SessionRow,
  eventType: string,
  details: Record<string, unknown>,
) {
  try {
    await supabase.from("smart_trader_log").insert({
      session_id: session.id,
      user_id: session.user_id,
      event_type: eventType,
      details,
    });
  } catch {
    // Ikke blokkér trade pga. loggfeil
    console.error("[SmartTrader] Loggfeil:", eventType);
  }
}
