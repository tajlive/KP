/**
 * Feature Flags - Trading V3
 * 
 * Sentralisert feature flagging for gradvis rollout
 */

export interface FeatureFlags {
  /** Trading V3 - Full pipeline enabled */
  tradingV3: boolean;
  /** RL Signal API */
  rlSignals: boolean;
  /** EU Tax Report */
  euTaxReport: boolean;
  /** Beta trading features */
  betaTrading: boolean;
  /** White-label fee calculation */
  whitelabelFees: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  tradingV3: process.env.NEXT_PUBLIC_TRADING_V3_ENABLED === 'true',
  rlSignals: process.env.NEXT_PUBLIC_RL_SIGNALS_ENABLED === 'true',
  euTaxReport: process.env.NEXT_PUBLIC_EU_TAX_ENABLED === 'true',
  betaTrading: process.env.NEXT_PUBLIC_BETA_TRADING_ENABLED === 'true',
  whitelabelFees: process.env.NEXT_PUBLIC_WHITELABEL_FEES_ENABLED === 'true',
};

export function getFlags(): FeatureFlags {
  return DEFAULT_FLAGS;
}

export function isEnabled(flag: keyof FeatureFlags): boolean {
  return DEFAULT_FLAGS[flag] ?? false;
}
