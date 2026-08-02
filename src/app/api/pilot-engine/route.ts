/**
 * 🎭 PilotTrade v4.1 — AI-drevet papirhandel
 *
 * Hver 15. min: velg tilfeldig auto-bruker → hent ekte pris → analyser → trade.
 * Script-basert cron (0 tokens). Alle handler loggføres med pilot_explanation.
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
import { generatePilotSignal, type MarketData } from "./signal";
import {
  generateGridLevels,
  evaluateGridSignal,
  calculateOptimalGrid,
  detectMarketRegime,
  adjustGridForRegime,
  type GridConfig,
  type GridLevel,
} from "@/lib/trading/grid-strategy";
import {
  GUARD_ERROR_OR_FILTER,
  sessionSkipReason,
} from "@/lib/trading/session-guard";
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
  "LINKUSDT", "ADAUSDT", "DOTUSDT", "UNIUSDT", "POLUSDT",
];

const FALLBACK_PRICES: Record<string, number> = {
  BTCUSDT: 60000, ETHUSDT: 2500, SOLUSDT: 140, AVAXUSDT: 18, DOGEUSDT: 0.12,
  LINKUSDT: 12, ADAUSDT: 0.45, DOTUSDT: 5.5, UNIUSDT: 7.5, POLUSDT: 0.25,
};

/** Persistert grid-state — lagres i strategy_config per sesjon */
interface PersistedGridState {
  lowerPrice?: number;
  upperPrice?: number;
  gridLevelsCount?: number;
  amountPerGrid?: number;
  regime?: string;
  grid_levels?: GridLevel[];
}

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
  priceChange24h: number;
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

    return { currentPrice, rsi, macd, bollinger, sma10, sma30, volatility, priceChange24h: change24h, trend };
  } catch {
    return { currentPrice: 0, rsi: 50, macd: { histogram: 0, signal: 0, macd: 0 }, bollinger: { upper: 0, middle: 0, lower: 0 }, sma10: 0, sma30: 0, volatility: 50, priceChange24h: 0, trend: "flat" };
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
    .eq("pilot_trade", true)
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

async function ensureActiveSessions(
  db: ReturnType<typeof createClient>,
  userId: string,
): Promise<Array<{ id: string; capital: number; tradingPair: string; blocked?: string }>> {
  // 🛡️ Forsvar i dybden (Task 0.3): en guard-deaktivert sesjon skal ALDRI
  // kunne handle — verken via tick, PilotTrade eller auto-trader. Guarden
  // setter status='stopped' + error_message LIKE 'GUARD:%' (eldre
  // utløsninger satte kun feilmeldingen mens status forble 'active').
  // ⚠️ IKKE filtrer på smart_trader_enabled (regresjonsfiks 2026-07-31):
  // kolonnen har DB-default false — pilot-engine sine egne sesjoner fikk
  // enabled=false og ble blokkert av eget filter.
  //
  // P1-FIKS (2026-08-01): handel skjer i brukerens EKSISTERENDE aktive
  // paper-sesjon, og symbolet HENTES FRA sesjonen (tradingPair). Før
  // valgte PilotTrade et tilfeldig symbol (ADA/DOGE/…) men DB tillater
  // kun ÉN aktiv paper-sesjon per bruker (idx_one_active_paper_session
  // _per_user) → ordren kjørte mot f.eks. en BTCUSDT-sesjon →
  // fn_guard_session_position_symbol avviste («entry_price 176.5 er
  // ikke gyldig for BTCUSDT») → 0 handler siden 31. juli. Nå er symbol
  // og sesjon alltid konsistente.
  //
  // MULTI-PAR (2026-08-02): DB-indeks endret til (user_id, trading_pair).
  // Én sesjon per par per bruker — returnerer ALLE aktive sesjoner.
  const { data: existing } = await db
    .from("trading_sessions")
    .select("id, current_capital_nok, trading_pair, status, smart_trader_enabled, error_message")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("mode", "paper")
    .or(GUARD_ERROR_OR_FILTER);

  const sessions: Array<{ id: string; capital: number; tradingPair: string; blocked?: string }> = [];

  for (const s of existing ?? []) {
    await db.from("trading_sessions").update({ last_heartbeat: new Date().toISOString() } as never).eq("id", s.id);
    sessions.push({
      id: s.id,
      capital: Number(s.current_capital_nok ?? DEFAULT_CAPITAL),
      tradingPair: s.trading_pair,
    });
  }

  // Opprett sesjoner for manglende par (multi-par: alle 10 skal ha session)
  const existingPairs = new Set(sessions.map(s => s.tradingPair));
  const missingPairs = TOP_SYMBOLS.filter(p => !existingPairs.has(p));

  // Sjekk om brukeren er guard-deaktivert
  const { data: disabled } = await db
    .from("trading_sessions")
    .select("id, status, smart_trader_enabled, error_message")
    .eq("user_id", userId)
    .eq("mode", "paper")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (disabled) {
    const reason = sessionSkipReason(disabled);
    if (reason && sessions.length === 0) {
      // Ingen aktive + guard-deaktivert → blokkér
      return [{ id: disabled.id, capital: 0, tradingPair: "BTCUSDT", blocked: `Sesjonen er deaktivert (${reason})` }];
    }
    // Har allerede aktive sesjoner — fortsett med de eksisterende
    if (missingPairs.length === 0) return sessions;
  }

  // Hent kapital for nye sesjoner
  const { data: account } = await db
    .from("paper_accounts")
    .select("current_balance")
    .eq("user_id", userId)
    .maybeSingle();

  const capital = Number(account?.current_balance ?? DEFAULT_CAPITAL);
  if (capital <= 0) return sessions; // Returner eksisterende om noen

  // MULTI-PAR: Opprett sesjoner kun for MANGLENDE par
  const capitalPerPair = Math.round(capital / TOP_SYMBOLS.length);

  for (const pair of missingPairs) {
    const { data: created } = await db
      .from("trading_sessions")
      .insert({
        user_id: userId,
        mode: "paper",
        strategy_id: "cryptopilot",
        status: "active",
        trading_pair: pair,
        starting_capital_nok: capitalPerPair,
        current_capital_nok: capitalPerPair,
        current_capital: capitalPerPair,
        initial_capital: capitalPerPair,
        last_heartbeat: new Date().toISOString(),
        last_tick_at: new Date().toISOString(),
        strategy_config: { stop_loss_pct: 5, close_on_stop: true },
      })
      .select("id")
      .single();

    if (created) {
      sessions.push({ id: created.id, capital: capitalPerPair, tradingPair: pair });
    }
  }

  return sessions;
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
    .select("id, session_id, trading_pair, quantity, price, side, usdt_nok_rate")
    .eq("user_id", userId)
    .eq("status", "filled")
    .is("realized_pnl", null)
    .limit(20);

  if (!positions) return 0;

  // FIKS (2026-07-30): trades.price er i NOK for paper, priceCache var USDT
  // → pnlPct viste alltid ~±89 % (NOK/USDT-ratio) → gale exits. Konverter
  // nåddpris til NOK. Hent også priser for ALLE åpne symboler, ikke bare
  // den tilfeldige symbolet denne kjøringen valgte.
  //
  // FIKS (2026-07-31, SYSTEM): getNokUsdtRate() kan returnere DEFAULT_FALLBACK
  // (10.5) når proxy feiler, mens executeTrade lagrer priser med levende rate
  // (~9.68) → pnlPct ble blåst opp ~+8.5 % → FALSKE take-profit-exits som
  // solgte med reelt tap. Løsning: bruk hver posisjons LAGREDE usdt_nok_rate
  // (autoritativ — den som faktisk ble brukt ved kjøp) for konvertering.
  // Da er entry og exit alltid i samme "rate-rom" uansett hvilken
  // rate-kilde som feiler.
  const fallbackRate = await getNokUsdtRate();
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

    // Posisjonens egen rate er autoritativ. Mangler den (legacy-rader),
    // faller vi tilbake til levende rate.
    const storedRate = Number(pos.usdt_nok_rate);
    const rate = Number.isFinite(storedRate) && storedRate > 0 ? storedRate : fallbackRate;

    const currentPrice = currentPriceUsdt * rate; // NOK, samme enhet som entry
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
        sessionId: pos.session_id ?? sessionId, // posisjonens EGEN sesjon (per-symbol, P1-fiks 2026-08-01)
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
          pilot_trade: true,
          pilot_explanation: isTakeProfit
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

      // 🫀 Bulk heartbeat på ALLE aktive sessions
      try { await db.from("trading_sessions").update({ last_heartbeat: new Date().toISOString() } as never).eq("status", "active").eq("mode", "paper"); } catch { /* best effort */ }

      const { data: users } = await db
        .from("auto_trading_configs")
        .select("user_id")
        .eq("is_enabled", true)
        .limit(50);

      if (!users?.length) {
        return NextResponse.json({ success: true, message: "Ingen auto-brukere" });
      }

      // 🎯 P1-oppfølging (2026-08-01): round-robin skal kun vurdere brukere
      // som FAKTISK kan handle akkurat nå. Før: alle 11 auto-brukere ble
      // sortert på eldste trade, men 8 av dem er guard-stoppet
      // (GUARD: Drawdown > 20 % — korrekt stoppet, med åpen posisjon).
      // Deres eldste trades gjorde at de ALLTID ble valgt først →
      // ensureActiveSession returnerte 403 «status=stopped» → motoren
      // ga opp og de 3 tradebare brukerne ble aldri nådd → 0 handler
      // siden P1-fiksen. Nå filtrerer vi vekk ikke-tradebare FØR valg.
      const { data: paperSessions } = await db
        .from("trading_sessions")
        .select("user_id")
        .eq("mode", "paper")
        .eq("status", "active")
        .or(GUARD_ERROR_OR_FILTER);

      const tradeableUsers = new Set((paperSessions ?? []).map((s) => s.user_id));
      const eligible = users.filter((u) => tradeableUsers.has(u.user_id));

      if (!eligible.length) {
        return NextResponse.json({
          success: true,
          message: "Ingen tradebare auto-brukere (alle guard-stoppet eller uten aktiv sesjon)",
        });
      }

      const eligibleUserIds = eligible.map(u => u.user_id);
      
      // Prosesser ALLE brukere — ikke bare én per cron-kjøring
      const allUserResults: Array<{
        userId: string;
        results: Array<{ symbol: string; action: string; reason: string }>;
        exits: number;
      }> = [];

      for (const uid of eligibleUserIds) {
        try {
          const userResult = await processUser(db, uid);
          if (userResult) allUserResults.push(userResult);
        } catch (userErr) {
          console.error(`[pilot-engine] Bruker ${uid} feilet:`, userErr);
        }
      }

      const totalSignals = allUserResults.flatMap(r => r.results);
      const activeSignals = totalSignals.filter(s => s.action !== "WAIT");
      const msg = `🎭 ${allUserResults.length} brukere behandlet, ${activeSignals.length} handler (${totalSignals.filter(s=>s.action==='BUY').length} kjøp, ${totalSignals.filter(s=>s.action==='SELL').length} salg)`;
      
      return NextResponse.json({
        success: true,
        users: allUserResults.length,
        message: msg,
        results: totalSignals.slice(0, 50),
        details: allUserResults.map(r => ({
          userId: r.userId.slice(0,8),
          pairs: r.results.length,
          active: r.results.filter(s => s.action !== 'WAIT').length,
          exits: r.exits,
        })),
      });
    } else {
      const { data } = await db.auth.getUser();
      if (!data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      
      // Manuell trigger (én bruker)
      const userResult = await processUser(db, data.user.id);
      if (!userResult) return NextResponse.json({ success: true, message: "Ingen aktive sesjoner" });
      
      const activeSignals = userResult.results.filter(s => s.action !== "WAIT");
      return NextResponse.json({
        success: true,
        users: 1,
        message: `🎭 ${userResult.results.length} par: ${activeSignals.map(r=>`${r.symbol}: ${r.action}`).join(', ')}`,
        results: userResult.results,
        exits: userResult.exits,
      });
    }
  } catch (err) {
    const e = err as { message?: string; status?: number };
    console.error("[pilot-engine] POST error:", e.message ?? err);
    return NextResponse.json({
      success: false,
      error: e.message ?? "Ukjent feil",
    }, { status: e.status ?? 500 });
  }
}

async function processUser(
  db: ReturnType<typeof createClient>,
  userId: string
): Promise<{ userId: string; results: Array<{ symbol: string; action: string; reason: string }>; exits: number } | null> {
  try {
    const sessions = await ensureActiveSessions(db, userId);
    const allResults: Array<{ symbol: string; action: string; reason: string }> = [];
    let totalExits = 0;

    for (const session of sessions) {
      if (session.blocked) continue;
      const symbol = session.tradingPair;

    // 3. Hent markedsdata
    const market = await fetchMarketData(symbol);
    const price = market.currentPrice > 0 ? market.currentPrice : (FALLBACK_PRICES[symbol] ?? 100);
    if (market.currentPrice <= 0) market.currentPrice = price;

    // 4. Generer signal — grid eller multi-signal basert på brukerens strategi
    const winMultiplier = await getCoinWinRate(db, userId, symbol);
    
    // Hent brukerens strategi-valg (default: grid — Pionex/3Commas-standard)
    const { data: userConfig } = await db
      .from("auto_trading_configs")
      .select("strategy, config")
      .eq("user_id", userId)
      .maybeSingle();
    
    // Strategi: grid er standard (verdensledende), multi_signal er legacy
    const strategyType = userConfig?.strategy ?? "grid";
    let signal: ReturnType<typeof generatePilotSignal> & { gridLevel?: GridLevel };
    let gridConfig: GridConfig | undefined;     // satt kun for grid-path
    let levels: GridLevel[] | undefined;        // satt kun for grid-path
    let currentState: PersistedGridState | undefined; // satt kun for grid-path
    
    if (strategyType === "grid") {
      // 🎯 GRID STRATEGY — verdensledende standard (Pionex/3Commas)
      // ════════════════════════════════════════════════════════════
      // FASE 4 FIX (2026-08-02): Fast grid-intervall.
      // Før: calculateOptimalGrid re-ankret intervallet rundt
      // nåværende pris hver 15. min → referanserammen drev oppover
      // → "buy high". Nå: intervallet låses til pris bryter ut eller
      // regime endres — likt Pionex/3Commas.
      // ════════════════════════════════════════════════════════════
      const regime = detectMarketRegime(market.priceChange24h ?? 0, market.volatility);

      const { data: gridStateRaw } = await db
        .from("trading_sessions")
        .select("strategy_config")
        .eq("id", session.id)
        .maybeSingle();

      const savedState = (gridStateRaw?.strategy_config ?? {}) as PersistedGridState;
      const savedLevels = savedState.grid_levels;

      // Rekalibrerings-betingelser:
      const hasSavedRange = savedState.lowerPrice && savedState.upperPrice
        && savedState.gridLevelsCount && savedState.amountPerGrid && savedLevels?.length;
      const breakoutUp = hasSavedRange && price > savedState.upperPrice! * 1.03;
      const deepBreak = hasSavedRange && price < savedState.lowerPrice! * 0.80;
      const regimeChanged = hasSavedRange && savedState.regime !== regime;

      let gridConfig: GridConfig;
      let levels: GridLevel[];
      let currentState: PersistedGridState = { ...savedState };

      if (hasSavedRange && !breakoutUp && !deepBreak && !regimeChanged) {
        // Gjenbruk lagret range — grid-intervall er låst
        gridConfig = {
          symbol, currentPrice: price,
          lowerPrice: savedState.lowerPrice!,
          upperPrice: savedState.upperPrice!,
          gridLevels: savedState.gridLevelsCount!,
          amountPerGrid: savedState.amountPerGrid!,
        };
        levels = savedLevels!;
      } else {
        // Rekalibrer: pris utenfor grid, regime-skifte, eller første kjøring
        let gridParams = calculateOptimalGrid(price, market.volatility, session.capital);
        gridParams = adjustGridForRegime(gridParams, regime, price);
        gridConfig = { symbol, currentPrice: price, ...gridParams };
        levels = generateGridLevels(gridConfig);
        currentState = {
          ...currentState,
          lowerPrice: gridConfig.lowerPrice,
          upperPrice: gridConfig.upperPrice,
          gridLevelsCount: gridConfig.gridLevels,
          amountPerGrid: gridConfig.amountPerGrid,
          regime,
          grid_levels: levels,
        };
        await db.from("trading_sessions").update({
          strategy_config: currentState as Record<string, unknown>,
        } as never).eq("id", session.id);
      }

      // Evaluer grid-signal
      const gridSignal = evaluateGridSignal(gridConfig, levels, price);

      signal = {
        action: gridSignal.action === "buy" ? "BUY" : gridSignal.action === "sell" ? "SELL" : "WAIT",
        confidence: 70,
        reason: gridSignal.reason,
        gridLevel: gridSignal.level,
      };

      // ════════════════════════════════════════════════════════════
      // Oppdater grid-state ETTER vellykket trade (ikke før — unngå
      // state-desync hvis executeTrade feiler). Lagres nedenfor ↓
      // ════════════════════════════════════════════════════════════
    } else {
      // 🎯 MULTI-SIGNAL (default) — RSI + trend + MACD
      signal = generatePilotSignal(market, winMultiplier);
    }

    // Touch heartbeat — sessions overlever detect_crashed_sessions
    await db.from("trading_sessions").update({ last_heartbeat: new Date().toISOString() } as never).eq("id", session.id);

    // 5. Sjekk exits — grid bruker katastrofe-SL (25 %), ingen TP (trailing håndterer)
    const isGrid = strategyType === "grid";
    const { takeProfitPct, stopLossPct } = dynamicExits(market.volatility, market.rsi, signal.confidence);
    const effectiveTP = isGrid ? Number.POSITIVE_INFINITY : takeProfitPct;
    const effectiveSL = isGrid ? Math.max(stopLossPct, 25) : stopLossPct;
    const priceMap = new Map([[symbol, price]]);
    const exitsExecuted = await checkExits(db, userId, session.id, priceMap, effectiveTP, effectiveSL);
    totalExits += exitsExecuted;

    // Grid-state-synk: frigjør kjøpt nivå som ble solgt av auto-exit
    if (isGrid && exitsExecuted > 0) {
      try {
        const { data: sess } = await db.from("trading_sessions").select("strategy_config").eq("id", session.id).maybeSingle();
        const cfg = sess?.strategy_config as PersistedGridState | null;
        if (cfg?.grid_levels?.length) {
          const lvls = cfg.grid_levels;
          const bought = lvls.filter(l => l.status === "bought").sort((a, b) => a.buyPrice - b.buyPrice);
          if (bought.length) {
            const target = bought[0];
            const updated = lvls.map(l =>
              l.level === target.level && l.dcaLevel === target.dcaLevel && l.buyPrice === target.buyPrice
                ? { ...l, status: "empty" as const } : l);
            await db.from("trading_sessions").update({
              strategy_config: { ...cfg, grid_levels: updated } as Record<string, unknown>,
            } as never).eq("id", session.id);
          }
        }
      } catch { /* best effort — grid-state synk er en bonus */ }
    }

    // 6. Utfør trade
    let tradeData: { success?: boolean; tradeId?: string; error?: string } = {};

    if (signal.action !== "WAIT") {
      try {
        const nokToUsdt = await getNokUsdtRate();
        const capitalUsdt = session.capital / nokToUsdt;
        let positionUsdt: number;

        if (strategyType === "grid" && signal.gridLevel) {
          // Grid-sizing: amountPerGrid × DCA-multiplikator (designet pengestyring)
          const mult = signal.gridLevel.sizeMultiplier ?? 1;
          const positionNok = gridConfig!.amountPerGrid * mult;
          positionUsdt = positionNok / nokToUsdt;
        } else {
          const sizingPct = dynamicPositionPct(signal.confidence, market.volatility);
          positionUsdt = capitalUsdt * (sizingPct / 100);
        }
        if (positionUsdt < 10) positionUsdt = 10;
        if (positionUsdt > capitalUsdt) positionUsdt = capitalUsdt;
        let quantity = positionUsdt / price;
        const side = signal.action === "BUY" ? "buy" as const : "sell" as const;

        // Sell-guard: selg maks det vi faktisk holder (FIFO)
        if (side === "sell") {
          const { data: openPos } = await db
            .from("trades")
            .select("quantity")
            .eq("user_id", userId)
            .eq("trading_pair", symbol)
            .eq("status", "filled")
            .is("realized_pnl", null);
          const held = openPos?.reduce((s, p) => s + Number(p.quantity), 0) ?? 0;
          if (held <= 0) { quantity = 0; }
          else if (quantity > held) { quantity = held; }
        }
        const doTrade = quantity > 0;

        // ReasonCode: skill grid vs multi-signal for audit
        let reasonCode: string;
        let sizingLabel: string;
        if (strategyType === "grid" && side === "buy") {
          reasonCode = signal.gridLevel?.dcaLevel ? "DCA_INTERVAL_BUY" : "GRID_BUY";
          sizingLabel = `${((signal.gridLevel!.sizeMultiplier ?? 1) * gridConfig!.amountPerGrid / session.capital * 100).toFixed(1)}% grid`;
        } else if (strategyType === "grid" && side === "sell") {
          reasonCode = (signal as any).gridLevel?.sellType === "trailing" ? "TRAILING_TP_SELL" : "TAKE_PROFIT_SELL";
          sizingLabel = `${((signal.gridLevel?.sizeMultiplier ?? 1) * gridConfig!.amountPerGrid / session.capital * 100).toFixed(1)}% grid`;
        } else {
          reasonCode = side === "buy" ? "MULTI_SIGNAL_BUY" : "TAKE_PROFIT_SELL";
          sizingLabel = `${dynamicPositionPct(signal.confidence, market.volatility).toFixed(1)}%`;
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
            reasonCode: reasonCode as any,
            reasonParams: { rsi: Math.round(market.rsi), confidence: signal.confidence, sizingPct: Math.round(parseFloat(sizingLabel) * 10) / 10 },
          });

          if (tradeData.success && tradeData.tradeId) {
            await db.from("trades").update({
              pilot_trade: true,
              pilot_explanation: `🎭 ${signal.action} ${symbol} — ${signal.reason} (${signal.confidence}% conf, ${sizingLabel})`,
            }).eq("id", tradeData.tradeId);

            // ══════════════════════════════════════════════════════
            // Grid-state: persister DCA-nivå / frigjør celle
            // KUN etter vellykket trade — unngår state-desync.
            // ══════════════════════════════════════════════════════
            if (strategyType === "grid" && signal.gridLevel) {
              const lvl = signal.gridLevel;
              let updatedLevels: GridLevel[];
              if (side === "buy") {
                if (lvl.dcaLevel) {
                  // DCA: erstatt evt. gammel DCA-oppføring, legg til ny
                  updatedLevels = [...levels!.filter(l => l.dcaLevel !== lvl.dcaLevel), { ...lvl, status: "bought" }];
                } else {
                  updatedLevels = levels!.map(l =>
                    l.level === lvl.level && !l.dcaLevel ? { ...l, status: "bought" as const } : l);
                }
              } else {
                // SELL: cella frigjøres → grid handler samme nivå igjen (round-trip)
                if (lvl.dcaLevel) {
                  updatedLevels = levels!.map(l =>
                    l.dcaLevel === lvl.dcaLevel ? { ...l, status: "empty" as const } : l);
                } else {
                  updatedLevels = levels!.map(l =>
                    l.level === lvl.level && !l.dcaLevel ? { ...l, status: "empty" as const } : l);
                }
              }
              await db.from("trading_sessions").update({
                strategy_config: { ...currentState, grid_levels: updatedLevels } as Record<string, unknown>,
              } as never).eq("id", session.id);
            }
          }
        }
      } catch (err) {
        tradeData = { success: false, error: String(err) };
      }
    }

    // 7. Ikke stopp session — behold aktiv for neste syklus
      allResults.push({ symbol, action: signal.action, reason: signal.reason });
    }

    return { userId, results: allResults, exits: totalExits };
  } catch (err) {
    console.error(`[processUser] ${userId}:`, err);
    return null;
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
      db.from("trades").select("*").eq("user_id", user.id).eq("pilot_trade", true).order("created_at", { ascending: false }).limit(30),
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
