import { get } from '@vercel/edge-config';

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
  try {
    const flags = await get<EdgeFeatureFlags>('featureFlags');
    return flags ?? {};
  } catch {
    return {};
  }
}

export async function isMaintenanceMode(): Promise<boolean> {
  try {
    const value = await get<boolean>('maintenanceMode');
    return value ?? false;
  } catch {
    return false;
  }
}
