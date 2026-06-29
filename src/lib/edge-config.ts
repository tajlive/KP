/**
 * Edge Config stub — migrert fra tidligere Edge Config-løsning til Supabase/Redis.
 * Feature flags leses nå fra Redis eller Supabase (se src/lib/flags.ts).
 * Den opprinnelige edge-config-pakken er avinstallert.
 */

export type EdgeFeatureFlags = {
  tradingV3?: boolean;
  rlSignals?: boolean;
  euTaxReport?: boolean;
  betaTrading?: boolean;
  whitelabelFees?: boolean;
  maintenanceMode?: boolean;
  signalEngineKillSwitch?: boolean;
};

export async function getEdgeFlags(): Promise<EdgeFeatureFlags> {
  // TODO: Les fra Redis/Supabase etter behov
  return {};
}

export async function isMaintenanceMode(): Promise<boolean> {
  // TODO: Les fra Redis/Supabase etter behov
  return false;
}
