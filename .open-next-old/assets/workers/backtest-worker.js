/**
 * Backtest WebWorker for Klarpakke Paper Trading
 * Runs simulations in a separate thread
 */

importScripts('https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js');

// Mock data generator for demo purposes
// In production, this would fetch real historical data from an API
function generateMockData(symbol, startDate, endDate) {
  const data = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  let price = symbol.includes('BTC') ? 45000 : 2500; // Starting price
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    // Generate realistic price movement with trend and volatility
    const trend = Math.sin(d.getTime() / (1000 * 60 * 60 * 24 * 30)) * 0.1; // Monthly cycle
    const volatility = (Math.random() - 0.5) * 0.08; // Daily volatility
    const drift = 0.0002; // Slight upward drift
    
    const change = drift + trend * 0.01 + volatility;
    price = price * (1 + change);
    
    const dayHigh = price * (1 + Math.random() * 0.03);
    const dayLow = price * (1 - Math.random() * 0.03);
    
    data.push({
      date: d.toISOString().split('T')[0],
      open: price * (1 + (Math.random() - 0.5) * 0.01),
      high: dayHigh,
      low: dayLow,
      close: price,
      volume: Math.floor(Math.random() * 1000000) + 500000
    });
  }
  
  return data;
}

// Simple trading strategy simulation
function runBacktest(data, params) {
  const { riskPreset, initialBalance } = params;
  
  // Risk preset configurations
  const presets = {
    auto_low: { positionPct: 0.01, stopLoss: 0.02, takeProfit: 0.06, leverage: 1 },
    low: { positionPct: 0.02, stopLoss: 0.03, takeProfit: 0.09, leverage: 1 },
    standard: { positionPct: 0.05, stopLoss: 0.03, takeProfit: 0.09, leverage: 2 },
    high: { positionPct: 0.10, stopLoss: 0.05, takeProfit: 0.15, leverage: 3 },
    extreme: { positionPct: 0.20, stopLoss: 0.08, takeProfit: 0.24, leverage: 5 }
  };
  
  const preset = presets[riskPreset] || presets.standard;
  const trades = [];
  let balance = initialBalance;
  let maxBalance = balance;
  let maxDrawdown = 0;
  let position = null;
  
  // Simple moving average crossover strategy
  const shortPeriod = 10;
  const longPeriod = 30;
  
  for (let i = longPeriod; i < data.length; i++) {
    const current = data[i];
    const previous = data[i - 1];
    
    // Calculate moving averages
    const shortMA = data.slice(i - shortPeriod + 1, i + 1)
      .reduce((sum, d) => sum + d.close, 0) / shortPeriod;
    const longMA = data.slice(i - longPeriod + 1, i + 1)
      .reduce((sum, d) => sum + d.close, 0) / longPeriod;
    
    const prevShortMA = data.slice(i - shortPeriod, i)
      .reduce((sum, d) => sum + d.close, 0) / shortPeriod;
    const prevLongMA = data.slice(i - longPeriod, i)
      .reduce((sum, d) => sum + d.close, 0) / longPeriod;
    
    // Entry signal: Golden cross
    if (!position && prevShortMA <= prevLongMA && shortMA > longMA) {
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
      
      // Stop loss hit
      if (current.low <= position.stopLoss) {
        exit = true;
        exitPrice = position.stopLoss;
        exitReason = 'STOP_LOSS';
      }
      // Take profit hit
      else if (current.high >= position.takeProfit) {
        exit = true;
        exitPrice = position.takeProfit;
        exitReason = 'TAKE_PROFIT';
      }
      // Death cross exit signal
      else if (prevShortMA >= prevLongMA && shortMA < longMA) {
        exit = true;
        exitReason = 'SIGNAL';
      }
      
      if (exit) {
        const pnl = (exitPrice - position.entryPrice) * position.quantity;
        const pnlPct = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;
        
        balance += pnl;
        
        // Track max drawdown
        if (balance > maxBalance) {
          maxBalance = balance;
        }
        const drawdown = (maxBalance - balance) / maxBalance * 100;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
        
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
    
    // Send progress update every 10 iterations
    if (i % 10 === 0) {
      self.postMessage({
        type: 'PROGRESS',
        data: { current: i, total: data.length }
      });
    }
    
    // Small delay to prevent UI blocking
    if (i % 50 === 0) {
      // Allow event loop to process
    }
  }
  
  // Close any open position at the end
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
  
  // Calculate Sharpe ratio (simplified)
  const returns = trades.map(t => t.pnl_pct);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized
  
  // Profit factor
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
    trades: trades
  };
}

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, params } = e.data;
  
  if (type === 'START_BACKTEST') {
    try {
      // Generate or fetch historical data
      const data = generateMockData(params.symbol, params.startDate, params.endDate);
      
      // Run backtest
      const result = runBacktest(data, params);
      
      // Send result
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
  
  if (type === 'CANCEL') {
    // Handle cancellation if needed
    self.postMessage({
      type: 'ERROR',
      error: 'Simulering avbrutt'
    });
  }
};
