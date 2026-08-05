/**
 * KLARPAKKE TRADING-AGENT — Universe-filter backtest (uke 32, 2026-08-05)
 *
 * Hypotesetest: «Begrens auto-rutingen til (strategi, symbol)-kombinasjoner med
 * positiv OOS-expectancy.» Fasit (Supabase, etter 2026-07-30 11:00 UTC) viser at
 * grid på BTC/ETH genererer all P&L, mens cryptopilot/dca taper på alle par og
 * grid taper på altcoin-halen. Dette scriptet backtester MultiSignalStrategy og
 * GridBotStrategy mot historiske Binance-priser per symbol med 70/30
 * walk-forward-split, og sammenligner expectancy/PF for «hele universet» vs
 * «smalt univers» (kun symboler med OOS PF ≥ 1.1).
 *
 * Kjør: npx tsx scripts/trading-agent/universe-backtest.ts
 */
import { createBinanceMarketDataProvider } from "../../src/lib/trading/canonical/market-data";
import { resolveStrategy } from "../../src/lib/trading/strategies";
import { FILL_CONSTANTS } from "../../src/lib/trading/canonical/execution/fill-constants";
import { roundToLotSize } from "../../src/lib/trading/canonical/symbols/lot-sizes";
import { PAPER_TRADING_UI_SYMBOLS } from "../../src/lib/trading/paper-ui-symbols";

const FEE = FILL_CONSTANTS.feeRate;
const SLIPPAGE = FILL_CONSTANTS.marketSlippageRate;

interface Candle { timestamp: number; open: number; high: number; low: number; close: number; volume: number; }

interface Trade {
  symbol: string;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  pnlPct: number; // netto % på round-trip
  pnlUsdt: number;
}

interface Result {
  symbol: string;
  engine: string;
  trades: Trade[];
}

interface Metrics {
  trades: number;
  wins: number;
  winRatePct: number;
  pnlUsdt: number;
  expectancyPct: number;
  profitFactor: number;
  maxDrawdownPct: number;
  totalReturnPct: number;
  buyHoldPct: number;
}

// ---------------------------------------------------------------------------
// Simulering: én posisjon om gangen, strategi-signaler fra registry (SSoT)
// ---------------------------------------------------------------------------
function simulate(
  engine: string,
  config: Record<string, unknown>,
  symbol: string,
  candles: Candle[],
  startCapitalUsdt: number,
): Result {
  const strategy = resolveStrategy(engine);
  if (!strategy) throw new Error(`Ukjent engine: ${engine}`);

  const trades: Trade[] = [];
  let cash = startCapitalUsdt;
  let qty = 0;
  let entryPrice = 0;
  let entryTime = 0;
  let highestPrice = 0;
  let maxEquity = startCapitalUsdt;
  let maxDd = 0;

  const warmup = 40; // RSI14 + MACD26 + ADX14

  for (let i = warmup; i < candles.length; i++) {
    const c = candles[i];
    const slice = candles.slice(0, i + 1);
    const closes = slice.map((x) => x.close);

    const session = {
      open_position: qty > 0
        ? {
            side: "long" as const,
            quantity: qty,
            entry_price: entryPrice,
            entry_time: new Date(entryTime).toISOString(),
            highest_price: highestPrice,
            partial_exits_executed: [] as number[],
          }
        : null,
      last_tick_at: new Date(candles[i - 1].timestamp).toISOString(),
      strategy_config: {},
    };

    const signal = strategy.evaluate({
      candles: slice.map((x) => ({ time: x.timestamp, open: x.open, high: x.high, low: x.low, close: x.close, volume: x.volume })),
      session,
      config,
      currentTime: c.timestamp,
    });

    // Oppdater høyeste pris for trailing stop
    if (qty > 0 && c.close > highestPrice) highestPrice = c.close;

    if (signal.action === "buy" && qty === 0) {
      const sizePct = Math.min(signal.positionSize ?? 0.1, 0.25);
      const notional = cash * sizePct;
      const rawQty = (notional * (1 - FEE)) / (c.close * (1 + SLIPPAGE));
      const rounded = roundToLotSize(symbol, rawQty);
      if (rounded > 0 && rounded * c.close >= 10) {
        const cost = rounded * c.close * (1 + SLIPPAGE) * (1 + FEE);
        cash -= cost;
        qty = rounded;
        entryPrice = cost / rounded;
        entryTime = c.timestamp;
        highestPrice = c.close;
      }
    } else if (signal.action === "sell" && qty > 0) {
      const proceeds = qty * c.close * (1 - SLIPPAGE) * (1 - FEE);
      const pnlUsdt = proceeds - qty * entryPrice;
      trades.push({
        symbol, engine: `${engine}:${symbol}`,
        entryTime, exitTime: c.timestamp,
        entryPrice, exitPrice: c.close,
        pnlPct: (pnlUsdt / (qty * entryPrice)) * 100,
        pnlUsdt,
      });
      cash += proceeds;
      qty = 0;
    }

    // Equity for drawdown
    const equity = cash + qty * c.close;
    if (equity > maxEquity) maxEquity = equity;
    const dd = (maxEquity - equity) / maxEquity;
    if (dd > maxDd) maxDd = dd;
    void closes;
  }

  // Lukk åpen posisjon ved siste close (uten ekstra slippage/fee — som engine)
  if (qty > 0) {
    const last = candles[candles.length - 1];
    const pnlUsdt = qty * last.close - qty * entryPrice;
    trades.push({
      symbol, engine: `${engine}:${symbol}`,
      entryTime, exitTime: last.timestamp,
      entryPrice, exitPrice: last.close,
      pnlPct: (pnlUsdt / (qty * entryPrice)) * 100,
      pnlUsdt,
    });
  }

  return { symbol, engine, trades };
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------
function computeMetrics(trades: Trade[], startCapitalUsdt: number, startPrice: number, endPrice: number): Metrics {
  const wins = trades.filter((t) => t.pnlUsdt > 0);
  const losses = trades.filter((t) => t.pnlUsdt <= 0);
  const grossProfit = wins.reduce((s, t) => s + t.pnlUsdt, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnlUsdt, 0));
  const totalPnl = trades.reduce((s, t) => s + t.pnlUsdt, 0);
  // Estimert maks drawdown fra trade-P&L-sekvensen (enkel tilnærming: kumulativ PnL)
  let peak = 0;
  let maxDd = 0;
  let cum = 0;
  for (const t of trades) {
    cum += t.pnlUsdt;
    if (cum > peak) peak = cum;
    const dd = peak - cum;
    if (dd > maxDd) maxDd = dd;
  }
  const maxDdPct = startCapitalUsdt > 0 ? (maxDd / startCapitalUsdt) * 100 : 0;

  return {
    trades: trades.length,
    wins: wins.length,
    winRatePct: trades.length ? (wins.length / trades.length) * 100 : 0,
    pnlUsdt: totalPnl,
    expectancyPct: trades.length ? totalPnl / trades.length / startCapitalUsdt * 100 : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    maxDrawdownPct: maxDdPct,
    totalReturnPct: (totalPnl / startCapitalUsdt) * 100,
    buyHoldPct: startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0,
  };
}

function fmt(m: Metrics): string {
  const pf = m.profitFactor === Infinity ? "∞" : m.profitFactor.toFixed(2);
  return `trades=${String(m.trades).padStart(3)} wins=${String(m.wins).padStart(3)} winRate=${m.winRatePct.toFixed(1).padStart(5)}% pnl=${m.pnlUsdt.toFixed(0).padStart(8)} exp%=${m.expectancyPct.toFixed(3).padStart(7)} PF=${pf.padStart(5)} maxDD=${m.maxDrawdownPct.toFixed(1).padStart(5)}% ret=${m.totalReturnPct.toFixed(1).padStart(6)}%`;
}

// ---------------------------------------------------------------------------
// Hovedløp
// ---------------------------------------------------------------------------
async function main() {
  const provider = createBinanceMarketDataProvider();
  const DAYS = 730; // ~2 år daglige lys
  const symbols = PAPER_TRADING_UI_SYMBOLS.filter((s) => s !== "BNBUSDT" && s !== "XRPUSDT"); // ingen fasit-data

  // Strategier å teste (config = default fra strategy-configs, SSoT)
  const engines: Array<{ engine: string; config: Record<string, unknown>; label: string }> = [
    {
      engine: "multi_signal",
      config: {
        rsi_buy_threshold: 40, rsi_sell_threshold: 60, rsi_period: 14,
        macd_fast: 12, macd_slow: 26, macd_signal: 9, momentum_period: 5,
        use_bollinger: true, min_confidence: 2, position_size: 0.06,
        max_position_size: 0.1, trailing_stop_atr_mult: 2.0,
        use_volume_filter: false, use_rsi_divergence: false,
        use_adx_filter: true, adx_threshold: 20, adx_period: 14,
      },
      label: "multi_signal",
    },
    {
      engine: "grid",
      config: {
        grid_levels: 10, grid_range_pct: 30, volatility_adjust: true,
        atr_period: 14, position_size: 0.05, max_trades_per_day: 6,
        rebalance_on_regime_change: true, atr_based_range: true,
      },
      label: "grid",
    },
  ];

  const START_CAPITAL = 10_000; // USDT per (strategi, symbol)

  for (const { engine, config, label } of engines) {
    console.log(`\n════════ ${label.toUpperCase()} — 70/30 walk-forward (730d) ════════`);
    console.log("symbol    | full-periode                                            | IS (70%)                                                | OOS (30%)");
    console.log("----------|----------------------------------------------------------|---------------------------------------------------------|--------------------------------------------------");

    const allTrades: Trade[] = [];
    const keptSymbols: string[] = [];
    const keptTrades: Trade[] = [];

    for (const symbol of symbols) {
      let candles: Candle[];
      try {
        const klines = await provider.getKlines(symbol, "1d", DAYS);
        candles = klines.map((k) => ({ timestamp: k.timestamp, open: k.open, high: k.high, low: k.low, close: k.close, volume: k.volume }));
      } catch (e) {
        console.log(`${symbol}  | DATA-FEIL: ${(e as Error).message.slice(0, 60)}`);
        continue;
      }
      if (candles.length < 200) {
        console.log(`${symbol}  | FOR LITE DATA (${candles.length})`);
        continue;
      }

      const full = simulate(engine, config, symbol, candles, START_CAPITAL);
      const split = Math.floor(candles.length * 0.7);
      const is = simulate(engine, config, symbol, candles.slice(0, split), START_CAPITAL);
      const oos = simulate(engine, config, symbol, candles.slice(split), START_CAPITAL);

      const mFull = computeMetrics(full.trades, START_CAPITAL, candles[warmupIdx(candles)].close, candles[candles.length - 1].close);
      const mIs = computeMetrics(is.trades, START_CAPITAL, candles[warmupIdx(candles.slice(0, split))]?.close ?? candles[0].close, candles[split - 1].close);
      const mOos = computeMetrics(oos.trades, START_CAPITAL, candles[split].close, candles[candles.length - 1].close);

      console.log(`${symbol.padEnd(8)} | ${fmt(mFull)} | ${fmt(mIs)} | ${fmt(mOos)}`);

      allTrades.push(...full.trades);
      if (mOos.profitFactor >= 1.1 && mOos.trades >= 5) {
        keptSymbols.push(symbol);
        keptTrades.push(...oos.trades);
      }
    }

    // Univers-sammenligning
    const mAll = computeMetrics(allTrades, START_CAPITAL * symbols.length, 1, 1);
    const mKept = computeMetrics(keptTrades, START_CAPITAL * Math.max(keptSymbols.length, 1), 1, 1);
    console.log("\n── Univers-sammenligning ──");
    console.log(`HELE universet (${symbols.length} symboler):      trades=${mAll.trades} pnl=${mAll.pnlUsdt.toFixed(0)} exp%=${mAll.expectancyPct.toFixed(4)} PF=${mAll.profitFactor === Infinity ? "∞" : mAll.profitFactor.toFixed(2)} winRate=${mAll.winRatePct.toFixed(1)}% maxDD=${mAll.maxDrawdownPct.toFixed(1)}%`);
    console.log(`SMALT univers (OOS PF≥1.1, n=${keptSymbols.length}): ${keptSymbols.join(",") || "(ingen)"}`);
    console.log(`  trades=${mKept.trades} pnl=${mKept.pnlUsdt.toFixed(0)} exp%=${mKept.expectancyPct.toFixed(4)} PF=${mKept.profitFactor === Infinity ? "∞" : mKept.profitFactor.toFixed(2)} winRate=${mKept.winRatePct.toFixed(1)}% maxDD=${mKept.maxDrawdownPct.toFixed(1)}%`);
  }
}

function warmupIdx(candles: Candle[]): number {
  return Math.min(40, Math.max(0, candles.length - 1));
}

main().catch((e) => {
  console.error("FEIL:", e);
  process.exit(1);
});
