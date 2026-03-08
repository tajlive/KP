import { TradingSignal } from '@/lib/supabase/auto-trading';

interface SignalConfig {
  symbols: string[];
  minConfidence: number;
  maxConfidence: number;
}

const DEFAULT_SYMBOLS = ['BTC', 'ETH', 'SOL', 'AVAX', 'LINK'];

/**
 * Simulate trading signals for testing
 */
export function generateTradingSignal(
  config: SignalConfig = {
    symbols: DEFAULT_SYMBOLS,
    minConfidence: 60,
    maxConfidence: 95,
  }
): TradingSignal {
  const symbols = config.symbols;
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const action = Math.random() > 0.5 ? 'buy' : 'sell';
  const confidence = Math.floor(
    Math.random() * (config.maxConfidence - config.minConfidence) + config.minConfidence
  );
  
  // Simulate current prices (NOK)
  const basePrices: Record<string, number> = {
    BTC: 900000,
    ETH: 45000,
    SOL: 2000,
    AVAX: 350,
    LINK: 180,
  };
  
  const basePrice = basePrices[symbol] || 1000;
  const volatility = 0.02; // 2% volatility
  const price = basePrice * (1 + (Math.random() - 0.5) * volatility);

  return {
    id: crypto.randomUUID(),
    symbol,
    action,
    confidence,
    price,
    created_at: new Date().toISOString(),
  };
}

/**
 * Generate multiple signals
 */
export function generateTradingSignals(
  count: number,
  config?: SignalConfig
): TradingSignal[] {
  return Array.from({ length: count }, () => generateTradingSignal(config));
}

/**
 * Test function - simulate a trading cycle
 */
export async function simulateTradingCycle(): Promise<void> {
  console.log('=== Trading Signal Simulation ===\n');
  
  const signals = generateTradingSignals(5);
  
  for (const signal of signals) {
    console.log(`Symbol: ${signal.symbol}`);
    console.log(`Action: ${signal.action.toUpperCase()}`);
    console.log(`Confidence: ${signal.confidence}%`);
    console.log(`Price: ${signal.price.toFixed(2)} NOK`);
    console.log(`---`);
  }
}

// Run if called directly (Node.js only)
// simulateTradingCycle();
