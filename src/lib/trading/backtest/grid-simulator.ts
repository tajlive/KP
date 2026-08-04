/**
 * Grid-backtest-simulator med realistiske kostnader.
 *
 * Simulerer mekanisk grid-strategi mot historiske 1h-klines:
 * - Grid plasseres mellom lower/upper med N nivåer
 * - Kjøp ved fall til nivå, salg ved stigning til neste nivå
 * - Gebyr (taker) + slippage belastes hver fill
 * - Walk-forward: splitt data i trenings-/testvinduer
 *
 * Ren funksjon — testbar uten DB.
 */

export interface Candle {
  open_time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface GridParams {
  symbol: string;
  lowerPrice: number;
  upperPrice: number;
  gridLevels: number;
  capitalNok: number;
  /** Gebyr per side (0.001 = 0.1%) */
  feePct: number;
  /** Slippage per side (0.0005 = 0.05%) */
  slippagePct: number;
}

export interface GridTrade {
  side: "buy" | "sell";
  price: number;
  quantity: number;
  fee: number;
  time: string;
}

export interface BacktestResult {
  params: GridParams;
  trades: GridTrade[];
  totalPnl: number;
  totalFees: number;
  /** Avkastning i % av startkapital */
  returnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  winRate: number;
  closedTrades: number;
  /** Endelig porteføljeverdi (cash + posisjonsverdi ved siste close) */
  finalValue: number;
}

/**
 * Kjør grid-simulering mot et candle-sett.
 *
 * Mekanikk (som Pionex):
 * - Nivåer fordeles likt mellom lower og upper (aritmetisk grid)
 * - Start: halv kapital i "base" (kjøpt ved startpris), halv som quote (cash)
 * - Pris faller til nivå n → kjøp 1 grid-enhet
 * - Pris stiger til nivå n+1 → selg 1 grid-enhet
 * - Ingen AI — kun mekaniske fills ved nivå-kryss
 */
export function simulateGrid(candles: Candle[], params: GridParams): BacktestResult {
  const { lowerPrice, upperPrice, gridLevels, capitalNok, feePct, slippagePct } = params;

  if (candles.length < 2 || gridLevels < 2 || upperPrice <= lowerPrice) {
    return emptyResult(params);
  }

  const step = (upperPrice - lowerPrice) / (gridLevels - 1);
  const levels = Array.from({ length: gridLevels }, (_, i) => lowerPrice + i * step);

  const startPrice = candles[0].close;
  const quotePerGrid = capitalNok / 2 / (gridLevels - 1); // halv kapital for kjøp
  const basePerGrid = capitalNok / 2 / startPrice / (gridLevels - 1); // halv som base

  let cash = capitalNok / 2;
  let base = capitalNok / 2 / startPrice;
  const trades: GridTrade[] = [];

  // Equity-kurve for drawdown/Sharpe
  const equityCurve: number[] = [capitalNok];

  let lastLevelIdx = nearestLevelIdx(startPrice, levels);

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const low = c.low * (1 - slippagePct);
    const high = c.high * (1 + slippagePct);

    // Sjekk kjøp (pris falt gjennom nivåer)
    for (let l = lastLevelIdx - 1; l >= 0; l--) {
      if (low <= levels[l] && cash >= quotePerGrid) {
        const fillPrice = levels[l] * (1 + slippagePct);
        const qty = quotePerGrid / fillPrice;
        const fee = quotePerGrid * feePct;
        cash -= quotePerGrid + fee;
        base += qty;
        trades.push({ side: "buy", price: fillPrice, quantity: qty, fee, time: c.open_time });
        lastLevelIdx = l;
      }
    }

    // Sjekk salg (pris steg gjennom nivåer)
    for (let l = lastLevelIdx + 1; l < levels.length; l++) {
      if (high >= levels[l] && base >= basePerGrid) {
        const fillPrice = levels[l] * (1 - slippagePct);
        const qty = Math.min(basePerGrid, base);
        const proceeds = qty * fillPrice;
        const fee = proceeds * feePct;
        cash += proceeds - fee;
        base -= qty;
        trades.push({ side: "sell", price: fillPrice, quantity: qty, fee, time: c.open_time });
        lastLevelIdx = l;
      }
    }

    equityCurve.push(cash + base * c.close);
  }

  const finalPrice = candles[candles.length - 1].close;
  const finalValue = cash + base * finalPrice;
  const totalFees = trades.reduce((s, t) => s + t.fee, 0);
  const totalPnl = finalValue - capitalNok;
  const returnPct = (totalPnl / capitalNok) * 100;

  // Max drawdown
  let peak = capitalNok;
  let maxDD = 0;
  for (const eq of equityCurve) {
    if (eq > peak) peak = eq;
    const dd = ((peak - eq) / peak) * 100;
    if (dd > maxDD) maxDD = dd;
  }

  // Sharpe (daglig, annualisert ~sqrt(365*24) for 1h)
  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]);
  }
  const avgRet = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdRet = Math.sqrt(
    returns.reduce((s, r) => s + (r - avgRet) ** 2, 0) / returns.length,
  );
  const sharpe = stdRet > 0 ? (avgRet / stdRet) * Math.sqrt(365 * 24) : 0;

  // Win rate (lukkede rundturer: kjøp→salg-par)
  let wins = 0;
  let closed = 0;
  for (let i = 0; i < trades.length - 1; i++) {
    if (trades[i].side === "buy" && trades[i + 1].side === "sell") {
      closed++;
      if (trades[i + 1].price > trades[i].price) wins++;
      i++; // hopp over paret
    }
  }

  return {
    params,
    trades,
    totalPnl,
    totalFees,
    returnPct,
    maxDrawdownPct: maxDD,
    sharpeRatio: sharpe,
    winRate: closed > 0 ? wins / closed : 0,
    closedTrades: closed,
    finalValue,
  };
}

function nearestLevelIdx(price: number, levels: number[]): number {
  let best = 0;
  let bestDist = Math.abs(price - levels[0]);
  for (let i = 1; i < levels.length; i++) {
    const d = Math.abs(price - levels[i]);
    if (d < bestDist) {
      best = i;
      bestDist = d;
    }
  }
  return best;
}

function emptyResult(params: GridParams): BacktestResult {
  return {
    params,
    trades: [],
    totalPnl: 0,
    totalFees: 0,
    returnPct: 0,
    maxDrawdownPct: 0,
    sharpeRatio: 0,
    winRate: 0,
    closedTrades: 0,
    finalValue: params.capitalNok,
  };
}
