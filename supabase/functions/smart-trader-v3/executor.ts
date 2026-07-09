/**
 * Trade-executor — oppretter handler og oppdaterer sessions.
 */

import type { SignalResult, SmartTraderConfig } from "./types.ts";
import { validateBuyRisk, checkPositionExit, calculatePositionSize, buildRiskSnapshot } from "./risk.ts";

interface SupabaseClient {
  from: (table: string) => any;
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
}

/** Utfør en trade basert på signal, hvis risikogodkjent */
export async function executeTrade(
  supabase: SupabaseClient,
  session: SessionRow,
  signal: SignalResult,
  config: SmartTraderConfig,
  currentPrice: number,
): Promise<{ executed: boolean; reason?: string }> {
  if (signal.direction === 'hold') {
    return { executed: false, reason: 'Hold-signal — ingen handling' };
  }

  const capital = Number(session.current_capital_nok ?? 0);

  // Kjøp
  if (signal.direction === 'buy') {
    const risk = validateBuyRisk(config, capital, currentPrice);
    if (!risk.allowed) {
      await logEvent(supabase, session, 'trade_skipped', {
        reason: risk.reason,
        signal,
      });
      return { executed: false, reason: risk.reason };
    }

    const quantity = calculatePositionSize(capital, currentPrice, config);
    if (quantity <= 0) {
      return { executed: false, reason: 'Posisjonsstørrelse for lav' };
    }

    const totalValue = quantity * currentPrice;
    const fee = totalValue * 0.001; // 0.1% fee

    // Opprett trade
    await supabase.from('trades').insert({
      session_id: session.id,
      user_id: session.user_id,
      mode: 'paper',
      trading_pair: session.trading_pair,
      side: 'buy',
      order_type: 'market',
      quantity,
      price: currentPrice,
      total_value: totalValue,
      fee,
      status: 'filled',
      strategy_signal: signal,
      indicator_snapshot: signal.indicators,
      idempotency_key: `smart-trader-${session.id}-${Date.now()}`,
      executed_at: new Date().toISOString(),
    });

    // Oppdater session
    const newCapital = capital - totalValue - fee;
    await supabase
      .from('trading_sessions')
      .update({
        current_capital_nok: newCapital,
        open_position: {
          side: 'buy',
          entry_price: currentPrice,
          quantity,
          total_value: totalValue,
          stop_loss: risk.stopLossPrice,
          take_profit: risk.takeProfitPrice,
          entered_at: new Date().toISOString(),
        },
        total_trades: (session.total_trades || 0) + 1,
      })
      .eq('id', session.id);

    await logEvent(supabase, session, 'trade_executed', {
      side: 'buy',
      quantity,
      price: currentPrice,
      totalValue,
      stopLoss: risk.stopLossPrice,
      takeProfit: risk.takeProfitPrice,
      confidence: signal.confidence,
      reasons: signal.reasons,
    });

    return { executed: true };
  }

  // Salg — sjekk om vi har åpen posisjon
  if (signal.direction === 'sell' && session.open_position) {
    const position = session.open_position as Record<string, unknown>;
    const entryPrice = Number(position.entry_price ?? 0);
    const quantity = Number(position.quantity ?? 0);

    if (entryPrice <= 0 || quantity <= 0) {
      return { executed: false, reason: 'Ingen åpen posisjon å selge' };
    }

    const totalValue = quantity * currentPrice;
    const fee = totalValue * 0.001;
    const realizedPnl = totalValue - (quantity * entryPrice) - fee;

    await supabase.from('trades').insert({
      session_id: session.id,
      user_id: session.user_id,
      mode: 'paper',
      trading_pair: session.trading_pair,
      side: 'sell',
      order_type: 'market',
      quantity,
      price: currentPrice,
      total_value: totalValue,
      fee,
      realized_pnl: realizedPnl,
      status: 'filled',
      strategy_signal: signal,
      indicator_snapshot: signal.indicators,
      idempotency_key: `smart-trader-${session.id}-${Date.now()}`,
      executed_at: new Date().toISOString(),
    });

    // Oppdater session
    const newCapital = (capital || 0) + totalValue - fee;
    const isWin = realizedPnl > 0;

    await supabase
      .from('trading_sessions')
      .update({
        current_capital_nok: newCapital,
        open_position: null,
        total_pnl: ((session.total_trades || 0) + 1) > 0
          ? supabase.rpc('coalesce', {
              a: (session.total_pnl || 0) + realizedPnl,
              b: realizedPnl,
            })
          : realizedPnl,
        total_trades: (session.total_trades || 0) + 1,
        winning_trades: isWin
          ? (session.winning_trades || 0) + 1
          : (session.winning_trades || 0),
        losing_trades: !isWin
          ? (session.losing_trades || 0) + 1
          : (session.losing_trades || 0),
      })
      .eq('id', session.id);

    await logEvent(supabase, session, 'trade_executed', {
      side: 'sell',
      quantity,
      price: currentPrice,
      realizedPnl,
      isWin,
      reasons: signal.reasons,
    });

    return { executed: true };
  }

  return { executed: false, reason: 'Salg-signal men ingen åpen posisjon' };
}

/** Sjekk om en åpen posisjon skal lukkes via SL/TP */
export async function checkAndClosePosition(
  supabase: SupabaseClient,
  session: SessionRow,
  currentPrice: number,
  config: SmartTraderConfig,
): Promise<{ closed: boolean; reason?: string }> {
  if (!session.open_position) {
    return { closed: false, reason: 'Ingen åpen posisjon' };
  }

  const position = session.open_position as Record<string, unknown>;
  const entryPrice = Number(position.entry_price ?? 0);

  if (entryPrice <= 0) {
    return { closed: false, reason: 'Ugyldig inngangspris' };
  }

  const exitSignal = checkPositionExit(entryPrice, currentPrice, config);

  if (exitSignal === 'hold') {
    return { closed: false, reason: 'Ingen SL/TP trigget' };
  }

  // Lukk posisjonen
  const quantity = Number(position.quantity ?? 0);
  const totalValue = quantity * currentPrice;
  const fee = totalValue * 0.001;
  const realizedPnl = totalValue - (quantity * entryPrice) - fee;
  const capital = Number(session.current_capital_nok ?? 0);

  await supabase.from('trades').insert({
    session_id: session.id,
    user_id: session.user_id,
    mode: 'paper',
    trading_pair: session.trading_pair,
    side: 'sell',
    order_type: 'market',
    quantity,
    price: currentPrice,
    total_value: totalValue,
    fee,
    realized_pnl: realizedPnl,
    status: 'filled',
    strategy_signal: { direction: 'sell', confidence: 100, reasons: [exitSignal === 'stop_loss' ? 'Stop-loss trigget' : 'Take-profit trigget'] },
    idempotency_key: `smart-trader-sl-tp-${session.id}-${Date.now()}`,
    executed_at: new Date().toISOString(),
  });

  await supabase
    .from('trading_sessions')
    .update({
      current_capital_nok: capital + totalValue - fee,
      open_position: null,
      total_pnl: (session.total_trades || 0) > 0
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
    .eq('id', session.id);

  await logEvent(supabase, session, exitSignal === 'stop_loss' ? 'stop_loss' : 'take_profit', {
    entryPrice,
    exitPrice: currentPrice,
    realizedPnl,
    pnlPct: ((currentPrice - entryPrice) / entryPrice) * 100,
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
    await supabase.from('smart_trader_log').insert({
      session_id: session.id,
      user_id: session.user_id,
      event_type: eventType,
      details,
    });
  } catch {
    // Ikke blokkér trade pga. loggfeil
    console.error('[SmartTrader] Loggfeil:', eventType);
  }
}
