/**
 * KLARPAKKE: SYSTEMATISK TEST PIPELINE
 * 4-stage: Backtest → Paper → Live-micro → Live-full
 */

export type TestStageName = 'backtest' | 'paper' | 'live_micro' | 'live_full';
export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
export type RiskLevel = 'conservative' | 'moderate' | 'aggressive';

export interface TestCriteria {
  minWinRate: number;
  minProfitFactor: number;
  maxDrawdownPercent: number;
  minSharpeRatio: number;
  minTrades: number;
  minDurationDays: number;
}

export interface TestStage {
  name: TestStageName;
  displayName: string;
  description: string;
  prerequisites: TestStageName[];
  criteria: TestCriteria;
  config: {
    durationDays: number;
    capitalAllocation: number;
    maxTradesPerDay: number;
  };
}

export const BACKTEST_STAGE: TestStage = {
  name: 'backtest',
  displayName: 'Backtest (Historical)',
  description: 'Test strategy mot 30+ dager historical data',
  prerequisites: [],
  criteria: {
    minWinRate: 0.55,
    minProfitFactor: 1.5,
    maxDrawdownPercent: 10,
    minSharpeRatio: 1.0,
    minTrades: 50,
    minDurationDays: 30,
  },
  config: { durationDays: 30, capitalAllocation: 0, maxTradesPerDay: 10 },
};

export const PAPER_STAGE: TestStage = {
  name: 'paper',
  displayName: 'Paper Trading (Real-time)',
  description: '7+ dager real-time testing med realistic slippage/fees',
  prerequisites: ['backtest'],
  criteria: {
    minWinRate: 0.50,
    minProfitFactor: 1.3,
    maxDrawdownPercent: 12,
    minSharpeRatio: 0.8,
    minTrades: 20,
    minDurationDays: 7,
  },
  config: { durationDays: 7, capitalAllocation: 0, maxTradesPerDay: 15 },
};

export const LIVE_MICRO_STAGE: TestStage = {
  name: 'live_micro',
  displayName: 'Live Trading (Micro)',
  description: '14+ dager live trading med 1% av portfolio ($50-100)',
  prerequisites: ['backtest', 'paper'],
  criteria: {
    minWinRate: 0.45,
    minProfitFactor: 1.2,
    maxDrawdownPercent: 15,
    minSharpeRatio: 0.7,
    minTrades: 30,
    minDurationDays: 14,
  },
  config: { durationDays: 14, capitalAllocation: 0.01, maxTradesPerDay: 20 },
};

export const LIVE_FULL_STAGE: TestStage = {
  name: 'live_full',
  displayName: 'Live Trading (Full)',
  description: 'Full deployment etter verifisert performance',
  prerequisites: ['backtest', 'paper', 'live_micro'],
  criteria: {
    minWinRate: 0.45,
    minProfitFactor: 1.2,
    maxDrawdownPercent: 15,
    minSharpeRatio: 0.7,
    minTrades: 100,
    minDurationDays: 90,
  },
  config: { durationDays: 999, capitalAllocation: 1.0, maxTradesPerDay: 30 },
};

export const TEST_STAGES: TestStage[] = [
  BACKTEST_STAGE,
  PAPER_STAGE,
  LIVE_MICRO_STAGE,
  LIVE_FULL_STAGE,
];
