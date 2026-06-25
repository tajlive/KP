/**
 * Feature Flags - Trading V3
 *
 * Sentralisert feature flagging for gradvis rollout.
 * Støtter både env-defaults og Edge Config-overrides (server-side).
 */

import { withRequestCache } from "@/lib/cache";
import type { EdgeFeatureFlags } from './edge-config';

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
  /** Maintenance mode - viser nedetidsside */
  maintenanceMode: boolean;
  /** Nødstopp for signal-engine */
  signalEngineKillSwitch: boolean;
  /** Sonar UI-funksjonalitet */
  sonarUi: boolean;
  /** AI Insight — prediktiv innsikt i dashboard */
  aiInsight: boolean;
  /** Dark Fleet Fase 1 — avansert AI/ML trading */
  darkFleetPhase1: boolean;
  /** Dark Fleet nødstopp — umiddelbar rollback til V2 */
  darkFleetKillSwitch: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  tradingV3: process.env.NEXT_PUBLIC_TRADING_V3_ENABLED === 'true',
  rlSignals: process.env.NEXT_PUBLIC_RL_SIGNALS_ENABLED === 'true',
  euTaxReport: process.env.NEXT_PUBLIC_EU_TAX_ENABLED === 'true',
  betaTrading: process.env.NEXT_PUBLIC_BETA_TRADING_ENABLED === 'true',
  whitelabelFees: process.env.NEXT_PUBLIC_WHITELABEL_FEES_ENABLED === 'true',
  maintenanceMode: false,
  signalEngineKillSwitch: false,
  sonarUi: process.env.NEXT_PUBLIC_SONAR_UI_ENABLED === 'true',
  aiInsight: process.env.NEXT_PUBLIC_AI_INSIGHT_ENABLED !== 'false', // default ON
  darkFleetPhase1: process.env.ENABLE_DARK_FLEET === 'true',
  darkFleetKillSwitch: false,
};

/** Sync variant - brukes på klienten */
export function getFlags(overrides?: Partial<FeatureFlags>): FeatureFlags {
  return { ...DEFAULT_FLAGS, ...overrides };
}

/** Sync variant - brukes på klienten */
export function isEnabled(
  flag: keyof FeatureFlags,
  overrides?: Partial<FeatureFlags>
): boolean {
  return getFlags(overrides)[flag] ?? false;
}

/** Async variant - henter Edge Config-overrides på serveren */
async function getFlagsAsyncImpl(): Promise<FeatureFlags> {
  let edgeFlags: Partial<EdgeFeatureFlags> = {};
  try {
    const { getEdgeFlags } = await import('./edge-config');
    edgeFlags = await getEdgeFlags();
  } catch {
    // Edge Config ikke tilgjengelig (mangler env eller pakke)
  }
  return getFlags(edgeFlags as Partial<FeatureFlags>);
}

const cachedGetFlagsAsync = withRequestCache(getFlagsAsyncImpl, {
  key: "feature-flags",
  tags: ["flags"],
  revalidate: 60,
});

export async function getFlagsAsync(): Promise<FeatureFlags> {
  return cachedGetFlagsAsync();
}
