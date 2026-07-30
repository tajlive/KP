/**
 * 🎭 JokerTrade v4.1 — AI-drevet papirhandel
 *
 * Hver 15. min: velg tilfeldig auto-bruker → hent ekte pris → analyser → trade.
 * Script-basert cron (0 tokens). Alle handler loggføres med joker_explanation.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { executeTrade } from "@/lib/trading/core/execute-trade";
import type { ExecuteTradeRequest } from "@/types/trading";
import { getNokUsdtRate } from "@/lib/trading/canonical/exchange-rate";
import { calculateRSI as calcRSI, calculateMACD, calculateSMA, calculateBollingerBands } from "@/lib/trading/indicators";
import { generateJokerSignal, type MarketData } from "./signal";
import {
  fetchPriceViaProxy,
  fetchKlinesViaProxy,
  fetch24hChangeViaProxy,
} from "@/lib/trading/canonical/market-data/binance-proxy-provider";

// ---------------------------------------------------------------------------
// Konstanter
// ---------------------------------------------------------------------------

const DEFAULT_CAPITAL = 100_000;
const MIN_POSITION_PCT = 2;
const MAX_POSITION_PCT = 10;
const BASE_POSITION_PCT = 5;
const TOP_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "AVAXUSDT", "DOGEUSDT",
  "LINKUSDT", "ADAUSDT", "DOTUSDT", "UNIUSDT", "MATICUSDT",
];

const FALLBACK_PRICES: Record<string, number> = {
  BTCUSDT: 60000, ETHUSDT: 2500, SOLUSDT: 140, AVAXUSDT: 18, DOGEUSDT: 0.12,
  LINKUSDT: 12, ADAUSDT: 0.45, DOTUSDT: 5.5, UNIUSDT: 7.5, MATICUSDT: 0.55,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dynamicPositionPct(confidence: number, volatility: number): number {
  const volFactor = Math.max(0.3, 1 - (volatility / 200));
  const confFactor = 0.5 + (confidence / 100);
  const pct = BASE_POSITION_PCT * volFactor * confFactor;
  return Math.max(MIN_POSITION_PCT, Math.min(MAX_POSITION_PCT, pct));
}

async function fetchMarketData(symbol: string): Promise<{
  currentPrice: number;
  rsi: number;
  macd: { histogram: number; signal: number; macd: number };
  bollinger: { upper: number; middle: number; lower: number };
  sma10: number;
  sma30: number;
  volatility: number;
  trend: "up" | "down" | "flat";
}> {
  try {
    // Hent sanntidsdata via kanonisk proxy-provider (korrekt auth-headers).
    // Tidligere gikk dette mot GET ?symbol= uten secret → alltid 401 →
    // fallback (RSI 50 / flat) → evig WAIT og null handler.
    const [currentPrice, klines, change24h] = await Promise.all([
      fetchPriceViaProxy(symbol),
      fetchKlinesViaProxy(symbol, "1h", 60) as Promise<unknown[][]>,
      fetch24hChangeViaProxy(symbol),
    ]);
    const prices = (klines ?? [])
      .map((k) => parseFloat(String((k as unknown[])[4]))) // close-pris
      .filter((p) => Number.isFinite(p) && p > 0);
    const rsiArr = prices.length > 14 ? calcRSI(prices, 14) : null; const rsi = rsiArr ? (rsiArr[rsiArr.length-1] ?? 50) : 50;

    // MACD
    const macdData = prices.length > 26 ? calculateMACD(prices) : null;
    const macd = macdData ? {
      histogram: macdData.histogram[macdData.histogram.length - 1],
      signal: macdData.signal[macdData.signal.length - 1],
      macd: macdData.macd[macdData.macd.length - 1],
    } : { histogram: 0, signal: 0, macd: 0 };

    // Bollinger Bands
    const bb = prices.length > 20 ? calculateBollingerBands(prices) : null;
    const lastBB = bb ? bb[bb.length - 1] : null;
    const bollinger = lastBB && lastBB.upper ? {
      upper: lastBB.upper, middle: lastBB.middle!, lower: lastBB.lower,
    } : { upper: 0, middle: 0, lower: 0 };

    // SMA crossover
    const sma10Arr = prices.length > 10 ? calculateSMA(prices, 10) : null;
    const sma30Arr = prices.length > 30 ? calculateSMA(prices, 30) : null;
    const sma10 = sma10Arr ? (sma10Arr[sma10Arr.length - 1] ?? currentPrice) : currentPrice;
    const sma30 = sma30Arr ? (sma30Arr[sma30Arr.length - 1] ?? currentPrice) : currentPrice;

    // Volatilitet: standardavvik av siste 14 kandler
    const recentPrices = prices.slice(-14);
    const mean = recentPrices.reduce((a: number, b: number) => a + b, 0) / recentPrices.length;
    const variance = recentPrices.reduce((s: number, p: number) => s + (p - mean) ** 2, 0) / recentPrices.length;
    const volatility = Math.min((Math.sqrt(variance) / mean) * 100 * Math.sqrt(365), 200); // annualisert, maks 200%

    const trend: "up" | "down" | "flat" = change24h > 2 ? "up" : change24h < -2 ? "down" : "flat";

    return { currentPrice, rsi, macd, bollinger, sma10, sma30, volatility, trend };
  } catch {
    return { currentPrice: 0, rsi: 50, macd: { histogram: 0, signal: 0, macd: 0 }, bollinger: { upper: 0, middle: 0, lower: 0 }, sma10: 0, sma30: 0, volatility: 50, trend: "flat" };
  }
}

/** Spor historisk treffsikkerhet per coin — justerer confidence dynamisk */
async function getCoinWinRate(
  db: ReturnType<typeof createClient>,
  userId: string,
  symbol: string,
): Promise<number> {
  const { data } = await db
    .from("trades")
    .select("realized_pnl")
    .eq("user_id", userId)
    .eq("trading_pair", symbol)
    .eq("joker_trade", true)
    .not("realized_pnl", "is", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!data || data.length < 3) return 1.0; // For få handler — nøytral

  const wins = data.filter(t => Number(t.realized_pnl) > 0).length;
  const winRate = wins / data.length;

  // Høy win-rate → boost confidence, lav → demp
  // 50% win-rate = 1.0x, 80% = 1.3x, 30% = 0.7x
  return 0.5 + winRate;
}

/** Enkel signalgenerering basert på RSI + trend + volatilitet */
function generateSignal(
  symbol: string,
  price: number,
  rsi: number,
  volatility: number,
  trend: string,
): { action: "BUY" | "SELL" | "WAIT"; confidence: number; reason: string } {
  // RSI < 30 = underkjøpt → kjøp
  if (rsi < 30 && trend !== "down") {
    const conf = Math.min(95, 60 + (30 - rsi) * 2);
    return { action: "BUY", confidence: conf, reason: `RSI ${rsi.toFixed(0)} — underkjøpt i ${trend}-trend` };
  }
  // RSI > 70 = overkjøpt → selg
  if (rsi > 70 && trend !== "up") {
    const conf = Math.min(95, 60 + (rsi - 70) * 2);
    return { action: "SELL", confidence: conf, reason: `RSI ${rsi.toFixed(0)} — overkjøpt i ${trend}-trend` };
  }
  // Sterk opptrend → kjøp
  if (trend === "up" && volatility < 100) {
    const conf = 50 + Math.min(volatility / 3, 30);
    return { action: "BUY", confidence: Math.round(conf), reason: `Sterk opptrend, moderat volatilitet (${volatility.toFixed(0)}%)` };
  }
  // Moderat RSI + opp/nøytral → kjøp
  if (rsi < 60 && trend !== "down") {
    return { action: "BUY", confidence: 55, reason: `RSI ${rsi.toFixed(0)} i ${trend}-trend — moderat kjøpssignal` };
  }
  // Fallback
  return { action: "WAIT", confidence: 0, reason: `RSI ${rsi.toFixed(0)}, ${trend}-trend, vol ${volatility.toFixed(0)}% — avventer` };
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

async function ensureActiveSession(
  db: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ id: string; capital: number } | null> {
  const { data: existing } = await db
    .from("trading_sessions")
    .select("id, current_capital_nok")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("mode", "paper")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    await db.from("trading_sessions").update({ last_heartbeat: new Date().toISOString() } as never).eq("id", existing.id);
    return { id: existing.id, capital: Number(existing.current_capital_nok ?? DEFAULT_CAPITAL) };
  }

  const { data: account } = await db
    .from("paper_accounts")
    .select("current_balance")
    .eq("user_id", userId)
    .maybeSingle();

  const capital = Number(account?.current_balance ?? DEFAULT_CAPITAL);
  if (capital <= 0) return null;

  const { data: created, error } = await db
    .from("trading_sessions")
    .insert({
      user_id: userId,
      mode: "paper",
      strategy_id: "cryptopilot",
      status: "active",
      trading_pair: "BTCUSDT",
      starting_capital_nok: capital,
      current_capital_nok: capital,
      current_capital: capital,
      initial_capital: capital,
      last_heartbeat: new Date().toISOString(),
      last_tick_at: new Date().toISOString(),
      strategy_config: { stop_loss_pct: 5, close_on_stop: true },
    })
    .select("id")
    .single();

  if (error || !created) return null;
  return { id: created.id, capital };
}

// ---------------------------------------------------------------------------
// Exits
// ---------------------------------------------------------------------------

/** Beregn SL/TP dynamisk basert på volatilitet + confidence */
function dynamicExits(volatility: number, rsi: number, confidence: number): { takeProfitPct: number; stopLossPct: number } {
  const volTP = Math.max(2, Math.min(8, 3 + (volatility / 100) * 3));
  const volSL = Math.max(3, Math.min(10, 5 + (volatility / 100) * 4));
  const confidenceFactor = 1 - ((confidence - 50) / 100) * 0.3;
  const slAdjust = Math.max(0.5, Math.min(1.5, confidenceFactor));
  return {
    takeProfitPct: Math.round(volTP * 10) / 10,
    stopLossPct: Math.round(volSL * slAdjust * 10) / 10,
  };
}

async function checkExits(
  db: ReturnType<typeof createClient>,
  userId: string,
  sessionId: string,
  priceCache: Map<string, number>,
  takeProfitPct: number,
  stopLossPct: number,
): Promise<number> {
  let exits = 0;
  const { data: positions } = await db
    .from("trades")
    .select("id, trading_pair, quantity, price, side")
    .eq("user_id", userId)
    .eq("status", "filled")
    .is("realized_pnl", null)
    .limit(20);

  if (!positions) return 0;

  // FIKS (2026-07-30): trades.price er i NOK for paper, priceCache var USDT
  // → pnlPct viste alltid ~±89 % (NOK/USDT-ratio) → gale exits. Konverter
  // nåddpris til NOK. Hent også priser for ALLE åpne symboler, ikke bare
  // den tilfeldige symbolet denne kjøringen valgte.
  const nokPerUsdt = await getNokUsdtRate();
  const missingSymbols = [...new Set(positions.map((p) => p.trading_pair))]
    .filter((s) => !priceCache.has(s));
  await Promise.all(
    missingSymbols.map(async (s) => {
      try {
        priceCache.set(s, await fetchPriceViaProxy(s));
      } catch { /* prøver igjen neste kjøring */ }
    }),
  );

  for (const pos of positions) {
    const currentPriceUsdt = priceCache.get(pos.trading_pair);
    if (!currentPriceUsdt || currentPriceUsdt <= 0) continue;

    const currentPrice = currentPriceUsdt * nokPerUsdt; // NOK, samme enhet som entry
    const entry = Number(pos.price);
    const pnlPct = pos.side === "buy"
      ? ((currentPrice - entry) / entry) * 100
      : ((entry - currentPrice) / entry) * 100;

    const isTakeProfit = pnlPct >= takeProfitPct;
    const isStopLoss = pnlPct <= -stopLossPct;
    if (!isTakeProfit && !isStopLoss) continue;

    try {
      const result = await executeTrade(db, {
        userId,
        sessionId,
        symbol: pos.trading_pair,
        side: "sell",
        quantity: Number(pos.quantity),
        price: currentPriceUsdt, // executeTrade forventer USDT — konverterer selv til NOK
        orderType: "market",
        mode: "paper",
        signalContext: {
          action: "sell",
          confidence: 100,
          strategy: "cryptopilot",
          reason: isTakeProfit
            ? `Take profit: +${pnlPct.toFixed(1)}%`
            : `Stop-loss: ${pnlPct.toFixed(1)}%`,
        },
        reasonCode: isTakeProfit ? "TAKE_PROFIT_SELL" : "STOP_LOSS_SELL",
        reasonParams: { pnlPct: Math.round(pnlPct * 100) / 100 },
      });
      if (result.success && result.tradeId) {
        exits++;
        await db.from("trades").update({
          joker_trade: true,
          joker_explanation: isTakeProfit
            ? `🎭 Auto-exit: +${pnlPct.toFixed(1)}% profitt`
            : `🎭 Stop-loss: ${pnlPct.toFixed(1)}% — begrenser tapet`,
        }).eq("id", result.tradeId);
      }
    } catch { /* neste */ }
  }
  return exits;
}

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get("x-cron-secret") ?? "";
    const isCron = cronSecret === process.env.CRON_SECRET;
    const db = createClient();

    let userId: string;

    if (isCron) {
      // 🛡️ Permanent: sikre at ALLE auto-brukere har aktive sessions
      try { await db.rpc("ensure_active_sessions_for_all" as never); } catch { /* best effort */ }

      // 🫀 Bulk heartbeat på ALLE aktive sessions — hindrer crash mellom cykler
      try { await db.from("trading_sessions").update({ last_heartbeat: new Date().toISOString() } as never).eq("status", "active").eq("mode", "paper"); } catch { /* best effort */ }

      const { data: users } = await db
        .from("auto_trading_configs")
        .select("user_id")
        .eq("is_enabled", true)
        .limit(20);

      if (!users?.length) {
        return NextResponse.json({ success: true, message: "Ingen auto-brukere" });
      }

      // Round-robin: finn brukeren med eldste siste trade
      const { data: recentTrades } = await db
        .from("trades")
        .select("user_id, created_at")
        .eq("joker_trade", true)
        .order("created_at", { ascending: false })
        .limit(100);

      const lastTradeMap = new Map<string, string>();
      for (const t of recentTrades ?? []) {
        if (!lastTradeMap.has(t.user_id)) {
          lastTradeMap.set(t.user_id, t.created_at);
        }
      }

      users.sort((a, b) => {
        const aTime = lastTradeMap.get(a.user_id);
        const bTime = lastTradeMap.get(b.user_id);
        if (!aTime && !bTime) return 0;
        if (!aTime) return -1;
        if (!bTime) return 1;
        return aTime.localeCompare(bTime);
      });

      userId = users[0].user_id;
    } else {
      const { data } = await db.auth.getUser();
      if (!data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      userId = data.user.id;
    }

    // 1. Velg symbol
    const symbol = TOP_SYMBOLS[Math.floor(Math.random() * TOP_SYMBOLS.length)];

    // 2. Hent markedsdata
    const market = await fetchMarketData(symbol);
    const price = market.currentPrice > 0 ? market.currentPrice : (FALLBACK_PRICES[symbol] ?? 100);
    if (market.currentPrice <= 0) market.currentPrice = price;

    // 3. Generer signal
    const winMultiplier = await getCoinWinRate(db, userId, symbol);
    const signal = generateJokerSignal(market, winMultiplier);

    // 4. Session
    const session = await ensureActiveSession(db, userId);
    if (!session) {
      return NextResponse.json({ error: "Ingen kapital" }, { status: 400 });
    }

    // Touch heartbeat — sessions overlever detect_crashed_sessions
    await db.from("trading_sessions").update({ last_heartbeat: new Date().toISOString() } as never).eq("id", session.id);

    // 5. Sjekk exits
    const { takeProfitPct, stopLossPct } = dynamicExits(market.volatility, market.rsi, signal.confidence);
    const priceMap = new Map([[symbol, price]]);
    const exitsExecuted = await checkExits(db, userId, session.id, priceMap, takeProfitPct, stopLossPct);

    // 6. Utfør trade
    let tradeData: { success?: boolean; tradeId?: string; error?: string } = {};

    if (signal.action !== "WAIT") {
      try {
        const sizingPct = dynamicPositionPct(signal.confidence, market.volatility);
        // Konverter kapital til USDT — session.capital er i NOK
        const nokToUsdt = await getNokUsdtRate(); // levende kurs (NOK→USDT)
        const capitalUsdt = session.capital / nokToUsdt;
        let positionUsdt = capitalUsdt * (sizingPct / 100);
        // Minimum 10 USDT ordre
        if (positionUsdt < 10) positionUsdt = 10;
        const quantity = positionUsdt / price;
        const side = signal.action === "BUY" ? "buy" as const : "sell" as const;

        let doTrade = true;
        if (side === "sell") {
          const { data: openPos } = await db
            .from("trades")
            .select("quantity")
            .eq("user_id", userId)
            .eq("trading_pair", symbol)
            .eq("status", "filled")
            .is("realized_pnl", null);
          const held = openPos?.reduce((s, p) => s + Number(p.quantity), 0) ?? 0;
          if (quantity > held) doTrade = false;
        }

        if (doTrade) {
          tradeData = await executeTrade(db, {
            userId,
            sessionId: session.id,
            symbol,
            side,
            quantity,
            price,
            orderType: "market",
            mode: "paper",
            signalContext: { action: side, confidence: signal.confidence, strategy: "cryptopilot", reason: signal.reason },
            reasonCode: side === "buy" ? "MULTI_SIGNAL_BUY" : "TAKE_PROFIT_SELL",
            reasonParams: { rsi: Math.round(market.rsi), confidence: signal.confidence, sizingPct: Math.round(sizingPct * 10) / 10 },
          });

          if (tradeData.success && tradeData.tradeId) {
            await db.from("trades").update({
              joker_trade: true,
              joker_explanation: `🎭 ${signal.action} ${symbol} — ${signal.reason} (${signal.confidence}% conf, ${sizingPct.toFixed(1)}% size)`,
            }).eq("id", tradeData.tradeId);
          }
        }
      } catch (err) {
        tradeData = { success: false, error: String(err) };
      }
    }

    // 7. Ikke stopp session — behold aktiv for neste syklus

    // 8. Response
    const sizingPct = dynamicPositionPct(signal.confidence, market.volatility);
    const msg = tradeData.success
      ? `🎭 CryptoPilot: ${signal.action} ${symbol} (${sizingPct.toFixed(1)}% size) — trade utført`
      : signal.action === "WAIT"
        ? `🎭 ${symbol}: ${signal.reason}`
        : `⚠️ ${signal.action} ${symbol} feilet: ${tradeData.error || "ukjent"}`;

    return NextResponse.json({
      success: true,
      message: msg,
      signal: { action: signal.action, symbol, price, confidence: signal.confidence, reason: signal.reason },
      sizing: { pct: sizingPct, volatility: Math.round(market.volatility) },
      exits: exitsExecuted,
      trade: tradeData.success ? { success: true, id: tradeData.tradeId } : { success: false, error: tradeData.error },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// GET — Dashboard-data
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { createServerClient } = await import("@/lib/supabase/server");
    const db: SupabaseClient<Database> = await createServerClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [trades, sessions, account] = await Promise.all([
      db.from("trades").select("*").eq("user_id", user.id).eq("joker_trade", true).order("created_at", { ascending: false }).limit(30),
      db.from("trading_sessions").select("id, status, current_capital_nok, started_at, total_trades, total_pnl").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      db.from("paper_accounts").select("current_balance").eq("user_id", user.id).maybeSingle(),
    ]);

    const tradesData = trades.data ?? [];
    const sessionsData = sessions.data ?? [];
    const balance = account.data?.current_balance ?? DEFAULT_CAPITAL;

    // Beregn analytics
    const closedTrades = tradesData.filter(t => t.realized_pnl !== null);
    const totalPnl = closedTrades.reduce((s, t) => s + Number(t.realized_pnl ?? 0), 0);
    const wins = closedTrades.filter(t => Number(t.realized_pnl ?? 0) > 0).length;
    const losses = closedTrades.filter(t => Number(t.realized_pnl ?? 0) < 0).length;
    const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;

    // Per-coin stats
    const coinMap = new Map<string, { trades: number; pnl: number; wins: number }>();
    for (const t of closedTrades) {
      const c = coinMap.get(t.trading_pair) || { trades: 0, pnl: 0, wins: 0 };
      c.trades++;
      c.pnl += Number(t.realized_pnl ?? 0);
      if (Number(t.realized_pnl ?? 0) > 0) c.wins++;
      coinMap.set(t.trading_pair, c);
    }
    const byCoin = [...coinMap.entries()]
      .map(([coin, c]) => ({ coin, trades: c.trades, pnl: c.pnl, winRate: c.trades > 0 ? (c.wins / c.trades) * 100 : 0 }))
      .sort((a, b) => b.trades - a.trades);

    return NextResponse.json({
      trades: tradesData,
      sessions: sessionsData,
      balance,
      analytics: {
        totalPnl,
        winRate,
        totalTrades: closedTrades.length,
        winningTrades: wins,
        losingTrades: losses,
        byCoin,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
