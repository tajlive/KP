/**
 * KLARPAKKE TRADING-AGENT — Grid-strategi backtest med persistert state (4h)
 *
 * Simulerer GridBotStrategy slik tick-executor kjører den i live:
 * - calculateOptimalGrid + generateGridLevels (SSoT fra grid-strategy.ts)
 * - Persistert nivå-state (empty/bought/sold) mellom evalueringer
 * - Sell-prioritet (trailing ≥ 102% av buyPrice, ellers fast sellPrice)
 * - Buy deploy-all (alle empty nivåer under pris) — Toms krav 2026-08-03
 * - Re-kalibrering ved breakout (>3% over topp, <10% under bunn)
 * - DCA under bunn (1.0x/1.5x/2.0x)
 *
 * Kjør: npx tsx scripts/trading-agent/grid-backtest.ts
 */
import { createBinanceMarketDataProvider } from "../../src/lib/trading/canonical/market-data";
import { calculateOptimalGrid, generateGridLevels, type GridLevel } from "../../src/lib/trading/grid-strategy";
import { FILL_CONSTANTS } from "../../src/lib/trading/canonical/execution/fill-constants";
import { PAPER_TRADING_UI_SYMBOLS } from "../../src/lib/trading/paper-ui-symbols";

const FEE = FILL_CONSTANTS.feeRate;
const SLIPPAGE = FILL_CONSTANTS.marketSlippageRate;
const CAPITAL = 10_000; // USDT per symbol
// Live-konfigurasjon (fra trading_sessions.strategy_config):
const STOP_LOSS_PCT = 5; // close_on_stop: true, stop_loss_pct: 5
const TRAILING_ACTIVATION_PCT = 1.02; // grid-strategy.ts: TRAILING_ACTIVATION_PCT

interface Candle { timestamp: number; open: number; high: number; low: number; close: number; volume: number; }

interface Trade { pnlUsdt: number; pnlPct: number; }

interface Metrics {
  trades: number; wins: number; winRatePct: number;
  pnlUsdt: number; expectancyPct: number; profitFactor: number;
  maxDrawdownPct: number; totalReturnPct: number;
}

function estimateVolatility(closes: number[]): number {
  if (closes.length < 14) return 50;
  const slice = closes.slice(-14);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((s, p) => s + (p - mean) ** 2, 0) / slice.length;
  return Math.min((Math.sqrt(variance) / mean) * 100 * Math.sqrt(365), 200);
}

function simulateGrid(symbol: string, candles: Candle[]): Trade[] {
  const trades: Trade[] = [];
  const DCA_PCTS = [0.95, 0.90, 0.85];
  const DCA_MULT = [1.0, 1.5, 2.0];

  let lower = 0, upper = 0, amountPerGrid = 0;
  let levels: GridLevel[] = [];

  const calibrate = (price: number, closes: number[]) => {
    const optimal = calculateOptimalGrid(price, estimateVolatility(closes), CAPITAL);
    lower = optimal.lowerPrice; upper = optimal.upperPrice;
    amountPerGrid = optimal.amountPerGrid;
    levels = generateGridLevels({ symbol, lowerPrice: lower, upperPrice: upper, gridLevels: optimal.gridLevels, amountPerGrid, currentPrice: price });
  };

  const closes = candles.map((c) => c.close);
  calibrate(closes[0], closes.slice(0, 40));

  const realizeSell = (l: GridLevel, sellPrice: number, _isTrailing: boolean) => {
    const qty = l.quantity;
    const cost = qty * l.buyPrice;
    const proceeds = qty * sellPrice * (1 - SLIPPAGE) * (1 - FEE);
    trades.push({ pnlUsdt: proceeds - cost, pnlPct: ((proceeds - cost) / cost) * 100 });
    l.status = "sold";
  };

  // Stop-loss (close_on_stop): lukk ALLE bought-nivåer hvis pris faller
  // STOP_LOSS_PCT % under kjøpspris (live: stop_loss_pct 5)
  const checkStopLoss = (price: number) => {
    const stopped = levels.filter(
      (l) => l.status === "bought" && price <= l.buyPrice * (1 - STOP_LOSS_PCT / 100),
    );
    for (const l of stopped) realizeSell(l, price, false);
    return stopped.length > 0;
  };

  const realizeBuy = (l: GridLevel, multiplier = 1.0) => {
    const qty = (amountPerGrid * multiplier) / l.buyPrice;
    l.quantity = qty;
    l.status = "bought";
  };

  for (let i = 1; i < candles.length; i++) {
    const price = candles[i].close;
    const winCloses = closes.slice(Math.max(0, i - 40), i + 1);

    // Stop-loss-sjekk FØR alt annet (live: close_on_stop)
    if (checkStopLoss(price)) continue;

    // Re-kalibrering ved breakout
    if (price > upper * 1.03 || price < lower * 0.90) {
      for (const l of levels.filter((x) => x.status === "bought")) realizeSell(l, price, true);
      calibrate(price, winCloses);
    }

    // PRIORITET 0 — SELL (trailing ≥ 102% av buyPrice, ellers fast sellPrice)
    let bestSell: { level: GridLevel; profit: number; trailing: boolean } | null = null;
    for (const l of levels) {
      if (l.status !== "bought") continue;
      if (price >= l.buyPrice * TRAILING_ACTIVATION_PCT) {
        const profit = ((price - l.buyPrice) / l.buyPrice) * 100;
        if (!bestSell || profit > bestSell.profit) bestSell = { level: l, profit, trailing: true };
      } else if (price >= l.sellPrice) {
        const profit = ((l.sellPrice - l.buyPrice) / l.buyPrice) * 100;
        if (!bestSell || profit > bestSell.profit) bestSell = { level: l, profit, trailing: false };
      }
    }
    if (bestSell) { realizeSell(bestSell.level, bestSell.trailing ? price : bestSell.level.sellPrice, bestSell.trailing); continue; }

    // PRIORITET 1 — DCA under bunn
    if (price < lower) {
      for (let d = 0; d < DCA_PCTS.length; d++) {
        const dcaPrice = lower * DCA_PCTS[d];
        const existing = levels.find((l) => l.dcaLevel === d + 1);
        if (price <= dcaPrice && (!existing || existing.status === "empty")) {
          const lvl: GridLevel = { level: -1, buyPrice: dcaPrice, sellPrice: levels[0].buyPrice, quantity: 0, status: "empty", dcaLevel: d + 1, sizeMultiplier: DCA_MULT[d] };
          levels.push(lvl);
          realizeBuy(lvl, DCA_MULT[d]);
        }
      }
      continue;
    }

    // PRIORITET 3 — BUY deploy-all (alle empty nivåer under pris)
    const buys = levels.filter((l) => l.status === "empty" && !l.dcaLevel && l.buyPrice <= price);
    for (const l of buys) realizeBuy(l);
  }

  // Lukk åpne posisjoner ved siste pris (uten slippage/fee — som engine)
  for (const l of levels.filter((x) => x.status === "bought")) {
    const last = candles[candles.length - 1].close;
    const cost = l.quantity * l.buyPrice;
    const proceeds = l.quantity * last;
    trades.push({ pnlUsdt: proceeds - cost, pnlPct: ((proceeds - cost) / cost) * 100 });
  }

  return trades;
}

function computeMetrics(trades: Trade[]): Metrics {
  const wins = trades.filter((t) => t.pnlUsdt > 0);
  const losses = trades.filter((t) => t.pnlUsdt <= 0);
  const gp = wins.reduce((s, t) => s + t.pnlUsdt, 0);
  const gl = Math.abs(losses.reduce((s, t) => s + t.pnlUsdt, 0));
  const pnl = trades.reduce((s, t) => s + t.pnlUsdt, 0);
  let peak = 0, maxDd = 0, cum = 0;
  for (const t of trades) { cum += t.pnlUsdt; if (cum > peak) peak = cum; if (peak - cum > maxDd) maxDd = peak - cum; }
  return {
    trades: trades.length,
    wins: wins.length,
    winRatePct: trades.length ? (wins.length / trades.length) * 100 : 0,
    pnlUsdt: pnl,
    expectancyPct: trades.length ? (pnl / trades.length / CAPITAL) * 100 : 0,
    profitFactor: gl > 0 ? gp / gl : gp > 0 ? Infinity : 0,
    maxDrawdownPct: (maxDd / CAPITAL) * 100,
    totalReturnPct: (pnl / CAPITAL) * 100,
  };
}

function fmt(m: Metrics): string {
  const pf = m.profitFactor === Infinity ? "∞" : m.profitFactor.toFixed(2);
  return `trades=${String(m.trades).padStart(3)} wins=${String(m.wins).padStart(3)} winRate=${m.winRatePct.toFixed(1).padStart(5)}% pnl=${m.pnlUsdt.toFixed(0).padStart(8)} exp%=${m.expectancyPct.toFixed(3).padStart(7)} PF=${pf.padStart(5)} maxDD=${m.maxDrawdownPct.toFixed(1).padStart(5)}% ret=${m.totalReturnPct.toFixed(1).padStart(6)}%`;
}

async function main() {
  const provider = createBinanceMarketDataProvider();
  const LIMIT = 1000; // 4h × 1000 ≈ 166 dager — intradag-nivå som live
  const symbols = PAPER_TRADING_UI_SYMBOLS.filter((s) => s !== "BNBUSDT" && s !== "XRPUSDT");

  console.log(`GRID (stateful, 4h × ${LIMIT} candles) — 70/30 walk-forward`);
  console.log("symbol    | full-periode                                          | IS (70%)                                                | OOS (30%)");
  console.log("----------|--------------------------------------------------------|---------------------------------------------------------|--------------------------------------------------");

  const allTrades: Trade[] = [];
  const keptSymbols: string[] = [];
  const keptTrades: Trade[] = [];

  for (const symbol of symbols) {
    let candles: Candle[];
    try {
      const klines = await provider.getKlines(symbol, "4h", LIMIT);
      candles = klines.map((k) => ({ timestamp: k.timestamp, open: k.open, high: k.high, low: k.low, close: k.close, volume: k.volume }));
    } catch (e) {
      console.log(`${symbol}  | DATA-FEIL: ${(e as Error).message.slice(0, 50)}`);
      continue;
    }
    if (candles.length < 300) { console.log(`${symbol}  | FOR LITE DATA (${candles.length})`); continue; }

    const split = Math.floor(candles.length * 0.7);
    const full = simulateGrid(symbol, candles);
    const is = simulateGrid(symbol, candles.slice(0, split));
    const oos = simulateGrid(symbol, candles.slice(split));

    const mFull = computeMetrics(full);
    const mIs = computeMetrics(is);
    const mOos = computeMetrics(oos);
    console.log(`${symbol.padEnd(8)} | ${fmt(mFull)} | ${fmt(mIs)} | ${fmt(mOos)}`);

    allTrades.push(...full);
    if (mOos.profitFactor >= 1.1 && mOos.trades >= 5) { keptSymbols.push(symbol); keptTrades.push(...oos); }
  }

  const mAll = computeMetrics(allTrades);
  const mKept = computeMetrics(keptTrades);
  console.log("\n── Univers-sammenligning ──");
  console.log(`HELE universet (${symbols.length}): trades=${mAll.trades} pnl=${mAll.pnlUsdt.toFixed(0)} exp%=${mAll.expectancyPct.toFixed(4)} PF=${mAll.profitFactor === Infinity ? "∞" : mAll.profitFactor.toFixed(2)} winRate=${mAll.winRatePct.toFixed(1)}% maxDD=${mAll.maxDrawdownPct.toFixed(1)}%`);
  console.log(`SMALT univers (OOS PF≥1.1, n=${keptSymbols.length}): ${keptSymbols.join(",") || "(ingen)"}`);
  console.log(`  trades=${mKept.trades} pnl=${mKept.pnlUsdt.toFixed(0)} exp%=${mKept.expectancyPct.toFixed(4)} PF=${mKept.profitFactor === Infinity ? "∞" : mKept.profitFactor.toFixed(2)} winRate=${mKept.winRatePct.toFixed(1)}% maxDD=${mKept.maxDrawdownPct.toFixed(1)}%`);
}

main().catch((e) => { console.error("FEIL:", e); process.exit(1); });
