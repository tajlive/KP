/**
 * FREE AI Auto-Trading Engine
 * Orchestrates sentiment analysis, market data, and AI predictions
 * 100% free using: Hugging Face + CoinLore + Cloudflare Workers AI
 */

import { analyzeSentiment, getRedditHeadlines, calculateAggregateSentiment, SentimentResult } from './sentiment-analyzer';
import { getMarketData, getMarketSentiment, subscribeToPriceUpdates, getHistoricalPrices, calculateRSI, calculateSMA } from './market-data';
import { predictTrade, PredictionOutput } from './cloudflare-inference';
import { createClient } from '@/lib/utils';

export interface AutoTradingConfig {
  userId: string;
  symbols: string[]; // e.g., ['BTCUSDT', 'ETHUSDT']
  riskLevel: 'safe' | 'moderate' | 'aggressive';
  maxTradesPerDay: number;
  enabled: boolean;
  useAI: boolean; // Use Cloudflare AI or rule-based
  confidenceThreshold: number; // Minimum confidence to execute (0-1)
}

export interface TradeDecision {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  targetPrice: number;
  stopLoss: number;
  reason: string;
  sentiment: number;
  fearGreedIndex: number;
  rsi: number;
  timestamp: string;
}

export interface EngineStats {
  totalDecisions: number;
  buyDecisions: number;
  sellDecisions: number;
  holdDecisions: number;
  avgConfidence: number;
  lastRunAt: string | null;
}

export class AutoTradingEngine {
  private config: AutoTradingConfig;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private wsConnections: Map<string, WebSocket> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  private stats: EngineStats = {
    totalDecisions: 0,
    buyDecisions: 0,
    sellDecisions: 0,
    holdDecisions: 0,
    avgConfidence: 0,
    lastRunAt: null
  };
  private onDecisionCallback?: (decision: TradeDecision) => void;
  private onErrorCallback?: (error: Error) => void;

  constructor(config: AutoTradingConfig) {
    this.config = config;
  }

  /**
   * Start the auto-trading engine
   */
  async start(onDecision?: (decision: TradeDecision) => void, onError?: (error: Error) => void): Promise<void> {
    if (this.isRunning) {
      console.info('🤖 AI Auto-Trading already running');
      return;
    }

    if (!this.config.enabled) {
      console.info('⏸️ AI Auto-Trading is disabled');
      return;
    }

    this.onDecisionCallback = onDecision;
    this.onErrorCallback = onError;
    this.isRunning = true;

    console.info('🤖 AI Auto-Trading started');
    console.info(`   Symbols: ${this.config.symbols.join(', ')}`);
    console.info(`   Risk Level: ${this.config.riskLevel}`);
    console.info(`   Max Trades/Day: ${this.config.maxTradesPerDay}`);
    console.info(`   AI Enabled: ${this.config.useAI ? 'Yes (Cloudflare)' : 'No (Rule-based)'}`);

    // Setup WebSocket connections for real-time prices
    this.setupPriceWebSockets();

    // Run immediately
    await this.runAnalysis();

    // Run every 5 minutes
    this.intervalId = setInterval(() => this.runAnalysis(), 5 * 60 * 1000);
  }

  /**
   * Stop the auto-trading engine
   */
  stop(): void {
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Close all WebSocket connections
    this.wsConnections.forEach((ws) => ws.close());
    this.wsConnections.clear();

    console.info('🛑 AI Auto-Trading stopped');
  }

  /**
   * Check if engine is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get engine statistics
   */
  getStats(): EngineStats {
    return { ...this.stats };
  }

  /**
   * Get current price history for a symbol
   */
  getPriceHistory(symbol: string): number[] {
    return this.priceHistory.get(symbol) || [];
  }

  /**
   * Force run analysis immediately
   */
  async forceAnalysis(): Promise<TradeDecision[]> {
    return this.runAnalysis();
  }

  /**
   * Setup WebSocket connections for real-time prices
   */
  private setupPriceWebSockets(): void {
    for (const symbol of this.config.symbols) {
      try {
        const ws = subscribeToPriceUpdates(symbol, (price) => {
          // Update price history
          const history = this.priceHistory.get(symbol) || [];
          history.push(price);
          // Keep last 100 prices
          if (history.length > 100) history.shift();
          this.priceHistory.set(symbol, history);
        });

        this.wsConnections.set(symbol, ws);
      } catch (error) {
        console.warn(`Failed to connect WebSocket for ${symbol}:`, error);
      }
    }
  }

  /**
   * Main analysis loop
   */
  private async runAnalysis(): Promise<TradeDecision[]> {
    if (!this.isRunning) return [];

    const decisions: TradeDecision[] = [];

    try {
      // Get overall market sentiment once per cycle
      const marketSentiment = await getMarketSentiment();

      for (const symbol of this.config.symbols) {
        try {
          const decision = await this.analyzeSymbol(symbol, marketSentiment);
          decisions.push(decision);

          // Update stats
          this.stats.totalDecisions++;
          if (decision.action === 'BUY') this.stats.buyDecisions++;
          else if (decision.action === 'SELL') this.stats.sellDecisions++;
          else this.stats.holdDecisions++;

          // Update average confidence
          this.stats.avgConfidence =
            (this.stats.avgConfidence * (this.stats.totalDecisions - 1) + decision.confidence) /
            this.stats.totalDecisions;

          this.stats.lastRunAt = new Date().toISOString();

          // Notify callback
          if (this.onDecisionCallback) {
            this.onDecisionCallback(decision);
          }

          // Log to database if action is BUY or SELL
          if (decision.action !== 'HOLD') {
            await this.logDecision(decision);
          }
        } catch (error) {
          console.error(`Failed to analyze ${symbol}:`, error);
          if (this.onErrorCallback && error instanceof Error) {
            this.onErrorCallback(error);
          }
        }
      }
    } catch (error) {
      console.error('Analysis loop error:', error);
    }

    return decisions;
  }

  /**
   * Analyze a single symbol
   */
  private async analyzeSymbol(symbol: string, marketSentiment: {
    fearGreedIndex: number;
    marketTrend: 'bull' | 'bear' | 'sideways';
  }): Promise<TradeDecision> {
    // 1. Get market data (GRATIS via CoinLore)
    const coinData = await getMarketData([symbol.replace('USDT', '')]);
    const coin = coinData[0];

    if (!coin) {
      throw new Error(`No data available for ${symbol}`);
    }

    const currentPrice = parseFloat(coin.price_usd);

    // 2. Get price history (from WebSocket or fetch historical)
    let history = this.priceHistory.get(symbol) || [];
    if (history.length < 20) {
      // Fetch historical data if WebSocket hasn't collected enough
      history = await getHistoricalPrices(symbol.replace('USDT', ''), 7);
      this.priceHistory.set(symbol, history);
    }

    // 3. Get news headlines (GRATIS via Reddit)
    const headlines = await getRedditHeadlines('cryptocurrency', 10);

    // 4. Analyze sentiment of headlines (GRATIS via Hugging Face or fallback)
    const sentimentResults = await Promise.all(
      headlines.map(h => analyzeSentiment(h))
    );
    const aggregateSentiment = calculateAggregateSentiment(sentimentResults);

    // 5. Calculate technical indicators
    const rsi = calculateRSI(history);
    const sma20 = calculateSMA(history, 20);
    const sma50 = calculateSMA(history, 50);

    // 6. AI prediction (GRATIS via Cloudflare Workers AI or rule-based)
    const prediction = await predictTrade({
      symbol,
      currentPrice,
      priceHistory: history,
      sentiment: aggregateSentiment.score,
      marketTrend: marketSentiment.marketTrend,
      fearGreedIndex: marketSentiment.fearGreedIndex,
      rsi,
      sma20,
      sma50
    });

    return {
      symbol,
      action: prediction.action,
      confidence: prediction.confidence,
      targetPrice: prediction.targetPrice,
      stopLoss: prediction.stopLoss,
      reason: prediction.reason,
      sentiment: aggregateSentiment.score,
      fearGreedIndex: marketSentiment.fearGreedIndex,
      rsi,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Log decision to database
   */
  private async logDecision(decision: TradeDecision): Promise<void> {
    try {
      const supabase = createClient();

      await supabase.from('ai_analysis_logs').insert({
        user_id: this.config.userId,
        symbol: decision.symbol,
        prediction_action: decision.action,
        prediction_confidence: decision.confidence,
        sentiment_score: decision.sentiment,
        fear_greed_index: decision.fearGreedIndex,
        rsi: decision.rsi,
        target_price: decision.targetPrice,
        stop_loss: decision.stopLoss,
        reason: decision.reason,
        executed: false,
        timestamp: decision.timestamp
      });
    } catch (error) {
      console.error('Failed to log decision:', error);
    }
  }

  /**
   * Execute trade (for future implementation)
   */
  async executeTrade(decision: TradeDecision): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if we've reached daily trade limit
      const supabase = createClient();
      const today = new Date().toISOString().split('T')[0];

      const { count } = await supabase
        .from('ai_analysis_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.config.userId)
        .eq('executed', true)
        .gte('timestamp', today);

      if ((count || 0) >= this.config.maxTradesPerDay) {
        return { success: false, error: 'Daily trade limit reached' };
      }

      // Calculate position size based on risk level and confidence
      const positionSize = this.calculatePositionSize(decision.confidence);

      // Log the trade execution
      await supabase.from('trades').insert({
        user_id: this.config.userId,
        trading_pair: decision.symbol,
        side: decision.action === 'BUY' ? 'buy' : 'sell',
        order_type: 'market',
        price: decision.targetPrice,
        quantity: positionSize,
        status: 'open',
        mode: 'paper',
        idempotency_key: `${this.config.userId}-${decision.symbol}-${Date.now()}`,
        fee: 0,
        total_value: positionSize * decision.targetPrice,
        session_id: this.config.userId, // Using userId as fallback - should be actual session
        executed_at: new Date().toISOString(),
      });

      // Mark as executed
      await supabase
        .from('ai_analysis_logs')
        .update({ executed: true })
        .eq('user_id', this.config.userId)
        .eq('symbol', decision.symbol)
        .eq('timestamp', decision.timestamp);

      console.info(`✅ Trade executed: ${decision.action} ${decision.symbol} @ $${decision.targetPrice}`);

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Trade execution failed';
      console.error('Trade execution error:', error);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Calculate position size based on risk and confidence
   */
  private calculatePositionSize(confidence: number): number {
    const baseAmount =
      this.config.riskLevel === 'safe' ? 100 :
      this.config.riskLevel === 'moderate' ? 500 : 1000;

    // Scale by confidence (0.7-1.0)
    const confidenceMultiplier = Math.max(0.5, confidence);

    return Math.round(baseAmount * confidenceMultiplier);
  }
}

/**
 * Create and manage a singleton instance
 */
let globalEngine: AutoTradingEngine | null = null;

export function createAutoTradingEngine(config: AutoTradingConfig): AutoTradingEngine {
  return new AutoTradingEngine(config);
}

export function getGlobalEngine(): AutoTradingEngine | null {
  return globalEngine;
}

export function setGlobalEngine(engine: AutoTradingEngine | null): void {
  globalEngine = engine;
}
