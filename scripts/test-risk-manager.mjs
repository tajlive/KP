#!/usr/bin/env node
/**
 * Test if Risk Manager blocks SELL trades
 */

import { RiskManager } from '../src/lib/auto-trading/risk-manager';

// Mock Supabase client
const mockSession = {
  open_position: {
    quantity: 0.127,
    entry_price: 78741,
  },
  current_capital: 89990,
  trading_pair: 'BTCUSDT',
};

async function testSellBlocked() {
  const riskManager = new RiskManager({
    maxPositionSizePercent: 10,
    stopLossPercent: 1,
    trailingStopLossPercent: 1.5,
    maxDailyLossPercent: 5,
    maxDailyTrades: 10,
    maxDrawdownPercent: 15,
    maxLeverage: 1,
  });

  console.log('Testing Risk Manager with SELL signal...\n');

  // Simulate what tick route does for sell
  const signal = { action: 'sell', positionSize: 0.1 };
  const currentCapital = 89990;
  const tradeAmount = currentCapital * (signal.positionSize ?? 0.1);

  console.log('Trade Amount:', tradeAmount);
  console.log('Position Size %:', (tradeAmount / currentCapital * 100).toFixed(2) + '%');

  // This is what risk manager checks for symbol exposure
  // If getSymbolExposure returns ~11% and positionSizePercent is 10%,
  // then 11% + 10% = 21% > 20% max = BLOCKED!

  const symbolExposure = 11.1; // From getSymbolExposure calculation
  const positionSizePercent = (tradeAmount / currentCapital) * 100;
  const maxSymbolExposure = 10 * 2; // maxPositionSizePercent * 2

  console.log('\nSymbol Exposure Check:');
  console.log('  Symbol Exposure:', symbolExposure.toFixed(2) + '%');
  console.log('  Position Size %:', positionSizePercent.toFixed(2) + '%');
  console.log('  Sum:', (symbolExposure + positionSizePercent).toFixed(2) + '%');
  console.log('  Max Allowed:', maxSymbolExposure + '%');
  console.log('  BLOCKED?', (symbolExposure + positionSizePercent) > maxSymbolExposure ? 'YES ❌' : 'NO ✅');

  console.log('\n💡 BUG: For SELL trades, symbol exposure should DECREASE, not increase!');
  console.log('   Fix: Skip symbol exposure check for sell, or subtract positionSize.');
}

testSellBlocked();
