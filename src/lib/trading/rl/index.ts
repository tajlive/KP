/**
 * RL Trading Module - Sentiment-based PPO Agent
 * 
 * @module trading/rl
 * @version 3.0.0
 */

export {
  // Reward system
  calculateSentimentSignal,
  calculateSentimentAlignmentReward,
  calculateRiskAdjustedReward,
  calculateRegimeAlignmentReward,
  calculateTradeReward,
  calculateEpisodeReward,
  explainReward,
  DEFAULT_REWARD_CONFIG,
  type RewardConfig,
  type TradeOutcome,
  type MarketContext,
  type PortfolioState
} from './sentiment-reward';

export {
  // PPO Agent
  PPOAgent,
  ReplayBuffer,
  TrainingScheduler,
  STATE_DIM,
  ACTION_DIM,
  ACTIONS,
  DEFAULT_PPO_CONFIG,
  type PPOConfig,
  type Experience,
  type TrainingMetrics
} from './ppo-agent';

export {
  // Benchmarks
  DCAStrategy,
  runBuyHold,
  runPairTrading,
  calculateRLBenchmark,
  runBenchmarkComparison,
  generateBenchmarkReport,
  BenchmarkValidation,
  type BenchmarkConfig,
  type BenchmarkResult,
  type ComparisonResult
} from './benchmark';
