/**
 * Risk Kernel Module – Server-Side Risk Enforcement
 * 
 * @module trading/risk
 * @version 3.0.1-p0
 */

export {
  RiskKernel,
  RiskStateManager,
  createRiskKernel,
  DEFAULT_RISK_LIMITS,
  DEFAULT_ATR_EXIT_CONFIG,
  type RiskLimits,
  type RiskCheck,
  type RiskState,
  type RiskViolation,
  type ATRExitConfig
} from './risk-kernel';

export {
  RiskStateStore,
  getRiskStateStore,
  resetRiskStateStore,
  type PersistedRiskState,
  type StateRecoveryResult
} from './risk-state-store';
