export interface SmartTraderConfig {
  enabled: boolean;
  mode: 'paper'; // Kun paper — sikkerhet
  symbol: string;
  interval: string; // Kline-intervall: '15m' default

  // RSI-parametere
  rsiPeriod: number;          // Default 14
  rsiOversoldThreshold: number; // Default 30
  rsiOverboughtThreshold: number; // Default 70

  // SMA-parametere
  smaFastPeriod: number;  // Default 9
  smaSlowPeriod: number;  // Default 21

  // Momentum
  momentumPeriod: number;  // Default 10

  // Risikostyring
  stopLossPct: number;   // 5-15%, default 8
  takeProfitPct: number; // 10-25%, default 15
  positionSizePct: number; // Andel av capital per trade, default 10

  // Terskler
  minCapitalNOK: number; // Minimum capital for å trade, default 500
  cooldownMinutes: number; // Ventetid mellom trades, default 60
}

export type Direction = 'buy' | 'sell' | 'hold';

export interface SignalResult {
  direction: Direction;
  confidence: number; // 0-100
  reasons: string[];
  indicators: IndicatorSnapshot;
}

export interface IndicatorSnapshot {
  rsi: number;
  smaFast: number | null;
  smaSlow: number | null;
  momentum: number | null;
  currentPrice: number;
  timestamp: string;
}

export interface RiskCheck {
  allowed: boolean;
  reason?: string;
  stopLossPrice?: number;
  takeProfitPrice?: number;
}

export const DEFAULT_CONFIG: SmartTraderConfig = {
  enabled: true,
  mode: 'paper',
  symbol: 'BTCUSDT',
  interval: '15m',
  rsiPeriod: 14,
  rsiOversoldThreshold: 30,
  rsiOverboughtThreshold: 70,
  smaFastPeriod: 9,
  smaSlowPeriod: 21,
  momentumPeriod: 10,
  stopLossPct: 8,
  takeProfitPct: 15,
  positionSizePct: 10,
  minCapitalNOK: 500,
  cooldownMinutes: 60,
};
