/**
 * Enhanced Backtest WebWorker v2
 * Supports multiple strategies and real market data
 */

// Strategy implementations (copied from strategies.ts for worker context)
const Strategies = {
  calculateSMA(data, period) {
    const sma = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(NaN);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / period);
      }
    }
    return sma;
  },

  calculateEMA(data, period) {
    const ema = [];
    const multiplier = 2 / (period + 1);
    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        ema.push(data[i]);
      } else {
        ema.push((data[i] - ema[i - 1]) * multiplier + ema[i - 1]);
      }
    }
    return ema;
  },

  calculateRSI(data, period = 14) {
    const rsi = [];
    let gains = 0, losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = data[i] - data[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        rsi.push(NaN);
        continue;
      }
      
      if (i > period) {
        const change = data[i] - data[i - 1];
        avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
        avgLoss = (avgLoss * (period - 1) + (change < 0 ? -change : 0)) / period;
      }
      
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
    return rsi;
  },

  calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);
    const macd = fastEMA.map((fast, i) => fast - slowEMA[i]);
    const signal = this.calculateEMA(macd.filter(v => !isNaN(v)), signalPeriod);
    const paddedSignal = Array(macd.length - signal.length).fill(NaN).concat(signal);
    const histogram = macd.map((m, i) => m - paddedSignal[i]);
    return { macd, signal: paddedSignal, histogram };
  },

  calculateBollingerBands(data, period = 20, stdDev = 2) {
    const middle = this.calculateSMA(data, period);
    const upper = [], lower = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        upper.push(NaN);
        lower.push(NaN);
      } else {
        const slice = data.slice(i - period + 1, i + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / period;
        const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
        const standardDev = Math.sqrt(variance);
        upper.push(middle[i] + standardDev * stdDev);
        lower.push(middle[i] - standardDev * stdDev);
      }
    }
    return { middle, upper, lower };
  },

  generateSignal(strategyId, data, prices, currentIndex, params) {
    const current = data[currentIndex];
    const previous = data[currentIndex - 1];
    
    switch (strategyId) {
      case 'ma_crossover': {
        const shortPeriod = Number(params.shortPeriod || 10);
        const longPeriod = Number(params.longPeriod || 30);
        if (currentIndex < longPeriod) return { action: 'HOLD', confidence: 0 };
        
        const shortMA = this.calculateSMA(prices, shortPeriod);
        const longMA = this.calculateSMA(prices, longPeriod);
        
        const shortCurrent = shortMA[currentIndex];
        const shortPrev = shortMA[currentIndex - 1];
        const longCurrent = longMA[currentIndex];
        const longPrev = longMA[currentIndex - 1];
        
        if (shortPrev <= longPrev && shortCurrent > longCurrent) {
          return { action: 'BUY', confidence: 0.75 };
        }
        if (shortPrev >= longPrev && shortCurrent < longCurrent) {
          return { action: 'SELL', confidence: 0.75 };
        }
        return { action: 'HOLD', confidence: 0.3 };
      }
      
      case 'rsi': {
        const period = Number(params.period || 14);
        const oversold = Number(params.oversold || 30);
        const overbought = Number(params.overbought || 70);
        if (currentIndex < period) return { action: 'HOLD', confidence: 0 };
        
        const rsi = this.calculateRSI(prices, period);
        const currentRSI = rsi[currentIndex];
        const prevRSI = rsi[currentIndex - 1];
        
        if (prevRSI <= oversold && currentRSI > oversold) return { action: 'BUY', confidence: 0.8 };
        if (prevRSI >= overbought && currentRSI < overbought) return { action: 'SELL', confidence: 0.8 };
        return { action: 'HOLD', confidence: 0.3 };
      }
      
      case 'macd': {
        const fast = Number(params.fastPeriod || 12);
        const slow = Number(params.slowPeriod || 26);
        const signal = Number(params.signalPeriod || 9);
        if (currentIndex < slow) return { action: 'HOLD', confidence: 0 };
        
        const macd = this.calculateMACD(prices, fast, slow, signal);
        const histogram = macd.histogram[currentIndex];
        const prevHistogram = macd.histogram[currentIndex - 1];
        
        if (prevHistogram <= 0 && histogram > 0) return { action: 'BUY', confidence: 0.75 };
        if (prevHistogram >= 0 && histogram < 0) return { action: 'SELL', confidence: 0.75 };
        return { action: 'HOLD', confidence: 0.3 };
      }
      
      case 'bollinger': {
        const bbPeriod = Number(params.period || 20);
        const bbStdDev = Number(params.stdDev || 2);
        if (currentIndex < bbPeriod) return { action: 'HOLD', confidence: 0 };
        
        const bb = this.calculateBollingerBands(prices, bbPeriod, bbStdDev);
        const price = current.close;
        
        if (price <= bb.lower[currentIndex]) return { action: 'BUY', confidence: 0.7 };
        if (price >= bb.upper[currentIndex]) return { action: 'SELL', confidence: 0.7 };
        return { action: 'HOLD', confidence: 0.3 };
      }
      
      case 'breakout': {
        const lookback = Number(params.lookbackPeriod || 20);
        const threshold = Number(params.breakoutThreshold || 2) / 100;
        if (currentIndex < lookback) return { action: 'HOLD', confidence: 0 };
        
        const lookbackData = data.slice(currentIndex - lookback, currentIndex);
        const high = Math.max(...lookbackData.map(d => d.high));
        const low = Math.min(...lookbackData.map(d => d.low));
        const price = current.close;
        
        if (price > high * (1 + threshold)) return { action: 'BUY', confidence: 0.8 };
        if (price < low * (1 - threshold)) return { action: 'SELL', confidence: 0.8 };
        return { action: 'HOLD', confidence: 0.3 };
      }
      
      default:
        return { action: 'HOLD', confidence: 0 };
    }
  }
};

// Risk presets
const RiskPresets = {
  auto_low: { positionPct: 0.01, stopLoss: 0.02, takeProfit: 0.06, leverage: 1 },
  low: { positionPct: 0.02, stopLoss: 0.03, takeProfit: 0.09, leverage: 1 },
  standard: { positionPct: 0.05, stopLoss: 0.03, takeProfit: 0.09, leverage: 2 },
  high: { positionPct: 0.10, stopLoss: 0.05, takeProfit: 0.15, leverage: 3 },
  extreme: { positionPct: 0.20, stopLoss: 0.08, takeProfit: 0.24, leverage: 5 }
};

// Run backtest
function runBacktest(data, params) {
  const { riskPreset, strategyId, strategyParams, initialBalance } = params;
  
  const preset = RiskPresets[riskPreset] || RiskPresets.standard;
  const prices = data.map(d => d.close);
  
  const trades = [];
  let balance = initialBalance;
  let maxBalance = balance;
  let maxDrawdown = 0;
  let position = null;
  
  for (let i = 30; i < data.length; i++) {
    const current = data[i];
    
    // Generate signal
    const signal = Strategies.generateSignal(strategyId, data, prices, i, strategyParams);
    
    // Entry logic
    if (!position && signal.action === 'BUY' && signal.confidence >= 0.5) {
      const positionValue = balance * preset.positionPct * preset.leverage;
      const quantity = positionValue / current.close;
      
      position = {
        entryPrice: current.close,
        quantity: quantity,
        leverage: preset.leverage,
        entryTime: current.date,
        stopLoss: current.close * (1 - preset.stopLoss),
        takeProfit: current.close * (1 + preset.takeProfit)
      };
    }
    
    // Exit logic
    if (position) {
      let exit = false;
      let exitPrice = current.close;
      let exitReason = 'SIGNAL';
      
      // Stop loss
      if (current.low <= position.stopLoss) {
        exit = true;
        exitPrice = position.stopLoss;
        exitReason = 'STOP_LOSS';
      }
      // Take profit
      else if (current.high >= position.takeProfit) {
        exit = true;
        exitPrice = position.takeProfit;
        exitReason = 'TAKE_PROFIT';
      }
      // Signal exit
      else if (signal.action === 'SELL' && signal.confidence >= 0.5) {
        exit = true;
        exitReason = 'SIGNAL';
      }
      
      if (exit) {
        const pnl = (exitPrice - position.entryPrice) * position.quantity;
        const pnlPct = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;
        
        balance += pnl;
        
        if (balance > maxBalance) maxBalance = balance;
        const drawdown = (maxBalance - balance) / maxBalance * 100;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        
        trades.push({
          entry_time: position.entryTime,
          exit_time: current.date,
          side: 'LONG',
          entry_price: position.entryPrice,
          exit_price: exitPrice,
          quantity: position.quantity,
          pnl: pnl,
          pnl_pct: pnlPct,
          exit_reason: exitReason
        });
        
        position = null;
      }
    }
    
    // Progress update
    if (i % 10 === 0) {
      self.postMessage({
        type: 'PROGRESS',
        data: { current: i, total: data.length }
      });
    }
  }
  
  // Close open position
  if (position) {
    const lastPrice = data[data.length - 1].close;
    const pnl = (lastPrice - position.entryPrice) * position.quantity;
    const pnlPct = ((lastPrice - position.entryPrice) / position.entryPrice) * 100;
    
    balance += pnl;
    
    trades.push({
      entry_time: position.entryTime,
      exit_time: data[data.length - 1].date,
      side: 'LONG',
      entry_price: position.entryPrice,
      exit_price: lastPrice,
      quantity: position.quantity,
      pnl: pnl,
      pnl_pct: pnlPct,
      exit_reason: 'SIGNAL'
    });
  }
  
  // Calculate metrics
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl <= 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  const totalReturn = ((balance - initialBalance) / initialBalance) * 100;
  
  const returns = trades.map(t => t.pnl_pct);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length || 0;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length || 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
  
  const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  
  return {
    symbol: params.symbol,
    start_date: data[0].date,
    end_date: data[data.length - 1].date,
    initial_balance: initialBalance,
    final_balance: balance,
    total_return_pct: totalReturn,
    max_drawdown_pct: maxDrawdown,
    sharpe_ratio: sharpeRatio,
    win_rate: winRate,
    total_trades: trades.length,
    avg_trade_return: avgReturn,
    profit_factor: profitFactor,
    trades: trades,
    strategy: strategyId
  };
}

// Mock data generator (fallback)
function generateMockData(symbol, days) {
  const data = [];
  const now = new Date();
  
  const basePrices = {
    'BTC': 45000, 'ETH': 2500, 'SOL': 100, 'ADA': 0.5,
    'DOT': 7, 'MATIC': 0.8, 'LINK': 15, 'UNI': 8
  };
  
  let price = basePrices[symbol.split('-')[0]] || 100;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const trend = Math.sin(i / 30) * 0.05;
    const volatility = (Math.random() - 0.5) * 0.06;
    const drift = 0.0003;
    
    const change = drift + trend * 0.01 + volatility;
    price = price * (1 + change);
    
    const dayOpen = price * (1 + (Math.random() - 0.5) * 0.01);
    const dayHigh = Math.max(dayOpen, price) * (1 + Math.random() * 0.03);
    const dayLow = Math.min(dayOpen, price) * (1 - Math.random() * 0.03);
    
    data.push({
      date: date.toISOString().split('T')[0],
      timestamp: date.getTime(),
      open: dayOpen,
      high: dayHigh,
      low: dayLow,
      close: price,
      volume: Math.floor(Math.random() * 1000000000) + 500000000
    });
  }
  
  return data;
}

// Handle messages
self.onmessage = async function(e) {
  const { type, params } = e.data;
  
  if (type === 'START_BACKTEST') {
    try {
      // Try to fetch real data, fall back to mock
      let data;
      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${params.coinId || 'bitcoin'}/ohlc?vs_currency=usd&days=365`
        );
        
        if (response.ok) {
          const ohlc = await response.json();
          data = ohlc.map(candle => ({
            date: new Date(candle[0]).toISOString().split('T')[0],
            timestamp: candle[0],
            open: candle[1],
            high: candle[2],
            low: candle[3],
            close: candle[4],
            volume: 0
          }));
        } else {
          throw new Error('API failed');
        }
      } catch (e) {
        console.warn('Using mock data:', e);
        data = generateMockData(params.symbol, 365);
      }
      
      const result = runBacktest(data, params);
      
      self.postMessage({
        type: 'COMPLETE',
        result: result
      });
    } catch (error) {
      self.postMessage({
        type: 'ERROR',
        error: error.message
      });
    }
  }
};
