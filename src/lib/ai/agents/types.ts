export type AgentAction = 'buy' | 'sell' | 'hold';

export interface AgentSignal {
  action: AgentAction;
  confidence: number; // 0-100
  reasoning: string;
  meta?: Record<string, unknown>;
}

export interface AgentFeatures {
  symbol: string;
  prices: number[];
  volumes?: number[];
  rsi?: number;
  macdHistogram?: number;
  bbUpper?: number;
  bbLower?: number;
  sma20?: number;
  sma50?: number;
  volatility14?: number;
  atr14?: number;
  [key: string]: unknown;
}

export interface AgentState {
  lastAction?: AgentAction;
  lastPrice?: number;
  consecutiveHolds?: number;
}

export interface TradingAgent {
  id: string;
  name: string;
  baselineWeight: number;
  run(symbol: string, features: AgentFeatures, state?: AgentState): AgentSignal | Promise<AgentSignal>;
}
