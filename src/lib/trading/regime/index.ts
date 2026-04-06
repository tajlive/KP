/**
 * Regime & Policy Ensemble Module
 * 
 * @module trading/regime
 * @version 3.0.1
 */

export {
  RegimeClassifier,
  detectRegime,
  DEFAULT_REGIME_CONFIG,
  type MarketRegime,
  type RegimeFeatures,
  type RegimeClassification,
  type RegimeConfig
} from './regime-classifier';

export {
  PolicyEnsemble,
  ACTIONS,
  DEFAULT_ENSEMBLE_CONFIG,
  type PolicyType,
  type PolicyDecision,
  type EnsembleConfig,
  type PolicyState
} from './policy-ensemble';
