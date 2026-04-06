/**
 * Champion/Challenger Rollout Module
 * 
 * @module trading/rollout
 * @version 3.0.1
 */

export {
  ChampionChallengerRollout,
  isRolloutHealthy,
  recommendTrafficAdjustment,
  DEFAULT_ROLLOUT_CONFIG,
  type PolicyVersion,
  type RolloutConfig,
  type PolicyMetrics,
  type RolloutDecision,
  type RolloutStatus
} from './champion-challenger';
