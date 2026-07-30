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

// ---------------------------------------------------------------------------
// Konstanter
// ---------------------------------------------------------------------------

const TOP_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "AVAXUSDT", "DOGEUSDT"];
const DEFAULT_CAPITAL = 100_000;
const MIN_POSITION_PCT = 2;
const MAX_POSITION_PCT = 10;
const BASE_POSITION_PCT = 5;
const TAKE_PROFIT_PCT = 3;
const STOP_LOSS_PCT = 5;
const FALLBACK_PRICES: Record<string, number> = {
  BTCUSDT: 60000,
  ETHUSDT: 2500,
  SOLUSDT: 25,
  AVAXUSDT: 18,
  DOGEUSDT: 0.12,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateRSI(prices: number[], period: number): number {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function dynamicPositionPct(confidence: number, volatility: number): number {
  const volFactor = Math.max(0.3, 1 - (volatility / 200));
  const confFactor = 0.5 + (confidence / 100);
  const pct = BASE_POSITION_PCT * volFactor * confFactor;
  return Math.max(MIN_POSITION_PCT, Math.min(MAX_POSITION_PCT, pct));
}

async function fetchMarketData(symbol: string): Promise<{
  currentPrice: number;
  rsi: number;
  volatility: number;
  trend: "up" | "down" | "flat";
}> {
  try {
    // Hent sanntidspris fra Binance proxy
    const res = await fetch(
      `https://pskhryjzkobytnfwucrb.supabase.co/functions/v1/binance-proxy?symbol=${symbol}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as {
      price?: string;
      klines?: Array<{ close: string }>;
      changePercent?: string;
    };

    const currentPrice = parseFloat(data.price ?? "0");
    const prices = (data.klines ?? []).map((k: { close: string }) => parseFloat(k.close)).filter((p: number) => p > 0);
    const rsi = prices.length > 14 ? calculateRSI(prices, 14) : 50;

    // Volatilitet: standardavvik av siste 14 kandler
    const recentPrices = prices.slice(-14);
    const mean = recentPrices.reduce((a: number, b: number) => a + b, 0) / recentPrices.length;
    const variance = recentPrices.reduce((s: number, p: number) => s + (p - mean) ** 2, 0) / recentPrices.length;
    const volatility = Math.min((Math.sqrt(variance) / mean) * 100 * Math.sqrt(365), 200); // annualisert, maks 200%

    const change24h = parseFloat(data.changePercent ?? "0");
    const trend: "up" | "down" | "flat" = change24h > 2 ? "up" : change24h < -2 ? "down" : "flat";

    return { currentPrice, rsi, volatility, trend };
  } catch {
    return { currentPrice: 0, rsi: 50, volatility: 50, trend: "flat" };
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
      strategy_config: { stop_loss_pct: STOP_LOSS_PCT, close_on_stop: true },
    })
    .select("id")
    .single();

  if (error || !created) return null;
  return { id: created.id, capital };
}

// ---------------------------------------------------------------------------
// Exits
// ---------------------------------------------------------------------------

async function checkExits(
  db: ReturnType<typeof createClient>,
  userId: string,
  sessionId: string,
  priceCache: Map<string, number>,
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

  for (const pos of positions) {
    const currentPrice = priceCache.get(pos.trading_pair);
    if (!currentPrice || currentPrice <= 0) continue;

    const entry = Number(pos.price);
    const pnlPct = pos.side === "buy"
      ? ((currentPrice - entry) / entry) * 100
      : ((entry - currentPrice) / entry) * 100;

    if (pnlPct >= TAKE_PROFIT_PCT) {
      try {
        const result = await executeTrade(db, {
          userId,
          sessionId,
          symbol: pos.trading_pair,
          side: "sell",
          quantity: Number(pos.quantity),
          price: currentPrice,
          orderType: "market",
          mode: "paper",
          signalContext: { action: "sell", confidence: 100, strategy: "cryptopilot", reason: `Take profit: +${pnlPct.toFixed(1)}%` },
          reasonCode: "TAKE_PROFIT_SELL",
          reasonParams: { pnlPct: Math.round(pnlPct * 100) / 100 },
        });
        if (result.success && result.tradeId) {
          exits++;
          await db.from("trades").update({
            joker_trade: true,
            joker_explanation: `🎭 Auto-exit: +${pnlPct.toFixed(1)}% profit`,
          }).eq("id", result.tradeId);
        }
      } catch { /* neste */ }
    }
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
    const signal = generateSignal(symbol, price, market.rsi, market.volatility, market.trend);

    // 🧠 Lær av historikk — juster confidence basert på coin win-rate
    const winMultiplier = await getCoinWinRate(db, userId, symbol);
    signal.confidence = Math.round(signal.confidence * winMultiplier);

    // 4. Session
    const session = await ensureActiveSession(db, userId);
    if (!session) {
      return NextResponse.json({ error: "Ingen kapital" }, { status: 400 });
    }

    // Touch heartbeat — sessions overlever detect_crashed_sessions
    await db.from("trading_sessions").update({ last_heartbeat: new Date().toISOString() } as never).eq("id", session.id);

    // 5. Sjekk exits
    const priceMap = new Map([[symbol, price]]);
    const exitsExecuted = await checkExits(db, userId, session.id, priceMap);

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
