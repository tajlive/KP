/**
 * Historical ROI Data Engine - KLA-244
 * Henter og analyserer ekte historiske data fra Binance
 */

export interface HistoricalReturnData {
  totalReturn: number;      // +0.68 for 68%
  volatility: number;       // 0.25 for 25%
  maxDrawdown: number;      // -0.12 for -12%
  sharpeRatio: number;
  buyHold: number;
  dataPoints: number;
  period: string;
}

interface StrategyConfig {
  symbol: string;
  strategy: 'dca' | 'sma';
  smaFast: number;
  smaSlow: number;
}

const CONFIGS: Record<string, StrategyConfig> = {
  konservativ: { symbol: 'ETHUSDT', strategy: 'dca', smaFast: 30, smaSlow: 100 },
  balansert: { symbol: 'BTCUSDT', strategy: 'sma', smaFast: 20, smaSlow: 50 },
  aggressiv: { symbol: 'BTCUSDT', strategy: 'sma', smaFast: 10, smaSlow: 30 },
};

export async function getHistoricalReturns(
  riskProfile: 'konservativ' | 'balansert' | 'aggressiv',
  months: number
): Promise<HistoricalReturnData> {
  const config = CONFIGS[riskProfile];
  const limit = Math.min(months * 30, 1095); // Max 3 år data
  
  const url = `https://api.binance.com/api/v3/klines?` +
    `symbol=${config.symbol}&interval=1d&limit=${limit}`;
  
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    throw new Error(`Binance API error: ${res.status}`);
  }
  
  const klines = await res.json() as [string, string, string, string, string, string, string, string, string, string, string, string][];

  const closes = klines.map(k => parseFloat(k[4]));
  const returns = calculateStrategyReturns(closes, config);
  
  return {
    totalReturn: returns.totalReturn,
    volatility: returns.volatility,
    maxDrawdown: returns.maxDrawdown,
    sharpeRatio: returns.sharpeRatio,
    buyHold: (closes[closes.length - 1] / closes[0]) - 1,
    dataPoints: klines.length,
    period: `${klines.length} dager`,
  };
}

function calculateStrategyReturns(
  closes: number[],
  config: StrategyConfig
): {
  totalReturn: number;
  volatility: number;
  maxDrawdown: number;
  sharpeRatio: number;
} {
  const smaFast = calculateSMA(closes, config.smaFast);
  const smaSlow = calculateSMA(closes, config.smaSlow);
  
  let capital = 1; // Start med 1 enhet
  let maxCapital = 1;
  let maxDrawdown = 0;
  const equityValues: number[] = [1];
  let inPosition = false;
  let entryPrice = 0;
  
  for (let i = config.smaSlow; i < closes.length; i++) {
    const price = closes[i];
    const prevFast = smaFast[i - 1];
    const prevSlow = smaSlow[i - 1];
    const currFast = smaFast[i];
    const currSlow = smaSlow[i];
    
    // SMA Crossover logikk
    if (!inPosition && prevFast <= prevSlow && currFast > currSlow) {
      // Golden cross - kjøp
      inPosition = true;
      entryPrice = price;
    } else if (inPosition && prevFast >= prevSlow && currFast < currSlow) {
      // Death cross - selg
      const tradeReturn = (price - entryPrice) / entryPrice;
      capital *= (1 + tradeReturn * 0.998); // 0.2% fee
      inPosition = false;
    }
    
    // Beregn daglig equity
    const currentEquity = inPosition 
      ? capital * (1 + (price - entryPrice) / entryPrice)
      : capital;
    
    equityValues.push(currentEquity);
    
    // Track drawdown
    if (currentEquity > maxCapital) {
      maxCapital = currentEquity;
    }
    const drawdown = (maxCapital - currentEquity) / maxCapital;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  // Close any open position at end
  if (inPosition) {
    const tradeReturn = (closes[closes.length - 1] - entryPrice) / entryPrice;
    capital *= (1 + tradeReturn * 0.998);
  }
  
  const totalReturn = capital - 1;
  
  // Calculate volatility (annualized)
  const returns: number[] = [];
  for (let i = 1; i < equityValues.length; i++) {
    returns.push((equityValues[i] - equityValues[i - 1]) / equityValues[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const dailyVol = Math.sqrt(variance);
  const annualVol = dailyVol * Math.sqrt(365);
  
  // Sharpe ratio (assuming 3% risk-free rate)
  const riskFreeRate = 0.03;
  const excessReturn = totalReturn * (365 / closes.length) - riskFreeRate;
  const sharpeRatio = annualVol > 0 ? excessReturn / annualVol : 0;
  
  return {
    totalReturn,
    volatility: annualVol,
    maxDrawdown: -maxDrawdown,
    sharpeRatio,
  };
}

function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}
