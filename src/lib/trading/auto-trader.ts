import { 
  type AutoTradingConfig, 
  type TradingSignal, 
  getActiveAutoTraders, 
  getRecentTradingSignals,
  logAutoTrade 
} from '@/lib/supabase/auto-trading';
import { executePaperTrade } from '@/lib/supabase/paper-trading';

export class AutoTrader {
  constructor(private config: AutoTradingConfig) {}

  /**
   * Evaluate if a signal should be executed based on risk settings
   */
  async shouldExecute(signal: TradingSignal): Promise<boolean> {
    // Check confidence threshold based on risk level
    const minConfidence = {
      low: 80,
      medium: 70,
      high: 60,
    }[this.config.risk_level];

    if (signal.confidence < minConfidence) {
      return false;
    }

    // Check if signal is recent (< 5 minutes old)
    const signalAge = Date.now() - new Date(signal.created_at).getTime();
    if (signalAge > 5 * 60 * 1000) {
      return false;
    }

    return true;
  }

  /**
   * Calculate trade size based on config and signal
   */
  calculateTradeSize(signal: TradingSignal): number {
    const maxSize = this.config.max_trade_size_nok;
    
    // Adjust size based on confidence
    const confidenceMultiplier = signal.confidence / 100;
    
    // Higher confidence = larger position (up to max)
    const tradeValue = maxSize * confidenceMultiplier;
    
    // Calculate quantity
    return tradeValue / signal.price;
  }

  /**
   * Execute a trade
   */
  async executeTrade(signal: TradingSignal): Promise<boolean> {
    try {
      const quantity = this.calculateTradeSize(signal);
      const totalValue = quantity * signal.price;

      // Only execute if above minimum trade size
      if (totalValue < 1000) {
        console.log(`Trade value ${totalValue} below minimum`);
        return false;
      }

      if (this.config.mode === 'paper') {
        // Execute paper trade
        await executePaperTrade(this.config.user_id, {
          symbol: signal.symbol,
          side: signal.action,
          quantity,
          price: signal.price,
          total_value: totalValue,
        });
      } else {
        // Live trading would go here
        console.log(`Live trade not implemented yet: ${signal.action} ${quantity} ${signal.symbol}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to execute trade:', error);
      return false;
    }
  }

  /**
   * Send notification to user
   */
  async notifyUser(trade: unknown): Promise<void> {
    // In a real implementation, this would send:
    // - Push notification
    // - Email
    // - In-app notification
    console.log(`Auto trade notification for user ${this.config.user_id}:`, trade);
  }
}

/**
 * Run auto trading cycle for all active traders
 */
export async function runAutoTradingCycle(): Promise<{
  totalUsers: number;
  tradesExecuted: number;
  errors: number;
}> {
  const results = {
    totalUsers: 0,
    tradesExecuted: 0,
    errors: 0,
  };

  try {
    // Get all active auto traders
    const activeTraders = await getActiveAutoTraders();
    results.totalUsers = activeTraders.length;

    if (activeTraders.length === 0) {
      return results;
    }

    // Get recent trading signals
    const signals = await getRecentTradingSignals(20, 70);

    if (signals.length === 0) {
      console.log('No trading signals available');
      return results;
    }

    // Process each trader
    for (const config of activeTraders) {
      try {
        const trader = new AutoTrader(config);

        // Check each signal
        for (const signal of signals) {
          const shouldTrade = await trader.shouldExecute(signal);
          
          if (shouldTrade) {
            const success = await trader.executeTrade(signal);
            
            if (success) {
              results.tradesExecuted++;
              await trader.notifyUser({
                symbol: signal.symbol,
                action: signal.action,
                confidence: signal.confidence,
              });
            }
            
            await logAutoTrade(config.user_id, signal, config, success);
            
            // Only one trade per user per cycle
            break;
          }
        }
      } catch (error) {
        console.error(`Error processing trader ${config.user_id}:`, error);
        results.errors++;
      }
    }
  } catch (error) {
    console.error('Auto trading cycle failed:', error);
    results.errors++;
  }

  return results;
}
